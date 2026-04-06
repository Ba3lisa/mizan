import { mutation } from "./_generated/server";


// Seeds the two missing constitution articles: 137 and 138.
// These fall in Part 5 (System of Government), within the presidential section.
// Source: Egyptian Constitution 2014 (with 2019 amendments)
// https://www.constituteproject.org/constitution/Egypt_2019
export const seedMissing = mutation({
  args: {},
  handler: async (ctx) => {
    // Verify articles don't already exist to prevent duplicates
    const existing137 = await ctx.db
      .query("constitutionArticles")
      .withIndex("by_articleNumber", (q) => q.eq("articleNumber", 137))
      .unique();

    const existing138 = await ctx.db
      .query("constitutionArticles")
      .withIndex("by_articleNumber", (q) => q.eq("articleNumber", 138))
      .unique();

    if (existing137 && existing138) {
      return { message: "Articles 137 and 138 already exist — nothing to seed.", inserted: 0 };
    }

    // Fetch Part 5 (System of Government) — partNumber: 5
    const part5 = await ctx.db
      .query("constitutionParts")
      .withIndex("by_sortOrder", (q) => q.eq("sortOrder", 5))
      .unique();

    if (!part5) {
      throw new Error("constitutionParts part 5 (System of Government) not found. Run the main seed first.");
    }

    const partId = part5._id;
    let inserted = 0;

    // ── Article 137 ──────────────────────────────────────────────────────────────
    // Conditions for presidential candidacy.
    // The article was not among the 2019 amendments.
    if (!existing137) {
      await ctx.db.insert("constitutionArticles", {
        articleNumber: 137,
        partId,
        textAr:
          "يشترط في المرشح لرئاسة الجمهورية أن يكون مصري الجنسية من أبوين مصريين، وألا يكون قد حمل أو أيٍّ من والديه جنسية دولة أخرى، وأن يكون متمتعاً بحقوقه المدنية والسياسية، وألا يكون متزوجاً من غير مصري، وأن يكون قد أدى الخدمة العسكرية أو أُعفي منها قانوناً، وأن يكون قد بلغ من العمر أربعين سنة ميلادية على الأقل.",
        textEn:
          "A candidate for the presidency must be Egyptian and born of Egyptian parents, must not hold or have held any other nationality, nor may either of his parents hold or have held a non-Egyptian nationality. The candidate must enjoy civil and political rights, must not be married to a non-Egyptian, must have performed military service or been legally exempted therefrom, and must be at least forty calendar years of age.",
        summaryAr:
          "شروط الترشح لرئاسة الجمهورية: الجنسية المصرية وعدم حمل أي جنسية أخرى، والتمتع بالحقوق المدنية والسياسية، وأداء الخدمة العسكرية، وبلوغ الأربعين.",
        summaryEn:
          "Sets eligibility conditions for presidential candidates: Egyptian nationality (born of Egyptian parents), no foreign nationality, civil and political rights, military service, and minimum age of forty.",
        wasAmended2019: false,
        keywords: [
          "president",
          "candidacy",
          "eligibility",
          "nationality",
          "age requirement",
          "military service",
          "civil rights",
        ],
      });
      inserted++;
    }

    // ── Article 138 ──────────────────────────────────────────────────────────────
    // Nomination procedure for presidential candidates.
    // The candidate must obtain endorsements from members of parliament
    // or registered voters. Details are regulated by law.
    if (!existing138) {
      await ctx.db.insert("constitutionArticles", {
        articleNumber: 138,
        partId,
        textAr:
          "يُقدَّم طلب الترشح لرئاسة الجمهورية إلى لجنة الانتخابات الرئاسية، ويشترط في المرشح أن يحصل على تأييد عدد من أعضاء مجلس النواب أو عدد من المواطنين أصحاب حق الاقتراع في عدد من المحافظات، وذلك على النحو الذي يُحدده القانون.",
        textEn:
          "Nomination applications for the presidency are submitted to the Presidential Elections Commission. The candidate must obtain the endorsement of a number of members of the House of Representatives or a number of registered voters across a number of governorates, as determined by law.",
        summaryAr:
          "إجراءات تقديم طلبات الترشح للرئاسة وضرورة الحصول على تأييد من أعضاء مجلس النواب أو من المواطنين.",
        summaryEn:
          "Presidential nomination procedure: applications are submitted to the Presidential Elections Commission and require endorsements from members of parliament or registered voters across multiple governorates.",
        wasAmended2019: false,
        keywords: [
          "president",
          "nomination",
          "candidacy procedure",
          "Presidential Elections Commission",
          "endorsements",
          "parliament",
          "voters",
        ],
      });
      inserted++;
    }

    return {
      message: `Successfully seeded ${inserted} missing constitution article(s).`,
      inserted,
    };
  },
});
