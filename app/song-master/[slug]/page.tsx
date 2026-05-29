"use client";

import { use, useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { getPieceBySlug } from "@/lib/pieces";
import PracticeScreen, { type HandFilter } from "@/components/PracticeScreen";
import PrintScoreModal from "@/components/PrintScoreModal";
import { useProgressStore } from "@/store/progressStore";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default function SongMasterPiecePage({ params }: PageProps) {
  const { slug } = use(params);
  const piece = getPieceBySlug(slug);
  const { songMaster, initPieceProgress, setSegmentSize, updateSegment } = useProgressStore();
  const [practicing, setPracticing] = useState(false);
  const [showPrint, setShowPrint] = useState(false);
  const [handMode, setHandMode] = useState<HandFilter>("right");

  useEffect(() => {
    useProgressStore.persist.rehydrate();
  }, []);

  useEffect(() => {
    if (piece) initPieceProgress(slug, piece.totalMeasures);
  }, [slug, piece, initPieceProgress]);

  const progress = songMaster[slug];

  const handleResult = useCallback(
    (accuracy: number, passed: boolean) => {
      if (!progress) return;
      if (passed) {
        if (handMode === "right") {
          setHandMode("left");
        } else if (handMode === "left") {
          setHandMode("both");
        } else {
          updateSegment(slug, progress.unlockedSegmentIndex, accuracy);
          setHandMode("right");
        }
      }
      setPracticing(false);
    },
    [slug, progress, handMode, updateSegment]
  );

  if (!piece) {
    return (
      <div className="stage" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", color: "var(--muted)" }}>
          <p>曲が見つかりません</p>
          <Link href="/song-master" style={{ color: "var(--lavender-700)", textDecoration: "underline", marginTop: 8, display: "block" }}>
            一覧に戻る
          </Link>
        </div>
      </div>
    );
  }

  if (!progress) {
    return (
      <div className="stage" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{
          width: 32, height: 32, borderRadius: "50%",
          border: "3px solid var(--lavender-100)",
          borderTopColor: "var(--lavender-500)",
          animation: "spin 0.8s linear infinite",
        }} />
      </div>
    );
  }

  const currentSegment = progress.segments[progress.unlockedSegmentIndex];
  const segmentSize = progress.segmentSize ?? 4;
  const passedCount = progress.segments.filter((s) => s.passed).length;
  const allPassed = progress.segments.every((s) => s.passed);

  const handleSegmentSizeChange = (size: 2 | 4 | 8 | 16) => {
    setSegmentSize(slug, piece.totalMeasures, size);
    setHandMode("right");
  };

  const handLabel: Record<HandFilter, string> = { right: "右手", left: "左手", both: "両手" };

  if (practicing && currentSegment) {
    return (
      <PracticeScreen
        piece={piece}
        startMeasure={currentSegment.startMeasure}
        endMeasure={currentSegment.endMeasure}
        handFilter={handMode}
        rangeLabel={`${segmentSize}小節 ・ ${handLabel[handMode]}`}
        onResult={handleResult}
        onBack={() => setPracticing(false)}
      />
    );
  }

  return (
    <div className="stage">
      <div className="fade-in" style={{ position: "relative", maxWidth: 880, margin: "0 auto", padding: "40px 40px 160px", zIndex: 2 }}>

        {/* Back button */}
        <Link href="/song-master" style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          background: "#fff", border: "1px solid rgba(140,120,200,0.12)",
          color: "var(--lavender-700)", fontWeight: 700, borderRadius: 999,
          padding: "10px 18px", fontSize: 14, textDecoration: "none",
          boxShadow: "var(--card-shadow)", transition: "background .15s ease",
        }}>
          ← もどる
        </Link>

        {/* Heading */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "24px 0 20px" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: "clamp(22px,3vw,32px)", fontWeight: 900, letterSpacing: "0.02em", color: "var(--ink)" }}>
              {piece.title}
            </h1>
            <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: 14, fontWeight: 600 }}>{piece.composer}</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              onClick={() => setShowPrint(true)}
              title="楽譜を印刷"
              style={{
                width: 40, height: 40, borderRadius: "50%", border: "1px solid rgba(140,120,200,0.12)",
                background: "rgba(255,255,255,0.85)", display: "grid", placeItems: "center",
                cursor: "pointer", fontSize: 18, boxShadow: "var(--card-shadow)",
              }}
            >
              🖨
            </button>
            <span style={{
              padding: "8px 16px", borderRadius: 999,
              background: "var(--lavender-50)", color: "var(--lavender-700)",
              border: "1px solid var(--lavender-100)",
              fontWeight: 800, fontSize: 13,
            }}>
              {segmentSize}小節 フェーズ
            </span>
          </div>
        </div>

        {/* Overall progress bar */}
        <div style={{
          background: "rgba(255,255,255,0.92)", borderRadius: 18,
          padding: "18px 22px", marginBottom: 20,
          boxShadow: "var(--card-shadow)", border: "1px solid rgba(140,120,200,0.06)",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: "var(--ink-soft)" }}>全体の進捗</span>
            <span style={{ fontSize: 14, color: "var(--muted)", fontVariantNumeric: "tabular-nums" }}>
              {passedCount}/{progress.segments.length} クリア
            </span>
          </div>
          <div style={{ height: 10, background: "var(--lavender-50)", borderRadius: 999, overflow: "hidden" }}>
            <div style={{
              height: "100%",
              background: "linear-gradient(90deg,var(--lavender-500),var(--pink))",
              borderRadius: 999, width: `${(passedCount / progress.segments.length) * 100}%`,
              transition: "width .3s ease",
            }} />
          </div>
        </div>

        {/* Segment size selector */}
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "var(--muted)", margin: "0 0 10px 2px" }}>1回の練習範囲</p>
          <div role="tablist" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
            {([2, 4, 8, 16] as const).map((n) => (
              <button
                key={n}
                role="tab"
                aria-selected={segmentSize === n}
                onClick={() => handleSegmentSizeChange(n)}
                style={{
                  border: segmentSize === n ? "1.5px solid var(--lavender-500)" : "1.5px solid rgba(140,120,200,0.14)",
                  background: segmentSize === n ? "#fff" : "rgba(255,255,255,0.85)",
                  color: segmentSize === n ? "var(--lavender-700)" : "var(--ink-soft)",
                  fontWeight: 800, fontSize: 14, padding: "14px 8px", borderRadius: 14, cursor: "pointer",
                  transition: "all .15s ease",
                  boxShadow: segmentSize === n ? "0 2px 10px rgba(106,87,194,0.14)" : "none",
                }}
              >
                {n}小節
              </button>
            ))}
          </div>
        </div>

        {/* Hand mode progress */}
        {currentSegment && !currentSegment.passed && (
          <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
            {(["right", "left", "both"] as HandFilter[]).map((mode) => {
              const done = mode === "right" ? handMode === "left" || handMode === "both"
                : mode === "left" ? handMode === "both" : false;
              const active = mode === handMode;
              return (
                <div key={mode} style={{
                  flex: 1, padding: "10px 8px", borderRadius: 14, textAlign: "center",
                  fontSize: 14, fontWeight: 800,
                  background: active ? "var(--lavender-500)" : done ? "rgba(93,199,133,0.15)" : "rgba(255,255,255,0.6)",
                  color: active ? "#fff" : done ? "var(--green)" : "var(--muted)",
                  border: active ? "none" : done ? "1px solid rgba(93,199,133,0.3)" : "1px solid rgba(140,120,200,0.12)",
                }}>
                  {done ? "✓ " : ""}{handLabel[mode]}
                </div>
              );
            })}
          </div>
        )}

        {/* Segment map */}
        <div style={{ display: "grid", gap: 10, marginBottom: 24 }}>
          {progress.segments.map((seg, i) => {
            const isUnlocked = i <= progress.unlockedSegmentIndex;
            const isCurrent = i === progress.unlockedSegmentIndex;
            return (
              <div
                key={i}
                style={{
                  borderRadius: 16, padding: "14px 18px",
                  border: seg.passed ? "1px solid rgba(93,199,133,0.3)"
                    : isCurrent ? "1.5px solid var(--lavender-500)"
                    : "1px solid rgba(140,120,200,0.08)",
                  background: seg.passed ? "rgba(93,199,133,0.08)"
                    : isCurrent ? "var(--lavender-50)"
                    : !isUnlocked ? "rgba(255,255,255,0.4)"
                    : "rgba(255,255,255,0.85)",
                  opacity: !isUnlocked ? 0.5 : 1,
                  boxShadow: isCurrent ? "0 2px 10px rgba(106,87,194,0.10)" : "none",
                  transition: "all .15s ease",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                    display: "grid", placeItems: "center", fontSize: 14, fontWeight: 800,
                    background: seg.passed ? "var(--green)" : isCurrent ? "var(--lavender-500)" : "rgba(140,120,200,0.12)",
                    color: seg.passed || isCurrent ? "#fff" : "var(--muted)",
                  }}>
                    {seg.passed ? "✓" : !isUnlocked ? "🔒" : i + 1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>
                      第{seg.startMeasure + 1}〜{seg.endMeasure}小節
                    </div>
                    {seg.attempts > 0 && (
                      <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                        最高 {Math.round(seg.bestAccuracy)}% ・ {seg.attempts}回挑戦
                      </div>
                    )}
                  </div>
                  {isCurrent && !seg.passed && (
                    <span style={{
                      fontSize: 12, padding: "4px 10px", borderRadius: 999,
                      background: "var(--lavender-100)", color: "var(--lavender-700)", fontWeight: 700,
                    }}>
                      現在地
                    </span>
                  )}
                  {seg.passed && (
                    <span style={{ fontSize: 12, color: "var(--green)", fontWeight: 700 }}>クリア!</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Start button */}
        {currentSegment && !allPassed && (
          <button
            onClick={() => setPracticing(true)}
            style={{
              width: "100%", border: "none", borderRadius: 18,
              background: "linear-gradient(160deg,#8B7DD8,#6A57C2)",
              color: "#fff", fontSize: 18, fontWeight: 800, letterSpacing: "0.02em",
              padding: "20px 24px", cursor: "pointer",
              boxShadow: "0 10px 26px rgba(106,87,194,0.32)",
              transition: "transform .15s ease, filter .15s ease",
            }}
          >
            {handLabel[handMode]}で練習する（第{currentSegment.startMeasure + 1}〜{currentSegment.endMeasure}小節）
          </button>
        )}

        {allPassed && (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <div style={{ fontSize: 56, marginBottom: 12 }}>🏆</div>
            <p style={{ fontSize: 22, fontWeight: 900, color: "var(--ink)", margin: "0 0 6px" }}>マスター達成!</p>
            <p style={{ fontSize: 14, color: "var(--muted)", margin: 0 }}>すべての小節をクリアしました</p>
          </div>
        )}
      </div>

      {showPrint && piece && (
        <PrintScoreModal piece={piece} onClose={() => setShowPrint(false)} />
      )}
    </div>
  );
}
