"use client";

import { useEffect, useRef } from "react";
import type { NoteEvent } from "@/lib/osmdUtils";
import type { JudgementResult } from "@/lib/judgement";

// Bravura glyph paths (extracted from Bravura.woff via fontTools)
// Coordinate system: 250 units = 1 staff space, y-axis points UP (flip on canvas)
// Each glyph origin (0,0) is the staff/stem reference point for that glyph
const BRAVURA_SCALE = 13 / 250; // 13 = LINE_SPACING

// Path2D is browser-only — lazy-init to avoid SSR crash
const REST_SVG = {
  whole:   "M282 -109V-17Q282 -6 274 2Q267 9 256 9H26Q15 9 7 2Q0 -6 0 -17V-109Q0 -120 7 -127Q15 -135 26 -135H256Q267 -135 274 -127Q282 -120 282 -109Z",
  half:    "M282 24V116Q282 127 274 135Q267 142 256 142H26Q15 142 7 135Q0 127 0 116V24Q0 13 7 6Q15 -2 26 -2H256Q267 -2 274 6Q282 13 282 24Z",
  quarter: "M78 -38Q90 -53 101 -68Q111 -82 121 -98Q123 -101 125 -106Q127 -110 127 -112Q127 -113 127 -114Q127 -115 126 -116Q124 -119 122 -120Q119 -121 115 -121Q112 -121 107 -120Q102 -119 99 -118Q97 -118 95 -118L87 -115Q48 -116 25 -145Q2 -173 1 -211Q1 -248 32 -286Q62 -324 117 -366Q123 -370 130 -373Q137 -375 143 -375Q148 -375 153 -373Q157 -372 158 -369Q160 -365 160 -362Q160 -355 155 -349Q150 -343 144 -338Q134 -337 127 -323Q120 -310 118 -302Q114 -290 114 -276Q114 -245 130 -224Q146 -204 177 -203Q199 -203 221 -209Q243 -215 256 -220L257 -221Q260 -222 262 -222Q264 -222 265 -222Q270 -222 270 -218Q269 -208 256 -189Q243 -171 233 -161Q204 -127 184 -95Q165 -63 164 -22Q164 -20 164 -19L165 -12Q165 -10 165 -9Q169 34 190 71Q210 107 231 138Q235 146 235 153Q235 161 233 166Q231 172 231 172Q222 182 155 262Q87 342 66 365Q62 369 57 371Q53 373 48 373Q40 373 34 368Q28 363 28 352Q28 345 32 336Q38 327 64 292Q90 257 93 202Q93 174 80 142Q66 110 33 75Q26 67 22 60Q19 52 19 46Q20 35 24 29Q28 22 29 22Z",
  eighth:  "M134 107Q133 135 114 154Q95 173 67 174Q39 173 20 154Q1 135 0 107Q0 91 8 78Q15 65 27 56Q39 48 53 43Q67 39 81 39Q92 39 102 41Q112 43 120 46Q130 49 138 52Q147 56 156 61Q159 62 161 62Q164 62 165 59Q166 57 166 53Q166 48 165 42Q159 21 124 -79Q89 -179 72 -238Q73 -247 84 -249Q95 -251 101 -251Q109 -251 119 -249Q128 -247 136 -241Q144 -218 188 -64Q231 90 237 112Q240 126 243 136Q246 147 247 151Q246 158 242 162Q237 166 235 167Q234 167 231 167Q228 166 224 163Q217 155 189 128Q161 101 134 97Z",
  sixteenth:"M208 111Q207 140 188 159Q169 178 140 179Q111 178 92 159Q73 140 72 111Q73 80 98 62Q122 43 152 43Q172 43 193 49Q213 55 230 65Q234 67 237 67Q242 67 242 60Q239 40 216 -30Q192 -100 184 -120Q177 -134 162 -143Q147 -151 135 -151Q136 -145 136 -141Q135 -112 116 -93Q97 -74 68 -73Q39 -74 20 -93Q1 -112 0 -141Q1 -172 26 -190Q50 -209 80 -209Q100 -209 119 -203Q138 -197 155 -188Q159 -188 159 -194L158 -195Q158 -196 158 -196L63 -479Q63 -479 63 -480L62 -481Q62 -488 69 -494Q77 -500 93 -500Q114 -500 121 -493Q129 -486 131 -477L247 -96Q267 -31 279 12Q292 54 292 56Q294 61 305 102Q316 142 319 157Q319 158 320 159Q320 160 320 161Q320 166 316 168Q312 171 310 172Q306 172 304 171Q301 170 299 168Q292 160 264 133Q235 105 208 101Z",
};
let _restPaths: { whole: Path2D; half: Path2D; quarter: Path2D; eighth: Path2D; sixteenth: Path2D } | null = null;
function getRestPaths() {
  if (!_restPaths) {
    _restPaths = {
      whole:    new Path2D(REST_SVG.whole),
      half:     new Path2D(REST_SVG.half),
      quarter:  new Path2D(REST_SVG.quarter),
      eighth:   new Path2D(REST_SVG.eighth),
      sixteenth:new Path2D(REST_SVG.sixteenth),
    };
  }
  return _restPaths;
}

