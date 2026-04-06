# Mizan AI Data Pipeline

## Overview

Mizan uses an AI-powered data agent built on Convex to keep all government data fresh, validated, and properly sourced. The agent runs every 6 hours via a Convex cron job and orchestrates data collection across all categories.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Convex Cron Job                    │
│              (every 6 hours)                          │
│                                                       │
│  crons.ts → internal.agents.dataAgent.orchestrateRefresh │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│              AI Orchestrator Action                    │
│           convex/agents/dataAgent.ts                  │
│                                                       │
│  1. Query getAllLastUpdated() for staleness check      │
│  2. For each stale category (>24h):                   │
│     a. Log refresh start (dataRefreshLog)             │
│     b. Dispatch category-specific refresh             │
│     c. Validate results (deterministic checks)        │
│     d. Update records or flag for human review        │
│     e. Log success/failure                            │
└──────────────────────┬──────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
┌──────────────┐ ┌──────────┐ ┌──────────────┐
│  Debt Data   │ │  Budget  │ │  Government  │
│              │ │  Data    │ │  Data        │
│ World Bank   │ │ MOF.gov  │ │ Cabinet.gov  │
│ API (free)   │ │ + Claude │ │ + Claude     │
│ No auth      │ │ parsing  │ │ parsing      │
└──────────────┘ └──────────┘ └──────────────┘
```

## Data Sources by Category

### Debt Data
- **Primary**: World Bank API (free, no auth) — `DT.DOD.DECT.CD` indicator for Egypt
- **Secondary**: Central Bank of Egypt (cbe.org.eg) — quarterly reports
- **Validation**: IMF country data (imf.org/en/Countries/EGY)
- **Refresh**: Fully automated via World Bank API
- **Specific URLs**:
  - Debt data: `https://api.worldbank.org/v2/country/EGY/indicator/DT.DOD.DECT.CD?format=json`
  - GDP data: `https://api.worldbank.org/v2/country/EGY/indicator/NY.GDP.MKTP.CD?format=json`
  - Reserves: `https://api.worldbank.org/v2/country/EGY/indicator/FI.RES.TOTL.CD?format=json`

### Budget Data
- **Primary**: Ministry of Finance (mof.gov.eg) — annual budget documents
- **Parsing**: Claude API extracts structured data from budget pages
- **Validation**: Totals must sum correctly (revenue items = total revenue)
- **Refresh**: Semi-automated (Claude parses, human reviews changes)
- **Specific URLs**:
  - Budget statements: `https://www.mof.gov.eg/en/posts/statementsAndReports/5`
  - Financial monthly: `https://www.mof.gov.eg/en/posts/statementsAndReports/6`

### Government/Cabinet Data
- **Primary**: Cabinet of Egypt (cabinet.gov.eg) — minister list
- **Parsing**: Claude API extracts minister names and portfolios
- **Validation**: Cross-referenced with State Information Service (sis.gov.eg)
- **Refresh**: Semi-automated — changes flagged for human review (never auto-writes cabinet changes)
- **Specific URLs**:
  - Cabinet: `https://www.cabinet.gov.eg/English/TheMinistry/Pages/default.aspx`
  - SIS: `https://www.sis.gov.eg/section/352/7510?lang=en`

### Parliament Data
- **Primary**: Egyptian Parliament (parliament.gov.eg) — member list
- **Status**: Manual curation (parliament.gov.eg is a JS-rendered SPA, no public API)
- **Validation**: Member count must equal 596 (House) or 300 (Senate)
- **Specific URLs**:
  - House members: `https://www.parliament.gov.eg/en/MPs`
  - Senate: `https://www.senategov.eg/en/Members`

### Constitution Data
- **Primary**: Presidency of Egypt — constitutional text
- **Status**: Static (constitution changes require national referendum)
- **Validation**: Article count must equal 247
- **URL**: `https://www.sis.gov.eg/section/10/7527?lang=en`

### Election Data
- **Primary**: National Elections Authority (elections.eg)
- **Secondary**: State Information Service (sis.gov.eg)
- **Status**: Updated after each election cycle
- **URLs**:
  - Elections authority: `https://www.elections.eg`
  - 2024 results: `https://www.sis.gov.eg/section/10/7527?lang=en`

## Deterministic Validators

Located in `convex/agents/validators.ts`:

| Validator | What it checks |
|-----------|---------------|
| `validateBudgetTotals` | Budget items sum to expected total (±0.01 tolerance) |
| `validateParliamentCounts` | House = 596, Senate = 300 |
| `validateDebtRecord` | No negative values, GDP ratio < 200% |
| `parseWorldBankResponse` | Parses World Bank API v2 format, filters nulls |
| `extractClaudeText` | Extracts text from Claude API response |

## Data Refresh Log

Every refresh operation is logged to the `dataRefreshLog` table:

