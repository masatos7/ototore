"use client";

import { useEffect, useState } from "react";

interface JudgementOverlayProps {
  judgement: "correct" | "wrong" | null;
}

export default function JudgementOverlay({ judgement }: JudgementOverlayProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (judgement) {
      setVisible(true);
      const t = setTimeout(() => setVisible(false), 350);
      return () => clearTimeout(t);
    }
  }, [judgement]);

  if (!visible || !judgement) return null;

  return (
    <div
      className={`fixed inset-0 flex items-center justify-center pointer-events-none z-50`}
    >
      <div
        className={`text-6xl font-black rounded-2xl px-8 py-4 animate-bounce ${
          judgement === "correct"
            ? "text-green-500 bg-green-50 border-4 border-green-300"
            : "text-red-500 bg-red-50 border-4 border-red-300"
        }`}
      >
        {judgement === "correct" ? "✓" : "✗"}
      </div>
    </div>
  );
}
