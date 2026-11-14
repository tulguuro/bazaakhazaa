// SVG drawings of a computed matrix, one per variant, each laid out like its
// source chart: the hand-drawn practitioner chart and the online calculator
// shown in the guide. Both return a complete <svg> string, so the same code
// serves the page and the export script.
import { AROUND, ringLabel } from './matrix.js';

const SIZE = 1040;
const C = SIZE / 2;
const FONT = "Inter, 'Segoe UI', system-ui, sans-serif";

// Direction of each position from the centre, in degrees (0 = right, 90 = up).
const ANGLE = { left: 180, tl: 135, top: 90, tr: 45, right: 0, br: 315, bottom: 270, bl: 225 };
const AXES = ['left', 'top', 'right', 'bottom'];
const DIAGONALS = ['tl', 'tr', 'br', 'bl'];

const round = (v) => Math.round(v * 10) / 10;
const polar = (deg, r) => [C + r * Math.cos((deg * Math.PI) / 180), C - r * Math.sin((deg * Math.PI) / 180)];
const mix = ([x1, y1], [x2, y2], t) => [x1 + (x2 - x1) * t, y1 + (y2 - y1) * t];
const move = ([x, y], [dx, dy], distance) => [x + dx * distance, y + dy * distance];
const unit = ([x1, y1], [x2, y2]) => {
  const length = Math.hypot(x2 - x1, y2 - y1);
  return [(x2 - x1) / length, (y2 - y1) / length];
};
// Unit normal of the segment p→q that points away from the centre.
const outward = (p, q) => {
  const [ux, uy] = unit(p, q);
  const [mx, my] = mix(p, q, 0.5);
  return ux * (my - C) - uy * (mx - C) > 0 ? [-uy, ux] : [uy, -ux];
};
const pts = (points) => points.map(([x, y]) => `${round(x)},${round(y)}`).join(' ');

function text([x, y], value, { size, fill, weight = 600, anchor = 'middle', rotate = 0 }) {
  const turn = rotate ? ` transform="rotate(${rotate} ${round(x)} ${round(y)})"` : '';
  return `<text x="${round(x)}" y="${round(y)}" dy="0.35em" text-anchor="${anchor}" font-size="${size}" font-weight="${weight}" fill="${fill}"${turn}>${value}</text>`;
}

function circle([x, y], r, { fill = 'none', stroke = 'none', width = 0 }) {
  return `<circle cx="${round(x)}" cy="${round(y)}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${width}"/>`;
}

function segment(p, q, stroke, width, dash = '') {
  const dashed = dash ? ` stroke-dasharray="${dash}"` : '';
  return `<line x1="${round(p[0])}" y1="${round(p[1])}" x2="${round(q[0])}" y2="${round(q[1])}" stroke="${stroke}" stroke-width="${width}" stroke-linecap="round"${dashed}/>`;
}

const outline = (points, stroke, width) =>
  `<polygon points="${pts(points)}" fill="none" stroke="${stroke}" stroke-width="${width}" stroke-linejoin="round"/>`;

function heart([x, y], s, { fill = 'none', stroke = 'none', width = 0 }) {
  const p = (dx, dy) => `${round(x + dx * s)} ${round(y + (dy - 0.1) * s)}`;
  const d = `M${p(0, 0.95)}C${p(-1.25, 0.05)} ${p(-0.85, -0.95)} ${p(0, -0.35)}C${p(0.85, -0.95)} ${p(1.25, 0.05)} ${p(0, 0.95)}Z`;
  return `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${width}" stroke-linejoin="round"/>`;
}

function star([x, y], outer, inner, { fill = 'none', stroke = 'none', width = 0 }) {
  const corners = [];
  for (let k = 0; k < 10; k++) {
    const a = ((k * 36 - 90) * Math.PI) / 180;
    const r = k % 2 ? inner : outer;
    corners.push([x + r * Math.cos(a), y + r * Math.sin(a)]);
  }
  return `<polygon points="${pts(corners)}" fill="${fill}" stroke="${stroke}" stroke-width="${width}" stroke-linejoin="round"/>`;
}

const frame = (title, body, viewBox = `0 0 ${SIZE} ${SIZE}`) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" role="img" font-family="${FONT}"><title>${title}</title>${body}</svg>`;

const dateText = ({ year, month, day }) => `${year}.${String(month).padStart(2, '0')}.${String(day).padStart(2, '0')}`;

// ---------- the hand-drawn chart ----------

