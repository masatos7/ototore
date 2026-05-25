"use client";

import { useState, useRef, useCallback } from "react";

export interface DemoNote {
  midiNote: number;
  startTimeSec: number;
  durationSec: number;
  isRest: boolean;
}

function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export function useDemoPlayback() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(-100);

  const audioCtxRef    = useRef<AudioContext | null>(null);
  const endTimeoutRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef         = useRef<number | null>(null);

  const stop = useCallback(() => {
    if (endTimeoutRef.current) { clearTimeout(endTimeoutRef.current); endTimeoutRef.current = null; }
    if (rafRef.current)        { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    if (audioCtxRef.current)   { audioCtxRef.current.close(); audioCtxRef.current = null; }
    setIsPlaying(false);
    setElapsedSec(-100);
  }, []);

  const play = useCallback((notes: DemoNote[], leadInSec: number) => {
    stop();

    const ctx = new AudioContext();
    audioCtxRef.current = ctx;
    setIsPlaying(true);

    const buffer  = 0.05;            // small scheduling buffer
    const ctxBase = ctx.currentTime; // audio time when play() is called

    // RAF loop: elapsedSec tracks "how far into the piece" we are.
    // elapsedSec = 0 means the first note should be at the playhead.
    // During lead-in, elapsedSec is negative (notes scroll in from the right).
    const tick = () => {
      const ac = audioCtxRef.current;
      if (!ac || ac.state === "closed") return;
      // ctxBase + buffer + leadInSec = audio time when the first note plays
      // => elapsed = (ctx.currentTime - ctxBase - buffer - leadInSec)
      const el = ac.currentTime - ctxBase - buffer - leadInSec;
      setElapsedSec(el);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    // ── Schedule audio ──────────────────────────────────────────────────
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.35, ctxBase);
    master.connect(ctx.destination);

    let lastEndTime = ctxBase;

    for (const note of notes) {
      if (note.isRest || note.midiNote < 0) continue;

      const freq = midiToFreq(note.midiNote);
      // note.startTimeSec is already in "piece time" (relative to measure range, at current bpm)
      const t0  = ctxBase + buffer + leadInSec + note.startTimeSec;
      const dur = Math.min(note.durationSec * 0.88, 1.8);
      const t1  = t0 + dur;
      if (t1 > lastEndTime) lastEndTime = t1;

      for (const [hFreq, hVol] of [
        [freq,     0.70],
        [freq * 2, 0.25],
        [freq * 3, 0.05],
      ] as [number, number][]) {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(hFreq, t0);
        gain.gain.setValueAtTime(0,        t0);
        gain.gain.linearRampToValueAtTime(hVol,        t0 + 0.007);
        gain.gain.exponentialRampToValueAtTime(hVol * 0.3, t0 + 0.18);
        gain.gain.setValueAtTime(hVol * 0.3, t1 - 0.04);
        gain.gain.linearRampToValueAtTime(0, t1);
        osc.connect(gain);
        gain.connect(master);
        osc.start(t0);
        osc.stop(t1 + 0.01);
      }
    }

    const delayMs = (lastEndTime - ctxBase + 0.5) * 1000;
    endTimeoutRef.current = setTimeout(() => {
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
      ctx.close();
      audioCtxRef.current = null;
      setIsPlaying(false);
      setElapsedSec(-100);
    }, delayMs);
  }, [stop]);

  return { isPlaying, elapsedSec, play, stop };
}
