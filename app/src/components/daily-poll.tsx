"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useLanguage } from "@/components/providers";
import Link from "next/link";
import { Clock, CheckCircle2, Vote, Flame, Users, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import type { Id } from "../../convex/_generated/dataModel";

// ─── VISITOR ID (anonymous, localStorage-based) ──────────────────────────────

/**
 * Generate a stable browser fingerprint that survives localStorage clears
 * and incognito mode. Based on hardware/browser properties that don't change.
 * Not perfect (same device + same browser = same hash) but blocks casual abuse.
 */
function getVisitorHash(): string {
  if (typeof window === "undefined") return "";

  // Try cached fingerprint first (faster)
  const cached = localStorage.getItem("mizan-visitor-hash");
  if (cached && cached.length > 20) return cached;

  // Generate stable fingerprint from browser properties
  const components = [
    navigator.language,
    navigator.languages?.join(","),
    screen.width + "x" + screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    navigator.hardwareConcurrency,
    navigator.maxTouchPoints,
    navigator.platform,
    // Canvas fingerprint (renders text and hashes the pixel data)
    (() => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 200;
        canvas.height = 50;
        const ctx = canvas.getContext("2d");
        if (!ctx) return "no-canvas";
        ctx.textBaseline = "top";
        ctx.font = "14px Arial";
        ctx.fillStyle = "#f60";
        ctx.fillRect(0, 0, 200, 50);
        ctx.fillStyle = "#069";
        ctx.fillText("mizanmasr.com", 2, 2);
        return canvas.toDataURL().slice(-50);
      } catch {
        return "canvas-err";
      }
    })(),
    // WebGL renderer
    (() => {
      try {
        const canvas = document.createElement("canvas");
        const gl = canvas.getContext("webgl");
        if (!gl) return "no-webgl";
        const ext = gl.getExtension("WEBGL_debug_renderer_info");
        return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : "webgl-ok";
      } catch {
        return "webgl-err";
      }
    })(),
  ].join("|");

  // Hash the components into a stable string
  let hash = 0;
  for (let i = 0; i < components.length; i++) {
    const char = components.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  const fingerprint = "fp_" + Math.abs(hash).toString(36) + "_" + components.length.toString(36);

  // Cache it (speeds up subsequent visits, but fingerprint regenerates if cleared)
  try { localStorage.setItem("mizan-visitor-hash", fingerprint); } catch { /* ignore */ }
  return fingerprint;
}

// ─── COUNTDOWN HOOK ──────────────────────────────────────────────────────────

function useCountdown(expiresAt: number) {
  const [remaining, setRemaining] = useState(() => Math.max(0, expiresAt - Date.now()));

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining(Math.max(0, expiresAt - Date.now()));
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  const hours = Math.floor(remaining / (1000 * 60 * 60));
  const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

  return { hours, minutes, seconds, isExpired: remaining <= 0 };
}

// ─── CATEGORY ICONS & COLORS ─────────────────────────────────────────────────

const categoryConfig: Record<string, { color: string; bgColor: string; labelAr: string; labelEn: string }> = {
  economy: { color: "text-emerald-400", bgColor: "bg-emerald-400/10", labelAr: "اقتصاد", labelEn: "Economy" },
  budget: { color: "text-amber-400", bgColor: "bg-amber-400/10", labelAr: "موازنة", labelEn: "Budget" },
  debt: { color: "text-red-400", bgColor: "bg-red-400/10", labelAr: "ديون", labelEn: "Debt" },
  parliament: { color: "text-blue-400", bgColor: "bg-blue-400/10", labelAr: "برلمان", labelEn: "Parliament" },
  government: { color: "text-purple-400", bgColor: "bg-purple-400/10", labelAr: "حكومة", labelEn: "Government" },
  constitution: { color: "text-orange-400", bgColor: "bg-orange-400/10", labelAr: "دستور", labelEn: "Constitution" },
  general: { color: "text-sky-400", bgColor: "bg-sky-400/10", labelAr: "عام", labelEn: "General" },
};

// ─── OPTION COLORS (for result bars) ─────────────────────────────────────────

const optionColors = [
  "from-primary/80 to-primary/40",
  "from-emerald-500/80 to-emerald-500/40",
  "from-amber-500/80 to-amber-500/40",
  "from-purple-500/80 to-purple-500/40",
  "from-rose-500/80 to-rose-500/40",
];

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

