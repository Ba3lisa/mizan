# Contributing to Mizan

Mizan is an open-source civic transparency platform. We welcome contributions through two structured paths: data contributions and UI suggestions.

## Two Contribution Paths

### Path 1: Data Contributions

If you find incorrect, outdated, or missing data on Mizan:

1. Open a GitHub Issue using the [Data Correction](https://github.com/Ba3lisa/mizan/issues/new?template=data-correction.md) or [Stale Data](https://github.com/Ba3lisa/mizan/issues/new?template=stale-data.md) template.
2. Include the **exact data point** that needs correction, the **correct value**, and a **source URL** proving it.
3. The **LLM Council** will automatically review your submission (see below).
4. If approved, the correction is applied in the next data refresh cycle.

#### Source Hierarchy

We prioritize data sources in this order:

| Priority | Source Type | Example | Council Behavior |
|---|---|---|---|
| 1 (Highest) | Egyptian government (.gov.eg) | mof.gov.eg, cabinet.gov.eg | Auto-approved with high confidence |
| 2 | International organizations | World Bank, IMF, UNDP | Auto-approved with medium confidence |
| 3 | Media | Reuters, BBC, Al-Ahram | Approved but marked as "estimated" |
| 4 (Lowest) | Other | Blogs, social media, unverified | Requires human review |

**Non-governmental sources** are accepted but will be clearly marked on the site as "estimated" or "unverified" data.

#### How the LLM Council Works

When you submit a data correction issue:

1. The **GitHub Agent** parses your issue and extracts the proposed correction.
2. A **Council Session** is created, and each registered LLM provider votes on whether to approve the change.
3. The council considers: source credibility, data consistency, URL accessibility, and factual accuracy.
4. Based on the votes and source type, the session resolves to: **approved**, **rejected**, or **needs-human-review**.
5. A comment is posted on your issue with the council's decision and reasoning.

The council currently uses Anthropic Claude 3.5 Haiku. The architecture supports adding more models (OpenAI, Google, etc.) for multi-model consensus in the future.

#### Spam Prevention

To maintain data integrity:
- Issues are processed in batches (max 10 per 6-hour cycle).
- Authors with more than 3 open issues are deprioritized.
- Accounts less than 7 days old are flagged for manual review.
- Duplicate corrections for the same data point are linked to existing review sessions.

### Path 2: UI Contributions

If you have ideas for visual improvements, new visualizations, or UX changes:

1. Open a GitHub Issue using the [UI Suggestion](https://github.com/Ba3lisa/mizan/issues/new?template=ui-suggestion.md) template.
2. Describe the current behavior, proposed change, and why it would be valuable.
3. Include screenshots or mockups if possible.
4. UI issues are reviewed by maintainers during sprint planning.

**We do not accept unsolicited UI pull requests at this time.** All code is written by Claude Code agents and reviewed by the maintainer.

## Development Model

Mizan uses an agent-driven development model:

- **Code authoring**: Claude Code agents write code, triggered by developers.
- **Code review**: OpenAI Codex automatically reviews pull requests.
- **Merge approval**: A human maintainer approves all merges.
- **Data verification**: The LLM Council verifies community data corrections.
- **Data refresh**: A Convex cron job triggers the data agent every 6 hours.

See [docs/agent-development.md](docs/agent-development.md) for the full development workflow.

## Code Guidelines

If you are a maintainer or contributor with commit access:

- **TypeScript only** -- never JavaScript.
- **No `any` type** -- use `unknown` or specific interfaces.
- **No `@ts-ignore` or `eslint-disable`** -- fix the actual issue.
- **Convex validators** on all functions (`v` from `convex/values`).
- **Index-based queries** -- never use `.filter()` on Convex queries.
- **Bilingual strings** -- all user-facing text needs `nameAr`/`nameEn` pairs.
- **Source URLs** -- all data must include a `sourceUrl` field.
- See [convex_rules.txt](convex_rules.txt) for Convex-specific patterns.

## Data Philosophy

**Every number on Mizan must be backed by a source.** No hardcoded numbers without a reference URL. This is a transparency platform -- the data itself must be transparent.

- All data lives in Convex (single source of truth).
- All data has a `sourceUrl` field.
- When data cannot be sourced, it is clearly marked as "estimated" or "unverified."
- The [/transparency](https://mizanmasr.com/transparency) page shows a full audit trail.

## Architecture

See the [architecture documentation](docs/architecture.md) and the [interactive Excalidraw diagram](https://app.excalidraw.com/s/8B4UFPTVlkA/2QtqeIRt0rX).

## License

MIT License -- see [LICENSE](LICENSE).
