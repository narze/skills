---
name: sangkayana
description: Convene a council over the installed agent skills, tally what actually gets used, and prune the canon down to what earns its place.
disable-model-invocation: true
---

# สังคายนา

A **council** convened over the **canon**: every skill installed for the agent. A council recites the canon to find what no longer belongs, and it rules on evidence.

What a removal reclaims is **context load**. A model-invoked skill spends its description on every turn of every session, whether or not it ever fires; a user-invoked one costs nothing until it is typed. `tally.mts` prints that figure. It is what the council is arguing about, so quote it when you report.

## 1. Convene

```shell
node <base directory of this skill>/tally.mts
```

Node 22.18 or newer runs it directly, with no dependencies and no build step.

Read the **horizon** block before the rows. Two evidence streams reach back different distances, and the shorter one governs: typed invocations survive in `history.jsonl` for as long as that file goes back, while model invocations live only in session transcripts, which get swept. Skills shared with other agents can fire where this tally cannot see at all.

State both horizon dates in your report. Every verdict below is bounded by them.

## 2. Read the record

The tally counts. This step asks why. Read for intent:

- `~/.claude/projects/*/memory/*.md` - what the user has recorded about how they want to work.
- `~/.claude/history.jsonl` `display` fields - what they actually asked for, in their own words.

Look for two patterns the counts alone hide. A silent skill the user has asked for in prose is wanted and failing to trigger. A job the user hand-rolls again and again, while a skill sitting in the canon already covers it, is the same failure from the other side.

Completion: you can name, for every silent skill, either a prose trace or its absence.

## 3. Rule on every row

Each skill in the tally gets one verdict and a one-line reason. Match the verdict count to the row count before moving on.

| Verdict | Bar it must clear |
|---|---|
| **keep** | A `last_used` date inside the horizon. |
| **twin** | Another live skill claims the same job. Two descriptions competing for one trigger split the agent's routing, so the weaker copy is pure load. This is the one ground that stands without any usage evidence. |
| **sharpen** | Silent in the tally, yet step 2 found the user asking for the job in prose. The description is failing to trigger. The fix is its wording. |
| **young** | `age_days` shorter than the model horizon's span. Too early to judge. Hold. |
| **silent** | No evidence, old enough to judge, no twin, no prose trace. Silence inside a horizon is a question to carry to the user, and removal needs a reason beyond it. |
| **unmanaged** | `class` is `foreign` or `external`. The lock does not track it, so the removal command will not reach it either. |

Hunt **twin** deliberately: group the rows by the job their names suggest, then read the descriptions in each cluster and say which one you would keep. Clusters are where the real load hides, because every copy pays full price every turn.

## 4. Report

One table, ordered by the context load each row would return. Give the user:

- The two horizon dates, and the load figures the tally printed.
- Verdict and reason per skill.
- For each **twin** cluster, which copy survives and why.

## 5. Prune what is approved

Nothing leaves the canon without an explicit yes, named skill by skill. Then, by `class`:

- `managed`: `npx skills remove -g -y <name> [<name>...]`
- `foreign`: the skill is a real directory at `~/.claude/skills/<name>`. Show the user what it holds, then delete that directory on their word.
- `external`: another application owns the target of the symlink. Name the owner and leave it in place.

For **sharpen**, edit the description rather than removing the skill, and follow `writing-for-agents` for the wording.

Completion: every approved skill is gone from `~/.claude/skills`, and you have re-run `tally.mts` to show the reclaimed load.
