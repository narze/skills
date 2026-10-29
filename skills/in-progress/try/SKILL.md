---
name: try
description: Spike a library, framework, CLI, self-hostable app or agent skill in a throwaway sandbox, and serve anything with a UI on the tailnet so the user can poke at it too.
disable-model-invocation: true
---

# Try

A **spike**: the smallest runnable thing that proves or kills the target's headline promise. Every spike lives in its own **sandbox** under `~/try/`, so trying something never touches a real project or the global toolchain.

Arguments: the target (a name, package, repo URL, docs URL or skill path), plus an optional question. `/try ls` and `/try clean` are separate branches at the end.

## 1. Pin the target

Find what the target is, its latest released version (unless the user named one), and its official quickstart. A website URL is assumed to be the homepage of a library, and the target is its source. Hunt down the GitHub repo: links in the page (header, footer, JSON-LD `sameAs`), its `llms.txt`, the package registry entry, then `gh search repos`. Once found, the spike works from the repo, self-hosting from source when it ships an app. Only when no public source exists does the spike fall back to the hosted product or published package, and the report says so. Write the **question** the spike answers: the user's, or else the headline promise from the README ("renders 10k rows without jank", "one-command self-host").

Done when the kind, version and question are settled.

## 2. Make the sandbox

```shell
dir=~/try/$(date +%F)-<slug> && mkdir -p "$dir" && cd "$dir"
```

The sandbox root is yours: `NOTES.md` (target, version, question, source URL), your spike scripts, logs, screenshots, the PID file. Third-party code goes in a subfolder (`app/` for a clone), so what you wrote and what you fetched never mix. Install with lifecycle scripts off first (`npm ci --ignore-scripts`, and the equivalent elsewhere), turning them on only when the build proves it needs them; this also skips heavy binaries like Electron. Keep every install local to the sandbox: project dependencies, `bunx`/`uvx`/`npx` one-shots, `mise use` (local, not `-g`). Anything that wants a system-wide install, a daemon, or a database runs in a container (`docker`, OrbStack is installed).

## 3. Spike it

| Kind | Spike |
| --- | --- |
| Library | One script that calls the headline API on realistic input. |
| Framework | The official scaffold, then one real change past hello-world (a route, a form, a data fetch). |
| CLI | Run it against a real input from one of the user's repos, read-only. |
| Self-hostable app / image | `docker compose up -d` from the official compose file; finish first-run setup. |
| Agent skill | Copy it to `<sandbox>/.claude/skills/<name>/`, then run `claude -p "/<name> ..."` from the sandbox on a realistic task. The user's installed canon stays untouched. |
| Repo URL | Clone into `app/` and follow the README quickstart exactly; note every step where it diverges from reality. |

Reach for the target's own tooling before writing your own: its `package.json` scripts, preview server, and browser tests are the paths its author keeps working. Log in `NOTES.md` as you go: commands that worked, errors and their fixes.

Done when the spike ran and you observed its output yourself: the script's printed result, the skill's produced artifact, or for a UI a headless-browser screenshot (Playwright, `channel: 'chrome'`) taken one interaction past the landing page, with zero console errors. A build that compiled, or a `curl` returning `200`, only shows the server is up.

## 4. Serve it on the tailnet

For anything with an HTTP UI or API:

1. Run it on `127.0.0.1:<port>`, detached so it outlives your turn (`nohup ... > server.log 2>&1 &`, or `docker ... -d`). Record the PID or container name in `NOTES.md`.
2. `<base directory of this skill>/scripts/expose.sh <port>` prints the tailnet URL (`https://<host>.ts.net:<port>`). Pick a port it reports free.
3. `curl` that URL and confirm a `200` before you hand it over.

Exposure stays tailnet-only: `tailscale serve`, never `funnel`.

Gotchas:

- Dev servers that check the `Host` header reject the `.ts.net` name: Vite needs `server.allowedHosts: ['.ts.net']`; others have an equivalent setting.
- Apps that build absolute links from a base URL (most self-hosted apps) need it set to the tailnet URL.

## 5. Report

Write the verdict into `NOTES.md` and reply with:

- **Verdict**: adopt / maybe / drop, answering the question from step 1.
- **What worked** and **what fought back**, with the gotchas worth remembering.
- **Not tested**: the edge of what you observed, so the user knows which part is theirs to judge.
- **Try it**: the tailnet URL and what to click (aimed at the untested part), or the one command to rerun the spike. Embed the screenshot.
- The sandbox path, and the commands to stop the server and `expose.sh <port> off`.

Append one line to `~/try/LOG.md`: `date | target@version | verdict | sandbox | url-or-none`.

## `/try ls`

Print `~/try/LOG.md`, marking which URLs are still live (`expose.sh status`) and which processes are still running.

## `/try clean`

List every sandbox with its live port, process and container. For the ones the user picks: stop the process or container, then `expose.sh <port> off`. Delete a sandbox directory only after the user confirms that specific one.
