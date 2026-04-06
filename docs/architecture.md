# Mizan -- System Architecture

Full system architecture for Mizan, Egypt's government transparency platform.

Architecture diagram: https://app.excalidraw.com/s/8B4UFPTVlkA/2QtqeIRt0rX

---

## Three-Layer Architecture

Mizan is structured in three layers: a Visual Layer that users interact with, a Data Layer that stores all structured government data, and an Agentic Layer that keeps data fresh and verified.

```
+---------------------------------------------------------------+
|                       VISUAL LAYER                            |
|              React / Next.js Web Application                  |
|                                                               |
|  Pages: /budget, /debt, /parliament, /government,             |
|         /constitution, /elections, /transparency               |
|  Components: Sankey charts, hemicycle, governorate map,        |
|              data tables, search, bilingual toggle             |
|  Providers: CurrencyProvider (EGP/USD), LanguageProvider       |
+---------------------------------------------------------------+
        |                                          ^
        | Convex useQuery / useAction              | Real-time
        | (subscriptions)                          | updates
        v                                          |
+---------------------------------------------------------------+
|                        DATA LAYER                             |
|                    Convex Database                             |
|                                                               |
|  26 tables (20 original + 6 agent/council tables)             |
|                                                               |
|  Core data:                                                   |
|    budgetItems, debtRecords, parliamentMembers,               |
|    governmentOfficials, constitutionArticles,                  |
|    elections, governorates, politicalParties                   |
|                                                               |
|  Agent data:                                                  |
|    dataRefreshLog, agentChangelog, councilVotes,               |
|    councilSessions, githubIssues, fundingRecords              |
|                                                               |
|  Every record has a sourceUrl field.                          |
+---------------------------------------------------------------+
        |                                          ^
        | Reads current data                       | Writes validated
        | for comparison                           | updates
        v                                          |
+---------------------------------------------------------------+
|                      AGENTIC LAYER                            |
|                    Convex Agents                              |
|                                                               |
|  Orchestrator: dataAgent.ts (cron every 6h)                   |
|  LLM Council: multi-model voting on data changes              |
|  GitHub Agent: issue ingestion, spam filtering                |
|  Validators: deterministic checks (sums, counts, ranges)      |
|  Providers: Claude 3.5 Haiku (+ OpenAI, Google planned)       |
+---------------------------------------------------------------+
        |
        | Fetches from external sources
        v
+---------------------------------------------------------------+
|                   EXTERNAL SOURCES                            |
|                                                               |
|  World Bank API        Ministry of Finance (mof.gov.eg)       |
|  Central Bank of Egypt Cabinet portal (cabinet.gov.eg)        |
|  Parliament (SPA)      State Information Service (sis.gov.eg) |
|  CAPMAS statistics     Elections Authority (elections.eg)      |
+---------------------------------------------------------------+
```

## Visual Layer

**Stack**: Next.js 14 (App Router), React, TypeScript, Tailwind CSS, shadcn/ui

The Visual Layer renders all government data as interactive visualizations and searchable interfaces. It never hardcodes data that should be dynamic -- all values come from Convex subscriptions.

Key pages and their visualizations:
- `/budget` -- Sankey flow diagram connecting revenue sources to expenditure categories
- `/debt` -- Time-series charts of external debt, GDP ratios, and creditor composition
- `/parliament` -- Hemicycle seating charts for House (596 seats) and Senate (300 seats), with party breakdown
- `/government` -- Cabinet grid, ministry list, governorate map with governor profiles
- `/constitution` -- Full-text search across all 247 articles
- `/elections` -- Interactive governorate map with historical election results
- `/transparency` -- Audit trail table showing every data refresh the agent has performed

Bilingual support: all pages render in both Arabic (RTL) and English (LTR), switchable via a global toggle. Currency values support EGP/USD conversion via the CurrencyProvider context.

## Data Layer

**Stack**: Convex (serverless database with real-time subscriptions)

All data lives in Convex as the single source of truth. The schema defines 26 tables across two categories:

### Core Data Tables (20 tables)

