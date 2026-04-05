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
