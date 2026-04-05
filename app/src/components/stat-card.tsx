"use client";

import { useEffect, useRef, useState } from "react";
import { TrendingUp, TrendingDown, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  source?: string;
  sourceUrl?: string;
  prefix?: string;
  suffix?: string;
  className?: string;
  animateCount?: boolean;
  large?: boolean;
}

function useCountUp(target: number, duration = 1400, active = true) {
  const [count, setCount] = useState(0);
  const frameRef = useRef<number>(0);
  useEffect(() => {
    if (!active) { setCount(target); return; }
    const start = performance.now();
    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      setCount(Math.round(target * eased * 10) / 10);
      if (progress < 1) frameRef.current = requestAnimationFrame(animate);
      else setCount(target);
    };
    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target, duration, active]);
  return count;
}

export function StatCard({
  label, value, subtitle, trend, trendValue, source, sourceUrl,
  prefix, suffix, className, animateCount = true, large = false,
}: StatCardProps) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const numericValue = typeof value === "number" ? value : parseFloat(String(value).replace(/[^0-9.]/g, ""));
  const isNumeric = !isNaN(numericValue) && animateCount;
  const count = useCountUp(numericValue, 1400, visible && isNumeric);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold: 0.2 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const displayValue = isNumeric
    ? (Number.isInteger(count) ? count.toLocaleString() : count.toLocaleString(undefined, { maximumFractionDigits: 1 }))
    : String(value);
  const resolvedUrl = sourceUrl || (source ? `https://${source}` : undefined);

  return (
    <div ref={ref} className={cn("relative", className)}>
      {trend && trend !== "neutral" && (
        <div className={cn(
          "text-xs font-semibold flex items-center gap-1 mb-2",
          trend === "up" && "text-emerald-600",
          trend === "down" && "text-red-600"
        )}>
          {trend === "up" ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {trendValue}
        </div>
      )}

      <p className="text-xs font-medium text-muted-foreground mb-1.5">
        {label}
      </p>

      <div className={cn("font-mono tabular-nums font-bold leading-none tracking-tight", large ? "text-4xl" : "text-3xl")}>
        {prefix && <span className="text-lg text-muted-foreground/60 me-0.5">{prefix}</span>}
        <span className="data-number">{displayValue}</span>
        {suffix && <span className="text-lg text-muted-foreground/60 ms-0.5">{suffix}</span>}
      </div>

      {subtitle && <p className="text-sm mt-1.5 text-muted-foreground">{subtitle}</p>}

      {source && resolvedUrl && (
        <a href={resolvedUrl} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-primary no-underline hover:underline mt-2">
          <ExternalLink size={10} />
          {source}
        </a>
      )}
    </div>
  );
}
