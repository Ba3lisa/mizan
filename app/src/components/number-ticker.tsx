"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView, useSpring, useTransform } from "framer-motion";

interface NumberTickerProps {
  value: number;
  direction?: "up" | "down";
  delay?: number;
  decimals?: number;
  className?: string;
  /** Optional format function for the displayed number */
  format?: (n: number) => string;
}

export function NumberTicker({
  value,
  direction = "up",
  delay = 0,
  decimals = 0,
  className,
  format,
}: NumberTickerProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    if (isInView) {
      const timer = setTimeout(() => setHasStarted(true), delay * 1000);
      return () => clearTimeout(timer);
    }
  }, [isInView, delay]);

  const spring = useSpring(direction === "down" ? value : 0, {
    bounce: 0,
    duration: 1800,
  });

  const display = useTransform(spring, (current) => {
    const n = Math.round(current * Math.pow(10, decimals)) / Math.pow(10, decimals);
    if (format) return format(n);
    return decimals > 0
      ? n.toFixed(decimals)
      : n.toLocaleString();
  });

  useEffect(() => {
    if (hasStarted) {
      spring.set(direction === "down" ? 0 : value);
    }
  }, [hasStarted, spring, value, direction]);

  return (
    <motion.span ref={ref} className={className}>
      {display}
    </motion.span>
  );
}
