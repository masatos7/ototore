"use client";

import { useEffect, useState } from "react";
import { getNoteGrade } from "@/lib/judgement";

interface JudgementOverlayProps {
  judgement: "correct" | "wrong" | null;
  score?: number;
}

export default function JudgementOverlay({ judgement, score = 0 }: JudgementOverlayProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (judgement) {
      setVisible(true);
      const t = setTimeout(() => setVisible(false), 350);
      return () => clearTimeout(t);
    }
  }, [judgement]);

  if (!visible || !judgement) return null;

  if (judgement === "wrong") {
    return (
      <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-50">
        <div className="text-6xl font-black rounded-2xl px-8 py-4 animate-bounce text-red-500 bg-red-50 border-4 border-red-300">
          ✗
        </div>
      </div>
    );
  }

  const grade = getNoteGrade(score);
  const gradeStyles = {
    Perfect: "text-yellow-500 bg-yellow-50 border-yellow-300",
    Great:   "text-indigo-500 bg-indigo-50 border-indigo-300",
    Good:    "text-green-500 bg-green-50 border-green-300",
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-50">
      <div className={`rounded-2xl px-8 py-4 animate-bounce border-4 text-center ${gradeStyles[grade]}`}>
        <div className="text-4xl font-black">{grade}</div>
        <div className="text-2xl font-bold">+{score}</div>
      </div>
    </div>
  );
}
