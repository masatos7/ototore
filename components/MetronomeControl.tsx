"use client";

interface MetronomeControlProps {
  bpm: number;
  onBpmChange: (bpm: number) => void;
  disabled?: boolean;
}

export default function MetronomeControl({
  bpm,
  onBpmChange,
  disabled = false,
}: MetronomeControlProps) {
  return (
    <div className="flex flex-col gap-2 bg-white rounded-xl px-5 py-3 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500 font-medium">スピード (BPM)</span>
        <span className="text-sm font-bold text-gray-800">{bpm}</span>
      </div>
      <input
        type="range"
        min={40}
        max={200}
        value={bpm}
        onChange={(e) => onBpmChange(Number(e.target.value))}
        disabled={disabled}
        className="w-full h-2 accent-indigo-600"
      />
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400">40</span>
        <div className="flex gap-1">
          {[60, 80, 100, 120].map((preset) => (
            <button
              key={preset}
              onClick={() => onBpmChange(preset)}
              disabled={disabled}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                bpm === preset
                  ? "bg-indigo-100 text-indigo-700"
                  : "bg-gray-50 text-gray-500 hover:bg-gray-100"
              }`}
            >
              {preset}
            </button>
          ))}
        </div>
        <span className="text-xs text-gray-400">200</span>
      </div>
    </div>
  );
}
