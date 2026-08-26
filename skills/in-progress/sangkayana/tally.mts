#!/usr/bin/env node
/**
 * Tally skill usage evidence for the sangkayana council.
 *
 * Prints an evidence horizon, then one row per installed skill:
 *   last_used  typed  model  installed  age_days  invoke  desc_words  class  name
 *
 * class:  managed (lock-tracked symlink) | foreign (hand-placed dir) | external (symlink elsewhere)
 * invoke: model (description loaded every turn) | user (typed only, zero context load)
 * desc_words: size of the always-loaded description; the context load a removal reclaims.
 * last_used: date of most recent evidence, or "-" when the record is silent.
 *
 * Runs on Node 22.18+ with no dependencies and no build step. The .mts extension
 * keeps it ESM regardless of any package.json near the install location.
 */
import { globSync, lstatSync, readFileSync, readdirSync, realpathSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join, sep } from "node:path";

const HOME = homedir();
const SKILLS = join(HOME, ".claude", "skills");
const LOCK = join(HOME, ".agents", ".skill-lock.json");
const HISTORY = join(HOME, ".claude", "history.jsonl");
const TRANSCRIPTS = join(HOME, ".claude", "projects", "*", "*.jsonl");

type Invoke = "model" | "user" | "?";
type Provenance = "managed" | "foreign" | "external";

/** One skill's usage in a single evidence stream. */
interface Usage {
  count: number;
  /** epoch ms of the most recent hit */
  last: number;
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
  name: string;
}

const COLUMNS = [
  "last_used", "typed", "model", "installed", "age_days",
  "invoke", "desc_words", "class", "name",
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

function loadLock(): Record<string, { installedAt?: string }> {
  const raw = read(LOCK);
  if (!raw) return {};
  try {
    return JSON.parse(raw).skills ?? {};
  } catch {
    return {};
  }
}

function provenance(name: string): Provenance {
  const path = join(SKILLS, name);
  try {
    if (!lstatSync(path).isSymbolicLink()) return "foreign";
    const target = realpathSync(path) + sep;
    return target.includes(`${sep}.agents${sep}skills${sep}`) ? "managed" : "external";
  } catch {
    return "foreign";
  }
}

/** Invocation mode and description size, from the skill's frontmatter. */
function frontmatter(name: string): Pick<Row, "invoke" | "desc_words"> {
  for (const file of ["SKILL.md", "skill.md"]) {
    const body = read(join(SKILLS, name, file));
    if (body === null) continue;
    const matched = /^\s*---\s*\n([\s\S]*?)\n---/.exec(body);
    if (!matched) return { invoke: "?", desc_words: 0 };
    const [, fm = ""] = matched;
    const userOnly = /^disable-model-invocation:\s*true/im.test(fm);
    const [, desc = ""] = /^description:[ \t]*(.*(?:\n[ \t]+.*)*)/m.exec(fm) ?? [];
    const words = desc.split(/\s+/).filter(Boolean).length;
    return { invoke: userOnly ? "user" : "model", desc_words: words };
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
  const lock = loadLock();
  let names: string[];
  try {
    names = readdirSync(SKILLS).filter((n) => !n.startsWith(".")).sort();
  } catch {
    console.error(`no skills directory at ${SKILLS}`);
    process.exit(1);
  }

  const typed = typedUsage();
  const model = modelUsage();

  console.log("EVIDENCE HORIZON");
  console.log(`  typed  (history.jsonl)  reaches back to ${typed.from ? day(typed.from) : "nothing recorded"}`);
  console.log(`  model  (transcripts)    reaches back to ${model.from ? day(model.from) : "nothing recorded"}`);
  console.log("  Silence before a horizon is missing evidence, not disuse.");
  console.log(`  Skills shared with other agents may have fired outside ${SKILLS} entirely.\n`);

  const today = new Date();
  const rows: Row[] = names.map((name) => {
    const t = typed.hits.get(name);
    const m = model.hits.get(name);
    const last = Math.max(t?.last ?? 0, m?.last ?? 0);
    const installedAt = lock[name]?.installedAt?.slice(0, 10);
    const installed = new Date(`${installedAt}T00:00:00`);
    const known = installedAt !== undefined && !Number.isNaN(installed.valueOf());
    return {
      lastMs: last,
      last_used: last ? day(last) : "-",
      typed: t?.count ?? 0,
      model: m?.count ?? 0,
      installed: known ? installedAt! : "unknown",
      age_days: known ? Math.floor((today.valueOf() - installed.valueOf()) / 86_400_000) : "",
      ...frontmatter(name),
      class: provenance(name),
      name,
    };
  });

  rows.sort((a, b) =>
    a.lastMs - b.lastMs ||
    (a.typed + a.model) - (b.typed + b.model) ||
    a.name.localeCompare(b.name));

  console.log(COLUMNS.join("\t"));
  for (const row of rows) console.log(COLUMNS.map((c) => row[c]).join("\t"));

  const silent = rows.filter((r) => r.typed + r.model === 0);
  const load = (rs: Row[]) =>
    rs.filter((r) => r.invoke === "model").reduce((sum, r) => sum + r.desc_words, 0);
  console.log(`\n${rows.length} ${rows.length === 1 ? "skill" : "skills"} in the canon; ` +
    `${silent.length} with no surviving evidence of use.`);
  console.log(`context load: ~${load(rows)} description words loaded every turn, ` +
    `~${load(silent)} of them from skills with no recorded use.`);
}

main();