const PEN = {
  paper: '#fbfaf5', ink: '#cf3a33', orange: '#f08a6b', blue: '#2f86c8', navy: '#27509b',
  violet: '#5a4bb3', leaf: '#8fd596', green: '#31b04b', pink: '#e56fa2', money: '#1f9d55',
};
// What the eight outer points mean, from the user's description of
// 2026-11-13. `word` names the point in place of its letter, `note` is the
// short line drawn under it with the age, `text` is the full meaning.
export const POINT_MEANINGS = {
  left: {
    word: 'Ирсэн шалтгаан', note: 'энэ дэлхийд төрсөн үүрэг',
    text: 'Энэ дэлхийд төрсөн үүрэг, энэ ертөнцөд ирсэн шалтгаан.',
  },
  tl: {
    word: 'Эцгийн удам', note: 'удмын өгөгдөл',
    text: 'Эцгийнхээ удмын шугамтай холбогддог. Удмын өгөгдлүүд бууж ирдэг, сайн муу бүх мэдээлэл эрчимждэг.',
  },
  top: {
    word: 'Тэнгэрлэг холбоо', note: 'идэр залуу',
    text: 'Идэр залуу нас. Тэнгэрлэг хүчтэйгээ холбогддог цаг үе: өндөр хэмжээсээс өгөгдөл бууж ирдэг, бурхантайгаа, тэнгэртэйгээ холбогддог үе.',
  },
  tr: {
    word: 'Эхийн удам', note: 'буян заяа',
    text: 'Ээжийн удам, угсаа. Эхийн талын үйлийн үрийн зангилаа, сайн муу мэдээллүүд, хувь тавилангийн шалгуур. Эхийн удмаас буян заяа бууж ирдэг нас.',
  },
  right: {
    word: 'Амьдралын зам', note: 'шилжилт, хөдөлгөөн',
    text: '0-ээс 40 нас хүртэлх амьдралын замыг даван туулж, эцэг эх, удмаас үлдсэн үйлийн үрийн зангилааг олж, түүнийг таньж мэдэн цааш амьдралынхаа зам руу нуруундаа ачаагүйгээр, өөрийн одыг дагаж, очиж болох оргил руугаа, дараагийн түвшин рүүгээ явах шилжилт, хөдөлгөөн.',
  },
  br: {
    word: 'Заяа тэгшлэх', note: 'удмаа сайжруулах',
    text: 'Эцгийн удамтайгаа дахин холбогдож, тавилан заяагаа тэгшилж, тамтаггүй тамын хөндийгөөсөө салж, заяаны 5 тэнгэртэйгээ дахин золгож, энерги эрчим, удмаа сайжруулах хэмжээнд ордог замчны зам.',
  },
  bottom: {
    word: 'Үйлийн үр', note: 'жаргах нас',
    text: 'Жаргах нас. Үйлийн үр.',
  },
  bl: {
    word: 'Гэгээрэл', note: 'ухаарах нас',
    text: 'Ухаарах нас: ухамсартай болдог, гэгээрлийн зам.',
  },
};
// age of each outer point on the life ring
export const POINT_AGES = { left: 0, tl: 10, top: 20, tr: 30, right: 40, br: 50, bottom: 60, bl: 70 };
export const HAND_LETTERS ={ left: 'А', top: 'Б', right: 'В', bottom: 'Г', centre: 'Д', tl: 'Е', tr: 'Ж', br: 'И', bl: 'З' };

// The green cog with a pink heart that marks the nine main numbers.
function cog(at, value, r, letter = '') {
  let out = '';
  for (let k = 0; k < 12; k++) {
    const a = ((k * 30 + 15) * Math.PI) / 180;
    const dir = [Math.cos(a), Math.sin(a)];
    out += segment(move(at, dir, r - 2), move(at, dir, r + 9), PEN.blue, 3) + circle(move(at, dir, r + 10), 3.2, { fill: PEN.blue });
  }
  out += circle(at, r, { fill: PEN.green }) + circle(at, r - 9, { fill: PEN.paper });
  out += heart(at, r - 13, { stroke: PEN.pink, width: 2 });
  if (letter) {
    out += text(move(at, [0, -1], 13), letter, { size: 15, fill: PEN.pink });
    out += text(move(at, [0, 1], 7), value, { size: 20, fill: PEN.ink });
  } else {
    out += text(at, value, { size: 21, fill: PEN.ink });
  }
  return out;
}

const penCircle = (at, r, value, stroke, size = 20) =>
  circle(at, r, { fill: PEN.paper, stroke, width: 3 }) + text(at, value, { size, fill: PEN.ink });

