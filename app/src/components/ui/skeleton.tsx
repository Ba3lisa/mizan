import { cn } from "@/lib/utils";

/**
 * Simple skeleton loading component.
 * Replaces boneyard-js — wraps children and shows placeholder when loading.
 */
export function Skeleton({
  loading,
  children,
  className,
  name: _name,
}: {
  loading: boolean;
  children: React.ReactNode;
  className?: string;
  name?: string;
}) {
  if (loading) {
    return (
      <div className={cn("animate-pulse space-y-3", className)}>
        <div className="h-4 bg-muted/40 rounded w-3/4" />
        <div className="h-4 bg-muted/40 rounded w-1/2" />
        <div className="h-32 bg-muted/30 rounded-lg" />
      </div>
    );
  }
  return <>{children}</>;
}

/** Simple inline skeleton bar (for use inside layouts). */
export function SkeletonBar({ className }: { className?: string }) {
  return <div className={cn("animate-pulse bg-muted/40 rounded", className)} />;
}
