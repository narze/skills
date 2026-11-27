---
name: lgtm
description: Take the current change to a green PR, and merge it with `/lgtm and merge`.
disable-model-invocation: true
---

# LGTM

Own the change from its current state to a green PR. Merge only when the arguments say so (`/lgtm and merge`). Without them, stop at green and leave the PR open.

The user is not watching. Your updates go unread until you stop.

## Steps

1. **Open the PR.** Find the PR for the current branch. If none exists: branch off the default branch if you are on it, push, and open a PR. Skip this step when one exists.
2. **Advisory review.** Start a fresh subagent that reads the diff and the PR description, and nothing else from your context. Ask for findings with a file, a line, and a reason. Judge each finding yourself: fix it (test first), or dismiss it with a written reason. Push the fixes.
3. **Babysit.** Watch the PR so that something wakes you when it changes (`watch_pull_request` in T3 Code). Each time it wakes, read the PR again and fix what you find:
   - **Review comments** from bots and humans: fix, or reply with a reason. Resolve the thread.
   - **CI failures**: read the failing log, reproduce locally, fix the cause, push. A flaky test is a failure to fix too.
   - **Conflicts**: rebase onto the default branch, resolve, and push with `--force-with-lease`. Only this PR's own branch.
4. **Green.** Repeat step 3 until all of these are true on the latest commit:
   - Required checks pass.
   - Review bots have finished, and every finding is fixed or dismissed with a written reason.
   - No human review requests changes.
   - GitHub reports the PR as mergeable with the default branch.
5. **Finish.**
   - With `merge`: merge with the method the repo uses (check the allowed methods and recent merged PRs). If a merge queue or auto-merge is on, stay until GitHub reports the PR as merged. Merge through branch protection as configured.
   - Without `merge`: stop and report that the PR is green and ready.
   - Call `unwatch_pull_request` before you stop.

Stay active until step 5. If you end your turn while checks or bots are pending, nobody wakes you.

## Asking the user

Use the harness question tool (`AskUserQuestion` in Claude Code). A question in a normal message goes unseen. Include the PR link, the blocker, and your recommended option first.

Ask only when you cannot continue alone: the goal is ambiguous in a way that changes the result, a finding needs a product decision, or green cannot be reached. Decide everything else yourself.

## Report

Your final message has: the PR link, the merge commit (if merged), and each finding you dismissed with its reason.
