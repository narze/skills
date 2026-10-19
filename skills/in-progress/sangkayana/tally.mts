#!/usr/bin/env node
/**
 * Tally skill usage evidence for the sangkayana council.
 *
 * Skills are installed per agent: a shared store at ~/.agents/skills, plus one
 * directory per agent (~/.claude/skills, ~/.codex/skills, ...) holding either
 * links into that store or its own copies. This walks every root it finds, so a
 * skill installed for another agent is judged rather than missed.
 *
 * A root holds skills directly, category directories one level down, or both, so
 * an entry counts as a skill only where a SKILL.md actually sits.
 *
 * Prints an evidence horizon, then one row per skill:
 *   last_used  typed  model  installed  age_days  invoke  desc_words  class  copies  agents  name
 *
 * class:  managed (lock-tracked) | foreign (untracked copy) | external (owned elsewhere)
 * copies: independent real directories across roots; above 1, removing one leaves the rest.
 * agents: which agents it is installed for. Evidence below only ever witnesses claude.
 * invoke: model (description loaded every turn) | user (typed only, zero context load)
 * last_used: date of most recent evidence, "-" when the record is silent,
 *            "n/a" when it is not installed for claude and no stream could witness it.
 *
 * Runs on Node 22.18+ with no dependencies and no build step. The .mts extension
 * keeps it ESM regardless of any package.json near the install location.
 */
import { globSync, lstatSync, readFileSync, readdirSync, realpathSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join, sep } from "node:path";

const HOME = homedir();
const STORE_AGENT = "agents";
const WITNESSED_AGENT = "claude";
const LOCK = join(HOME, ".agents", ".skill-lock.json");
const HISTORY = join(HOME, ".claude", "history.jsonl");
const TRANSCRIPTS = join(HOME, ".claude", "projects", "*", "*.jsonl");

type Invoke = "model" | "user" | "?";
type Provenance = "managed" | "foreign" | "external";

/** A skills directory belonging to one agent, or to the shared store. */
interface Root {
  /** agent name, e.g. "claude"; STORE_AGENT for the shared store */
  agent: string;
  path: string;
}

/** One skill's usage in a single evidence stream. */
interface Usage {
  count: number;
  /** epoch ms of the most recent hit */
  last: number;
}

/** Where one skill physically sits across the roots. */
interface Placement {
  /** agents it is installed for, excluding the shared store */
  agents: string[];
  inStore: boolean;
  /** independent real directories, so above 1 means duplicate installs */
  copies: number;
  /** resolves outside every root, so another application owns it */
  external: boolean;
  /** best path to read SKILL.md from */
  home: string;
}

interface Row {
  /** epoch ms of the most recent evidence; sorts within a day, never printed */
  lastMs: number;
  last_used: string;
  typed: number;
  model: number;
  installed: string;
  age_days: number | "";
  invoke: Invoke;
  desc_words: number;
  class: Provenance;
  copies: number;
  agents: string;
  name: string;
}

const COLUMNS = [
  "last_used", "typed", "model", "installed", "age_days",
  "invoke", "desc_words", "class", "copies", "agents", "name",
] as const satisfies readonly (keyof Row)[];

/** Local calendar date of an epoch-ms stamp, as YYYY-MM-DD. */
function day(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function read(path: string): string | null {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return null;
  }
}

function bump(into: Map<string, Usage>, name: string, at: number): void {
  const prev = into.get(name);
  into.set(name, { count: (prev?.count ?? 0) + 1, last: Math.max(prev?.last ?? 0, at) });
}

/** Every ~/.<agent>/skills directory on disk, shared store included. */
function roots(): Root[] {
  return globSync(join(HOME, ".*", "skills"))
    .map((path) => ({ agent: basename(dirname(path)).replace(/^\./, ""), path }))
    .filter((r) => {
      try {
        return statSync(r.path).isDirectory();
      } catch {
        return false;
      }
    })
    .sort((a, b) => a.agent.localeCompare(b.agent));
}

/** The skill file inside a directory, if one is there. */
function skillFile(dir: string): string | null {
  for (const file of ["SKILL.md", "skill.md"]) {
    try {
      if (statSync(join(dir, file)).isFile()) return file;
    } catch {
      continue;
    }
  }
  return null;
}

