# PROJECT_PROMPT: Mizan (ميزان)

**Project Name:** Mizan (Arabic for "balance" / "scales" -- as in the scales of justice and accountability)
**Tagline:** Egypt's government, made visible.

---

## 1. Problem Statement

Egyptian citizens, journalists, researchers, and diaspora have no single, well-designed, fact-checked resource that breaks down how their government works, who holds power, how money is spent, and what the constitution actually says. Government data exists but is scattered across dozens of ministry websites, PDFs, and press releases -- most of it in formats that are not searchable, not visual, and not accessible to the average person.

Mizan solves this by creating an interactive, explorable, beautifully designed web application that synthesizes official government data into clear visualizations. It is not an opinion site. It is not activism. It is a mirror -- showing citizens exactly what their government is, structured by their own constitution and funded by their own taxes.

### Target Users

1. **Egyptian citizens** -- the primary audience. People who want to understand their government.
2. **Egyptian diaspora** -- millions living abroad who want to stay informed about home.
3. **Journalists and researchers** -- need structured, cited data for reporting.
4. **Students** -- civics education, political science, economics courses.
5. **International observers** -- NGOs, foreign policy analysts, investors.

### Language

- **Bilingual: Arabic (primary) and English.** Full RTL support required.
- Arabic should be the default language. English as a toggle.

---

## 2. Core Features (Prioritized)

### Phase 1: Foundation (MVP)

#### 2.1 Government Hierarchy Explorer
An interactive organizational chart showing the full structure of the Egyptian state.

- **President** at the top, with constitutional powers listed
- **Prime Minister** and their role
- **Cabinet / Council of Ministers** -- all ~30 ministries with:
  - Current minister name, photo, appointment date
  - Ministry's stated mandate
  - Number of employees (where available)
  - Key agencies and authorities under each ministry
- **27 Governorates** -- interactive map showing:
  - Governor name and appointment date
  - Governorate capital, population, area
  - Local governance structure (districts/markaz)
- Click any node to drill down. Zoom in/out. Search by name or ministry.

**Data structure:** Tree/graph with expandable nodes. Think org chart meets mind map.

#### 2.2 Parliament Tracker

**House of Representatives (Magles El Sha3b):**
- 596 members: 448 constituency, 120 party list, 28 presidential appointees
- Member profiles: name, photo, party, constituency/governorate, committee memberships
- Filter/search by: governorate, party, committee, gender
- Committee breakdown: 18 standing committees with descriptions and members
- Speaker and leadership structure

**Senate (Magles El Shura):**
- 300 members: 100 individual, 100 proportional list, 100 presidential appointees
- Same profile and filter capabilities as House
- Committee structure and leadership

**Visualization types:**
- Hemicycle/parliament seating chart (color-coded by party)
- Governorate map overlay (click a governorate, see its MPs)
- Party composition donut/pie charts
- Committee membership matrix

#### 2.3 Constitution Visualizer
The full text of the 2014 Egyptian Constitution (with 2019 amendments), presented as an interactive, navigable document.

- **Chapter/Section navigation** -- the constitution organized by its structure:
  - Preamble
  - Part I: State (Articles 1-6)
  - Part II: Basic Components of Society (Articles 7-50)
  - Part III: Public Rights, Freedoms, and Duties (Articles 51-93)
  - Part IV: Rule of Law (Articles 94-100)
  - Part V: System of Government (Articles 101-221)
  - Part VI: General and Transitional Provisions (Articles 222-247)
- **Annotation layer** -- each article can have:
  - Plain-language summary (what does this actually mean?)
  - Cross-references to other articles
  - Historical context (was this amended in 2019?)
  - Related legislation
- **Search** -- full-text search across all articles
- **Visual connections** -- show which articles reference each other (network graph)
- **Side-by-side comparison** -- 2014 original vs. 2019 amendments where applicable

**Note on Pretext library:** Research confirms that `@chenglou/pretext` by Cheng Lou is a **text measurement and layout engine** (DOM-free multiline text measurement for virtualization and editors). It is NOT a document visualization library. It could be useful for rendering the constitution text with precise layout (especially for mixed Arabic/English content with proper RTL handling), but it is not a complete solution for interactive document visualization. Recommendation: use it as a layout primitive if needed, but build the interactive constitution viewer with custom React components + D3 for the cross-reference network graph.

#### 2.4 Budget and Spending Dashboard

Visual breakdown of the Egyptian government budget.

