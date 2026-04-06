"use node";
import { internalAction, ActionCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import { Id } from "../_generated/dataModel";

const GITHUB_REPO = "Ba3lisa/mizan";
const GITHUB_API = "https://api.github.com";

// ─── GITHUB API HELPER ───────────────────────────────────────────────────────

async function githubFetch(
  path: string,
  options: RequestInit = {}
): Promise<unknown> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    console.warn(
      "[githubAgent] GITHUB_TOKEN not set — skipping GitHub operations"
    );
    return null;
  }
  const res = await fetch(`${GITHUB_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(options.headers as Record<string, string> | undefined),
    },
  });
  if (!res.ok) {
    console.error(
      `[githubAgent] GitHub API error: ${res.status} ${res.statusText}`
    );
    return null;
  }
  return res.json();
}

// ─── MAIN ORCHESTRATOR ───────────────────────────────────────────────────────

export const processGitHubIssues = internalAction({
  args: {},
  handler: async (ctx) => {
    console.log("[githubAgent] Starting GitHub Issues processing...");

    // Fetch open issues with data-correction or stale-data labels
    const issues = await githubFetch(
      `/repos/${GITHUB_REPO}/issues?state=open&labels=data-correction,stale-data&per_page=20`
    );

    if (!issues || !Array.isArray(issues)) {
      console.log("[githubAgent] No issues found or API unavailable");
      return null;
    }

    console.log(`[githubAgent] Found ${issues.length} open data issues`);

    for (const issue of issues) {
      await processIssue(
        ctx,
        issue as {
          number: number;
          title: string;
          body: string;
          labels: Array<{ name: string }>;
          created_at: string;
        }
      );
    }

    console.log("[githubAgent] GitHub Issues processing complete");
    return null;
  },
});

// ─── PROCESS SINGLE ISSUE ────────────────────────────────────────────────────

async function processIssue(
  ctx: ActionCtx,
  issue: {
    number: number;
    title: string;
    body: string;
    labels: Array<{ name: string }>;
    created_at: string;
  }
): Promise<void> {
  console.log(
    `[githubAgent] Processing issue #${issue.number}: ${issue.title}`
  );

  // Use Claude to parse the issue body and extract the data correction
  const claudeResponse = await callClaude(
    `You are a data verification assistant for an Egyptian government transparency platform called Mizan.

Parse this GitHub issue and extract:
1. page: which page the data is on (e.g., "budget", "debt", "parliament")
2. dataPoint: what specific data point is being corrected
3. currentValue: what value Mizan currently shows (if mentioned)
4. correctValue: what the correct value should be
5. sourceUrl: the URL proving the correct value
6. confidence: "high" if they provided a specific source URL, "medium" if they described the source, "low" if no source

Respond in JSON format only:
{"page": "...", "dataPoint": "...", "currentValue": "...", "correctValue": "...", "sourceUrl": "...", "confidence": "high|medium|low"}

If the issue is not a valid data correction (spam, feature request, etc.), respond: {"valid": false, "reason": "..."}

Issue title: ${issue.title}
Issue body: ${issue.body}`
  );

  if (!claudeResponse) {
    await addComment(
      issue.number,
      "**Mizan AI Agent**: Unable to process this issue at this time. A maintainer will review it manually.\n\n_This is an automated response._"
    );
    return;
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(claudeResponse) as Record<string, unknown>;
  } catch {
    console.error(
      `[githubAgent] Failed to parse Claude response for issue #${issue.number}`
    );
    return;
  }

  if (parsed.valid === false) {
    await addComment(
      issue.number,
      `**Mizan AI Agent**: This issue doesn't appear to be a data correction.\n\nReason: ${String(parsed.reason ?? "unknown")}\n\nIf this is incorrect, please update the issue with more details about which data point needs correction and provide a source URL.\n\n_This is an automated response._`
    );
    return;
  }

  const page = typeof parsed.page === "string" ? parsed.page : "government";
  const dataPoint =
    typeof parsed.dataPoint === "string" ? parsed.dataPoint : "";
  const currentValue =
    typeof parsed.currentValue === "string" ? parsed.currentValue : undefined;
  const correctValue =
    typeof parsed.correctValue === "string" ? parsed.correctValue : undefined;
  const sourceUrl =
    typeof parsed.sourceUrl === "string" ? parsed.sourceUrl : undefined;
  const confidence =
    parsed.confidence === "high" ||
    parsed.confidence === "medium" ||
    parsed.confidence === "low"
      ? parsed.confidence
      : "low";

  if (confidence === "high" && sourceUrl) {
    // Try to verify the source URL
    const verified = await verifySource(sourceUrl);

    if (verified) {
      // Start a refresh log entry for audit trail
      const logCategory = mapPageToRefreshCategory(page);
      const refreshLogId = (await ctx.runMutation(
        internal.dataRefresh.logRefreshStart,
        { category: logCategory }
      )) as Id<"dataRefreshLog">;

      // Log the correction for human review
      await ctx.runMutation(internal.dataRefresh.logChange, {
        refreshLogId,
        category: mapPageToChangeCategory(page),
        action: "flagged" as const,
        tableName: page,
        descriptionAr: `تصحيح بيانات من مجتمع GitHub — القضية #${issue.number}: ${dataPoint}`,
        descriptionEn: `Community data correction from GitHub Issue #${issue.number}: ${dataPoint}`,
        previousValue: currentValue,
        newValue: correctValue,
        sourceUrl,
      });

      // Mark the refresh log as complete (community flag, not a data write)
      await ctx.runMutation(internal.dataRefresh.logRefreshComplete, {
        logId: refreshLogId,
        recordsUpdated: 0,
        sourceUrl,
      });

      await addComment(
        issue.number,
        `**Mizan AI Agent**: Thank you for the data correction!\n\n**Verification result:**\n- Data point: ${dataPoint}\n- Suggested value: ${correctValue ?? "(not specified)"}\n- Source: ${sourceUrl}\n- Source accessible: Yes\n\nThis correction has been logged and will be reviewed before the next data refresh cycle.\n\n_This is an automated response. A maintainer has been notified._`
      );

      // Add "verified" label
      await githubFetch(
        `/repos/${GITHUB_REPO}/issues/${issue.number}/labels`,
        {
          method: "POST",
          body: JSON.stringify({ labels: ["verified"] }),
        }
      );
    } else {
      await addComment(
        issue.number,
        `**Mizan AI Agent**: I checked the source URL but couldn't verify the data.\n\n- Source URL: ${sourceUrl}\n- Status: Unable to access or verify\n\nPlease ensure the URL is correct and publicly accessible. A maintainer will review this issue.\n\n_This is an automated response._`
      );
    }
  } else if (confidence === "medium") {
    await addComment(
      issue.number,
      `**Mizan AI Agent**: Thank you for the report. I found the following:\n\n- Data point: ${dataPoint}\n- Suggested value: ${correctValue ?? "(not specified)"}\n- Confidence: Medium (no direct source URL provided)\n\nCould you provide a direct URL to the official source where this number can be verified? This helps us maintain data accuracy.\n\n_This is an automated response._`
    );
  } else {
    await addComment(
      issue.number,
      `**Mizan AI Agent**: Thank you for the report, but I need more information to verify this correction.\n\nPlease provide:\n1. The exact number that needs correction\n2. The correct value\n3. A URL to an official source proving the correct value\n\n_This is an automated response._`
    );
  }
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

