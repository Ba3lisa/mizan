# Agent-Driven Development

How Mizan uses AI agents across the entire development lifecycle -- from writing code to verifying data.

Architecture diagram: https://app.excalidraw.com/s/8B4UFPTVlkA/2QtqeIRt0rX

---

## How Code Gets Written

Code is authored by Claude Code agents, triggered by developers running local sessions. The developer describes what needs to be built or fixed, and the agent writes the implementation in TypeScript, following project rules defined in `CLAUDE.md` and `convex_rules.txt`.

Key constraints enforced on every agent session:
- TypeScript only, no JavaScript
- No `any` types -- use `unknown` or specific interfaces
- No `@ts-ignore` or `eslint-disable` -- fix the underlying issue
- All Convex functions must use validators (`v` from `convex/values`)
- All data must have a `sourceUrl` field

Future: GitHub Actions will trigger agent sessions automatically for certain issue types, removing the requirement for a local developer to initiate work.

## How Code Gets Reviewed

Pull requests are automatically reviewed by the OpenAI Codex agent via `.github/workflows/codex-review.yml`. When a PR is opened or updated, the workflow:

1. Triggers the Codex review agent
2. The agent reads the diff and project context
3. Posts inline review comments on the PR identifying issues, suggesting improvements, and flagging violations of project rules
4. The review is non-blocking -- it informs but does not gate merging

This creates a two-agent pipeline: Claude Code writes, Codex reviews. Neither agent has merge authority.

## How Code Gets Merged

All merges require human approval. The single maintainer (essamgouda97) reviews every PR before merging to the main branch. This is a hard gate -- no automated merge path exists.

Merge criteria:
- Codex review comments are addressed or explicitly dismissed
- TypeScript compiles without errors
- No new `any` types or lint suppressions
- Schema changes require explicit maintainer approval (destructive operations are never auto-approved)

A second approver will be added as the contributor base grows.

## How Data Gets Refreshed

A Convex cron job runs every 6 hours, triggering the data agent orchestrator at `convex/agents/dataAgent.ts`. The orchestrator:

1. Checks staleness of each data category (debt, budget, government, parliament, constitution, elections)
2. For each stale category (older than 24 hours), dispatches a category-specific refresh
3. Fetches data from official sources (World Bank API, Ministry of Finance, Cabinet portal, etc.)
4. Runs deterministic validators (budget totals must sum correctly, parliament member counts must match, debt values must be non-negative)
5. If validation passes, updates the Convex database
6. If validation fails, rejects the data and logs the discrepancy for human review
7. Logs every operation to the `dataRefreshLog` table, visible on the `/transparency` page

Government and cabinet changes are never auto-written. The agent flags differences for manual approval.

Manual trigger: `npx convex run agents/dataAgent:orchestrateRefresh`

## How Data Gets Verified

Community data corrections flow through the LLM Council, a multi-model voting system for verifying proposed changes.

The current pipeline:

1. A community member opens a GitHub Issue with a data correction (e.g., "Minister X was replaced by Minister Y") and includes a source URL
2. The GitHub Agent ingests the issue, classifies it, and checks for spam
3. The issue is submitted to the LLM Council for evaluation
4. Council members (currently Claude 3.5 Haiku; OpenAI and Google models planned) independently evaluate the correction against the cited source
5. Votes are tallied according to the decision matrix (see `ai-data-pipeline.md` for details on source classification)
6. If the council approves, the change is queued for application to the data layer
7. High-sensitivity changes (government officials, election results) still require human approval even after council approval

## Adding a New LLM Provider

To add a new model to the LLM Council:

1. Create a new file in `convex/agents/providers/` (e.g., `openai.ts`)
2. Implement the `evaluateDataChange()` function, which takes a proposed change and source URL and returns a vote (approve / reject / abstain) with reasoning
3. Register the provider in `convex/agents/providers/registry.ts`
4. The orchestrator will automatically include the new provider in future council votes

Provider interface:
- Input: the proposed data change, the cited source URL, the current value in the database, and the data category
- Output: a vote (`approve`, `reject`, or `abstain`), a confidence score (0-1), and a text explanation of the reasoning
- Providers must handle their own API authentication via Convex environment variables

## Agent Onboarding Guide

If you are a Claude Code agent (or any AI agent) working on this repo for the first time, read these files in order to understand the codebase:

### Required Reading (before any code change)
1. `CLAUDE.md` -- Project rules, data philosophy, critical constraints
2. `convex_rules.txt` -- Convex-specific patterns (function syntax, validators, indexes, scheduling)
3. `convex/schema.ts` -- All 26+ tables, their fields, and indexes

### Architecture Understanding
4. `docs/architecture.md` -- Three-layer system overview (visual, data, agentic)
5. `convex/agents/dataAgent.ts` -- Main 6h orchestrator (how data flows in)
6. `convex/agents/council.ts` -- LLM Council orchestrator (how data gets verified)
7. `convex/agents/githubAgent.ts` -- GitHub issue processing (how community contributes)
8. `convex/agents/providers/anthropic.ts` -- Shared Claude caller (reuse this, don't inline API calls)

### Data Layer
9. `convex/dataRefresh.ts` -- All mutations for writing data (upsert patterns, audit logging)
10. `convex/referenceData.ts` -- Reference data loader (static data that rarely changes)
11. `convex/agents/constitutionAgent.ts` -- PDF extraction tool (how constitution is loaded)
12. `convex/agents/validators.ts` -- Deterministic validators (budget sums, debt bounds, etc.)

### What You Need From Your Human
- **ANTHROPIC_API_KEY** and **GITHUB_TOKEN** must be set as Convex environment variables
- Schema migrations need explicit approval (never auto-run destructive operations)
- Government official changes need human confirmation (pipeline flags but doesn't write)
- Production deployments need human approval (use `npx convex deploy` only when told to)

### Manual Pipeline Triggers
```bash
# Full pipeline refresh (all categories + reference data + constitution)
npx convex run dataRefresh:manualRefresh

# Single category refresh
npx convex run dataRefresh:manualRefresh '{"category": "debt"}'
npx convex run dataRefresh:manualRefresh '{"category": "constitution"}'

# Force constitution re-extraction from PDF
npx convex run dataRefresh:manualRefresh '{"category": "constitution"}'

# Check reference data (loads from backup if tables are empty)
npx convex run referenceData:ensureAllReferenceData

# Check data freshness
npx convex run dataRefresh:getAllLastUpdated
```

### Development Setup
1. Clone the repo and `cd app`
2. `npm install --legacy-peer-deps`
3. Copy `.env.example` to `.env.local`
4. Run `npx convex dev` (creates a dev deployment)
5. Run `npx convex run seedData:seedAll` to populate initial data
6. Run `npm run dev` for the Next.js frontend
7. Set `ANTHROPIC_API_KEY` in the Convex dashboard to enable AI features