// Flag glyphs: origin = stem tip. flag8thUp/sixteenthUp for up-stems, Down variants for down-stems.
const FLAG_SVG = {
  eighthUp:     "M238 -790Q240 -786 251 -733Q262 -679 264 -617Q263 -523 230 -436Q198 -349 149 -274Q110 -215 81 -150Q53 -85 40 -13Q38 -1 32 4Q27 9 19 9Q11 9 5 6Q0 3 0 -6V-245Q52 -259 110 -334Q167 -409 197 -478Q208 -504 215 -544Q221 -583 221 -628Q221 -662 215 -696Q210 -731 197 -765Q194 -774 194 -780Q194 -792 200 -799Q205 -806 210 -809Q215 -812 224 -807Q234 -803 238 -790Z",
  eighthDown:   "M240 760Q251 728 256 693Q261 657 261 623Q260 576 247 525Q233 474 221 446Q195 382 147 326Q98 271 0 236V1Q0 -6 5 -10Q10 -14 16 -14Q23 -14 31 -9Q38 -4 40 8Q55 79 98 145Q141 210 182 269Q231 344 268 431Q304 518 306 612Q305 672 295 720Q285 768 278 793Q276 801 272 805Q267 808 262 808Q250 808 242 795Q233 782 240 760Z",
  sixteenthUp:  "M272 -796Q275 -790 277 -757Q279 -724 279 -686V-664Q279 -632 271 -602Q264 -572 250 -544Q250 -542 250 -540Q249 -538 249 -535Q249 -532 250 -528Q254 -522 264 -485Q274 -448 275 -401Q275 -391 274 -383Q274 -374 272 -365Q265 -317 241 -282Q217 -247 164 -191Q122 -152 87 -119Q51 -86 37 -11Q35 -3 29 0Q22 2 17 2Q12 2 6 0Q1 -3 0 -8V-396H5Q52 -393 103 -416Q155 -439 207 -540Q224 -576 232 -613Q239 -650 239 -689Q239 -733 231 -778Q230 -781 230 -783Q230 -785 230 -787Q230 -797 236 -805Q241 -813 252 -813Q257 -813 262 -809Q267 -806 272 -796ZM209 -459Q197 -441 184 -424Q171 -408 155 -390Q119 -352 88 -320Q58 -289 41 -230Q40 -228 40 -227Q40 -224 44 -220Q48 -217 54 -217H62Q108 -219 147 -251Q185 -283 210 -322Q224 -342 230 -364Q237 -387 237 -411Q237 -416 237 -421Q237 -426 236 -431Q235 -437 234 -444Q233 -451 229 -457Q228 -459 224 -461Q220 -463 216 -463Q212 -463 209 -459Z",
  sixteenthDown:"M240 786Q252 722 248 657Q245 592 217 533Q164 432 108 409Q52 385 5 388H0V1Q0 -3 5 -6Q9 -9 17 -9Q23 -9 29 -7Q35 -4 37 4Q66 112 160 180Q253 247 282 358Q285 375 285 394Q284 441 274 478Q264 515 260 521Q259 524 259 528Q259 531 260 533Q260 535 260 537Q286 595 290 662Q294 729 281 790Q277 806 272 810Q266 813 257 812Q248 811 243 805Q238 799 240 786ZM226 456Q230 456 234 454Q238 452 239 449Q243 444 244 437Q245 430 246 424Q247 413 247 404Q247 354 220 315Q194 276 152 244Q109 212 62 210H54Q48 210 44 213Q40 216 40 220Q40 222 41 223Q58 282 93 313Q128 345 165 383Q181 400 194 416Q207 433 219 452Q222 456 226 456Z",
};
let _flagPaths: { eighthUp: Path2D; eighthDown: Path2D; sixteenthUp: Path2D; sixteenthDown: Path2D } | null = null;
function getFlagPaths() {
  if (!_flagPaths) {
    _flagPaths = {
      eighthUp:     new Path2D(FLAG_SVG.eighthUp),
      eighthDown:   new Path2D(FLAG_SVG.eighthDown),
      sixteenthUp:  new Path2D(FLAG_SVG.sixteenthUp),
      sixteenthDown:new Path2D(FLAG_SVG.sixteenthDown),
    };
  }
  return _flagPaths;
}

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
  beatType?: number;
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
  beatType,
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
      const TS_W   = beatType ? 22 : 0;
      const clefW  = CLEF_BASE_W + (numKs > 0 ? numKs * KS_SPACING + 4 : 0) + TS_W;
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

      // ── Time signature ────────────────────────────────────────────────
      if (beatType) {
        const tsx  = clefW - TS_W / 2;  // centre x of the time-sig area
        const tsFs = LINE_SPACING * 2.1;
        ctx.fillStyle    = "#111";
        ctx.font         = `bold ${tsFs}px "Times New Roman", serif`;
        ctx.textBaseline = "middle";
        ctx.textAlign    = "center";
        // Treble staff: upper number between lines 3–4 (step 6), lower between 1–2 (step 2)
        ctx.fillText(String(beatsPerMeasure), tsx, sy(6));
        ctx.fillText(String(beatType),        tsx, sy(2));
        if (hasBass) {
          ctx.fillText(String(beatsPerMeasure), tsx, sy(-6));
          ctx.fillText(String(beatType),        tsx, sy(-10));
        }
        ctx.textAlign = "left";
      }

      // ── Measure lines ─────────────────────────────────────────────────
      // Barline x = midpoint between last note of previous measure and first note of next measure
      for (let mi = 1; mi <= totalMeasures; mi++) {
        const boundaryTimeSec = mi * measureDur;
        let x: number;
        if (mi === totalMeasures || allNotes.length === 0) {
          x = playheadX + (boundaryTimeSec - elapsed) * SCROLL_SPEED;
        } else {
          const eps = 0.01;
          let prevTime = -Infinity, nextTime = Infinity;
          for (const note of allNotes) {
            if (note.startTimeSec < boundaryTimeSec - eps && note.startTimeSec > prevTime) prevTime = note.startTimeSec;
            if (note.startTimeSec >= boundaryTimeSec - eps && note.startTimeSec < nextTime) nextTime = note.startTimeSec;
          }
          if (prevTime > -Infinity && nextTime < Infinity) {
            x = (playheadX + (prevTime - elapsed) * SCROLL_SPEED + playheadX + (nextTime - elapsed) * SCROLL_SPEED) / 2;
          } else {
            x = playheadX + (boundaryTimeSec - elapsed) * SCROLL_SPEED;
          }
        }
        if (x <= clefW || x > W + 2) continue;
        const isFinal = mi === totalMeasures;
        ctx.strokeStyle = "#2a2a2a";
        ctx.lineWidth   = isFinal ? 2 : 1;
        ctx.beginPath();
        ctx.moveTo(x, trebleStaffTop);
        ctx.lineTo(x, hasBass ? bassBottomY : trebleStaffBottom);
        ctx.stroke();
        ctx.lineWidth = 1;
      }

      // ── Key-sig accidental pitch classes ──────────────────────────────
      const ksPcs = new Set<number>();
      if (ks > 0)       { for (let i = 0; i < ks  && i < 7; i++) ksPcs.add(SHARP_PCS[i]); }
      else if (ks < 0)  { for (let i = 0; i < -ks && i < 7; i++) ksPcs.add(FLAT_PCS[i]);  }

      // ── Notes ─────────────────────────────────────────────────────────
      const NRX = 6, NRY = 4.5;

      // ── Beam group pre-computation ────────────────────────────────────
      // Find consecutive sub-beat notes (8th / 16th) per part with no gap
      const beamGroupsList: { indices: number[]; up: boolean; stemTipYs: number[] }[] = [];
      const beamGroupOf   = new Map<number, number>(); // ni → group index
      const beamStemTipY  = new Map<number, number>(); // ni → per-note stem tip y (slanted)

      for (const part of [0, 1] as const) {
        const pIdxs: number[] = [];
        for (let i = 0; i < allNotes.length; i++) {
          if (allNotes[i].part === part && !allNotes[i].isRest) pIdxs.push(i);
        }
        let pi = 0;
        while (pi < pIdxs.length) {
          const ni0 = pIdxs[pi];
          const db0 = (allNotes[ni0].durationSec * bpm) / 60;
          if (db0 >= 0.6 || db0 < 0.15) { pi++; continue; }

          const gNis: number[] = [ni0];
          let pj = pi + 1;
          while (pj < pIdxs.length) {
            const prev = allNotes[pIdxs[pj - 1]];
            const next = allNotes[pIdxs[pj]];
            if (Math.abs(next.startTimeSec - (prev.startTimeSec + prev.durationSec)) > 0.025) break;
            const dbN = (next.durationSec * bpm) / 60;
            if (dbN >= 0.6 || dbN < 0.15) break;
            // Beams must not cross measure boundaries
            if (Math.floor(next.startTimeSec / measureDur) !== Math.floor(prev.startTimeSec / measureDur)) break;
            gNis.push(pIdxs[pj]);
            pj++;
          }

          if (gNis.length >= 2) {
            const step0 = midiToStep(allNotes[gNis[0]].midiNote);
            const up    = part === 1 ? false : step0 < 4;
            const floorY = part === 1 ? bassBottomY : trebleStaffBottom;

            const natTip = (midi: number) => {
              const s = midiToStep(midi);
              const noteY = sy(s);
              const stemLen = LINE_SPACING * 3.5;
              const isBass = part === 1;
              const withinStaff = isBass ? (s >= -12 && s <= -4) : (s >= 0 && s <= 8);
              const midlineY = isBass ? sy(-8) : sy(4);
              if (up) {
                const nat = noteY - stemLen;
                return withinStaff ? Math.min(nat, midlineY) : nat;
              } else {
                const nat = noteY + stemLen;
                return withinStaff ? Math.max(nat, midlineY) : nat;
              }
            };

            // Slanted beam: interpolate between natural tips of first and last notes,
            // clamped to ±2 staff spaces total slope
            let tip0 = natTip(allNotes[gNis[0]].midiNote);
            let tipN = natTip(allNotes[gNis[gNis.length - 1]].midiNote);
            const maxSlope = LINE_SPACING * 2;
            if (Math.abs(tipN - tip0) > maxSlope) {
              tipN = tip0 + Math.sign(tipN - tip0) * maxSlope;
            }
            const t0 = allNotes[gNis[0]].startTimeSec;
            const tN = allNotes[gNis[gNis.length - 1]].startTimeSec;
            const stemTipYs = gNis.map(gni => {
              const frac = tN > t0 ? (allNotes[gni].startTimeSec - t0) / (tN - t0) : 0;
              return tip0 + frac * (tipN - tip0);
            });

            const gi = beamGroupsList.length;
            beamGroupsList.push({ indices: gNis, up, stemTipYs });
            gNis.forEach((gni, pos) => {
              beamGroupOf.set(gni, gi);
              beamStemTipY.set(gni, stemTipYs[pos]);
            });
          }
          pi = pj;
        }
      }
      const beamNxMap  = new Map<number, number>(); // ni → pixel x (filled in note loop)
      const beamColMap = new Map<number, string>(); // ni → stroke colour

      // ── Tie pairs pre-computation ─────────────────────────────────────
      const tiePairs: { fromNi: number; toNi: number }[] = [];
      for (let ni = 0; ni < allNotes.length; ni++) {
        if (!allNotes[ni].tieStart || allNotes[ni].isRest) continue;
        const from = allNotes[ni];
        for (let nj = ni + 1; nj < allNotes.length; nj++) {
          const to = allNotes[nj];
          if (to.startTimeSec > from.startTimeSec + from.durationSec + 0.05) break;
          if (to.part === from.part && to.midiNote === from.midiNote && !to.isRest) {
            tiePairs.push({ fromNi: ni, toNi: nj });
            break;
          }
        }
      }

      for (let ni = 0; ni < allNotes.length; ni++) {
        const note = allNotes[ni];
        const nx = playheadX + (note.startTimeSec - elapsed) * SCROLL_SPEED;
        if (nx > W + 24 || nx < clefW - 30) continue;

        const past = note.startTimeSec < elapsed - 0.05;
        const { fill, stroke } = noteColor(jArr[ni], past);

        // ── Rest (Bravura Path2D) ────────────────────────────────────────
        if (note.isRest) {
          const durBeats = (note.durationSec * bpm) / 60;
          const isBass   = note.part === 1;
          // Reference staff line for glyph origin (y=0 in font coords):
          //   whole  → 4th line from bottom (step 6 treble / -6 bass)
          //   others → 3rd line from bottom (step 4 treble / -8 bass)
          const rp = getRestPaths();
          let restPath: Path2D;
          let cx: number; // horizontal centre of glyph in font units
          let refStep: number;
          if (durBeats >= 3.8) {
            restPath = rp.whole;     cx = 141; refStep = isBass ? -6  : 6;
          } else if (durBeats >= 1.75) {
            restPath = rp.half;      cx = 141; refStep = isBass ? -8  : 4;
          } else if (durBeats >= 0.6) {
            restPath = rp.quarter;   cx = 136; refStep = isBass ? -8  : 4;
          } else if (durBeats >= 0.3) {
            restPath = rp.eighth;    cx = 124; refStep = isBass ? -8  : 4;
          } else {
            restPath = rp.sixteenth; cx = 160; refStep = isBass ? -8  : 4;
          }
          ctx.fillStyle = fill;
          ctx.save();
          ctx.translate(nx, sy(refStep));
          ctx.scale(BRAVURA_SCALE, -BRAVURA_SCALE); // flip y: font=up, canvas=down
          ctx.translate(-cx, 0);                    // centre horizontally
          ctx.fill(restPath);
          ctx.restore();
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
          ctx.strokeStyle = stroke; ctx.lineWidth = 1.8;
          ctx.stroke(); ctx.lineWidth = 1;
        } else {
          ctx.fillStyle = fill;
          ctx.fill();
        }

        // ── Augmentation dot ────────────────────────────────────────────
        if (note.dotted) {
          // Dot goes in the space; if note is on a line (even step) move up one step
          const dotStep = (step & 1) === 0 ? step + 1 : step;
          ctx.fillStyle = fill;
          ctx.beginPath();
          ctx.arc(nx + NRX + 5, sy(dotStep), 2.2, 0, Math.PI * 2);
          ctx.fill();
        }

        // ── Stem ────────────────────────────────────────────────────────
        if (durBeats < 3.8) {
          const up = note.part === 1 ? false : step < 4;
          const sx2 = up ? nx + NRX - 1 : nx - NRX + 1;
          const beamGi = beamGroupOf.get(ni);
          let sy2: number;
          if (beamGi !== undefined) {
            sy2 = beamStemTipY.get(ni) ?? beamGroupsList[beamGi].stemTipYs[0];
          } else {
            const stemLen = LINE_SPACING * 3.5;
            const isBass = note.part === 1;
            const withinStaff = isBass ? (step >= -12 && step <= -4) : (step >= 0 && step <= 8);
            const midlineY = isBass ? sy(-8) : sy(4);
            if (up) {
              const nat = ny - stemLen;
              sy2 = withinStaff ? Math.min(nat, midlineY) : nat;
            } else {
              const nat = ny + stemLen;
              sy2 = withinStaff ? Math.max(nat, midlineY) : nat;
            }
          }

          if (beamGi !== undefined) {
            beamNxMap.set(ni, nx);
            beamColMap.set(ni, stroke);
          }

          ctx.strokeStyle = stroke; ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(sx2, ny + (up ? -NRY : NRY) * 0.5);
          ctx.lineTo(sx2, sy2);
          ctx.stroke();
          ctx.lineWidth = 1;

          if (beamGi === undefined && durBeats < 0.6 && durBeats >= 0.15) {
            const fp = getFlagPaths();
            const is16th = durBeats < 0.3;
            const flagPath = up
              ? (is16th ? fp.sixteenthUp : fp.eighthUp)
              : (is16th ? fp.sixteenthDown : fp.eighthDown);
            ctx.fillStyle = stroke;
            ctx.save();
            ctx.translate(sx2, sy2);
            ctx.scale(BRAVURA_SCALE, -BRAVURA_SCALE);
            ctx.fill(flagPath);
            ctx.restore();
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

      // ── Beams ────────────────────────────────────────────────────────
      const beamH   = Math.round(LINE_SPACING * 0.42); // beam bar thickness
      const beamGap = Math.round(LINE_SPACING * 0.52); // gap between double beams
      for (const grp of beamGroupsList) {
        const { indices, up } = grp;
        const rendered = indices.filter(ni => beamNxMap.has(ni));
        if (rendered.length < 2) continue;
        const firstNi = rendered[0];
        const lastNi  = rendered[rendered.length - 1];
        const x1 = beamNxMap.get(firstNi)! + (up ? NRX - 1 : -(NRX - 1));
        const x2 = beamNxMap.get(lastNi)!  + (up ? NRX - 1 : -(NRX - 1));
        const y1 = beamStemTipY.get(firstNi)!;
        const y2 = beamStemTipY.get(lastNi)!;
        ctx.fillStyle = beamColMap.get(firstNi) ?? "#111111";

        // Parallelogram beam (handles slant naturally)
        const drawBeamBar = (level: number) => {
          const yOff = level * (beamH + beamGap) * (up ? 1 : -1);
          const thick = up ? beamH : -beamH;
          ctx.beginPath();
          ctx.moveTo(x1, y1 + yOff);
          ctx.lineTo(x2, y2 + yOff);
          ctx.lineTo(x2, y2 + yOff + thick);
          ctx.lineTo(x1, y1 + yOff + thick);
          ctx.closePath();
          ctx.fill();
        };
        drawBeamBar(0);
        // Second beam bar for 16th notes (durBeats ≈ 0.25)
        const all16th = rendered.every(ni => (allNotes[ni].durationSec * bpm) / 60 < 0.35);
        if (all16th) drawBeamBar(1);
      }

      // ── Ties ─────────────────────────────────────────────────────────
      for (const { fromNi, toNi } of tiePairs) {
        const fromNote = allNotes[fromNi];
        const toNote   = allNotes[toNi];
        const x1 = playheadX + (fromNote.startTimeSec - elapsed) * SCROLL_SPEED + NRX + 2;
        const x2 = playheadX + (toNote.startTimeSec   - elapsed) * SCROLL_SPEED - NRX - 2;
        if (x1 > W + 20 || x2 < clefW - 20 || x2 <= x1) continue;
        const step = midiToStep(fromNote.midiNote);
        const tieY = sy(step);
        const past = fromNote.startTimeSec < elapsed - 0.05;
        const { stroke } = noteColor(jArr[fromNi], past);
        const up = fromNote.part === 1 ? false : step < 4;
        const arcDir = up ? 1 : -1; // up stem → tie curves down; down stem → tie curves up
        const arcH = Math.min((x2 - x1) * 0.22, LINE_SPACING * 1.5);
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x1, tieY);
        ctx.quadraticCurveTo((x1 + x2) / 2, tieY + arcDir * arcH, x2, tieY);
        ctx.stroke();
        ctx.lineWidth = 1;
      }

      // ── Playhead (solid) ──────────────────────────────────────────────
      ctx.strokeStyle = "rgba(99,102,241,0.9)";
      ctx.lineWidth   = 2;
      ctx.beginPath();
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX, H);
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
