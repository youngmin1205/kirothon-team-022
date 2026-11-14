// Film template v5.1: ~60s highlight reel. v5 adds a Screen Studio-style camera (zoom to each beat, cursor, focus ring).
// The live demo and the voice carry the rest of a 3-4 min pitch.
// Was v3: The live demo and the voice carry the rest of a 3-4 min pitch.
// Structure: .kiro/skills/pitch-deck/references/film-schema.md (8 sections). Copy comes from product.md, look comes from design.md (`npm run sync`).
import React from 'react';
import {
  AbsoluteFill, Sequence, OffthreadVideo, Img, Audio, Freeze, staticFile, useCurrentFrame,
  interpolate, spring, continueRender, delayRender, Easing, random,
} from 'remotion';
import * as Icons from 'lucide-react';
import d from './design.json';
import P from './product.json';
import cap from '../public/beats.json';

export const FPS = 30;
const FAST = 1.5; // demo playback before the celebration
const SLOW = 1.25; // demo playback after it
const HOLD = 3.0; // seconds the screen freezes for the celebration
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

// ---------- demo time remapping (source seconds -> output seconds) ----------
const beatAt = (id: string) => (cap.beats as { id: string; at: number }[]).find((b) => b.id === id)!.at;
const CEL = P.demo.celebrate;
const clipStart = cap.clickAt;
const clipEnd = cap.end - 1.0;
const freezeAt = beatAt(CEL.at) + 0.35;
type Seg = { from: number; to: number; rate: number; hold?: number };
const SEGS: Seg[] = [
  { from: clipStart, to: freezeAt, rate: FAST },
  { from: freezeAt, to: freezeAt, rate: 1, hold: HOLD },
  { from: freezeAt, to: clipEnd, rate: SLOW },
];
const segLen = (s: Seg) => s.hold ?? (s.to - s.from) / s.rate;
const segStart: number[] = [];
let o = 0;
for (const s of SEGS) { segStart.push(o); o += segLen(s); }
const DEMO_SEC = o;
const srcToOut = (t: number) => {
  for (let i = 0; i < SEGS.length; i++) {
    const s = SEGS[i];
    if (s.hold) continue;
    if (t <= s.to || i === SEGS.length - 1) return segStart[i] + (Math.max(t, s.from) - s.from) / s.rate;
  }
  return 0;
};
const toF = (sec: number) => Math.round(sec * FPS);
const CEL_F = toF(srcToOut(beatAt(CEL.at))); // demo-local frame of the "took" moment
const HOLD_END_C = toF(segStart[1] + HOLD) - CEL_F; // celebration-local frame where playback resumes
const BURST = 16; // celebration-local frame where the box pops

// ---------- timeline (seconds) ----------
const SCENES = {
  opening: (P.opening as { hook?: string }).hook ? 5.5 : 4.5, problem: 5.5, solution: 4.5, demo: DEMO_SEC,
  trust: 4.5, arch: 5, kiro: 4.5, closing: 6,
};
const order = ['opening', 'problem', 'solution', 'demo', 'trust', 'arch', 'kiro', 'closing'] as const;
type Key = (typeof order)[number];
const LABEL: Record<Key, string> = {
  opening: '오프닝', problem: '문제', solution: '해결', demo: '데모',
  trust: '신뢰', arch: '작동 방식', kiro: 'Kiro 활용', closing: '마무리',
};
const starts = {} as Record<Key, number>;
let acc = 0;
for (const k of order) { starts[k] = toF(acc); acc += SCENES[k]; }
export const FILM_FRAMES = toF(acc);
const len = (k: Key) => toF(SCENES[k]);

// ---------- fonts ----------
const fontHandle = delayRender('fonts');
Promise.all(
  [['Regular', 400], ['SemiBold', 600], ['Bold', 700], ['ExtraBold', 800]].map(([n, w]) =>
    new FontFace('Pretendard', `url(${staticFile(`fonts/Pretendard-${n}.otf`)})`, { weight: String(w) }).load()
      .then((f) => document.fonts.add(f))),
).then(() => continueRender(fontHandle));

// ---------- primitives ----------
const S = d.size;
const M = d.margin;

// Motion preset (design.md / motion): one curve, blur-to-sharp entrances, no overshoot.
const MO = d.motion;
const EASE = Easing.bezier(MO.ease[0], MO.ease[1], MO.ease[2], MO.ease[3]);
const enterAt = (f: number, delay: number, dur = MO.enter) => interpolate(f - delay, [0, dur], [0, 1], { ...clamp, easing: EASE });
const blurIn = (t: number, rise = MO.rise, blur = MO.blur): React.CSSProperties => ({
  opacity: t, transform: `translateY(${(1 - t) * rise}px)`, filter: t < 1 ? `blur(${(1 - t) * blur}px)` : undefined,
});

// Default entrance: blur clears while the element rises.
const useFade = (delay = 0): React.CSSProperties => blurIn(enterAt(useCurrentFrame(), delay));

// Title entrance: words appear one after another, each clearing from a blur.
const Reveal: React.FC<{ text: string; delay?: number; style?: React.CSSProperties }> = ({ text, delay = 0, style }) => {
  const f = useCurrentFrame();
  let w = 0;
  return (
    <div style={style}>
      {text.split('\n').map((ln, i) => (
        <div key={i}>
          {ln.split(' ').map((word, j) => {
            const t = enterAt(f, delay + (w++) * MO.wordStagger, MO.enter);
            return <span key={j} style={{ display: 'inline-block', whiteSpace: 'pre', ...blurIn(t, 18, MO.blur) }}>{word}{j < ln.split(' ').length - 1 ? ' ' : ''}</span>;
          })}
        </div>
      ))}
    </div>
  );
};

const card: React.CSSProperties = {
  background: d.surface, border: `1px solid ${d.line}`, borderRadius: 20, boxShadow: d.shadow,
};

const Icon: React.FC<{ name: string; size?: number; color?: string; sw?: number }> = ({ name, size = 32, color = d.text, sw = 1.75 }) => {
  const C = (Icons as unknown as Record<string, React.FC<any>>)[name] ?? Icons.Circle;
  return <C size={size} color={color} strokeWidth={sw} />;
};