export function renderHand(m, { meanings = null } = {}) {
  const R = 400;
  const main = Object.fromEntries(AROUND.map((key) => [key, polar(ANGLE[key], R)]));
  const centre = [C, C];
  const on = (key, fraction) => polar(ANGLE[key], R * fraction);
  const loveFrom = on('bottom', Math.SQRT1_2);
  const loveTo = on('right', Math.SQRT1_2);
  let out = `<rect width="${SIZE}" height="${SIZE}" rx="20" fill="${PEN.paper}"/>`;

  // pen lines: orange rhombus and axes, blue square and diagonals
  out += outline(AXES.map((key) => main[key]), PEN.orange, 3.5);
  out += outline(DIAGONALS.map((key) => main[key]), PEN.blue, 3.5);
  out += segment(main.left, main.right, PEN.orange, 3) + segment(main.top, main.bottom, PEN.orange, 3);
  out += segment(main.tl, main.br, PEN.blue, 3) + segment(main.tr, main.bl, PEN.blue, 3);
  out += segment(loveFrom, loveTo, PEN.orange, 6);

  // yearly energies: three green circles on each leg of the star outline,
  // and a starred circle where the square and the rhombus cross (5-year marks)
  const crossing = (R * Math.SQRT1_2) / Math.cos(Math.PI / 8);
  m.ring.forEach((decade, k) => {
    const from = main[decade.position];
    const to = main[AROUND[(k + 1) % 8]];
    const cross = polar(ANGLE[decade.position] - 22.5, crossing);
    [[from, cross, [0, 1, 2]], [to, cross, [6, 5, 4]]].forEach(([start, end, indexes]) => {
      const along = unit(start, end);
      const away = outward(start, end);
      indexes.forEach((index, step) => {
        const at = move(move(start, along, 62 + step * 32), away, 19);
        out += circle(at, 15, { fill: PEN.paper, stroke: PEN.leaf, width: 2.5 }) + text(at, decade.points[index], { size: 16, fill: PEN.ink });
      });
    });
    out += circle(cross, 23, { fill: PEN.paper, stroke: PEN.blue, width: 3 });
    out += star(cross, 19, 9, { stroke: PEN.orange, width: 2 }) + text(cross, decade.points[3], { size: 18, fill: PEN.ink });
  });

  // numbers along the eight lines
  for (const key of AROUND) {
    const line = m.lines[key];
    out += penCircle(on(key, 0.215), 18, line.step3, PEN.leaf, 19);
    out += penCircle(on(key, 0.37), 19, line.step2, PEN.leaf);
    if (line.step1 !== null) out += penCircle(on(key, 0.53), 19, line.step1, PEN.violet);
    out += penCircle(on(key, Math.SQRT1_2), 21, line.inner, PEN.navy);
    out += penCircle(on(key, 0.86), 20, line.mid, PEN.blue);
  }

  // love (heart) and money (star) on the thick orange line
  const loveAt = mix(loveFrom, loveTo, 0.25);
  const moneyAt = mix(loveFrom, loveTo, 0.75);
  out += penCircle(mix(loveFrom, loveTo, 0.5), 20, m.loveMoney.mid, PEN.violet);
  out += heart(loveAt, 24, { fill: PEN.paper, stroke: PEN.orange, width: 3 }) + text(loveAt, m.loveMoney.love, { size: 20, fill: PEN.ink });
  out += heart(move(loveAt, [1, 1], 30), 8, { fill: PEN.orange });
  out += star(moneyAt, 30, 14, { fill: PEN.paper, stroke: PEN.money, width: 3 }) + text(moneyAt, m.loveMoney.money, { size: 19, fill: PEN.ink });
  out += text(move(moneyAt, [1, 1], 29), '$', { size: 20, fill: PEN.money, weight: 700 });

  const title = `${dateText(m.date)} · гар зургийн аргаар бодсон матриц`;
  if (meanings) {
    // the user's version: no letters; a point is named by what it means
    for (const key of AROUND) out += cog(main[key], m.points[key], 33);
    out += cog(centre, m.points.centre, 42);
    // every outer point: its word, then its age and short note
    const labels = Object.fromEntries(m.ring.map(({ position, age }) => {
      const meaning = meanings[position];
      return [position, meaning ? [meaning.word, `${age} нас · ${meaning.note}`] : [`${age} нас`]];
    }));
    // two keys in the free bottom corners: the inner marks on the left, the
    // combinations read from the whole chart on the right
    let key = '';
    const leftAt = (row) => [-MARGIN + 40, SIZE - 105 + row * 46];
    const rightAt = (row) => [SIZE + 20, SIZE - 440 + row * 56];
    const keyText = (at, label, value) =>
      text(move(at, [1, 0], 40), `${label} · ${value}`, { size: 20, fill: PEN.ink, weight: 600, anchor: 'start' });
    const subText = (at, value) => text(move(at, [1, 0.7], 40), value, { size: 17, fill: PEN.navy, weight: 500, anchor: 'start' });
    key += circle(leftAt(0), 16, { fill: PEN.paper, stroke: PEN.green, width: 5 }) + keyText(leftAt(0), 'Амин сүнс', m.points.centre);
    key += heart(leftAt(1), 18, { fill: PEN.paper, stroke: PEN.orange, width: 3 }) + keyText(leftAt(1), 'Хайр дурлал', m.loveMoney.love);
    key += circle(leftAt(2), 16, { fill: PEN.paper, stroke: PEN.violet, width: 3 }) + keyText(leftAt(2), 'Сахиусан тэнгэр', m.loveMoney.mid);
    key += star(leftAt(3), 20, 9, { fill: PEN.paper, stroke: PEN.money, width: 3 }) + keyText(leftAt(3), 'Мөнгө санхүү', m.loveMoney.money);
    // under each link's base number, its detailed number
    const detailText = (at, link, before = '') =>
      subText(at, [before, link.detail ? `дэлгэрэнгүй ${link.detail.value}` : ''].filter(Boolean).join(' · '));
    // a short bar drawn the way its line runs on the chart
    const bar = (at, [dx, dy]) => segment(move(at, [-dx, -dy], 18), move(at, [dx, dy], 18), PEN.orange, 5);
    let row = 0;
    if (m.skyEarth) {
      key += bar(rightAt(row), [0, 1]) + keyText(rightAt(row), 'Тэнгэр газрын холбоос', m.skyEarth.value) + detailText(rightAt(row), m.skyEarth);
      row++;
    }
    if (m.fate) {
      key += bar(rightAt(row), [1, 0]) + keyText(rightAt(row), 'Хувь заяаны тэмцэл', m.fate.value) + detailText(rightAt(row), m.fate);
      row++;
    }
    if (m.fatherLine) {
      key += bar(rightAt(row), [Math.SQRT1_2, Math.SQRT1_2]) + keyText(rightAt(row), 'Эцгийн удмын хувь заяа', m.fatherLine.value) + detailText(rightAt(row), m.fatherLine);
      row++;
    }
    if (m.motherLine) {
      key += bar(rightAt(row), [Math.SQRT1_2, -Math.SQRT1_2]) + keyText(rightAt(row), 'Эхийн удмын хувь заяа', m.motherLine.value) + detailText(rightAt(row), m.motherLine);
      row++;
    }
    // the square's edges are blue on the chart, so their bars are blue
    const edge = (at) => segment(move(at, [-1, 0], 18), move(at, [1, 0], 18), PEN.blue, 5);
    if (m.familyMen) {
      key += edge(rightAt(row)) + keyText(rightAt(row), 'Удмын эрчүүд', m.familyMen.value) + detailText(rightAt(row), m.familyMen, '10–30 нас');
      row++;
    }
    if (m.familyWomen) {
      key += edge(rightAt(row)) + keyText(rightAt(row), 'Удмын эмэгтэйчүүд', m.familyWomen.value) + detailText(rightAt(row), m.familyWomen, '50–70 нас');
      row++;
    }
    if (m.karma) {
      key += bar(rightAt(row), [0, 1]) + keyText(rightAt(row), 'Үйлийн үр', m.karma.join(' · ')) + subText(rightAt(row), 'Г ба түүний шугам, 60 нас');
      row++;
    }
    if (m.dominant) {
      const { values, count, total } = m.dominant;
      key += circle(rightAt(row), 16, { fill: '#f2c66d', stroke: PEN.ink, width: 2 })
        + keyText(rightAt(row), 'Хамгийн их нөлөөтэй', values.join(', ')) + subText(rightAt(row), `${total} тооноос ${count} удаа`);
    }
    return frame(title, meaningLabels(out, main, labels) + key, MEANING_VIEW);
  }

  // the nine main numbers, each with its letter in a heart
  for (const key of AROUND) {
    out += cog(main[key], m.points[key], 33);
    const tag = polar(ANGLE[key], R + 82);
    out += heart(tag, 19, { fill: PEN.paper, stroke: PEN.pink, width: 2.5 }) + text(tag, HAND_LETTERS[key], { size: 19, fill: PEN.ink });
  }
  out += cog(centre, m.points.centre, 42, HAND_LETTERS.centre);

  return frame(title, out);
}

