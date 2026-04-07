"use client";

import { useState } from "react";

interface AdjustableSliderProps {
  value: number;
  onChange: (value: number) => void;
  defaultMin: number;
  defaultMax: number;
  step?: number;
  accentColor?: string;
  formatLabel?: (v: number) => string;
  className?: string;
}

export function AdjustableSlider({
  value,
  onChange,
  defaultMin,
  defaultMax,
  step = 1,
  accentColor,
  formatLabel = (v) => String(v),
  className,
}: AdjustableSliderProps) {
  const [min, setMin] = useState(defaultMin);
  const [max, setMax] = useState(defaultMax);
  const [editingMin, setEditingMin] = useState(false);
  const [editingMax, setEditingMax] = useState(false);

  return (
    <div className={className}>
      <input
        dir="ltr"
        type="range"
        min={min}
        max={max}
        step={step}
        value={Math.min(max, Math.max(min, value))}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 cursor-pointer"
        style={accentColor ? { accentColor } : undefined}
      />
      <div className="flex justify-between text-[0.625rem] text-muted-foreground font-mono mt-0.5" dir="ltr">
        {editingMin ? (
          <input
            type="number"
            autoFocus
            defaultValue={min}
            onBlur={(e) => { setMin(Number(e.target.value) || defaultMin); setEditingMin(false); }}
            onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
            className="w-14 text-center text-[0.625rem] font-mono border border-primary/40 rounded px-1 bg-transparent focus:outline-none"
          />
        ) : (
          <button
            onClick={() => setEditingMin(true)}
            className="hover:text-primary transition-colors cursor-text"
            title="Click to adjust minimum"
          >
            {formatLabel(min)}
          </button>
        )}
        {editingMax ? (
          <input
            type="number"
            autoFocus
            defaultValue={max}
            onBlur={(e) => { setMax(Number(e.target.value) || defaultMax); setEditingMax(false); }}
            onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
            className="w-14 text-center text-[0.625rem] font-mono border border-primary/40 rounded px-1 bg-transparent focus:outline-none"
          />
        ) : (
          <button
            onClick={() => setEditingMax(true)}
            className="hover:text-primary transition-colors cursor-text"
            title="Click to adjust maximum"
          >
            {formatLabel(max)}
          </button>
        )}
      </div>
    </div>
  );
}