- **Revenue side:** Where does the money come from?
  - Tax revenue breakdown (income tax, VAT, customs, etc.)
  - Non-tax revenue (Suez Canal, petroleum, tourism, etc.)
  - Foreign aid and loans
  - Total: ~$60.7 billion (2025)

- **Expenditure side:** Where does the money go?
  - By ministry/sector (education, health, defense, infrastructure, debt service, etc.)
  - By type (wages, subsidies, capital investment, debt interest)
  - Total: ~$105.9 billion (2025)
  - Deficit: ~$45.2 billion (2025)

- **Visualization types:**
  - Treemap (proportional area by spending category)
  - Sankey diagram (flow from revenue sources to spending categories)
  - Stacked bar charts (year-over-year comparison)
  - Per-capita calculations ("your share" of spending by category)
  - Percentage-of-GDP overlays

- **Historical comparison:** Budget data across multiple fiscal years (at least 5 years)

### Phase 2: Depth

#### 2.5 National Debt Tracker

- **Current external debt:** $155.2 billion (2024)
- **Debt-to-GDP ratio:** 84% (2025)
- **Historical trend:** Line chart from 2000 to present
- **Major creditors:** Breakdown by lender (IMF, World Bank, Gulf states, bilateral, bonds)
- **Debt service:** How much of the annual budget goes to interest payments
- **Comparative context:** Egypt vs. regional peers (Turkey, Saudi Arabia, Morocco, Nigeria)
- **Real-time debt clock** (estimated, based on latest published rate of accumulation)

#### 2.6 Election Data Archive

- Past election results for parliamentary and presidential elections
- Voter turnout by governorate (choropleth map)
- Party performance over time

#### 2.7 Legislation Tracker

- Major laws passed, organized by session
- Which committee reviewed each law
- Timeline of a bill's journey through parliament

### Phase 3: Engagement

#### 2.8 "Your Governorate" Dashboard
- Enter your governorate, see a personalized view:
  - Your governor, your MPs, your senators
  - Budget allocation to your governorate
  - Local economic indicators

#### 2.9 Comparison Tools
- Compare any two ministries, governorates, or budget years side by side

#### 2.10 Data Export
- Download any visualization as PNG/SVG
- Download underlying data as CSV/JSON
- Embeddable iframes for journalists

---

## 3. Data Sources

All data must be cited. Every number on the site must link back to an official source.

### Primary Official Sources

| Source | URL | Data Available |
|--------|-----|----------------|
| Egyptian Parliament | https://www.parliament.gov.eg | Member lists, committees, session news, organizational structure |
| Egyptian Senate | https://www.senategov.eg | Senator lists, committees, leadership |
| Ahram Online | https://english.ahram.org.eg | Cabinet reshuffles, minister appointments (cabinet.gov.eg is JS-rendered, inaccessible to fetch) |
| Ministry of Finance | https://www.mof.gov.eg | Budget documents, financial statements, debt data |
| CAPMAS | https://www.capmas.gov.eg | Statistical yearbooks, population, economic indicators |
| Central Bank of Egypt | https://www.cbe.org.eg | Monetary data, external debt, reserves, exchange rates |
| Egyptian Gazette (Official) | https://www.vejarah.gov.eg | Laws and decrees as published |
| National Elections Authority | https://www.elections.eg | Election results, voter data |
| State Information Service | https://www.sis.gov.eg | Government structure, official information |
| Egyptian Constitution (Arabic) | Available via parliament.gov.eg | Full text of the 2014 constitution with 2019 amendments |

### Secondary / Verification Sources

| Source | URL | Data Available |
|--------|-----|----------------|
| World Bank - Egypt | https://data.worldbank.org/country/egypt-arab-rep | GDP, debt, economic indicators, time series |
| IMF - Egypt | https://www.imf.org/en/Countries/EGY | Article IV reports, lending data, fiscal analysis |
| CIA World Factbook | https://www.cia.gov/the-world-factbook/countries/egypt/ | Government overview, economic summary |
| Wikipedia (for cross-reference) | Various articles | Structure verification, historical context |
| Transparency International | https://www.transparency.org/en/countries/egypt | Corruption perception index |

### Data Collection Strategy

Most Egyptian government sites are JavaScript-rendered SPAs without public APIs. Data collection will require:

