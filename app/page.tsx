import Link from "next/link";
import Image from "next/image";
import { PIECES } from "@/lib/pieces";

export default function Home() {
  const pieceCount = PIECES.length;

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="max-w-2xl mx-auto px-4 py-12">
        {/* Logo / Title */}
        <div className="flex items-center justify-center gap-2 mb-10">
          <Image
            src="/images/top-logo.png"
            alt="音トレピアノ"
            width={280}
            height={140}
            priority
          />
          <Image
            src="/images/top-img.png"
            alt=""
            width={180}
            height={180}
            priority
          />
        </div>

        {/* Menu Cards */}
        <div className="grid gap-5">
          {/* 譜読み練習 */}
          <Link href="/score-reading" className="group">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md hover:border-indigo-200 transition-all">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-indigo-100 flex items-center justify-center text-2xl group-hover:bg-indigo-200 transition-colors">
                  🎵
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-gray-800">譜読み練習</h2>
                  <p className="text-sm text-gray-500 mt-0.5">
                    難易度 1〜20 の中からチャレンジ。苦手なパターンを集中練習。
                  </p>
                </div>
                <span className="text-gray-300 group-hover:text-indigo-400 text-xl transition-colors">›</span>
              </div>
              <div className="mt-4 flex gap-1">
                {Array.from({ length: 20 }, (_, i) => (
                  <div key={i} className="h-1.5 rounded-full flex-1 bg-indigo-100" />
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-2">20 難易度レベル · {pieceCount} 曲収録</p>
            </div>
          </Link>

          {/* 曲マスター */}
          <Link href="/song-master" className="group">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md hover:border-purple-200 transition-all">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-purple-100 flex items-center justify-center text-2xl group-hover:bg-purple-200 transition-colors">
                  🏆
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-gray-800">曲マスター</h2>
                  <p className="text-sm text-gray-500 mt-0.5">
                    2小節ずつ正確に弾いて、少しずつ曲全体をマスターしよう。
                  </p>
                </div>
                <span className="text-gray-300 group-hover:text-purple-400 text-xl transition-colors">›</span>
              </div>
              <div className="mt-4 flex items-center gap-3">
                <div className="flex gap-1">
                  {["2小節", "4小節", "8小節", "全曲"].map((label, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded text-xs bg-purple-50 text-purple-600 border border-purple-100"
                    >
                      {label}
                    </span>
                  ))}
                </div>
                <span className="text-gray-400 text-xs">→ ステップアップ</span>
              </div>
              <p className="text-xs text-gray-400 mt-2">{pieceCount} 曲収録 · 進捗が保存されます</p>
            </div>
          </Link>
        </div>

        {/* Footer info */}
        <div className="mt-10 text-center text-xs text-gray-400">
          <p>著作権フリーのクラシック名曲を収録</p>
          <p className="mt-1">マイクへのアクセスが必要です</p>
        </div>
      </div>
    </main>
  );
}
