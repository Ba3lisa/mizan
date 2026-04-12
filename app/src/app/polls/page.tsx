"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useLanguage } from "@/components/providers";
import { DailyPoll } from "@/components/daily-poll";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Vote, Clock, Users, CheckCircle2 } from "lucide-react";

// ─── Category colors ─────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  economy: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  budget: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  debt: "bg-red-500/10 text-red-500 border-red-500/20",
  parliament: "bg-violet-500/10 text-violet-500 border-violet-500/20",
  government: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  constitution: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
  general: "bg-muted text-muted-foreground border-border",
};

// ─── Completed Poll Card ─────────────────────────────────────────────────────

function CompletedPollCard({
  poll,
  isAr,
}: {
  poll: {
    _id: string;
    questionAr: string;
    questionEn: string;
    options: Array<{ labelAr: string; labelEn: string; votes: number }>;
    category: string;
    totalVotes: number;
    createdAt: number;
    expiresAt: number;
  };
  isAr: boolean;
}) {
  const question = isAr ? poll.questionAr : poll.questionEn;
  const maxVotes = Math.max(...poll.options.map((o) => o.votes), 1);
  const date = new Date(poll.createdAt).toLocaleDateString(isAr ? "ar-EG" : "en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <Badge
            variant="outline"
            className={`text-[0.6rem] ${CATEGORY_COLORS[poll.category] ?? CATEGORY_COLORS.general}`}
          >
            {poll.category}
          </Badge>
          <div className="flex items-center gap-3 text-[0.65rem] text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock size={10} />
              {date}
            </span>
            <span className="flex items-center gap-1">
              <Users size={10} />
              {poll.totalVotes.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Question */}
        <p className="text-sm font-bold mb-4">{question}</p>

        {/* Results */}
        <div className="space-y-2">
          {poll.options.map((option, i) => {
            const pct = poll.totalVotes > 0 ? (option.votes / poll.totalVotes) * 100 : 0;
            const isWinner = option.votes === maxVotes && option.votes > 0;
            const label = isAr ? option.labelAr : option.labelEn;

            return (
              <div key={i} className="relative">
                <div
                  className="absolute inset-0 rounded-lg transition-all"
                  style={{
                    width: `${pct}%`,
                    background: isWinner
                      ? "linear-gradient(90deg, rgba(201,168,76,0.15), rgba(201,168,76,0.05))"
                      : "rgba(128,128,128,0.08)",
                  }}
                />
                <div className="relative flex items-center justify-between px-3 py-2">
                  <span className={`text-xs ${isWinner ? "font-bold text-foreground" : "text-muted-foreground"}`}>
                    {isWinner && <CheckCircle2 size={11} className="inline me-1 text-[#C9A84C]" />}
                    {label}
                  </span>
                  <span className={`text-xs font-mono ${isWinner ? "font-bold text-[#C9A84C]" : "text-muted-foreground"}`}>
                    {pct.toFixed(0)}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function PollsPage() {
  const { t, lang, dir } = useLanguage();
  const isAr = lang === "ar";
  const completedPolls = useQuery(api.polls.getCompletedPolls, { limit: 20 });

  return (
    <div className="page-content" dir={dir}>
      <div className="container-page">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Vote size={20} />
            </div>
            <div>
              <p className="text-xs font-semibold text-primary uppercase tracking-widest">
                {t.polls_communityVoice}
              </p>
              <h1 className="text-2xl md:text-3xl font-black">
                {t.polls_title}
              </h1>
            </div>
          </div>
          <p className="text-sm text-muted-foreground max-w-2xl">
            {t.polls_description}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8 items-start">
          {/* Historical polls */}
          <div>
            <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-4">
              {t.polls_pastPolls}
            </h2>
            {completedPolls === undefined ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-40 rounded-xl bg-muted/20 animate-pulse" />
                ))}
              </div>
            ) : completedPolls.length === 0 ? (
              <Card className="border-border/60 bg-card/60">
                <CardContent className="p-8 text-center text-muted-foreground text-sm">
                  {t.polls_noCompleted}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {completedPolls.map((poll) => (
                  <CompletedPollCard key={poll._id} poll={poll} isAr={isAr} />
                ))}
              </div>
            )}
          </div>

          {/* Active poll sidebar */}
          <div className="lg:sticky lg:top-20">
            <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-4">
              {t.polls_currentPoll}
            </h2>
            <DailyPoll />
          </div>
        </div>
      </div>
    </div>
  );
}
