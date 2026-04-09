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
|  26+ tables (core data + agent/council/funding tables)        |
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
|  Orchestrator: dataAgent.ts (cron every 12h)                   |
|  LLM Council: multi-model voting on data changes              |
|  GitHub Agent: issue ingestion, spam filtering                |
|  Validators: deterministic checks (sums, counts, ranges)      |
|  Providers: Claude Haiku 4.5 (+ OpenAI, Google planned)       |
+---------------------------------------------------------------+
        |
        | Fetches from external sources
        v
+---------------------------------------------------------------+
|                   EXTERNAL SOURCES                            |
|                                                               |
|  World Bank API        Ministry of Finance (mof.gov.eg)       |
|  Central Bank of Egypt Ahram Online (ahram.org.eg)            |
|  Wikipedia (parliament) State Information Service (sis.gov.eg)|
|  CAPMAS statistics     Elections Authority (elections.eg)      |
|  FAO/FAOLEX (constitution PDF)                                |
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

All data lives in Convex as the single source of truth. The schema defines 26+ tables across several categories:

### Core Data Tables

These store the structured government data that users see:
- `officials` (59 records) -- Ministers and governors with portfolio, appointment date, and biography
- `ministries` (27) -- Ministry names, descriptions, and associated officials
- `governorates` (27) -- All 27 governorates with population, area, and geographic data
- `parties` (8) -- Party name, founding date, ideology, seat counts
- `parliamentMembers` (30) -- Name, party, governorate, chamber (house/senate), committee assignments
- `committees`, `committeeMemberships` -- Parliamentary committee structure and member assignments
- `constitutionParts` (6), `constitutionArticles` (247), `articleCrossReferences` -- Full constitution structure with cross-references between articles
- `fiscalYears` (3), `budgetItems` (31) -- Revenue and expenditure line items with amounts, categories, and fiscal year
- `debtRecords` (10) -- External debt snapshots by year with total, GDP ratio, and creditor breakdown
- `debtByCreditor` -- Per-creditor debt breakdown with `interestRate`, `annualDebtService`, and `maturityYears` fields
- `elections` (3), `electionResults`, `governorateElectionData` -- Election results with governorate-level granularity
- `taxBrackets` (7 brackets for 2024) -- Income tax brackets per Law 7/2024, powering the /budget/your-share calculator

Additional tables cover supporting data: exchange rates, economic indicators, `dataSources`, `dataLineage`, and `aiResearchReports`.

### Agent and Infrastructure Tables

These support the agentic layer's operations:
- `dataRefreshLog` -- Every refresh attempt with status, record count, source URL, `contentHash` (for skip-if-unchanged), and timestamps
- `dataChangeLog` -- Detailed record of what changed and why, for the transparency page
- `councilSessions`, `councilVotes` -- LLM Council voting sessions and individual votes
- `githubIssueProcessing` -- Ingested community issues awaiting or completed processing
- `fundingDonations`, `fundingAllocations`, `fundingSummary` -- Donation and sponsorship records for the funding transparency page

### Data Integrity Rules

- Every record must have a `sourceUrl` field pointing to where the data was obtained
- Financial data supports both EGP and USD values
- Parliament member counts are validated: House = 596, Senate = 300
- Budget items must sum to their category totals (within 0.01 tolerance)
- Debt values must be non-negative and GDP ratios must be under 200%

## Agentic Layer

**Stack**: Convex actions (server-side), Claude Haiku 4.5 API, pdf-parse (for constitution PDF extraction), deterministic validators

The Agentic Layer is responsible for keeping data fresh and processing community contributions. It consists of four components:

### Orchestrator (dataAgent.ts)

A Convex cron job fires every 12 hours and triggers the orchestrator. The orchestrator runs the following steps in sequence:
1. **ensureAllReferenceData** -- checks all 18 tables, loads from backup if empty (zero cost if populated)
2. **Debt refresh** -- fetches from World Bank API, converts USD to billions, upserts all available years
3. **Budget refresh** -- fetches MOF page, uses content hashing to skip when unchanged, Claude extracts fiscal year totals
4. **Government refresh** -- fetches Ahram Online (english.ahram.org.eg), Claude detects minister changes, auto-writes via upsertOfficialAndMinistry. Ahram Online is used because cabinet.gov.eg is JS-rendered and inaccessible to server-side fetch.
5. **Parliament refresh** -- composition from Wikipedia API (2025 election), member names from parliament.gov.eg individual pages (regex + Claude), batched via Convex scheduler
6. **Constitution refresh** -- checks if article count is below 247, downloads PDF from FAO, extracts with pdf-parse + Claude
7. **GitHub issue processing** -- processes data-correction/stale-data issues via LLM Council
8. **Log compaction** -- daily cron deletes refresh logs older than 30 days

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
Orchestrator (every 12h cron)
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
