"use client";

import { useEffect, useState } from "react";
import {
  RINGTONES,
  type RingtoneId,
  getRingtone,
  setRingtone,
  soundsEnabled,
  setSoundsEnabled,
  playRingtone,
} from "@/lib/sound";

export interface RingtoneEvent {
  id: string;
  label: string;
}

/**
 * Per-device ringtone preferences: a master on/off plus a tone per event.
 * Stored in localStorage, so it's set right here on the client.
 */
export function RingtoneSettings({ events }: { events: RingtoneEvent[] }) {
  const [ready, setReady] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [choices, setChoices] = useState<Record<string, RingtoneId>>({});

  useEffect(() => {
    setEnabled(soundsEnabled());
    const initial: Record<string, RingtoneId> = {};
    for (const e of events) initial[e.id] = getRingtone(e.id);
    setChoices(initial);
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!ready) return null;

  function toggle() {
    const next = !enabled;
    setEnabled(next);
    setSoundsEnabled(next);
  }

  function pick(eventId: string, id: RingtoneId) {
    setChoices((c) => ({ ...c, [eventId]: id }));
    setRingtone(eventId, id);
    if (id !== "none") playRingtone(id);
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="flex items-center justify-between">
        <span className="text-sm font-medium">Notification sounds</span>
        <button
          type="button"
          onClick={toggle}
          className={`relative h-6 w-11 rounded-full transition-colors ${
            enabled ? "bg-primary" : "bg-border"
          }`}
          aria-pressed={enabled}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
              enabled ? "left-0.5 translate-x-5" : "left-0.5"
            }`}
          />
        </button>
      </label>

      {enabled &&
        events.map((e) => (
          <div key={e.id} className="flex items-center justify-between gap-3">
            <span className="text-sm text-muted">{e.label}</span>
            <div className="flex items-center gap-2">
              <select
                value={choices[e.id] ?? "chime"}
                onChange={(ev) => pick(e.id, ev.target.value as RingtoneId)}
                className="h-9 rounded-lg border border-border bg-surface px-2 text-sm"
              >
                {RINGTONES.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => playRingtone(choices[e.id] ?? "chime")}
                aria-label="Preview"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-sm"
              >
                ▶
              </button>
            </div>
          </div>
        ))}
    </div>
  );
}
