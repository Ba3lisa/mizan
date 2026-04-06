import { NextResponse } from "next/server";
import { fetchQuery } from "convex/nextjs";
import { api } from "../../../convex/_generated/api";

export const revalidate = 21600; // 6h — matches pipeline refresh cycle

export async function GET() {
  try {
    const [
      hierarchy,
      governorates,
      parliamentStats,
      parties,
      fiscalYears,
      latestDebt,
      debtTimeline,
      economyLatest,
      elections,
      constitutionParts,
      sources,
      categoryHealth,
    ] = await Promise.all([
      fetchQuery(api.government.getGovernmentHierarchy),
      fetchQuery(api.government.listGovernorates),
      fetchQuery(api.parliament.getParliamentStats, { chamber: "house" }),
      fetchQuery(api.parliament.listParties),
      fetchQuery(api.budget.listFiscalYears),
      fetchQuery(api.debt.getLatestDebtRecord),
      fetchQuery(api.debt.getDebtTimeline),
      fetchQuery(api.economy.getAllLatest),
      fetchQuery(api.elections.listElections, {}),
      fetchQuery(api.constitution.listParts),
      fetchQuery(api.sources.getAll),
      fetchQuery(api.transparency.getCategoryHealth),
    ]);

    const now = new Date().toISOString();

    let md = `# Mizan Data Export — ${now}

> Complete structured data from Mizan (mizanmasr.com), Egypt's civic transparency platform.
> This file is auto-generated every 6 hours from verified official sources.
> All data is cited — see source URLs for each data point.

`;

    // ── Government ──
    md += `## Government\n\n`;
    if (hierarchy) {
      const h = hierarchy as Record<string, unknown>;
      const president = h.president as Record<string, unknown> | undefined;
      const pm = h.primeMinister as Record<string, unknown> | undefined;
      const ministers = (h.ministers as Array<Record<string, unknown>>) ?? [];

      if (president) {
        md += `### President\n- ${president.nameEn ?? ""} (${president.nameAr ?? ""})\n\n`;
      }
      if (pm) {
        md += `### Prime Minister\n- ${pm.nameEn ?? ""} (${pm.nameAr ?? ""})\n\n`;
      }
      if (ministers.length > 0) {
        md += `### Cabinet Ministers (${ministers.length})\n`;
        for (const m of ministers) {
          md += `- ${m.nameEn ?? ""} — ${m.portfolioEn ?? ""}\n`;
        }
        md += `\n`;
      }
    }

    if (governorates && Array.isArray(governorates)) {
      md += `### Governorates (${governorates.length})\n`;
      for (const g of governorates as Array<Record<string, unknown>>) {
        md += `- ${g.nameEn ?? ""} (${g.nameAr ?? ""})\n`;
      }
      md += `\n`;
    }

    // ── Parliament ──
    md += `## Parliament\n\n`;
    if (parliamentStats) {
      const ps = parliamentStats as Record<string, unknown>;
      md += `- House Members: ${ps.houseMembers ?? "N/A"}\n`;
      md += `- Senate Members: ${ps.senateMembers ?? "N/A"}\n`;
      md += `- Total Parties: ${ps.totalParties ?? "N/A"}\n`;
      md += `- Committees: ${ps.totalCommittees ?? "N/A"}\n\n`;
    }
    if (parties && Array.isArray(parties)) {
      md += `### Political Parties (${parties.length})\n`;
      for (const p of parties as Array<Record<string, unknown>>) {
        md += `- ${p.nameEn ?? ""} (${p.nameAr ?? ""}): ${p.seatsHouse ?? 0} House seats, ${p.seatsSenate ?? 0} Senate seats\n`;
      }
      md += `\n`;
    }

    // ── Budget ──
    md += `## Budget\n\n`;
    if (fiscalYears && Array.isArray(fiscalYears)) {
      for (const fy of fiscalYears as Array<Record<string, unknown>>) {
        md += `### ${fy.yearLabel ?? fy.year ?? "Unknown Year"}\n`;
        md += `- Total Revenue: ${formatNum(fy.totalRevenue as number | undefined)} EGP\n`;
        md += `- Total Expenditure: ${formatNum(fy.totalExpenditure as number | undefined)} EGP\n`;
        md += `- Deficit: ${formatNum(fy.deficit as number | undefined)} EGP\n`;
        if (fy.sourceUrl) md += `- Source: ${fy.sourceUrl}\n`;
        md += `\n`;
      }
    }

    // ── Debt ──
    md += `## Debt\n\n`;
    if (latestDebt) {
      const d = latestDebt as Record<string, unknown>;
      md += `### Latest Record (${d.year ?? "N/A"})\n`;
      md += `- External Debt: $${formatNum(d.externalDebt as number | undefined)}B\n`;
      md += `- Domestic Debt: ${formatNum(d.domesticDebt as number | undefined)}B EGP\n`;
      md += `- Debt-to-GDP: ${d.debtToGdp ?? "N/A"}%\n`;
      if (d.sourceUrl) md += `- Source: ${d.sourceUrl}\n`;
      md += `\n`;
    }
    if (debtTimeline && Array.isArray(debtTimeline)) {
      md += `### Debt Timeline\n`;
      md += `| Year | External ($B) | Domestic (B EGP) | Debt/GDP |\n`;
      md += `|------|--------------|-----------------|----------|\n`;
      for (const d of debtTimeline as Array<Record<string, unknown>>) {
        md += `| ${d.year ?? ""} | ${formatNum(d.externalDebt as number | undefined)} | ${formatNum(d.domesticDebt as number | undefined)} | ${d.debtToGdp ?? ""}% |\n`;
      }
      md += `\n`;
    }

    // ── Economy ──
    md += `## Economy\n\n`;
    if (economyLatest && Array.isArray(economyLatest)) {
      for (const ind of economyLatest as Array<Record<string, unknown>>) {
        md += `- ${ind.nameEn ?? ind.indicatorKey ?? ""}: ${ind.value ?? "N/A"} ${ind.unit ?? ""} (${ind.year ?? ""})\n`;
      }
      md += `\n`;
    }

    // ── Elections ──
    md += `## Elections\n\n`;
    if (elections && Array.isArray(elections)) {
      for (const e of elections as Array<Record<string, unknown>>) {
        md += `### ${e.nameEn ?? e.type ?? ""} (${e.year ?? ""})\n`;
        md += `- Type: ${e.type ?? ""}\n`;
        md += `- Turnout: ${e.turnout ?? "N/A"}%\n`;
        const candidates = (e.candidates as Array<Record<string, unknown>>) ?? [];
        if (candidates.length > 0) {
          md += `- Results:\n`;
          for (const c of candidates) {
            md += `  - ${c.nameEn ?? c.name ?? ""}: ${c.votes ?? ""} votes (${c.percentage ?? ""}%)\n`;
          }
        }
        md += `\n`;
      }
    }

    // ── Constitution ──
    md += `## Constitution\n\n`;
    md += `Egypt's 2014 Constitution with 2019 Amendments\n\n`;
    if (constitutionParts && Array.isArray(constitutionParts)) {
      for (const part of constitutionParts as Array<Record<string, unknown>>) {
        md += `- Part ${part.partNumber ?? ""}: ${part.titleEn ?? ""} (${part.titleAr ?? ""})\n`;
      }
      md += `\nFull constitution text available at: https://mizanmasr.com/constitution\n\n`;
    }

    // ── Data Sources ──
    md += `## Data Sources\n\n`;
    if (sources && Array.isArray(sources)) {
      for (const s of sources as Array<Record<string, unknown>>) {
        md += `- [${s.nameEn ?? ""}](${s.url ?? ""}): ${s.notes ?? ""} (${s.type ?? ""}, category: ${s.category ?? ""})\n`;
      }
      md += `\n`;
    }

    // ── Data Health ──
    md += `## Data Health Status\n\n`;
    md += `| Category | Records | Last Refresh | Status |\n`;
    md += `|----------|---------|-------------|--------|\n`;
    if (categoryHealth && Array.isArray(categoryHealth)) {
      for (const ch of categoryHealth as Array<Record<string, unknown>>) {
        const refreshTime = ch.lastRefreshTime
          ? new Date(ch.lastRefreshTime as number).toISOString()
          : "Never";
        md += `| ${ch.category ?? ""} | ${ch.recordCount ?? 0} | ${refreshTime} | ${ch.lastStatus ?? "unknown"} |\n`;
      }
    }
    md += `\n---\nGenerated: ${now}\nSource: https://mizanmasr.com\nRepository: https://github.com/Ba3lisa/mizan\n`;

    return new NextResponse(md, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Cache-Control": "public, max-age=21600, s-maxage=21600",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new NextResponse(`# Error generating data export\n\n${message}`, {
      status: 500,
      headers: { "Content-Type": "text/markdown; charset=utf-8" },
    });
  }
}

function formatNum(n: number | undefined | null): string {
  if (n === undefined || n === null) return "N/A";
  return n.toLocaleString("en-US", { maximumFractionDigits: 1 });
}