1. **Manual curation** for initial dataset (constitution text, current ministers, MP list)
2. **PDF extraction** for budget documents (Ministry of Finance publishes budget PDFs)
3. **World Bank API** for economic time-series data (they have a free REST API)
4. **CBE publications** for debt and financial data
5. **CAPMAS statistical yearbooks** (some available as PDFs, some as Excel files)

Data should be stored in Convex and updated on a defined schedule (quarterly for budget data, immediately for personnel changes like cabinet reshuffles).

---

## 4. Design System

### 4.1 Theme: Space Dark (Default Dark Mode)

```
Background:        #0A0A0F (near-black with blue undertone)
Surface:           #12121A (card backgrounds)
Surface Elevated:  #1A1A25 (modals, dropdowns)
Border:            #2A2A3A (subtle borders)
Text Primary:      #E8E8ED (off-white, easy on eyes)
Text Secondary:    #8888A0 (muted labels)
Text Tertiary:     #55556A (disabled/hint text)
Accent Primary:    #4F8CFF (bright blue -- links, CTAs)
Accent Secondary:  #7B61FF (purple -- secondary actions)
Success:           #34D399 (green -- positive trends)
Warning:           #FBBF24 (amber -- neutral alerts)
Danger:            #F87171 (red -- negative trends, debt)
Chart Palette:     ['#4F8CFF', '#7B61FF', '#34D399', '#FBBF24', '#F87171', '#06B6D4', '#F472B6', '#A78BFA']
```

### 4.2 Theme: Warm Papyrus (Default Light Mode)

```
Background:        #F5F0E8 (warm beige, paper-like)
Surface:           #FEFCF7 (near-white with warmth)
Surface Elevated:  #FFFFFF (pure white for modals)
Border:            #E0D8C8 (warm tan borders)
Text Primary:      #1A1714 (warm near-black)
Text Secondary:    #6B6356 (warm gray)
Text Tertiary:     #9A9082 (warm light gray)
Accent Primary:    #2563EB (strong blue)
Accent Secondary:  #7C3AED (deep purple)
Success:           #059669 (rich green)
Warning:           #D97706 (deep amber)
Danger:            #DC2626 (strong red)
Chart Palette:     ['#2563EB', '#7C3AED', '#059669', '#D97706', '#DC2626', '#0891B2', '#DB2777', '#7C3AED']
```

### 4.3 Typography

```
Heading Font:      "IBM Plex Sans Arabic" (supports Arabic + Latin, clean, modern, free)
Body Font:         "IBM Plex Sans Arabic" (same family for consistency)
Monospace Font:    "IBM Plex Mono" (for numbers, data tables, article references)
Code/Data Font:    "Tabular Nums" via font-feature-settings (for aligned numbers in tables)

Scale (desktop):
  H1:  2.5rem / 700 weight / -0.02em tracking
  H2:  2.0rem / 600 weight / -0.01em tracking
  H3:  1.5rem / 600 weight / 0 tracking
  H4:  1.25rem / 600 weight / 0 tracking
  Body: 1rem / 400 weight / 0.01em tracking
  Small: 0.875rem / 400 weight / 0.01em tracking
  Caption: 0.75rem / 400 weight / 0.02em tracking

Arabic-specific:
  - Line height: 1.8 for Arabic body text (taller than Latin)
  - Letter spacing: 0 for Arabic (never add tracking to Arabic script)
  - Direction: RTL for Arabic, LTR for English
```

### 4.4 Spacing System

```
Base unit: 4px
Scale: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 128
Card padding: 24px
Section gap: 48px
Page margin: 24px (mobile), 48px (tablet), 64px (desktop)
Max content width: 1280px
```

### 4.5 Component Patterns

- **Cards** with subtle borders, not shadows (cleaner in dark mode)
- **Data tables** with alternating row backgrounds (very subtle: 2% opacity difference)
- **Charts** with generous padding, clear labels, accessible color contrast
- **Tooltips** on hover for all data points (show exact values + source)
- **Breadcrumb navigation** for deep drill-downs
- **Skeleton loaders** for all async data
- **Empty states** with helpful messaging

### 4.6 Iconography

- Use Lucide React icons (consistent, open source, tree-shakeable)
- Custom icons only for Egyptian-specific elements (parliament symbol, governorate shields)

### 4.7 Motion

- Transitions: 200ms ease-out for UI elements
- Chart animations: 500ms ease-in-out for data transitions
- Page transitions: 300ms fade
- Respect `prefers-reduced-motion`

---

## 5. Recommended Tech Stack

