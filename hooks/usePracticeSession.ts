"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { usePitchDetection } from "./usePitchDetection";
import { useMetronome } from "./useMetronome";
import { judgeNote, calculateAccuracy, TIMING_WINDOW_SEC, type JudgementResult, type ActiveNote } from "@/lib/judgement";

export type SessionStatus = "idle" | "countdown" | "playing" | "result";

export interface SessionResult {
  accuracy: number;
  correctCount: number;
  totalCount: number;
  wrongCount: number;
  passed: boolean;
}

interface PracticeSessionOptions {
  bpm: number;
  beatsPerMeasure: number;
  measuresCount: number;
  notes: ActiveNote[];
  onMiss?: () => void;
}

export function usePracticeSession() {
  const [status, setStatus] = useState<SessionStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [displayElapsedSec, setDisplayElapsedSec] = useState(-100);
  const [judgements, setJudgements] = useState<JudgementResult[]>([]);
  const [lastJudgement, setLastJudgement] = useState<"correct" | "wrong" | null>(null);
  const [sessionResult, setSessionResult] = useState<SessionResult | null>(null);
  const [countdown, setCountdown] = useState(0);

  const notesRef = useRef<ActiveNote[]>([]);
  const judgementsRef = useRef<JudgementResult[]>([]);
  const sessionStartTimeRef = useRef<number>(0);
  const totalDurationSecRef = useRef<number>(0);
  const startIdRef = useRef(0);
  const countdownHandlesRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const pitchGatedRef = useRef(false);
  const missIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { start: startPitch, stop: stopPitch, isListening, error: micError } = usePitchDetection();
  const { start: startMetronome, stop: stopMetronome } = useMetronome();

  const handlePitch = useCallback((midi: number) => {
    if (!sessionStartTimeRef.current) return;
    if (pitchGatedRef.current) return;
    const currentTimeSec = (Date.now() - sessionStartTimeRef.current) / 1000;

    for (let i = 0; i < notesRef.current.length; i++) {
      const note = notesRef.current[i];
      const existing = judgementsRef.current[i];
      if (existing?.judgement === "correct" || existing?.judgement === "wrong") continue;

      // Future note — stop searching
      if (note.startTimeSec - currentTimeSec > TIMING_WINDOW_SEC) break;

      const result = judgeNote(note, midi, currentTimeSec);
      if (result === "correct" || result === "wrong") {
        const newJudgement: JudgementResult = {
          noteIndex: i,
          judgement: result,
          detectedMidi: midi,
          detectedTimeSec: currentTimeSec,
        };
        judgementsRef.current[i] = newJudgement;
        setJudgements([...judgementsRef.current]);
        setLastJudgement(result);
        setTimeout(() => setLastJudgement(null), 400);
        break;
      }
    }
  }, []);

  const stop = useCallback(() => {
    startIdRef.current++;
    countdownHandlesRef.current.forEach(clearTimeout);
    countdownHandlesRef.current = [];
    if (missIntervalRef.current) {
      clearInterval(missIntervalRef.current);
      missIntervalRef.current = null;
    }
    stopMetronome();
    stopPitch();
    sessionStartTimeRef.current = 0;
    setStatus("idle");
    setProgress(0);
    setDisplayElapsedSec(-100);
  }, [stopMetronome, stopPitch]);

  const start = useCallback(async (opts: PracticeSessionOptions) => {
    const startId = ++startIdRef.current;
    const isStale = () => startIdRef.current !== startId;

    countdownHandlesRef.current.forEach(clearTimeout);
    countdownHandlesRef.current = [];

    notesRef.current = opts.notes;
    judgementsRef.current = opts.notes.map((_, i) => ({
      noteIndex: i,
      judgement: "pending" as const,
    }));
    setJudgements([...judgementsRef.current]);
    setSessionResult(null);
    setLastJudgement(null);
    sessionStartTimeRef.current = 0;

    const secPerBeat = 60 / opts.bpm;
    const totalBeats = opts.beatsPerMeasure * opts.measuresCount;
    totalDurationSecRef.current = secPerBeat * totalBeats;

    setStatus("countdown");
    setCountdown(2);

    // Start mic immediately so it's ready
    await startPitch({
      onPitch: ({ midiNote }) => handlePitch(midiNote),
      clarityThreshold: 0.92,
      amplitudeThreshold: 0.015,
    });
    if (isStale()) return;

    // Silent countdown: "2" for 1s → "1" for 1s → then metronome + scroll
    const h1 = setTimeout(() => {
      if (isStale()) return;
      setCountdown(1);
    }, 1000);
    countdownHandlesRef.current.push(h1);

    const h2 = setTimeout(() => {
      if (isStale()) return;
      setCountdown(0);
      setStatus("playing");

      // 1-measure lead-in with metronome clicks so notes scroll in from off-screen right
      const leadInBeats = opts.beatsPerMeasure;

      startMetronome(
        {
          bpm: opts.bpm,
          beatsPerMeasure: opts.beatsPerMeasure,
          totalBeats,
          leadInBeats,
          onLeadInMeasure: () => {},
          onPracticeStart: () => {
            if (isStale()) return;
            sessionStartTimeRef.current = Date.now();
            // Detect missed notes in real-time (50ms polling)
            missIntervalRef.current = setInterval(() => {
              if (!sessionStartTimeRef.current || isStale()) return;
              const now = (Date.now() - sessionStartTimeRef.current) / 1000;
              let anyNew = false;
              for (let i = 0; i < notesRef.current.length; i++) {
                if (judgementsRef.current[i]?.judgement !== "pending") continue;
                if (now > notesRef.current[i].startTimeSec + TIMING_WINDOW_SEC) {
                  judgementsRef.current[i] = { noteIndex: i, judgement: "missed" };
                  opts.onMiss?.();
                  anyNew = true;
                }
              }
              if (anyNew) setJudgements([...judgementsRef.current]);
            }, 50);
          },
          onDisplayElapsed: (sec) => {
            // sec is negative during lead-in (notes off-screen right), 0+ during practice
            setDisplayElapsedSec(sec);
          },
          onBeat: () => {
            pitchGatedRef.current = true;
            setTimeout(() => { pitchGatedRef.current = false; }, 100);
          },
          onComplete: () => {
            if (missIntervalRef.current) {
              clearInterval(missIntervalRef.current);
              missIntervalRef.current = null;
            }
            stopPitch();
            const finalJudgements = judgementsRef.current.map((j) => {
              if (j.judgement === "pending") {
                opts.onMiss?.();
                return { ...j, judgement: "missed" as const };
              }
              return j;
            });
            judgementsRef.current = finalJudgements;
            setJudgements(finalJudgements);

            const accuracy = calculateAccuracy(finalJudgements);
            const correct = finalJudgements.filter((j) => j.judgement === "correct").length;
            const wrong = finalJudgements.filter((j) => j.judgement === "wrong").length;
            const total = finalJudgements.filter((j) => j.judgement !== "pending").length;
            setSessionResult({ accuracy, correctCount: correct, totalCount: total, wrongCount: wrong, passed: accuracy >= 80 });
            setStatus("result");
            setProgress(0);
          },
        },
        (prog) => setProgress(prog)
      );
    }, 2000);
    countdownHandlesRef.current.push(h2);
  }, [startPitch, startMetronome, stopPitch, handlePitch]);

  // Clean up on unmount so stale intervals/timeouts can't fire callbacks
  useEffect(() => {
    return () => {
      startIdRef.current++;
      countdownHandlesRef.current.forEach(clearTimeout);
      if (missIntervalRef.current) {
        clearInterval(missIntervalRef.current);
        missIntervalRef.current = null;
      }
    };
  }, []);

  return {
    status,
    progress,
    displayElapsedSec,
    totalDurationSec: totalDurationSecRef.current,
    judgements,
    lastJudgement,
    sessionResult,
    countdown,
    isListening,
    micError,
    start,
    stop,
  };
}
