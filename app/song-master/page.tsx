"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PIECES } from "@/lib/pieces";
import { useProgressStore } from "@/store/progressStore";
import { useMounted } from "@/hooks/useMounted";

export default function SongMasterPage() {
  const mounted = useMounted();
  const { songMaster, initPieceProgress } = useProgressStore();
  const [step, setStep] = useState<"2" | "4" | "8" | "全">("2");

  useEffect(() => {
    useProgressStore.persist.rehydrate();
  }, []);

  const handlePieceClick = (slug: string, totalMeasures: number) => {
    initPieceProgress(slug, totalMeasures);
  };

  const sortedPieces = [...PIECES].sort((a, b) => a.difficulty - b.difficulty);

  return (
    <div className="stage">
      <div className="fade-in" style={{ position: "relative", maxWidth: 880, margin: "0 auto", padding: "40px 40px 160px", zIndex: 2 }}>

        {/* Back button */}
        <Link href="/" style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          background: "#fff", border: "1px solid rgba(140,120,200,0.12)",
          color: "var(--lavender-700)", fontWeight: 700, borderRadius: 999,
          padding: "10px 18px", cursor: "pointer", fontSize: 14,
          boxShadow: "var(--card-shadow)", textDecoration: "none",
          transition: "background .15s ease",
        }}>
          ← もどる
        </Link>

        {/* Heading */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "24px 0 24px" }}>
          <h1 style={{
            fontSize: "clamp(28px,4vw,40px)", margin: 0, fontWeight: 900, letterSpacing: "0.02em",
            display: "flex", alignItems: "center", gap: 14,
          }}>
            <span style={{
              width: 52, height: 52, borderRadius: 14, flexShrink: 0,
              background: "linear-gradient(160deg,#EFE9FB,#DCD0F4)",
              display: "grid", placeItems: "center", fontSize: 26,
            }} aria-hidden="true">
              <svg width="26" height="26" viewBox="0 0 32 32" fill="none">
                <path d="M9 5h14v6a7 7 0 0 1-14 0V5Z" fill="#F2C535" stroke="#B8902A" strokeWidth="1.6" strokeLinejoin="round" />
                <path d="M9 7H5v2a3 3 0 0 0 3 3M23 7h4v2a3 3 0 0 1-3 3" stroke="#B8902A" strokeWidth="1.6" fill="none" strokeLinecap="round" />
                <path d="M13 19h6v3h2v3H11v-3h2v-3Z" fill="#F2C535" stroke="#B8902A" strokeWidth="1.6" strokeLinejoin="round" />
              </svg>
            </span>
            曲マスター
          </h1>
        </div>

        {/* Step bar */}
        <div role="tablist" aria-label="練習する範囲" style={{
          display: "flex", gap: 10, marginBottom: 24,
          background: "#fff", padding: 8, borderRadius: 999,
          border: "1px solid rgba(140,120,200,0.10)",
          boxShadow: "var(--card-shadow)", width: "max-content",
        }}>
          {(["2", "4", "8", "全"] as const).map((v) => (
            <button
              key={v}
              role="tab"
              aria-selected={step === v}
              onClick={() => setStep(v)}
              style={{
                border: "none",
                background: step === v ? "var(--lavender-500)" : "transparent",
                color: step === v ? "#fff" : "var(--muted)",
                fontWeight: 800, fontSize: 14,
                padding: "10px 18px", borderRadius: 999, cursor: "pointer",
                transition: "all .15s ease",
              }}
            >
              {v === "全" ? "全曲" : `${v}小節`}
            </button>
          ))}
        </div>

        {/* Song list */}
        <div style={{ display: "grid", gap: 12 }}>
          {sortedPieces.map((piece, idx) => {
            const progress = mounted ? songMaster[piece.slug] : undefined;
            const passedCount = progress?.segments.filter((s) => s.passed).length ?? 0;
            const totalSegments = progress?.segments.length ?? 0;
            const completionRate = totalSegments > 0 ? passedCount / totalSegments : 0;
            const pct = Math.round(completionRate * 100);

            return (
              <Link
                key={piece.slug}
                href={`/song-master/${piece.slug}`}
                onClick={() => handlePieceClick(piece.slug, piece.totalMeasures)}
                style={{ textDecoration: "none" }}
              >
                <div style={{
                  display: "grid", gridTemplateColumns: "56px 1fr auto",
                  gap: 16, alignItems: "center",
                  background: "#fff", padding: "18px 22px",
                  borderRadius: 18, border: "1px solid rgba(140,120,200,0.08)",
                  boxShadow: "var(--card-shadow)", cursor: "pointer",
                  transition: "transform .2s ease, box-shadow .2s ease",
                }}>
                  <div style={{
                    width: 40, height: 40, display: "grid", placeItems: "center",
                    background: "var(--lavender-50)", color: "var(--lavender-700)",
                    borderRadius: 12, fontWeight: 900, fontSize: 15,
                  }}>
                    {String(idx + 1).padStart(2, "0")}
                  </div>
                  <div>
                    <h3 style={{ margin: "0 0 4px", fontSize: 17, fontWeight: 800, color: "var(--ink)" }}>
                      {piece.title}
                    </h3>
                    <p style={{ margin: 0, color: "var(--muted)", fontSize: 13 }}>
                      {piece.composer}
                    </p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, width: 200 }}>
                    <div style={{ flex: 1, height: 8, background: "var(--lavender-50)", borderRadius: 999, overflow: "hidden" }}>
                      <div style={{
                        display: "block", height: "100%",
                        background: "linear-gradient(90deg,var(--lavender-500),var(--pink))",
                        borderRadius: 999, width: `${pct}%`,
                        transition: "width .3s ease",
                      }} />
                    </div>
                    <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 700, minWidth: 36, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                      {pct}%
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