function entriesOf(dir: string): string[] {
  try {
    return readdirSync(dir).filter((n) => !n.startsWith("."));
  } catch {
    return [];
  }
}

/**
 * Skills in one root: an entry holding a SKILL.md is a skill, and an entry
 * holding none is treated as a category and searched one level down.
 */
function skillsIn(root: Root): Array<{ name: string; path: string }> {
  const out: Array<{ name: string; path: string }> = [];
  for (const entry of entriesOf(root.path)) {
    const path = join(root.path, entry);
    if (skillFile(path)) {
      out.push({ name: entry, path });
      continue;
    }
    for (const nested of entriesOf(path)) {
      const nestedPath = join(path, nested);
      if (skillFile(nestedPath)) out.push({ name: nested, path: nestedPath });
    }
  }
  return out;
}

function loadLock(): Record<string, { installedAt?: string }> {
  const raw = read(LOCK);
  if (!raw) return {};
  try {
    return JSON.parse(raw).skills ?? {};
  } catch {
    return {};
  }
}

/** Walk the roots once, recording where every skill sits. */
function placements(all: Root[]): Map<string, Placement> {
  const found = new Map<string, Placement>();
  const rootPaths = all.flatMap((r) => {
    try {
      return [realpathSync(r.path) + sep];
    } catch {
      return [];
    }
  });

  for (const root of all) {
    for (const { name, path } of skillsIn(root)) {
      const place = found.get(name) ??
        { agents: [], inStore: false, copies: 0, external: false, home: path };
      if (root.agent === STORE_AGENT) {
        place.inStore = true;
        place.home = path;
      } else {
        place.agents.push(root.agent);
      }
      try {
        if (lstatSync(path).isSymbolicLink()) {
          const target = realpathSync(path) + sep;
          if (!rootPaths.some((r) => target.startsWith(r))) place.external = true;
        } else {
          place.copies += 1;
        }
      } catch {
        place.external = true;
      }
      found.set(name, place);
    }
  }
  return found;
}

/** Invocation mode and description size, from the skill's frontmatter. */
function frontmatter(home: string): Pick<Row, "invoke" | "desc_words"> {
  const file = skillFile(home);
  if (file !== null) {
    const body = read(join(home, file));
    if (body === null) return { invoke: "?", desc_words: 0 };
    const matched = /^\s*---\s*\n([\s\S]*?)\n---/.exec(body);
    if (!matched) return { invoke: "?", desc_words: 0 };
    const [, fm = ""] = matched;
    const userOnly = /^disable-model-invocation:\s*true/im.test(fm);
    const [, desc = ""] = /^description:[ \t]*(.*(?:\n[ \t]+.*)*)/m.exec(fm) ?? [];
    return { invoke: userOnly ? "user" : "model", desc_words: desc.split(/\s+/).filter(Boolean).length };
  }
  return { invoke: "?", desc_words: 0 };
}

/** Typed /invocations. Complete back to the first entry in history.jsonl. */
function typedUsage(): { hits: Map<string, Usage>; from: number | null } {
  const hits = new Map<string, Usage>();
  const body = read(HISTORY);
  if (body === null) return { hits, from: null };
  let from: number | null = null;
  for (const line of body.split("\n")) {
    if (!line.trim()) continue;
    let entry: { display?: string; timestamp?: number };
    try {
      entry = JSON.parse(line);
    } catch {
      continue;
    }
    const at = entry.timestamp;
    if (typeof at !== "number") continue;
    from = from === null ? at : Math.min(from, at);
    const [, invoked] = /^\s*\/([a-zA-Z0-9_-]+)/.exec(entry.display ?? "") ?? [];
    if (invoked) bump(hits, invoked, at);
  }
  return { hits, from };
}

/** Skill tool-calls in surviving session transcripts. Older sessions get swept. */
function modelUsage(): { hits: Map<string, Usage>; from: number | null } {
  const hits = new Map<string, Usage>();
  let from: number | null = null;
  for (const file of globSync(TRANSCRIPTS)) {
    const body = read(file);
    if (body === null) continue;
    let mtime: number;
    try {
      mtime = statSync(file).mtimeMs;
    } catch {
      continue;
    }
    from = from === null ? mtime : Math.min(from, mtime);
    for (const [, invoked] of body.matchAll(/"skill"\s*:\s*"([a-zA-Z0-9_:-]+)"/g)) {
      // plugin skills arrive as "plugin:skill"; the council judges the skill
      if (invoked) bump(hits, invoked.split(":").at(-1) ?? invoked, mtime);
    }
  }
  return { hits, from };
}

