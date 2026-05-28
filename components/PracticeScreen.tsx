"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import MetronomeControl from "./MetronomeControl";
import JudgementOverlay from "./JudgementOverlay";
import ScrollingStaff from "./ScrollingStaff";
import { usePracticeSession } from "@/hooks/usePracticeSession";
import { useDemoPlayback } from "@/hooks/useDemoPlayback";
import { parseNotesFromXML, parseKeySignature } from "@/lib/osmdUtils";
import type { NoteEvent } from "@/lib/osmdUtils";
import type { Piece } from "@/lib/pieces";
import { calculateAccuracy } from "@/lib/judgement";
import type { ActiveNote } from "@/lib/judgement";

export type HandFilter = 'right' | 'left' | 'both';

interface PracticeScreenProps {
  piece: Piece;
  startMeasure: number;
  endMeasure: number;
  handFilter?: HandFilter;
  alwaysAdvance?: boolean;
  paused?: boolean;
  hudScore?: number;
  songMasterPath?: string;
  onWrong?: () => void;
  onCorrect?: (points: number) => void;
  onStart?: () => void;
  onResult?: (accuracy: number, passed: boolean, wrongCount: number) => void;
  onBack?: () => void;
}

export default function PracticeScreen({
  piece,
  startMeasure,
  endMeasure,
  handFilter = 'both',
  alwaysAdvance = false,
  paused = false,
  hudScore,
  songMasterPath,
  onWrong,
  onCorrect,
  onStart,
  onResult,
  onBack,
}: PracticeScreenProps) {
  const [bpm, setBpm] = useState(piece.bpm);
  const notesRef = useRef<ActiveNote[]>([]);
  const [noteEvents, setNoteEvents] = useState<NoteEvent[]>([]);
  const [keySignature, setKeySignature] = useState(0);

  const {
    isPlaying: demoIsPlaying,
    elapsedSec: demoElapsedSec,
    play: demoPlay,
    stop: demoStop,
  } = useDemoPlayback();

  const {
    status,
    progress,
    displayElapsedSec,
    judgements,
    lastJudgement,
    lastScore,
    sessionResult,
    countdown,
    isListening,
    micError,
    start,
    stop,
  } = usePracticeSession();

  const filterHand = useCallback((evts: NoteEvent[]) => {
    if (handFilter === 'right') return evts.filter(n => n.part === 0);
    if (handFilter === 'left')  return evts.filter(n => n.part === 1);
    return evts;
  }, [handFilter]);

  const startPractice = useCallback(async () => {
    demoStop();
    const measuresCount = endMeasure - startMeasure;
    let notes: ActiveNote[] = [];
    let events: NoteEvent[] = [];

    try {
      const res = await fetch(piece.xmlPath);
      const xmlText = await res.text();
      setKeySignature(parseKeySignature(xmlText));
      const parsed = parseNotesFromXML(xmlText, bpm, startMeasure, endMeasure);
      events = filterHand(parsed);
      notes = filterHand(parsed)
        .filter((n) => !n.isRest)
        .map((n) => ({
          midiNote: n.midiNote,
          startTimeSec: n.startTimeSec,
          durationSec: n.durationSec,
          isRest: false,
        }));
    } catch {
      const secPerBeat = 60 / bpm;
      const beatsTotal = measuresCount * piece.timeSignature.beats;
      const fallback: ActiveNote[] = Array.from({ length: beatsTotal }, (_, i) => ({
        midiNote: 60,
        startTimeSec: i * secPerBeat,
        durationSec: secPerBeat,
        isRest: false,
      }));
      events = filterHand(fallback.map((n) => ({ ...n, measureIndex: 0, part: 0 })));
      notes = events.map(n => ({ midiNote: n.midiNote, startTimeSec: n.startTimeSec, durationSec: n.durationSec, isRest: n.isRest }));
    }

    notesRef.current = notes;
    setNoteEvents(events);

    await start({
      bpm,
      beatsPerMeasure: piece.timeSignature.beats,
      measuresCount,
      notes,
      onMiss: () => onWrongRef.current?.(),
    });
  }, [demoStop, bpm, piece, startMeasure, endMeasure, start, filterHand]);

  useEffect(() => {
    if (paused) stop();
  }, [paused, stop]);

  const onStartRef = useRef(onStart);
  useEffect(() => { onStartRef.current = onStart; });

  const handleStop = useCallback(() => {
    setNoteEvents([]);
    stop();
  }, [stop]);

  const handleStartPractice = useCallback(async () => {
    onStartRef.current?.();
    await startPractice();
  }, [startPractice]);

  const handleDemo = useCallback(async () => {
    if (demoIsPlaying) {
      demoStop();
      return;
    }

    let events: NoteEvent[] = [];
    try {
      const res = await fetch(piece.xmlPath);
      const xmlText = await res.text();
      setKeySignature(parseKeySignature(xmlText));
      events = filterHand(parseNotesFromXML(xmlText, bpm, startMeasure, endMeasure));
      setNoteEvents(events);
    } catch {
      return;
    }

    const leadInSec = (60 / bpm) * piece.timeSignature.beats;
    demoPlay(events, leadInSec);
  }, [demoIsPlaying, demoStop, demoPlay, piece, bpm, startMeasure, endMeasure, filterHand]);

  const onWrongRef = useRef(onWrong);
  useEffect(() => { onWrongRef.current = onWrong; });
  useEffect(() => {
    if (lastJudgement === "wrong") onWrongRef.current?.();
  }, [lastJudgement]);

  const onCorrectRef = useRef(onCorrect);
  useEffect(() => { onCorrectRef.current = onCorrect; });
  useEffect(() => {
    if (lastJudgement === "correct") onCorrectRef.current?.(lastScore);
  }, [lastJudgement, lastScore]);

  // Auto-start on mount: if mic already granted, skip the idle screen
  const startPracticeRef = useRef(startPractice);
  useEffect(() => { startPracticeRef.current = startPractice; });
  useEffect(() => {
    if (alwaysAdvance) {
      startPracticeRef.current();
      return;
    }
    navigator.permissions
      .query({ name: 'microphone' as PermissionName })
      .then((result) => {
        if (result.state === 'granted') startPracticeRef.current();
      })
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-advance when cleared
  useEffect(() => {
    if (status !== "result" || !sessionResult || !sessionResult.passed) return;
    const timer = setTimeout(() => {
      onResult?.(sessionResult.accuracy, sessionResult.passed, sessionResult.wrongCount);
    }, 2000);
    return () => clearTimeout(timer);
  }, [status, sessionResult, onResult]);

  const handleDemoFromResult = useCallback(async () => {
    stop();
    await handleDemo();
  }, [stop, handleDemo]);

  const handleRetryFromResult = useCallback(async () => {
    stop();
    await startPractice();
  }, [stop, startPractice]);

  const elapsedSec = demoIsPlaying ? demoElapsedSec : displayElapsedSec;

  const liveAccuracy = calculateAccuracy(judgements);
  const hasJudged = judgements.some(j => j.judgement !== "pending");

  const isActive = status === "playing" || status === "countdown";
  const isIdle = status === "idle" && !alwaysAdvance;

  return (
    <div className="fixed inset-0 flex flex-col bg-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 shrink-0">
        {onBack && (
          <button onClick={onBack} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 shrink-0">
            ←
          </button>
        )}
        <div className="flex-1 min-w-0">
          <div className="font-bold text-gray-800 truncate">{piece.title}</div>
          <div className="text-xs text-gray-500 truncate">{piece.composer}</div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isListening && (
            <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              マイク ON
            </span>
          )}
          {micError && (
            <span className="text-xs text-red-500 bg-red-50 px-2 py-1 rounded-full">
              マイクエラー
            </span>
          )}
          {isActive && (
            <button
              onClick={handleStop}
              className="px-3 py-1.5 rounded-lg bg-red-500 text-white text-sm font-bold hover:bg-red-600"
            >
              ■ 停止
            </button>
          )}
          {demoIsPlaying && (
            <button
              onClick={handleDemo}
              className="px-3 py-1.5 rounded-lg bg-amber-100 text-amber-700 text-sm font-medium hover:bg-amber-200"
            >
              ■ 停止
            </button>
          )}
        </div>
      </div>

      {/* Sheet music — fills remaining height */}
      <div className="flex-1 relative overflow-hidden">
        <ScrollingStaff
          notes={noteEvents}
          judgements={demoIsPlaying ? [] : judgements}
          elapsedSec={elapsedSec}
          bpm={bpm}
          beatsPerMeasure={piece.timeSignature.beats}
          beatType={piece.timeSignature.beatType}
          startMeasure={startMeasure}
          endMeasure={endMeasure}
          keySignature={keySignature}
        />

        {/* Accuracy / score HUD */}
        {status === "playing" && (
          <div className="absolute top-2 right-4 z-10 flex items-center gap-3">
            {hudScore !== undefined && (
              <>
                <span className="text-sm font-black text-gray-700">
                  スコア <span className="text-base">{hudScore}</span>
                </span>
                <span className="text-gray-300">|</span>
              </>
            )}
            <span
              className="text-sm font-black"
              style={{ color: !hasJudged || liveAccuracy >= 90 ? "#111" : "#dc2626" }}
            >
              精度 {hasJudged ? Math.round(liveAccuracy) : "—"}%
            </span>
          </div>
        )}

        {/* Countdown overlay */}
        {status === "countdown" && countdown > 0 && (
          <div className="absolute inset-0 flex items-center justify-center z-10 bg-white/50">
            <div className="text-6xl font-black text-indigo-500 animate-pulse">{countdown}</div>
          </div>
        )}

        {/* Progress bar at bottom of sheet */}
        {status === "playing" && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-100">
            <div
              className="h-full bg-indigo-400 transition-none"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        )}
      </div>

      {/* Pre-practice bottom sheet (idle, not auto-started) */}
      {isIdle && !demoIsPlaying && (
        <div className="shrink-0 bg-white border-t border-gray-100 px-4 pt-3 pb-6">
          <MetronomeControl
            bpm={bpm}
            onBpmChange={setBpm}
            disabled={false}
          />
          <div className="flex gap-3 mt-3">
            <button
              onClick={handleDemo}
              className="flex-1 py-3 rounded-xl text-sm font-medium bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"
            >
              ♪ お手本を聴く
            </button>
            <button
              onClick={handleStartPractice}
              className="flex-1 py-3 rounded-xl text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              ▶ 練習スタート
            </button>
          </div>
        </div>
      )}

      {/* Demo playing: bottom stop strip */}
      {demoIsPlaying && (
        <div className="shrink-0 bg-white border-t border-gray-100 px-4 pt-3 pb-6">
          <div className="flex gap-3">
            <button
              onClick={handleDemo}
              className="flex-1 py-3 rounded-xl text-sm font-medium bg-amber-100 text-amber-700 hover:bg-amber-200 border border-amber-200"
            >
              ■ お手本を停止
            </button>
            <button
              onClick={handleStartPractice}
              className="flex-1 py-3 rounded-xl text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              ▶ 練習スタート
            </button>
          </div>
        </div>
      )}

      {/* Result modal */}
      {status === "result" && sessionResult && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/40 backdrop-blur-sm">
          <div className={`rounded-2xl p-6 border-2 w-full max-w-sm mx-4 shadow-2xl ${
            sessionResult.passed ? "bg-green-50 border-green-300" : "bg-orange-50 border-orange-300"
          }`}>
            <div className="text-center mb-5">
              <div className="text-5xl font-black mb-2">
                {sessionResult.passed ? "クリア!" : "もう一度!"}
              </div>
              <div className="text-3xl font-bold text-gray-700">
                {Math.round(sessionResult.accuracy)}%
              </div>
              <div className="text-sm text-gray-500 mt-1">
                {sessionResult.correctCount} / {sessionResult.totalCount} 正解
              </div>
            </div>
            {sessionResult.passed ? (
              <div className="text-center text-xs text-gray-400 mt-1">まもなく次へ進みます...</div>
            ) : (
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <button
                    onClick={handleDemoFromResult}
                    className="flex-1 py-3 rounded-lg bg-white border border-amber-200 text-amber-700 font-medium hover:bg-amber-50 text-sm"
                  >
                    ♪ お手本を聴く
                  </button>
                  <button
                    onClick={handleRetryFromResult}
                    className="flex-1 py-3 rounded-lg bg-indigo-600 text-white font-bold hover:bg-indigo-700 text-sm"
                  >
                    ▶ もう一度挑戦
                  </button>
                </div>
                {songMasterPath && (
                  <Link
                    href={songMasterPath}
                    className="w-full py-3 rounded-lg bg-purple-600 text-white font-medium hover:bg-purple-700 text-sm text-center block"
                  >
                    曲マスターでこの曲を練習する
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <JudgementOverlay judgement={lastJudgement} score={lastScore} />
    </div>
  );
}
