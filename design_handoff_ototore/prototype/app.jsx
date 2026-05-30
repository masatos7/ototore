/* global React, ReactDOM, PracticeScreen */
const { useState } = React;

/* =====================================================
   Brandmark — uses the provided logo asset
   ===================================================== */
function Brandmark() {
  return (
    <div className="brandmark">
      <img
        src="images/top-logo.png"
        alt="音トレピアノ"
        className="brandmark-logo"
      />
    </div>
  );
}

/* =====================================================
   Home screen — two main option cards
   ===================================================== */
function Home({ go, scoreProgress, songProgress }) {
  return (
    <div className="wrap fade-in">
      <header className="hero">
        <Brandmark />
        <div className="hero-art">
          <img src="images/top-img.png" alt="ピアノを弾く女の子" />
        </div>
      </header>

      <section className="cards" aria-label="メニュー">
        {/* Score-reading practice */}
        <article
          className="card"
          role="button"
          tabIndex={0}
          onClick={() => go("score")}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && go("score")}
        >
          <div className="card-icon" aria-hidden="true">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <path d="M12 6v15.5a3.5 3.5 0 1 1-2-3.16V8.5L22 6v13.5a3.5 3.5 0 1 1-2-3.16V8.7L12 10.3" stroke="#6A57C2" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="card-body">
            <h2>譜読み練習</h2>
            <p>難易度1〜20の中からチャレンジ。苦手なパターンを集中練習。</p>
          </div>
          <span className="card-chevron" aria-hidden="true">›</span>

          <div className="dashes" aria-hidden="true">
            {Array.from({ length: 20 }).map((_, i) => (
              <span key={i} className={i < scoreProgress ? "done" : ""} />
            ))}
          </div>
          <div className="meta">20 難易度レベル ・ 10 曲収録</div>
        </article>

        {/* Song master */}
        <article
          className="card"
          role="button"
          tabIndex={0}
          onClick={() => go("song")}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && go("song")}
        >
          <div className="card-icon" aria-hidden="true">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <path d="M9 5h14v6a7 7 0 0 1-14 0V5Z" fill="#F2C535" stroke="#B8902A" strokeWidth="1.6" strokeLinejoin="round" />
              <path d="M9 7H5v2a3 3 0 0 0 3 3M23 7h4v2a3 3 0 0 1-3 3" stroke="#B8902A" strokeWidth="1.6" fill="none" strokeLinecap="round" />
              <path d="M13 19h6v3h2v3H11v-3h2v-3Z" fill="#F2C535" stroke="#B8902A" strokeWidth="1.6" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="card-body">
            <h2>曲マスター</h2>
            <p>2小節ずつ正確に弾いて、少しずつ曲全体をマスターしよう。</p>

            <div className="chips">
              <span className="chip">2小節</span>
              <span className="chip">4小節</span>
              <span className="chip">8小節</span>
              <span className="chip">全曲</span>
              <span className="chip-hint">→ ステップアップ</span>
            </div>
          </div>
          <span className="card-chevron" aria-hidden="true">›</span>
          <div className="meta">10 曲収録 ・ 進捗が保存されます</div>
        </article>
      </section>

      <p className="footnote">
        著作権フリーのクラシック名曲を収録<br />
        マイクへのアクセスが必要です
      </p>
    </div>
  );
}

/* =====================================================
   Score-reading detail — matches real page layout:
   header, big start button, hand picker, song list
   ===================================================== */
const SCORE_SONGS = [
  { id: 1,  title: "喜びの歌",                    composer: "L.v. ベートーヴェン", lv: 1,  bpm: 100 },
  { id: 2,  title: "メヌエット ト長調 BWV Anh.114", composer: "J.S. バッハ",        lv: 2,  bpm: 120 },
  { id: 3,  title: "きらきら星",                  composer: "伝承曲",             lv: 4,  bpm: 100 },
  { id: 4,  title: "アラベスク Op.100 No.2",       composer: "F. ブルグミュラー",   lv: 5,  bpm: 152 },
  { id: 5,  title: "エリーゼのために",             composer: "L.v. ベートーヴェン", lv: 6,  bpm: 80  },
  { id: 6,  title: "無邪気 Op.100 No.5",           composer: "F. ブルグミュラー",   lv: 6,  bpm: 100 },
  { id: 7,  title: "トルコ行進曲",                composer: "W.A. モーツァルト",   lv: 8,  bpm: 140 },
  { id: 8,  title: "ジムノペディ 第1番",           composer: "E. サティ",          lv: 10, bpm: 76  },
  { id: 9,  title: "心配 Op.100 No.18",            composer: "F. ブルグミュラー",   lv: 10, bpm: 120 },
  { id: 10, title: "月光ソナタ 第1楽章",           composer: "L.v. ベートーヴェン", lv: 12, bpm: 60  },
  { id: 11, title: "天使の声 Op.100 No.21",        composer: "F. ブルグミュラー",   lv: 12, bpm: 80  },
  { id: 12, title: "カノン",                      composer: "J. パッヘルベル",     lv: 14, bpm: 80  },
  { id: 13, title: "夜想曲 Op.9 No.2",             composer: "F. ショパン",        lv: 16, bpm: 66  },
  { id: 14, title: "エチュード Op.10 No.12「革命」", composer: "F. ショパン",       lv: 19, bpm: 120 },
];