// A wider canvas for the meaning labels around the chart.
const MARGIN = 330;
const MEANING_VIEW = `${-MARGIN} ${-MARGIN / 2} ${SIZE + 2 * MARGIN} ${SIZE + MARGIN}`;

// Each meaning is a few short lines written outside its point, pointing away
// from the centre. `meanings` maps a position (left, top, …) to its lines.
function meaningLabels(chart, main, meanings) {
  let out = `<rect x="${-MARGIN}" y="${-MARGIN / 2}" width="${SIZE + 2 * MARGIN}" height="${SIZE + MARGIN}" rx="24" fill="${PEN.paper}"/>${chart}`;
  for (const [key, lines] of Object.entries(meanings)) {
    const [dx, dy] = unit([C, C], main[key]);
    // clear of the cog's teeth, a little further out on the diagonals
    const [x, y] = move(main[key], [dx, dy], Math.abs(dx) > 0.3 && Math.abs(dy) > 0.3 ? 78 : 64);
    const anchor = Math.abs(dx) < 0.3 ? 'middle' : dx < 0 ? 'end' : 'start';
    const lineHeight = 31;
    // stack the lines so the block grows away from the chart
    const top = Math.abs(dx) < 0.3
      ? (dy < 0 ? y - (lines.length - 1) * lineHeight : y)
      : y - ((lines.length - 1) * lineHeight) / 2;
    lines.forEach((line, i) => {
      const first = i === 0 || lines.length === 1;
      out += text([x, top + i * lineHeight], line, { size: first ? 22 : 19, fill: first ? PEN.ink : PEN.navy, weight: first ? 700 : 500, anchor });
    });
  }
  return out;
}

// ---------- the map of the main points ----------