| Field | Type | Description |
|-------|------|-------------|
| `category` | string | "government", "parliament", "budget", "debt", "all" |
| `status` | string | "in_progress", "success", "failed" |
| `recordsUpdated` | number | How many records changed |
| `sourceUrl` | string | Which URL was fetched |
| `errorMessage` | string | Error details if failed |
| `startedAt` | number | Timestamp when refresh started |
| `completedAt` | number | Timestamp when completed |

## Queries for Frontend

| Query | File | Purpose |
|-------|------|---------|
| `getLastUpdated` | `dataRefresh.ts` | Get last successful refresh time for a category |
| `getAllLastUpdated` | `dataRefresh.ts` | Get freshness status for all categories |
| `getRefreshHistory` | `dataRefresh.ts` | Get last N refresh attempts for a category |
| `getDataSourceInfo` | Per-module | Get source URLs and names for display |

## Setup

1. Set `ANTHROPIC_API_KEY` in Convex dashboard (Settings → Environment Variables)
2. Without the key, World Bank API data still refreshes (no auth needed), but Claude-powered parsing is skipped
3. Cron job runs automatically every 6 hours
4. Manual trigger: `npx convex run agents/dataAgent:orchestrateRefresh`

## Graceful Degradation

- If Claude API key is missing → skip AI parsing, log warning, use cached data
- If World Bank API is down → log failure, retain existing data
- If a government website is unreachable → log failure, flag for human review
- If validation fails → reject the data, keep existing records, log discrepancy

## Human Review

Government/cabinet changes are NEVER auto-written. The agent:
1. Fetches the current cabinet page
2. Asks Claude to extract minister names
3. Compares with existing database records
4. If differences found → logs them to `dataRefreshLog` with details
5. An admin must manually approve changes

This prevents accidental data corruption from parsing errors.

## LLM Council System

The LLM Council is a multi-model voting system that verifies community-submitted data corrections before they are applied to the database. It adds a layer of automated fact-checking between community input and data changes.

### Current Configuration

The council currently runs on Claude 3.5 Haiku as a single provider. Additional providers (OpenAI, Google models) are planned for v1.2 to enable true multi-model consensus.

### Source Classification

Every data correction includes a source URL. The council classifies sources into tiers that determine how much automated trust they receive:

| Source Type | Domain Pattern | Trust Level | Council Behavior |
|---|---|---|---|
| `gov_eg` | *.gov.eg, *.eg official domains | Auto-high | Council votes with high prior confidence; single model approval sufficient |
| `international_org` | worldbank.org, imf.org, transparencyintl.org | Auto-medium | Council votes normally; majority approval required |
| `media` | Major news outlets (ahram, reuters, bbc) | Low / estimated | Council votes with skepticism; unanimous approval required, data marked as "estimated" if applied |
| `other` | Any other domain | Needs human review | Council may vote but result is advisory only; human approval always required regardless of vote outcome |

### Decision Matrix

Votes are tallied differently depending on the source classification:

- **gov_eg sources**: A single `approve` vote from any council member is sufficient. The assumption is that official Egyptian government sources are authoritative for their own data.
- **international_org sources**: Majority of council members must vote `approve`. Abstentions do not count against the threshold.
- **media sources**: All council members must vote `approve` (unanimous). Any `reject` vote blocks the change. Applied data is tagged with `confidence: "estimated"` rather than `confidence: "verified"`.
- **other sources**: Council votes are recorded but treated as advisory. The change is always routed to human review regardless of the vote outcome.

For all source types, if a council member votes `reject` with a reasoning that cites a contradicting official source, the change is automatically blocked and flagged for human review.

### Integration with GitHub Issues

The council is the middle step in the community correction pipeline:

1. A community member opens a GitHub Issue with label `data-correction`, including the incorrect value, the proposed correct value, and a source URL
2. The GitHub Agent ingests the issue, runs spam detection (rate limiting, duplicate checking, source URL validation), and classifies it
3. If the issue passes spam checks, it is submitted to the LLM Council as a `councilSession`
4. Each council provider evaluates the change independently, producing a vote and reasoning
5. Votes are recorded in the `councilVotes` table and tallied according to the decision matrix above
6. The final decision is recorded in the `councilSessions` table
7. Approved changes are applied to the data layer (or queued for human review if the source type or data category requires it)
8. The original GitHub issue is updated with the council's decision and reasoning

### High-Sensitivity Data Categories

Certain data categories always require human approval, even if the council unanimously approves:

- Government officials (cabinet ministers, governors)
- Election results
- Constitutional articles
- Any change that would modify more than 10 records at once

### Extending the Council

To add a new LLM provider:

1. Create a new file in `convex/agents/providers/` (e.g., `openai.ts`)
2. Implement the `evaluateDataChange()` function:
   - Input: proposed change, source URL, current database value, data category
   - Output: vote (`approve` / `reject` / `abstain`), confidence score (0-1), reasoning text
3. Register the provider in `convex/agents/providers/registry.ts`
4. Set the provider's API key as a Convex environment variable
5. The orchestrator will automatically include the new provider in all future council sessions
