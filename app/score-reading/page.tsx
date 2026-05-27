"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { PIECES } from "@/lib/pieces";
import PracticeScreen, { type HandFilter } from "@/components/PracticeScreen";

const SEGMENT_SIZE = 4;
const MAX_MISSES = 10;

const ORDERED_PIECES = [...PIECES].sort((a, b) => a.difficulty - b.difficulty);

type SessionState =
  | { phase: "idle" }
  | { phase: "playing"; pieceIndex: number; measureOffset: number; score: number; misses: number }
  | { phase: "transition"; message: string; nextPieceIndex: number; score: number; misses: number }
  | { phase: "complete"; score: number };

export default function ScoreReadingPage() {
  const [hand, setHand] = useState<HandFilter>("right");
  const [startPieceSlug, setStartPieceSlug] = useState(ORDERED_PIECES[0].slug);
  const [session, setSession] = useState<SessionState>({ phase: "idle" });
  const [gameOverVisible, setGameOverVisible] = useState(false);
  const gameOverRef = useRef(false);
  const [sessionKey, setSessionKey] = useState(0);

  // Auto-advance from transition screen
  useEffect(() => {
    if (session.phase !== "transition") return;
    const timer = setTimeout(() => {
      setSession({
        phase: "playing",
        pieceIndex: session.nextPieceIndex,
        measureOffset: 0,
        score: session.score,
        misses: session.misses,
      });
    }, 2500);
    return () => clearTimeout(timer);
  }, [session]);

  const handleStart = useCallback(() => {
    gameOverRef.current = false;
    setGameOverVisible(false);
    setSessionKey((k) => k + 1);
    const startIdx = ORDERED_PIECES.findIndex((p) => p.slug === startPieceSlug);
    setSession({
      phase: "playing",
      pieceIndex: startIdx >= 0 ? startIdx : 0,
      measureOffset: 0,
      score: 0,
      misses: 0,
    });
  }, [startPieceSlug]);

  const handleSessionStart = useCallback(() => {
    gameOverRef.current = false;
    setGameOverVisible(false);
    setSessionKey((k) => k + 1);
    setSession((prev) =>
      prev.phase === "playing" ? { ...prev, score: 0, misses: 0 } : prev
    );
  }, []);

  // Real-time correct note increment
  const handleCorrect = useCallback((points: number) => {
    if (gameOverRef.current) return;
    setSession((prev) => {
      if (prev.phase !== "playing") return prev;
      return { ...prev, score: prev.score + points };
    });
  }, []);

  // Real-time miss increment — shows overlay at 10 misses
  const handleWrong = useCallback(() => {
    if (gameOverRef.current) return;
    setSession((prev) => {
      if (prev.phase !== "playing") return prev;
      const newMisses = prev.misses + 1;
      if (newMisses >= MAX_MISSES) {
        gameOverRef.current = true;
        setGameOverVisible(true);
        return { ...prev, misses: newMisses };
      }
      return { ...prev, misses: newMisses };
    });
  }, []);

  // Segment end: advance to next segment/piece (score already updated in real-time via handleCorrect)
  const handleResult = useCallback((_accuracy: number, _passed: boolean, _wrongCount: number) => {
    if (gameOverRef.current) return;
    setSession((prev) => {
      if (prev.phase !== "playing") return prev;

      const currentPiece = ORDERED_PIECES[prev.pieceIndex];
      const nextMeasure = prev.measureOffset + SEGMENT_SIZE;

      if (nextMeasure >= currentPiece.totalMeasures) {
        const nextIdx = prev.pieceIndex + 1;
        if (nextIdx >= ORDERED_PIECES.length) {
          return { phase: "complete", score: prev.score };
        }
        const nextPiece = ORDERED_PIECES[nextIdx];
        const levelUp = nextPiece.difficulty > currentPiece.difficulty;
        const message = levelUp
          ? `レベルアップ！ 次の曲: ${nextPiece.title}`
          : `次の曲: ${nextPiece.title}`;
        return { phase: "transition", message, nextPieceIndex: nextIdx, score: prev.score, misses: prev.misses };
      }

      return { ...prev, measureOffset: nextMeasure };
    });
  }, []);

  // ---- Transition (piece change) ----
  if (session.phase === "transition") {
    const isLevelUp = session.message.startsWith("レベルアップ");
    return (
      <main className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center px-4">
          {isLevelUp && (
            <div className="text-4xl font-black text-yellow-500 mb-3">⭐ レベルアップ！</div>
          )}
          <div className="text-xl font-bold text-gray-700 mb-1">
            {isLevelUp ? session.message.replace("レベルアップ！ ", "") : session.message}
          </div>
          <div className="text-sm text-gray-400 mt-3">まもなく始まります...</div>
        </div>
      </main>
    );
  }

  // ---- Complete ----
  if (session.phase === "complete") {
    return (
      <main className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center px-4">
          <div className="text-6xl font-black text-green-500 mb-4">コンプリート!</div>
          <div className="text-3xl font-bold text-gray-700 mb-1">スコア: {session.score}</div>
          <div className="text-sm text-gray-500 mb-8">全曲クリアおめでとうございます!</div>
          <button
            onClick={handleStart}
            className="px-8 py-3 rounded-xl bg-indigo-500 text-white font-bold hover:bg-indigo-600 shadow-md"
          >
            もう一度挑戦
          </button>
        </div>
      </main>
    );
  }

  // ---- Playing ----
  if (session.phase === "playing") {
    const { pieceIndex, measureOffset, score, misses } = session;
    const currentPiece = ORDERED_PIECES[pieceIndex];
    const endMeasure = Math.min(measureOffset + SEGMENT_SIZE, currentPiece.totalMeasures);

    return (
      <main className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-blue-50">
        <div className="max-w-3xl mx-auto px-4 py-8">
          <PracticeScreen
            key={`${sessionKey}-${pieceIndex}-${measureOffset}`}
            piece={currentPiece}
            startMeasure={measureOffset}
            endMeasure={endMeasure}
            handFilter={hand}
            alwaysAdvance={true}
            paused={gameOverVisible}
            hudScore={score}
            hudMisses={misses}
            maxMisses={MAX_MISSES}
            onWrong={handleWrong}
            onCorrect={handleCorrect}
            onStart={handleSessionStart}
            onResult={gameOverVisible ? undefined : handleResult}
            onBack={() => {
              gameOverRef.current = false;
              setGameOverVisible(false);
              setSession({ phase: "idle" });
            }}
          />
        </div>

        {/* Game over overlay */}
        {gameOverVisible && (
          <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl p-8 w-full max-w-sm mx-4 text-center">
              <div className="text-2xl font-bold text-gray-700 mb-1">スコア: {score}</div>
              <div className="text-sm text-gray-500 mb-8">10回ミスに達しました</div>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => {
                    gameOverRef.current = false;
                    setGameOverVisible(false);
                    setSession({ phase: "idle" });
                  }}
                  className="px-6 py-3 rounded-xl bg-white border border-gray-200 text-gray-600 font-bold hover:bg-gray-50"
                >
                  やめる
                </button>
                <button
                  onClick={() => {
                    gameOverRef.current = false;
                    setGameOverVisible(false);
                    setSessionKey((k) => k + 1);
                    const startIdx = ORDERED_PIECES.findIndex((p) => p.slug === startPieceSlug);
                    setSession({
                      phase: "playing",
                      pieceIndex: startIdx >= 0 ? startIdx : 0,
                      measureOffset: 0,
                      score: 0,
                      misses: 0,
                    });
                  }}
                  className="px-6 py-3 rounded-xl bg-indigo-500 text-white font-bold hover:bg-indigo-600"
                >
                  もう一度挑戦
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    );
  }

  // ---- Idle ----
  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-blue-50">
      <div className="max-w-2xl mx-auto px-4 py-10">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Link href="/" className="p-2 rounded-lg hover:bg-white text-gray-500">←</Link>
          <div>
            <h1 className="text-2xl font-black text-gray-800">譜読み練習</h1>
            <p className="text-sm text-gray-500">曲と手を選んでスタート</p>
          </div>
        </div>

        {/* Start button */}
        <button
          onClick={handleStart}
          className="w-full py-4 rounded-2xl bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-700
            text-white font-black text-lg shadow-md transition-all mb-8"
        >
          ▶ 練習スタート
        </button>

        {/* Hand selector */}
        <section className="mb-6">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">手の選択</h2>
          <div className="flex gap-2">
            {(["right", "left", "both"] as HandFilter[]).map((h) => (
              <button
                key={h}
                onClick={() => setHand(h)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all
                  ${hand === h
                    ? "bg-white ring-2 ring-indigo-500 ring-offset-1 text-indigo-700 shadow-md"
                    : "bg-white/60 border border-gray-200 text-gray-500 hover:bg-white hover:shadow-sm"
                  }`}
              >
                {h === "right" ? "右手" : h === "left" ? "左手" : "両手"}
              </button>
            ))}
          </div>
        </section>

        {/* Piece selector */}
        <section className="mb-8">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">開始曲</h2>
          <div className="grid gap-2">
            {ORDERED_PIECES.map((piece) => {
              const isSelected = piece.slug === startPieceSlug;
              return (
                <button
                  key={piece.slug}
                  onClick={() => setStartPieceSlug(piece.slug)}
                  className={`w-full text-left rounded-xl p-4 transition-all
                    ${isSelected
                      ? "bg-white ring-2 ring-indigo-500 ring-offset-1 shadow-md"
                      : "bg-white/60 border border-gray-100 hover:bg-white hover:shadow-sm"
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-base flex-shrink-0
                      ${isSelected ? "bg-indigo-100" : "bg-gray-100"}`}>
                      🎵
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`font-bold truncate ${isSelected ? "text-indigo-800" : "text-gray-800"}`}>
                        {piece.title}
                      </div>
                      <div className="text-xs text-gray-500">{piece.composer}</div>
                    </div>
                    <div className="flex-shrink-0 flex flex-col items-end gap-0.5">
                      <div className={`text-xs font-bold px-2 py-0.5 rounded-full
                        ${isSelected ? "bg-indigo-100 text-indigo-600" : "bg-gray-100 text-gray-500"}`}>
                        Lv.{piece.difficulty}
                      </div>
                      <div className="text-[11px] text-gray-400">BPM {piece.bpm}</div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

      </div>
    </main>
  );
}
