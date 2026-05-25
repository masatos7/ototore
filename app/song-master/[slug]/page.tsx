"use client";

import { use, useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { getPieceBySlug } from "@/lib/pieces";
import PracticeScreen from "@/components/PracticeScreen";
import { useProgressStore } from "@/store/progressStore";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default function SongMasterPiecePage({ params }: PageProps) {
  const { slug } = use(params);
  const piece = getPieceBySlug(slug);
  const { songMaster, initPieceProgress, updateSegment } = useProgressStore();
  const [practicing, setPracticing] = useState(false);

  useEffect(() => {
    useProgressStore.persist.rehydrate();
  }, []);

  useEffect(() => {
    if (piece) {
      initPieceProgress(slug, piece.totalMeasures);
    }
  }, [slug, piece, initPieceProgress]);

  const progress = songMaster[slug];

  const handleResult = useCallback(
    (accuracy: number, passed: boolean) => {
      if (!progress) return;
      updateSegment(slug, progress.unlockedSegmentIndex, accuracy);
      setPracticing(false);
    },
    [slug, progress, updateSegment]
  );

  if (!piece) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center text-gray-500">
          <p>曲が見つかりません</p>
          <Link href="/song-master" className="text-purple-600 underline mt-2 block">
            一覧に戻る
          </Link>
        </div>
      </main>
    );
  }

  if (!progress) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
      </main>
    );
  }

  const currentSegment = progress.segments[progress.unlockedSegmentIndex];
  const phaseLabel = ["", "4小節", "8小節", "全曲"][progress.currentPhase] ?? "4小節";

  if (practicing && currentSegment) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
        <div className="max-w-3xl mx-auto px-4 py-8">
          <PracticeScreen
            piece={piece}
            startMeasure={currentSegment.startMeasure}
            endMeasure={currentSegment.endMeasure}
            onResult={handleResult}
            onBack={() => setPracticing(false)}
          />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
      <div className="max-w-2xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/song-master" className="p-2 rounded-lg hover:bg-white text-gray-500">
            ←
          </Link>
          <div>
            <h1 className="text-xl font-black text-gray-800">{piece.title}</h1>
            <p className="text-sm text-gray-500">{piece.composer}</p>
          </div>
          <div className="ml-auto">
            <span className="px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-sm font-medium">
              {phaseLabel} フェーズ
            </span>
          </div>
        </div>

        {/* Overall progress */}
        <div className="bg-white rounded-xl p-4 mb-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold text-gray-600">全体の進捗</span>
            <span className="text-sm text-gray-500">
              {progress.segments.filter((s) => s.passed).length}/{progress.segments.length} クリア
            </span>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-purple-400 rounded-full transition-all"
              style={{
                width: `${
                  (progress.segments.filter((s) => s.passed).length / progress.segments.length) * 100
                }%`,
              }}
            />
          </div>
        </div>

        {/* Segment Map */}
        <div className="grid gap-2 mb-6">
          {progress.segments.map((seg, i) => {
            const isUnlocked = i <= progress.unlockedSegmentIndex;
            const isCurrent = i === progress.unlockedSegmentIndex;

            return (
              <div
                key={i}
                className={`rounded-xl p-4 border transition-all ${
                  seg.passed
                    ? "bg-green-50 border-green-200"
                    : isCurrent
                    ? "bg-purple-50 border-purple-200 shadow-sm"
                    : isUnlocked
                    ? "bg-white border-gray-100"
                    : "bg-gray-50 border-gray-100 opacity-50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                      seg.passed
                        ? "bg-green-400 text-white"
                        : isCurrent
                        ? "bg-purple-500 text-white"
                        : "bg-gray-200 text-gray-500"
                    }`}
                  >
                    {seg.passed ? "✓" : isUnlocked ? i + 1 : "🔒"}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-700">
                      第{seg.startMeasure + 1}〜{seg.endMeasure}小節
                    </div>
                    {seg.attempts > 0 && (
                      <div className="text-xs text-gray-400">
                        最高 {Math.round(seg.bestAccuracy)}% · {seg.attempts}回挑戦
                      </div>
                    )}
                  </div>
                  {isCurrent && !seg.passed && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-600">
                      現在地
                    </span>
                  )}
                  {seg.passed && (
                    <span className="text-xs text-green-600 font-medium">クリア!</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Start button */}
        {currentSegment && !currentSegment.passed && (
          <button
            onClick={() => setPracticing(true)}
            className="w-full py-4 rounded-xl bg-purple-600 text-white font-bold text-lg hover:bg-purple-700 transition-colors shadow-md"
          >
            第{currentSegment.startMeasure + 1}〜{currentSegment.endMeasure}小節を練習する
          </button>
        )}

        {progress.segments.every((s) => s.passed) && (
          <div className="text-center py-8">
            <div className="text-5xl mb-3">🏆</div>
            <p className="text-xl font-black text-gray-800">マスター達成!</p>
            <p className="text-sm text-gray-500 mt-1">すべての小節をクリアしました</p>
          </div>
        )}
      </div>
    </main>
  );
}