### Within FoP Framework

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Framework** | Next.js 14+ (App Router) | FoP standard. SSR for SEO (critical for a public information site). |
| **Backend** | Convex | FoP standard. Real-time subscriptions for live data. |
| **Language** | TypeScript only | FoP standard. No exceptions. |
| **Styling** | Tailwind CSS 4 | Utility-first, excellent dark/light mode support, RTL-compatible. |
| **Component Library** | shadcn/ui | Accessible, unstyled primitives. Customize to match design system. |
| **Template** | `nextjs-convex` | FoP base template. |

### Visualization Libraries

| Library | Use Case | Rationale |
|---------|----------|-----------|
| **D3.js** | Core visualization engine | Gold standard. Required for: Sankey diagrams, force-directed graphs (constitution cross-references), treemaps, choropleth maps, custom parliament hemicycle. |
| **Observable Plot** | Simple charts (bar, line, area) | Built on D3, much simpler API. Use for straightforward charts where D3 is overkill. |
| **Visx (@visx/*)** | React-D3 bridge | Airbnb's low-level React bindings for D3. Provides React components for D3 primitives (axes, scales, shapes) without fighting React's rendering model. Use for charts that need tight React state integration. |
| **react-simple-maps** | Geographic maps | Specifically for the Egypt governorate map. Uses D3-geo under the hood but provides a clean React API. |
| **Framer Motion** | UI animations | Page transitions, chart entrance animations, interactive hover states. |

### Additional Libraries

| Library | Purpose |
|---------|---------|
| `next-intl` or `next-i18next` | Internationalization (Arabic/English) |
| `@radix-ui/react-*` | Accessible primitives (via shadcn/ui) |
| `lucide-react` | Icons |
| `@tanstack/react-table` | Data tables for MP lists, budget breakdowns |
| `@tanstack/react-virtual` | Virtualized lists for large datasets (596 MPs) |
| `fuse.js` | Client-side fuzzy search (search MPs, articles, ministries) |
| `date-fns` | Date formatting with Arabic locale support |
| `topojson-client` | Geographic data for Egypt map |
| `sharp` | Image optimization for member photos |

### Why NOT Recharts or Nivo?

- **Recharts:** Good for simple dashboards, but too rigid for the custom visualizations needed here (hemicycle, Sankey, org chart, constitution network). Lacks the flexibility.
- **Nivo:** Beautiful defaults but opinionated. Hard to customize to match a specific design system. Also lacks hemicycle and custom org chart support.
- **The stack above** (D3 + Visx + Observable Plot) gives maximum flexibility for custom visualizations while still being practical for standard charts.

---

## 6. Architecture Overview

```
                    +------------------+
                    |   Cloudflare     |
                    |   CDN + DNS      |
                    +--------+---------+
                             |
                    +--------+---------+
                    |   Next.js App    |
                    |   (SSR + SSG)    |
                    |                  |
                    |  /               |  -- Landing + overview
                    |  /government     |  -- Hierarchy explorer
                    |  /parliament     |  -- Parliament tracker
                    |  /constitution   |  -- Constitution viewer
                    |  /budget         |  -- Budget dashboard
                    |  /debt           |  -- Debt tracker
                    |  /governorates   |  -- Map + governorate data
                    |  /[lang]/...     |  -- i18n routing (ar/en)
                    +--------+---------+
                             |
                    +--------+---------+
                    |     Convex       |
                    |   (Backend)      |
                    |                  |
                    |  - Data storage  |
                    |  - Auth (admin)  |
                    |  - Search index  |
                    |  - Cron jobs     |
                    |    (data refresh)|
                    +------------------+
```

### Key Architecture Decisions

1. **Static Generation (SSG) where possible.** Government data changes infrequently (cabinet reshuffles maybe once a year, budgets annually). Pre-render pages at build time. Use ISR (Incremental Static Regeneration) with a 24-hour revalidation for most pages.

2. **Convex for the data layer.** Even though data changes infrequently, Convex gives us:
   - Structured schema with validation
   - Full-text search (for constitution articles, MP names)
   - Admin dashboard for data entry/updates
   - Real-time subscriptions (useful for admin seeing updates live)
   - Cron jobs for scheduled data pulls (World Bank API, CBE data)

3. **No user authentication for readers.** This is a public information site. No login required to view anything. Auth only for admin panel (data entry/corrections).

4. **Data pipeline:** Admin panel (protected) --> Convex mutations --> Convex DB --> Next.js reads via queries --> SSG/ISR pages.

5. **SEO is critical.** This site needs to rank for searches like "Egyptian government structure", "Egypt budget breakdown", "Egyptian parliament members". Server-side rendering and proper meta tags are essential.

6. **Accessibility (a11y).** All visualizations must have text alternatives. Screen readers must be able to navigate the data. WCAG 2.1 AA minimum.

---

## 7. Database Schema (Convex)

### Core Tables

```typescript
// convex/schema.ts

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({

  // ==========================================
  // GOVERNMENT HIERARCHY
  // ==========================================

  officials: defineTable({
    nameAr: v.string(),
    nameEn: v.string(),
    titleAr: v.string(),
    titleEn: v.string(),
    role: v.union(
      v.literal("president"),
      v.literal("prime_minister"),
      v.literal("minister"),
      v.literal("deputy_minister"),
      v.literal("governor"),
      v.literal("mp"),
      v.literal("senator"),
      v.literal("speaker"),
      v.literal("other")
    ),
    photoUrl: v.optional(v.string()),
    appointmentDate: v.optional(v.string()),  // ISO date
    endDate: v.optional(v.string()),
    isCurrent: v.boolean(),
    bioAr: v.optional(v.string()),
    bioEn: v.optional(v.string()),
    sourceUrl: v.optional(v.string()),
  })
    .index("by_role", ["role"])
    .index("by_isCurrent", ["isCurrent"])
    .index("by_role_and_isCurrent", ["role", "isCurrent"]),

  ministries: defineTable({
    nameAr: v.string(),
    nameEn: v.string(),
    mandateAr: v.optional(v.string()),
    mandateEn: v.optional(v.string()),
    currentMinisterId: v.optional(v.id("officials")),
    parentMinistryId: v.optional(v.id("ministries")), // for sub-agencies
    websiteUrl: v.optional(v.string()),
    employeeCount: v.optional(v.number()),
    establishedYear: v.optional(v.number()),
    sortOrder: v.number(),
  })
    .index("by_sortOrder", ["sortOrder"]),

  governorates: defineTable({
    nameAr: v.string(),
    nameEn: v.string(),
    capitalAr: v.string(),
    capitalEn: v.string(),
    currentGovernorId: v.optional(v.id("officials")),
    population: v.optional(v.number()),
    area: v.optional(v.number()),       // sq km
    isCity: v.boolean(),                // true for Cairo, Alexandria, Port Said, Suez
    geoJsonId: v.string(),             // maps to topojson feature
    regionAr: v.optional(v.string()),  // Upper Egypt, Lower Egypt, etc.
    regionEn: v.optional(v.string()),
  })
    .index("by_nameEn", ["nameEn"])
    .index("by_regionEn", ["regionEn"]),

  // ==========================================
  // PARLIAMENT
  // ==========================================

  parties: defineTable({
    nameAr: v.string(),
    nameEn: v.string(),
    abbreviation: v.optional(v.string()),
    color: v.string(),                 // hex color for visualizations
    logoUrl: v.optional(v.string()),
    foundedYear: v.optional(v.number()),
    ideology: v.optional(v.string()),
    websiteUrl: v.optional(v.string()),
  })
    .index("by_nameEn", ["nameEn"]),

  parliamentMembers: defineTable({
    officialId: v.id("officials"),
    chamber: v.union(v.literal("house"), v.literal("senate")),
    partyId: v.optional(v.id("parties")),
    governorateId: v.optional(v.id("governorates")),
    electionMethod: v.union(
      v.literal("constituency"),
      v.literal("party_list"),
      v.literal("presidential_appointment")
    ),
    constituency: v.optional(v.string()),
    termStart: v.string(),
    termEnd: v.optional(v.string()),
    isCurrent: v.boolean(),
    seatNumber: v.optional(v.number()),    // for hemicycle visualization
  })
    .index("by_chamber", ["chamber"])
    .index("by_chamber_and_isCurrent", ["chamber", "isCurrent"])
    .index("by_partyId", ["partyId"])
    .index("by_governorateId", ["governorateId"]),

  committees: defineTable({
    nameAr: v.string(),
    nameEn: v.string(),
    chamber: v.union(v.literal("house"), v.literal("senate")),
    descriptionAr: v.optional(v.string()),
    descriptionEn: v.optional(v.string()),
    chairpersonId: v.optional(v.id("officials")),
    type: v.union(
      v.literal("standing"),
      v.literal("special"),
      v.literal("general"),
      v.literal("ethics")
    ),
  })
    .index("by_chamber", ["chamber"])
    .index("by_chamber_and_type", ["chamber", "type"]),

  committeeMemberships: defineTable({
    committeeid: v.id("committees"),
    memberId: v.id("parliamentMembers"),
    role: v.union(
      v.literal("chair"),
      v.literal("vice_chair"),
      v.literal("member")
    ),
  })
    .index("by_committeeid", ["committeeid"])
    .index("by_memberId", ["memberId"]),

  // ==========================================
  // CONSTITUTION
  // ==========================================

  constitutionParts: defineTable({
    partNumber: v.number(),
    titleAr: v.string(),
    titleEn: v.string(),
    sortOrder: v.number(),
  })
    .index("by_sortOrder", ["sortOrder"]),

  constitutionArticles: defineTable({
    articleNumber: v.number(),
    partId: v.id("constitutionParts"),
    textAr: v.string(),
    textEn: v.string(),
    summaryAr: v.optional(v.string()),    // plain-language explanation
    summaryEn: v.optional(v.string()),
    wasAmended2019: v.boolean(),
    originalTextAr: v.optional(v.string()), // pre-2019 text if amended
    originalTextEn: v.optional(v.string()),
    keywords: v.array(v.string()),         // for search and tagging
  })
    .index("by_articleNumber", ["articleNumber"])
    .index("by_partId", ["partId"])
    .searchIndex("search_articles", {
      searchField: "textEn",
      filterFields: ["partId", "wasAmended2019"],
    }),

  articleCrossReferences: defineTable({
    fromArticleId: v.id("constitutionArticles"),
    toArticleId: v.id("constitutionArticles"),
    relationshipType: v.union(
      v.literal("references"),
      v.literal("amends"),
      v.literal("contradicts"),
      v.literal("elaborates")
    ),
    noteEn: v.optional(v.string()),
    noteAr: v.optional(v.string()),
  })
    .index("by_fromArticleId", ["fromArticleId"])
    .index("by_toArticleId", ["toArticleId"]),

  // ==========================================
  // BUDGET & SPENDING
  // ==========================================

  fiscalYears: defineTable({
    year: v.string(),                    // e.g. "2024-2025"
    startDate: v.string(),
    endDate: v.string(),
    totalRevenue: v.optional(v.number()),       // in EGP millions
    totalExpenditure: v.optional(v.number()),
    deficit: v.optional(v.number()),
    gdp: v.optional(v.number()),
    sourceUrl: v.optional(v.string()),
  })
    .index("by_year", ["year"]),

  budgetItems: defineTable({
    fiscalYearId: v.id("fiscalYears"),
    category: v.union(v.literal("revenue"), v.literal("expenditure")),
    sectorAr: v.string(),
    sectorEn: v.string(),
    parentItemId: v.optional(v.id("budgetItems")),  // for nested breakdowns
    amount: v.number(),                              // in EGP millions
    percentageOfTotal: v.optional(v.number()),
    percentageOfGdp: v.optional(v.number()),
    sourceUrl: v.optional(v.string()),
  })
    .index("by_fiscalYearId", ["fiscalYearId"])
    .index("by_fiscalYearId_and_category", ["fiscalYearId", "category"])
    .index("by_parentItemId", ["parentItemId"]),

  // ==========================================
  // NATIONAL DEBT
  // ==========================================

  debtRecords: defineTable({
    date: v.string(),                    // ISO date (quarter or month)
    totalExternalDebt: v.optional(v.number()),   // USD millions
    totalDomesticDebt: v.optional(v.number()),   // EGP millions
    debtToGdpRatio: v.optional(v.number()),      // percentage
    foreignReserves: v.optional(v.number()),     // USD millions
    sourceUrl: v.optional(v.string()),
  })
    .index("by_date", ["date"]),

  debtByCreditor: defineTable({
    debtRecordId: v.id("debtRecords"),
    creditorAr: v.string(),
    creditorEn: v.string(),
    creditorType: v.union(
      v.literal("multilateral"),         // IMF, World Bank
      v.literal("bilateral"),            // Country-to-country
      v.literal("commercial"),           // Banks, bonds
      v.literal("other")
    ),
    amount: v.number(),                  // USD millions
    percentageOfTotal: v.optional(v.number()),
  })
    .index("by_debtRecordId", ["debtRecordId"])
    .index("by_creditorType", ["creditorType"]),

  // ==========================================
  // DATA SOURCES & CITATIONS
  // ==========================================

  dataSources: defineTable({
    nameAr: v.string(),
    nameEn: v.string(),
    url: v.string(),
    type: v.union(
      v.literal("official_government"),
      v.literal("international_org"),
      v.literal("academic"),
      v.literal("media"),
      v.literal("other")
    ),
    lastAccessedDate: v.string(),
    notes: v.optional(v.string()),
  })
    .index("by_type", ["type"]),

  // ==========================================
  // ADMIN / CMS
  // ==========================================

  adminUsers: defineTable({
    email: v.string(),
    name: v.string(),
    role: v.union(v.literal("editor"), v.literal("admin")),
  })
    .index("by_email", ["email"]),

  dataUpdates: defineTable({
    tableName: v.string(),
    recordId: v.string(),
    updatedBy: v.id("adminUsers"),
    changeDescription: v.string(),
    timestamp: v.number(),
  })
    .index("by_tableName", ["tableName"])
    .index("by_timestamp", ["timestamp"]),
});
```

---

## 8. Page Structure / Information Architecture

```
/                          -- Hero + overview dashboard (key stats, quick links)
/ar/                       -- Arabic version of all pages
/en/                       -- English version of all pages

/government                -- Full hierarchy explorer (interactive org chart)
/government/president      -- President profile + constitutional powers
/government/cabinet        -- Cabinet overview + all ministers
/government/ministry/[id]  -- Individual ministry deep dive
/government/governorates   -- Map view of all 27 governorates
/government/governorate/[id] -- Individual governorate page

/parliament                -- Overview of both chambers
/parliament/house          -- House of Representatives
/parliament/senate         -- Senate
/parliament/member/[id]    -- Individual member profile
/parliament/committee/[id] -- Committee details + members
/parliament/parties        -- Party breakdown

/constitution              -- Interactive constitution browser
/constitution/part/[num]   -- Constitution part view
/constitution/article/[num]-- Individual article with annotations
/constitution/search       -- Full-text search
/constitution/amendments   -- 2019 amendments comparison view

/budget                    -- Budget dashboard (latest year)
/budget/[year]             -- Historical budget for specific year
/budget/compare            -- Year-over-year comparison tool

/debt                      -- National debt tracker
/debt/history              -- Historical debt timeline
/debt/creditors            -- Debt by creditor breakdown

/about                     -- About the project, methodology, team
/sources                   -- All data sources with citations
```

---

## 9. Visualization Specifications

### 9.1 Parliament Hemicycle

- Custom D3-based hemicycle (semicircular seating chart)
- Each seat is a dot/circle, colored by party
- Hover shows member name + party + governorate
- Click navigates to member profile
- Legend shows party colors and seat counts
- Toggle between House (596 seats) and Senate (300 seats)

### 9.2 Egypt Governorate Map

- TopoJSON-based SVG map of Egypt's 27 governorates
- Choropleth coloring based on selected metric (population, budget, MPs per capita, etc.)
- Click a governorate to see its dashboard
- Zoom/pan enabled
- Tooltip on hover with key stats

### 9.3 Budget Treemap

- Rectangular treemap where area = spending amount
- Color by category (education=blue, health=green, defense=red, etc.)
- Click to drill into subcategories
- Smooth animated transitions when switching years

### 9.4 Budget Sankey Diagram

- Left side: revenue sources (taxes, Suez Canal, petroleum, aid)
- Right side: spending categories (wages, subsidies, capital, debt service)
- Flow width proportional to amount
- Hover highlights a single flow path

### 9.5 Debt Timeline

- Line chart: external debt over time (20+ years)
- Secondary axis: debt-to-GDP ratio
- Annotations at key events (2011 revolution, IMF deals, 2024 float)
- Brushable zoom for time range selection

### 9.6 Constitution Network Graph

- Force-directed graph where nodes = articles, edges = cross-references
- Node size by number of connections
- Color by constitution part
- Click a node to read the article
- Zoom into clusters

### 9.7 Government Org Chart

- Top-down tree layout
- Collapsible nodes (click to expand/collapse children)
- Search/filter to highlight specific branches
- Minimap for navigation in large views

---

## 10. Implementation Phases

### Phase 1: Foundation (Weeks 1-4)

**Week 1-2: Scaffolding + Design System**
- Scaffold from `nextjs-convex` template
- Implement design system (both themes, typography, spacing)
- Set up i18n (Arabic + English with RTL support)
- Create shared layout components (header, footer, navigation, breadcrumbs)
- Set up Convex schema (all tables)
- Build admin data entry interface

**Week 3-4: Government Hierarchy + Parliament**
- Seed government hierarchy data (president, PM, ministers, governors)
- Build interactive org chart visualization
- Build governorate map (TopoJSON + react-simple-maps)
- Seed parliament member data (all 596 + 300)
- Build parliament hemicycle visualization
- Build member profile pages
- Build committee pages

### Phase 2: Constitution + Budget (Weeks 5-8)

**Week 5-6: Constitution Visualizer**
- Enter full constitution text (Arabic + English, all 247 articles)
- Build interactive document browser
- Build annotation system
- Build cross-reference network graph
- Build search functionality
- Build 2014 vs 2019 comparison view

**Week 7-8: Budget Dashboard**
- Enter budget data (at least 5 fiscal years)
- Build treemap visualization
- Build Sankey diagram
- Build year-over-year comparison charts
- Build per-capita calculator

### Phase 3: Debt + Polish (Weeks 9-12)

**Week 9-10: Debt Tracker**
- Enter historical debt data (World Bank API + CBE publications)
- Build debt timeline visualization
- Build creditor breakdown charts
- Build comparative context (vs regional peers)

**Week 11-12: Polish + Launch**
- SEO optimization (meta tags, structured data, sitemap)
- Performance optimization (lazy loading, code splitting, image optimization)
- Accessibility audit (screen reader testing, keyboard navigation)
- Mobile responsiveness pass
- Data verification / fact-checking pass
- Soft launch

### Phase 4: Engagement Features (Post-Launch)

- "Your Governorate" personalized dashboard
- Comparison tools
- Data export (PNG/SVG/CSV)
- Embeddable widgets for journalists
- Election data archive
- Legislation tracker

---

## 11. Key Risks and Mitigations

| Risk | Mitigation |
|------|-----------|
| Government data is scattered and not machine-readable | Manual curation with clear source citation. Use World Bank API as backup for economic data. |
| Arabic text rendering complexity (RTL, mixed direction) | Use IBM Plex Sans Arabic. Test early with real Arabic content. Use `dir="rtl"` properly. |
| Data accuracy concerns | Every number links to its source. Dual-source verification where possible. Clear "last updated" timestamps. |
| Large visualization performance on mobile | Progressive enhancement. Simplified visualizations on mobile. Lazy load heavy D3 visualizations. |
| Government site changes break data pipeline | Manual curation (not scraping) for most data. Convex cron jobs only for World Bank/CBE APIs. |
| Political sensitivity | Stick to facts only. No editorializing. No opinion. Just data + official sources. Methodology page explains approach. |

---

## 12. Success Metrics

- Organic search traffic for Egyptian government-related queries
- Time on site (target: 3+ minutes, indicating exploration)
- Pages per session (target: 4+, indicating drill-down behavior)
- Return visitor rate
- Data export downloads (indicates utility for journalists/researchers)
- Media citations / backlinks from news articles

---

## 13. Pretext Library Assessment

**What it is:** `@chenglou/pretext` is a pure JavaScript/TypeScript library for DOM-free multiline text measurement and layout. It calculates text height and line breaks using arithmetic rather than DOM reflows.

**What it is NOT:** It is not a document visualization library, not an interactive text annotation system, and not a rich text editor.

**Relevance to this project:** Moderate. It could be useful for:
- Precise text layout in SVG-based visualizations (article text inside chart labels)
- Calculating text dimensions for the constitution viewer without triggering reflows
- Mixed Arabic/English text measurement (it supports bidirectional text)

**Recommendation:** Do not build the constitution visualizer around Pretext. Use it as an optional optimization for text measurement in custom visualizations if performance profiling reveals DOM-based text measurement as a bottleneck. The constitution viewer should be built with standard React components, with D3 handling the network graph of cross-references.

---

## 14. FoP Template Recommendation

Use the **`nextjs-convex`** template as the base. This gives:
- Next.js App Router with TypeScript
- Convex backend pre-configured
- Standard project structure

Additional scaffolding needed beyond template:
- i18n setup (next-intl)
- Design system tokens (CSS custom properties for theming)
- D3/Visx visualization components directory
- Admin panel routes (protected)
- Data seeding scripts

---

*This document was produced by the FoP Prompt Helper agent. It is a design specification, not implementation code. Hand off to the Scaffolder agent to begin Phase 1.*
