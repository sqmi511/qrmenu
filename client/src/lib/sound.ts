const KEY = "orders-sound";
let ctx: AudioContext | null = null;

export const soundPref = () => {
  try {
    return localStorage.getItem(KEY) === "on";
  } catch {
    return false;
  }
};

export const saveSoundPref = (on: boolean) => {
  try {
    localStorage.setItem(KEY, on ? "on" : "off");
  } catch {
    /* storage unavailable */
  }
};

function audio() {
  if (!ctx) {
    const Ctor =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (Ctor) ctx = new Ctor();
  }
  return ctx;
}

/** Browsers only allow audio after a user gesture; call this from a click/pointer handler. */
export async function unlockSound() {
  const c = audio();
  if (c && c.state === "suspended") await c.resume();
}

const NOTES: [freq: number, at: number][] = [
  [880, 0],
  [1174.66, 0.16],
  [1318.51, 0.32],
];

export function playChime() {
  const c = audio();
  if (!c || c.state !== "running") return;
  const t0 = c.currentTime;
  for (const [freq, at] of NOTES) {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t0 + at);
    gain.gain.exponentialRampToValueAtTime(0.25, t0 + at + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + at + 0.35);
    osc.connect(gain).connect(c.destination);
    osc.start(t0 + at);
    osc.stop(t0 + at + 0.4);
  }
}