async function callClaude(prompt: string): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-3-5-haiku-20241022",
        max_tokens: 500,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) return null;
    const data = (await res.json()) as {
      content?: Array<{ type: string; text: string }>;
    };
    const content = data?.content?.[0];
    return content?.type === "text" ? content.text : null;
  } catch {
    return null;
  }
}

async function addComment(issueNumber: number, body: string): Promise<void> {
  await githubFetch(
    `/repos/${GITHUB_REPO}/issues/${issueNumber}/comments`,
    {
      method: "POST",
      body: JSON.stringify({ body }),
    }
  );
}

async function verifySource(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: "HEAD",
      signal: AbortSignal.timeout(10000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Maps a page name from a GitHub issue to a valid dataRefreshLog category.
 * dataRefreshLog accepts: "government" | "parliament" | "constitution" | "budget" | "debt" | "all"
 */
function mapPageToRefreshCategory(
  page: string
): "government" | "parliament" | "constitution" | "budget" | "debt" | "all" {
  const map: Record<
    string,
    | "government"
    | "parliament"
    | "constitution"
    | "budget"
    | "debt"
    | "all"
  > = {
    government: "government",
    parliament: "parliament",
    constitution: "constitution",
    budget: "budget",
    debt: "debt",
    elections: "all",
    economy: "debt",
  };
  return map[page] ?? "government";
}

/**
 * Maps a page name from a GitHub issue to a valid dataChangeLog category.
 * dataChangeLog accepts: "government" | "parliament" | "constitution" | "budget" | "debt" | "elections"
 */
function mapPageToChangeCategory(
  page: string
): "government" | "parliament" | "constitution" | "budget" | "debt" | "elections" {
  const map: Record<
    string,
    | "government"
    | "parliament"
    | "constitution"
    | "budget"
    | "debt"
    | "elections"
  > = {
    government: "government",
    parliament: "parliament",
    constitution: "constitution",
    budget: "budget",
    debt: "debt",
    elections: "elections",
    economy: "debt",
  };
  return map[page] ?? "government";
}
