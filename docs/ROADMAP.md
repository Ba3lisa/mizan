# Mizan Roadmap

Public roadmap for Mizan -- Egypt's government, made visible.

Last updated: 2026-04-06

---

## v1.0 -- Shipped

The foundation: a fully functional transparency platform covering all major branches of the Egyptian government, backed by live data sources and bilingual support.

- **Budget Explorer** -- Sankey flow visualization of Egypt's national budget (revenue sources flowing to expenditure categories), with EGP/USD toggle
- **Debt Tracker** -- External debt history and composition powered by World Bank API integration, with GDP ratio analysis and creditor breakdown
- **Parliament Directory** -- Complete member directory for both the House of Representatives (596 members) and the Senate (300 members), with party composition hemicycle charts and committee assignments
- **Government Structure** -- Cabinet ministers, ministries, and all 27 governorates with governor profiles
- **Constitution Search** -- Full text of all 247 articles of the 2014 Constitution (as amended), with instant full-text search
- **Elections History** -- Presidential and parliamentary election results with interactive governorate map
- **AI Data Agent** -- Automated data refresh cycle every 6 hours, pulling from World Bank API, Ministry of Finance, Cabinet portal, and other official sources
- **Transparency Page** -- Full audit trail of every data refresh the agent has performed, including successes, failures, and data change counts
- **Bilingual Arabic/English Interface** -- Complete right-to-left Arabic support alongside English, switchable from any page
- **Your Tax Share** -- Personal tax calculator at /budget/your-share showing where your taxes go, powered by live budget data from Convex and official tax brackets (Law 7/2024)
- **Source Citations** -- Every data point on the platform links to its original source URL; no number exists without a citation

## v1.1 -- In Progress

Community verification infrastructure and open source readiness.

- **LLM Council** -- Multi-model voting system for community-submitted data corrections; currently powered by Claude 3.5 Haiku, with additional providers planned
- **Batch GitHub Issue Processing** -- GitHub Agent that ingests community data correction issues, classifies them, and routes them through the LLM Council with built-in spam prevention
- **Funding Transparency Page** -- Public display of all project funding via GitHub Sponsors, tracked in Convex so contributors can see exactly where money goes
- **Open Source Project Infrastructure** -- Contributing guide, issue templates, code of conduct, and CI/CD pipeline for community contributions
- **Agent-Driven Development Documentation** -- Full documentation of how AI agents write, review, and verify code and data in this project

## v1.2 -- Planned

Personal relevance and economic context.

- **/economy** -- Economic indicators dashboard tracking GDP growth, inflation (CPI), unemployment, EGP exchange rates, foreign reserves, Suez Canal revenue, tourism revenue, and diaspora remittances
- **Multi-Model LLM Council** -- Expand the council beyond Claude to include OpenAI and Google models for more robust consensus on data verification
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
