import { create } from "zustand";
import { persist } from "zustand/middleware";

interface MeasureSegmentProgress {
  startMeasure: number;
  endMeasure: number;
  passed: boolean;
  bestAccuracy: number;
  attempts: number;
}

interface PieceProgress {
  slug: string;
  segments: MeasureSegmentProgress[];
  currentPhase: number;
  unlockedSegmentIndex: number;
  segmentSize: 2 | 4 | 8 | 16;
}

interface ScoreReadingProgress {
  level: number;
  pieceSlug: string;
  bestAccuracy: number;
  attempts: number;
  passed: boolean;
}

interface ProgressState {
  songMaster: Record<string, PieceProgress>;
  scoreReading: Record<string, ScoreReadingProgress>;
  initPieceProgress: (slug: string, totalMeasures: number) => void;
  setSegmentSize: (slug: string, totalMeasures: number, size: 2 | 4 | 8 | 16) => void;
  updateSegment: (slug: string, segmentIndex: number, accuracy: number) => void;
  updateScoreReading: (key: string, accuracy: number, level: number, pieceSlug: string) => void;
}

function buildSegments(totalMeasures: number, segmentSize: number): MeasureSegmentProgress[] {
  const segments: MeasureSegmentProgress[] = [];
  for (let i = 0; i < totalMeasures; i += segmentSize) {
    segments.push({
      startMeasure: i,
      endMeasure: Math.min(i + segmentSize, totalMeasures),
      passed: false,
      bestAccuracy: 0,
      attempts: 0,
    });
  }
  return segments;
}

export const useProgressStore = create<ProgressState>()(
  persist(
    (set, get) => ({
      songMaster: {},
      scoreReading: {},

      initPieceProgress: (slug, totalMeasures) => {
        const existing = get().songMaster[slug];
        if (existing) return;
        set((state) => ({
          songMaster: {
            ...state.songMaster,
            [slug]: {
              slug,
              segments: buildSegments(totalMeasures, 4),
              currentPhase: 1,
              unlockedSegmentIndex: 0,
              segmentSize: 4,
            },
          },
        }));
      },

      setSegmentSize: (slug, totalMeasures, size) => {
        const existing = get().songMaster[slug];
        if (existing?.segmentSize === size) return;
        set((state) => ({
          songMaster: {
            ...state.songMaster,
            [slug]: {
              slug,
              segments: buildSegments(totalMeasures, size),
              currentPhase: 1,
              unlockedSegmentIndex: 0,
              segmentSize: size,
            },
          },
        }));
      },

      updateSegment: (slug, segmentIndex, accuracy) => {
        set((state) => {
          const piece = state.songMaster[slug];
          if (!piece) return state;

          const newSegments = [...piece.segments];
          const seg = { ...newSegments[segmentIndex] };
          seg.attempts += 1;
          seg.bestAccuracy = Math.max(seg.bestAccuracy, accuracy);
          const justPassed = accuracy >= 80;
          if (justPassed) seg.passed = true;
          newSegments[segmentIndex] = seg;

          // Unlock next segment if passed
          let unlockedIndex = piece.unlockedSegmentIndex;
          if (justPassed && segmentIndex === unlockedIndex) {
            unlockedIndex = Math.min(unlockedIndex + 1, newSegments.length - 1);
          }

          // Check if all segments in this phase are passed → advance phase
          const allPassed = newSegments.every((s) => s.passed);
          let currentPhase = piece.currentPhase;
          let nextSegments = newSegments;
          if (allPassed && currentPhase < 4) {
            currentPhase += 1;
            const newSize = currentPhase === 2 ? 8 : 9999;
            const totalM = newSegments[newSegments.length - 1].endMeasure;
            nextSegments = buildSegments(totalM, newSize);
            unlockedIndex = 0;
          }

          return {
            songMaster: {
              ...state.songMaster,
              [slug]: {
                ...piece,
                segments: nextSegments,
                currentPhase,
                unlockedSegmentIndex: unlockedIndex,
              },
            },
          };
        });
      },

      updateScoreReading: (key, accuracy, level, pieceSlug) => {
        set((state) => {
          const existing = state.scoreReading[key];
          return {
            scoreReading: {
              ...state.scoreReading,
              [key]: {
                level,
                pieceSlug,
                attempts: (existing?.attempts ?? 0) + 1,
                bestAccuracy: Math.max(existing?.bestAccuracy ?? 0, accuracy),
                passed: accuracy >= 80 || (existing?.passed ?? false),
              },
            },
          };
        });
      },
    }),
    { name: "piano-practice-progress", skipHydration: true }
  )
);