export function DailyPoll({ compact: _compact = false }: { compact?: boolean } = {}) {
  const { lang } = useLanguage();
  const isAr = lang === "ar";

  const poll = useQuery(api.polls.getActivePoll);
  const visitorHash = useMemo(() => getVisitorHash(), []);
  const voteStatus = useQuery(
    api.polls.checkIfVoted,
    poll ? { pollId: poll._id, visitorHash } : "skip"
  );
  const submitVote = useMutation(api.polls.submitVote);

  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [isVoting, setIsVoting] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [voteAnimation, setVoteAnimation] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Sync with server vote status
  useEffect(() => {
    if (voteStatus?.voted) {
      setHasVoted(true);
      setSelectedOption(voteStatus.optionIndex);
      setShowResults(true);
    }
  }, [voteStatus]);

  const handleVote = useCallback(async (optionIndex: number) => {
    if (!poll || hasVoted || isVoting) return;

    setSelectedOption(optionIndex);
    setIsVoting(true);
    setVoteAnimation(true);

    try {
      const result = await submitVote({
        pollId: poll._id as Id<"polls">,
        optionIndex,
        visitorHash,
      });

      if (result.success) {
        setHasVoted(true);
        setTimeout(() => setShowResults(true), 600);
      } else if (result.reason === "already_voted") {
        setHasVoted(true);
        setShowResults(true);
      }
    } catch {
      setSelectedOption(null);
    } finally {
      setIsVoting(false);
      setTimeout(() => setVoteAnimation(false), 800);
    }
  }, [poll, hasVoted, isVoting, submitVote, visitorHash]);

  // No poll available
  if (poll === undefined) {
    return <PollSkeleton />;
  }
  if (poll === null) {
    return null;
  }

  const catConfig = categoryConfig[poll.category] || categoryConfig.general;

  return (
    <div className="relative group">
      {/* Glow effect */}
      <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/20 via-primary/5 to-primary/20 rounded-2xl blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      <div className="relative border border-border/60 rounded-2xl bg-card/80 backdrop-blur-sm overflow-hidden">
        {/* Header bar */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-full flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-primary/10 via-transparent to-primary/5 border-b border-border/40 cursor-pointer hover:from-primary/15 transition-colors"
        >
          <div className="flex items-center gap-2">
            <div className="relative">
              <Vote size={14} className="text-primary" />
              <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
            </div>
            <span className="text-xs font-bold text-primary tracking-wide uppercase">
              {isAr ? "استطلاع الأسبوع" : "Weekly Poll"}
            </span>
            <span className={`text-[0.6rem] px-1.5 py-0.5 rounded-full font-medium ${catConfig.bgColor} ${catConfig.color}`}>
              {isAr ? catConfig.labelAr : catConfig.labelEn}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <PollCountdown expiresAt={poll.expiresAt} isAr={isAr} />
            {isCollapsed ? <ChevronDown size={14} className="text-muted-foreground" /> : <ChevronUp size={14} className="text-muted-foreground" />}
          </div>
        </button>

        {!isCollapsed && (
          <div className="p-4">
            {/* Data nuggets — key numbers to inform the vote */}
            {poll.dataNuggets && poll.dataNuggets.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                    {poll.dataNuggets.map((nugget: { labelAr: string; labelEn: string; value: string; linkPath?: string }, idx: number) => (
                  <Link
                    key={idx}
                    href={nugget.linkPath || "/"}
                    className="no-underline group/nugget inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-muted/30 hover:bg-muted/50 border border-border/30 hover:border-primary/30 transition-all"
                  >
                    <span className="text-[0.6rem] text-muted-foreground/70 group-hover/nugget:text-muted-foreground transition-colors">
                      {isAr ? nugget.labelAr : nugget.labelEn}
                    </span>
                    <span className="text-[0.65rem] font-bold font-mono text-foreground/90" style={{ direction: "ltr", unicodeBidi: "isolate" }}>
                      {nugget.value}
                    </span>
                    <ExternalLink size={7} className="text-primary/40 group-hover/nugget:text-primary transition-colors" />
                  </Link>
                ))}
              </div>
            )}

            {/* Question */}
            <h3 className="text-sm font-bold leading-relaxed mb-1">
              {isAr ? poll.questionAr : poll.questionEn}
            </h3>

            {/* Context line */}
            {(poll.contextAr || poll.contextEn) && (
              <p className="text-[0.65rem] text-muted-foreground/70 mb-3 leading-relaxed">
                {isAr ? poll.contextAr : poll.contextEn}
              </p>
            )}

            {/* Options */}
            <div className="space-y-2">
              {poll.options.map((option, index) => (
                <PollOption
                  key={index}
                  index={index}
                  labelAr={option.labelAr}
                  labelEn={option.labelEn}
                  votes={option.votes}
                  totalVotes={poll.totalVotes}
                  isAr={isAr}
                  isSelected={selectedOption === index}
                  hasVoted={hasVoted}
                  showResults={showResults}
                  isVoting={isVoting && selectedOption === index}
                  voteAnimation={voteAnimation && selectedOption === index}
                  onVote={() => handleVote(index)}
                />
              ))}
            </div>

            {/* Footer stats */}
            <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/30">
              <div className="flex items-center gap-1.5 text-[0.6rem] text-muted-foreground/60">
                <Users size={10} />
                <span>
                  {poll.totalVotes.toLocaleString()} {isAr ? "صوت" : "votes"}
                </span>
                {poll.totalVotes >= 10 && (
                  <Flame size={10} className="text-orange-400/60 ml-1" />
                )}
              </div>
              <span className="text-[0.55rem] text-muted-foreground/40">
                {isAr ? "تصويت مجهول الهوية" : "Anonymous voting"}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── POLL OPTION ─────────────────────────────────────────────────────────────

function PollOption({
  index, labelAr, labelEn, votes, totalVotes,
  isAr, isSelected, hasVoted, showResults, isVoting, voteAnimation, onVote,
}: {
  index: number;
  labelAr: string;
  labelEn: string;
  votes: number;
  totalVotes: number;
  isAr: boolean;
  isSelected: boolean;
  hasVoted: boolean;
  showResults: boolean;
  isVoting: boolean;
  voteAnimation: boolean;
  onVote: () => void;
}) {
  const percentage = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
  const _isWinner = showResults && votes === Math.max(...Array.from({ length: 5 }, (_, i) => i === index ? votes : 0));
  const colorGradient = optionColors[index % optionColors.length];

  return (
    <button
      onClick={onVote}
      disabled={hasVoted || isVoting}
      className={`
        relative w-full text-start rounded-xl overflow-hidden transition-all duration-300
        ${hasVoted
          ? "cursor-default"
          : "cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
        }
        ${isSelected && voteAnimation ? "animate-pulse" : ""}
        ${!hasVoted ? "hover:border-primary/50 border border-border/50 bg-card/50" : "border border-border/30 bg-card/30"}
      `}
    >
      {/* Result bar (shown after voting) */}
      {showResults && (
        <div
          className={`absolute inset-y-0 start-0 bg-gradient-to-r ${colorGradient} transition-all duration-700 ease-out rounded-xl`}
          style={{
            width: `${percentage}%`,
            opacity: 0.15,
          }}
        />
      )}

      <div className="relative flex items-center justify-between px-3 py-2.5">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {/* Vote indicator */}
          {!hasVoted && (
            <div className={`
              w-4 h-4 rounded-full border-2 flex-shrink-0 transition-all duration-200
              ${isSelected ? "border-primary bg-primary" : "border-muted-foreground/30"}
            `}>
              {isSelected && (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="w-1.5 h-1.5 bg-primary-foreground rounded-full" />
                </div>
              )}
            </div>
          )}

          {/* Voted check mark */}
          {hasVoted && isSelected && (
            <CheckCircle2 size={14} className="text-primary flex-shrink-0" />
          )}
          {hasVoted && !isSelected && (
            <div className="w-3.5 h-3.5 rounded-full border border-muted-foreground/20 flex-shrink-0" />
          )}

          {/* Label */}
          <span className={`text-xs font-medium ${isSelected && hasVoted ? "text-primary" : ""}`}>
            {isAr ? labelAr : labelEn}
          </span>
        </div>

        {/* Percentage (shown after voting) */}
        {showResults && (
          <div className="flex items-center gap-1.5 flex-shrink-0 ms-2">
            <span className={`text-xs font-bold tabular-nums ${isSelected ? "text-primary" : "text-muted-foreground"}`}>
              {percentage}%
            </span>
          </div>
        )}

        {/* Loading spinner when voting */}
        {isVoting && (
          <div className="absolute inset-0 flex items-center justify-center bg-card/50 backdrop-blur-sm rounded-xl">
            <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        )}
      </div>
    </button>
  );
}

// ─── COUNTDOWN ───────────────────────────────────────────────────────────────

function PollCountdown({ expiresAt, isAr }: { expiresAt: number; isAr: boolean }) {
  const { hours, minutes, seconds, isExpired } = useCountdown(expiresAt);

  if (isExpired) {
    return (
      <span className="text-[0.6rem] text-muted-foreground/60 flex items-center gap-1">
        <Clock size={9} />
        {isAr ? "انتهى" : "Ended"}
      </span>
    );
  }

  return (
    <span className="text-[0.6rem] text-muted-foreground/60 flex items-center gap-1 tabular-nums font-mono">
      <Clock size={9} />
      {String(hours).padStart(2, "0")}:{String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
    </span>
  );
}

// ─── SKELETON ────────────────────────────────────────────────────────────────

function PollSkeleton() {
  return (
    <div className="border border-border/60 rounded-2xl bg-card/80 backdrop-blur-sm overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 bg-primary/5 border-b border-border/40">
        <div className="w-14 h-3 bg-muted/20 animate-pulse rounded" />
      </div>
      <div className="p-4 space-y-3">
        <div className="w-3/4 h-4 bg-muted/20 animate-pulse rounded" />
        <div className="w-1/2 h-3 bg-muted/10 animate-pulse rounded" />
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-10 bg-muted/10 animate-pulse rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
