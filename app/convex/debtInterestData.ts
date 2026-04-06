import { internalMutation } from "./_generated/server";

/**
 * Backfills interest rate, debt service, and maturity data for existing creditor records.
 * Sources: IMF Article IV reports, CBE statistical bulletin, World Bank IDS.
 * These are approximate weighted-average rates as of 2024.
 */
export const backfillCreditorTerms = internalMutation({
  args: {},
  handler: async (ctx) => {
    const creditors = await ctx.db.query("debtByCreditor").collect();
    if (creditors.length === 0) return 0;

    // Known interest rates and terms per creditor (approximate, sourced from public reports)
    const terms: Record<string, {
      interestRate: number;
      maturityYears: number;
      termsNoteEn: string;
      termsNoteAr: string;
      sourceUrl: string;
    }> = {
      "International Bonds (Eurobonds)": {
        interestRate: 7.5,
        maturityYears: 10,
        termsNoteEn: "Weighted avg coupon rate across Egypt Eurobond issuances (5yr-30yr maturities)",
        termsNoteAr: "متوسط معدل الكوبون المرجح لإصدارات السندات الدولية المصرية",
        sourceUrl: "https://www.cbe.org.eg/en/economic-research/statistics",
      },
      "World Bank": {
        interestRate: 1.9,
        maturityYears: 25,
        termsNoteEn: "IBRD concessional lending rate, 25-year maturity with grace period",
        termsNoteAr: "معدل الإقراض التفضيلي للبنك الدولي، أجل ٢٥ سنة مع فترة سماح",
        sourceUrl: "https://www.worldbank.org/en/country/egypt",
      },
      "IMF": {
        interestRate: 3.2,
        maturityYears: 5,
        termsNoteEn: "SDR-based rate + surcharge for Egypt EFF program",
        termsNoteAr: "معدل مبني على حقوق السحب الخاصة + رسوم إضافية لبرنامج التسهيل الممدد",
        sourceUrl: "https://www.imf.org/en/Countries/EGY",
      },
      "Saudi Arabia": {
        interestRate: 2.5,
        maturityYears: 15,
        termsNoteEn: "Bilateral deposit/loan at preferential rate",
        termsNoteAr: "وديعة/قرض ثنائي بسعر تفضيلي",
        sourceUrl: "https://www.cbe.org.eg/en/economic-research/statistics",
      },
      "UAE": {
        interestRate: 2.5,
        maturityYears: 15,
        termsNoteEn: "Bilateral deposit/loan at preferential rate (Ras El Hekma deal)",
        termsNoteAr: "وديعة/قرض ثنائي بسعر تفضيلي (صفقة رأس الحكمة)",
        sourceUrl: "https://www.cbe.org.eg/en/economic-research/statistics",
      },
      "Kuwait": {
        interestRate: 2.0,
        maturityYears: 20,
        termsNoteEn: "Kuwait Fund for Arab Economic Development concessional rate",
        termsNoteAr: "معدل الصندوق الكويتي للتنمية الاقتصادية العربية التفضيلي",
        sourceUrl: "https://www.kuwait-fund.org",
      },
      "African Development Bank": {
        interestRate: 2.3,
        maturityYears: 20,
        termsNoteEn: "AfDB sovereign lending rate",
        termsNoteAr: "معدل إقراض بنك التنمية الأفريقي السيادي",
        sourceUrl: "https://www.afdb.org",
      },
      "Other Creditors": {
        interestRate: 4.5,
        maturityYears: 7,
        termsNoteEn: "Weighted average of various bilateral and commercial creditors",
        termsNoteAr: "المتوسط المرجح لمختلف الدائنين الثنائيين والتجاريين",
        sourceUrl: "https://www.cbe.org.eg/en/economic-research/statistics",
      },
    };

    let updated = 0;
    for (const creditor of creditors) {
      const t = terms[creditor.creditorEn];
      if (t && !creditor.interestRate) {
        // Calculate annual debt service (interest only, approximate)
        const annualInterest = creditor.amount * (t.interestRate / 100);
        await ctx.db.patch(creditor._id, {
          interestRate: t.interestRate,
          annualDebtService: Math.round(annualInterest * 100) / 100,
          maturityYears: t.maturityYears,
          termsNoteEn: t.termsNoteEn,
          termsNoteAr: t.termsNoteAr,
          sourceUrl: t.sourceUrl,
        });
        updated++;
      }
    }

    return updated;
  },
});
