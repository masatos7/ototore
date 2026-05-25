"use client";

import { useEffect, useRef } from "react";
import type { NoteEvent } from "@/lib/osmdUtils";
import type { JudgementResult } from "@/lib/judgement";

const CLEF_BASE_W  = 68;
const KS_SPACING   = 9;
const KS_START_X   = 64;
const LINE_SPACING = 13;
const SCROLL_SPEED = 260;

const DIATONIC = [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6];

function midiToStep(midi: number): number {
  const pc  = midi % 12;
  const oct = Math.floor(midi / 12) - 1;
  return DIATONIC[pc] + oct * 7 - 30;
}

function hasSharp(midi: number): boolean {
  return [1, 3, 6, 8, 10].includes(midi % 12);
}

const SHARP_PCS = [6, 1, 8, 3, 10, 5, 0];
const FLAT_PCS  = [10, 3, 8, 1, 6, 11, 4];

// Treble clef key sig positions (staff steps)
const TREBLE_SHARP_STEPS = [8, 5, 9, 6, 3, 7, 4];
const TREBLE_FLAT_STEPS  = [4, 7, 3, 6, 2, 5, 8];

// Bass clef key sig positions (same notes, lower octaves: F3 C3 G3 D3 A2 E3 B2)
const BASS_SHARP_STEPS = [-6, -9, -5, -8, -11, -7, -10];
const BASS_FLAT_STEPS  = [-10, -7, -11, -8, -12, -9, -6];

// Bass staff line steps
const BASS_LINE_STEPS = [-12, -10, -8, -6, -4];

function noteColor(
  j: JudgementResult | undefined,
  past: boolean
): { fill: string; stroke: string } {
  const jv = j?.judgement;
  if (jv === "correct") return { fill: "#16a34a", stroke: "#16a34a" };
  if (jv === "wrong")   return { fill: "#9ca3af", stroke: "#9ca3af" };
  if (jv === "missed")  return { fill: "#9ca3af", stroke: "#9ca3af" };
  if (past)             return { fill: "#c0c0c0", stroke: "#c0c0c0" };
  return { fill: "#111111", stroke: "#111111" };
}

interface Props {
  notes: NoteEvent[];
  judgements: JudgementResult[];
  elapsedSec: number;
  bpm: number;
  beatsPerMeasure: number;
  startMeasure: number;
  endMeasure: number;
  keySignature?: number;
}