// Chrome shared by every scene: chapter progress bar, section index, assertion title, exit fade.
// `bare` drops the chapter chrome for full-bleed scenes (opening, product reveal, demo, closing) so the film
// does not read as a slide deck.
const Frame: React.FC<{ k: Key; title?: string; bare?: boolean; children: React.ReactNode }> = ({ k, title, bare, children }) => {
  const f = useCurrentFrame();
  const idx = order.indexOf(k);
  const out = interpolate(f, [len(k) - MO.exit, len(k) - 1], [1, 0], { ...clamp, easing: Easing.in(Easing.cubic) });
  return (
    <AbsoluteFill style={{ background: d.bg, fontFamily: d.font, color: d.text, fontVariantNumeric: 'tabular-nums', wordBreak: 'keep-all' }}>
      {!bare && <>
      <div style={{ position: 'absolute', left: M, right: M, top: 40, display: 'flex', gap: 8 }}>
        {order.map((kk, i) => (
          <div key={kk} style={{ flex: 1, height: 4, borderRadius: 2, background: d.line, overflow: 'hidden' }}>
            <div style={{ height: '100%', background: d.accent,
              width: `${i < idx ? 100 : i > idx ? 0 : interpolate(f, [0, len(k)], [0, 100], clamp)}%` }} />
          </div>
        ))}
      </div>
      <div style={{ position: 'absolute', left: M, top: 66, right: M, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontSize: S.index, fontWeight: 700, letterSpacing: -0.3 }}>
          <span style={{ color: d.accent, fontWeight: 700, fontSize: S.index + 2 }}>{String(idx + 1).padStart(2, '0')}</span>
          <span style={{ display: 'inline-block', width: 18 }} />{LABEL[k]}
        </span>
        <span style={{ fontSize: 22, color: d.faint, fontWeight: 600 }}>{P.service} · {P.team}</span>
      </div>
      </>}
      <AbsoluteFill style={{ opacity: out, transform: `scale(${0.97 + 0.03 * out})`, filter: out < 1 ? `blur(${(1 - out) * 8}px)` : undefined }}>
        {title && (
          <Reveal text={title} style={{ position: 'absolute', left: M, top: 136, right: M, fontSize: S.title * 0.78, fontWeight: 700,
            letterSpacing: -1.5, lineHeight: 1.22 }} />
        )}
        {children}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const Note: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div style={{ fontSize: S.note, color: d.faint, ...style }}>{children}</div>
);

// Device: "phone" (phone frame around a cropped phone screen) or "browser" (browser window around the viewport).
const BROWSER = (cap as { device?: string }).device === 'browser';

// ---------- camera (Screen Studio-style, calm) ----------
// capture.mjs stores each beat's box (screen-crop px) and when it was measured (boxAt, after any scroll).
// Rules that keep the demo calm: browser only (a phone screen is already large), at most ZMAX, the whole box
// plus context stays in view, a shot holds at least MIN_HOLD, and no move if the target is already in view.
// No outline is drawn on the recording: app content keeps moving, so an outline drifts off its target.
type Box = { x: number; y: number; w: number; h: number };
type Beat = { id: string; at: number; boxAt?: number; box?: Box; frame?: { x: number; w: number }; tap?: boolean };
const SB = cap.screenBox;
const ZMAX = 1.45;
const CAM_DUR = 40, MIN_HOLD = 75; // frames
// A shot is a zoom level plus the top-left of the visible page area. The view starts a little left of the
// target, so the cut falls on the right side of the page (where reading ends) instead of through the target's column.
type Shot = { f: number; z: number; vx: number; vy: number };
const WIDE: Omit<Shot, 'f'> = { z: 1, vx: 0, vy: 0 };
const MARGIN = 64; // page px kept around the target when there is no frame group
const shotFor = ({ x, y, w, h }: Box, frame?: { x: number; w: number }): Omit<Shot, 'f'> => {
  if (w > SB.width * 0.6 || h > SB.height * 0.6) return WIDE;
  // Horizontal: fit the frame group edge to edge (plus a gutter), so the cuts fall between columns.
  const fw = frame ? frame.w + 32 : w + MARGIN * 2;
  const z = Math.max(1, Math.min(ZMAX, SB.width / fw, (SB.height * 0.7) / h));
  const vw = SB.width / z, vh = SB.height / z;
  const fcx = frame ? frame.x + frame.w / 2 : x + w / 2;
  const fy = y + h / 2 - vh * 0.45;
  return { z, vx: Math.min(SB.width - vw, Math.max(0, fcx - vw / 2)), vy: Math.min(SB.height - vh, Math.max(0, fy)) };
};
const SHOTS: Shot[] = [{ f: 0, ...WIDE }];
if (BROWSER) {
  for (const b of cap.beats as Beat[]) {
    if (!b.box) continue;
    const { x, y, w, h } = b.box;
    const f = toF(srcToOut(b.boxAt ?? b.at));
    const last = SHOTS[SHOTS.length - 1];
    const next = shotFor(b.box, b.frame);
    const lw = SB.width / last.z, lh = SB.height / last.z, m = 24;
    const inView = x >= last.vx + m && y >= last.vy + m && x + w <= last.vx + lw - m && y + h <= last.vy + lh - m;
    if (inView && Math.abs(next.z - last.z) < 0.2) continue; // already readable where we are
    if (f - last.f < MIN_HOLD) continue; // too soon after the last move
    SHOTS.push({ f, ...next });
  }
  SHOTS.push({ f: Math.max(SHOTS[SHOTS.length - 1].f + MIN_HOLD, toF(DEMO_SEC) - 50), ...WIDE });
}
const camAt = (f: number) => {
  let c: Omit<Shot, 'f'> = SHOTS[0];
  for (const k of SHOTS.slice(1)) {
    const t = enterAt(f, k.f - 8, CAM_DUR);
    if (t <= 0) break;
    c = { z: c.z + (k.z - c.z) * t, vx: c.vx + (k.vx - c.vx) * t, vy: c.vy + (k.vy - c.vy) * t };
  }
  return { z: c.z, tx: -c.vx * c.z, ty: -c.vy * c.z };
};
const toScreen = (p: { x: number; y: number }, cam: { z: number; tx: number; ty: number }) => ({ x: cam.z * p.x + cam.tx, y: cam.z * p.y + cam.ty });

// Pointer: only on beats marked `tap`. It arrives, presses exactly when the beat fires, and leaves at once,
// because the tapped control usually changes right after.
const Pointer: React.FC<{ f: number; scale: number; cam: { z: number; tx: number; ty: number } }> = ({ f, scale, cam }) => (
  <>
    {(cap.beats as Beat[]).filter((b) => b.box && b.tap).map((b) => {
      const bf = toF(srcToOut(b.at));
      if (f < bf - 24 || f > bf + 12) return null;
      const target = toScreen({ x: b.box!.x + b.box!.w / 2, y: b.box!.y + b.box!.h / 2 }, cam);
      const glide = enterAt(f, bf - 24, 18);
      const x = (target.x + (1 - glide) * 120) * scale, y = (target.y + (1 - glide) * 90) * scale;
      const press = f >= bf - 3 && f < bf + 3 ? 0.85 : 1;
      const ripple = interpolate(f, [bf - 3, bf + 10], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
      const op = Math.min(interpolate(f, [bf - 24, bf - 18], [0, 1], clamp), interpolate(f, [bf + 4, bf + 12], [1, 0], clamp));
      return (
        <div key={b.id} style={{ position: 'absolute', left: 0, top: 0, opacity: op, pointerEvents: 'none' }}>
          {f >= bf - 3 && <div style={{ position: 'absolute', left: x - 36, top: y - 36, width: 72, height: 72, borderRadius: 36,
            border: '3px solid rgba(255,255,255,0.9)', transform: `scale(${0.3 + ripple})`, opacity: 1 - ripple }} />}
          {BROWSER ? (
            <svg width={34} height={40} viewBox="0 0 17 20" style={{ position: 'absolute', left: x - 3, top: y - 2, transform: `scale(${press})`, transformOrigin: '3px 2px',
              filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.35))' }}>
              <path d="M1.5 1.5 L1.5 16 L5.4 12.4 L8.2 18.4 L10.8 17.2 L8.1 11.4 L13.4 11.2 Z" fill="#fff" stroke="#1d1d1f" strokeWidth={1.2} strokeLinejoin="round" />
            </svg>
          ) : (
            <div style={{ position: 'absolute', left: x - 24, top: y - 24, width: 48, height: 48, borderRadius: 24, background: 'rgba(255,255,255,0.45)',
              border: '2px solid rgba(255,255,255,0.85)', boxShadow: '0 4px 14px rgba(0,0,0,0.3)', transform: `scale(${press})` }} />
          )}
        </div>
      );
    })}
  </>
);

// Emulator: neutral device frame around the recorded app screen, with time remapping (fast -> freeze -> normal).
// `camera` turns on zoom, focus ring and pointer (demo scene only; the product reveal uses the still).
const Emulator: React.FC<{ scale: number; still?: boolean; camera?: boolean }> = ({ scale, still, camera }) => {
  const f = useCurrentFrame();
  const sb = cap.screenBox;
  const w = sb.width * scale, h = sb.height * scale;
  const cam = camera ? camAt(f) : { z: 1, tx: 0, ty: 0 };
  const vid = (startSec: number, rate: number) => (
    <OffthreadVideo src={staticFile('demo.webm')} startFrom={toF(startSec)} playbackRate={rate} muted
      style={{ position: 'absolute', left: -sb.x * scale, top: -sb.y * scale,
        width: cap.view.width * scale, height: cap.view.height * scale, maxWidth: 'none' }} />
  );
  const screen = (
    <div style={{ width: w, height: h, borderRadius: BROWSER ? '0 0 14px 14px' : 40, overflow: 'hidden', position: 'relative', background: '#fff' }}>
      {still ? (
        <Img src={staticFile('home.png')} style={{ width: w, height: h }} />
      ) : (
        <div style={{ position: 'absolute', left: 0, top: 0, width: w, height: h, transformOrigin: '0 0',
          transform: `translate(${cam.tx * scale}px, ${cam.ty * scale}px) scale(${cam.z})` }}>
          {SEGS.map((s, i) => (
            <Sequence key={i} from={toF(segStart[i])} durationInFrames={Math.max(1, toF(segLen(s)))}>
              {s.hold ? <Freeze frame={0}>{vid(s.from, 1)}</Freeze> : vid(s.from, s.rate)}
            </Sequence>
          ))}
        </div>
      )}
      {camera && <Pointer f={f} scale={scale} cam={cam} />}
    </div>
  );
  if (BROWSER) return (
    <div style={{ borderRadius: 16, background: d.surface, border: `1px solid ${d.line}`, boxShadow: '0 40px 80px rgba(28,26,31,0.16)', overflow: 'hidden' }}>
      <div style={{ height: 44, display: 'flex', alignItems: 'center', gap: 8, padding: '0 18px', background: '#efece7', borderBottom: `1px solid ${d.line}` }}>
        {['#e0605a', '#e3a72f', '#4fb468'].map((c) => <span key={c} style={{ width: 12, height: 12, borderRadius: 6, background: c }} />)}
        <span style={{ marginLeft: 18, flex: 1, maxWidth: 420, height: 26, borderRadius: 8, background: d.surface, fontSize: 15, color: d.faint,
          display: 'flex', alignItems: 'center', padding: '0 12px', fontFamily: d.font }}>{P.service}</span>
      </div>
      {screen}
    </div>
  );
  return (
    <div style={{ padding: 14, borderRadius: 52, background: '#1c1a1f', boxShadow: '0 40px 80px rgba(28,26,31,0.22)' }}>{screen}</div>
  );
};

// Layout per device (scene coordinates, 1920x1080). The demo window is as large as the frame allows.
const LAYOUT = BROWSER
  ? { emu: { left: 90, top: 150, scale: 1160 / cap.screenBox.width }, still: 660 / cap.screenBox.width, pop: { left: 1290, top: 210, width: 540 } }
  : { emu: { left: 560, top: 150, scale: 0.66 }, still: 0.6, pop: { left: 1080, top: 240, width: 720 } };

const Tag: React.FC<{ tone: 'ok' | 'bad' | 'neutral' | 'accent'; children: React.ReactNode }> = ({ tone, children }) => {
  const map = { ok: [d.ok, d.okSoft], bad: [d.bad, d.badSoft], accent: [d.accent, d.accentSoft], neutral: [d.muted, d.bg] } as const;
  const [c, bg] = map[tone];
  return <span style={{ fontSize: 22, fontWeight: 700, color: c, background: bg, padding: '6px 14px', borderRadius: 8, whiteSpace: 'nowrap' }}>{children}</span>;
};

// ---------- 01 opening ----------
// With `opening.hook`, the film opens cold on the product name (it hooks faster than a question alone).
const HOOK = (P.opening as { hook?: string }).hook;
const SFX = (P.opening as { sfx?: string }).sfx;
const Opening = () => {
  const f = useCurrentFrame();
  const kb = interpolate(f, [0, len('opening')], [1, 1.06]);
  if (!HOOK) return (
    <Frame k="opening" bare>
      <div style={{ position: 'absolute', left: M, top: 300, width: 960 }}>
        <div style={{ ...useFade(0), fontSize: S.body, color: d.muted, fontWeight: 600 }}>{P.opening.persona}</div>
        <Reveal text={P.opening.title} delay={6} style={{ fontSize: 128, fontWeight: 700, letterSpacing: -4, lineHeight: 1.12, marginTop: 28 }} />
      </div>
      <div style={{ ...useFade(12), position: 'absolute', right: M - 20, top: 220 }}>
        <Img src={staticFile(P.opening.image)} style={{ width: 640, height: 640, transform: `scale(${kb})` }} />
      </div>
    </Frame>
  );
  // Name slams in, hook line slides up, then the persona question. The illustration shakes like a ringing phone.
  const slam = enterAt(f, 0, 30);
  const shake = f < 60 ? Math.sin(f * 1.7) * 2 * (1 - f / 60) : 0;
  return (
    <Frame k="opening" bare>
      {SFX && <Audio src={staticFile(SFX)} volume={0.55} />}
      <div style={{ position: 'absolute', left: M, top: 250, width: 1060 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 28, opacity: slam, filter: slam < 1 ? `blur(${(1 - slam) * 24}px)` : undefined,
          transform: `scale(${1.06 - 0.06 * slam})`, transformOrigin: 'left center' }}>
          <div style={{ width: 120, height: 120, borderRadius: 32, background: d.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
            <Icon name={P.logoIcon} size={64} color="#fff" sw={2} />
          </div>
          <div style={{ fontSize: 132, fontWeight: 700, letterSpacing: -4.5, whiteSpace: 'nowrap' }}>{P.service}</div>
        </div>
        <Reveal text={HOOK} delay={10} style={{ fontSize: 60, fontWeight: 700, letterSpacing: -1.5, lineHeight: 1.3, marginTop: 44 }} />
        <div style={{ ...useFade(36), marginTop: 60, fontSize: S.body + 2, color: d.muted, fontWeight: 600, lineHeight: 1.6, whiteSpace: 'pre-line' }}>
          {P.opening.persona}<br />
          <span style={{ color: d.accent, fontWeight: 700 }}>{P.opening.title.replace('\n', ' ')}</span>
        </div>
      </div>
      <div style={{ ...useFade(8), position: 'absolute', right: M - 20, top: 220 }}>
        <Img src={staticFile(P.opening.image)} style={{ width: 640, height: 640, transform: `scale(${kb}) rotate(${shake}deg)` }} />
      </div>
    </Frame>
  );
};

// ---------- 02 problem ----------
const Problem = () => {
  const f = useCurrentFrame();
  const n = interpolate(f, [10, 46], [0, P.problem.stat], { ...clamp, easing: Easing.out(Easing.cubic) });
  return (
    <Frame k="problem" title={P.problem.title}>
      <div style={{ position: 'absolute', left: M, top: 400, width: 860 }}>
        <div style={{ ...useFade(6), fontSize: S.hero, fontWeight: 700, letterSpacing: -8, color: d.accent, lineHeight: 1 }}>
          {n.toLocaleString('en-US', { minimumFractionDigits: P.problem.statDecimals, maximumFractionDigits: P.problem.statDecimals })}<span style={{ fontSize: S.hero * 0.45 }}>{P.problem.statSuffix}</span>
        </div>
        <div style={{ ...useFade(12), fontSize: S.body, marginTop: 24, fontWeight: 600, lineHeight: 1.5 }}>{P.problem.statLabel}</div>
      </div>
      <div style={{ position: 'absolute', left: 1080, top: 470, width: 720 }}>
        {P.problem.bars.map(([label, v, shown], i) => {
          const t = interpolate(f, [20 + i * 8, 56 + i * 8], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
          const hi = i === P.problem.barHighlight;
          return (
            <div key={label as string} style={{ ...useFade(16 + i * 8), marginBottom: 40 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: S.body, fontWeight: 700, color: hi ? d.text : d.muted }}>
                <span>{label}</span><span style={{ color: hi ? d.accent : d.muted }}>{shown}</span>
              </div>
              <div style={{ height: 22, borderRadius: 11, background: d.line, marginTop: 14, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${((v as number) / P.problem.barMax) * 100 * t}%`, borderRadius: 11, background: hi ? d.accent : d.faint }} />
              </div>
            </div>
          );
        })}
        <Note style={useFade(30)}>출처: {P.problem.source}</Note>
      </div>
    </Frame>
  );
};

// ---------- 03 solution (product reveal) ----------
const Solution = () => {
  const f = useCurrentFrame();
  const t = interpolate(f, [0, len('solution')], [0, 1], { ...clamp, easing: Easing.out(Easing.quad) });
  const logo = enterAt(f, 2);
  return (
    <Frame k="solution" bare>
      <div style={{ position: 'absolute', left: M, top: 290, width: 1000 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 26 }}>
          <div style={{ width: HOOK ? 72 : 104, height: HOOK ? 72 : 104, borderRadius: HOOK ? 20 : 28, background: d.accent, display: 'flex', alignItems: 'center', justifyContent: 'center',
            transform: `scale(${0.6 + 0.4 * logo})`, opacity: logo }}>
            <Icon name={P.logoIcon} size={HOOK ? 38 : 56} color="#fff" sw={2} />
          </div>
          {!HOOK && <Reveal text={P.service} delay={4} style={{ fontSize: 120, fontWeight: 700, letterSpacing: -4 }} />}
        </div>
        {HOOK ? <>
          {/* the name already appeared in the opening, so this scene leads with the promise */}
          <Reveal text={P.solution.tagline} delay={6} style={{ fontSize: 96, fontWeight: 700, letterSpacing: -3.5, lineHeight: 1.18, marginTop: 40 }} />
          <div style={{ ...useFade(20), fontSize: 34, fontWeight: 600, color: d.muted, marginTop: 36, lineHeight: 1.45, width: 900 }}>{P.solution.title}</div>
        </> : <Reveal text={P.solution.tagline} delay={14} style={{ fontSize: 56, fontWeight: 700, color: d.muted, letterSpacing: -1.5, lineHeight: 1.3, marginTop: 48 }} />}
      </div>
      <div style={{ ...useFade(6), position: 'absolute', right: BROWSER ? M - 20 : M + 40, top: BROWSER ? 300 : 150 }}>
        <div style={{ transform: `perspective(2000px) rotateY(${(BROWSER ? -14 : -22) + (BROWSER ? 8 : 12) * t}deg) rotateX(6deg) translateY(${-14 * t}px)`, transformOrigin: 'center' }}>
          <Emulator scale={LAYOUT.still} still />
        </div>
      </div>
    </Frame>
  );
};

// ---------- 04 demo ----------
type Step = (typeof P.demo.steps)[number] & Record<string, any>;
const steps = P.demo.steps as Step[];
const stepFrames = steps.map((s) => Math.max(0, toF(srcToOut(beatAt(s.id)))));
const CEL_STEP = stepFrames.reduce((acc2, sf, i) => (CEL_F >= sf ? i : acc2), -1); // step that is on screen when the celebration fires

const PopupBody: React.FC<{ s: Step; local: number }> = ({ s, local }) => {
  const a = (i: number): React.CSSProperties => {
    const t = interpolate(local - 6 - i * 5, [0, 10], [0, 1], clamp);
    return { opacity: t, transform: `translateY(${(1 - t) * 10}px)` };
  };
  const row: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16,
    padding: '18px 0', borderTop: `1px solid ${d.line}`, fontSize: S.body, fontWeight: 600 };
  if (s.items) return <div>{s.items.map(([n, t]: string[], i: number) => <div key={n} style={{ ...row, ...a(i) }}>{n}<Tag tone="accent">{t}</Tag></div>)}
    {s.note && <Note style={{ ...a(4), marginTop: 14 }}>{s.note}</Note>}</div>;
  if (s.checks) return <div>{s.checks.map((n: string, i: number) => {
    const on = local > 12 + i * 8;
    return (
      <div key={n} style={{ ...row, ...a(i), justifyContent: 'flex-start' }}>
        <span style={{ width: 30, height: 30, borderRadius: 8, border: `2px solid ${on ? d.ok : d.line}`, background: on ? d.ok : 'transparent',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{on && <Icons.Check size={18} color="#fff" strokeWidth={3} />}</span>{n}
      </div>
    );
  })}</div>;
  if (s.quote) return <div style={a(0)}>
    <div style={{ fontSize: 72, fontWeight: 700, lineHeight: 0.6, color: d.accent, height: 34, marginTop: 8 }}>“</div>
    <div style={{ fontSize: 32, fontWeight: 600, lineHeight: 1.5 }}>{s.quote}</div>
    <Note style={{ marginTop: 18 }}>{s.sourceLabel ?? '근거'}: {s.source}</Note></div>;
  if (s.rules) return <div>{s.rules.map(([n, r, tone]: string[], i: number) => <div key={n} style={{ ...row, ...a(i * 2) }}>{n}<Tag tone={(tone ?? (i ? 'ok' : 'bad')) as 'ok' | 'bad'}>{r}</Tag></div>)}</div>;
  if (s.meters) return <div>{s.meters.map(([n, v]: [string, number], i: number) => {
    const t = interpolate(local - 8 - i * 5, [0, 18], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
    return (
      <div key={n} style={{ ...a(i), padding: '14px 0', borderTop: `1px solid ${d.line}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: S.body, fontWeight: 600 }}><span>{n}</span>
          <span style={{ color: v >= 80 ? d.bad : d.muted, fontWeight: 700 }}>{Math.round(v * t)}%</span></div>
        <div style={{ height: 14, borderRadius: 7, background: d.line, marginTop: 10, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${v * t}%`, background: v >= 80 ? d.bad : d.faint, borderRadius: 7 }} /></div>
      </div>
    );
  })}{s.note && <Note style={{ ...a(4), marginTop: 14, fontSize: 22, color: d.bad, fontWeight: 700 }}>{s.note}</Note>}</div>;
  if (s.status) return <div>{s.status.map(([n, v, st]: string[], i: number) => <div key={n} style={{ ...row, ...a(i) }}>{n}<Tag tone={st === 'ok' ? 'ok' : 'neutral'}>{v}</Tag></div>)}</div>;
  if (s.lines) return <div>{s.lines.map((l: string, i: number) => <div key={l} style={{ ...row, ...a(i), fontWeight: 500, color: d.muted }}>{l}</div>)}</div>;
  return null;
};

// Celebration geometry (scene coordinates): popup card at left 1080 / top 280, box sits in the card's stage.
const POP = LAYOUT.pop;
const BOX = { x: POP.left + POP.width / 2, y: POP.top + 308 }; // top edge of the box body = burst origin

// Confetti: deterministic particles with drag and gravity. Three sources: the box and two bottom cannons.
const PIECES = Array.from({ length: 160 }, (_, i) => {
  const r = (k: string) => random(`confetti-${i}-${k}`);
  const src = i < 70 ? 'box' : i < 115 ? 'left' : 'right';
  const deg = src === 'box' ? -90 + (r('a') - 0.5) * 150 : src === 'left' ? -62 + (r('a') - 0.5) * 30 : -118 + (r('a') - 0.5) * 30;
  const speed = src === 'box' ? 900 + r('s') * 900 : 1700 + r('s') * 900;
  const rad = (deg * Math.PI) / 180;
  return {
    x0: src === 'box' ? BOX.x : src === 'left' ? -10 : 1930, y0: src === 'box' ? BOX.y : 1090,
    vx: Math.cos(rad) * speed, vy: Math.sin(rad) * speed,
    delay: src === 'box' ? 0 : 2 + Math.floor(r('d') * 5),
    color: d.celebrate[Math.floor(r('c') * d.celebrate.length)],
    w: 10 + r('w') * 12, h: 6 + r('h') * 8, round: r('o') < 0.25,
    rot: r('r') * 360, spin: (r('p') - 0.5) * 900, flip: 6 + r('f') * 8, phase: r('ph') * 6,
  };
});
const Confetti: React.FC<{ c: number }> = ({ c }) => {
  const g = 1500, k = 1.9;
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      {PIECES.map((p, i) => {
        const t = (c - BURST - p.delay) / FPS;
        if (t < 0) return null;
        const e = (1 - Math.exp(-k * t)) / k;
        const x = p.x0 + p.vx * e + Math.sin(t * 5 + p.phase) * 18 * Math.min(1, t);
        const y = p.y0 + (g / k) * t + (p.vy - g / k) * e;
        if (y > 1150) return null;
        const op = interpolate(t, [2.6, 3.3], [1, 0], clamp);
        return (
          <div key={i} style={{ position: 'absolute', left: x, top: y, width: p.w, height: p.round ? p.w : p.h, background: p.color,
            borderRadius: p.round ? '50%' : 2, opacity: op,
            transform: `translate(-50%,-50%) rotate(${p.rot + p.spin * t}deg) scaleY(${Math.cos(t * p.flip + p.phase)})` }} />
        );
      })}
    </AbsoluteFill>
  );
};

// Celebration card: gift box shakes, pops, the streak badge rises out of it, the week row fills.
const Celebrate: React.FC<{ c: number }> = ({ c }) => {
  const sp = (from: number, damping: number, stiffness = 160) => spring({ frame: c - from, fps: FPS, config: { damping, stiffness } });
  const appear = sp(0, 13, 190);
  const shake = c < BURST ? Math.sin(c * 2.2) * interpolate(c, [2, BURST], [2, 10], clamp) : 0;
  const squash = c < BURST ? 1 - interpolate(c, [BURST - 5, BURST], [0, 0.12], clamp) : 1 + 0.12 * Math.exp(-(c - BURST) / 3) * Math.cos((c - BURST) * 0.9);
  const lid = sp(BURST, 8, 120);
  const badge = sp(BURST + 3, 10, 150);
  const flip = interpolate(c, [BURST + 16, BURST + 24], [0, 1], { ...clamp, easing: Easing.out(Easing.back(2)) });
  const ring = interpolate(c, [BURST, BURST + 18], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const dayPop = sp(BURST + 26, 9, 200);
  const idxNew = CEL.track.done; // the slot that fills now
  return (
    <div style={{ ...card, position: 'absolute', ...POP, padding: '34px 40px 30px', border: `2px solid ${d.ok}`,
      opacity: Math.min(1, appear * 1.4), transform: `scale(${0.92 + 0.08 * appear})`, transformOrigin: 'center top' }}>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
        <div style={{ width: 72, height: 72, borderRadius: 36, background: d.ok, display: 'flex', alignItems: 'center', justifyContent: 'center',
          transform: `scale(${appear})` }}>
          <Icons.Check size={42} color="#fff" strokeWidth={3} />
        </div>
        <div>
          <div style={{ fontSize: 48, fontWeight: 700, letterSpacing: -1.2 }}>{CEL.title}</div>
          <div style={{ fontSize: 24, color: d.muted, marginTop: 4, fontWeight: 600 }}>{CEL.sub}</div>
        </div>
      </div>

      {/* stage: box + badge (box body top = BOX.y in scene coordinates) */}
      <div style={{ position: 'relative', height: 290, marginTop: 6 }}>
        {/* ring and rays at the burst */}
        <div style={{ position: 'absolute', left: '50%', top: 196, width: 220, height: 220, marginLeft: -110, marginTop: -110, borderRadius: '50%',
          border: `6px solid ${d.celebrate[2]}`, transform: `scale(${0.2 + ring * 1.6})`, opacity: c >= BURST ? 1 - ring : 0 }} />
        {Array.from({ length: 12 }, (_, i) => {
          const a = (i / 12) * 360;
          const rt = interpolate(c - BURST, [0, 12], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
          return c >= BURST && rt < 1 ? (
            <div key={i} style={{ position: 'absolute', left: '50%', top: 196, width: 6, height: 34, marginLeft: -3, borderRadius: 3,
              background: d.celebrate[i % 3 === 0 ? 2 : i % 3 === 1 ? 0 : 1], opacity: 1 - rt,
              transform: `rotate(${a}deg) translateY(${-(70 + rt * 90)}px)`, transformOrigin: '50% 0' }} />
          ) : null;
        })}

        {/* badge rising out of the box */}
        <div style={{ position: 'absolute', left: 0, right: 0, top: 40, display: 'flex', justifyContent: 'center', zIndex: 1,
          opacity: c >= BURST + 3 ? Math.min(1, badge * 1.5) : 0,
          transform: `translateY(${Math.max(-8, (1 - badge) * 150) + interpolate(c - BURST, [28, 44], [0, 80], { ...clamp, easing: Easing.inOut(Easing.cubic) })}px) scale(${Math.min(1.04, 0.3 + 0.7 * badge)})` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 34px 16px 28px', borderRadius: 999, background: d.accent, color: '#fff',
            boxShadow: '0 16px 32px rgba(184,50,92,0.32)' }}>
            <Icon name={CEL.badge.icon} size={40} color="#fff" sw={2.25} />
            {CEL.badge.pre && <span style={{ fontSize: 34, fontWeight: 700, marginRight: 2 }}>{CEL.badge.pre}</span>}
            <span style={{ display: 'inline-block', height: 56, overflow: 'hidden', fontSize: 52, fontWeight: 700, lineHeight: '56px' }}>
              <span style={{ display: 'block', transform: `translateY(${-flip * 56}px)` }}>
                <span style={{ display: 'block' }}>{CEL.badge.from}</span><span style={{ display: 'block' }}>{CEL.badge.to}</span>
              </span>
            </span>
            <span style={{ fontSize: 34, fontWeight: 700, marginLeft: -4 }}>{CEL.badge.post}</span>
          </div>
        </div>

        {/* gift box: lid flies off at BURST, body squashes */}
        <div style={{ position: 'absolute', left: '50%', top: 196, transform: `translateX(-50%) rotate(${shake}deg)`, transformOrigin: '50% 100%',
          opacity: interpolate(c - BURST, [28, 42], [1, 0], clamp) }}>
          <div style={{ position: 'absolute', left: -86, top: -40, width: 172, height: 40, borderRadius: 8, background: d.accent,
            boxShadow: 'inset 0 -4px 0 rgba(0,0,0,0.12)', zIndex: 2,
            // the lid flies out sideways and fades before it can reach the title text
            opacity: interpolate(c - BURST, [3, 10], [1, 0], clamp),
            transform: `translate(${lid * -150}px, ${lid * -70}px) rotate(${lid * -34}deg)` }}>
            <div style={{ position: 'absolute', left: 74, top: 0, width: 24, height: 40, background: d.celebrate[2] }} />
          </div>
          <div style={{ position: 'absolute', left: -74, top: 0, width: 148, height: 60, borderRadius: '0 0 12px 12px', background: d.accent,
            transform: `scaleY(${squash})`, transformOrigin: '50% 100%', boxShadow: 'inset 0 10px 0 rgba(0,0,0,0.12)' }}>
            <div style={{ position: 'absolute', left: 62, top: 0, width: 24, height: 60, background: d.celebrate[2] }} />
          </div>
        </div>
      </div>

      {/* week row */}
      <div style={{ display: 'flex', justifyContent: CEL.track.labels.length > 4 ? 'space-between' : 'center', gap: CEL.track.labels.length > 4 ? 0 : 72, marginTop: 4 }}>
        {CEL.track.labels.map((day, i) => {
          const done = i < idxNew || (i === idxNew && c >= BURST + 26);
          const s = i === idxNew ? (c >= BURST + 26 ? 0.6 + 0.4 * dayPop : 1) : 1;
          return (
            <div key={day} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 64, height: 64, borderRadius: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: done ? (i === idxNew ? d.accent : d.ok) : d.surface, border: `2px solid ${done ? 'transparent' : d.line}`,
                transform: `scale(${s})` }}>
                {done && <Icons.Check size={32} color="#fff" strokeWidth={3} />}
              </div>
              <span style={{ fontSize: 22, fontWeight: 700, color: i === idxNew ? d.accent : d.muted }}>{day}</span>
            </div>
          );
        })}
      </div>
      <Note style={{ textAlign: 'center', marginTop: 18, fontSize: 22, color: d.muted, fontWeight: 600,
        opacity: interpolate(c, [BURST + 32, BURST + 42], [0, 1], clamp) }}>{CEL.goal}</Note>
    </div>
  );
};

const Demo = () => {
  const f = useCurrentFrame();
  const idx = stepFrames.reduce((acc2, sf, i) => (f >= sf ? i : acc2), -1);
  const cur = idx >= 0 ? steps[idx] : null;
  const local = idx >= 0 ? f - stepFrames[idx] : 0;
  const c = f - CEL_F; // celebration-local frame
  const celebrating = c >= 0 && idx === CEL_STEP;
  // Spring only on the key moments (design.md / motion); fades elsewhere.
  const enter = enterAt(local, 0, cur?.key ? 26 : 18);
  // Camera punch-in on the phone while the screen is frozen.
  const punch = 1 + 0.04 * Math.min(
    spring({ frame: c - BURST, fps: FPS, config: { damping: 18 } }),
    interpolate(c, [HOLD_END_C - 8, HOLD_END_C], [1, 0], clamp),
  );
  const rowH = 88;
  return (
    <Frame k="demo" bare>
      <div style={{ ...useFade(0), position: 'absolute', left: BROWSER ? 90 : M, top: 62, display: 'flex', alignItems: 'center', gap: 18 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: d.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={P.logoIcon} size={24} color="#fff" sw={2} />
        </div>
        <span style={{ fontSize: 34, fontWeight: 700, letterSpacing: -0.8 }}>{P.demo.title}</span>
      </div>
      {/* left: whole flow, current step highlighted (phone only; the browser window needs the width) */}
      {!BROWSER && <div style={{ position: 'absolute', left: M, top: 250, width: 330 }}>
        <div style={{ position: 'absolute', left: 21, top: 22, width: 2, height: (steps.length - 1) * rowH, background: d.line }} />
        <div style={{ position: 'absolute', left: 21, top: 22, width: 2, height: Math.max(0, idx) * rowH, background: d.accent }} />
        {steps.map((s, i) => {
          const st = i < idx ? 'done' : i === idx ? 'now' : 'next';
          return (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 20, height: rowH, position: 'relative' }}>
              <div style={{ width: 44, height: 44, borderRadius: 22, zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20, fontWeight: 700,
                background: st === 'now' ? d.accent : d.surface, color: st === 'now' ? '#fff' : st === 'done' ? d.accent : d.faint,
                border: `2px solid ${st === 'next' ? d.line : d.accent}` }}>
                {st === 'done' ? <Icons.Check size={20} color={d.accent} strokeWidth={2.5} /> : i + 1}
              </div>
              <div style={{ fontSize: st === 'now' ? 32 : 26, fontWeight: st === 'now' ? 800 : 500, color: st === 'next' ? d.faint : d.text }}>{s.label}</div>
            </div>
          );
        })}
      </div>}

      {/* center: emulator with the real recording; the camera inside it does the zooming */}
      <div style={{ position: 'absolute', left: LAYOUT.emu.left, top: LAYOUT.emu.top, transform: `scale(${punch})`, transformOrigin: '50% 40%' }}>
        <Emulator scale={LAYOUT.emu.scale} camera />
      </div>

      {/* right: only the current step, or the celebration */}
      {celebrating ? <Celebrate c={c} /> : cur && (
        <div key={cur.id} style={{ ...card, position: 'absolute', ...POP, top: POP.top + 20, padding: '36px 40px', boxShadow: BROWSER ? '0 24px 60px rgba(28,26,31,0.18)' : d.shadow,
          opacity: enter, filter: enter < 1 ? `blur(${(1 - enter) * 12}px)` : undefined, transform: `translateY(${(1 - enter) * 24}px) scale(${interpolate(enter, [0, 1], [cur.key ? 0.94 : 0.98, 1])})`,
          transformOrigin: 'left top' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: d.accentSoft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={cur.icon} size={26} color={d.accent} />
            </div>
            <span style={{ fontSize: S.note, color: d.muted, fontWeight: 700 }}>STEP {idx + 1} · {cur.label}</span>
            <span style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
              {steps.map((st, i) => <span key={st.id} style={{ width: i === idx ? 22 : 8, height: 8, borderRadius: 4, background: i <= idx ? d.accent : d.line }} />)}
            </span>
          </div>
          <div style={{ fontSize: BROWSER ? 36 : 40, fontWeight: 700, letterSpacing: -1, lineHeight: 1.25, margin: '22px 0 12px' }}>{cur.title}</div>
          <PopupBody s={cur} local={local} />
        </div>
      )}
      {c >= 0 && <Confetti c={c} />}
      <Sequence from={CEL_F + BURST - 1}><Audio src={staticFile('celebrate.wav')} volume={0.8} /></Sequence>
      <Note style={{ position: 'absolute', right: BROWSER ? 90 : M, bottom: 34 }}>{P.demo.disclosure} · 일부 구간 {FAST}배속</Note>
    </Frame>
  );
};

// ---------- 05 trust ----------
// Different composition from the Kiro cards: claim on the left, three safeguards stacked on the right.
const Trust = () => (
  <Frame k="trust">
    <Reveal text={P.trust.title.replace(', ', ',\n')} style={{ position: 'absolute', left: M, top: 360, width: 620, fontSize: 64, fontWeight: 700, letterSpacing: -2, lineHeight: 1.2 }} />
    <div style={{ position: 'absolute', left: 860, right: M, top: 270, display: 'flex', flexDirection: 'column', gap: 24 }}>
      {P.trust.cards.map(([icon, name, body], i) => (
        <div key={name} style={{ ...card, ...useFade(8 + i * 6), padding: '34px 40px', display: 'flex', gap: 30, alignItems: 'center' }}>
          <div style={{ width: 84, height: 84, borderRadius: 22, background: d.accentSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
            <Icon name={icon} size={44} color={d.accent} />
          </div>
          <div>
            <div style={{ fontSize: 40, fontWeight: 700, letterSpacing: -0.8 }}>{name}</div>
            <div style={{ fontSize: S.body + 2, color: d.muted, marginTop: 10, lineHeight: 1.45 }}>{body}</div>
          </div>
        </div>
      ))}
    </div>
  </Frame>
);

// ---------- 06 architecture (nodes light up in request order) ----------
const Arch = () => {
  const f = useCurrentFrame();
  const lit = (i: number) => f >= 10 + i * 9;
  const Node: React.FC<{ label: string; i: number; strong?: boolean; small?: boolean }> = ({ label, i, strong, small }) => {
    const on = lit(i);
    return (
      <div style={{ ...card, padding: small ? '20px 28px' : '30px 36px', fontSize: small ? 28 : 34, fontWeight: 700, textAlign: 'center',
        borderColor: on ? d.accent : d.line, color: on ? d.text : d.faint, boxShadow: on ? d.shadow : 'none',
        background: strong && on ? d.accent : d.surface, ...(strong && on ? { color: '#fff' } : {}) }}>{label}</div>
    );
  };
  const Arrow: React.FC<{ i: number }> = ({ i }) => <Icons.ArrowRight size={36} color={lit(i) ? d.accent : d.line} strokeWidth={1.75} />;
  return (
    <Frame k="arch" title={P.arch.title}>
      <div style={{ position: 'absolute', left: M, right: M, top: 250, bottom: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Node label={P.arch.user} i={0} />
        <Arrow i={1} />
        <Node label={P.arch.core} i={1} strong />
        <Arrow i={2} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {P.arch.agents.map((a) => <Node key={a} label={`${a} 에이전트`} i={2} small />)}
        </div>
        <Arrow i={3} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
          <Node label={P.arch.model} i={3} />
          <Node label={P.arch.store} i={4} />
        </div>
        <Arrow i={5} />
        <Node label={P.arch.out} i={5} />
      </div>
    </Frame>
  );
};

// ---------- 07 kiro ----------
const Kiro = () => {
  const f = useCurrentFrame();
  return (
    <Frame k="kiro" title={P.kiro.title}>
      <div style={{ position: 'absolute', left: M, right: M, top: 330, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 32 }}>
        {P.kiro.metrics.map(([icon, num, name, body], i) => {
          const v = Number(num);
          const shown = Number.isFinite(v) ? Math.round(interpolate(f, [10 + i * 6, 34 + i * 6], [0, v], { ...clamp, easing: Easing.out(Easing.cubic) })) : num;
          return (
            <div key={name} style={{ ...card, ...useFade(8 + i * 6), padding: '40px 40px' }}>
              <Icon name={icon} size={34} color={d.accent} />
              <div style={{ fontSize: 120, fontWeight: 700, letterSpacing: -4, marginTop: 18, lineHeight: 1 }}>{shown}</div>
              <div style={{ fontSize: 32, fontWeight: 700, marginTop: 16 }}>{name}</div>
              <div style={{ fontSize: S.body - 4, color: d.muted, marginTop: 8 }}>{body}</div>
            </div>
          );
        })}
      </div>
      <Note style={{ position: 'absolute', left: M, bottom: 60 }}>{P.kiro.note}</Note>
    </Frame>
  );
};

// ---------- 08 closing ----------
const Closing = () => {
  const f = useCurrentFrame();
  const drop = spring({ frame: f - 4, fps: FPS, config: { damping: 22, stiffness: 120, mass: 0.9 } });
  return (
    <Frame k="closing" bare>
      <div style={{ position: 'absolute', left: M, top: 330, width: 1060 }}>
        <Reveal text={P.closing.title} delay={14} style={{ fontSize: 80, fontWeight: 700, letterSpacing: -2.5, lineHeight: 1.25 }} />
        <div style={{ ...useFade(30), fontSize: S.body, color: d.muted, marginTop: 40 }}>{P.closing.next}</div>
        <div style={{ ...useFade(38), display: 'flex', gap: 24, alignItems: 'center', marginTop: 80 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: d.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={P.logoIcon} size={30} color="#fff" sw={2} />
          </div>
          <span style={{ fontSize: 44, fontWeight: 700 }}>{P.service}</span>
          <span style={{ fontSize: S.body, color: d.accent, fontWeight: 700 }}>{P.team}</span>
          <span style={{ fontSize: S.note, color: d.faint }}>{P.repo}</span>
        </div>
      </div>
      {/* the "after" of the opening question: the daughter's lock-screen notification drops in */}
      <div style={{ ...card, position: 'absolute', right: M, top: 420, width: 580, padding: '28px 30px', borderRadius: 26,
        opacity: Math.min(1, drop * 2), transform: `translateY(${(1 - drop) * -420}px)`, boxShadow: '0 30px 60px rgba(28,26,31,0.14)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: S.note, color: d.faint }}>
          <span style={{ fontWeight: 700, color: d.muted }}>{P.service}</span><span>{P.closing.notifyTime}</span>
        </div>
        <div style={{ display: 'flex', gap: 18, alignItems: 'center', marginTop: 16 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: d.okSoft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icons.Check size={28} color={d.ok} strokeWidth={2.5} />
          </div>
          <div>
            <div style={{ fontSize: 30, fontWeight: 700 }}>{P.closing.notifyTitle}</div>
            <div style={{ fontSize: 24, color: d.muted, marginTop: 4 }}>{P.closing.notifyBody}</div>
          </div>
        </div>
      </div>
    </Frame>
  );
};

const SCENE: Record<Key, React.FC> = { opening: Opening, problem: Problem, solution: Solution, demo: Demo, trust: Trust, arch: Arch, kiro: Kiro, closing: Closing };

export const DemoFilm = () => (
  <AbsoluteFill style={{ background: d.bg }}>
    {order.map((k) => {
      const C = SCENE[k];
      return <Sequence key={k} from={starts[k]} durationInFrames={len(k)}><C /></Sequence>;
    })}
  </AbsoluteFill>
);
