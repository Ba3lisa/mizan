# Mizan (ميزان)

[![Deploy](https://github.com/Ba3lisa/mizan/actions/workflows/deploy.yml/badge.svg)](https://github.com/Ba3lisa/mizan/actions/workflows/deploy.yml)
[![Lint](https://github.com/Ba3lisa/mizan/actions/workflows/lint.yml/badge.svg)](https://github.com/Ba3lisa/mizan/actions/workflows/lint.yml)
[![Codex Review](https://github.com/Ba3lisa/mizan/actions/workflows/codex-review.yml/badge.svg)](https://github.com/Ba3lisa/mizan/actions/workflows/codex-review.yml)

**Egypt's government, made visible.**

Mizan is a civic transparency platform that makes Egyptian government data accessible, searchable, and understandable. Budget allocations, national debt, parliament members, government structure, and constitutional articles -- all in one place, backed by official sources.

ميزان هو منصة شفافية مدنية تجعل بيانات الحكومة المصرية متاحة وقابلة للبحث والفهم. مخصصات الموازنة، الدين العام، أعضاء البرلمان، هيكل الحكومة، ومواد الدستور -- كل ذلك في مكان واحد، مدعوم بمصادر رسمية.

## Live Site

[mizanmasr.com](https://mizanmasr.com)

## Screenshot

<!-- TODO: Add screenshot of the landing page -->

## Tech Stack

- **Frontend**: Next.js 15, React 19, Tailwind CSS 4
- **Backend**: Convex (real-time serverless database and functions)
- **Charts**: Recharts, Visx, Nivo
- **Hosting**: DigitalOcean App Platform
- **DNS/CDN**: Cloudflare
- **CI/CD**: GitHub Actions

## Features

- **Budget Explorer** -- Interactive visualization of Egypt's national budget
- **Debt Tracker** -- External and domestic debt figures with historical trends
- **Parliament Directory** -- Searchable database of parliament members
- **Government Structure** -- Current cabinet and ministry organization
- **Constitution** -- Full text of the Egyptian constitution, searchable
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
1. World Bank API (debt, GDP, economic indicators)
2. Central Bank of Egypt (exchange rates, reserves)
3. Ministry of Finance (budget data)
4. Cabinet.gov.eg (government structure)
5. Parliament.gov.eg (member directory)
6. CAPMAS (national statistics)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT -- see [LICENSE](LICENSE).
