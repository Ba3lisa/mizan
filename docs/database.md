# Mizan Database Documentation

> Convex serverless database — 36 tables, real-time subscriptions, automatic indexing.

See [database-erd.md](./database-erd.md) for the visual entity relationship diagram.

---

## Table of Contents

1. [Government Hierarchy](#government-hierarchy) (3 tables)
2. [Parliament](#parliament) (4 tables)
3. [Constitution](#constitution) (3 tables)
4. [Budget & Spending](#budget--spending) (2 tables)
5. [National Debt](#national-debt) (2 tables)
6. [Elections](#elections) (3 tables)
7. [Economic Data](#economic-data) (5 tables)
8. [AI Pipeline & Audit](#ai-pipeline--audit) (5 tables)
9. [LLM Council](#llm-council) (3 tables)
10. [Polls](#polls) (2 tables)
11. [Funding](#funding) (3 tables)
12. [System](#system) (1 table)

---

## Sanad Level (سند)

Every data table includes a `sanadLevel` field (1-5) indicating source confidence:

| Level | Name | Description |
|-------|------|-------------|
| 1 | Official Government | Direct from .gov.eg (CAPMAS, ministries) |
| 2 | International Org | World Bank, IMF, UNDP |
| 3 | News & Media | Ahram Online, SIS |
| 4 | Other Sources | Wikipedia, community |
| 5 | Derived/Calculated | Computed from other data |

---

## Government Hierarchy

### `officials`
Central table for all government officials (president, ministers, governors, MPs, senators).

| Field | Type | Notes |
|-------|------|-------|
| nameAr, nameEn | string | Bilingual name |
| titleAr, titleEn | string | Official title |
| role | enum | president, prime_minister, minister, deputy_minister, governor, mp, senator, speaker, other |
| isCurrent | boolean | Active in office |
| appointmentDate | string? | ISO date |
| endDate | string? | When left office |
| photoUrl | string? | Portrait URL |
| bioAr, bioEn | string? | Biography |
| sourceUrl | string? | Where data was obtained |
| sanadLevel | number | 1-5 confidence |

**Indexes:** `by_role`, `by_isCurrent`, `by_role_and_isCurrent`

**Referenced by:** ministries, governorates, parliamentMembers, committees

---

### `ministries`
Government ministries with hierarchical structure.

| Field | Type | Notes |
|-------|------|-------|
| nameAr, nameEn | string | Ministry name |
| currentMinisterId | id(officials)? | Current minister |
| parentMinistryId | id(ministries)? | Parent ministry (self-ref) |
| sector | enum? | sovereignty, economic, social, infrastructure |
| employeeCount | number? | Staff size |
| sortOrder | number | Display order |

---

### `governorates`
Egypt's 27 governorates.

| Field | Type | Notes |
|-------|------|-------|
| nameAr, nameEn | string | Governorate name |
| capitalAr, capitalEn | string | Capital city |
| currentGovernorId | id(officials)? | Current governor |
| population | number? | Population count |
| area | number? | Area in km2 |
| isCity | boolean | City-governorate (Cairo, Alex) |
| geoJsonId | string | Map rendering key |
| regionAr, regionEn | string? | Geographic region |

---

## Parliament

### `parties`
Political parties represented in parliament.

| Field | Type | Notes |
|-------|------|-------|
| nameAr, nameEn | string | Party name |
| color | string | Hex color for charts |
| abbreviation | string? | Short form |
| foundedYear | number? | Year established |
| ideology | string? | Political orientation |

---

### `parliamentMembers`
Individual MPs and senators linked to officials, parties, and governorates.

| Field | Type | Notes |
|-------|------|-------|
| officialId | id(officials) | The person |
| chamber | enum | house, senate |
| partyId | id(parties)? | Party affiliation |
| governorateId | id(governorates)? | Representing governorate |
| electionMethod | enum | constituency, party_list, presidential_appointment |
| isCurrent | boolean | Currently serving |
| termStart | string | Term start date |

**Indexes:** `by_chamber`, `by_chamber_and_isCurrent`, `by_partyId`, `by_governorateId`

---

### `committees`
Parliamentary committees (House and Senate).

### `committeeMemberships`
Junction table linking parliamentMembers to committees with role (chair, vice_chair, member).

---

## Constitution

### `constitutionParts`
Major divisions of the 2014 constitution (preamble, chapters).

### `constitutionArticles`
All 247 articles with full Arabic/English text, amendment tracking, and full-text search.

**Search Index:** `search_articles` on `textEn` field — enables instant search.

### `articleCrossReferences`
Relationships between articles (references, amends, contradicts, elaborates).

---

## Budget & Spending

### `fiscalYears`
Annual budget records with revenue, expenditure, deficit, GDP.

### `budgetItems`
Hierarchical budget line items (self-referential via `parentItemId`). Each linked to a fiscal year, categorized as revenue or expenditure.

---

## National Debt

### `debtRecords`
Time-series debt data: external debt, domestic debt, debt-to-GDP ratio, reserves, debt service.

### `debtByCreditor`
Breakdown of debt by creditor (multilateral, bilateral, commercial) with interest rates and maturity terms.

---

## Elections

### `elections`
Presidential, parliamentary, and referendum records.

### `electionResults`
Per-candidate results with vote counts and winner flag.

### `governorateElectionData`
Governorate-level election data: turnout, winner, vote percentages. Links elections to governorates.

---

## Economic Data

### `economicIndicators`
Time-series economic data (GDP growth, inflation, unemployment, exchange rate, reserves, remittances, FDI, tourism, stock market, etc.). **Supports multi-source** — multiple records per indicator+date from different sources.

**Key indicators:** `gdp_growth`, `inflation`, `unemployment`, `exchange_rate`, `reserves`, `remittances`, `fdi_inflows`, `tourism_receipts`, `current_account`, `egx30`, `egx30_annual_return`, `banque_misr_cd_1yr`, `nbe_cd_3yr`, `egypt_tbill_rate`, `gold_annual_return`, `sp500_annual_return`, etc.

### `governorateStats`
Per-governorate statistics (population, area, density, HDI). Multi-source with Sanad levels.

### `taxBrackets`
Egyptian income tax brackets by year.

### `sovereignRatings`
Credit ratings from S&P, Moody's, and Fitch.

### `dataSources`
Registry of all data sources used by the pipeline. Category-tagged, with Sanad levels.

---

## AI Pipeline & Audit

### `dataRefreshLog`
Audit trail of every pipeline run — category, status, records updated, timestamps.

### `dataChangeLog`
Granular per-operation log — what the AI agent created, updated, validated, or flagged.

### `dataLineage`
Provenance tracking for individual data points — source type, confidence, AI verification status.

### `aiResearchReports`
AI-generated verification reports (e.g., "External Debt Verification") with findings and discrepancy counts.

### `pipelineProgress`
Real-time tracking of pipeline runs — each step (government, parliament, budget, debt, economy, governorate_stats, constitution, etc.) with status.

---

## LLM Council

### `councilSessions`
Multi-model voting sessions for data verification. Triggered by GitHub issues, data refreshes, or manual review.

### `councilVotes`
Individual model votes (approve/reject/abstain) with confidence and reasoning.

### `githubIssueProcessing`
Tracks community-submitted data corrections from GitHub Issues through the LLM Council pipeline.

---

## Polls

### `polls`
AI-generated weekly polls with bilingual questions, category tagging, data nuggets, and vote tracking.

### `pollVotes`
Individual anonymous votes linked by visitor hash (localStorage-based, no accounts).

---

## Funding

### `fundingDonations`
Individual donations via GitHub Sponsors or Stripe.

### `fundingAllocations`
Where money goes — infrastructure, AI API costs, development, data acquisition.

### `fundingSummary`
Monthly rollup of donations vs. allocations with running balance.

---

## System

### `apiUsageLog`
Tracks AI API usage (tokens, cost, duration) per provider and purpose.

---

## Key Relationships Summary

```
officials ←── ministries (currentMinisterId)
officials ←── governorates (currentGovernorId)
officials ←── parliamentMembers (officialId)
officials ←── committees (chairpersonId)

parties ←── parliamentMembers (partyId)
parties ←── electionResults (partyId)

governorates ←── parliamentMembers (governorateId)
governorates ←── governorateElectionData (governorateId)
governorates ←── governorateStats (governorateId)

elections ←── electionResults (electionId)
elections ←── governorateElectionData (electionId)

fiscalYears ←── budgetItems (fiscalYearId)
debtRecords ←── debtByCreditor (debtRecordId)

constitutionParts ←── constitutionArticles (partId)
constitutionArticles ←── articleCrossReferences (fromArticleId, toArticleId)

committees ←── committeeMemberships (committeeId)
parliamentMembers ←── committeeMemberships (memberId)

councilSessions ←── councilVotes (sessionId)
councilSessions ←── githubIssueProcessing (councilSessionId)

dataRefreshLog ←── dataChangeLog (refreshLogId)
polls ←── pollVotes (pollId)
```
