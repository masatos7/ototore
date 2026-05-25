"use client";

import { useRef, useCallback, useEffect } from "react";

interface MetronomeOptions {
  bpm: number;
  beatsPerMeasure: number;
  totalBeats: number;
  leadInBeats?: number;
  onBeat: (beatIndex: number) => void;
  onLeadInMeasure?: (countdownNum: number) => void;
  onPracticeStart?: () => void;
  onDisplayElapsed?: (elapsedSec: number) => void;
  onComplete: () => void;
}

export function useMetronome() {
  const contextRef = useRef<AudioContext | null>(null);
  const schedulerTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const isRunningRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const progressCallbackRef = useRef<((progress: number) => void) | null>(null);
  const timeoutHandlesRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const getContext = useCallback(() => {
    if (!contextRef.current || contextRef.current.state === "closed") {
      contextRef.current = new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    return contextRef.current;
  }, []);

  const playClick = useCallback(
    (ctx: AudioContext, time: number, isStrong: boolean) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = isStrong ? 880 : 660;
      gain.gain.setValueAtTime(0.3, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
      osc.start(time);
      osc.stop(time + 0.06);
    },
    []
  );

  const stop = useCallback(() => {
    isRunningRef.current = false;
    if (schedulerTimerRef.current) {
      clearInterval(schedulerTimerRef.current);
      schedulerTimerRef.current = null;
    }
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    timeoutHandlesRef.current.forEach(clearTimeout);
    timeoutHandlesRef.current = [];
  }, []);

  const start = useCallback(
    (opts: MetronomeOptions, onProgress: (progress: number) => void) => {
      stop();
      progressCallbackRef.current = onProgress;

      const ctx = getContext();
      if (ctx.state === "suspended") ctx.resume();

      const secPerBeat = 60 / opts.bpm;
      const leadIn = opts.leadInBeats ?? 0;
      const leadInDurSec = secPerBeat * leadIn;
      const totalDurationSec = secPerBeat * opts.totalBeats;
      const totalAllBeats = leadIn + opts.totalBeats;

      const startTime = ctx.currentTime;
      startTimeRef.current = startTime;
      isRunningRef.current = true;

      let nextBeatIndex = 0;
      let nextBeatTime = startTime;
      const scheduleAheadSec = 0.15;

      const schedule = () => {
        if (!isRunningRef.current) return;
        const now = ctx.currentTime;

        while (
          nextBeatTime < now + scheduleAheadSec &&
          nextBeatIndex < totalAllBeats
        ) {
          const beatTime = nextBeatTime;
          const beatIndex = nextBeatIndex;
          const isStrong = beatIndex % opts.beatsPerMeasure === 0;

          playClick(ctx, beatTime, isStrong);

          const delayMs = Math.max(0, (beatTime - ctx.currentTime) * 1000);

          if (beatIndex < leadIn) {
            // Lead-in beat: fire measure countdown at start of each measure
            if (isStrong && opts.onLeadInMeasure) {
              const measureCountdown = Math.ceil((leadIn - beatIndex) / opts.beatsPerMeasure);
              const handle = setTimeout(() => {
                if (isRunningRef.current) opts.onLeadInMeasure!(measureCountdown);
              }, delayMs);
              timeoutHandlesRef.current.push(handle);
            }
          } else {
            // Practice beat
            if (beatIndex === leadIn) {
              const handle = setTimeout(() => {
                if (isRunningRef.current) opts.onPracticeStart?.();
              }, delayMs);
              timeoutHandlesRef.current.push(handle);
            }
            const practiceIndex = beatIndex - leadIn;
            const handle = setTimeout(() => {
              if (isRunningRef.current) opts.onBeat(practiceIndex);
            }, delayMs);
            timeoutHandlesRef.current.push(handle);
          }

          nextBeatIndex++;
          nextBeatTime += secPerBeat;
        }
      };

      schedulerTimerRef.current = setInterval(schedule, 25);

      // RAF-driven smooth progress (practice portion only)
      const animate = () => {
        if (!isRunningRef.current) return;
        const elapsed = ctx.currentTime - startTimeRef.current;
        const practiceElapsed = Math.max(0, elapsed - leadInDurSec);
        const progress = Math.min(practiceElapsed / totalDurationSec, 1);
        progressCallbackRef.current?.(progress);
        opts.onDisplayElapsed?.(elapsed - leadInDurSec);

        if (elapsed >= totalDurationSec + leadInDurSec) {
          stop();
          opts.onComplete();
          return;
        }
        rafRef.current = requestAnimationFrame(animate);
      };
      rafRef.current = requestAnimationFrame(animate);
    },
    [stop, getContext, playClick]
  );

  useEffect(() => () => stop(), [stop]);

  return { start, stop };
}
