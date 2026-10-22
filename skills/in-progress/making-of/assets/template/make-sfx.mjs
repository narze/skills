// Synthesizes the chat sound effects into public/sfx. Run with `npm run sfx`.
import fs from "node:fs";

const rate = 44100;

const writeWav = (name, samples) => {
  const data = Buffer.alloc(samples.length * 2);
  samples.forEach((s, i) => data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, s)) * 32767), i * 2));
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(rate, 24);
  header.writeUInt32LE(rate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(data.length, 40);
  fs.mkdirSync("public/sfx", { recursive: true });
  fs.writeFileSync(`public/sfx/${name}.wav`, Buffer.concat([header, data]));
};

const render = (seconds, fn) => Array.from({ length: Math.round(seconds * rate) }, (_, i) => fn(i / rate));

// Short soft attack avoids clicks at the start of each sound.
const attack = (t, a = 0.004) => Math.min(1, t / a);

// Send: a quick upward bloop.
let phase = 0;
writeWav("send", render(0.14, (t) => {
  const f = 520 + 700 * (t / 0.14);
  phase += (2 * Math.PI * f) / rate;
  return 0.55 * attack(t) * Math.exp(-t * 28) * Math.sin(phase);
}));

// Receive: a two-note soft chime.
writeWav("receive", render(0.42, (t) => {
  const note = (start, f) => (t < start ? 0 : attack(t - start) * Math.exp(-(t - start) * 11) * (Math.sin(2 * Math.PI * f * (t - start)) + 0.25 * Math.sin(4 * Math.PI * f * (t - start))));
  return 0.32 * (note(0, 880) + note(0.09, 1318.5));
}));

// Status pill: a muted tick.
writeWav("tick", render(0.06, (t) => 0.4 * attack(t, 0.001) * Math.exp(-t * 90) * Math.sin(2 * Math.PI * 1900 * t)));

// Chapter divider: filtered noise swell.
let seed = 7;
let low = 0;
const noise = () => {
  seed = (seed * 16807) % 2147483647;
  return seed / 1073741823.5 - 1;
};
writeWav("whoosh", render(0.5, (t) => {
  const cutoff = 0.03 + 0.25 * Math.sin(Math.PI * (t / 0.5));
  low += cutoff * (noise() - low);
  return 0.9 * Math.sin(Math.PI * (t / 0.5)) ** 2 * low;
}));

// Typing: three soft key taps.
writeWav("typing", render(0.36, (t) => [0, 0.11, 0.24].reduce((sum, start) => {
  const dt = t - start;
  return dt < 0 ? sum : sum + 0.5 * Math.exp(-dt * 160) * noise();
}, 0)));

// Composer keys: a run of irregular, slightly brighter taps while the user types. Cut to length per prompt.
const taps = [];
for (let t = 0.02; t < 2.2; t += 0.055 + 0.05 * ((noise() + 1) / 2)) taps.push(t);
writeWav("keys", render(2.2, (t) => taps.reduce((sum, start, i) => {
  const dt = t - start;
  if (dt < 0 || dt > 0.04) return sum;
  return sum + (0.35 + 0.15 * (i % 3 === 0)) * Math.exp(-dt * 220) * (noise() + 0.6 * Math.sin(2 * Math.PI * 2600 * dt));
}, 0)));
