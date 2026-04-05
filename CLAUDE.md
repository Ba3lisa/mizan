# project-prompt-mizan-project-name — Claude Rules

## What This Is

# PROJECT_PROMPT: Mizan (ميزان)

**Project Name:** Mizan (Arabic for "balance" / "scales" -- as in the scales of justice and accountability)
**Tagline:** Egypt's government, made visible.

---

## 1. 

Managed by Father of Projects (FoP). Stack: nextjs-convex.

## Tech Stack

- **Backend**: Convex (serverless functions, real-time database)
- **Auth**: @convex-dev/auth
- **CLI**: `dev` (Python, Typer + Rich)

## Critical Rules

### Before EVERY code change, read:
1. `convex_rules.txt` — for ALL Convex code

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
