# Mizan Roadmap

Public roadmap for Mizan -- Egypt's government, made visible.

Last updated: 2026-04-07

---

## v1.0 -- Shipped

The foundation: a fully functional transparency platform covering all major branches of the Egyptian government, backed by live data sources and bilingual support.

- **Budget Explorer** -- Sankey flow visualization of Egypt's national budget (revenue sources flowing to expenditure categories), with EGP/USD toggle
- **Debt Tracker** -- External debt history and composition powered by World Bank API integration, with GDP ratio analysis and creditor breakdown
- **Parliament Directory** -- Complete member directory for both the House of Representatives (596 members) and the Senate (300 members), with party composition hemicycle charts and committee assignments
- **Government Structure** -- Cabinet ministers, ministries, and all 27 governorates with governor profiles
- **Constitution Search** -- Full text of all 247 articles of the 2014 Constitution (as amended), with instant full-text search
- **Elections History** -- Presidential and parliamentary election results with interactive governorate map
- **AI Data Agent** -- Automated data refresh cycle every 12 hours, pulling from World Bank API, Ministry of Finance, Cabinet portal, and other official sources
- **Transparency Page** -- Full audit trail of every data refresh the agent has performed, including successes, failures, and data change counts
- **Bilingual Arabic/English Interface** -- Complete right-to-left Arabic support alongside English, switchable from any page
- **Your Tax Share** -- Personal tax calculator at /budget/your-share showing where your taxes go, powered by live budget data from Convex and official tax brackets (7 brackets, Law 7/2024)
- **Stacked Debt Chart** -- External and domestic debt visualized as a stacked area chart with GDP ratio overlay
- **Pipeline Health Monitoring** -- GitHub Actions workflow (`health-check.yml`) runs every 12 hours, creates issues if any data category has not refreshed in 48 hours
- **Source Citations** -- Every data point on the platform links to its original source URL; no number exists without a citation

## v1.1 -- Shipped

Community verification infrastructure and open source readiness.

- **LLM Council** -- Multi-model voting system for community-submitted data corrections; currently powered by Claude Haiku 4.5, with additional providers planned
- **Debt Interest Rate Tracking** -- Per-creditor interest rates, annual debt service, and maturity terms on the `debtByCreditor` table, with backfill tooling
- **Batch GitHub Issue Processing** -- GitHub Agent that ingests community data correction issues, classifies them, and routes them through the LLM Council with built-in spam prevention
- **Funding Transparency Page** -- Public display of all project funding via GitHub Sponsors, tracked in Convex so contributors can see exactly where money goes
- **Open Source Project Infrastructure** -- Contributing guide, issue templates, code of conduct, and CI/CD pipeline for community contributions
- **Agent-Driven Development Documentation** -- Full documentation of how AI agents write, review, and verify code and data in this project

## v1.2 -- Shipped

Multi-source Sanad reference confidence system and governorate stats pipeline.

- **Sanad (سند) System** -- 6-level reference confidence system (Consensus, Official Gov, Intl Org, News, Other, Derived) applied to every data point across the platform. Colored dots next to numbers indicate source trust level.
- **Governorate Stats Pipeline** -- New `governorate_stats` pipeline category fetching population, area, density, and HDI from Wikipedia (CAPMAS-sourced). Parses wikitables and fuzzy-matches all 27 governorates.
- **Multi-Source Display** -- When multiple sources report different values for the same indicator, all values are shown side-by-side with Sanad badges and source links. Weighted consensus detection (score ≥ 6) identifies when sources agree.
- **Shared Sanad Components** -- `SanadBadge` (inline dot), `SanadValue` (3-mode: single/consensus/conflict), shared `sanad.ts` library with consensus scoring
- **sanadLevel on All Tables** -- Required field on economicIndicators, debtRecords, fiscalYears, budgetItems, officials, elections, electionResults, taxBrackets, sovereignRatings, governorateStats, dataSources
- **Homepage Live Stats** -- Replaced hardcoded stats with live Convex queries (total parliamentarians, governorates, constitution articles, external debt)
- **Economy Multi-Source** -- economicIndicators supports multiple sources per indicator+date with `getAllLatestMultiSource` query

## v1.3 -- Planned

Personal relevance and economic context.

- **Multi-Model LLM Council** -- Expand the council beyond Claude to include OpenAI and Google models for more robust consensus on data verification
- **LLM-Guided Sanad Scoring** -- Replace manual Sanad level assignment (the only opinionated part of Mizan) with automated LLM Council-based confidence scoring. The council will cross-reference sources, detect conflicts, and assign Sanad levels through multi-model consensus voting.
- **UI Contribution Agent** -- Automated feasibility analysis for community-proposed UI changes, generating effort estimates and implementation plans

## v2.0 -- Future

Deep accountability tools and personalized civic engagement.

- **/promises** -- Government promises tracker covering Vision 2030 goals, presidential campaign commitments, and infrastructure megaprojects, each with status tracking (not started / in progress / completed / stalled) and evidence links
- **/governorate/[name]** -- Personalized governorate dashboard showing your governor, your MPs, your senators, local budget allocations, and governorate-level economic indicators
- **/legislation** -- Legislation tracker following bills through parliament with timeline visualization, committee assignments, and full-text search of the Official Gazette
- **/transparency/corruption** -- Corruption perception indices from Transparency International, World Bank governance indicators, and regional comparisons
- **/tools/tax-calculator** -- Full Egyptian tax calculator supporting income tax brackets, social insurance contributions, and comparison with regional peers (Saudi Arabia, UAE, Jordan)

---

## How to Influence the Roadmap

Mizan is an open source project. The roadmap is shaped by community input.

- **Request a feature**: Open a GitHub Issue with the `feature-request` label describing what you want to see and why it matters for Egyptian transparency.
- **Report bad data**: Open a GitHub Issue with the `data-correction` label. Include the correct value and a source URL. The LLM Council will verify your correction.
- **Contribute code**: See the contributing guide for how to pick up roadmap items and submit pull requests.
- **Vote on priorities**: Add a thumbs-up reaction to existing feature request issues to signal what matters most to you.

All issues are triaged and discussed publicly. The maintainer team reviews priorities on a rolling basis.
