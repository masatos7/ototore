import Link from "next/link";
import Image from "next/image";
import { PIECES } from "@/lib/pieces";

export default function Home() {
  const scoreProgress = 0;

  return (
    <div className="stage">
      <div className="fade-in" style={{ position: "relative", maxWidth: 880, margin: "0 auto", padding: "64px 40px 160px", zIndex: 2 }}>

        {/* Hero */}
        <header style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "center", marginBottom: 48 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", paddingTop: 8 }}>
            <Image
              src="/images/top-logo.png"
              alt="音トレピアノ"
              width={380}
              height={190}
              priority
              style={{ width: "100%", maxWidth: 380, height: "auto", objectFit: "contain", animation: "gentle-rise 4s ease-in-out infinite" }}
            />
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Image
              src="/images/top-img.png"
              alt="ピアノを弾く女の子"
              width={460}
              height={460}
              priority
              style={{ width: "100%", maxWidth: 460, height: "auto", objectFit: "contain" }}
            />
          </div>
        </header>

        {/* Cards */}
        <section style={{ display: "grid", gap: 18 }} aria-label="メニュー">

          {/* 譜読み練習 */}
          <Link href="/score-reading" style={{ textDecoration: "none" }}>
            <article style={{
              position: "relative",
              background: "rgba(255,255,255,0.92)",
              backdropFilter: "blur(2px)",
              borderRadius: "var(--r-card)",
              padding: "22px 24px",
              boxShadow: "var(--card-shadow)",
              cursor: "pointer",
              border: "1px solid rgba(140,120,200,0.06)",
              transition: "transform .25s ease, box-shadow .25s ease",
              display: "grid",
              gridTemplateColumns: "auto 1fr auto",
              gap: 18,
              alignItems: "start",
            }}
            className="card-hover"
            >
              <div style={{
                width: 64, height: 64, borderRadius: "var(--r-icon)",
                background: "linear-gradient(160deg,#EFE9FB,#DCD0F4)",
                display: "grid", placeItems: "center", flexShrink: 0, fontSize: 32,
              }}>
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                  <path d="M12 6v15.5a3.5 3.5 0 1 1-2-3.16V8.5L22 6v13.5a3.5 3.5 0 1 1-2-3.16V8.7L12 10.3" stroke="#6A57C2" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div style={{ minWidth: 0 }}>
                <h2 style={{ margin: "4px 0 6px", fontSize: 22, fontWeight: 800, letterSpacing: "0.02em", color: "var(--ink)" }}>
                  譜読み練習
                </h2>
                <p style={{ margin: 0, color: "var(--ink-soft)", fontSize: 15, lineHeight: 1.6 }}>
                  難易度1〜20の中からチャレンジ。苦手なパターンを集中練習。
                </p>
                {/* Progress dashes */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(20,1fr)", gap: 6, marginTop: 16 }} aria-hidden="true">
                  {Array.from({ length: 20 }, (_, i) => (
                    <span key={i} style={{ height: 4, borderRadius: 999, background: i < scoreProgress ? "var(--lavender-500)" : "var(--lavender-100)" }} />
                  ))}
                </div>
                <div style={{ marginTop: 14, color: "var(--muted)", fontSize: 13 }}>
                  20 難易度レベル ・ {PIECES.length} 曲収録
                </div>
              </div>
              <span style={{ alignSelf: "center", color: "#C8C2DC", fontSize: 22, transition: "transform .25s ease, color .25s ease" }} aria-hidden="true">›</span>
            </article>
          </Link>

          {/* 曲マスター */}
          <Link href="/song-master" style={{ textDecoration: "none" }}>
            <article style={{
              position: "relative",
              background: "rgba(255,255,255,0.92)",
              backdropFilter: "blur(2px)",
              borderRadius: "var(--r-card)",
              padding: "22px 24px",
              boxShadow: "var(--card-shadow)",
              cursor: "pointer",
              border: "1px solid rgba(140,120,200,0.06)",
              transition: "transform .25s ease, box-shadow .25s ease",
              display: "grid",
              gridTemplateColumns: "auto 1fr auto",
              gap: 18,
              alignItems: "start",
            }}>
              <div style={{
                width: 64, height: 64, borderRadius: "var(--r-icon)",
                background: "linear-gradient(160deg,#EFE9FB,#DCD0F4)",
                display: "grid", placeItems: "center", flexShrink: 0,
              }}>
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                  <path d="M9 5h14v6a7 7 0 0 1-14 0V5Z" fill="#F2C535" stroke="#B8902A" strokeWidth="1.6" strokeLinejoin="round" />
                  <path d="M9 7H5v2a3 3 0 0 0 3 3M23 7h4v2a3 3 0 0 1-3 3" stroke="#B8902A" strokeWidth="1.6" fill="none" strokeLinecap="round" />
                  <path d="M13 19h6v3h2v3H11v-3h2v-3Z" fill="#F2C535" stroke="#B8902A" strokeWidth="1.6" strokeLinejoin="round" />
                </svg>
              </div>
              <div style={{ minWidth: 0 }}>
                <h2 style={{ margin: "4px 0 6px", fontSize: 22, fontWeight: 800, letterSpacing: "0.02em", color: "var(--ink)" }}>
                  曲マスター
                </h2>
                <p style={{ margin: 0, color: "var(--ink-soft)", fontSize: 15, lineHeight: 1.6 }}>
                  2小節ずつ正確に弾いて、少しずつ曲全体をマスターしよう。
                </p>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 12 }}>
                  {["2小節", "4小節", "8小節", "全曲"].map((label) => (
                    <span key={label} style={{
                      display: "inline-flex", alignItems: "center",
                      padding: "6px 12px", borderRadius: 999,
                      background: "var(--lavender-50)", color: "var(--lavender-700)",
                      fontSize: 13, fontWeight: 700, border: "1px solid var(--lavender-100)",
                    }}>
                      {label}
                    </span>
                  ))}
                  <span style={{ fontSize: 13, color: "var(--muted)", fontWeight: 600 }}>→ ステップアップ</span>
                </div>
                <div style={{ marginTop: 14, color: "var(--muted)", fontSize: 13 }}>
                  {PIECES.length} 曲収録 ・ 進捗が保存されます
                </div>
              </div>
              <span style={{ alignSelf: "center", color: "#C8C2DC", fontSize: 22 }} aria-hidden="true">›</span>
            </article>
          </Link>
        </section>

        <p style={{ textAlign: "center", marginTop: 40, color: "var(--muted)", fontSize: 13.5, lineHeight: 1.9 }}>
          著作権フリーのクラシック名曲を収録<br />
          マイクへのアクセスが必要です
        </p>
      </div>
    </div>
  );
}
