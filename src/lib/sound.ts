/*
  Tiny ringtone engine. Ringtones are synthesised with the Web Audio API (no
  audio files to ship, works offline). Per-device preferences (which tone plays
  for which event, and a master on/off) live in localStorage.
*/

export type RingtoneId =
  | "none"
  | "chime"
  | "ping"
  | "bell"
  | "arcade"
  | "alert";

interface Ringtone {
  id: RingtoneId;
  label: string;
  /** [frequencyHz, durationMs] notes played in sequence. */
  notes: [number, number][];
}

export const RINGTONES: Ringtone[] = [
  { id: "none", label: "Off (silent)", notes: [] },
  { id: "chime", label: "Chime", notes: [[880, 130], [1318, 200]] },
  { id: "ping", label: "Ping", notes: [[1568, 110]] },
  { id: "bell", label: "Bell", notes: [[1046, 110], [1318, 110], [1568, 200]] },
  { id: "arcade", label: "Arcade", notes: [[523, 80], [659, 80], [784, 80], [1046, 160]] },
  { id: "alert", label: "Alert", notes: [[988, 120], [0, 60], [988, 120], [0, 60], [988, 200]] },
];

let ctx: AudioContext | null = null;
function audioCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Ctor = window.AudioContext || (window as any).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) ctx = new Ctor();
  return ctx;
}

/** Play a ringtone by id (synthesised). Safe no-op on the server / "none". */
export function playRingtone(id: RingtoneId) {
  if (id === "none") return;
  const ac = audioCtx();
  const tone = RINGTONES.find((r) => r.id === id);
  if (!ac || !tone) return;
  if (ac.state === "suspended") ac.resume().catch(() => {});

  let t = ac.currentTime;
  for (const [freq, durMs] of tone.notes) {
    const dur = durMs / 1000;
    if (freq > 0) {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.25, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(gain).connect(ac.destination);
      osc.start(t);
      osc.stop(t + dur);
    }
    t += dur;
  }
}

// --- Preferences (localStorage) ---

const KEY = "dd_ringtones";

interface Prefs {
  enabled: boolean;
  events: Record<string, RingtoneId>;
}

function read(): Prefs {
  if (typeof window === "undefined") return { enabled: true, events: {} };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { enabled: true, events: {} };
    return { enabled: true, events: {}, ...JSON.parse(raw) };
  } catch {
    return { enabled: true, events: {} };
  }
}

function write(p: Prefs) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(p));
}

export function soundsEnabled(): boolean {
  return read().enabled;
}
export function setSoundsEnabled(enabled: boolean) {
  write({ ...read(), enabled });
}

export function getRingtone(eventId: string, fallback: RingtoneId = "chime"): RingtoneId {
  return read().events[eventId] ?? fallback;
}
export function setRingtone(eventId: string, id: RingtoneId) {
  const p = read();
  p.events[eventId] = id;
  write(p);
}

/** Play the configured ringtone for an event, honouring the master toggle. */
export function playForEvent(eventId: string, fallback: RingtoneId = "chime") {
  if (!soundsEnabled()) return;
  playRingtone(getRingtone(eventId, fallback));
}
