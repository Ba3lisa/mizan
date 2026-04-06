# Mizan AI Data Pipeline

## Overview

Mizan uses an AI-powered data agent built on Convex to keep all government data fresh, validated, and properly sourced. The agent runs every 6 hours via a Convex cron job and orchestrates data collection across all categories.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Convex Cron Jobs                   │
│                                                       │
│  Every 6 hours:                                       │
│    crons.ts → internal.agents.dataAgent.orchestrateRefresh │
│  Daily:                                               │
│    crons.ts → log compaction (delete logs >30 days)   │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│              AI Orchestrator Action                    │
│           convex/agents/dataAgent.ts                  │
│                                                       │
│  1. ensureAllReferenceData (18 tables, zero-cost if   │
│     populated, loads from backup if empty)             │
│  2. Debt refresh (World Bank API)                     │
│  3. Budget refresh (MOF + Claude parsing)             │
│  4. Government refresh (Cabinet + Claude parsing)     │
│  5. Parliament refresh (stub -- JS-rendered SPA)      │
│  6. Constitution refresh (PDF extraction if needed)   │
│  7. GitHub issue processing (LLM Council)             │
│  8. Log compaction (daily, deletes logs >30 days)     │
└──────────────────────┬──────────────────────────────┘
                       │
        ┌──────────┬───┼───────┬──────────┐
        ▼          ▼   ▼       ▼          ▼
┌────────────┐ ┌────────┐ ┌────────┐ ┌──────────┐ ┌──────────┐
│  Debt Data │ │ Budget │ │ Govt   │ │ Constit. │ │ GitHub   │
│            │ │ Data   │ │ Data   │ │ Data     │ │ Issues   │
│ World Bank │ │ MOF +  │ │ Cab. + │ │ FAO PDF  │ │ API +    │
│ API (free) │ │ Claude │ │ Claude │ │ + Claude │ │ Council  │
└────────────┘ └────────┘ └────────┘ └──────────┘ └──────────┘
```

## What the AI Searches

| Source | URL | What It Fetches | How |
|---|---|---|---|
| World Bank API | api.worldbank.org/v2/country/EGY/indicator/DT.DOD.DECT.CD | External debt time series (raw USD) | Direct API call, parse JSON, convert to billions |
| Ministry of Finance | mof.gov.eg/en/open-data | Budget totals (revenue, expenditure, deficit) | Fetch HTML, Claude extracts JSON |
| Cabinet of Egypt | cabinet.gov.eg/en/ | Minister names and titles | Fetch HTML, Claude extracts minister list |
| FAO/FAOLEX | faolex.fao.org/docs/pdf/egy127542e.pdf | Constitution full text (247 articles) | pdf-parse extracts text, Claude structures articles |
| Constitute Project | constituteproject.org/constitution/Egypt_2019 | Constitution reference/verification | Referenced as data source |
| GitHub Issues | github.com/Ba3lisa/mizan/issues | Community data corrections | GitHub API + Claude parsing + LLM Council vote |

## Data Sources by Category

### Debt Data
- **Primary**: World Bank API (free, no auth) -- `DT.DOD.DECT.CD` indicator for Egypt
- **Secondary**: Central Bank of Egypt (cbe.org.eg) -- quarterly reports
- **Validation**: IMF country data (imf.org/en/Countries/EGY)
- **Refresh**: Fully automated via World Bank API. Fetches all available years, converts USD to billions, upserts records. Preserves domestic debt and GDP ratio from existing records when present.
- **Interest rate data**: The `debtByCreditor` table stores per-creditor terms including `interestRate`, `annualDebtService`, and `maturityYears`. These are backfilled via the `debtInterestData:backfillCreditorTerms` function.
- **Specific URLs**:
  - Debt data: `https://api.worldbank.org/v2/country/EGY/indicator/DT.DOD.DECT.CD?format=json`
  - GDP data: `https://api.worldbank.org/v2/country/EGY/indicator/NY.GDP.MKTP.CD?format=json`
  - Reserves: `https://api.worldbank.org/v2/country/EGY/indicator/FI.RES.TOTL.CD?format=json`

### Budget Data
- **Primary**: Ministry of Finance open data page (mof.gov.eg/en/open-data)
- **Parsing**: Claude Haiku 4.5 (`claude-haiku-4-5-20251001`) extracts structured JSON from the page HTML, pulling fiscal year totals for revenue, expenditure, and deficit
- **Content hashing**: The agent hashes the fetched page content and stores it in `dataRefreshLog.contentHash`. If the hash matches the previous refresh, parsing is skipped entirely (zero AI cost for unchanged pages)
- **Validation**: Totals must sum correctly (revenue items = total revenue)
- **Refresh**: Semi-automated (Claude parses, human reviews changes)
- **Specific URLs**:
  - Open data: `https://www.mof.gov.eg/en/open-data`
  - Budget statements: `https://www.mof.gov.eg/en/posts/statementsAndReports/5`
  - Financial monthly: `https://www.mof.gov.eg/en/posts/statementsAndReports/6`

