

type Listener = (enabled: boolean) => void;

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let ambientStarted = false;
let enabled = true;
let armed = false;
const listeners = new Set<Listener>();

let ambientLp: BiquadFilterNode | null = null;
let ambientNoiseGain: GainNode | null = null;
let padGain: GainNode | null = null;
let calm = false;

function emit() {
  for (const l of listeners) l(enabled);
}

export function isEnabled() {
  return enabled;
}

export function subscribe(l: Listener) {
  listeners.add(l);
  l(enabled);
  return () => {
    listeners.delete(l);
  };
}

function ensure() {
  if (ctx) return ctx;
  const AC: typeof AudioContext =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0;
  master.connect(ctx.destination);
  return ctx;
}

function makeNoise(ac: AudioContext) {
  const len = ac.sampleRate * 2;
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const src = ac.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  return src;
}

function startAmbient() {
  if (ambientStarted || !ctx || !master) return;
  ambientStarted = true;
  const now = ctx.currentTime;

  const droneGain = ctx.createGain();
  droneGain.gain.value = 0.12;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 420;
  lp.Q.value = 0.7;
  droneGain.connect(lp).connect(master);
  ambientLp = lp;

  for (const f of [55, 55.4, 82.5]) {
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = f;
    const g = ctx.createGain();
    g.gain.value = f < 80 ? 0.5 : 0.25;
    osc.connect(g).connect(droneGain);
    osc.start(now);
  }

  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.06;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 180;
  lfo.connect(lfoGain).connect(lp.frequency);
  lfo.start(now);

  const noise = makeNoise(ctx);
  const nbp = ctx.createBiquadFilter();
  nbp.type = 'bandpass';
  nbp.frequency.value = 800;
  nbp.Q.value = 0.5;
  const ng = ctx.createGain();
  ng.gain.value = 0.04;
  noise.connect(nbp).connect(ng).connect(master);
  noise.start(now);
  ambientNoiseGain = ng;

  const pad = ctx.createGain();
  pad.gain.value = 0;
  const padLp = ctx.createBiquadFilter();
  padLp.type = 'lowpass';
  padLp.frequency.value = 900;
  pad.connect(padLp).connect(master);
  for (const f of [130.81, 196.0, 261.63]) {
    for (const mult of [1, 1.005]) {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = f * mult;
      const og = ctx.createGain();
      og.gain.value = 0.34;
      o.connect(og).connect(pad);
      o.start(now);
    }
  }
  padGain = pad;

  applyMood(1);
}

function applyMood(rampSeconds: number) {
  if (!ctx || !ambientLp || !ambientNoiseGain || !padGain) return;
  const now = ctx.currentTime;
  const tc = Math.max(rampSeconds / 3, 0.001);
  ambientLp.frequency.setTargetAtTime(calm ? 280 : 420, now, tc);
  ambientNoiseGain.gain.setTargetAtTime(calm ? 0.012 : 0.04, now, tc);
  padGain.gain.setTargetAtTime(calm ? 0.09 : 0, now, tc);
}

export function setCalm(on: boolean) {
  calm = on;
  if (ambientStarted) applyMood(2.5);
}

export async function enable() {
  ensure();
  try {
    await ctx!.resume();
  } catch {

  }
  startAmbient();
  const now = ctx!.currentTime;
  master!.gain.cancelScheduledValues(now);
  master!.gain.setValueAtTime(master!.gain.value, now);
  master!.gain.linearRampToValueAtTime(0.9, now + 0.8);
  enabled = true;
  emit();
}

export function disable() {
  enabled = false;
  if (ctx && master) {
    const now = ctx.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(master.gain.value, now);
    master.gain.linearRampToValueAtTime(0, now + 0.4);
  }
  emit();
}

export function toggle() {
  if (enabled) disable();
  else void enable();
}

export function armAutoStart() {
  if (armed || typeof window === 'undefined') return;
  armed = true;
  const events: Array<keyof WindowEventMap> = ['pointerdown', 'keydown', 'touchstart'];
  const cleanup = () => events.forEach((ev) => window.removeEventListener(ev, unlock));
  const unlock = (e: Event) => {
    cleanup();

    if ((e.target as Element | null)?.closest?.('[data-sound-toggle]')) return;
    if (enabled) void enable();
  };
  events.forEach((ev) => window.addEventListener(ev, unlock, { once: true, passive: true }));
}

export function whoosh(durationMs = 2200) {
  if (!enabled || !ctx || !master) return;
  const now = ctx.currentTime;
  const dur = durationMs / 1000;

  const noise = makeNoise(ctx);
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.Q.value = 1.2;
  const g = ctx.createGain();
  g.gain.value = 0;
  noise.connect(bp).connect(g).connect(master);

  bp.frequency.setValueAtTime(300, now);
  bp.frequency.exponentialRampToValueAtTime(3500, now + dur * 0.5);
  bp.frequency.exponentialRampToValueAtTime(500, now + dur);

  g.gain.setValueAtTime(0, now);
  g.gain.linearRampToValueAtTime(0.5, now + dur * 0.35);
  g.gain.linearRampToValueAtTime(0, now + dur);

  noise.start(now);
  noise.stop(now + dur + 0.05);
}

function blip(opts: {
  osc: OscillatorType;
  f0: number;
  f1: number;
  peak: number;
  dur: number;
  noiseFreq?: number;
  noisePeak?: number;
}) {
  if (!enabled || !ctx || !master) return;
  const now = ctx.currentTime;

  const o = ctx.createOscillator();
  o.type = opts.osc;
  o.frequency.setValueAtTime(opts.f0, now);
  o.frequency.exponentialRampToValueAtTime(Math.max(1, opts.f1), now + opts.dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(opts.peak, now + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, now + opts.dur);
  o.connect(g).connect(master);
  o.start(now);
  o.stop(now + opts.dur + 0.02);

  if (opts.noisePeak) {
    const n = makeNoise(ctx);
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = opts.noiseFreq ?? 2500;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(opts.noisePeak, now);
    ng.gain.exponentialRampToValueAtTime(0.0001, now + 0.025);
    n.connect(hp).connect(ng).connect(master);
    n.start(now);
    n.stop(now + 0.05);
  }
}

export function click() {
  blip({ osc: 'square', f0: 900, f1: 300, peak: 0.22, dur: 0.06, noiseFreq: 3000, noisePeak: 0.08 });
}

export function key() {
  const j = Math.random() * 180;
  blip({ osc: 'triangle', f0: 420 + j, f1: (420 + j) * 0.6, peak: 0.1, dur: 0.045, noiseFreq: 4200, noisePeak: 0.05 });
}
