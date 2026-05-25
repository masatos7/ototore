"use client";

import { useCallback, useRef, useState } from "react";
import MetronomeControl from "./MetronomeControl";
import JudgementOverlay from "./JudgementOverlay";
import ScrollingStaff from "./ScrollingStaff";
import { usePracticeSession } from "@/hooks/usePracticeSession";
import { useDemoPlayback } from "@/hooks/useDemoPlayback";
import { parseNotesFromXML, parseKeySignature } from "@/lib/osmdUtils";
import type { NoteEvent } from "@/lib/osmdUtils";
import type { Piece } from "@/lib/pieces";
import type { ActiveNote } from "@/lib/judgement";

interface PracticeScreenProps {
  piece: Piece;
  startMeasure: number;
  endMeasure: number;
  onResult?: (accuracy: number, passed: boolean) => void;
  onBack?: () => void;
}

export default function PracticeScreen({
  piece,
  startMeasure,
  endMeasure,
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
    totalDurationSec,
    judgements,
    lastJudgement,
    sessionResult,
    countdown,
    isListening,
    micError,
    start,
    stop,
  } = usePracticeSession();

  const handleToggle = useCallback(async () => {
    demoStop();
    if (status === "playing" || status === "countdown") {
      setNoteEvents([]);
      stop();
      return;
    }

    const measuresCount = endMeasure - startMeasure;
    let notes: ActiveNote[] = [];
    let events: NoteEvent[] = [];

    try {
      const res = await fetch(piece.xmlPath);
      const xmlText = await res.text();
      setKeySignature(parseKeySignature(xmlText));
      const parsed = parseNotesFromXML(xmlText, bpm, startMeasure, endMeasure);
      events = parsed;
      notes = parsed.map((n) => ({
        midiNote: n.midiNote,
        startTimeSec: n.startTimeSec,
        durationSec: n.durationSec,
        isRest: n.isRest,
      }));
    } catch {
      const secPerBeat = 60 / bpm;
      const beatsTotal = measuresCount * piece.timeSignature.beats;
      notes = Array.from({ length: beatsTotal }, (_, i) => ({
        midiNote: 60,
        startTimeSec: i * secPerBeat,
        durationSec: secPerBeat,
        isRest: false,
      }));
      events = notes.map((n) => ({ ...n, measureIndex: 0, part: 0 }));
    }

    notesRef.current = notes;
    setNoteEvents(events);

    await start({
      bpm,
      beatsPerMeasure: piece.timeSignature.beats,
      measuresCount,
      notes,
    });
  }, [status, bpm, piece, startMeasure, endMeasure, start, stop]);

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
      events = parseNotesFromXML(xmlText, bpm, startMeasure, endMeasure);
      setNoteEvents(events);
    } catch {
      return;
    }

    const leadInSec = (60 / bpm) * piece.timeSignature.beats;
    demoPlay(events, leadInSec);
  }, [demoIsPlaying, demoStop, demoPlay, piece, bpm, startMeasure, endMeasure]);

  const handleResultAction = useCallback((retry: boolean) => {
    if (retry) {
      setNoteEvents([]);
      stop();
    } else if (sessionResult) {
      onResult?.(sessionResult.accuracy, sessionResult.passed);
    }
  }, [sessionResult, onResult, stop]);

  const elapsedSec = demoIsPlaying ? demoElapsedSec : displayElapsedSec;
  const measuresLabel = `第${startMeasure + 1}〜${endMeasure}小節`;

  return (
    <div className="flex flex-col gap-4 w-full max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        {onBack && (
          <button onClick={onBack} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
            ←
          </button>
        )}
        <div>
          <h2 className="font-bold text-gray-800 text-lg">{piece.title}</h2>
          <p className="text-sm text-gray-500">{piece.composer} · {measuresLabel}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
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
        </div>
      </div>

      {/* Scrolling staff */}
      <div className="relative w-full rounded-xl shadow-sm border border-gray-100 overflow-hidden bg-white"
           style={{ height: noteEvents.some(n => n.part === 1) ? "280px" : "200px" }}>
        <ScrollingStaff
          notes={noteEvents}
          judgements={judgements}
          elapsedSec={elapsedSec}
          bpm={bpm}
          beatsPerMeasure={piece.timeSignature.beats}
          startMeasure={startMeasure}
          endMeasure={endMeasure}
          keySignature={keySignature}
        />

        {/* Lead-in countdown overlay */}
        {status === "countdown" && countdown > 0 && (
          <div className="absolute inset-0 flex items-center justify-center z-10"
               style={{ background: "rgba(255,255,255,0.5)" }}>
            <div className="flex flex-col items-center gap-1">
              <div className="text-xs text-gray-400 font-medium tracking-widest">リードイン</div>
              <div className="text-6xl font-black text-indigo-500 animate-pulse">{countdown}</div>
            </div>
          </div>
        )}
      </div>

      {/* Progress bar (playing only) */}
      {status === "playing" && (
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-400 rounded-full transition-none"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      )}

      {/* BPM gauge (shared) */}
      <MetronomeControl
        bpm={bpm}
        onBpmChange={setBpm}
        disabled={status === "playing" || status === "countdown" || demoIsPlaying}
      />

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleDemo}
          disabled={status === "playing" || status === "countdown"}
          className={`flex-1 py-3 rounded-xl text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
            demoIsPlaying
              ? "bg-amber-100 text-amber-700 hover:bg-amber-200 border border-amber-200"
              : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"
          }`}
        >
          {demoIsPlaying ? "■ 停止" : "♪ お手本を聴く"}
        </button>
        <button
          onClick={handleToggle}
          disabled={demoIsPlaying}
          className={`flex-1 py-3 rounded-xl text-sm font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
            status === "playing" || status === "countdown"
              ? "bg-red-500 hover:bg-red-600 text-white"
              : "bg-indigo-600 hover:bg-indigo-700 text-white"
          }`}
        >
          {status === "playing" || status === "countdown" ? "■ 停止" : "▶ 練習スタート"}
        </button>
      </div>

      {/* Live judgement dots */}
      {(status === "playing" || status === "result") && judgements.length > 0 && (
        <div className="flex flex-wrap gap-1.5 bg-white rounded-xl p-3 shadow-sm border border-gray-100">
          {judgements.map((j, i) => (
            <span
              key={i}
              className={`w-5 h-5 rounded-full ${
                j.judgement === "correct" ? "bg-green-400"
                : j.judgement === "wrong"  ? "bg-red-400"
                : j.judgement === "missed" ? "bg-gray-300"
                : "bg-gray-100"
              }`}
              title={j.judgement}
            />
          ))}
        </div>
      )}

      {/* Result overlay */}
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
            <div className="flex gap-3">
              <button
                onClick={() => handleResultAction(true)}
                className="flex-1 py-3 rounded-lg bg-white border border-gray-200 text-gray-700 font-medium hover:bg-gray-50"
              >
                もう一度
              </button>
              {sessionResult.passed && (
                <button
                  onClick={() => handleResultAction(false)}
                  className="flex-1 py-3 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700"
                >
                  次へ進む
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <JudgementOverlay judgement={lastJudgement} />
    </div>
  );
}