### Government/Cabinet Data
- **Primary**: Cabinet of Egypt (cabinet.gov.eg) -- minister list
- **Parsing**: Claude Haiku 4.5 extracts minister names and portfolios from HTML
- **Auto-write**: Unlike other categories, the government refresh auto-writes via `upsertOfficialAndMinistry` mutation when Claude detects minister changes
- **Validation**: Cross-referenced with State Information Service (sis.gov.eg)
- **Specific URLs**:
  - Cabinet: `https://www.cabinet.gov.eg/en/`
  - SIS: `https://www.sis.gov.eg/section/352/7510?lang=en`

### Parliament Data
- **Primary**: Egyptian Parliament (parliament.gov.eg) -- member list
- **Status**: Stub in the orchestrator. Parliament.gov.eg is a JS-rendered SPA with no public API, so automated scraping is not feasible. Data is manually curated.
- **Validation**: Member count must equal 596 (House) or 300 (Senate)
- **Specific URLs**:
  - House members: `https://www.parliament.gov.eg/en/MPs`
  - Senate: `https://www.senategov.eg/en/Members`

### Constitution Data
- **Primary**: FAO/FAOLEX PDF of the Egyptian constitution
- **Extraction**: If the database has fewer than 247 articles, the agent downloads the PDF from `faolex.fao.org/docs/pdf/egy127542e.pdf`, extracts text using `pdf-parse`, then sends the raw text to Claude to structure it into individual articles with part/chapter grouping
- **Secondary reference**: Constitute Project (`constituteproject.org/constitution/Egypt_2019`)
- **Validation**: Article count must equal 247
- **Refresh**: Only triggered when article count is below 247 (effectively a one-time load)

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
| `category` | string | "government", "parliament", "budget", "debt", "constitution", "all" |
| `status` | string | "in_progress", "success", "failed" |
| `recordsUpdated` | number | How many records changed |
| `sourceUrl` | string | Which URL was fetched |
| `errorMessage` | string | Error details if failed |
| `contentHash` | string | SHA-256 hash of fetched content (used to skip re-parsing unchanged pages) |
| `startedAt` | number | Timestamp when refresh started |
| `completedAt` | number | Timestamp when completed |

## Queries for Frontend

| Query | File | Purpose |
|-------|------|---------|
| `getLastUpdated` | `dataRefresh.ts` | Get last successful refresh time for a category |
| `getAllLastUpdated` | `dataRefresh.ts` | Get freshness status for all categories |
| `getRefreshHistory` | `dataRefresh.ts` | Get last N refresh attempts for a category |
| `getDataSourceInfo` | Per-module | Get source URLs and names for display |

## Content Hashing

To avoid unnecessary AI API calls, the pipeline uses content hashing on fetched pages:

1. When a page is fetched (e.g., the MOF open data page), the raw HTML is SHA-256 hashed
2. The hash is stored in the `dataRefreshLog` record's `contentHash` field
3. On the next refresh cycle, the agent fetches the page again and computes a new hash
4. If the hash matches the previous successful refresh, Claude parsing is skipped entirely
5. This means unchanged pages cost zero AI tokens -- only the HTTP fetch is performed

This is particularly valuable for the budget page, which may only change once per fiscal year but is checked every 6 hours.

## Setup

1. Set `ANTHROPIC_API_KEY` in Convex dashboard (Settings -> Environment Variables)
2. The model used is `claude-haiku-4-5-20251001` (Claude Haiku 4.5) for all data extraction tasks
3. Without the key, World Bank API data still refreshes (no auth needed), but Claude-powered parsing is skipped
4. Cron job runs automatically every 6 hours
5. Manual trigger: `npx convex run agents/dataAgent:orchestrateRefresh`

## Graceful Degradation

- If Claude API key is missing → skip AI parsing, log warning, use cached data
- If World Bank API is down → log failure, retain existing data
- If a government website is unreachable → log failure, flag for human review
- If validation fails → reject the data, keep existing records, log discrepancy

## Alerting

A GitHub Actions workflow (`health-check.yml`) runs every 12 hours and checks that each data category has been refreshed within the last 48 hours. If any category is stale, the workflow creates a GitHub issue automatically to flag the problem.

## Log Compaction

A daily cron job deletes `dataRefreshLog` entries older than 30 days to prevent unbounded table growth. This runs independently of the 6-hour refresh cycle.

## LLM Council System

The LLM Council is a multi-model voting system that verifies community-submitted data corrections before they are applied to the database. It adds a layer of automated fact-checking between community input and data changes.

### Current Configuration

The council currently runs on Claude Haiku 4.5 (`claude-haiku-4-5-20251001`) as a single provider. Additional providers (OpenAI, Google models) are planned for v1.2 to enable true multi-model consensus.

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
