"use client";

import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function SectionHeader({
  title,
  subtitle,
  action,
  className,
  size = "md",
}: SectionHeaderProps) {
  const titleSize = {
    sm: "text-lg font-semibold",
    md: "text-2xl font-bold",
    lg: "text-3xl font-bold",
  }[size];

  return (
    <div className={cn("flex items-start justify-between gap-4", className)}>
      <div className="flex flex-col gap-1">
        <h2
          className={titleSize}
          style={{
            color: "var(--text-primary)",
            letterSpacing: "-0.01em",
            lineHeight: "1.2",
          }}
        >
          {title}
        </h2>
        {subtitle && (
          <p
            className="text-sm leading-relaxed"
            style={{ color: "var(--text-secondary)" }}
          >
            {subtitle}
          </p>
        )}
      </div>
      {action && (
        <div className="flex-shrink-0 flex items-center gap-2">{action}</div>
      )}
    </div>
  );
}
