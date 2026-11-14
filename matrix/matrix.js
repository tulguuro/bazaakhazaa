// Destiny matrix ("Хувь тавилангийн матриц") arithmetic.
//
// Everything is derived from three numbers of a birth date: the day, the
// month and the digit sum of the year. Any result above 22 is reduced by
// summing its digits, so every number on the chart is one of the 22 energies.
//
// The two source charts disagree in places, so there are two variants:
//   'hand'  — the hand-drawn practitioner chart: every line uses the main
//             centre and carries three more points on its inner half
//   'guide' — the online calculator shown in the 16-page guide: the family
//             (diagonal) lines use a centre of their own, and a health card
//             is read off the chart
// Both variants were checked number by number against those charts
// (see matrix.test.mjs).

export const VARIANTS = ['hand', 'guide'];

// Positions clockwise from the left point, which is age 0; each step is 10 years.
export const AROUND = ['left', 'tl', 'top', 'tr', 'right', 'br', 'bottom', 'bl'];

const digitSum = (n) => String(n).split('').reduce((sum, ch) => sum + Number(ch), 0);

export function reduce(n) {
  while (n > 22) n = digitSum(n);
  return n;
}

const add = (...ns) => reduce(ns.reduce((sum, n) => sum + n, 0));

export function isValidDate(year, month, day) {
  if (![year, month, day].every(Number.isInteger) || year < 1 || year > 9999) return false;
  const date = new Date(Date.UTC(2000, month - 1, day));
  date.setUTCFullYear(year);
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

// The 108 numbers of the hand chart: the nine main points, five on each of
// the eight lines, the three on the love and money line and the 56 of the
// age ring. The love/money midpoint sits on the bottom-right line too, so it
// counts once for each line. The number repeated most is the most
// influential one (the user's rule, 2026-11-13); ties list every such number.
export function dominantNumber(hand) {
  const values = [...Object.values(hand.points)];
  for (const line of Object.values(hand.lines)) {
    values.push(line.mid, line.inner, line.step1 ?? hand.loveMoney.mid, line.step2, line.step3);
  }
  values.push(hand.loveMoney.love, hand.loveMoney.mid, hand.loveMoney.money);
  for (const decade of hand.ring) values.push(...decade.points);
  const counts = new Map();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  const count = Math.max(...counts.values());
  const top = [...counts].filter(([, n]) => n === count).map(([value]) => value).sort((x, y) => x - y);
  // every number with how often it occurs, most frequent first
  const ranked = [...counts].sort((x, y) => y[1] - x[1] || x[0] - y[0]).map(([value, n]) => ({ value, count: n }));
  return { values: top, count, total: values.length, ranked };
}

// The user's links (2026-11-13). Each joins two main points and has two
// numbers: the BASE number, the two points added (Б 7 + Г 19 = 26 → 8), and
// the DETAILED number, every number on the chart between them, the two
// points included. The detailed number needs the hand chart's full lines.
const total = (values) => {
  const sum = values.reduce((acc, n) => acc + n, 0);
  return { values, sum, value: reduce(sum) };
};

// The thirteen numbers of a straight line through the centre, from one main
// point to the opposite one. On the bottom-right line the angel midpoint of
// the love line fills the first step's place.
function throughCentre(hand, from, to) {
  const step1 = (line) => line.step1 ?? hand.loveMoney.mid;
  const a = hand.lines[from];
  const b = hand.lines[to];
  return [
    hand.points[from], a.mid, a.inner, step1(a), a.step2, a.step3,
    hand.points.centre,
    b.step3, b.step2, step1(b), b.inner, b.mid, hand.points[to],
  ];
}

// The eleven numbers of an edge of the family square, from one corner to
// the next: the corner, the four age-ring numbers on the edge up to the
// 5-year star, the inner number of the axis line it crosses, the next four
// ring numbers from that star, and the far corner (confirmed by the user).
function squareEdge(hand, from, via, to) {
  const ring = Object.fromEntries(hand.ring.map((decade) => [decade.position, decade.points]));
  return [
    hand.points[from], ...ring[from].slice(0, 4),
    hand.lines[via].inner,
    ...ring[via].slice(3, 7), hand.points[to],
  ];
}

function link(m, from, to, between) {
  const base = total([m.points[from], m.points[to]]);
  return m.variant === 'hand' ? { ...base, detail: total(between(m)) } : base;
}
// Б (20) — Г (60): the sky–earth link (тэнгэр газрын холбоос)
export const skyEarthLink = (m) => link(m, 'top', 'bottom', (h) => throughCentre(h, 'top', 'bottom'));
// А (0) — В (40): the struggle of fate (хувь заяаны тэмцэл)
export const fateStruggle = (m) => link(m, 'left', 'right', (h) => throughCentre(h, 'left', 'right'));
// Е (10) — И (50): the fate of the father's line, all its good and bad
export const fatherLine = (m) => link(m, 'tl', 'br', (h) => throughCentre(h, 'tl', 'br'));
// Ж (30) — З (70): the fate of the mother's line, all its information
export const motherLine = (m) => link(m, 'tr', 'bl', (h) => throughCentre(h, 'tr', 'bl'));
// Е (10) — Ж (30): the men of the family line (удмын эрчүүдийн тоо)
export const familyMen = (m) => link(m, 'tl', 'tr', (h) => squareEdge(h, 'tl', 'top', 'tr'));
// И (50) — З (70): the women of the family line (удмын эмэгтэйчүүдийн тоо)
export const familyWomen = (m) => link(m, 'br', 'bl', (h) => squareEdge(h, 'br', 'bottom', 'bl'));

// "15 + 3 + 9 = 27 → 9": how a number on the chart was reached.
export function formula(...ns) {
  const raw = ns.reduce((sum, n) => sum + n, 0);
  return `${ns.join(' + ')} = ${raw}${raw > 22 ? ` → ${reduce(raw)}` : ''}`;
}

// A line runs from an outer point to a centre. `mid` and `inner` sit next to
// the outer point; step1…step3 walk the inner half toward the centre.
function line(outer, centre, innerHalf) {
  const inner = add(outer, centre);
  const result = { outer, mid: add(outer, inner), inner };
  if (innerHalf) {
    const step2 = add(inner, centre);
    Object.assign(result, { step1: add(inner, step2), step2, step3: add(step2, centre) });
  }
  return result;
}

export function computeMatrix({ year, month, day }, variant = 'hand') {
  if (!VARIANTS.includes(variant)) throw new Error(`Unknown variant: ${variant}`);
  if (!isValidDate(year, month, day)) throw new Error(`Not a calendar date: ${year}-${month}-${day}`);
  const a = reduce(day);
  const b = reduce(month);
  const c = reduce(digitSum(year));
  const d = add(a, b, c);
  const points = { left: a, top: b, right: c, bottom: d, centre: add(a, b, c, d), tl: add(a, b), tr: add(b, c), br: add(c, d), bl: add(d, a) };
  const matrix = fromPoints(points, variant);
  matrix.date = { year, month, day };
  matrix.yearSum = digitSum(year);
  return matrix;
}

// Everything else on the chart follows from the nine main points.
function fromPoints(points, variant) {
  const hand = variant === 'hand';
  const { left: a, top: b, right: c, bottom: d, centre, tl, tr, br, bl } = points;
  const familyCentre = add(tl, tr, br, bl);
  const diagonalCentre = hand ? centre : familyCentre;

  const lines = {
    left: line(a, centre, hand),
    top: line(b, centre, hand),
    right: line(c, centre, hand),
    bottom: line(d, centre, hand),
    tl: line(tl, diagonalCentre, hand),
    tr: line(tr, diagonalCentre, hand),
    br: line(br, diagonalCentre, hand),
    bl: line(bl, diagonalCentre, hand),
  };

  // The love and money line joins the inner points of the bottom and right lines.
  const loveMid = add(lines.bottom.inner, lines.right.inner);
  const loveMoney = {
    love: add(lines.bottom.inner, loveMid),
    mid: loveMid,
    money: add(lines.right.inner, loveMid),
  };
  // On the hand-drawn chart that midpoint occupies the first inner-half slot
  // of the bottom-right line, so the line has no number of its own there.
  if (hand) lines.br.step1 = null;

  // Yearly energies: seven points between each pair of neighbouring outer
  // points, found by repeated midpoints (the fourth is the 5-year mark).
  const outer = [a, tl, b, tr, c, br, d, bl, a];
  const ring = AROUND.map((position, k) => {
    const p0 = outer[k];
    const p8 = outer[k + 1];
    const p4 = add(p0, p8);
    const p2 = add(p0, p4);
    const p6 = add(p4, p8);
    return { position, age: k * 10, from: p0, to: p8, points: [add(p0, p2), p2, add(p2, p4), p4, add(p4, p6), p6, add(p6, p8)] };
  });

  const sky = add(b, d);
  const earth = add(a, c);
  const father = add(tl, br);
  const mother = add(tr, bl);
  const personal = add(sky, earth);
  const social = add(father, mother);
  const spiritual = add(personal, social);
  // The life purpose (энэ насны зорилго) in three steps: Д-1 is the centre,
  // Д-2 the four corners З + Е + Ж + И reduced, Д-3 = Д-1 + Д-2. It is the
  // same number as the guide's inner power code.
  const life = add(centre, familyCentre);
  const purposes = { life, sky, earth, personal, father, mother, social, spiritual, planetary: add(social, spiritual) };

  const matrix = {
    variant,
    points: { left: a, top: b, right: c, bottom: d, centre, tl, tr, br, bl },
    lines,
    loveMoney,
    ring,
    purposes,
  };

  // the karma (үйлийн үр, the user's reading): the bottom point Г and the two
  // numbers on its line towards the centre, read together from outside in
  matrix.karma = [d, lines.bottom.mid, lines.bottom.inner];
  // talents (авьяас), read like the Destiny Matrix calculators: from God on
  // the top line Б, from the mother on her line Ж, from the father on his
  // line Е — each the point, its mid and its inner number
  const along = (key) => [matrix.points[key], lines[key].mid, lines[key].inner];
  matrix.talents = { god: along('top'), mother: along('tr'), father: along('tl') };
  // the base number of each of the user's links: its two points added
  matrix.skyEarth = skyEarthLink(matrix);
  matrix.fate = fateStruggle(matrix);
  matrix.fatherLine = fatherLine(matrix);
  matrix.motherLine = motherLine(matrix);
  matrix.familyMen = familyMen(matrix);
  matrix.familyWomen = familyWomen(matrix);
  if (hand) matrix.dominant = dominantNumber(matrix);

  if (!hand) {
    const heartLeft = add(lines.left.inner, centre);
    const heartTop = add(lines.top.inner, centre);
    lines.left.heart = heartLeft;
    lines.top.heart = heartTop;
    matrix.familyCentre = familyCentre;
    matrix.innerPower = add(centre, familyCentre);
    const rows = [
      ['Sahasrara', a, b],
      ['Ajna', lines.left.mid, lines.top.mid],
      ['Vishuddha', lines.left.inner, lines.top.inner],
      ['Anahata', heartLeft, heartTop],
      ['Manipura', centre, centre],
      ['Svadhisthana', lines.right.inner, lines.bottom.inner],
      ['Muladhara', c, d],
    ].map(([chakra, physics, energy]) => ({ chakra, physics, energy, emotions: add(physics, energy) }));
    const total = (key) => add(...rows.map((row) => row[key]));
    matrix.health = [...rows, { chakra: 'Result', physics: total('physics'), energy: total('energy'), emotions: total('emotions') }];
  }
  return matrix;
}

// The couple matrix (матрица совместимости): the two partners' matrices
// (guide type) added position by position. Two ways are in use:
// 'all' — every position is the sum of the partners' same position, and only
//   the personal, social, spiritual and planetary purposes are rebuilt from
//   the summed sky, earth, father and mother lines (matrica-sudby.ru, numefy.ru);
// 'outer' — only the nine main points are summed and everything inside is
//   rebuilt from them by the usual rules (matrix-destiny.com).
// Both agree on the main points, corners, top and right lines, the bottom
// inner number, the love-line cross point and the purposes.
export const COUPLE_METHODS = ['all', 'outer'];

export function computeCouple(dateA, dateB, method = 'all') {
  if (!COUPLE_METHODS.includes(method)) throw new Error(`Unknown couple method: ${method}`);
  const [A, B] = [computeMatrix(dateA, 'guide'), computeMatrix(dateB, 'guide')];
  const points = Object.fromEntries(Object.keys(A.points).map((key) => [key, add(A.points[key], B.points[key])]));
  const couple = fromPoints(points, 'guide');
  if (method === 'all') {
    // sum every number of the two charts that sits at the same place
    const sum = (x, y) => (typeof x === 'number' && typeof y === 'number' ? add(x, y)
      : Array.isArray(x) ? x.map((v, k) => sum(v, y[k]))
        : x && typeof x === 'object' ? Object.fromEntries(Object.entries(x).map(([k, v]) => [k, k === 'position' || k === 'age' ? v : sum(v, y[k])]))
          : x);
    for (const key of ['lines', 'loveMoney', 'ring', 'health']) couple[key] = sum(A[key], B[key]);
    couple.karma = [couple.points.bottom, couple.lines.bottom.mid, couple.lines.bottom.inner];
    const { sky, earth, father, mother } = sum(A.purposes, B.purposes);
    const personal = add(sky, earth);
    const social = add(father, mother);
    const spiritual = add(personal, social);
    Object.assign(couple.purposes, { sky, earth, father, mother, personal, social, spiritual, planetary: add(social, spiritual) });
  }
  // the links and the life purpose belong to one person's chart, not a pair
  for (const key of ['skyEarth', 'fate', 'fatherLine', 'motherLine', 'familyMen', 'familyWomen', 'innerPower']) delete couple[key];
  delete couple.purposes.life;
  couple.method = method;
  couple.dates = [dateA, dateB];
  couple.partners = [A, B];
  return couple;
}

// Age ranges of the seven ring points within a decade, as the guide's
// calculator labels them ("11-12,5", "12,5-13,5", "13,5-14", "15", …).
export const RING_RANGES = [[1, 2.5], [2.5, 3.5], [3.5, 4], [5, 5], [6, 7.5], [7.5, 8.5], [8.5, 9]];

export function ringLabel(decadeAge, index) {
  const [from, to] = RING_RANGES[index].map((offset) => String(decadeAge + offset).replace('.', ','));
  return from === to ? from : `${from}-${to}`;
}

// The yearly energy at a given age. The calculator's labels leave gaps
// (for example 14 to 15), so each point also covers the gap after it.
export function ringPointAt(matrix, age) {
  const wrapped = ((age % 80) + 80) % 80;
  const decade = matrix.ring[Math.floor(wrapped / 10)];
  const within = wrapped - decade.age;
  if (within < 1) return { label: String(decade.age), value: decade.from };
  let index = 0;
  RING_RANGES.forEach(([from], k) => {
    if (within >= from - (k === 3 ? 0.5 : 0)) index = k;
  });
  if (within >= 9.5) return { label: String(decade.age + 10), value: decade.to };
  return { label: ringLabel(decade.age, index), value: decade.points[index] };
}

// The nine-cell number matrix (Pythagoras square), by the common method
// until the user's source says otherwise: write out the birth date's digits,
// then four working numbers — the digit sum of the date, its digit sum, the
// first minus twice the day's first non-zero digit, and that number's digit
// sum — and count how often each digit 1–9 occurs. The cells sit in three
// columns 1 2 3 · 4 5 6 · 7 8 9, so rows read 1 4 7 · 2 5 8 · 3 6 9.
export const PYTHAGORAS_LINES = ['147', '258', '369', '123', '456', '789', '159', '357'];

export function pythagoras({ year, month, day }) {
  const date = `${String(day).padStart(2, '0')}${String(month).padStart(2, '0')}${year}`;
  const first = digitSum(Number(date));
  const second = digitSum(first);
  const dayLead = Number(String(day).replace(/^0/, '')[0]);
  const third = Math.abs(first - 2 * dayLead);
  const fourth = digitSum(third);
  const working = [first, second, third, fourth];
  const counts = Object.fromEntries([1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => [d, 0]));
  for (const ch of date + working.join('')) if (ch !== '0') counts[ch] += 1;
  const lines = Object.fromEntries(PYTHAGORAS_LINES.map((cells) =>
    [cells, [...cells].reduce((sum, d) => sum + counts[d], 0)]));
  return { date, working, counts, lines };
}
