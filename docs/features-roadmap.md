# Mizan Feature Roadmap — Inspired by BuildCanada

## Mapping BuildCanada projects → Egyptian equivalents

### Already Built (Phase 1-5)
| BuildCanada | Mizan Equivalent | Status |
|---|---|---|
| Canada Spends | `/budget` — Budget breakdown with CanadaSpends-style visualization | ✅ Building |
| Election Tracker | `/elections` — Presidential + parliamentary results with Egypt map | ✅ Done |
| Builder MP (bill analysis) | `/parliament` — Member profiles, party composition, committees | ✅ Done |

### To Build Next

#### 1. "Where Your Tax Dollars Go" → `/budget/your-share`
**What**: Personal tax calculator — enter your annual income, see exactly where your taxes go
- Input: annual salary in EGP
- Calculate: income tax paid based on Egyptian tax brackets
- Output: breakdown of YOUR money → education (X EGP), health (X EGP), debt service (X EGP), defense (X EGP)...
- Visualization: personal pie chart + itemized list
- **Data needed**: Egyptian income tax brackets (available from Tax Authority)
- **Impact**: Makes budget data PERSONAL — "you paid 12,400 EGP to debt interest this year"

#### 2. "Outcomes Tracker" → `/promises`
**What**: Track government promises and commitments
- Presidential promises from campaign/inauguration speeches
- "Egypt Vision 2030" goals and progress
- Infrastructure megaprojects (New Administrative Capital, Suez Canal expansion, etc.)
- For each promise: date made, current status (not started / in progress / completed / stalled), evidence, source
- Visualization: progress bars, timeline, completion percentage
- **Data needed**: Official government plans, Vision 2030 reports (available from planning ministry)

#### 3. "Trade/Economic Tracker" → `/economy`
**What**: Track key economic indicators in real-time
- GDP growth rate (quarterly)
- Inflation rate (monthly CPI from CAPMAS)
- Unemployment rate
- EGP exchange rate (vs USD, EUR, SAR)
- Foreign reserves (CBE monthly)
- Suez Canal revenue (monthly)
- Tourism revenue (quarterly)
- Remittances from diaspora
- Visualization: sparklines, trend charts, year-over-year comparison
- **Data needed**: CAPMAS statistical yearbook, CBE reports, World Bank API
- **Auto-refreshable**: Most of this data has APIs (World Bank, CBE)

#### 4. "Great Egyptian Builders" → `/figures`
**What**: Biographical profiles of significant Egyptian political/civic figures
- Current and historical leaders
- Key reformers, economists, activists
- Each profile: photo, bio, role, key achievements, controversies, sources
- **Data needed**: Curated from SIS, Wikipedia, academic sources

#### 5. "Tax Calculator" → `/tools/tax-calculator`
**What**: Calculate your Egyptian taxes
- Input: salary, employment type (public/private), marital status
- Output: income tax, social insurance, net salary
- Show comparison with regional peers (how does Egypt's tax burden compare to Saudi, UAE, Jordan?)
- **Data needed**: Egyptian Tax Authority brackets (publicly available)

#### 6. "Legislation Tracker" → `/legislation`
**What**: Track laws passed by parliament
- Each law: number, title, date passed, sponsoring committee, status
- Timeline of a bill's journey through parliament
- Search/filter by topic, year, committee
- **Data needed**: Official Gazette (Al-Waqa'i al-Masriya), parliament session records

#### 7. "Corruption Perception" → `/transparency/corruption`
**What**: Egypt's corruption indices and transparency metrics
- Transparency International CPI score + historical trend
- Government accountability metrics
- Comparison with regional peers
- Freedom of press index
- **Data needed**: TI reports, World Bank governance indicators (all public APIs)

#### 8. "Your Governorate" → `/governorate/[name]`
**What**: Personalized dashboard for your governorate
- Select your governorate → see YOUR governor, YOUR MPs, YOUR senators
- Budget allocation to your governorate
- Local economic indicators (unemployment, poverty rate)
- Schools/hospitals per capita
- **Data needed**: CAPMAS governorate-level data, local government reports

## Priority Order
1. 🔴 "Where Your Tax Dollars Go" — highest impact, makes data personal
2. 🔴 Economic Tracker — uses available APIs, high utility
3. 🟡 Outcomes/Promises Tracker — unique accountability tool
4. 🟡 Your Governorate Dashboard — personalized experience
5. 🟢 Tax Calculator — useful tool, straightforward
6. 🟢 Legislation Tracker — important but data-heavy
7. 🟢 Corruption Perception — sensitive but important
8. 🟢 Great Egyptian Figures — editorial content

## Data Availability Assessment
| Feature | Data Source | API Available? | Auto-refreshable? |
|---|---|---|---|
| Tax calculator | Tax Authority brackets | No (manual) | Yearly update |
| Economic tracker | World Bank, CBE, CAPMAS | Yes (World Bank API) | Daily/Monthly |
| Promises tracker | Government speeches, Vision 2030 | No (curated) | Manual |
| Your Governorate | CAPMAS statistical yearbook | Partial | Yearly |
| Legislation | Official Gazette | No (PDF extraction) | AI-assisted |
| Corruption index | Transparency International | Yes (public data) | Yearly |
