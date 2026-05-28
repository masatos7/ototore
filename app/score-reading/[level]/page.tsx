"use client";

import { use, useState, useCallback } from "react";
import Link from "next/link";
import { PIECES, type Difficulty } from "@/lib/pieces";
import PracticeScreen from "@/components/PracticeScreen";
import { useProgressStore } from "@/store/progressStore";
import type { Piece } from "@/lib/pieces";

interface PageProps {
  params: Promise<{ level: string }>;
}

export default function ScoreReadingLevelPage({ params }: PageProps) {
  const { level: levelStr } = use(params);
  const level = Math.max(1, Math.min(20, parseInt(levelStr, 10))) as Difficulty;

  const [selectedPiece, setSelectedPiece] = useState<Piece | null>(null);
  const [currentMeasure, setCurrentMeasure] = useState(0);
  const [totalMeasures, setTotalMeasures] = useState(4);

  const { updateScoreReading } = useProgressStore();

  const candidatePieces = PIECES.filter(
    (p) => Math.abs(p.difficulty - level) <= 2
  );

  const availablePieces = candidatePieces.length > 0 ? candidatePieces : PIECES;

  const handleSelectPiece = (piece: Piece) => {
    setSelectedPiece(piece);
    setCurrentMeasure(0);
    setTotalMeasures(piece.totalMeasures);
  };

  const handleResult = useCallback(
    (accuracy: number, passed: boolean, _wrongCount: number) => {
      if (!selectedPiece) return;
      const key = `level-${level}`;
      updateScoreReading(key, accuracy, level, selectedPiece.slug);

      if (passed) {
        const next = currentMeasure + 4;
        if (next < totalMeasures) {
          setCurrentMeasure(next);
        }
      }
    },
    [selectedPiece, level, currentMeasure, totalMeasures, updateScoreReading]
  );

  if (selectedPiece) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-blue-50">
        <div className="max-w-3xl mx-auto px-4 py-8">
          <PracticeScreen
            piece={selectedPiece}
            startMeasure={currentMeasure}
            endMeasure={Math.min(currentMeasure + 4, totalMeasures)}
            alwaysAdvance
            onResult={handleResult}
            onBack={() => setSelectedPiece(null)}
          />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-blue-50">
      <div className="max-w-2xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Link href="/score-reading" className="p-2 rounded-lg hover:bg-white text-gray-500">
            ←
          </Link>
          <div>
            <h1 className="text-2xl font-black text-gray-800">Level {level}</h1>
            <p className="text-sm text-gray-500">練習する曲を選んでください</p>
          </div>
        </div>

        {/* Piece List */}
        <div className="grid gap-3">
          {availablePieces.map((piece) => (
            <button
              key={piece.slug}
              onClick={() => handleSelectPiece(piece)}
              className="w-full text-left bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:border-indigo-200 hover:shadow-md transition-all"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-lg flex-shrink-0">
                  🎵
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-gray-800 truncate">{piece.title}</div>
                  <div className="text-sm text-gray-500">{piece.composer}</div>
                  <p className="text-xs text-gray-400 mt-1 line-clamp-1">{piece.description}</p>
                </div>
                <div className="flex-shrink-0 flex flex-col items-end gap-1">
                  <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 text-xs font-medium">
                    Lv.{piece.difficulty}
                  </span>
                  <span className="text-xs text-gray-400">BPM {piece.bpm}</span>
                </div>
              </div>
            </button>
          ))}
        </div>

        {availablePieces.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <div className="text-4xl mb-3">🎼</div>
            <p>このレベルの曲はまだ追加されていません</p>
          </div>
        )}
      </div>
    </main>
  );
}
