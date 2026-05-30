"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { NoteEvent } from "@/lib/osmdUtils";

interface SheetMusicViewerProps {
  xmlUrl: string;
  startMeasure: number;
  endMeasure: number;
  notes: NoteEvent[];
  elapsedSec: number;
  onReady?: (totalMeasures: number) => void;
}

export default function SheetMusicViewer({
  xmlUrl,
  startMeasure,
  endMeasure,
  notes,
  elapsedSec,
  onReady,
}: SheetMusicViewerProps) {
  const clipRef  = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  const osmdRef       = useRef<InstanceType<typeof import("opensheetmusicdisplay").OpenSheetMusicDisplay> | null>(null);
  const noteXRef      = useRef<number[]>([]);
  const initialXRef   = useRef(0);
  const cancelRef     = useRef<(() => void) | null>(null); // cancels in-flight render

  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg,  setErrorMsg]  = useState<string | null>(null);

  // ── Scroll: direct DOM write, no React state ──────────────────────────────
  useEffect(() => {
    const positions = noteXRef.current;
    const sheet = sheetRef.current;
    const clip  = clipRef.current;
    if (!positions.length || !sheet || !clip) return;

    const centerX = clip.offsetWidth / 2;

    if (elapsedSec <= 0) {
      sheet.style.transform = `translateX(${initialXRef.current}px)`;
      return;
    }

    let noteIdx = 0;
    let noteProg = 0;
    for (let i = 0; i < notes.length; i++) {
      if (notes[i].startTimeSec <= elapsedSec) {
        noteIdx = i;
        const dur = notes[i].durationSec || 0.25;
        noteProg = Math.min(1, (elapsedSec - notes[i].startTimeSec) / dur);
      } else break;
    }

    const x0 = positions[noteIdx]     ?? positions[positions.length - 1];
    const x1 = positions[noteIdx + 1] ?? x0;
    sheet.style.transform = `translateX(${centerX - (x0 + (x1 - x0) * noteProg)}px)`;
  }, [elapsedSec, notes]);

  // ── Render OSMD ───────────────────────────────────────────────────────────
  const renderScore = useCallback(async () => {
    // Cancel any previous in-flight render
    cancelRef.current?.();
    let cancelled = false;
    cancelRef.current = () => { cancelled = true; };

    const sheet = sheetRef.current;
    const clip  = clipRef.current;
    if (!sheet || !clip) return;

    // Synchronously clear before going async (prevents Strict Mode double-append)
    if (osmdRef.current) osmdRef.current = null;
    sheet.innerHTML = "";
    sheet.style.width = `${clip.offsetWidth || 600}px`;
    noteXRef.current = [];
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const { OpenSheetMusicDisplay } = await import("opensheetmusicdisplay");
      if (cancelled) return;

      const osmd = new OpenSheetMusicDisplay(sheet, {
        autoResize: false,
        autoBeam: false,
        drawTitle: false,
        drawComposer: false,
        drawCredits: false,
        drawPartNames: false,
        drawMeasureNumbers: true,
        measureNumberInterval: 1,
        pageFormat: "Endless",
        drawingParameters: "compact",
        drawFromMeasureNumber: startMeasure + 1,
        drawUpToMeasureNumber: endMeasure,
      });
      osmd.zoom = 3.0;

      const res = await fetch(xmlUrl);
      if (cancelled) return;
      if (!res.ok) throw new Error(`楽譜ファイルの取得失敗 (${res.status})`);

      await osmd.load(await res.text());
      if (cancelled) return;

      osmd.render();
      if (cancelled) { sheet.innerHTML = ""; return; }

      osmdRef.current = osmd;

      // Wait one frame so SVG is painted before measuring
      await new Promise<void>((r) => requestAnimationFrame(() => r()));
      if (cancelled) return;

      // Collect cursor X positions
      const positions: number[] = [];
      const sheetRect = sheet.getBoundingClientRect();

      osmd.cursor.reset();
      osmd.cursor.show();
      for (let guard = 0; !osmd.cursor.iterator.EndReached && guard < 500; guard++) {
        const el = osmd.cursor.cursorElement as HTMLElement | null;
        if (el) {
          const r = el.getBoundingClientRect();
          positions.push(r.left - sheetRect.left + r.width / 2);
        }
        osmd.cursor.next();
      }
      osmd.cursor.reset();
      osmd.cursor.hide();
      if (cancelled) return;

      noteXRef.current = positions;

      // Position first note at center
      if (positions.length > 0) {
        const init = clip.offsetWidth / 2 - positions[0];
        initialXRef.current = init;
        sheet.style.transform = `translateX(${init}px)`;
      }

      const totalMeasures = osmd.Sheet?.SourceMeasures?.length ?? 0;
      onReady?.(totalMeasures);
      setIsLoading(false);
    } catch (err) {
      if (!cancelled) {
        setErrorMsg(err instanceof Error ? err.message : String(err));
        setIsLoading(false);
      }
    }
  }, [xmlUrl, startMeasure, endMeasure, onReady]);

  useEffect(() => {
    renderScore();
    return () => { cancelRef.current?.(); };
  }, [renderScore]);

  return (
    <div
      ref={clipRef}
      className="relative w-full bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
      style={{ height: "280px" }}
    >
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center gap-3 bg-white z-20">
          <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-indigo-600" />
          <span className="text-gray-500 text-sm">楽譜を読み込み中...</span>
        </div>
      )}

      {errorMsg && !isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 bg-white z-20">
          <span className="text-red-500 text-sm font-medium">楽譜の読み込みに失敗しました</span>
          <span className="text-gray-400 text-xs text-center">{errorMsg}</span>
          <button onClick={renderScore}
            className="mt-2 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 text-xs hover:bg-indigo-100">
            再試行
          </button>
        </div>
      )}

      {/* Scrolling sheet */}
      <div
        ref={sheetRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          willChange: "transform",
          visibility: isLoading || errorMsg ? "hidden" : "visible",
        }}
      />

      {/* Center playhead */}
      {!isLoading && !errorMsg && (
        <div className="absolute inset-y-0 pointer-events-none z-10"
          style={{ left: "50%", transform: "translateX(-50%)" }}>
          <div className="w-0.5 h-full bg-indigo-500 opacity-80" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-indigo-500" />
        </div>
      )}

      {/* Fade edges */}
      {!isLoading && !errorMsg && (
        <>
          <div className="absolute inset-y-0 left-0 w-20 pointer-events-none z-10"
            style={{ background: "linear-gradient(to right, white 20%, transparent)" }} />
          <div className="absolute inset-y-0 right-0 w-20 pointer-events-none z-10"
            style={{ background: "linear-gradient(to left, white 20%, transparent)" }} />
        </>
      )}
    </div>
  );
}
