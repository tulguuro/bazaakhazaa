# Возрастная шкала / прогноз по годам — Насны мөчлөг (жилээр)

Research date 2026-11-13. Paraphrased themes, not quotes.

## Which of our positions this feeds

- Chapters "Current age energy" (`age-now`), "Next energy" (`age-next`), "Your eight decades" (A, TL, B, TR, C, BR, D, BL at 0, 10 … 70).
- Ring arithmetic (all sources agree, matches `matrix.js`): decade anchors 0 A, 10 TL, 20 B, 30 TR, 40 C, 50 BR, 60 D, 70 BL, 80 = A again.
  Inside a decade: P4 (x5) = start + end; P2 = start + P4; P6 = P4 + end; P1 = start + P2; P3 = P2 + P4; P5 = P4 + P6; P7 = P6 + end.
  gadalkindom gives the same order of calculation; mind.university's worked example (23.06.1992) gives 30→9, 31.25→21, 32.5→12,
  33.75→15, 35→3, … which our code reproduces.

## How sources find the energy of the CURRENT age (recorded exactly)

| Source | Age labels inside a decade | How the current age is matched | Notes |
|---|---|---|---|
| **mind.university** (po-godam) | 1.25, 2.5, 3.75, 5, 6.25, 7.5, 8.75 | "A fractional point belongs to the year it stands in": 33.75 governs **age 33 → 34** (whole years, birthday to birthday). Half-year points (x2.5, x7.5) split that year: first half one energy, second half the next. Energy does not switch on the birthday — it shifts gradually, felt months before or after. | Worked example 23.06.1992: "in 2026 he turns 34; the 33–34 segment is energy 15". Years x4 and x9 get no point of their own under this rule — the page does not say what governs them (FLAG). |
| **Ladini-style calculators** (astasynum.ru table, matrix-destiny.com article, our guide's calculator → `RING_RANGES`) | 1–2.5, 2.5–3.5, 3.5–4, 5, 6–7.5, 7.5–8.5, 8.5–9 | Ranges in years of age; no text on whole vs exact age. Gaps 0–1, 4–5, 9–10 are not labelled. | matrix-destiny.com shows the halving (5 → 2.5–3.5 → 1–2.5) but no matching rule. |
| **astasynum.ru** calculator | rows per 5 years (0, 5, 10 … 75), each with three energies labelled 1–2.5, 2.5–3.5, 3.5–4 (+offset) | Shows the current period with **calendar dates "Действует с … по …"**, i.e. computed from the exact birth date. Main energy of the period + two inner energies (inner state / outside events). | Details paywalled (PDF). |
| **gadalkindom.ru** (metodika) | "8 intervals of 1.25 years (about 456 days)" per 10-year sector | Implies exact time since birth in days; no matching example. | Same calculation order as ours. |
| **Lisovskaya** «Матрица судьбы: прогноз» (readli preview) | 0, 1, 2.5, 3.5, 5, 6–7.5 … (1 = 0 + 2.5; 3.5 = 2.5 + 5) | Whole and half years; after 80 the count restarts (81 → 1; age 87 falls on the "6–7.5" point). | The energy opening a 9-year cycle sets its rhythm; a small crisis each decade. |
| **numeria.ru, tenchat.ru, teletype @ideal_dian/prognoz** | none | **Calendar-year arcanum, not the ring:** reduce(birth day + birth month + calendar year), e.g. 14.07 + 2026 → 2047 → 13. tenchat reduces a day 23–31 first ("some sources do not", which changes results). | A different method; numeria calls it a rough estimate and sends readers to its calculator. |
| **Our code** (`report.js ageOn` + `matrix.js ringPointAt`) | Ladini ranges | **Exact fractional age** = (today − birth date) / 365.2425 days. Slots: <1 anchor; [1, 2.5) P1; [2.5, 3.5) P2; [3.5, 4.5) P3; [4.5, 6) P4; [6, 7.5) P5; [7.5, 8.5) P6; [8.5, 9.5) P7; ≥ 9.5 next anchor. Gap filling (4–4.5 → P3, 9–9.5 → P7) is our convention. | |

**Conflict to decide (FLAG):** for whole age 33 (33.0–34.0) mind.university gives P3 (33.75 point, energy 15 for the 1992 example);
our code gives P2 (12) until 33.5 and P3 only from 33.5 to 34.5. Similar half-year shifts at x8 (mind.university: 8.75 governs year 8;
ours: P6 until x8.5). Years x1, x2, x5, x6, x7 agree. The two schemes are both "Ladini", they only differ in labels — the numbers are the same.

## How a year energy is read (common rules)

- The decade anchor is the background for the decade; its first year sets the tone; the x5 point is an interim result (mind.university, Lisovskaya, zones.md).
- Read the plus first, then the minus; the energy describes the theme of the period, not fixed events (numeria, Lisovskaya).
- A year energy that repeats E, D or a purpose number is louder (mind.university, applied.md).
- Crisis / renewal energies: 13, 16, 22 (mind.university; some add 15, 18). A vc.ru AI-prompt article lists 13, 15, 16, 18, 22 as "dangerous years" — commercial text, low weight.
- 10, 30, 50, 70 switch on the ancestral corners one by one (applied.md).
- After 80 the ring restarts at A (Lisovskaya; matrix.js wraps age mod 80).

## Sources

| Code | URL | One line |
|---|---|---|
| MUY | https://ru.mind.university/matritsa-sudby/po-godam | rules, worked example, year meanings 3–22 |
| NUM | https://numeria.ru/blog/prognoz-po-matrice-sudby/ | calendar-year arcanum; 22-row plus/minus/advice table |
| IDP | https://teletype.in/@ideal_dian/prognoz | yearly energies 1–22 (calendar-year framing), plus/minus/advice |
| LIS | https://readli.net/chitat-online/?b=1271175&pg=2 | Lisovskaya forecast book preview: labels, cycles, no per-arcanum list |
| GDM | https://gadalkindom.ru/matritsa-sudby/metodika-raschyota.html | 1.25-year intervals, calculation order |
| MDF | https://matrix-destiny.com/to-know-the-future-based-on-your-date-of-birth-for-one-year/ | halving example, labels 5 / 2.5–3.5 / 1–2.5 |
| AST | https://astasynum.ru/calculator_matrix | 5-year periods with dates and three energies |
| TEN | https://tenchat.ru/zhekkotz | calendar-year arcanum; day 23–31 reduced first; notes Marseille vs Rider-Waite 8/11 |
| OWN | `matrix/data/readings.json` energies | owner's manuscript, general plus/minus (not time-specific) |

Could not read / not useful: vc.ru "стратегический прогноз" (AI prompt, no method); litres «Матрица судьбы. Прогнозирование» (no preview text);
matrix-destiny.com article gives no arcanum meanings; no sozai transcript on the age ring was found.

---

## 1
- **+** NUM: start, will — launch new things. IDP: new beginnings, projects, learning, useful contacts.
- **−** NUM: scattering, indecision. IDP: waiting for circumstances.
- **Зөвлөгөө:** act on your own; widen your circle.
- **Санал нийлэх / зөрөх:** on the ring 1 occurs only as an anchor: age 0 (born on the 1st) or age 20 (January) — never as a yearly point (checked for all dates 1900–2030). MUY has no text. OWN: leader, new ideas — fits "start".

## 2
- **+** NUM: intuition, study. IDP: quiet observation, inner insight.
- **−** NUM: revealing plans too early. IDP: forcing outcomes.
- **Зөвлөгөө:** listen to yourself, observe, learn.
- **Санал нийлэх / зөрөх:** on the ring 2 occurs only as an anchor: age 0 (born on the 2nd), 10 (TL = 2: 1 January), 20 (February), 40 (year digit sum 2, e.g. 2000) — never as a yearly point. MUY has no text. OWN (diplomacy, intuition) fits.

## 3
- **+** MUY: birth of a child, femininity theme; for men a new woman may appear. NUM: growth, creativity; invest in home, relationships, projects. IDP: ideas take shape, career momentum.
- **−** IDP: not named. (OWN minus: control, materialism.)
- **Зөвлөгөө:** be open to offers; invest in home and family.
- **Санал нийлэх / зөрөх:** agree (growth, family, children). MUY alone is concrete about pregnancy/new woman.

## 4
- **+** MUY: major family or project events — child, home, new venture. NUM: order, support; build a system. IDP: contracts and deals favourable.
- **−** NUM: rigidity. IDP: relationships turn formal, excess caution.
- **Зөвлөгөө:** build structure but stay flexible.
- **Санал нийлэх / зөрөх:** agree on "structure / foundations". OWN minus (control) = NUM's rigidity.

## 5
- **+** MUY: family or child possible, study and self-development. NUM: mentoring, learning, unions. IDP: reassessing values, honesty, trust.
- **−** IDP: pressure to take dubious shortcuts.
- **Зөвлөгөө:** study; act honestly within rules.
- **Санал нийлэх / зөрөх:** agree on learning. MUY/NUM add marriage/union. OWN: teaching, tradition — fits.

## 6
- **+** MUY: love or a child, or a team/beauty project. NUM: clear choice in relationships. IDP: emotional fullness, partnership offers.
- **−** NUM: avoiding decisions. IDP: doubt blocks choice.
- **Зөвлөгөө:** make the important decision this year.
- **Санал нийлэх / зөрөх:** full agreement (love + choice). OWN: love, relationships — fits.

## 7
- **+** MUY: career change, new project, travel. NUM: purposeful movement. IDP: rapid progress, new doors.
- **−** NUM: pushing through by force. IDP: overconfidence after wins.
- **Зөвлөгөө:** move with confidence but without a race; stay modest.
- **Санал нийлэх / зөрөх:** agree. OWN: goals, career ladder, travel.

## 8
- **+** MUY: pause to rethink principles and finish matters; karmic work. NUM: honesty, balance; good for legal matters. IDP: consequences of past actions, chance to correct mistakes.
- **−** MUY: can feel like a stop. IDP: manipulation leads to failure.
- **Зөвлөгөө:** settle legal and old matters; remember consequences.
- **Санал нийлэх / зөрөх:** agree (karma, law, finishing). OWN: cause-and-effect law; minus = same lesson repeats — fits "karmic year".

## 9
- **+** MUY: introspection, creativity. NUM: pause, search for meaning. IDP: maturity, clearer values.
- **−** NUM: total isolation. IDP: egoism.
- **Зөвлөгөө:** slow down; check whether life matches real wishes.
- **Санал нийлэх / зөрөх:** agree. OWN: solitude recharges wisdom — fits.

## 10
- **+** MUY: fateful turn. NUM: luck, change. IDP: turning point with signs, unexpected gains.
- **−** NUM: trying to control everything. IDP: resisting change.
- **Зөвлөгөө:** accept what life offers; be flexible.
- **Санал нийлэх / зөрөх:** full agreement. OWN: luck, flow — fits.

## 11
- **+** MUY: lots of energy, career openings. NUM: inner strength, patience. IDP: passion, creative surge, material growth.
- **−** NUM: suppressing emotions by force. IDP: intensity burns relationships.
- **Зөвлөгөө:** use the energy for projects; soften, don't force.
- **Санал нийлэх / зөрөх:** agree. (Calendar-year sources use Marseille 11 = Strength, same as us; TEN notes the Rider-Waite swap.) OWN: energy, many tasks; minus = forcing — fits.

## 12
- **+** MUY: trials; release something old, begin service. NUM: new angle of view. IDP: after patience a simpler solution appears.
- **−** NUM: clinging to control. IDP: stagnation, delays.
- **Зөвлөгөө:** let go of control; learn new methods.
- **Санал нийлэх / зөрөх:** agree ("pause, new view"). OWN minus: depression, hard to change anything — fits "stagnation".

## 13
- **+** MUY: crisis and sharp turn = renewal. NUM: clearing space for the new. IDP: room for new opportunities.
- **−** NUM: fear of change. IDP: painful separations and losses.
- **Зөвлөгөө:** let go of the old; close unfinished matters.
- **Санал нийлэх / зөрөх:** agree; all call it crisis-as-renewal. One of the "crisis" energies (MUY).

## 14
- **+** MUY: creativity, patience, acceptance. NUM: harmony, recovery. IDP: problems resolve, trust grows.
- **−** IDP: extremes in spending or saving.
- **Зөвлөгөө:** golden mean; measured pace.
- **Санал нийлэх / зөрөх:** agree. OWN: harmony, healing — fits.

## 15
- **+** MUY: very active year, many events, status rise, possible money; strong attraction. NUM: honesty with oneself. IDP: weaknesses become visible.
- **−** MUY: jealousy and conflict in relationships. NUM: addictions, temptations incl. money. IDP: easy-money shortcuts.
- **Зөвлөгөө:** watch jealousy; check where you are "captive".
- **Санал нийлэх / зөрөх:** **disagree in tone:** MUY treats 15 as a strong, eventful, money year; NUM/IDP and the vc.ru list treat it as a danger year. Both: temptation.

## 16
- **+** MUY: can be positive if handled well. NUM: the unreliable breaks, chance to rebuild. IDP: escape from limiting patterns.
- **−** MUY: crisis, loss of material stability. NUM: abrupt change. IDP: sudden collapses, relationship crises.
- **Зөвлөгөө:** build anew on a solid base; drop outdated beliefs.
- **Санал нийлэх / зөрөх:** agree; crisis energy everywhere. OWN minus: anger, chaos, injuries — supports a caution note.

## 17
- **+** MUY: talents surface, fateful events. NUM: hope, inspiration. IDP: renewal, long-term projects.
- **−** none named.
- **Зөвлөгөө:** declare yourself; start what matters.
- **Санал нийлэх / зөрөх:** agree (a good year). OWN: stands out, applause — fits "declare yourself".

## 18
- **+** MUY: introspection, psychology, working through fears. NUM: intuition. IDP: test of honesty and intuition.
- **−** NUM: anxiety, unclear situations. IDP: self-deception, hidden motives.
- **Зөвлөгөө:** don't rush to conclusions; verify facts.
- **Санал нийлэх / зөрөх:** agree. Sometimes listed as a crisis energy. OWN minus: fears, phobias.

## 19
- **+** MUY: relaxed, generally good. NUM: success, joy, publicity. IDP: recognition, harmony.
- **−** IDP: pride.
- **Зөвлөгөө:** year for achievements; stay generous.
- **Санал нийлэх / зөрөх:** agree (best year). OWN minus: overwork, self-blame — a useful caution.

## 20
- **+** MUY: forgiving parents, family matters. NUM: rebirth, clarity of calling. IDP: awakening, finding vocation.
- **−** IDP: disruptive upheaval.
- **Зөвлөгөө:** rethink your path; settle family matters.
- **Санал нийлэх / зөрөх:** MUY is family-focused, NUM/IDP calling-focused — combine both. OWN: kin, ancestors.

## 21
- **+** MUY: move abroad, travel, global project. NUM: completion of a cycle, result. IDP: stability, international ties.
- **−** none named.
- **Зөвлөгөө:** prepare for a new round; build a base.
- **Санал нийлэх / зөрөх:** agree (abroad / completion). OWN: travel, languages.

## 22
- **+** MUY: travel, wins, unexpected money. NUM: freedom, clean slate. IDP: lightness, new directions, financial push.
- **−** MUY: limits and dependencies. NUM: recklessness. IDP: freedom sliding into chaos.
- **Зөвлөгөө:** jump into the new consciously.
- **Санал нийлэх / зөрөх:** agree; listed as a crisis/renewal energy (MUY). OWN minus: confinement (prison, hospital) — matches MUY's "limits".

---

## Summary

- All sources share the ring arithmetic; they differ only in **labels** and in **how a birthday-to-birthday year is mapped**.
- mind.university (whole years, "point belongs to its year") and our code (exact age on Ladini ranges) give different energies for about
  half a year around x3.5 and x8.5 — choose one rule and state it on the page.
- Calendar-year "arcanum of the year" (day + month + year) is a separate method used by numeria/tenchat/@ideal_dian; do not mix it with the ring.
- Year meanings agree well across sources; the only clear tone conflict is 15 (eventful money year vs. danger year).
