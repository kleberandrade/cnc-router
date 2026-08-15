import { create } from "zustand";
import type { StepMode } from "../lib/playback";
import { nextBoundary, prevBoundary } from "../lib/playback";

export const SPEEDS = [0.25, 0.5, 1, 2, 4, 8] as const;
export type Speed = (typeof SPEEDS)[number];

interface SimState {
  /** Elapsed simulated time, seconds. */
  t: number;
  playing: boolean;
  speed: Speed;
  stepMode: StepMode;
  /** Total duration and step boundaries — provided by the simulator when the toolpath changes. */
  duration: number;
  boundaries: number[];

  configure: (duration: number, boundaries: number[]) => void;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  /** Advance by real `dt` seconds (scaled by speed); auto-pauses at the end. */
  tick: (dt: number) => void;
  seek: (t: number) => void;
  stepForward: () => void;
  stepBack: () => void;
  reset: () => void;
  toEnd: () => void;
  setSpeed: (s: Speed) => void;
  setStepMode: (m: StepMode) => void;
}

const clamp = (t: number, max: number) => Math.min(Math.max(t, 0), max);

export const useSimStore = create<SimState>((set, get) => ({
  t: 0,
  playing: false,
  speed: 1,
  stepMode: "segment",
  duration: 0,
  boundaries: [],

  configure: (duration, boundaries) => set({ duration, boundaries, t: 0, playing: false }),

  play: () => {
    const { t, duration } = get();
    // Playing from the end restarts.
    set({ playing: duration > 0, t: t >= duration ? 0 : t });
  },
  pause: () => set({ playing: false }),
  toggle: () => (get().playing ? get().pause() : get().play()),

  tick: (dt) => {
    const { playing, t, speed, duration } = get();
    if (!playing) return;
    const next = t + dt * speed;
    if (next >= duration) set({ t: duration, playing: false });
    else set({ t: next });
  },

  seek: (t) => set((s) => ({ t: clamp(t, s.duration) })),
  stepForward: () => set((s) => ({ t: clamp(nextBoundary(s.boundaries, s.t), s.duration), playing: false })),
  stepBack: () => set((s) => ({ t: prevBoundary(s.boundaries, s.t), playing: false })),
  reset: () => set({ t: 0, playing: false }),
  toEnd: () => set((s) => ({ t: s.duration, playing: false })),
  setSpeed: (speed) => set({ speed }),
  setStepMode: (stepMode) => set({ stepMode }),
}));
