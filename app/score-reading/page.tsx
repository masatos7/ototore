"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { PIECES } from "@/lib/pieces";
import PracticeScreen, { type HandFilter } from "@/components/PracticeScreen";

const ORDERED_PIECES = [...PIECES].sort((a, b) => a.difficulty - b.difficulty);

type SessionState =
  | { phase: "idle" }
  | { phase: "playing"; pieceIndex: number; score: number }
  | { phase: "transition"; message: string; nextPieceIndex: number; score: number }
  | { phase: "complete"; score: number };

export default function ScoreReadingPage() {
  const [hand, setHand] = useState<HandFilter>("right");
  const [startPieceSlug, setStartPieceSlug] = useState(ORDERED_PIECES[0].slug);
  const [session, setSession] = useState<SessionState>({ phase: "idle" });
  const [sessionKey, setSessionKey] = useState(0);

  useEffect(() => {
    if (session.phase !== "transition") return;
    const timer = setTimeout(() => {
      setSession({ phase: "playing", pieceIndex: session.nextPieceIndex, score: session.score });
    }, 2500);
    return () => clearTimeout(timer);
  }, [session]);

  const handleStart = useCallback(() => {
    setSessionKey((k) => k + 1);
    const startIdx = ORDERED_PIECES.findIndex((p) => p.slug === startPieceSlug);
    setSession({ phase: "playing", pieceIndex: startIdx >= 0 ? startIdx : 0, score: 0 });
  }, [startPieceSlug]);

  const handleCorrect = useCallback((points: number) => {
    setSession((prev) => {
      if (prev.phase !== "playing") return prev;
      return { ...prev, score: prev.score + points };
    });
  }, []);

  const handleResult = useCallback((_accuracy: number, _passed: boolean, _wrongCount: number) => {
    setSession((prev) => {
      if (prev.phase !== "playing") return prev;
      const currentPiece = ORDERED_PIECES[prev.pieceIndex];
      const nextIdx = prev.pieceIndex + 1;
      if (nextIdx >= ORDERED_PIECES.length) return { phase: "complete", score: prev.score };
      const nextPiece = ORDERED_PIECES[nextIdx];
      const levelUp = nextPiece.difficulty > currentPiece.difficulty;
      const message = levelUp
        ? `レベルアップ！ 次の曲: ${nextPiece.title}`
        : `次の曲: ${nextPiece.title}`;
      return { phase: "transition", message, nextPieceIndex: nextIdx, score: prev.score };
    });
  }, []);

  // ---- Transition ----
  if (session.phase === "transition") {
    const isLevelUp = session.message.startsWith("レベルアップ");
    return (
      <div className="stage" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", padding: "0 16px" }}>
          {isLevelUp && <div style={{ fontSize: 36, fontWeight: 900, color: "#F2C535", marginBottom: 12 }}>⭐ レベルアップ！</div>}
          <div style={{ fontSize: 20, fontWeight: 700, color: "var(--ink-soft)", marginBottom: 4 }}>
            {isLevelUp ? session.message.replace("レベルアップ！ ", "") : session.message}
          </div>
          <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 12 }}>まもなく始まります...</div>
        </div>
      </div>
    );
  }

  // ---- Complete ----
  if (session.phase === "complete") {
    return (
      <div className="stage" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", padding: "0 16px" }}>
          <div style={{ fontSize: 56, fontWeight: 900, color: "var(--green)", marginBottom: 16 }}>コンプリート!</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "var(--ink)", marginBottom: 4 }}>スコア: {session.score}</div>
          <div style={{ fontSize: 14, color: "var(--muted)", marginBottom: 32 }}>全曲クリアおめでとうございます!</div>
          <button
            onClick={handleStart}
            style={{
              padding: "16px 40px", borderRadius: 18, border: "none",
              background: "linear-gradient(160deg,#8B7DD8,#6A57C2)",
              color: "#fff", fontSize: 17, fontWeight: 800, cursor: "pointer",
              boxShadow: "0 8px 22px rgba(106,87,194,0.35)",
            }}
          >
            もう一度挑戦
          </button>
        </div>
      </div>
    );
  }

  // ---- Playing ----
  if (session.phase === "playing") {
    const { pieceIndex } = session;
    const currentPiece = ORDERED_PIECES[pieceIndex];
    const handLabel = { right: "右手", left: "左手", both: "両手" }[hand];
    return (
      <PracticeScreen
        key={`${sessionKey}-${pieceIndex}`}
        piece={currentPiece}
        startMeasure={0}
        endMeasure={currentPiece.totalMeasures}
        handFilter={hand}
        hudScore={session.score}
        rangeLabel={`Lv.${currentPiece.difficulty} ・ ${handLabel}`}
        songMasterPath={`/song-master/${currentPiece.slug}`}
        alwaysAdvance
        onCorrect={handleCorrect}
        onResult={handleResult}
        onBack={() => setSession({ phase: "idle" })}
      />
    );
  }

  // ---- Idle ----
  const handLabel = { right: "右手", left: "左手", both: "両手" }[hand];
  const selectedPiece = ORDERED_PIECES.find((p) => p.slug === startPieceSlug) ?? ORDERED_PIECES[0];

  return (
    <div className="stage">
      <div className="fade-in" style={{ position: "relative", maxWidth: 880, margin: "0 auto", padding: "40px 40px 160px", zIndex: 2 }}>

        {/* Header */}
        <header style={{ display: "grid", gridTemplateColumns: "auto 1fr", alignItems: "center", gap: 16, marginBottom: 26 }}>
          <Link href="/" aria-label="もどる" style={{
            width: 44, height: 44, borderRadius: "50%", border: "none",
            background: "rgba(255,255,255,0.7)", display: "grid", placeItems: "center",
            cursor: "pointer", textDecoration: "none", boxShadow: "0 2px 8px rgba(80,70,130,0.08)",
            transition: "background .15s ease",
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M15 6l-6 6 6 6" stroke="#4A4A65" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <div>
            <h1 style={{ margin: 0, fontSize: "clamp(28px,4vw,38px)", fontWeight: 900, letterSpacing: "0.02em", color: "var(--ink)" }}>
              譜読み練習
            </h1>
            <p style={{ margin: "2px 0 0", color: "var(--muted)", fontSize: 14, fontWeight: 600 }}>
              曲と手を選んでスタート
            </p>
          </div>
        </header>

        {/* Start CTA */}
        <button
          onClick={handleStart}
          style={{
            width: "100%", border: "none", borderRadius: 18,
            background: "linear-gradient(160deg,#8B7DD8,#6A57C2)",
            color: "#fff", fontSize: 19, fontWeight: 800, letterSpacing: "0.02em",
            padding: 20, cursor: "pointer",
            boxShadow: "0 10px 26px rgba(106,87,194,0.32)",
            transition: "transform .15s ease, filter .15s ease",
            marginBottom: 28,
          }}
        >
          ▶ 練習スタート
        </button>

        {/* Hand picker */}
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--muted)", margin: "0 0 10px 2px" }}>手の選択</div>
        <div role="tablist" aria-label="手の選択" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 28 }}>
          {([
            { id: "right" as HandFilter, label: "右手" },
            { id: "left"  as HandFilter, label: "左手" },
            { id: "both"  as HandFilter, label: "両手" },
          ]).map((h) => (
            <button
              key={h.id}
              role="tab"
              aria-selected={hand === h.id}
              onClick={() => setHand(h.id)}
              style={{
                border: hand === h.id ? "1.5px solid var(--lavender-500)" : "1.5px solid rgba(140,120,200,0.14)",
                background: hand === h.id ? "#fff" : "rgba(255,255,255,0.85)",
                color: hand === h.id ? "var(--lavender-700)" : "var(--ink-soft)",
                fontWeight: 800, fontSize: 15, padding: 16, borderRadius: 14, cursor: "pointer",
                transition: "all .15s ease",
                boxShadow: hand === h.id ? "0 2px 10px rgba(106,87,194,0.14)" : "none",
              }}
            >
              {h.label}
            </button>
          ))}
        </div>

        {/* Song list */}
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--muted)", margin: "0 0 10px 2px" }}>開始曲</div>
        <div style={{ display: "grid", gap: 12 }}>
          {ORDERED_PIECES.map((piece) => {
            const active = piece.slug === startPieceSlug;
            return (
              <button
                key={piece.slug}
                onClick={() => setStartPieceSlug(piece.slug)}
                onDoubleClick={() => { setStartPieceSlug(piece.slug); handleStart(); }}
                style={{
                  display: "grid", gridTemplateColumns: "auto 1fr auto", alignItems: "center",
                  gap: 16, width: "100%", textAlign: "left",
                  background: "rgba(255,255,255,0.92)",
                  border: active ? "1.5px solid var(--lavender-500)" : "1.5px solid transparent",
                  borderRadius: 16, padding: "16px 22px", cursor: "pointer",
                  boxShadow: active ? "0 4px 14px rgba(106,87,194,0.18)" : "0 2px 4px rgba(80,70,130,0.04),0 10px 24px rgba(80,70,130,0.05)",
                  transition: "transform .15s ease, border-color .15s ease, box-shadow .15s ease",
                }}
              >
                <span style={{
                  width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                  background: active ? "var(--lavender-100)" : "var(--lavender-50)",
                  color: active ? "var(--lavender-700)" : "#9890b0",
                  display: "grid", placeItems: "center",
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M9 6v9.5a3 3 0 1 1-1.6-2.65V7.2L18 5v8.5a3 3 0 1 1-1.6-2.65V6.4L9 7.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <span style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
                  <strong style={{ fontSize: 16.5, fontWeight: 800, color: active ? "var(--lavender-700)" : "var(--ink)" }}>
                    {piece.title}
                  </strong>
                  <em style={{ fontStyle: "normal", fontSize: 13, color: "var(--muted)", fontWeight: 600 }}>
                    {piece.composer}
                  </em>
                </span>
                <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
                  <span style={{
                    background: active ? "var(--lavender-100)" : "var(--lavender-50)",
                    color: "var(--lavender-700)", fontWeight: 800, fontSize: 12,
                    padding: "3px 10px", borderRadius: 999,
                  }}>
                    Lv.{piece.difficulty}
                  </span>
                  <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 700 }}>
                    BPM {piece.bpm}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        {/* Start hint */}
        <p style={{ textAlign: "center", marginTop: 16, color: "var(--muted)", fontSize: 12 }}>
          ダブルクリックで即スタート ・ 選択中: {selectedPiece.title}（{handLabel}）
        </p>
      </div>
    </div>
  );
}