// Each outer point named after the chapters of the reading that are read
// from it (matrix/chapters.js): the main chapter, then the others.
export const MAP_POINTS = {
  left: ['Зан чанар', 'хувь хүний хөрөг'],
  tl: ['Эцгийн удам', 'үйлийн үр, авьяас'],
  top: ['Авьяас', 'дотоод ертөнц, итгэл'],
  tr: ['Эхийн удам', 'үйлийн үр, авьяас'],
  right: ['Сүнсний зорилго', 'санхүүгийн чулуу, бие'],
  br: ['Эцгийн удмын шугам', 'удмын хөтөлбөр'],
  bottom: ['Сүнсний сорилт', 'үйлийн үрийн түлхүүр'],
  bl: ['Эхийн удмын шугам', 'удмын хөтөлбөр'],
};

// Names of the inner points: one person's chart, then the couple's.
const PERSON_INNER = {
  topMid: 'Оюуны авьяас', topInner: 'Нийгмийн авьяас', left: 'Эцэг эх, хүүхэд', rightMid: 'Санхүүгийн эрчим', rightInner: 'Мөнгөний эхлэл',
  bottomInner: 'Өнгөрсний шарх', bottomMid: 'Одоогийн цуурай', love: 'Тохирох хань', cross: 'Мөнгө ба хүмүүс', money: 'Санхүүгийн суваг',
  centre: 'Цөм чанар', centreSub: 'амин тоо, тав тухын бүс',
};
const COUPLE_INNER = {
  topMid: '', topInner: '', left: 'Эцэг эх болохдоо', rightMid: '', rightInner: 'Мөнгөний суваг',
  bottomInner: 'Харилцааны суваг', bottomMid: 'Үйлийн үрийн сүүл', love: 'Харилцааг тэжээгч', cross: 'Мөнгө ба мэдрэмж', money: 'Хосын мөнгө',
  centre: 'Хосын уур амьсгал', centreSub: '',
};
// The couple matrix's outer points, after the Russian compatibility zones.
export const COUPLE_POINTS = {
  left: ['Бусдад харагдах байдал', 'учирсны шалтгаан'],
  tl: ['Холбоог барьдаг зүйл', 'хосын түшиг'],
  top: ['Хосын нөөц, авьяас', 'учирсны шалтгаан'],
  tr: ['Харилцааны сул тал', 'юу эвдэж болох'],
  right: ['Эд хөрөнгө, гэр орон', 'бэрхшээл, сорилт'],
  br: ['Эцгийн удмын шугам', 'удмын хөтөлбөр'],
  bottom: ['Хосын гол сургамж', 'бэрхшээл, сорилт'],
  bl: ['Эхийн удмын шугам', 'удмын хөтөлбөр'],
};

// A short name beside a point, ringed with paper so it reads over lines.
function tag([x, y], value, { anchor = 'start', size = 21, fill = PEN.navy, weight = 600 } = {}) {
  return `<text x="${round(x)}" y="${round(y)}" dy="0.35em" text-anchor="${anchor}" font-size="${size}" font-weight="${weight}" fill="${fill}" stroke="${PEN.paper}" stroke-width="7" stroke-linejoin="round" paint-order="stroke">${value}</text>`;
}

const leader = (from, to) => segment(from, to, PEN.navy, 1.5, '3 4');

