import { NextResponse } from "next/server";

export const revalidate = 86400; // 24h — static content

export async function GET() {
  const content = `# Mizan (ميزان)

> Egypt's government data, made visible. A civic transparency platform providing cited, verified data on Egyptian government structure, parliament, constitution, budget, debt, elections, and economy. All data is AI-collected every 6 hours from official sources and fully auditable.

Mizan is an open-source transparency platform at https://mizanmasr.com. Every number is backed by a cited official source. Data is collected, verified, and refreshed every 6 hours by AI agents. The full audit trail is publicly visible.

## Core Data

- [Government Structure](https://mizanmasr.com/government): President, Prime Minister, cabinet ministers, ministries, and 27 governorates with governors
- [Parliament](https://mizanmasr.com/parliament): 596 House members, 300 Senate members, political parties, and committees
- [Constitution](https://mizanmasr.com/constitution): Full text of Egypt's 2014 constitution (247 articles, 6 parts) with 2019 amendments
- [Budget](https://mizanmasr.com/budget): Government revenue, expenditure, deficit, and line-item breakdown by fiscal year
- [Debt](https://mizanmasr.com/debt): External and domestic debt records, debt-to-GDP ratio, creditor breakdown
- [Elections](https://mizanmasr.com/elections): Presidential and parliamentary election results, turnout, and governorate-level data
- [Economy](https://mizanmasr.com/economy): GDP, inflation, unemployment, exchange rate, Suez Canal revenue, foreign reserves

## Data Transparency

- [Transparency Dashboard](https://mizanmasr.com/transparency): Live data health, tracked sources, refresh audit log, verification reports
- [Methodology](https://mizanmasr.com/methodology): How the AI agent collects and verifies data, how to propose corrections
- [Full Data Export (LLM-optimized)](https://mizanmasr.com/llms-full.txt): Complete structured data dump in markdown format

## Data Sources

- [World Bank](https://data.worldbank.org/country/egypt-arab-rep): GDP, external debt, economic indicators (API, automated)
- [Central Bank of Egypt](https://www.cbe.org.eg): Exchange rates, reserves, monetary data (API + AI parsing)
- [Ministry of Finance](https://www.mof.gov.eg): Budget, revenue, expenditure (AI-parsed)
- [Parliament.gov.eg](https://www.parliament.gov.eg): Member names, committees (scraping + AI)
- [IMF](https://www.imf.org/en/Countries/EGY): Country reports, GDP/debt forecasts (API)
- [CAPMAS](https://www.capmas.gov.eg): Population, economic statistics (API + AI)
- [National Elections Authority](https://www.elections.eg): Election results, turnout (AI-parsed)
- [Constitute Project](https://www.constituteproject.org/constitution/Egypt_2019): Constitution full text (PDF extraction)

## Optional

- [GitHub Repository](https://github.com/Ba3lisa/mizan): Open-source code, issues, and contributions
- [Funding](https://mizanmasr.com/funding): How the project is funded, transparent donation tracking
- [Tax Calculator](https://mizanmasr.com/budget/your-share): Interactive tool showing where your taxes go
- [Governorate Finder](https://mizanmasr.com/governorate): Look up your governorate's governor, MPs, and local stats
`;

  return new NextResponse(content, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
    },
  });
}
