# project-prompt-mizan-project-name — Claude Rules

## What This Is

# PROJECT_PROMPT: Mizan (ميزان)

**Project Name:** Mizan (Arabic for "balance" / "scales" -- as in the scales of justice and accountability)
**Tagline:** Egypt's government, made visible.

---

## 1. Data Philosophy

**Every number on Mizan MUST be backed by a source.** No data without citation. No hardcoded numbers without a reference URL. This is a transparency platform — the data itself must be transparent.

### Rules:
- ALL data lives in Convex (single source of truth)
- ALL data has a `sourceUrl` field pointing to where it was obtained
- The AI cron agent (every 6h) validates and refreshes data from official sources
- The `/transparency` page shows a full audit trail of what the agent did
- Frontend pages read from Convex — they never hardcode data that should be dynamic
- When data can't be sourced, it must be clearly marked as "estimated" or "unverified"
- Currency: all financial data supports EGP/USD toggle via CurrencyProvider

### Data sources (in priority order):
1. World Bank API (debt, GDP, economic indicators) — automated
2. IMF DataMapper API (GDP/inflation/debt forecasts through 2030) — automated
3. ExchangeRate-API (live USD/EGP daily rate) — automated
4. Ministry of Finance (budget) — AI-parsed from mof.gov.eg
5. Ahram Online (english.ahram.org.eg) (government structure + governors) — AI-parsed
6. Wikipedia + parliament.gov.eg (parliament composition + individual member pages) — automated
7. countryeconomy.com (EGX 30 stock index) — automated scraping
8. FAO/FAOLEX (constitution PDF) — automated extraction
9. CAPMAS (statistics) — manual + AI-assisted

### Centralized Data Registry (`dataSources` table)
The `dataSources` table in Convex is the **agent's manifest** — the single source of truth for what data the pipeline owns and is responsible for refreshing. Every 6h cron run:

1. The pipeline reads all active sources from `dataSources`
2. Each source has a `category` linking it to a refresh function
3. After refreshing, the pipeline updates `lastAccessedDate` on the source
4. The `/methodology` page reads from this table to show users exactly where data comes from
5. The `/transparency` page shows the refresh audit trail

**When adding a new data source:**
- Add it to `dataSources` via `sources.ts:upsertSourceInternal`
- The pipeline auto-registers sources on each successful refresh
- New sources added by the community (via GitHub issues) go through the LLM Council first

**Agent rule:** If a source in `dataSources` has `lastAccessedDate` older than 48h, the pipeline MUST attempt to refresh it regardless of the staleness threshold. This prevents data from going permanently stale.

Managed by Father of Projects (FoP). Stack: nextjs-convex.

## Tech Stack

- **Backend**: Convex (serverless functions, real-time database)
- **Auth**: @convex-dev/auth
- **CLI**: `dev` (Python, Typer + Rich)

## Critical Rules

### Before EVERY code change, read:
1. `convex_rules.txt` — for ALL Convex code
2. `app/convex/_generated/ai/guidelines.md` — Convex AI guidelines and patterns

### Code Quality
- TypeScript ONLY (never JavaScript)
- Never use `any` — use `unknown` or specific interfaces
- Never add `@ts-nocheck`, `@ts-ignore`, `eslint-disable` — fix the actual issue
- Use Convex validators (`v` from `convex/values`) on ALL functions
- Index fields must be queried in order — name indexes `by_field1_and_field2`
- Don't use `.filter()` on Convex queries — use indexes instead

### Git Workflow
- Use git worktrees for parallel work
- Create PRs per work unit
- Always ask before merging

### Approvals — ALWAYS pause for human on:
- Production deployments
- Schema migrations
- Any destructive operations

### Everything Is Code
- No manual workarounds
- All config in version control

### Project CLI (dev)
- This project has its own CLI at `scripts/dev/`
- When adding new features, always add corresponding `dev` commands
- The `dev` CLI is the single entry point for all project operations
- Never bypass `dev` with raw npm/npx commands in documentation
- Add new command groups as `scripts/dev/commands/<group>.py`

### Research Before Coding
- ALWAYS search docs/web before implementing. The hooks WILL block you if you don't.
- Use WebSearch for API docs, library patterns, best practices
- Use WebFetch for specific documentation pages
- Only after researching can you Edit/Write files

### Ask Questions
- Use AskUserQuestion liberally — don't make assumptions about requirements
- When in doubt about design decisions, ask before implementing
- When multiple approaches exist, present options and let the user choose
- Better to ask once than to rewrite twice

### Documentation Sync
- Docs at `docs/` must stay in sync with code
- Run `fop docs sync <project>` after major changes
- Marker files (ARCH_SYNC, FEATURES_SYNC) track last sync point
- NEVER manually edit marker files
