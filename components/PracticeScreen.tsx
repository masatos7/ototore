"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import JudgementOverlay from "./JudgementOverlay";
import ScrollingStaff from "./ScrollingStaff";
import { usePracticeSession } from "@/hooks/usePracticeSession";
import { useDemoPlayback } from "@/hooks/useDemoPlayback";
import { parseNotesFromXML, parseKeySignature } from "@/lib/osmdUtils";
import type { NoteEvent } from "@/lib/osmdUtils";
import type { Piece } from "@/lib/pieces";
import { calculateAccuracy } from "@/lib/judgement";
import type { ActiveNote } from "@/lib/judgement";

export type HandFilter = "right" | "left" | "both";

interface PracticeScreenProps {
  piece: Piece;
  startMeasure: number;
  endMeasure: number;
  handFilter?: HandFilter;
  rangeLabel?: string;
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
  handFilter = "both",
  rangeLabel,
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
  const router = useRouter();
  const handleBack = onBack ?? (() => router.back());
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
    if (handFilter === "right") return evts.filter((n) => n.part === 0);
    if (handFilter === "left")  return evts.filter((n) => n.part === 1);
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
      notes = events.map((n) => ({ midiNote: n.midiNote, startTimeSec: n.startTimeSec, durationSec: n.durationSec, isRest: n.isRest }));
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
    setIsPaused(true);
  }, [stop]);

  const handleStartPractice = useCallback(async () => {
    setIsPaused(false);
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

  const [isPaused, setIsPaused] = useState(false);
  const [autoStarting, setAutoStarting] = useState(!alwaysAdvance);
  const startPracticeRef = useRef(startPractice);
  useEffect(() => { startPracticeRef.current = startPractice; });
  useEffect(() => {
    if (alwaysAdvance) {
      startPracticeRef.current();
      return;
    }
    navigator.permissions
      .query({ name: "microphone" as PermissionName })
      .then((result) => {
        if (result.state === "granted") {
          startPracticeRef.current().finally(() => setAutoStarting(false));
        } else {
          setAutoStarting(false);
        }
      })
      .catch(() => { setAutoStarting(false); });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
  const hasJudged = judgements.some((j) => j.judgement !== "pending");
  const isActive = status === "playing" || status === "countdown";
  const showPausedPanel = status === "idle" && isPaused && !autoStarting;
  const isIdle = status === "idle" && !autoStarting && !isPaused && (!alwaysAdvance);

  const badgeLabel = rangeLabel ?? `${endMeasure - startMeasure}小節`;
  const bpmFill = `${((bpm - 40) / 160) * 100}%`;
  const presets = [60, 80, 100, 120];

  return (
    <div style={{
      position: "fixed", inset: 0, display: "flex", flexDirection: "column",
      background: "#fff", overflow: "hidden", zIndex: 10,
    }}>
      {/* Top bar */}
      <header style={{
        display: "grid", gridTemplateColumns: "auto 1fr auto",
        alignItems: "center", gap: 16, padding: "12px 20px 10px",
        borderBottom: "1px solid rgba(140,120,200,0.08)", flexShrink: 0,
        background: "rgba(255,255,255,0.97)",
      }}>
        {onBack ? (
          <button
            onClick={onBack}
            aria-label="もどる"
            style={{
              width: 44, height: 44, borderRadius: "50%", border: "none",
              background: "rgba(255,255,255,0.85)", display: "grid", placeItems: "center",
              cursor: "pointer", boxShadow: "0 2px 8px rgba(80,70,130,0.08)",
              transition: "background .15s ease", flexShrink: 0,
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M14 6l-6 6 6 6" stroke="#4A4A65" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        ) : <div />}

        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 900, fontSize: 18, color: "var(--ink)", letterSpacing: "0.02em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {piece.title}
          </div>
          <div style={{ fontSize: 13, color: "var(--muted)", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {piece.composer}
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
          {isListening && (
            <span style={{
              display: "flex", alignItems: "center", gap: 6,
              fontSize: 12, color: "#16a34a", background: "#f0fdf4",
              padding: "4px 10px", borderRadius: 999, fontWeight: 700,
            }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e" }} />
              マイク ON
            </span>
          )}
          {micError && (
            <span style={{ fontSize: 12, color: "var(--coral)", background: "#fff0f0", padding: "4px 10px", borderRadius: 999, fontWeight: 700 }}>
              マイクエラー
            </span>
          )}
<span style={{
            display: "inline-flex", alignItems: "center",
            background: "var(--lavender-50)", color: "var(--lavender-700)",
            border: "1px solid var(--lavender-100)",
            fontWeight: 800, padding: "6px 14px", borderRadius: 999, fontSize: 13,
          }}>
            {badgeLabel}
          </span>
        </div>
      </header>

      {/* Score panel — fills remaining */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
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

        {/* Accuracy HUD */}
        {status === "playing" && hasJudged && (
          <div style={{
            position: "absolute", top: 8, right: 12, zIndex: 10,
            display: "flex", alignItems: "center", gap: 6,
            background: "rgba(255,255,255,0.9)", borderRadius: 999,
            padding: "4px 12px", backdropFilter: "blur(4px)",
            boxShadow: "0 2px 8px rgba(80,70,130,0.1)",
          }}>
            {hudScore !== undefined && (
              <span style={{ fontSize: 13, fontWeight: 900, color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>
                {hudScore}pt
              </span>
            )}
            {hudScore !== undefined && (
              <span style={{ fontSize: 11, color: "var(--muted)" }}>·</span>
            )}
            <span style={{
              fontSize: 13, fontWeight: 900,
              color: liveAccuracy >= 90 ? "var(--lavender-700)" : "var(--coral)",
              fontVariantNumeric: "tabular-nums",
            }}>
              精度 {Math.round(liveAccuracy)}%
            </span>
          </div>
        )}

        {/* Countdown overlay */}
        {status === "countdown" && countdown > 0 && (
          <div style={{
            position: "absolute", inset: 0, display: "flex", alignItems: "center",
            justifyContent: "center", zIndex: 10, background: "rgba(255,255,255,0.6)",
          }}>
            <div style={{ fontSize: 64, fontWeight: 900, color: "var(--lavender-500)" }}>{countdown}</div>
          </div>
        )}

        {/* Progress bar */}
        {status === "playing" && (
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 3, background: "var(--lavender-50)" }}>
            <div style={{ height: "100%", background: "var(--lavender-500)", width: `${progress * 100}%` }} />
          </div>
        )}
      </div>

      {/* Bottom panel (idle / demo) */}
      {(isIdle || demoIsPlaying) && (
        <div style={{
          flexShrink: 0, background: "rgba(255,255,255,0.97)",
          borderTop: "1px solid rgba(140,120,200,0.08)",
          padding: "16px 20px 24px", display: "flex", flexDirection: "column", gap: 12,
        }}>
          {/* BPM controls */}
          <div style={{
            background: "rgba(255,255,255,0.96)", borderRadius: 20,
            border: "1px solid rgba(140,120,200,0.08)",
            boxShadow: "0 2px 4px rgba(80,70,130,0.04)",
            padding: "14px 18px", display: "grid", gap: 10,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <label htmlFor="practice-bpm" style={{ fontWeight: 800, color: "var(--ink)", fontSize: 14 }}>
                スピード (BPM)
              </label>
              <span style={{ fontWeight: 900, fontSize: 22, color: "var(--lavender-700)", fontVariantNumeric: "tabular-nums" }}>
                {bpm}
              </span>
            </div>
            <input
              id="practice-bpm"
              className="bpm-slider"
              type="range"
              min="40"
              max="200"
              step="1"
              value={bpm}
              onChange={(e) => setBpm(+e.target.value)}
              style={{ "--fill": bpmFill } as React.CSSProperties}
            />
            <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", alignItems: "center", gap: 16 }}>
              <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 700 }}>40</span>
              <div style={{ display: "flex", justifyContent: "center", gap: 6 }}>
                {presets.map((v) => (
                  <button
                    key={v}
                    onClick={() => setBpm(v)}
                    style={{
                      border: bpm === v ? "1px solid var(--lavender-100)" : "1px solid transparent",
                      background: bpm === v ? "var(--lavender-50)" : "transparent",
                      color: bpm === v ? "var(--lavender-700)" : "var(--muted)",
                      fontWeight: 800, fontSize: 13, padding: "5px 12px",
                      borderRadius: 999, cursor: "pointer", transition: "all .15s ease",
                    }}
                  >
                    {v}
                  </button>
                ))}
              </div>
              <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 700 }}>200</span>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: "grid", gridTemplateColumns: "auto 1fr 1.4fr", gap: 12, alignItems: "stretch" }}>
            <div style={{
              width: 52, height: 52, borderRadius: "50%",
              background: "#FFE4F0", overflow: "hidden",
              display: "grid", placeItems: "center",
              boxShadow: "0 2px 8px rgba(255,122,182,0.25)", alignSelf: "center",
            }}>
              <Image
                src="/images/top-img.png"
                alt=""
                width={58}
                height={58}
                style={{ width: "120%", height: "120%", objectFit: "cover", objectPosition: "28% 30%" }}
              />
            </div>
            <button
              onClick={handleDemo}
              style={{
                border: demoIsPlaying ? "1px solid rgba(245,155,51,0.3)" : "1px solid rgba(140,120,200,0.12)",
                background: demoIsPlaying ? "rgba(245,155,51,0.1)" : "rgba(255,255,255,0.96)",
                color: demoIsPlaying ? "var(--orange)" : "var(--ink)",
                fontWeight: 800, fontSize: 15, borderRadius: 16, cursor: "pointer",
                padding: "14px 16px", transition: "transform .15s ease",
              }}
            >
              {demoIsPlaying ? "■ 停止" : "♪ お手本を聴く"}
            </button>
            <button
              onClick={handleStartPractice}
              style={{
                border: "none", borderRadius: 16,
                background: "linear-gradient(160deg,#8B7DD8,#6A57C2)",
                color: "#fff", fontWeight: 800, fontSize: 15,
                padding: "14px 16px", cursor: "pointer",
                boxShadow: "0 8px 22px rgba(106,87,194,0.35)",
                transition: "transform .15s ease, filter .15s ease",
              }}
            >
              ▶ 練習スタート
            </button>
          </div>
        </div>
      )}

      {/* Floating pause button — visible while playing */}
      {isActive && (
        <div style={{
          position: "absolute", bottom: 24, right: 20, zIndex: 20,
          pointerEvents: "none",
        }}>
          <button
            onClick={handleStop}
            style={{
              pointerEvents: "auto",
              border: "none", borderRadius: 999,
              background: "linear-gradient(160deg,#F58B6B,#E66B4B)",
              color: "#fff", fontWeight: 800, fontSize: 15,
              padding: "14px 24px", cursor: "pointer",
              boxShadow: "0 8px 22px rgba(230,107,75,0.40)",
              display: "flex", alignItems: "center", gap: 8,
            }}
          >
            <span style={{ fontSize: 18, lineHeight: 1 }}>⏸</span>
            一時停止
          </button>
        </div>
      )}

      {/* Pause modal */}
      {showPausedPanel && !demoIsPlaying && (
        <PauseModal
          onResume={handleStartPractice}
          onDemo={handleDemo}
          onBack={handleBack}
        />
      )}

      {/* Result modal */}
      {status === "result" && sessionResult && (
        <ResultModal
          sessionResult={sessionResult}
          songMasterPath={songMasterPath}
          onListen={handleDemoFromResult}
          onRetry={handleRetryFromResult}
        />
      )}

      <JudgementOverlay judgement={lastJudgement} score={lastScore} />
    </div>
  );
}

/* ---- Result modal ---- */
function ResultModal({
  sessionResult,
  songMasterPath,
  onListen,
  onRetry,
}: {
  sessionResult: { accuracy: number; passed: boolean; correctCount: number; totalCount: number };
  songMasterPath?: string;
  onListen: () => void;
  onRetry: () => void;
}) {
  const pct = Math.round(sessionResult.accuracy);
  let title = "もう一度!";
  let tone: { border: string; background: string } = { border: "#F5C26B", background: "linear-gradient(180deg,#FFF6E5,#FFEED3)" };

  if (pct === 100) {
    title = "パーフェクト!";
    tone = { border: "#F2C535", background: "linear-gradient(180deg,#FFF9D6,#FFEF9C)" };
  } else if (pct >= 80) {
    title = "じょうず!";
    tone = { border: "#F59E42", background: "linear-gradient(180deg,#FFF1DD,#FFE0B8)" };
  } else if (pct >= 50) {
    title = "もうすこし!";
  }

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(70,60,100,0.32)",
      backdropFilter: "blur(2px)", display: "grid", placeItems: "center",
      zIndex: 100, padding: 24, animation: "modal-fade 0.25s ease both",
    }}>
      <div style={{
        background: tone.background,
        border: `3px solid ${tone.border}`,
        borderRadius: 22, padding: "28px 30px 24px",
        width: "min(420px,100%)", textAlign: "center",
        boxShadow: "0 24px 60px rgba(80,60,30,0.18)",
        animation: "pop 0.35s cubic-bezier(.2,1.4,.5,1) both",
      }} role="dialog" aria-modal="true">
        <h2 style={{ margin: "0 0 12px", fontSize: "clamp(34px,5vw,44px)", fontWeight: 900, letterSpacing: "0.02em", color: "var(--ink)" }}>
          {title}
        </h2>
        <div style={{ fontSize: 40, fontWeight: 900, color: "var(--lavender-700)", lineHeight: 1, marginBottom: 6, fontVariantNumeric: "tabular-nums" }}>
          {pct}%
        </div>
        <div style={{ color: "var(--muted)", fontSize: 14, fontWeight: 700, marginBottom: 22 }}>
          {sessionResult.correctCount} / {sessionResult.totalCount} 正解
        </div>

        {sessionResult.passed ? (
          <div style={{ fontSize: 13, color: "var(--muted)" }}>まもなく次へ進みます...</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <button
                onClick={onListen}
                style={{
                  border: "1px solid rgba(140,120,200,0.12)", background: "rgba(255,255,255,0.96)",
                  color: "var(--ink)", fontWeight: 800, fontSize: 14, borderRadius: 14,
                  padding: "12px", cursor: "pointer",
                  boxShadow: "0 1px 2px rgba(80,70,130,0.08)",
                }}
              >
                ♪ お手本を聴く
              </button>
              <button
                onClick={onRetry}
                style={{
                  border: "none", background: "linear-gradient(160deg,#8B7DD8,#6A57C2)",
                  color: "#fff", fontWeight: 800, fontSize: 14, borderRadius: 14,
                  padding: "12px", cursor: "pointer",
                  boxShadow: "0 2px 6px rgba(106,87,194,0.18)",
                }}
              >
                ▶ もう一度挑戦
              </button>
            </div>
            {songMasterPath && (
              <Link
                href={songMasterPath}
                style={{
                  display: "block", width: "100%", background: "var(--lavender-200)",
                  color: "var(--lavender-700)", border: "none", borderRadius: 14,
                  padding: 14, fontWeight: 800, fontSize: 14, cursor: "pointer",
                  textDecoration: "none", textAlign: "center",
                  transition: "background .15s ease",
                }}
              >
                曲マスターでこの曲を練習する
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---- Pause modal ---- */
function PauseModal({
  onResume,
  onDemo,
  onBack,
}: {
  onResume: () => void;
  onDemo: () => void;
  onBack: () => void;
}) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(70,60,100,0.32)",
      backdropFilter: "blur(2px)", display: "grid", placeItems: "center",
      zIndex: 100, padding: 24, animation: "modal-fade 0.25s ease both",
    }}>
      <div style={{
        background: "#fff",
        border: "2px solid var(--lavender-100)",
        borderRadius: 22, padding: "28px 30px 24px",
        width: "min(360px,100%)", textAlign: "center",
        boxShadow: "0 24px 60px rgba(80,60,120,0.18)",
        animation: "pop 0.35s cubic-bezier(.2,1.4,.5,1) both",
      }} role="dialog" aria-modal="true">
        <div style={{ fontSize: 36, marginBottom: 8 }}>⏸</div>
        <h2 style={{ margin: "0 0 20px", fontSize: 22, fontWeight: 900, color: "var(--ink)" }}>
          一時停止中
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button
            onClick={onResume}
            style={{
              border: "none", borderRadius: 16,
              background: "linear-gradient(160deg,#8B7DD8,#6A57C2)",
              color: "#fff", fontWeight: 800, fontSize: 16,
              padding: "16px", cursor: "pointer",
              boxShadow: "0 8px 22px rgba(106,87,194,0.35)",
            }}
          >
            ▶ 再開する
          </button>
          <button
            onClick={onDemo}
            style={{
              border: "1px solid rgba(140,120,200,0.2)",
              background: "rgba(255,255,255,0.96)",
              color: "var(--ink)", fontWeight: 800, fontSize: 15,
              borderRadius: 16, padding: "14px", cursor: "pointer",
              boxShadow: "0 1px 2px rgba(80,70,130,0.06)",
            }}
          >
            ♪ お手本を聴く
          </button>
          <button
            onClick={onBack}
            style={{
              border: "none", background: "transparent",
              color: "var(--muted)", fontWeight: 700, fontSize: 14,
              padding: "10px", cursor: "pointer",
            }}
          >
            ← やめる
          </button>
        </div>
      </div>
    </div>
  );
}
