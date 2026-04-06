"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { type Id } from "../../../convex/_generated/dataModel";
import { Skeleton } from "boneyard-js/react";
import { useLanguage } from "@/components/providers";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users, MapPin, Database } from "lucide-react";

// ─── Stat tile ─────────────────────────────────────────────────────────────────

function StatTile({
  icon: Icon,
  labelAr,
  labelEn,
  value,
  isAr,
  highlight,
}: {
  icon: typeof Users;
  labelAr: string;
  labelEn: string;
  value: string;
  isAr: boolean;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl p-4 border ${
        highlight
          ? "border-[#C9A84C]/30 bg-[#C9A84C]/5"
          : "border-border/60 bg-card/60"
      }`}
    >
      <Icon
        size={14}
        className={`mb-2 ${highlight ? "text-[#C9A84C]" : "text-muted-foreground"}`}
      />
      <p
        className={`font-mono text-xl font-black tracking-tight ${
          highlight ? "text-[#C9A84C]" : "text-foreground"
        }`}
      >
        {value}
      </p>
      <p className="text-[0.625rem] text-muted-foreground mt-0.5 uppercase tracking-widest">
        {isAr ? labelAr : labelEn}
      </p>
    </div>
  );
}

// ─── Governorate detail panel ─────────────────────────────────────────────────

function GovernorateDetail({
  governorateId,
  isAr,
}: {
  governorateId: Id<"governorates">;
  isAr: boolean;
}) {
  const governorate = useQuery(api.government.getGovernorate, { governorateId });
  const members = useQuery(api.parliament.getMembersByGovernorate, {
    governorateId,
  });

  const isLoading = governorate === undefined || members === undefined;

  const nameDisplay = governorate
    ? isAr
      ? governorate.nameAr
      : governorate.nameEn
    : "";
  const capitalDisplay = governorate
    ? isAr
      ? governorate.capitalAr
      : governorate.capitalEn
    : "";
  const regionDisplay = governorate
    ? isAr
      ? (governorate.regionAr ?? "")
      : (governorate.regionEn ?? "")
    : "";
  const governorName =
    governorate?.governor
      ? isAr
        ? governorate.governor.nameAr
        : governorate.governor.nameEn
      : null;
  const governorAppointed = governorate?.governor?.appointmentDate ?? null;

  return (
    <Skeleton name="governorate-detail" loading={isLoading}>
      {!isLoading && governorate === null ? (
        <Card className="border-border/60 bg-card/60">
          <CardContent className="p-8 text-center text-muted-foreground text-sm">
            {isAr ? "لم يتم العثور على بيانات المحافظة" : "Governorate data not found"}
          </CardContent>
        </Card>
      ) : null}
      {!isLoading && governorate ? (
    <div className="space-y-6">
      {/* Governor card */}
      <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
        <CardContent className="p-6">
          <div className="flex items-start gap-5">
            <div className="w-14 h-14 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-2xl font-black flex-shrink-0">
              {nameDisplay.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <h2 className="text-2xl font-black text-foreground leading-tight">
                    {nameDisplay}
                  </h2>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <MapPin size={10} />
                    {capitalDisplay}
                    {regionDisplay ? ` · ${regionDisplay}` : ""}
                  </p>
                </div>
                {governorate.population && (
                  <Badge variant="secondary" className="text-xs">
                    {(governorate.population / 1_000_000).toFixed(1)}M{" "}
                    {isAr ? "نسمة" : "people"}
                  </Badge>
                )}
              </div>

              <Separator className="my-4" />

              <div className="flex items-center gap-3 flex-wrap">
                <div>
                  <p className="text-[0.625rem] text-muted-foreground uppercase tracking-widest">
                    {isAr ? "المحافظ" : "Governor"}
                  </p>
                  {governorName ? (
                    <>
                      <p className="text-sm font-bold text-foreground">
                        {governorName}
                      </p>
                      {governorAppointed && (
                        <p className="text-[0.625rem] text-muted-foreground font-mono">
                          {isAr ? "عُيِّن:" : "Appointed:"} {governorAppointed}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground/60">
                      {isAr ? "غير متاح" : "Not available"}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key stats — population only (other stats not in schema) */}
      {governorate.population && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
            {isAr ? "المؤشرات الرئيسية" : "Key Indicators"}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <StatTile
              icon={Users}
              labelAr="السكان"
              labelEn="Population"
              value={`${(governorate.population / 1_000_000).toFixed(1)}M`}
              isAr={isAr}
            />
            {/* Poverty rate, literacy, hospital beds, schools are not yet in the DB schema */}
            <div className="col-span-1 sm:col-span-2 rounded-xl p-4 border border-border/40 bg-card/40 flex items-center gap-3">
              <Database size={14} className="text-muted-foreground/40 flex-shrink-0" />
              <p className="text-[0.625rem] text-muted-foreground/60 leading-relaxed">
                {isAr
                  ? "إحصائيات التعليم والصحة والفقر ستُضاف قريباً بواسطة وكيل البيانات"
                  : "Education, health, and poverty stats will be added by the data agent"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* MPs / Senators */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
          {isAr ? "ممثلو المحافظة في البرلمان" : "Parliamentary Representatives"}
        </p>
        {(members ?? []).length === 0 ? (
          <Card className="border-border/60 bg-card/60">
            <CardContent className="p-8 text-center">
              <Database size={18} className="mx-auto mb-2 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">
                {isAr ? "لا توجد بيانات برلمانية لهذه المحافظة" : "No parliamentary data for this governorate"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {(members ?? []).map((member) => {
              const memberName = member.official
                ? isAr
                  ? member.official.nameAr
                  : member.official.nameEn
                : isAr
                  ? "غير معروف"
                  : "Unknown";
              const partyName = member.party
                ? isAr
                  ? member.party.nameAr
                  : member.party.nameEn
                : isAr
                  ? "مستقل"
                  : "Independent";
              const chamberLabel =
                member.chamber === "house"
                  ? isAr
                    ? "النواب"
                    : "House"
                  : isAr
                    ? "الشيوخ"
                    : "Senate";

              return (
                <Card key={member._id} className="border-border/60 bg-card/60">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold flex-shrink-0">
                      {memberName.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-foreground truncate">
                        {memberName}
                      </p>
                      <p className="text-[0.65rem] text-muted-foreground truncate">
                        {partyName}
                      </p>
                      <Badge variant="outline" className="text-[0.6rem] mt-0.5">
                        {chamberLabel}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
      ) : null}
    </Skeleton>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function GovernoratePage() {
  const { lang, dir } = useLanguage();
  const isAr = lang === "ar";
  const [selectedId, setSelectedId] = useState<string>("");

  const governorates = useQuery(api.government.listGovernorates);

  const isLoading = governorates === undefined;

  return (
    <div className="page-content" dir={dir}>
      <div className="container-page">
        {/* Header */}
        <div className="mb-8">
          <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-2">
            {isAr ? "بياناتك المحلية" : "Your Local Data"}
          </p>
          <h1 className="text-3xl md:text-4xl font-black mb-2">
            {isAr ? "محافظتك" : "Your Governorate"}
          </h1>
          <p className="text-muted-foreground text-sm max-w-lg">
            {isAr
              ? "اختر محافظتك لعرض البيانات المحلية — المحافظ، النواب، الإحصاءات الاجتماعية والاقتصادية"
              : "Select your governorate to see local data — governor, MPs, social and economic stats"}
          </p>
        </div>

        {/* Select */}
        <div className="max-w-sm mb-8">
          <Skeleton name="governorate-select" loading={isLoading}>
            <Select value={selectedId} onValueChange={setSelectedId} dir={dir}>
              <SelectTrigger className="w-full">
                <SelectValue
                  placeholder={
                    isAr ? "اختر المحافظة..." : "Select a governorate..."
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {!isLoading && governorates && governorates.length > 0 ? (
                  governorates.map((g) => (
                    <SelectItem key={g._id} value={g._id}>
                      {isAr ? g.nameAr : g.nameEn}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="_empty" disabled>
                    {isAr ? "لا توجد بيانات" : "No data available"}
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </Skeleton>
        </div>

        {/* Empty / no selection */}
        {!selectedId && !isLoading && (
          <Card className="border-border/60 bg-card/60">
            <CardContent className="p-12 text-center text-muted-foreground">
              <MapPin size={24} className="mx-auto mb-3 opacity-40" />
              <p className="text-sm">
                {isAr
                  ? "اختر محافظة من القائمة أعلاه"
                  : "Select a governorate from the list above"}
              </p>
            </CardContent>
          </Card>
        )}

        {/* No data in DB */}
        {!isLoading && governorates && governorates.length === 0 && (
          <Card className="border-border/60 bg-card/60">
            <CardContent className="p-12 text-center">
              <Database size={24} className="mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-sm font-medium text-foreground mb-1">
                {isAr ? "لا توجد بيانات بعد" : "No data available yet"}
              </p>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                {isAr
                  ? "سيتم تحميل بيانات المحافظات بواسطة وكيل البيانات"
                  : "Governorate data will be loaded by the data agent"}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Selected governorate detail */}
        {selectedId && selectedId !== "_empty" && (
          <GovernorateDetail
            governorateId={selectedId as Id<"governorates">}
            isAr={isAr}
          />
        )}
      </div>
    </div>
  );
}
