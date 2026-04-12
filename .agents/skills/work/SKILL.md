---
name: work
description: Use when the user wants Codex to fan out a coding task across subagents, such as implementing a feature, debugging a cross-cutting issue, reviewing multiple risk areas in parallel, or turning a rough idea into a scoped execution workflow. Prefer explicit invocation with $work. Do not use for tiny single-file edits or simple factual questions.
---

# Work

Use this skill when the task is large enough to benefit from deliberate subagent orchestration.

## What This Skill Does

- Converts a rough request into a short execution plan.
- Encourages parallel subagent usage when the work has separable read-heavy or bounded implementation slices.
- Keeps delegation intentional: use subagents for independent sidecar work, not for the immediate blocking step unless that delegation is still efficient.

## Invocation Pattern

Prefer explicit invocation:

```text
$work implement X
$work debug Y
$work review this branch for A, B, and C
```

There is no custom `/work` slash command in Codex. Use `$work` or plain language like "use subagents for this task".

## Workflow

1. Restate the goal in one or two lines and identify the immediate blocking step.
2. Decide whether subagents are justified.

Use a single agent when:
- the task is a small edit
- the next step is obvious and blocked on one local action
- parallelism would create more coordination cost than value

Use subagents when:
- codebase discovery and implementation can proceed in parallel
- multiple review dimensions are independent
- the task spans distinct write scopes
- documentation verification can run separately from coding

3. If subagents help, choose the minimum set:
- `code_mapper` for tracing code paths and identifying files
- `convex_guard` for Convex/backend integrity checks
- `docs_researcher` for API or framework verification
- `implementer` for bounded code changes after the scope is clear

4. Give each subagent one concrete deliverable.
5. While subagents run, continue with non-overlapping local work.
6. Integrate results, make the final edits, and run relevant checks.

## Prompt Templates

For feature work:

```text
Use subagents for this task.
Have code_mapper identify the affected files and execution path.
Have convex_guard inspect schema/query/mutation risks if Convex is involved.
Then use implementer only for bounded edits once the write scope is clear.
Wait for the agents you need, integrate the result, implement the change, and run the relevant checks.
```

For debugging:

```text
Use subagents for this bug.
Have code_mapper trace the failing path and likely fault points.
Have docs_researcher verify any framework APIs involved.
If backend or data writes are involved, have convex_guard inspect integrity risks.
Then fix the issue and validate it.
```

For review:

```text
Use subagents to review this work in parallel.
Spawn one focused agent per concern area, wait for the results, then summarize the concrete findings in severity order.
```

## Guardrails

- Do not spawn subagents unless the user asked for parallelism/delegation or the prompt explicitly invokes `$work`.
- Prefer read-only agents first.
- Avoid overlapping write scopes across multiple `implementer` runs.
- Keep `max_depth` at 1 unless recursive delegation is truly necessary.
- If the task is vague, spend a short step clarifying the plan before spawning agents.