These store the structured government data that users see:
- `budgetItems` -- Revenue and expenditure line items with amounts, categories, and fiscal year
- `debtRecords` -- External debt snapshots by year with total, GDP ratio, and creditor breakdown
- `parliamentMembers` -- Name, party, governorate, chamber (house/senate), committee assignments
- `governmentOfficials` -- Ministers and governors with portfolio, appointment date, and biography
- `constitutionArticles` -- Article number, title, Arabic text, English text, chapter grouping
- `elections` -- Election type, year, candidates, results by governorate
- `governorates` -- All 27 governorates with population, area, and geographic data
- `politicalParties` -- Party name, founding date, ideology, seat counts

Additional tables cover supporting data: exchange rates, economic indicators, configuration, and user preferences.

### Agent Tables (6 tables)

These support the agentic layer's operations:
- `dataRefreshLog` -- Every refresh attempt with status, record count, source URL, and timestamps
- `agentChangelog` -- Detailed record of what changed and why, for the transparency page
- `councilVotes` -- Individual LLM votes on proposed data changes
- `councilSessions` -- Aggregated voting sessions with final decisions
- `githubIssues` -- Ingested community issues awaiting or completed processing
- `fundingRecords` -- Donation and sponsorship records for the funding transparency page

### Data Integrity Rules

- Every record must have a `sourceUrl` field pointing to where the data was obtained
- Financial data supports both EGP and USD values
- Parliament member counts are validated: House = 596, Senate = 300
- Budget items must sum to their category totals (within 0.01 tolerance)
- Debt values must be non-negative and GDP ratios must be under 200%

## Agentic Layer

**Stack**: Convex actions (server-side), Claude API, deterministic validators

The Agentic Layer is responsible for keeping data fresh and processing community contributions. It consists of four components:

### Orchestrator (dataAgent.ts)

A Convex cron job fires every 6 hours and triggers the orchestrator. It checks which data categories are stale (older than 24 hours) and dispatches category-specific refresh actions. Each refresh:
1. Fetches data from the official source
2. Parses the response (World Bank API returns JSON; government sites require Claude to extract structured data from HTML)
3. Runs deterministic validators
4. Updates the database if validation passes, or logs a failure if it does not

### LLM Council

A multi-model voting system for verifying community-submitted data corrections. When a GitHub issue proposes a data change, the council evaluates the claim against the cited source. Each provider votes independently (approve / reject / abstain), and votes are tallied according to source classification rules. See `ai-data-pipeline.md` for the full decision matrix.

### GitHub Agent

Ingests issues from the Mizan GitHub repository, classifies them (data correction, feature request, bug report, spam), and routes data corrections through the LLM Council pipeline. Includes spam detection to prevent abuse of the community correction system.

### Validators (deterministic)

Located in `convex/agents/validators.ts`. These are pure functions with no LLM involvement:
- `validateBudgetTotals` -- Budget line items sum to expected totals
- `validateParliamentCounts` -- Member counts match constitutional requirements
- `validateDebtRecord` -- No negative values, GDP ratio within bounds
- `parseWorldBankResponse` -- Parses World Bank API v2 JSON format
- `extractClaudeText` -- Extracts structured text from Claude API responses

## Data Flows

### Automated Refresh Flow

```
External Sources (gov APIs, websites)
    |
    v
Orchestrator (every 6h cron)
    |
    v
Category-specific fetcher (HTTP request)
    |
    v
Parser (World Bank JSON / Claude HTML extraction)
    |
    v
Deterministic Validator
    |
    +-- pass --> Update Convex database --> Real-time push to Visual Layer
    |
    +-- fail --> Log to dataRefreshLog --> Flag for human review
```

### Community Correction Flow

```
GitHub Issue (community member submits data correction with source URL)
    |
    v
GitHub Agent (ingests, classifies, spam check)
    |
    v
LLM Council (multi-model vote on correctness)
    |
    +-- approved + low sensitivity --> Apply change to Data Layer
    |
    +-- approved + high sensitivity --> Queue for human review
    |
    +-- rejected --> Close issue with explanation
```

### User Request Flow

```
User visits page (e.g., /budget)
    |
    v
Next.js renders with Convex useQuery subscriptions
    |
    v
Convex returns current data from database
    |
    v
React renders visualization (Sankey chart, hemicycle, etc.)
    |
    v
If data updates in Convex --> real-time push --> UI re-renders automatically
```
