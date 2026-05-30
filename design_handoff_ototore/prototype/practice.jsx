/* global React */
const { useState: useStateP, useRef: useRefP, useEffect: useEffectP } = React;

/* =====================================================
   PracticeScreen — full-width lesson layout
   Keeps the same 音トレピアノ vibe (rounded font, lavender accent,
   soft cards, bg framing) but uses 100% width, not the centered
   880px column.
   ===================================================== */
function PracticeScreen({ track, go }) {
  const [bpm, setBpm] = useStateP(track?.bpm ?? 100);
  const [playing, setPlaying] = useStateP(false);
  const [playhead, setPlayhead] = useStateP(0.06); // 0..1 along staff
  const [result, setResult] = useStateP(null); // {correct, total} when finished
  const rafRef = useRefP(null);
  const startRef = useRefP(0);

  // simple playhead animation when 練習スタート is pressed
  useEffectP(() => {
    if (!playing) return;
    const durationMs = (60_000 / bpm) * 16; // 4 bars of 4/4
    const baseT = performance.now();
    startRef.current = baseT;
    const tick = (t) => {
      const elapsed = t - baseT;
      const p = Math.min(elapsed / durationMs, 1);
      setPlayhead(0.06 + p * 0.9);
      if (p >= 1) {
        setPlaying(false);
        // Prototype: random-ish score so each finish looks different
        const total = 30;
        const correct = Math.floor(Math.random() * (total + 1));
        setResult({ correct, total });
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing, bpm]);

  const handleStart = () => {
    if (result) setResult(null);
    setPlayhead(0.06);
    setPlaying((p) => !p);
  };
  const handleListen = () => alert("お手本を再生（プロトタイプ：音声未実装）");
  const handleRetry = () => {
    setResult(null);
    setPlayhead(0.06);
    setPlaying(true);
  };

  const presets = [60, 80, 100, 120];

  return (
    <div className="practice fade-in">
      {/* Top bar — full width */}
      <header className="practice-top">
        <button className="practice-back" onClick={() => go("home")} aria-label="もどる">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M14 6l-6 6 6 6" stroke="#4A4A65" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div className="practice-title">
          <h1>{track?.title ?? "練習"}</h1>
          <p>{track?.composer ?? ""}</p>
        </div>
        <div className="practice-top-right">
          <span className="practice-badge">{track?.range ?? "2小節"}</span>
        </div>
      </header>

      {/* Score panel — full bleed */}
      <section className="score-panel" aria-label="楽譜">
        <ScoreView playhead={playhead} />
      </section>

      {/* Controls — slider + presets */}
      <section className="controls">
        <div className="ctrl-row">
          <label className="ctrl-label" htmlFor="bpm">スピード (BPM)</label>
          <span className="ctrl-value">{bpm}</span>
        </div>
        <input
          id="bpm"
          className="bpm-slider"
          type="range"
          min="40"
          max="200"
          step="1"
          value={bpm}
          onChange={(e) => setBpm(+e.target.value)}
          style={{ "--p": `${((bpm - 40) / 160) * 100}%` }}
        />
        <div className="bpm-marks">
          <span>40</span>
          <div className="bpm-presets">
            {presets.map((v) => (
              <button
                key={v}
                className={`chip-btn ${bpm === v ? "on" : ""}`}
                onClick={() => setBpm(v)}
              >
                {v}
              </button>
            ))}
          </div>
          <span>200</span>
        </div>
      </section>

      {/* Bottom actions — full width row */}
      <footer className="actions">
        <div className="avatar" aria-hidden="true">
          <img src="images/top-img.png" alt="" />
        </div>
        <button className="action-secondary" onClick={handleListen}>
          ♪ お手本を聴く
        </button>
        <button className={`action-primary ${playing ? "is-playing" : ""}`} onClick={handleStart}>
          {playing ? "■ 一時停止" : "▶ 練習スタート"}
        </button>
      </footer>

      {result && (
        <ResultModal
          result={result}
          onListen={handleListen}
          onRetry={handleRetry}
          onSongMaster={() => go("song")}
          onClose={() => setResult(null)}
        />
      )}
    </div>
  );
}

/* ===== Result modal ===== */
function ResultModal({ result, onListen, onRetry, onSongMaster, onClose }) {
  const pct = Math.round((result.correct / result.total) * 100);
  let title = "もう一度!";
  let tone = "tone-try";
  if (pct === 100) { title = "パーフェクト!";   tone = "tone-perfect"; }
  else if (pct >= 80) { title = "じょうず!";   tone = "tone-great"; }
  else if (pct >= 50) { title = "もうすこし!"; tone = "tone-soso"; }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className={`result-card ${tone}`} role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <h2 className="result-title">{title}</h2>
        <div className="result-pct">{pct}%</div>
        <div className="result-sub">{result.correct} / {result.total} 正解</div>

        <div className="result-actions">
          <button className="action-secondary" onClick={onListen}>♪ お手本を聴く</button>
          <button className="action-primary" onClick={onRetry}>▶ もう一度挑戦</button>
        </div>

        <button className="result-cta" onClick={onSongMaster}>
          曲マスターでこの曲を練習する
        </button>
      </div>
    </div>
  );
}

/* ===== Score view =====
   Single line of staff with treble clef, 4/4 time, a sample melody of
   quarter/eighth notes for Ode to Joy, and a vertical playhead. */
function ScoreView({ playhead }) {
  const W = 1400;
  const H = 280;
  const staffTop = 110;
  const lineGap = 14;

  // Ode to Joy opening — pitch positions on the staff (y offsets from top staff line)
  // 0 = top line (F5), positive = lower. Treble: lines F5 D5 B4 G4 E4; spaces E5 C5 A4 F4.
  // Using diatonic step numbers from E4 (0) upward.
  const melody = [
    3, 3, 4, 5, 5, 4, 3, 2,
    1, 1, 2, 3, 3, 2, 2,
    3, 3, 4, 5, 5, 4, 3, 2,
    1, 1, 2, 3, 2, 1, 1,
  ];
  const noteX0 = 220;
  const noteX1 = W - 60;
  const stepX = (noteX1 - noteX0) / (melody.length - 1);
  const stepFromBottomToY = (s) => (staffTop + lineGap * 4) - (s * (lineGap / 2));

  const playX = noteX0 + (noteX1 - noteX0) * ((playhead - 0.06) / 0.9);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="score-svg">
      {/* staff lines */}
      {Array.from({ length: 5 }).map((_, i) => (
        <line key={i} x1="20" x2={W - 20} y1={staffTop + i * lineGap} y2={staffTop + i * lineGap}
              stroke="#2A2A40" strokeWidth="1.2" />
      ))}

      {/* treble clef (cute stylized glyph) */}
      <text x="40" y={staffTop + lineGap * 4 + 14} fontSize="86" fill="#2A2A40"
            fontFamily="Bravura, 'Noto Music', serif">𝄞</text>

      {/* 4/4 time */}
      <text x="140" y={staffTop + lineGap * 2 + 4} fontSize="34" fontWeight="900" fill="#2A2A40"
            fontFamily="Zen Maru Gothic, sans-serif">4</text>
      <text x="140" y={staffTop + lineGap * 4 + 6} fontSize="34" fontWeight="900" fill="#2A2A40"
            fontFamily="Zen Maru Gothic, sans-serif">4</text>

      {/* bar lines */}
      {[0.25, 0.5, 0.75].map((p) => {
        const x = noteX0 + (noteX1 - noteX0) * p;
        return <line key={p} x1={x} x2={x} y1={staffTop - 6} y2={staffTop + lineGap * 4 + 6}
                     stroke="#C5BFD8" strokeWidth="1" />;
      })}

      {/* notes */}
      {melody.map((s, i) => {
        const x = noteX0 + i * stepX;
        const y = stepFromBottomToY(s);
        const stemUp = s < 5;
        return (
          <g key={i}>
            <ellipse cx={x} cy={y} rx="6.5" ry="5" fill="#2A2A40" transform={`rotate(-18 ${x} ${y})`} />
            <line x1={x + (stemUp ? 6 : -6)}
                  y1={y}
                  x2={x + (stemUp ? 6 : -6)}
                  y2={y + (stemUp ? -32 : 32)}
                  stroke="#2A2A40" strokeWidth="1.6" />
          </g>
        );
      })}

      {/* playhead */}
      <line x1={playX} x2={playX} y1="40" y2={H - 30}
            stroke="#6A57C2" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx={playX} cy="40" r="6" fill="#6A57C2" />
    </svg>
  );
}

window.PracticeScreen = PracticeScreen;
