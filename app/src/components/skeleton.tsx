"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

export function Skeleton({ className, style }: SkeletonProps) {
  return (
    <div
      className={cn("skeleton", className)}
      style={{
        background: "linear-gradient(90deg, var(--surface) 25%, var(--surface-elevated) 50%, var(--surface) 75%)",
        backgroundSize: "200% 100%",
        animation: "shimmer 1.5s ease-in-out infinite",
        borderRadius: "var(--radius)",
        ...style,
      }}
      aria-hidden="true"
    />
  );
}

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          style={{
            height: "1rem",
            width: i === lines - 1 ? "60%" : "100%",
          }}
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={cn("card p-6 flex flex-col gap-4", className)}
      style={{ borderColor: "var(--border)" }}
    >
      <Skeleton style={{ height: "2rem", width: "40%" }} />
      <SkeletonText lines={3} />
    </div>
  );
}

export function SkeletonChart({ height = 300, className }: { height?: number; className?: string }) {
  return (
    <div
      className={cn("chart-container flex items-end gap-2 p-6", className)}
      style={{ height }}
    >
      {[60, 80, 45, 90, 70, 55, 85, 65].map((h, i) => (
        <Skeleton
          key={i}
          style={{
            flex: 1,
            height: `${h}%`,
            borderRadius: "var(--radius) var(--radius) 0 0",
          }}
        />
      ))}
    </div>
  );
}

export function SkeletonStat({ className }: { className?: string }) {
  return (
    <div className={cn("card p-6 flex flex-col gap-3", className)}>
      <Skeleton style={{ height: "0.875rem", width: "50%" }} />
      <Skeleton style={{ height: "3rem", width: "70%" }} />
      <Skeleton style={{ height: "0.75rem", width: "40%" }} />
    </div>
  );
}
