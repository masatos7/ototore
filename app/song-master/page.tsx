"use client";

import { useEffect } from "react";
import Link from "next/link";
import { PIECES } from "@/lib/pieces";
import { useProgressStore } from "@/store/progressStore";
import { useMounted } from "@/hooks/useMounted";

export default function SongMasterPage() {
  const mounted = useMounted();
  const { songMaster, initPieceProgress } = useProgressStore();

  useEffect(() => {
    useProgressStore.persist.rehydrate();
  }, []);

  const handlePieceClick = (slug: string, totalMeasures: number) => {
    initPieceProgress(slug, totalMeasures);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
      <div className="max-w-2xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Link href="/" className="p-2 rounded-lg hover:bg-white text-gray-500">
            ←
          </Link>
          <div>
            <h1 className="text-2xl font-black text-gray-800">曲マスター</h1>
            <p className="text-sm text-gray-500">2小節ずつ攻略して曲全体をマスターしよう</p>
          </div>
        </div>

        {/* How it works */}
        <div className="bg-white rounded-xl p-4 mb-6 border border-gray-100 shadow-sm">
          <h2 className="text-sm font-bold text-gray-600 mb-2">進め方</h2>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-600 border border-purple-100">2小節</span>
            <span>→</span>
            <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-600 border border-purple-100">4小節</span>
            <span>→</span>
            <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-600 border border-purple-100">8小節</span>
            <span>→</span>
            <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-700 border border-purple-200 font-bold">全曲 🏆</span>
          </div>
          <p className="text-xs text-gray-400 mt-2">正解率 80% 以上でクリア → 次のセグメントへ</p>
        </div>

        {/* Piece List */}
        <div className="grid gap-4">
          {PIECES.sort((a, b) => a.difficulty - b.difficulty).map((piece) => {
            const progress = mounted ? songMaster[piece.slug] : undefined;
            const passedCount = progress?.segments.filter((s) => s.passed).length ?? 0;
            const totalSegments = progress?.segments.length ?? 0;
            const phase = progress?.currentPhase ?? 1;
            const phaseLabel = ["", "2小節", "4小節", "8小節", "全曲"][phase] ?? "2小節";
            const completionRate = totalSegments > 0 ? passedCount / totalSegments : 0;

            return (
              <Link
                key={piece.slug}
                href={`/song-master/${piece.slug}`}
                onClick={() => handlePieceClick(piece.slug, piece.totalMeasures)}
                className="group"
              >
                <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:border-purple-200 hover:shadow-md transition-all">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center text-lg flex-shrink-0 group-hover:bg-purple-100 transition-colors">
                      {completionRate >= 1 ? "🏆" : "🎵"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-800 truncate">{piece.title}</span>
                        {completionRate >= 1 && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-700 border border-yellow-200 flex-shrink-0">
                            MASTER
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">{piece.composer}</div>

                      {/* Progress bar */}
                      <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-purple-400 rounded-full transition-all"
                          style={{ width: `${completionRate * 100}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-gray-400">
                          {progress ? `${passedCount}/${totalSegments} クリア` : "未開始"}
                        </span>
                        <span className="text-xs text-purple-500 font-medium">
                          {phaseLabel} フェーズ
                        </span>
                      </div>
                    </div>
                    <div className="flex-shrink-0 flex flex-col items-end gap-1">
                      <span className="px-2 py-0.5 rounded-full bg-gray-50 text-gray-500 text-xs">
                        Lv.{piece.difficulty}
                      </span>
                      <span className="text-xs text-gray-400">{piece.totalMeasures}小節</span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}
