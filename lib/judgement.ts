import { notesMatchPitchClass } from "./pitchUtils";

export type NoteJudgement = "correct" | "wrong" | "missed" | "pending";

export interface JudgementResult {
  noteIndex: number;
  judgement: NoteJudgement;
  detectedMidi?: number;
  detectedTimeSec?: number; // when the note was actually played
}

export interface ActiveNote {
  midiNote: number;
  startTimeSec: number;
  durationSec: number;
  isRest: boolean;
}

export const TIMING_WINDOW_SEC = 0.35; // ±350ms tolerance

export function computeNoteScore(timeDiff: number): number {
  const ratio = 1 - timeDiff / TIMING_WINDOW_SEC;
  return Math.max(1, Math.round(ratio * 10));
}

export function getNoteGrade(score: number): "Perfect" | "Great" | "Good" {
  if (score >= 9) return "Perfect";
  if (score >= 5) return "Great";
  return "Good";
}

export function judgeNote(
  activeNote: ActiveNote,
  detectedMidi: number,
  currentTimeSec: number
): NoteJudgement {
  if (activeNote.isRest) return "correct"; // rests are auto-passed

  const timeDiff = Math.abs(currentTimeSec - activeNote.startTimeSec);

  if (timeDiff > TIMING_WINDOW_SEC) return "pending";

  if (notesMatchPitchClass(detectedMidi, activeNote.midiNote)) {
    return "correct";
  }

  return "wrong";
}

export function calculateAccuracy(results: JudgementResult[]): number {
  if (results.length === 0) return 0;
  const judged = results.filter((r) => r.judgement !== "pending");
  if (judged.length === 0) return 0;
  const correct = judged.filter((r) => r.judgement === "correct").length;
  return (correct / judged.length) * 100;
}

export function getJudgementLabel(judgement: NoteJudgement): string {
  switch (judgement) {
    case "correct": return "正解";
    case "wrong": return "ミス";
    case "missed": return "見逃し";
    default: return "";
  }
}