// The hand chart reduced to its main points, each named by what it means.
// `blank` draws the letters instead of one person's numbers.
export function renderMap(m, { blank = false, couple = Boolean(m.dates) } = {}) {
  const R = 400;
  const main = Object.fromEntries(AROUND.map((key) => [key, polar(ANGLE[key], R)]));
  const centre = [C, C];
  const on = (key, fraction) => polar(ANGLE[key], R * fraction);
  const show = (value) => (blank ? '' : value);
  const loveFrom = on('bottom', Math.SQRT1_2);
  const loveTo = on('right', Math.SQRT1_2);
  let out = '';

  out += outline(AXES.map((key) => main[key]), PEN.orange, 3.5);
  out += outline(DIAGONALS.map((key) => main[key]), PEN.blue, 3.5);
  out += segment(main.left, main.right, PEN.orange, 3) + segment(main.top, main.bottom, PEN.orange, 3);
  out += segment(main.tl, main.br, PEN.blue, 3) + segment(main.tr, main.bl, PEN.blue, 3);
  out += segment(loveFrom, loveTo, PEN.orange, 6);

  // the inner and middle number on each of the four axes
  const inner = (key) => on(key, Math.SQRT1_2);
  const mid = (key) => on(key, 0.86);
  for (const key of AXES) {
    out += penCircle(inner(key), 21, show(m.lines[key].inner), PEN.navy);
    out += penCircle(mid(key), 20, show(m.lines[key].mid), PEN.blue);
  }

  const loveAt = mix(loveFrom, loveTo, 0.25);
  const crossAt = mix(loveFrom, loveTo, 0.5);
  const moneyAt = mix(loveFrom, loveTo, 0.75);
  out += penCircle(crossAt, 20, show(m.loveMoney.mid), PEN.violet);
  out += heart(loveAt, 24, { fill: PEN.paper, stroke: PEN.orange, width: 3 }) + text(loveAt, show(m.loveMoney.love), { size: 20, fill: PEN.ink });
  out += star(moneyAt, 30, 14, { fill: PEN.paper, stroke: PEN.money, width: 3 }) + text(moneyAt, show(m.loveMoney.money), { size: 19, fill: PEN.ink });

  for (const key of AROUND) out += cog(main[key], blank ? HAND_LETTERS[key] : m.points[key], 33);
  out += cog(centre, blank ? HAND_LETTERS.centre : m.points.centre, 42);

  // names of the inner points, beside them or at the end of a dotted line
  const N = couple ? COUPLE_INNER : PERSON_INNER;
  const [cx, cy] = centre;
  const put = (value, draw) => (value ? draw(value) : '');
  out += put(N.topMid, (v) => tag(move(mid('top'), [1, 0], 30), v));
  out += put(N.topInner, (v) => tag(move(inner('top'), [1, 0], 32), v));
  out += put(N.left, (v) => tag(mix(mid('left'), inner('left'), 0.5).map((z, i) => (i ? z - 52 : z + 6)), v, { anchor: 'middle' }));
  out += put(N.rightMid, (v) => leader(move(mid('right'), [0, -1], 22), [mid('right')[0] + 14, cy - 66]) + tag([mid('right')[0] + 18, cy - 80], v));
  out += put(N.rightInner, (v) => leader(move(inner('right'), [0, -1], 23), [mid('right')[0] + 8, cy - 112]) + tag([mid('right')[0] + 18, cy - 122], v));
  out += put(N.bottomInner, (v) => tag(move(inner('bottom'), [-1, 0], 32), v, { anchor: 'end' }));
  out += put(N.bottomMid, (v) => tag(move(mid('bottom'), [-1, 0], 30), v, { anchor: 'end' }));
  out += put(N.love, (v) => tag(move(loveAt, [1, 1], 30), v, { fill: PEN.ink }));
  out += put(N.cross, (v) => tag(move(crossAt, [1, 1], 26), v, { fill: PEN.violet }));
  out += put(N.money, (v) => tag(move(moneyAt, [1, 1], 34), v, { fill: PEN.money }));
  out += tag([cx, cy + 74], N.centre, { anchor: 'middle', size: 21, fill: PEN.ink, weight: 700 });
  out += put(N.centreSub, (v) => tag([cx, cy + 100], v, { anchor: 'middle', size: 18 }));

  const names = couple ? COUPLE_POINTS : MAP_POINTS;
  const labels = Object.fromEntries(AROUND.map((key) => [key, [names[key][0], couple ? names[key][1] : `${POINT_AGES[key]} нас · ${names[key][1]}`]]));
  let page = meaningLabels(out, main, labels);

  // the purposes in one row under the chart
  const { personal, social, spiritual, planetary } = m.purposes;
  const row = [['Хувийн зорилго', personal], ['Нийгмийн зорилго', social], ['Сүнслэг зорилго', spiritual], ...(couple ? [] : [['Хорвоо ертөнцийн зорилго', planetary]])];
  row.forEach(([name, value], i) => {
    page += tag([C + (i - (row.length - 1) / 2) * 370, SIZE + 85], blank ? name : `${name} · ${value}`, { anchor: 'middle', size: 21, fill: PEN.ink, weight: 700 });
  });
  const when = couple ? m.dates.map(dateText).join(' + ') : blank ? '' : dateText(m.date);
  if (when) page += tag([-MARGIN + 40, -MARGIN / 2 + 44], when, { size: 24, fill: PEN.ink, weight: 700 });

  const title = couple ? `${when} · хосын матриц` : blank ? 'Матрицын гол цэгүүд' : `${when} · матрицын гол цэгүүд`;
  return frame(title, page, MEANING_VIEW);
}

// ---------- a small chart that points at positions ----------

// Positions that are not drawn themselves light up the points they are
// added from.
const LOCATOR_SOURCES = {
  'purposes.sky': ['top', 'bottom'], 'purposes.earth': ['left', 'right'], 'purposes.personal': ['top', 'bottom', 'left', 'right'],
  'purposes.father': ['tl', 'br'], 'purposes.mother': ['tr', 'bl'], 'purposes.social': ['tl', 'tr', 'br', 'bl'],
  'purposes.spiritual': AROUND, 'purposes.planetary': AROUND, 'purposes.life': ['centre', 'tl', 'tr', 'br', 'bl'],
  familyCentre: ['tl', 'tr', 'br', 'bl'], ring: AROUND,
};
const LOC = { line: '#d9cfb6', node: '#fbf6ea', edge: '#c7b998', ink: '#8b8775', hot: '#b88a2e', hotEdge: '#7a5a17', hotInk: '#ffffff' };

