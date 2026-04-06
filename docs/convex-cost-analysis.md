# Convex Cost Analysis — Mizan

> Last updated: 2026-04-07
> Status: Development mode (numbers may be inflated by frequent deploys/hot reloads)

## Current Plan: Free & Starter

| Resource | Free Limit | Overage Cost |
|----------|-----------|-------------|
| Database I/O | 1 GB/month | $0.22/GB |
| Database Storage | 0.5 GB | $0.22/GB/month |
| Function Calls | 1M/month | $2.20/1M |
| Data Egress | 1 GB/month | $0.132/GB |
| Action Compute | 20 GB-hours | $0.33/GB-hour |

Source: [Convex Pricing](https://www.convex.dev/pricing)

---

## Bandwidth Audit Summary

### Critical: Queries that read entire tables just to count rows

Convex has no native `COUNT(*)`. The codebase uses `.collect()` on entire tables and checks `.length` — this reads every byte of every document just to get a number.

| Query | File | Tables Collected | Est. Size/Call | Subscribed? |
|-------|------|-----------------|----------------|-------------|
| `adminDashboard.getDataOverview` | `adminDashboard.ts` | 12 tables (take 10000 each) incl. dataChangeLog | 2–8 MB | Yes — transparency page |
| `transparency.getCategoryHealth` | `transparency.ts` | 10 tables (full collect) incl. constitutionArticles | 1–3 MB | Yes — transparency page |
| `government.getHomeStats` | `government.ts` | constitutionArticles + parliamentMembers + governorates | ~1.5 MB | Yes — **homepage (all visitors)** |
| `constitution.listAllArticles` | `constitution.ts` | constitutionArticles (247 articles, full text) | ~1.2 MB | Yes — constitution page |

**Why this matters:** These are real-time subscriptions (`useQuery`). Every write to any of the collected tables triggers a full re-read. During a pipeline run, `dataChangeLog` is written to every few seconds — causing `getDataOverview` to re-execute its 12-table scan for every transparency page visitor on every write.

### High: N+1 Query Patterns

| Query | File | Pattern | Impact |
|-------|------|---------|--------|
| `parliament.listMembers` | `parliament.ts` | 596 members → 3 joins each = 2,384 reads | Parliament page subscription |
| `parliamentQueries.upsertMember` | `parliamentQueries.ts` | 4 full collects × N scraped members | Pipeline mutation (not subscription) |
| `parliamentQueries.updatePlaceholderWithRealName` | `parliamentQueries.ts` | 3 full collects per call × N members | Pipeline mutation |

### Medium: Unbounded Pipeline Log Reads

| Query | File | Pattern | Impact |
|-------|------|---------|--------|
| `transparency.getRefreshTimeline` | `transparency.ts` | `take(500)` on dataRefreshLog, in-memory filter | Transparency page subscription |
| `transparency.getRecentActivity` | `transparency.ts` | 20 logs × 50 change entries each | Transparency page subscription |
| `maintenance.deleteOldRefreshLogs` | `maintenance.ts` | Full collect on dataRefreshLog (no time filter) | Daily cron |

### High Frequency: Pipeline Progress

| Query | File | Pattern | Impact |
|-------|------|---------|--------|
| `pipelineProgress.getProgress` | `pipelineProgress.ts` | `.collect()` all progress rows | **Homepage** — every visitor subscribes, re-fires 12+ times per pipeline run |
| `pipelineProgress.updateStep` | `pipelineProgress.ts` | `.collect()` + JS `.find()` to patch one row | Called every few seconds during pipeline run |

---

## Estimated Monthly Bandwidth (Production)

### Assumptions
- 100 daily visitors, avg 2 pages each
- Pipeline runs 4×/day (every 6h), each run writes ~50 change log entries
- 10% of visitors view transparency page, 20% view constitution

### Per-Visit Database I/O

| Page | Queries | Est. Initial Read | Re-reads/visit |
|------|---------|-------------------|----------------|
| Homepage | getHomeStats + getProgress | ~1.8 MB | 1–2 (if pipeline active) |
| Transparency | 4 queries (health + overview + activity + sources) | ~8 MB | 10+ during pipeline run |
| Constitution | listAllArticles + listAmendedArticles + listParts | ~2.5 MB | Rare |
| Parliament | listMembers + stats (both chambers) | ~3 MB | Rare |
| Budget | getBudgetSankeyData + breakdown | ~0.5 MB | Rare |

### Monthly Estimate

| Source | Calculation | Est. I/O |
|--------|------------|----------|
| Homepage visits | 100/day × 1.8 MB × 30 | ~5.4 GB |
| Transparency page | 10/day × 8 MB × 30 | ~2.4 GB |
| Pipeline re-triggers (subscriptions) | 4 runs/day × 50 writes × 10 subs × 3 MB avg × 30 | ~18 GB |
| Constitution page | 20/day × 2.5 MB × 30 | ~1.5 GB |
| Parliament page | 15/day × 3 MB × 30 | ~1.4 GB |
| Pipeline mutations | 4 runs/day × pipeline reads × 30 | ~2 GB |
| **Total** | | **~30 GB/month** |

### Cost at Current Plan

| Resource | Usage | Free Limit | Overage | Cost |
|----------|-------|-----------|---------|------|
| Database I/O | ~30 GB | 1 GB | 29 GB × $0.22 | **$6.38/month** |
| Function Calls | ~500K | 1M | 0 | $0 |
| Data Egress | ~2 GB | 1 GB | 1 GB × $0.132 | $0.13 |

**Note:** During development with hot reloads, bandwidth can be 5–10x higher since every file save triggers all subscriptions to re-execute.

---

## Optimization Roadmap

### P0 — Critical (saves ~70% of I/O)

1. **Replace count-only collects with counter documents**
   - Create a `_counters` table with one document per tracked table
   - Increment/decrement on insert/delete via internal mutations
   - `getCategoryHealth` and `getDataOverview` read 6 small counter docs instead of scanning 10–12 full tables
   - **Estimated savings: 15–20 GB/month**

2. **Remove `getDataOverview` subscription from transparency page**
   - The transparency page already has `getCategoryHealth` — `getDataOverview` is redundant
   - If table-level breakdowns are needed, create a lightweight `getTableCounts` query using the counter documents
   - **Estimated savings: 5–10 GB/month**

3. **Stop collecting constitutionArticles just for counting**
   - `getHomeStats` should use a counter document, not read 247 full-text articles
   - This fires on every homepage visit
   - **Estimated savings: 3–5 GB/month**

### P1 — High (saves ~15% of I/O)

4. **Add `by_runId_and_step` index to pipelineProgress**
   - `updateStep` currently collects all 12 rows to find one
   - With a composite index: `.withIndex("by_runId_and_step", q => q.eq("runId", x).eq("step", y)).unique()`
   - Reads 1 document instead of 12 per step update

5. **Add `by_wasAmended2019` index to constitutionArticles**
   - `listAmendedArticles` currently scans all 247 articles with in-memory filter
   - With index: reads only ~20 amended articles

6. **Fix `listMembers` N+1 pattern**
   - Batch-fetch unique parties and governorates first, then map
   - Reduces ~2,384 reads to ~630

### P2 — Medium (saves ~10% of I/O)

7. **Fix `getRefreshTimeline` to use index filter**
   - Use `by_category_and_startedAt` index with a time range instead of `take(500)` + in-memory filter

8. **Fix `maintenance.deleteOldRefreshLogs` to use time filter**
   - Filter by `startedAt` range using existing index instead of collecting everything

9. **Consider pagination for `listAllArticles`**
   - On constitution page, load article summaries first, full text on demand
   - Reduces initial load from ~1.2 MB to ~100 KB

---

## Pro Plan Consideration

If optimizations bring usage to ~10 GB/month, the free plan works fine (1 GB free + $0.22/GB = ~$2/month overage).

If traffic grows beyond 500 daily visitors, Pro plan ($25/month) provides 50 GB Database I/O and would be cost-effective.

---

## Monitoring

Track these metrics monthly:
- **Database I/O** — Convex dashboard → Usage tab
- **Top queries by bandwidth** — `npx convex dashboard` → Functions tab
- **Subscription count** — Monitor active WebSocket connections
- Run `npx convex insights` for detailed function-level metrics
