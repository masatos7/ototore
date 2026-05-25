"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { PIECES, getPiecesForLevel, type Difficulty, type Piece } from "@/lib/pieces";
import PracticeScreen from "@/components/PracticeScreen";
import { useProgressStore } from "@/store/progressStore";
import { useMounted } from "@/hooks/useMounted";

function getLevelLabel(level: number): string {
  if (level <= 4) return "入門";
  if (level <= 8) return "初級";
  if (level <= 12) return "中級";
  if (level <= 16) return "上級";
  return "難曲";
}

function getLevelColor(level: number): string {
  if (level <= 4)  return "bg-emerald-50 text-emerald-700";
  if (level <= 8)  return "bg-yellow-50 text-yellow-700";
  if (level <= 12) return "bg-red-50 text-red-700";
  if (level <= 16) return "bg-purple-50 text-purple-700";
  return "bg-gray-100 text-gray-700";
}

const DEFAULT_LEVEL = 10 as Difficulty;

export default function ScoreReadingPage() {
  const mounted = useMounted();
  const { scoreReading, updateScoreReading } = useProgressStore();

  useEffect(() => {
    useProgressStore.persist.rehydrate();
  }, []);

  const [selectedLevel, setSelectedLevel] = useState<Difficulty>(DEFAULT_LEVEL);
  const [selectedPiece, setSelectedPiece] = useState<Piece>(() => {
    const pieces = getPiecesForLevel(DEFAULT_LEVEL);
    return pieces[0] ?? PIECES[0];
  });
  const [segmentSize, setSegmentSize] = useState<2 | 4 | 8 | 16>(4);
  const [practicing, setPracticing] = useState(false);
  const [currentMeasure, setCurrentMeasure] = useState(0);

  const piecesForLevel = getPiecesForLevel(selectedLevel);

  const handleLevelChange = (level: Difficulty) => {
    setSelectedLevel(level);
    const pieces = getPiecesForLevel(level);
    setSelectedPiece(pieces[0] ?? PIECES[0]);
  };

  const handleStart = () => {
    setCurrentMeasure(0);
    setPracticing(true);
  };

  const handleResult = useCallback(
    (accuracy: number, passed: boolean) => {
      const key = `level-${selectedLevel}`;
      updateScoreReading(key, accuracy, selectedLevel, selectedPiece.slug);
      if (passed) {
        const next = currentMeasure + segmentSize;
        if (next < selectedPiece.totalMeasures) {
          setCurrentMeasure(next);
        }
      }
    },
    [selectedLevel, selectedPiece, currentMeasure, segmentSize, updateScoreReading]
  );

  if (practicing) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-blue-50">
        <div className="max-w-3xl mx-auto px-4 py-8">
          <PracticeScreen
            piece={selectedPiece}
            startMeasure={currentMeasure}
            endMeasure={Math.min(currentMeasure + segmentSize, selectedPiece.totalMeasures)}
            onResult={handleResult}
            onBack={() => setPracticing(false)}
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
          <Link href="/" className="p-2 rounded-lg hover:bg-white text-gray-500">←</Link>
          <div>
            <h1 className="text-2xl font-black text-gray-800">譜読み練習</h1>
            <p className="text-sm text-gray-500">レベルと曲を選んでスタート</p>
          </div>
        </div>

        {/* Level selector */}
        <section className="mb-6">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
            難易度レベル
          </h2>
          <div className="grid grid-cols-5 gap-2">
            {Array.from({ length: 20 }, (_, i) => {
              const level = (i + 1) as Difficulty;
              const isSelected = level === selectedLevel;
              const prog = mounted ? scoreReading[`level-${level}`] : undefined;
              return (
                <button
                  key={level}
                  onClick={() => handleLevelChange(level)}
                  className={`relative rounded-xl p-2.5 text-center transition-all text-sm font-bold
                    ${getLevelColor(level)}
                    ${isSelected
                      ? "ring-2 ring-indigo-500 ring-offset-1 shadow-md scale-105"
                      : "opacity-70 hover:opacity-100 hover:shadow-sm"
                    }`}
                >
                  {prog?.passed && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-green-500 text-white text-[9px] flex items-center justify-center">✓</span>
                  )}
                  <div className="text-base font-black">{level}</div>
                  <div className="text-[10px] font-medium leading-tight">{getLevelLabel(level)}</div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Piece selector */}
        <section className="mb-8">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
            曲を選ぶ
          </h2>
          <div className="grid gap-2">
            {piecesForLevel.map((piece) => {
              const isSelected = piece.slug === selectedPiece.slug;
              return (
                <button
                  key={piece.slug}
                  onClick={() => setSelectedPiece(piece)}
                  className={`w-full text-left rounded-xl p-4 transition-all
                    ${isSelected
                      ? "bg-white ring-2 ring-indigo-500 ring-offset-1 shadow-md"
                      : "bg-white/60 border border-gray-100 hover:bg-white hover:shadow-sm"
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-base flex-shrink-0
                      ${isSelected ? "bg-indigo-100" : "bg-gray-100"}`}>
                      🎵
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`font-bold truncate ${isSelected ? "text-indigo-800" : "text-gray-800"}`}>
                        {piece.title}
                      </div>
                      <div className="text-xs text-gray-500">{piece.composer}</div>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <div className={`text-xs font-bold px-2 py-0.5 rounded-full
                        ${isSelected ? "bg-indigo-100 text-indigo-600" : "bg-gray-100 text-gray-500"}`}>
                        Lv.{piece.difficulty}
                      </div>
                      <div className="text-[11px] text-gray-400 mt-0.5">BPM {piece.bpm}</div>
                    </div>
                  </div>
                  {isSelected && (
                    <p className="text-xs text-gray-400 mt-2 ml-12 line-clamp-1">{piece.description}</p>
                  )}
                </button>
              );
            })}
            {piecesForLevel.length === 0 && (
              <div className="text-center py-8 text-gray-400 text-sm">
                このレベルの曲はまだ追加されていません
              </div>
            )}
          </div>
        </section>

        {/* Segment size selector */}
        <section className="mb-6">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
            1回の練習範囲
          </h2>
          <div className="flex gap-2">
            {([2, 4, 8, 16] as const).map((n) => (
              <button
                key={n}
                onClick={() => setSegmentSize(n)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all
                  ${segmentSize === n
                    ? "bg-white ring-2 ring-indigo-500 ring-offset-1 text-indigo-700 shadow-md"
                    : "bg-white/60 border border-gray-200 text-gray-500 hover:bg-white hover:shadow-sm"
                  }`}
              >
                {n}小節
              </button>
            ))}
          </div>
        </section>

        {/* Start button */}
        <button
          onClick={handleStart}
          disabled={piecesForLevel.length === 0}
          className="w-full py-4 rounded-2xl bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-700
            text-white font-black text-lg shadow-md transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          ▶ 練習スタート
        </button>

      </div>
    </main>
  );
}