// The chart reduced to its main and axis points with their numbers; the
// positions in `at` (chapter keys such as 'centre', 'bottom.mid',
// 'loveMoney.love', 'purposes.social') are filled gold.
export function renderLocator(m, at, { blank = false } = {}) {
  const R = 400;
  const main = Object.fromEntries(AROUND.map((key) => [key, polar(ANGLE[key], R)]));
  const on = (key, fraction) => polar(ANGLE[key], R * fraction);
  const loveFrom = on('bottom', Math.SQRT1_2);
  const loveTo = on('right', Math.SQRT1_2);
  const nodes = [];
  for (const key of AROUND) nodes.push([key, main[key], m.points[key], 54, 46]);
  nodes.push(['centre', [C, C], m.points.centre, 60, 50]);
  for (const key of AXES) {
    nodes.push([`${key}.inner`, on(key, Math.SQRT1_2), m.lines[key].inner, 38, 36]);
    nodes.push([`${key}.mid`, on(key, 0.86), m.lines[key].mid, 38, 36]);
  }
  nodes.push(['loveMoney.love', mix(loveFrom, loveTo, 0.25), m.loveMoney.love, 38, 36]);
  nodes.push(['loveMoney.mid', mix(loveFrom, loveTo, 0.5), m.loveMoney.mid, 38, 36]);
  nodes.push(['loveMoney.money', mix(loveFrom, loveTo, 0.75), m.loveMoney.money, 38, 36]);
  const hot = new Set(at.flatMap((key) => LOCATOR_SOURCES[key] ?? [key]));
  let out = outline(AXES.map((key) => main[key]), LOC.line, 5) + outline(DIAGONALS.map((key) => main[key]), LOC.line, 5);
  out += segment(main.left, main.right, LOC.line, 4) + segment(main.top, main.bottom, LOC.line, 4);
  out += segment(main.tl, main.br, LOC.line, 4) + segment(main.tr, main.bl, LOC.line, 4) + segment(loveFrom, loveTo, LOC.line, 8);
  if (at.includes('ring')) out += outline(AROUND.map((key) => polar(ANGLE[key], R + 62)), LOC.hot, 8);
  for (const [key, xy, value, r, size] of nodes) {
    const lit = hot.has(key);
    // lit positions are drawn larger, with a soft halo
    out += (lit ? circle(xy, r * 1.12 + 12, { fill: 'rgba(184,138,46,0.22)' }) : '')
      + circle(xy, lit ? r * 1.12 : r, { fill: lit ? LOC.hot : LOC.node, stroke: lit ? LOC.hotEdge : LOC.edge, width: lit ? 6 : 3 })
      + text(xy, blank ? '' : value, { size: lit ? size * 1.12 : size, fill: lit ? LOC.hotInk : LOC.ink, weight: lit ? 700 : 500 });
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="20 20 1000 1000" class="locator" role="img" font-family="${FONT}"><title>Матриц дээрх байрлал</title>${out}</svg>`;
}

// ---------- the guide's calculator ----------

const INK = {
  paper: '#ffffff', line: '#1c1c1c', axis: '#8d8d8d', label: '#757575', number: '#222222',
  purple: '#8e44ad', blue: '#4c6ef5', cyan: '#3bc9db', red: '#f04747', orange: '#f5a524',
  yellow: '#fae14b', green: '#8ed24f', male: '#7e3fb8', female: '#e04848', dollar: '#7cc242',
};
const AGE = 'нас';
const badge = (at, r, value, fill, size, ink = '#ffffff', stroke = 'none') =>
  circle(at, r, { fill, stroke, width: stroke === 'none' ? 0 : 2 }) + text(at, value, { size, fill: ink });
const plain = (at, r, value, size) => badge(at, r, value, INK.paper, size, INK.number, INK.line);

function arrow(from, to, stroke) {
  const dir = unit(from, to);
  const side = [-dir[1], dir[0]];
  const base = move(to, dir, -13);
  const head = `<polygon points="${pts([to, move(base, side, 6.5), move(base, side, -6.5)])}" fill="${stroke}"/>`;
  return segment(from, base, stroke, 2.5) + head;
}

export function renderGuide(m) {
  const R = 370;
  const MAIN = 30;
  const main = Object.fromEntries(AROUND.map((key) => [key, polar(ANGLE[key], R)]));
  const centre = [C, C];
  const on = (key, fraction) => polar(ANGLE[key], R * fraction);
  const midAt = (R - MAIN - 24) / R;
  const inner = Object.fromEntries(AROUND.map((key) => [key, on(key, Math.SQRT1_2)]));
  let out = `<rect width="${SIZE}" height="${SIZE}" rx="20" fill="${INK.paper}"/>`;

  // the age ring runs just outside the eight outer circles
  const ringAt = (key) => polar(ANGLE[key], R + MAIN + 10);
  out += outline(AROUND.map(ringAt), INK.line, 1.5);
  out += outline(AXES.map((key) => main[key]), INK.line, 1.8) + outline(DIAGONALS.map((key) => main[key]), INK.line, 1.8);
  out += segment(main.left, main.right, INK.axis, 1.2) + segment(main.top, main.bottom, INK.axis, 1.2);

  // family lines: father's side runs top-left to bottom-right, mother's the other way
  for (const [key, stroke] of [['tl', INK.male], ['br', INK.male], ['tr', INK.female], ['bl', INK.female]]) {
    out += arrow(on(key, 42 / R), on(key, Math.SQRT1_2 - 22 / R), stroke);
  }
  const along = (key, fraction, [dx, dy], distance) => move(on(key, fraction), [dx, dy], distance);
  out += text(along('tl', 0.41, [Math.SQRT1_2, -Math.SQRT1_2], 13), 'эцгийн удмын шугам', { size: 14, fill: INK.number, weight: 500, rotate: 45 });
  out += text(along('tr', 0.41, [Math.SQRT1_2, Math.SQRT1_2], 14), 'эхийн удмын шугам', { size: 14, fill: INK.number, weight: 500, rotate: -45 });

  // love and money line
  out += segment(inner.bottom, inner.right, INK.axis, 1.5, '7 7');

  // yearly energies: seven dots per decade, each with its number and age range.
  // The calculator prints the ranges inside the ring; here they sit beyond
  // the numbers, where they cannot run into the circles.
  m.ring.forEach((decade, k) => {
    const from = ringAt(decade.position);
    const to = ringAt(AROUND[(k + 1) % 8]);
    const away = outward(from, to);
    decade.points.forEach((value, index) => {
      const dot = mix(from, to, (index + 1) / 8);
      const marked = index === 3;
      const number = move(dot, away, 21);
      out += circle(dot, marked ? 5.5 : 4, marked ? { fill: INK.paper, stroke: INK.line, width: 2 } : { fill: INK.line });
      out += text(number, value, { size: marked ? 21 : 19, fill: INK.number, weight: marked ? 700 : 500 });
      const label = marked ? `${ringLabel(decade.age, index)} ${AGE}` : ringLabel(decade.age, index);
      const style = { size: 11, fill: INK.label, weight: marked ? 700 : 400 };
      if (Math.abs(away[0]) > 0.6) {
        // steep side: beside the number
        out += text([dot[0] + Math.sign(away[0]) * 37, number[1]], label, { ...style, anchor: away[0] > 0 ? 'start' : 'end' });
      } else {
        out += text(move(dot, away, 40), label, style);
      }
    });
    // decade labels beside the ring's corners
    const corner = move(from, [Math.cos((ANGLE[decade.position] * Math.PI) / 180), -Math.sin((ANGLE[decade.position] * Math.PI) / 180)], 16);
    const side = Math.cos((ANGLE[decade.position] * Math.PI) / 180);
    out += text(corner, `${decade.age} ${AGE}`, { size: 15, fill: INK.number, weight: 700, anchor: side < -0.3 ? 'end' : side > 0.3 ? 'start' : 'middle' });
  });

  // the four axis lines: purple → blue → cyan on the left and top, red → white → orange on the right and bottom
  for (const key of ['left', 'top']) {
    out += badge(on(key, 0.43), 20, m.lines[key].heart, INK.green, 19);
    out += badge(inner[key], 20, m.lines[key].inner, INK.cyan, 19);
    out += badge(on(key, midAt), 23, m.lines[key].mid, INK.blue, 22);
    out += badge(main[key], MAIN, m.lines[key].outer, INK.purple, 28);
  }
  for (const key of ['right', 'bottom']) {
    out += badge(inner[key], 20, m.lines[key].inner, INK.orange, 19);
    out += plain(on(key, midAt), 23, m.lines[key].mid, 22);
    out += badge(main[key], MAIN, m.lines[key].outer, INK.red, 28);
  }
  // the family square's corners
  for (const key of DIAGONALS) {
    out += plain(inner[key], 20, m.lines[key].inner, 19);
    out += plain(on(key, midAt), 23, m.lines[key].mid, 22);
    out += plain(main[key], MAIN, m.lines[key].outer, 28);
  }

  // centre, with the family centre and their sum to its right
  out += badge(centre, 40, m.points.centre, INK.yellow, 36, INK.number);
  out += plain([C + 66, C], 24, m.familyCentre, 24) + plain([C + 111, C], 19, m.innerPower, 17);

  // love and money
  const loveAt = mix(inner.bottom, inner.right, 0.25);
  const moneyAt = mix(inner.bottom, inner.right, 0.75);
  out += plain(loveAt, 20, m.loveMoney.love, 18) + plain(mix(inner.bottom, inner.right, 0.5), 20, m.loveMoney.mid, 18) + plain(moneyAt, 20, m.loveMoney.money, 18);
  out += heart(move(loveAt, [-1, -0.55], 44), 12, { fill: INK.red });
  out += text(move(moneyAt, [-1, -0.6], 42), '$', { size: 30, fill: INK.dollar, weight: 700 });

  return frame(`${dateText(m.date)} · зааврын аргаар бодсон матриц`, out);
}
