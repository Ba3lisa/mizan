"use node";
// AI-powered daily poll generator for Mizan.
// Generates interesting opinion polls based on existing data in the platform.
// Polls are multiple-choice, anonymous, and designed to gather citizen sentiment.
// Each poll includes inline data nuggets to inform voting decisions.

import { internalAction, ActionCtx } from "../_generated/server";
import { internal, api } from "../_generated/api";
import { callLLMStructured as callClaudeStructured } from "./providers/registry";

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface GeneratedPoll {
  questionAr: string;
  questionEn: string;
  options: Array<{ labelAr: string; labelEn: string }>;
  category: string;
  contextAr: string;
  contextEn: string;
  dataNuggets: Array<{
    labelAr: string;
    labelEn: string;
    value: string;
    linkPath: string;
  }>;
}

type PollCategory = "economy" | "budget" | "debt" | "parliament" | "government" | "constitution" | "general";

// Map categories to their app pages
const CATEGORY_PAGES: Record<string, string> = {
  economy: "/economy",
  budget: "/budget",
  debt: "/debt",
  parliament: "/government?tab=parliament",
  government: "/government",
  constitution: "/constitution",
  general: "/",
};

// ─── DATA CONTEXT GATHERING ──────────────────────────────────────────────────

async function gatherDataContext(ctx: ActionCtx): Promise<string> {
  const sections: string[] = [];

  // Get home stats for quick overview
  const homeStats = await ctx.runQuery(api.government.getHomeStats);
  if (homeStats) {
    sections.push(`HOME STATS:
- Total Parliamentarians: ${homeStats.parliamentarians.value}
- Governorates: ${homeStats.governorates.value}
- Constitutional Articles: ${homeStats.constitutionArticles.value}
${homeStats.externalDebt ? `- External Debt: $${homeStats.externalDebt.value}B` : ""}
${homeStats.domesticDebt ? `- Domestic Debt: ${homeStats.domesticDebt.value}B EGP` : ""}`);
  }

  // Get recent economic indicators
  try {
    const economyData = await ctx.runQuery(api.economy.getAllLatest);
    if (economyData && typeof economyData === "object") {
      const entries = Object.entries(economyData as Record<string, { indicator: string; value: number; unit: string }>)
        .slice(0, 15)
        .map(([key, ind]) => `- ${key}: ${ind.value} ${ind.unit}`)
        .join("\n");
      sections.push(`ECONOMIC INDICATORS:\n${entries}`);
    }
  } catch {
    // Economy data not available
  }

  // Get ALL historical polls to avoid repeats
  const pollHistory = await ctx.runQuery(internal.polls.getPollHistory);
  if (pollHistory.length > 0) {
    const historyList = pollHistory
      .map((p: { questionEn: string; category: string }) => `- [${p.category}] "${p.questionEn}"`)
      .join("\n");
    sections.push(`ALL PREVIOUS POLLS (you MUST NOT repeat any of these topics or rephrase them — generate something completely new):\n${historyList}`);
  }

  // Available app pages for linking data nuggets
  sections.push(`AVAILABLE APP PAGES (use these for linkPath in dataNuggets):
- /economy — Economic indicators, GDP, inflation, exchange rate
- /budget — Government budget, revenue, expenditure breakdown
- /budget/your-share — Interactive tax calculator
- /debt — National debt timeline, creditor breakdown
- /government — Cabinet, ministers, president
- /government?tab=parliament — Parliament members, parties
- /constitution — 247 constitutional articles
- /elections — Election results
- /governorate — Regional data by governorate`);

  return sections.join("\n\n");
}

// ─── POLL GENERATION ─────────────────────────────────────────────────────────

const POLL_SCHEMA = {
  name: "generate_poll",
  description: "Generate a daily opinion poll with supporting data nuggets for Egyptian citizens",
  input_schema: {
    type: "object" as const,
    required: ["questionAr", "questionEn", "options", "category", "contextAr", "contextEn", "dataNuggets"],
    properties: {
      questionAr: {
        type: "string",
        description: "The poll question in Arabic",
      },
      questionEn: {
        type: "string",
        description: "The poll question in English",
      },
      options: {
        type: "array",
        description: "2-5 multiple choice options",
        items: {
          type: "object",
          required: ["labelAr", "labelEn"],
          properties: {
            labelAr: { type: "string", description: "Option label in Arabic" },
            labelEn: { type: "string", description: "Option label in English" },
          },
        },
      },
      category: {
        type: "string",
        enum: ["economy", "budget", "debt", "parliament", "government", "constitution", "general"],
        description: "Which data category this poll relates to",
      },
      contextAr: {
        type: "string",
        description: "Brief context sentence in Arabic explaining why this question matters",
      },
      contextEn: {
        type: "string",
        description: "Brief context sentence in English explaining why this question matters",
      },
      dataNuggets: {
        type: "array",
        description: "2-3 key data points from the platform that help inform the voter's decision. Use REAL numbers from the data provided.",
        items: {
          type: "object",
          required: ["labelAr", "labelEn", "value", "linkPath"],
          properties: {
            labelAr: { type: "string", description: "Short label in Arabic (e.g. 'الدين الخارجي')" },
            labelEn: { type: "string", description: "Short label in English (e.g. 'External Debt')" },
            value: { type: "string", description: "The formatted value (e.g. '$155B', '33.7%', '568 MPs')" },
            linkPath: { type: "string", description: "App page path to see more (e.g. '/debt', '/economy')" },
          },
        },
      },
    },
  },
};

