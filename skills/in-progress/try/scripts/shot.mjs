#!/usr/bin/env node
// Screenshot one step of a spike UI and report what the page shows.
//   node shot.mjs <out.png> --url <url>       [--do '<js>'] [--wait <ms>]
//   node shot.mjs <out.png> --cdp <endpoint>  [--match <substring>] [--do '<js>'] [--wait <ms>]
// --url launches headless Chrome; --cdp attaches to a running browser or Electron app
// (e.g. http://127.0.0.1:9222) and picks the first page whose URL contains --match.
// --do is an async body with `p` (the Playwright page) in scope, run before the screenshot.
// Prints the URL, the page's visible text and every console error; exits 1 on any error.
// Run from the sandbox after `npm i --ignore-scripts playwright-core` there.
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(path.join(process.cwd(), 'noop.js'));
const { chromium } = require('playwright-core');

const [out, ...rest] = process.argv.slice(2);
const opt = {};
for (let i = 0; i < rest.length; i += 2) opt[rest[i].replace(/^--/, '')] = rest[i + 1];
if (!out || !(opt.url || opt.cdp)) {
  console.error('usage: shot.mjs <out.png> (--url <url> | --cdp <endpoint>) [--match s] [--do js] [--wait ms]');
  process.exit(2);
}

const browser = opt.cdp
  ? await chromium.connectOverCDP(opt.cdp)
  : await chromium.launch({ channel: 'chrome' });
let p;
if (opt.cdp) {
  const pages = browser.contexts().flatMap((c) => c.pages());
  p = pages.find((pg) => pg.url().includes(opt.match ?? ''));
  if (!p) {
    console.error('no page matches; open pages:\n' + pages.map((pg) => '  ' + pg.url()).join('\n'));
    process.exit(2);
  }
} else {
  p = await browser.newPage({ viewport: { width: 1440, height: 900 } });
}

const errors = [];
p.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
p.on('pageerror', (e) => errors.push(String(e)));

if (opt.url) await p.goto(opt.url, { waitUntil: 'networkidle' });
if (opt.do) await new Function('p', `return (async () => { ${opt.do} })()`)(p);
await p.waitForTimeout(Number(opt.wait ?? 1500));
await p.screenshot({ path: out });

console.log('url:', p.url());
console.log((await p.locator('body').innerText()).slice(0, 2000));
console.log('console errors:', errors.length ? errors : 'none');
// Attached sessions only disconnect; the app keeps running.
await browser.close().catch(() => {});
process.exit(errors.length ? 1 : 0);
