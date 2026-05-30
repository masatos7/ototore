"use client";

import { useEffect, useRef, useState } from "react";
import type { Piece } from "@/lib/pieces";

interface Props {
  piece: Piece;
  onClose: () => void;
}

export default function PrintScoreModal({ piece, onClose }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;
    container.innerHTML = "";
    setIsLoading(true);
    setError(null);

    (async () => {
      try {
        const { OpenSheetMusicDisplay } = await import("opensheetmusicdisplay");
        if (cancelled) return;

        const osmd = new OpenSheetMusicDisplay(container, {
          autoResize: false,
          autoBeam: false,
          drawTitle: true,
          drawComposer: true,
          drawCredits: false,
          drawPartNames: true,
          drawMeasureNumbers: true,
          measureNumberInterval: 4,
          pageFormat: "A4_P",
          drawingParameters: "default",
        });
        osmd.zoom = 1.0;

        const res = await fetch(piece.xmlPath);
        if (cancelled) return;
        if (!res.ok) throw new Error(`楽譜の取得に失敗しました (${res.status})`);

        await osmd.load(await res.text());
        if (cancelled) return;
        osmd.render();
        if (!cancelled) setIsLoading(false);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
          setIsLoading(false);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [piece.xmlPath]);

  const handlePrint = () => {
    const content = containerRef.current?.innerHTML;
    if (!content) return;

    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) return;

    win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${piece.title} — ${piece.composer}</title>
  <style>
    body { margin: 0; padding: 0; background: white; }
    @page { margin: 12mm; }
    @media print { body { margin: 0; } }
  </style>
</head>
<body>
  ${content}
  <script>
    window.onload = function() { window.print(); };
  <\/script>
</body>
</html>`);
    win.document.close();
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center">
      <div className="bg-white rounded-2xl w-full max-w-2xl mx-4 max-h-[90dvh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div>
            <div className="font-bold text-gray-800">{piece.title}</div>
            <div className="text-xs text-gray-500">{piece.composer}</div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              disabled={isLoading || !!error}
              className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              印刷する
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 text-lg leading-none"
            >
              ✕
            </button>
          </div>
        </div>

        {/* OSMD render area */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
          {isLoading && (
            <div className="flex items-center justify-center h-48 gap-3">
              <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-indigo-600" />
              <span className="text-gray-500 text-sm">楽譜を読み込み中...</span>
            </div>
          )}
          {error && (
            <div className="flex items-center justify-center h-48 text-red-500 text-sm">
              {error}
            </div>
          )}
          <div
            ref={containerRef}
            className="bg-white rounded-xl overflow-hidden"
            style={{ visibility: isLoading || error ? "hidden" : "visible" }}
          />
        </div>
      </div>
    </div>
  );
}