function main(): void {
  const all = roots();
  if (all.length === 0) {
    console.error(`no skills directories found under ${HOME}`);
    process.exit(1);
  }
  const found = placements(all);
  if (found.size === 0) {
    console.error(`no skills installed in any of the ${all.length} roots under ${HOME}`);
    process.exit(1);
  }

  const lock = loadLock();
  const typed = typedUsage();
  const model = modelUsage();

  console.log("EVIDENCE HORIZON");
  console.log(`  typed  (history.jsonl)  reaches back to ${typed.from ? day(typed.from) : "nothing recorded"}`);
  console.log(`  model  (transcripts)    reaches back to ${model.from ? day(model.from) : "nothing recorded"}`);
  console.log("  Silence before a horizon is missing evidence, not disuse.");
  console.log(`  Both streams witness ${WITNESSED_AGENT} alone. Rows marked n/a are installed`);
  console.log("  for other agents, which leave no trace here at all.");
  console.log("  A typed count can also include a built-in command of the same name.");
  console.log(`  roots scanned: ${all.map((r) => r.agent).join(" ")}\n`);

  const today = new Date();
  const rows: Row[] = [...found].map(([name, place]) => {
    const t = typed.hits.get(name);
    const m = model.hits.get(name);
    const last = Math.max(t?.last ?? 0, m?.last ?? 0);
    const witnessed = place.agents.includes(WITNESSED_AGENT);
    const installedAt = lock[name]?.installedAt?.slice(0, 10);
    const installed = new Date(`${installedAt}T00:00:00`);
    const known = installedAt !== undefined && !Number.isNaN(installed.valueOf());
    return {
      lastMs: last,
      last_used: last ? day(last) : witnessed ? "-" : "n/a",
      typed: t?.count ?? 0,
      model: m?.count ?? 0,
      installed: known ? installedAt! : "unknown",
      age_days: known ? Math.floor((today.valueOf() - installed.valueOf()) / 86_400_000) : "",
      ...frontmatter(place.home),
      class: name in lock ? "managed" : place.external ? "external" : "foreign",
      copies: place.copies,
      agents: place.agents.join(",") || "-",
      name,
    };
  });

  rows.sort((a, b) =>
    a.lastMs - b.lastMs ||
    (a.typed + a.model) - (b.typed + b.model) ||
    a.name.localeCompare(b.name));

  console.log(COLUMNS.join("\t"));
  for (const row of rows) console.log(COLUMNS.map((c) => row[c]).join("\t"));

  const witnessed = rows.filter((r) => r.last_used !== "n/a");
  const silent = witnessed.filter((r) => r.typed + r.model === 0);
  const unwitnessed = rows.length - witnessed.length;
  const duplicated = rows.filter((r) => r.copies > 1);
  const load = (rs: Row[]) => rs
    .filter((r) => r.invoke === "model" && r.last_used !== "n/a")
    .reduce((sum, r) => sum + r.desc_words, 0);

  const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
  console.log(`\n${plural(rows.length, "skill")} across ${plural(all.length, "root")}; ` +
    `${silent.length} of the ${witnessed.length} installed for ${WITNESSED_AGENT} ` +
    `${silent.length === 1 ? "has" : "have"} no surviving evidence of use.`);
  if (unwitnessed > 0) {
    console.log(`${unwitnessed} installed for other agents only, where this tally has no evidence stream.`);
  }
  if (duplicated.length > 0) {
    console.log(`${plural(duplicated.length, "skill")} installed more than once, so removing one copy leaves the rest: ` +
      duplicated.map((r) => `${r.name}(${r.copies})`).join(" "));
  }
  console.log(`context load: ~${load(rows)} description words loaded every ${WITNESSED_AGENT} turn, ` +
    `~${load(silent)} of them from skills with no recorded use.`);
}

main();
