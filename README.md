# Mizan (ميزان)

[![Deploy](https://github.com/Ba3lisa/mizan/actions/workflows/deploy.yml/badge.svg?event=release)](https://github.com/Ba3lisa/mizan/actions/workflows/deploy.yml)
[![Lint](https://github.com/Ba3lisa/mizan/actions/workflows/lint.yml/badge.svg)](https://github.com/Ba3lisa/mizan/actions/workflows/lint.yml)
[![Codex Review](https://github.com/Ba3lisa/mizan/actions/workflows/codex-review.yml/badge.svg)](https://github.com/Ba3lisa/mizan/actions/workflows/codex-review.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**Egypt's government, made visible.**

Mizan is a civic transparency platform that makes Egyptian government data accessible, searchable, and understandable. Budget allocations, national debt, parliament members, government structure, and constitutional articles - all in one place, backed by official sources.

ميزان هو منصة شفافية مدنية تجعل بيانات الحكومة المصرية متاحة وقابلة للبحث والفهم. مخصصات الموازنة، الدين العام، أعضاء البرلمان، هيكل الحكومة، ومواد الدستور -- كل ذلك في مكان واحد، مدعوم بمصادر رسمية.

[Live Site](https://mizanmasr.com) | [Roadmap](docs/ROADMAP.md) | [Contributing](CONTRIBUTING.md) | [Architecture](docs/architecture.md)

---

## Architecture

Mizan is built as three layers:

```
┌──────────────────────────────────────────────────────────────┐
│               Visual Layer (Next.js 15 + React 19)           │
│  Budget · Debt · Parliament · Government · Constitution · Elections  │
├──────────────────────────────────────────────────────────────┤
│            Data Layer (Convex Database -- 26+ tables)         │
│     Structured data + Agent changelogs + Data lineage         │
├──────────────────────────────────────────────────────────────┤
│              Agentic Layer (Convex Actions)                    │
│  Orchestrator · LLM Council · GitHub Agent · Validators        │
│  Providers: Anthropic (extensible to OpenAI, Google, etc.)     │
└──────────────────────────────────────────────────────────────┘
         ↑ Every 6 hours                    ↑ GitHub Issues
    Gov sources, APIs, news           Community data corrections
```

[Interactive architecture diagram (Excalidraw)](https://app.excalidraw.com/s/8B4UFPTVlkA/2QtqeIRt0rX) | [Full architecture docs](docs/architecture.md)

## How It Works

1. **Data Collection**: Every 6 hours, AI agents fetch data from official Egyptian government sources, the World Bank API, and other public datasets.
2. **Validation**: Deterministic validators check data integrity. An LLM Council verifies community-submitted corrections.
3. **Transparency**: Every change is logged with source URLs, timestamps, and agent decisions. See it live at [/transparency](https://mizanmasr.com/transparency).
4. **Visualization**: The React frontend renders the data as interactive charts, maps, and searchable directories.

## Contributing

There are two ways to contribute:

### 1. Data Contributions

Found incorrect or outdated data? Open a [Data Correction](https://github.com/Ba3lisa/mizan/issues/new?template=data-correction.md) issue. The LLM Council will verify your submission automatically.

**Source priority**: `.gov.eg` > International organizations > Media > Other

### 2. UI Contributions

Have a visual improvement in mind? Open a [UI Suggestion](https://github.com/Ba3lisa/mizan/issues/new?template=ui-suggestion.md) issue. These are reviewed by maintainers during sprint planning.

See [CONTRIBUTING.md](CONTRIBUTING.md) for full details including the LLM Council verification process and source hierarchy.

## Funding and Transparency

Mizan is funded through [GitHub Sponsors](https://github.com/sponsors/Ba3lisa). Every dollar received and spent is tracked transparently in our database and visible on the [/funding](https://mizanmasr.com/funding) page.

Where the money goes:
- **Infrastructure** -- DigitalOcean hosting, Cloudflare DNS/CDN
- **AI API costs** -- Anthropic Claude for data extraction and verification
- **Data acquisition** -- When paid sources are needed

## Tech Stack

- **Frontend**: Next.js 15, React 19, Tailwind CSS 4
- **Backend**: Convex (real-time serverless database and functions)
- **Charts**: Recharts, Visx, Nivo
- **AI**: Anthropic Claude (data extraction + LLM Council verification)
- **Hosting**: DigitalOcean App Platform
- **DNS/CDN**: Cloudflare
- **CI/CD**: GitHub Actions
- **IaC**: Terraform (Cloudflare + DigitalOcean + GitHub)

## Features

- **Budget Explorer** -- Interactive Sankey flow visualization of Egypt's national budget
- **Debt Tracker** -- Stacked external + domestic debt chart with World Bank API integration, interest rate tracking per creditor, GDP ratio overlay
- **Tax Calculator** -- Personal tax calculator at /budget/your-share using official 2024 brackets (Law 7/2024)
- **Parliament Directory** -- 896 members across House and Senate, searchable
- **Government Structure** -- Current cabinet, ministries, and governorates
- **Constitution** -- Full text of the 2014 constitution (247 articles), full-text search, PDF extraction via pdf-parse + Claude
- **Elections** -- Presidential and parliamentary results with governorate map
- **AI Data Agent** -- Automated 6-hour refresh cycle from official sources with content hashing to skip unchanged pages
- **LLM Council** -- Multi-model verification of community data corrections via Claude Haiku 4.5
- **Pipeline Health Monitoring** -- GitHub Actions health check every 12 hours, auto-creates issues for stale data
- **Transparency Page** -- Full audit trail of every data change
- **Bilingual** -- Arabic and English interface
- **Source Citations** -- Every data point links to its official source

## Running Locally

Prerequisites: Node.js 20+, a Convex account

```bash
# Clone the repo
git clone https://github.com/Ba3lisa/mizan.git
cd mizan/app

# Install dependencies
npm install --legacy-peer-deps

# Set up Convex (follow prompts to create a project)
npx convex dev

# In a separate terminal, start the Next.js dev server
npm run dev
```

The app will be available at `http://localhost:3000`.

## Data Sources

All data is sourced from official Egyptian government publications and accredited international organizations. See the [methodology page](https://mizanmasr.com/methodology) for full details.

Priority sources:
1. World Bank API (debt, GDP, economic indicators) -- automated
2. Central Bank of Egypt (exchange rates, reserves) -- automated
3. Ministry of Finance (budget data) -- AI-parsed
4. Ahram Online (english.ahram.org.eg) (government structure) -- AI-parsed, human-reviewed
5. Wikipedia + parliament.gov.eg (parliament composition + individual member pages) -- automated
6. CAPMAS (national statistics) -- manual + AI-assisted

## Development Model

Code is written by Claude Code agents and reviewed by OpenAI Codex. Human maintainers approve all merges. See [docs/agent-development.md](docs/agent-development.md) for details.

## License

MIT -- see [LICENSE](LICENSE).
