// Synthesizes brand/celebrate.wav (box pop -> sparkle chime -> applause) and brand/ring.wav (phone trill for cold opens).
// No downloaded assets: everything is generated here, so there is no license question.
import { writeFile } from 'node:fs/promises';

const SR = 44100;
const DUR = 3.2;
const buf = new Float32Array(Math.round(SR * DUR));
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const noise = () => rnd() * 2 - 1;

// Biquad band-pass (RBJ cookbook).
const bandpass = (f0, q) => {
  const w = (2 * Math.PI * f0) / SR, a = Math.sin(w) / (2 * q), c = Math.cos(w);
  const b0 = a, b2 = -a, a0 = 1 + a, a1 = -2 * c, a2 = 1 - a;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  return (x) => {
    const y = (b0 * x + b2 * x2 - a1 * y1 - a2 * y2) / a0;
    x2 = x1; x1 = x; y2 = y1; y1 = y;
    return y;
  };
};
const add = (t0, n, fn) => {
  const s = Math.round(t0 * SR);
  for (let i = 0; i < n && s + i < buf.length; i++) buf[s + i] += fn(i / SR, i);
};

// 1. Pop: falling sine thump + short click.
add(0, SR * 0.18, (t) => Math.sin(2 * Math.PI * (190 - 600 * t) * t) * Math.exp(-t * 28) * 0.9);
{ const bp = bandpass(2500, 0.8); add(0, SR * 0.03, (t) => bp(noise()) * Math.exp(-t * 160) * 1.4); }

// 2. Sparkle: rising arpeggio with bell-like decay.
[1318.5, 1568, 2093, 2637].forEach((f, k) =>
  add(0.06 + k * 0.07, SR * 0.9, (t) =>
    (Math.sin(2 * Math.PI * f * t) + 0.3 * Math.sin(2 * Math.PI * f * 2.01 * t)) * Math.exp(-t * 5) * 0.16));

// 3. Applause: many single claps (3 micro-bursts each) with a swell-and-fade envelope.
const clap = (t0, f0, gain) => {
  const bp = bandpass(f0, 1.4);
  add(t0, SR * 0.12, (t) => {
    const burst = t < 0.03 ? Math.exp(-((t % 0.01) * 400)) : Math.exp(-(t - 0.03) * 45);
    return bp(noise()) * burst * gain;
  });
};
for (let i = 0; i < 150; i++) {
  const t = 0.12 + rnd() * 2.7;
  const env = Math.min(1, (t - 0.12) / 0.25) * Math.min(1, (2.9 - t) / 0.9);
  clap(t, 900 + rnd() * 1300, 0.55 * env * (0.6 + rnd() * 0.4));
}

const writeWav = async (file, samples) => {
  // Normalize to -1 dBFS and write 16-bit mono WAV.
  let peak = 0;
  for (const v of samples) peak = Math.max(peak, Math.abs(v));
  const g = 0.89 / peak;
  const data = Buffer.alloc(samples.length * 2);
  samples.forEach((v, i) => data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, v * g)) * 32767), i * 2));
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + data.length, 4); h.write('WAVE', 8);
  h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22);
  h.writeUInt32LE(SR, 24); h.writeUInt32LE(SR * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34);
  h.write('data', 36); h.writeUInt32LE(data.length, 40);
  await writeFile(file, Buffer.concat([h, data]));
  console.log(`${file} ${(samples.length / SR).toFixed(1)}s`);
};
await writeWav('brand/celebrate.wav', buf);

// Ring: two bursts of a fast two-tone trill (like a classic phone), soft attack, then silence.
const ring = new Float32Array(Math.round(SR * 2.2));
for (const start of [0, 1.1]) {
  const s0 = Math.round(start * SR), n = Math.round(SR * 0.75);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const f = Math.floor(t / 0.045) % 2 ? 1760 : 1320;
    const env = Math.min(1, t / 0.02) * Math.min(1, (0.75 - t) / 0.05);
    ring[s0 + i] += (Math.sin(2 * Math.PI * f * t) + 0.25 * Math.sin(2 * Math.PI * 2 * f * t)) * env * 0.5;
  }
}
await writeWav('brand/ring.wav', ring);