function ScoreScreen({ go, openPractice }) {
  const [hand, setHand] = useState("right");
  const [pickedId, setPickedId] = useState(1);
  const picked = SCORE_SONGS.find((s) => s.id === pickedId) || SCORE_SONGS[0];
  const handLabel = { right: "右手", left: "左手", both: "両手" }[hand];

  const start = (song) => openPractice({
    title: song.title,
    composer: song.composer,
    range: `Lv.${song.lv} ・ ${handLabel}`,
    bpm: song.bpm,
  });

  return (
    <div className="detail fade-in">
      <header className="score-head">
        <button className="score-back" onClick={() => go("home")} aria-label="もどる">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M15 6l-6 6 6 6" stroke="#4A4A65" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div className="score-head-text">
          <h1>譜読み練習</h1>
          <p>曲と手を選んでスタート</p>
        </div>
      </header>

      <button className="start-cta" onClick={() => start(picked)}>
        ▶ 練習スタート
      </button>

      <div className="field-label">手の選択</div>
      <div className="hand-picker" role="tablist" aria-label="手の選択">
        {[
          { id: "right", label: "右手" },
          { id: "left",  label: "左手" },
          { id: "both",  label: "両手" },
        ].map((h) => (
          <button
            key={h.id}
            role="tab"
            aria-selected={hand === h.id}
            className={`hand-btn ${hand === h.id ? "on" : ""}`}
            onClick={() => setHand(h.id)}
          >
            {h.label}
          </button>
        ))}
      </div>

      <div className="field-label">開始曲</div>
      <div className="score-song-list">
        {SCORE_SONGS.map((s) => {
          const active = s.id === pickedId;
          return (
            <button
              key={s.id}
              className={`score-song ${active ? "on" : ""}`}
              onClick={() => setPickedId(s.id)}
              onDoubleClick={() => start(s)}
            >
              <span className="song-note" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M9 6v9.5a3 3 0 1 1-1.6-2.65V7.2L18 5v8.5a3 3 0 1 1-1.6-2.65V6.4L9 7.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span className="song-text">
                <strong>{s.title}</strong>
                <em>{s.composer}</em>
              </span>
              <span className="song-stats">
                <span className="lv-badge">Lv.{s.lv}</span>
                <span className="bpm">BPM {s.bpm}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* =====================================================
   Song-master detail
   ===================================================== */
const SONGS = [
  { id: 1,  title: "きらきら星",          composer: "モーツァルト 編", pct: 100 },
  { id: 2,  title: "ちょうちょう",         composer: "ドイツ民謡",      pct: 80  },
  { id: 3,  title: "メヌエット ト長調",    composer: "ペツォールト",    pct: 45  },
  { id: 4,  title: "歓喜の歌",            composer: "ベートーヴェン",  pct: 20  },
  { id: 5,  title: "エリーゼのために",     composer: "ベートーヴェン",  pct: 0   },
  { id: 6,  title: "ジムノペディ 第1番",   composer: "サティ",         pct: 0   },
  { id: 7,  title: "亜麻色の髪の乙女",     composer: "ドビュッシー",    pct: 0   },
  { id: 8,  title: "アヴェ・マリア",       composer: "シューベルト",    pct: 0   },
  { id: 9,  title: "白鳥",                composer: "サン＝サーンス",  pct: 0   },
  { id: 10, title: "月の光",              composer: "ドビュッシー",    pct: 0   },
];

function SongScreen({ go, openPractice }) {
  const [step, setStep] = useState("2");
  return (
    <div className="detail fade-in">
      <button className="back" onClick={() => go("home")}>← もどる</button>
      <div className="detail-head">
        <h1>
          <span className="head-icon" aria-hidden="true">
            <svg width="26" height="26" viewBox="0 0 32 32" fill="none">
              <path d="M9 5h14v6a7 7 0 0 1-14 0V5Z" fill="#F2C535" stroke="#B8902A" strokeWidth="1.6" strokeLinejoin="round" />
              <path d="M9 7H5v2a3 3 0 0 0 3 3M23 7h4v2a3 3 0 0 1-3 3" stroke="#B8902A" strokeWidth="1.6" fill="none" strokeLinecap="round" />
              <path d="M13 19h6v3h2v3H11v-3h2v-3Z" fill="#F2C535" stroke="#B8902A" strokeWidth="1.6" strokeLinejoin="round" />
            </svg>
          </span>
          曲マスター
        </h1>
      </div>

      <div className="step-bar" role="tablist" aria-label="練習する範囲">
        {["2", "4", "8", "全"].map((v) => (
          <button
            key={v}
            role="tab"
            aria-selected={step === v}
            className={step === v ? "on" : ""}
            onClick={() => setStep(v)}
          >
            {v === "全" ? "全曲" : `${v}小節`}
          </button>
        ))}
      </div>

      <div className="song-list">
        {SONGS.map((s) => (
          <div
            key={s.id}
            className="song-row"
            onClick={() => openPractice({
              title: s.title,
              composer: s.composer,
              range: step === "全" ? "全曲" : `${step}小節`,
              bpm: 100,
            })}
          >
            <div className="num">{String(s.id).padStart(2, "0")}</div>
            <div className="song-meta">
              <h3>{s.title}</h3>
              <p>{s.composer}</p>
            </div>
            <div className="song-progress">
              <div className="bar"><i style={{ width: `${s.pct}%` }} /></div>
              <div className="pct">{s.pct}%</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* =====================================================
   App shell — screen routing + persistent landscape
   ===================================================== */
function App() {
  const [screen, setScreen] = useState("home");
  const [track, setTrack] = useState(null);
  const scoreProgress = 7;
  const songProgress  = 2;

  const openPractice = (t) => { setTrack(t); setScreen("practice"); };

  return (
    <div className="stage">
      {screen === "home"     && <Home go={setScreen} scoreProgress={scoreProgress} songProgress={songProgress} />}
      {screen === "score"    && <ScoreScreen go={setScreen} openPractice={openPractice} />}
      {screen === "song"     && <SongScreen  go={setScreen} openPractice={openPractice} />}
      {screen === "practice" && <PracticeScreen track={track} go={setScreen} />}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