const SYSTEM_PROMPT = `You are the poll generator for Mizan (ميزان), Egypt's government transparency platform.
Your job is to create engaging, thought-provoking daily opinion polls that encourage citizens to share their views on Egyptian governance, economy, and public policy.

RULES:
1. Questions must be NEUTRAL — never leading or biased toward any political position
2. Keep questions simple and accessible to all Egyptians
3. Use 3-4 options maximum for most polls (2 for agree/disagree)
4. Options should cover the full spectrum of opinions
5. Questions should relate to REAL data on the platform (budget, debt, economy, parliament, constitution)
6. Arabic must be natural Egyptian/MSA — not translated-sounding
7. Context line should reference a specific data point when possible
8. NEVER ask about specific politicians by name
9. Focus on policy, priorities, and citizen experience
10. dataNuggets MUST use real numbers from the provided data — never invent statistics
11. NEVER repeat a previous poll — check the full history and pick a completely different topic and angle

QUESTION TYPES (rotate and mix these):
A. DATA-CONTRAST questions: Surface a surprising data point and ask for reaction
   Example: "Egypt's debt service is 30% of the budget — is this sustainable?"
B. SCENARIO DILEMMAS: Present a tradeoff with real numbers
   Example: "If budget had to be cut 10%, which sector: Education (12%) or Health (5%)?"
C. SENTIMENT: "How would you rate progress on...?"
D. PRIORITY RANKING: "Which should be the top priority?"
E. AGREE/DISAGREE with a data-backed statement
F. EXPERIENCE: "How has [economic indicator] affected your daily life?"

DATA NUGGETS:
- Always include 2-3 data nuggets — these are the key numbers that inform the question
- Use EXACT numbers from the platform data provided
- Each nugget must link to the relevant page in the app
- Format values concisely: "$155B" not "$155,000,000,000"
- Pick numbers that create interesting contrasts or context for the question`;

export const generateDailyPoll = internalAction({
  args: {},
  handler: async (ctx) => {
    if (process.env.DISABLE_CRONS === "true") {
      console.log("[pollAgent] Crons disabled, skipping.");
      return;
    }
    // Gather current data context
    const dataContext = await gatherDataContext(ctx);

    const prompt = `Based on the following current data from Mizan, generate a fresh, engaging daily poll question with supporting data nuggets.

CURRENT PLATFORM DATA:
${dataContext}

CRITICAL DEDUP RULE: Review the "ALL PREVIOUS POLLS" list carefully. Your new poll MUST be about a DIFFERENT topic, angle, and category if possible. Do NOT rephrase, reword, or ask a variation of any previous question. If a previous poll asked about debt sustainability, do NOT ask about debt in any form. Pick a completely fresh angle from the data.

Generate a poll that:
1. Is on a COMPLETELY DIFFERENT topic from all previous polls listed above
2. Is relevant to the data above and uses real numbers
3. Includes 2-3 dataNuggets with actual values from the data to help voters decide
4. Is thought-provoking — surface interesting contrasts, tradeoffs, or surprising facts
5. Would make an Egyptian citizen stop and think before answering

Remember: 3-4 options for most questions, 2 options for simple agree/disagree, max 5 options.
The dataNuggets should use REAL values from the platform data — never make up numbers.`;

    const result = await callClaudeStructured<GeneratedPoll>(
      prompt,
      POLL_SCHEMA,
      SYSTEM_PROMPT,
    );

    if (!result) {
      console.error("[pollAgent] Failed to generate poll from Claude");
      return;
    }

    // Validate category
    const validCategories: PollCategory[] = [
      "economy", "budget", "debt", "parliament",
      "government", "constitution", "general",
    ];
    const category: PollCategory = validCategories.includes(result.category as PollCategory)
      ? (result.category as PollCategory)
      : "general";

    // Validate options (must have 2-5)
    if (!result.options || result.options.length < 2 || result.options.length > 5) {
      console.error("[pollAgent] Invalid number of options:", result.options?.length);
      return;
    }

    // Validate and clean data nuggets
    const dataNuggets = (result.dataNuggets || [])
      .slice(0, 3)
      .map((nugget) => ({
        labelAr: nugget.labelAr,
        labelEn: nugget.labelEn,
        value: nugget.value,
        linkPath: nugget.linkPath || CATEGORY_PAGES[category] || "/",
      }));

    // Create the poll
    await ctx.runMutation(internal.polls.createPoll, {
      questionAr: result.questionAr,
      questionEn: result.questionEn,
      options: result.options.map((opt) => ({
        labelAr: opt.labelAr,
        labelEn: opt.labelEn,
      })),
      category,
      contextAr: result.contextAr,
      contextEn: result.contextEn,
      dataNuggets: dataNuggets.length > 0 ? dataNuggets : undefined,
    });

    console.log(`[pollAgent] Created new daily poll: "${result.questionEn}" with ${dataNuggets.length} data nuggets`);
  },
});