export default function ScrollingStaff({
  notes,
  judgements,
  elapsedSec,
  bpm,
  beatsPerMeasure,
  startMeasure,
  endMeasure,
  keySignature = 0,
}: Props) {
  const canvasRef     = useRef<HTMLCanvasElement>(null);
  const elapsedRef    = useRef(elapsedSec);
  const judgementsRef = useRef(judgements);
  const keySigRef     = useRef(keySignature);
  const notesRef      = useRef(notes);
  elapsedRef.current    = elapsedSec;
  judgementsRef.current = judgements;
  keySigRef.current     = keySignature;
  notesRef.current      = notes;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const container = canvas.parentElement!;

    const resize = () => {
      canvas.width  = container.offsetWidth;
      canvas.height = container.offsetHeight;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    const ctx = canvas.getContext("2d")!;
    const secPerBeat    = 60 / bpm;
    const measureDur    = secPerBeat * beatsPerMeasure;
    const totalMeasures = endMeasure - startMeasure;

    let raf: number;

    const draw = () => {
      // Keep canvas pixel dims in sync with CSS dims every frame to avoid
      // stretching when the container height changes (e.g. single→grand staff).
      if (canvas.width  !== container.offsetWidth)  canvas.width  = container.offsetWidth;
      if (canvas.height !== container.offsetHeight) canvas.height = container.offsetHeight;

      const W       = canvas.width;
      const H       = canvas.height;
      const elapsed = elapsedRef.current;
      const jArr    = judgementsRef.current;
      const ks      = keySigRef.current;
      const allNotes = notesRef.current;

      const hasBass = allNotes.some(n => n.part === 1);

      // ── Clef panel width ─────────────────────────────────────────────
      const numKs  = Math.abs(ks);
      const clefW  = CLEF_BASE_W + (numKs > 0 ? numKs * KS_SPACING + 4 : 0);
      const playheadX = clefW + 28;

      // ── Staff geometry ────────────────────────────────────────────────
      // Unified coordinate: y = trebleStaffBottom - step * (LS/2)
      // Grand staff centered: step range 8..−12, center at step −2 = H/2
      const trebleStaffBottom = hasBass
        ? H / 2 - LINE_SPACING
        : H / 2 + LINE_SPACING * 2 + 4;
      const trebleStaffTop = trebleStaffBottom - 4 * LINE_SPACING;

      // Bass staff extents (in the unified coord system)
      const bassTopY    = trebleStaffBottom + 2 * LINE_SPACING;  // A3, step −4
      const bassBottomY = trebleStaffBottom + 6 * LINE_SPACING;  // G2, step −12

      const sy = (step: number) => trebleStaffBottom - step * (LINE_SPACING / 2);

      // ── Clear ─────────────────────────────────────────────────────────
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, W, H);

      // ── Staff lines (scrolling area) ──────────────────────────────────
      ctx.strokeStyle = "#2a2a2a";
      ctx.lineWidth   = 1;
      for (let i = 0; i < 5; i++) {
        const y = sy(i * 2);
        ctx.beginPath(); ctx.moveTo(clefW, y); ctx.lineTo(W, y); ctx.stroke();
      }
      if (hasBass) {
        for (const s of BASS_LINE_STEPS) {
          const y = sy(s);
          ctx.beginPath(); ctx.moveTo(clefW, y); ctx.lineTo(W, y); ctx.stroke();
        }
      }

      // ── Clef panel ────────────────────────────────────────────────────
      ctx.fillStyle = "#f7f7f8";
      ctx.fillRect(0, 0, clefW, H);

      ctx.strokeStyle = "#2a2a2a";
      ctx.lineWidth   = 1;
      for (let i = 0; i < 5; i++) {
        const y = sy(i * 2);
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(clefW, y); ctx.stroke();
      }
      if (hasBass) {
        for (const s of BASS_LINE_STEPS) {
          const y = sy(s);
          ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(clefW, y); ctx.stroke();
        }
      }

      // Thick opening bar (span both staves if grand staff)
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(clefW - 1, trebleStaffTop);
      ctx.lineTo(clefW - 1, hasBass ? bassBottomY : trebleStaffBottom);
      ctx.stroke();
      ctx.lineWidth = 1;

      // Thin brace on far left for grand staff
      if (hasBass) {
        ctx.strokeStyle = "#2a2a2a";
        ctx.lineWidth   = 1.5;
        ctx.beginPath();
        ctx.moveTo(1, trebleStaffTop);
        ctx.lineTo(1, bassBottomY);
        ctx.stroke();
        ctx.lineWidth = 1;
      }

      // Treble clef: alphabetic baseline at E4 line (step 0) so the G-curl
      // visually lands on the G4 line (step 2) in Times New Roman.
      ctx.fillStyle    = "#111";
      ctx.font         = `${LINE_SPACING * 5.4}px "Times New Roman", Georgia, serif`;
      ctx.textBaseline = "alphabetic";
      ctx.fillText("\u{1D11E}", 3, sy(0));

      // Bass clef: baseline at sy(-9) so the F-curl visually lands on F3 line (step -6).
      if (hasBass) {
        ctx.font         = `${LINE_SPACING * 3.2}px "Times New Roman", Georgia, serif`;
        ctx.textBaseline = "alphabetic";
        ctx.fillText("\u{1D122}", 5, sy(-9));
      }

      // ── Key signature ─────────────────────────────────────────────────
      if (numKs > 0) {
        const isSharp = ks > 0;
        const glyph   = isSharp ? "♯" : "♭";
        ctx.fillStyle    = "#111";
        ctx.font         = `${LINE_SPACING * 1.45}px "Times New Roman", serif`;
        ctx.textBaseline = "middle";

        const tSteps = isSharp ? TREBLE_SHARP_STEPS : TREBLE_FLAT_STEPS;
        for (let i = 0; i < numKs; i++) {
          ctx.fillText(glyph, KS_START_X + i * KS_SPACING, sy(tSteps[i]));
        }

        if (hasBass) {
          const bSteps = isSharp ? BASS_SHARP_STEPS : BASS_FLAT_STEPS;
          for (let i = 0; i < numKs; i++) {
            ctx.fillText(glyph, KS_START_X + i * KS_SPACING, sy(bSteps[i]));
          }
        }
      }

      // ── Measure lines ─────────────────────────────────────────────────
      for (let mi = 0; mi <= totalMeasures; mi++) {
        const tLine = playheadX + (mi * measureDur - elapsed) * SCROLL_SPEED;
        const x = tLine - 12;  // offset left so barline clearly precedes the first note of the measure
        if (x <= clefW || x > W + 2) continue;
        const isFinal = mi === totalMeasures;
        ctx.strokeStyle = isFinal ? "#333" : "#888";
        ctx.lineWidth   = isFinal ? 2 : 1;
        ctx.beginPath();
        ctx.moveTo(x, trebleStaffTop);
        ctx.lineTo(x, hasBass ? bassBottomY : trebleStaffBottom);
        ctx.stroke();
        ctx.lineWidth = 1;
        if (!isFinal && tLine + 4 < W) {
          ctx.fillStyle    = "#aaa";
          ctx.font         = "bold 10px sans-serif";
          ctx.textBaseline = "alphabetic";
          ctx.fillText(String(startMeasure + mi + 1), x + 3, trebleStaffTop - 3);
        }
      }

      // ── Key-sig accidental pitch classes ──────────────────────────────
      const ksPcs = new Set<number>();
      if (ks > 0)       { for (let i = 0; i < ks  && i < 7; i++) ksPcs.add(SHARP_PCS[i]); }
      else if (ks < 0)  { for (let i = 0; i < -ks && i < 7; i++) ksPcs.add(FLAT_PCS[i]);  }

      // ── Notes ─────────────────────────────────────────────────────────
      const NRX = 6, NRY = 4.5;

      for (let ni = 0; ni < allNotes.length; ni++) {
        const note = allNotes[ni];
        const nx = playheadX + (note.startTimeSec - elapsed) * SCROLL_SPEED;
        if (nx > W + 24 || nx < clefW - 30) continue;

        const past = note.startTimeSec < elapsed - 0.05;
        const { fill, stroke } = noteColor(jArr[ni], past);

        // ── Rest ────────────────────────────────────────────────────────
        if (note.isRest) {
          const durBeats = (note.durationSec * bpm) / 60;
          const isBass   = note.part === 1;
          ctx.fillStyle    = fill;
          ctx.textAlign    = "center";
          ctx.textBaseline = "middle";

          if (durBeats >= 3.8) {
            // 全休符 𝄻 U+1D13B — 第4線からぶら下がる
            ctx.font = `${LINE_SPACING * 2.8}px "Times New Roman", serif`;
            ctx.fillText("\u{1D13B}", nx, sy(isBass ? -6.5 : 5.5));
          } else if (durBeats >= 1.75) {
            // 二分休符 𝄼 U+1D13C — 第3線の上に乗る
            ctx.font = `${LINE_SPACING * 2.8}px "Times New Roman", serif`;
            ctx.fillText("\u{1D13C}", nx, sy(isBass ? -7.5 : 4.5));
          } else if (durBeats >= 0.6) {
            // 四分休符 𝄽 U+1D13D
            ctx.font = `${LINE_SPACING * 5.0}px "Times New Roman", serif`;
            ctx.fillText("\u{1D13D}", nx, sy(isBass ? -8 : 4));
          } else {
            // 八分休符 𝄾 U+1D13E
            ctx.font = `${LINE_SPACING * 3.5}px "Times New Roman", serif`;
            ctx.fillText("\u{1D13E}", nx, sy(isBass ? -7 : 5));
          }

          ctx.textAlign    = "left";
          ctx.textBaseline = "alphabetic";
          continue;
        }

        const step = midiToStep(note.midiNote);
        const ny   = sy(step);
        const durBeats = (note.durationSec * bpm) / 60;

        // ── Ledger lines ────────────────────────────────────────────────
        ctx.strokeStyle = stroke;
        ctx.lineWidth   = 1;
        if (!hasBass) {
          // Single staff
          if (step <= -2) {
            for (let s = -2; s >= step; s -= 2) {
              const ly = sy(s);
              ctx.beginPath(); ctx.moveTo(nx - NRX - 3, ly); ctx.lineTo(nx + NRX + 3, ly); ctx.stroke();
            }
          }
          if (step >= 10) {
            for (let s = 10; s <= step; s += 2) {
              const ly = sy(s);
              ctx.beginPath(); ctx.moveTo(nx - NRX - 3, ly); ctx.lineTo(nx + NRX + 3, ly); ctx.stroke();
            }
          }
        } else {
          // Grand staff
          // Above treble top (any note)
          if (step >= 10) {
            for (let s = 10; s <= step; s += 2) {
              const ly = sy(s);
              ctx.beginPath(); ctx.moveTo(nx - NRX - 3, ly); ctx.lineTo(nx + NRX + 3, ly); ctx.stroke();
            }
          }
          // Middle C area (step -2 or -3): single ledger line
          if (step === -2 || step === -3) {
            const ly = sy(-2);
            ctx.beginPath(); ctx.moveTo(nx - NRX - 3, ly); ctx.lineTo(nx + NRX + 3, ly); ctx.stroke();
          }
          // Below bass staff (step < -12)
          if (step < -12) {
            for (let s = -14; s >= step; s -= 2) {
              const ly = sy(s);
              ctx.beginPath(); ctx.moveTo(nx - NRX - 3, ly); ctx.lineTo(nx + NRX + 3, ly); ctx.stroke();
            }
          }
        }

        // ── Accidental (only if not in key sig) ──────────────────────────
        if (hasSharp(note.midiNote) && !ksPcs.has(note.midiNote % 12)) {
          const ax = nx - NRX - 10;   // center of the sharp symbol
          const ay = ny;
          const vx1 = ax - 2.8, vx2 = ax + 2.8;  // two vertical lines
          const barHalf = 5.5;   // half-height of bar region
          const barW   = 5;      // bar extends left/right beyond verticals
          const tilt   = 1;      // upward tilt of bars (px over full width)

          ctx.strokeStyle = stroke;
          ctx.lineCap = "square";

          // Vertical lines (extend beyond bar region)
          ctx.lineWidth = 1.3;
          ctx.beginPath(); ctx.moveTo(vx1, ay - barHalf - 3); ctx.lineTo(vx1, ay + barHalf + 3); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(vx2, ay - barHalf - 3); ctx.lineTo(vx2, ay + barHalf + 3); ctx.stroke();

          // Two thick horizontal bars, slightly ascending left→right
          ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(ax - barW, ay - barHalf + tilt); ctx.lineTo(ax + barW, ay - barHalf - tilt); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(ax - barW, ay + barHalf * 0.4 + tilt); ctx.lineTo(ax + barW, ay + barHalf * 0.4 - tilt); ctx.stroke();

          ctx.lineWidth = 1;
          ctx.lineCap = "butt";
        }

        // ── Note head ───────────────────────────────────────────────────
        ctx.beginPath();
        ctx.ellipse(nx, ny, NRX, NRY, -0.15, 0, Math.PI * 2);
        if (durBeats >= 1.75) {
          ctx.fillStyle = "#ffffff";   // white interior so barlines don't show through open heads
          ctx.fill();
          ctx.strokeStyle = stroke; ctx.lineWidth = 1.8;
          ctx.stroke(); ctx.lineWidth = 1;
        } else {
          ctx.fillStyle = fill;
          ctx.fill();
        }

        // ── Stem ────────────────────────────────────────────────────────
        if (durBeats < 3.8) {
          const up = note.part === 1 ? false : step < 4;
          const sx2 = up ? nx + NRX - 1 : nx - NRX + 1;
          // Cap downward stems at own staff bottom so treble stems don't reach into bass staff
          const stemFloor = note.part === 1 ? bassBottomY : trebleStaffBottom;
          const sy2 = up
            ? Math.min(ny - LINE_SPACING * 3.5, trebleStaffTop - 2)
            : Math.max(ny + LINE_SPACING * 3.5, stemFloor + 2);
          ctx.strokeStyle = stroke; ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(sx2, ny + (up ? -NRY : NRY) * 0.5);
          ctx.lineTo(sx2, sy2);
          ctx.stroke();
          ctx.lineWidth = 1;

          if (durBeats < 0.6 && durBeats >= 0.15) {
            // Eighth note flag: starts at stem end, sweeps right then curls back
            const fl = LINE_SPACING * 1.4;  // flag length
            ctx.strokeStyle = stroke; ctx.lineWidth = 1.8;
            ctx.beginPath();
            if (up) {
              // Stem-up: flag hangs down-right from top of stem
              ctx.moveTo(sx2, sy2);
              ctx.bezierCurveTo(sx2 + fl, sy2 + fl * 0.1, sx2 + fl * 1.1, sy2 + fl * 0.7, sx2 + fl * 0.4, sy2 + fl * 1.2);
            } else {
              // Stem-down: flag sweeps up-right from bottom of stem
              ctx.moveTo(sx2, sy2);
              ctx.bezierCurveTo(sx2 + fl, sy2 - fl * 0.1, sx2 + fl * 1.1, sy2 - fl * 0.7, sx2 + fl * 0.4, sy2 - fl * 1.2);
            }
            ctx.stroke();
            ctx.lineWidth = 1;
          }
        }

        // ── Wrong-note indicator ─────────────────────────────────────────
        const j = jArr[ni];
        if (j?.judgement === "wrong" && j.detectedMidi != null) {
          const wx = j.detectedTimeSec != null
            ? playheadX + (j.detectedTimeSec - elapsed) * SCROLL_SPEED
            : nx;
          const ws = midiToStep(j.detectedMidi);
          const wy = sy(ws);
          ctx.strokeStyle = "#dc2626"; ctx.lineWidth = 1;
          if (!hasBass && ws <= -2) {
            for (let s = -2; s >= ws; s -= 2) {
              ctx.beginPath(); ctx.moveTo(wx - NRX - 3, sy(s)); ctx.lineTo(wx + NRX + 3, sy(s)); ctx.stroke();
            }
          }
          if (ws >= 10) {
            for (let s = 10; s <= ws; s += 2) {
              ctx.beginPath(); ctx.moveTo(wx - NRX - 3, sy(s)); ctx.lineTo(wx + NRX + 3, sy(s)); ctx.stroke();
            }
          }
          ctx.beginPath();
          ctx.ellipse(wx, wy, NRX, NRY, -0.15, 0, Math.PI * 2);
          ctx.fillStyle = "#dc2626"; ctx.fill();
        }
      }

      // ── Playhead (solid) ──────────────────────────────────────────────
      ctx.strokeStyle = "rgba(99,102,241,0.9)";
      ctx.lineWidth   = 2;
      ctx.beginPath();
      ctx.moveTo(playheadX, trebleStaffTop - 10);
      ctx.lineTo(playheadX, (hasBass ? bassBottomY : trebleStaffBottom) + 10);
      ctx.stroke();

      ctx.fillStyle = "#6366f1";
      ctx.beginPath();
      ctx.moveTo(playheadX,     trebleStaffTop - 11);
      ctx.lineTo(playheadX + 5, trebleStaffTop - 5);
      ctx.lineTo(playheadX,     trebleStaffTop);
      ctx.lineTo(playheadX - 5, trebleStaffTop - 5);
      ctx.closePath();
      ctx.fill();

      // ── Edge fades ────────────────────────────────────────────────────
      const lg = ctx.createLinearGradient(clefW, 0, clefW + 18, 0);
      lg.addColorStop(0, "rgba(255,255,255,1)");
      lg.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = lg;
      ctx.fillRect(clefW, 0, 18, H);

      const rg = ctx.createLinearGradient(W - 55, 0, W, 0);
      rg.addColorStop(0, "rgba(255,255,255,0)");
      rg.addColorStop(1, "rgba(255,255,255,1)");
      ctx.fillStyle = rg;
      ctx.fillRect(W - 55, 0, 55, H);

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [notes, bpm, beatsPerMeasure, startMeasure, endMeasure]);

  return (
    <canvas
      ref={canvasRef}
      style={{ display: "block", width: "100%", height: "100%" }}
    />
  );
}
