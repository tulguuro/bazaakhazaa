// The text sections of a reading as HTML strings: the arithmetic, the
// difference between the two variants and the readings from the manuscript.
// Shared by the page and by the standalone export (tools/render_report.mjs).
import { PYTHAGORAS_LINES, formula, pythagoras, reduce, ringPointAt } from './matrix.js';
import { HAND_LETTERS as L, POINT_AGES, POINT_MEANINGS, renderLocator } from './draw.js';
import { TALENTS } from './talents.js';
import { CHAPTERS } from './chapters.js';

export const esc = (value) => String(value).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]);

const DIAGONAL_NAMES = { tl: 'Зүүн дээд шугам (Е)', tr: 'Баруун дээд шугам (Ж)', br: 'Баруун доод шугам (И)', bl: 'Зүүн доод шугам (З)' };
const CHAKRAS = {
  Sahasrara: 'Сахасрара', Ajna: 'Аджна', Vishuddha: 'Вишудха', Anahata: 'Анахата',
  Manipura: 'Манипура', Svadhisthana: 'Свадхистана', Muladhara: 'Муладхара', Result: 'Нийт',
};

export const dateStamp = ({ year, month, day }, separator = '.') =>
  [year, String(month).padStart(2, '0'), String(day).padStart(2, '0')].join(separator);

// "Овог: … · Эцэг: … · Нэр: …" for whichever of the three were given.
export function personText({ clan = '', father = '', name = '' } = {}) {
  return [['Овог', clan], ['Эцэг', father], ['Нэр', name]]
    .filter(([, value]) => value.trim())
    .map(([label, value]) => `${label}: ${value.trim()}`)
    .join(' · ');
}

function ageOn(date, today) {
  const born = new Date(Date.UTC(2000, date.month - 1, date.day));
  born.setUTCFullYear(date.year);
  return (today - born) / (365.2425 * 24 * 3600 * 1000);
}

// The number of the person's current age on the age ring, or null outside
// the ring's 80 years.
export function currentAge(hand, today = new Date()) {
  const age = ageOn(hand.date, today);
  if (!(age >= 0 && age < 80)) return null;
  // whole years, as datemyst and mind.university count: at 37 the point
  // for age 37 applies until the next birthday (owner's choice, 2026-11-13)
  return { ...ringPointAt(hand, Math.floor(age)), years: Math.floor(age) };
}

// The life purpose in the user's three steps: Д-1 the centre, Д-2 the four
// corners З + Е + Ж + И, Д-3 = Д-1 + Д-2.
function lifeSteps(m) {
  const p = m.points;
  const d2 = reduce(p.bl + p.tl + p.tr + p.br);
  return `Д-1 = ${p.centre} (төв) · Д-2 = ${L.bl} + ${L.tl} + ${L.tr} + ${L.br}: ${formula(p.bl, p.tl, p.tr, p.br)} · Д-3 = Д-1 + Д-2: ${formula(p.centre, d2)}`;
}

// A link between two points: its base number (the two points added) and,
// on the hand chart, its detailed number (every number between them).
function linkRow(term, link, points) {
  const how = `үндсэн: ${points}: ${formula(...link.values)}`
    + (link.detail ? ` · дэлгэрэнгүй, хоорондох ${link.detail.values.length} тоо: ${formula(...link.detail.values)}` : '');
  return row(term, link.detail ? `${link.value} · ${link.detail.value}` : link.value, how);
}

const row = (term, value, how = '') =>
  `<dt>${esc(term)}</dt><dd><b>${esc(value)}</b>${how ? `<small>${esc(how)}</small>` : ''}</dd>`;

export function differenceHtml(hand, guide) {
  const differing = Object.keys(DIAGONAL_NAMES).filter(
    (key) => hand.lines[key].mid !== guide.lines[key].mid || hand.lines[key].inner !== guide.lines[key].inner,
  );
  let out;
  if (differing.length === 0) {
    out = `<p>Энэ огноонд удмын дөрвөн шугамын тоо хоёр төрөлд ижил гарлаа. Учир нь гол төв (${hand.points.centre}) болон удмын төв (${guide.familyCentre}) тэнцүү байна.</p>`;
  } else {
    const items = differing.map((key) =>
      `<li>${DIAGONAL_NAMES[key]}: гар зургийн ${hand.lines[key].mid}, ${hand.lines[key].inner} · зааврын ${guide.lines[key].mid}, ${guide.lines[key].inner}</li>`);
    out = `<p>Удмын шугамын дотоод хоёр тоо зөрж байна. Гар зургийн төрөл гол төв ${hand.points.centre}-г, зааврын төрөл удмын төв ${guide.familyCentre}-г нэмдэг.</p><ul>${items.join('')}</ul>`;
  }
  return `${out}<p>Үндсэн есөн тоо, хайр ба мөнгө, жилийн тоонууд хоёр төрөлд ижил. Гар зургийн төрөл шугам бүрийн дотор талд гурван тоо нэмж бичдэг. Зааврын төрөл төвийн хажууд удмын төв болон дотоод хүчний кодыг, мөн насны хүрээ, эрүүл мэндийн хүснэгтийг харуулдаг.</p>`;
}

export function pointsHtml(hand) {
  const { year, month, day } = hand.date;
  const p = hand.points;
  return [
    row(`${L.left} · өдөр`, p.left, day > 22 ? `${day} → ${p.left}` : ''),
    row(`${L.top} · сар`, p.top, month > 22 ? `${month} → ${p.top}` : ''),
    row(`${L.right} · он`, p.right, `${year}: ${formula(...String(year).split('').map(Number))}`),
    row(`${L.bottom} · А + Б + В`, p.bottom, formula(p.left, p.top, p.right)),
    row(`${L.centre} · А + Б + В + Г`, p.centre, formula(p.left, p.top, p.right, p.bottom)),
    row(`${L.tl} · А + Б`, p.tl, formula(p.left, p.top)),
    row(`${L.tr} · Б + В`, p.tr, formula(p.top, p.right)),
    row(`${L.br} · В + Г`, p.br, formula(p.right, p.bottom)),
    row(`${L.bl} · Г + А`, p.bl, formula(p.bottom, p.left)),
  ].join('');
}

// The lines and tasks both types share, then what only the guide's type has:
// the family centre, the inner power code and the yearly energy by age.
export function tasksHtml(hand, guide, type = 'hand', today = new Date()) {
  const p = hand.points;
  const t = hand.purposes;
  const { love, mid, money } = hand.loveMoney;
  const bottom = hand.lines.bottom.inner;
  const right = hand.lines.right.inner;
  const rows = [
    row('Амин тоо · энэ насны эрчим · нийлбэр тоо', coreNumbers(hand).map((n) => n.value).join(' · '), lifeSteps(hand)),
    row('Үйлийн үр', hand.karma.join(' · '), 'Г цэг ба түүнээс төв рүү чиглэсэн шугамын хоёр тоо, гаднаас дотогш'),
    row('Хамгийн их нөлөөтэй тоо', hand.dominant.values.join(' · '), `${hand.dominant.total} тооноос ${hand.dominant.count} удаа давтагдсан`),
    linkRow('Тэнгэр газрын холбоос', hand.skyEarth, 'Б + Г (20 ба 60 нас)'),
    linkRow('Хувь заяаны тэмцэл', hand.fate, 'А + В (0 ба 40 нас)'),
    linkRow('Эцгийн удмын хувь заяа', hand.fatherLine, 'Е + И (10 ба 50 нас), сайн муу бүх мэдээлэл'),
    linkRow('Эхийн удмын хувь заяа', hand.motherLine, 'Ж + З (30 ба 70 нас), бүх мэдээлэл'),
    linkRow('Удмын эрчүүдийн тоо', hand.familyMen, 'Е + Ж (10 ба 30 нас)'),
    linkRow('Удмын эмэгтэйчүүдийн тоо', hand.familyWomen, 'И + З (50 ба 70 нас)'),
    row('Тэнгэр · Б + Г', t.sky, `${formula(p.top, p.bottom)} · оюунлаг амьдралын шугам`),
    row('Газар · А + В', t.earth, `${formula(p.left, p.right)} · материаллаг амьдралын шугам`),
    row('Энэ насны чухал даалгавар', t.personal, `${formula(t.sky, t.earth)} · түлхүүр нь ${t.sky} ба ${t.earth}`),
    row('Эцэг · Е + И', t.father, formula(p.tl, p.br)),
    row('Эх · Ж + З', t.mother, formula(p.tr, p.bl)),
    row('Эцэг + эх', t.social, formula(t.father, t.mother)),
    row('Сүнслэг оюунлаг чухал даалгавар', t.spiritual, `${formula(t.personal, t.social)} · түлхүүр нь ${t.personal} ба ${t.social}`),
    row('Сахиусан тэнгэр', mid, `хайр, мөнгөний шугамын дунд: ${formula(bottom, right)}`),
    row('Хайр дурлал', love, formula(bottom, mid)),
    row('Мөнгө санхүү', money, formula(right, mid)),
  ];
  if (type === 'guide') {
    rows.push(row('Удмын төв · Д-2', guide.familyCentre, formula(p.tl, p.tr, p.br, p.bl)));
    rows.push(row('Дотоод хүчний код · Д-1 · Д-2 · Д-3', `${p.centre} · ${guide.familyCentre} · ${guide.innerPower}`, `төв, удмын төв, хоёрын нийлбэр (${formula(p.centre, guide.familyCentre)})`));
  }
  const now = currentAge(hand, today);
  if (now) rows.push(row('Одоогийн насны тоо', now.value, `${now.years} настай · насны хүрээн дээрх ${now.label} насны цэг`));
  return rows.join('');
}

export function healthHtml(guide) {
  const head = ['Чакра', 'Бие', 'Энерги', 'Сэтгэл хөдлөл'].map((title) => `<th>${title}</th>`).join('');
  const body = guide.health.map((r) => `<tr><td>${CHAKRAS[r.chakra]}</td><td>${r.physics}</td><td>${r.energy}</td><td>${r.emotions}</td></tr>`);
  return `<thead><tr>${head}</tr></thead><tbody>${body.join('')}</tbody>`;
}

// The printed table of chakras and the organs they govern, under the health
// card. Muladhara printed solid black on the source page, so it has no text.
export function chakraOrgansHtml(data) {
  const table = data?.chakras;
  if (!table) return '';
  const items = Object.keys(CHAKRAS).filter((key) => key !== 'Result').map((key) => {
    const row = table.rows[key];
    const body = row
      ? `<p><b>${esc(row.organs)}</b></p><p>${esc(row.role)}</p>`
      : '<p class="soft">Хэвлэмэл хүснэгтэд энэ мөр уншигдахгүй байна.</p>';
    return `<details class="energy"><summary><b>${esc(CHAKRAS[key])}</b><span>${esc(row ? row.organs : '')}</span></summary>${body}</details>`;
  });
  return `<h3>${esc(table.title)}</h3>${items.join('')}`;
}

const paragraphs = (lines) => lines.map((line) => `<p>${esc(line)}</p>`).join('');
const NO_DATA = '<p>Тайлбарын өгөгдөл олдсонгүй. tools/extract_readings.py-г ажиллуулж data/readings.json файлыг үүсгэнэ үү.</p>';


// The manuscript has two separate parts. The 22 readings are the positive
// and negative sides of each energy and belong to every number of a matrix.
// The "life purpose" texts stand apart: one is read for the person's life
// purpose number only.
const traits = (energy) => `<h4>Эерэг тал</h4>${paragraphs(energy.positive)}<h4>Сөрөг тал</h4>${paragraphs(energy.negative)}`;
const purposeTitle = (data, n) => (data.purposes[n].name ? `${n} · ${data.purposes[n].name}` : String(n));

// Talents (авьяас): from God on the top line, from the mother on her line,
// from the father on his line. A number repeated within a group is shown
// once; the texts are our own (talents.js).
function talentsHtml(hand, locate = false) {
  const groups = [
    ['Бурхнаас өгсөн авьяас', 'Б шугам', hand.talents.god, ['top', 'top.mid', 'top.inner'], 'Дээд цэг ба түүнээс төв рүү чиглэсэн шугам'],
    ['Эхээс өгсөн авьяас', 'Ж шугам, эхийн удам', hand.talents.mother, ['tr', 'tr.mid', 'tr.inner'], 'Баруун дээд булан ба түүнээс төв рүү чиглэсэн эхийн удмын шугам'],
    ['Эцгээс өгсөн авьяас', 'Е шугам, эцгийн удам', hand.talents.father, ['tl', 'tl.mid', 'tl.inner'], 'Зүүн дээд булан ба түүнээс төв рүү чиглэсэн эцгийн удмын шугам'],
  ];
  const told = new Set();
  return '<h3>Авьяас</h3>' + groups.map(([title, where, values, at, words]) => {
    const items = [...new Set(values)].map((n) => {
      const first = !told.has(n);
      told.add(n);
      return `<p class="place"><b>${esc(TALENTS[n].name)} (${n}).</b> ${first ? esc(TALENTS[n].text) : '<span class="soft">дээрх тайлбарыг үзнэ үү</span>'}</p>`;
    }).join('');
    if (locate) return `<h4>${title}</h4>${locatorHtml(hand, at, `<dt>Байрлал</dt><dd>${esc(words)}</dd><dt>Тоонууд</dt><dd>${values.join(' · ')}</dd>`)}${items}`;
    return `<h4>${title} <span class="soft">· ${where}: ${values.join(' · ')}</span></h4>${items}`;
  }).join('');
}

// `data` is the parsed readings.json, or null when it has not been built.
// First the life purpose text for the personal purpose number, then the
// 22-readings entry of every number in the matrix. The personal purpose and
// the nine main numbers start open; numbers that only come from the other
// tasks start folded.
// The three numbers that carry the 22 readings (the user's rule,
// 2026-11-13): Д-1 the soul number (амин тоо, the centre), Д-2 this life's
// energy (энэ насны эрчим, the four corners З + Е + Ж + И reduced) and Д-3
// the sum (нийлбэр тоо, Д-1 + Д-2), which also selects the life purpose text.
export function coreNumbers(hand) {
  const p = hand.points;
  const d1 = p.centre;
  const d2 = reduce(p.bl + p.tl + p.tr + p.br);
  return [
    { key: 'Д-1', name: 'Амин тоо', value: d1, how: 'төвийн тоо', at: ['centre'], words: 'Матрицын төв' },
    { key: 'Д-2', name: 'Энэ насны эрчим', value: d2, how: `${L.bl} + ${L.tl} + ${L.tr} + ${L.br}: ${formula(p.bl, p.tl, p.tr, p.br)}`, at: ['tl', 'tr', 'br', 'bl'], words: 'Дөрвөн булангийн тоо нийлж үүсдэг' },
    { key: 'Д-3', name: 'Нийлбэр тоо', value: hand.purposes.life, how: `Д-1 + Д-2: ${formula(d1, d2)}`, at: ['centre', 'tl', 'tr', 'br', 'bl'], words: 'Төвийн болон дөрвөн булангийн тоог нийлүүлж гаргана' },
  ];
}

// What the other numbers stand for: the eight outer points with their
// meaning and age, and the marks inside the chart. No 22 readings here.
function placesHtml(hand) {
  const outer = AROUND_ORDER.map((key) => {
    const { word, text } = POINT_MEANINGS[key];
    const karma = key === 'bottom' ? ` Үйлийн үрийг Г ба түүнээс төв рүү чиглэсэн шугамын хоёр тоогоор уншина: ${hand.karma.join(' · ')}.` : '';
    return `<p class="place"><b>${hand.points[key]} · ${esc(word)} · ${POINT_AGES[key]} нас.</b> ${esc(text)}${esc(karma)}</p>`;
  });
  const inner = [
    ['Амин сүнс', hand.points.centre], ['Хайр дурлал', hand.loveMoney.love],
    ['Сахиусан тэнгэр', hand.loveMoney.mid], ['Мөнгө санхүү', hand.loveMoney.money],
  ].map(([name, value]) => `<p class="place"><b>${value} · ${name}</b></p>`);
  return [...outer, ...inner].join('');
}
const AROUND_ORDER = ['left', 'tl', 'top', 'tr', 'right', 'br', 'bottom', 'bl'];

// `data` is the parsed readings.json, or null when it has not been built.
// First the life purpose text for Д-3, then the 22 readings of Д-1, Д-2 and
// Д-3 (a number shared by two of them is written once), then what the other
// points mean.
export function readingHtml(hand, data, today = new Date(), { places = true, locate = false } = {}) {
  if (!data) return NO_DATA;
  const core = coreNumbers(hand);
  const life = hand.purposes.life;
  // printed, a number's origin is shown on the matrix instead of as a formula
  const origin = (numbers) => (locate
    ? locatorHtml(hand, [...new Set(numbers.flatMap((n) => n.at))], numbers.map((n) => `<dt>${esc(n.name)}</dt><dd>${esc(n.words)}</dd>`).join(''))
    : `<p class="soft">${esc(numbers.map((n) => `${n.key}: ${n.how}`).join(' · '))}</p>`);
  let out = `<h3>Энэ насны зорилго, үүрэг даалгавар</h3><article class="purpose life"><span class="number">${esc(purposeTitle(data, life))}</span>`
    + (locate ? origin([core[2]]) : `<p class="soft">Нийлбэр тоо Д-3 = Д-1 + Д-2: ${esc(formula(core[0].value, core[1].value))}</p>`) + `${paragraphs(data.purposes[life].text)}</article>`;

  out += '<h3>Амин тоо, энэ насны эрчим, нийлбэр тоо</h3>';
  const byValue = new Map();
  for (const number of core) byValue.set(number.value, [...(byValue.get(number.value) ?? []), number]);
  for (const [value, numbers] of byValue) {
    const label = numbers.map((n) => (locate ? n.name : `${n.key} · ${n.name}`)).join(' · ');
    out += `<details class="energy" open><summary><b>${value}</b><span>${esc(label)}</span></summary>${origin(numbers)}${traits(data.energies[value])}</details>`;
  }

  out += talentsHtml(hand, locate);
  if (locate) return out;
  // the printed reading leaves this out: the site shows it on the animated matrix
  if (places) out += `<h3>Цэгүүдийн утга</h3>${placesHtml(hand)}`;
  const { values: strongest, count, total } = hand.dominant;
  const now = currentAge(hand, today);
  out += `<p class="soft">Хамгийн их нөлөөтэй тоо: ${strongest.join(', ')} (матрицын ${total} тооноос ${count} удаа).`
    + (now ? ` Одоогийн насны тоо: ${now.value} (${now.years} настай, насны хүрээн дээрх ${esc(now.label)} насны цэг).` : '') + '</p>';
  return `${out}<p class="source">Тайлбарын эх: «${esc(data.source)}», хэвлэмэл хуудастай тулгаж шивэлтийн алдааг зассан.</p>`;
}

const NUMBERS = Array.from({ length: 22 }, (_, k) => k + 1);
const document22 = (id, articles) =>
  `<nav class="jump" aria-label="Тоонууд">${NUMBERS.map((n) => `<a href="#${id}${n}">${n}</a>`).join('')}</nav>${articles.join('')}`;

// The 22 readings (positive and negative sides), as one document.
export function allReadingsHtml(data) {
  return document22('n', NUMBERS.map((n) =>
    `<article class="purpose" id="n${n}"><span class="number">${n}</span>${traits(data.energies[n])}</article>`));
}

// The 22 life purpose texts, as one separate document.
export function allPurposesHtml(data) {
  return document22('p', NUMBERS.map((n) =>
    `<article class="purpose" id="p${n}"><span class="number">${esc(purposeTitle(data, n))}</span>${paragraphs(data.purposes[n].text)}</article>`));
}

// All 22 readings, for browsing and checking. The numbers that appear in
// this matrix are marked.
export function libraryHtml(hand, data) {
  if (!data) return NO_DATA;
  const present = new Map();
  for (const n of coreNumbers(hand)) present.set(n.value, [...(present.get(n.value) ?? []), `${n.key} ${n.name.toLowerCase()}`]);
  let out = '<p>22 эрчим тус бүрийн эерэг, сөрөг тал. Матрицад эдгээр нь амин тоо, энэ насны эрчим, нийлбэр тоо гэсэн гурван тоонд л уншигдана.</p>';
  for (const number of NUMBERS) {
    const note = present.has(number) ? `энэ матрицад: ${present.get(number).join(' · ')}` : '';
    out += `<details class="energy${present.has(number) ? ' present' : ''}"><summary><b>${number}</b><span>${esc(note)}</span></summary>${traits(data.energies[number])}</details>`;
  }
  return out;
}

// The nine-cell number matrix: a 3 × 3 grid whose cells repeat their digit
// as often as it occurs (— when it does not), then what its rows, columns
// and diagonals add up to. `data.pythagoras` holds the meanings.
export function pythagorasHtml(date, data) {
  const meanings = data?.pythagoras;
  const p = pythagoras(date);
  const cell = (d) => {
    const marks = p.counts[d] ? String(d).repeat(p.counts[d]) : '0';
    const label = meanings ? `<small>${esc(meanings.cells[d].short)}</small>` : '';
    return `<td><b>${marks}</b>${label}</td>`;
  };
  const rows = [0, 1, 2].map((r) => `<tr>${[1 + r, 4 + r, 7 + r].map(cell).join('')}</tr>`).join('');
  const lineRows = PYTHAGORAS_LINES.map((cells) => row(
    `${[...cells].join(' ')}${meanings ? ` · ${meanings.lines[cells]}` : ''}`,
    p.lines[cells],
    `${[...cells].map((d) => `${d}: ${p.counts[d]}`).join(', ')} удаа`,
  )).join('');
  const work = `Огнооны цифрүүд ${[...p.date].join(' ')} · ажлын тоонууд ${p.working.join(', ')}`;
  const cellMeanings = meanings
    ? [1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => row(`${d} · ${meanings.cells[d].short}`, p.counts[d] ? String(d).repeat(p.counts[d]) : '0', meanings.cells[d].long)).join('')
    : '';
  return `<p class="soft">${esc(work)}</p><div class="table-wrap"><table class="pyth">${rows}</table></div>`
    + `<div class="columns"><div><h3>Нүд бүр</h3><dl class="calc">${cellMeanings}</dl></div>`
    + `<div><h3>Мөр, багана, диагональ</h3><dl class="calc">${lineRows}</dl></div></div>`;
}

// The reading's contents: the 9 parts and 38 chapters of chapters.js. Each
// chapter shows the number(s) at its positions; opening it shows its
// question and, where written (matrix/texts/<id>.json), the card for that
// number: essence, strength, trap and first step.
export const FIELDS = [['essence', 'Мөн чанар'], ['strength', 'Хүч'], ['trap', 'Сул тал'], ['step', 'Зөвлөгөө']];
export const TAIL_FIELDS = [['past', 'Өнгөрсөн амьдрал'], ['present', 'Энэ амьдралд'], ['trap', 'Сул тал'], ['step', 'Зөвлөгөө']];

export function nextAge(hand, today = new Date()) {
  const now = currentAge(hand, today);
  if (!now) return null;
  for (let year = now.years + 1; year <= now.years + 3; year += 1) {
    const point = ringPointAt(hand, year);
    if (point.label !== now.label) return { ...point, from: year };
  }
  return null;
}

export function chapterValues(hand, at, today = new Date()) {
  const p = hand.points;
  return at.map((key) => {
    if (key in p) return p[key];
    if (key === 'familyCentre') return reduce(p.tl + p.tr + p.br + p.bl);
    const [group, part] = key.split('.');
    if (group === 'loveMoney') return hand.loveMoney[part];
    if (group === 'purposes') return hand.purposes[part];
    if (hand.lines[group]) return hand.lines[group][part];
    return null;
  });
}

// Where each position's number comes from, and its short name when a
// chapter reads several positions at once.
const SOURCES = {
  left: ['Зүүн орой', 'Төрсөн өдөр. 22-оос их бол цифрүүдийг нь нэмнэ (29 → 11).'],
  top: ['Дээд орой', 'Төрсөн сар.'],
  right: ['Баруун орой', 'Төрсөн оны цифрүүдийн нийлбэр (22-оос их бол дахин нэмнэ).'],
  bottom: ['Доод орой', 'Зүүн, дээд, баруун оройн тоонуудын нийлбэр.'],
  centre: ['Төв', 'Дөрвөн оройн тоонуудын нийлбэр.'],
  tl: ['Эцгийн удам, 10 нас', 'Зүүн дээд булан: төрсөн өдөр ба сарын нийлбэр.'],
  tr: ['Эхийн удам, 30 нас', 'Баруун дээд булан: төрсөн сар ба оны тооны нийлбэр.'],
  br: ['Эцгийн удам, 50 нас', 'Баруун доод булан: баруун ба доод оройн нийлбэр.'],
  bl: ['Эхийн удам, 70 нас', 'Зүүн доод булан: доод ба зүүн оройн нийлбэр.'],
  familyCentre: ['Удмын төв', 'Дөрвөн булангийн тоонуудын нийлбэр.'],
  'bottom.inner': ['Доод дотор тоо', 'Доод орой + төв.'],
  'bottom.mid': ['Доод дунд тоо', 'Доод дотор тоо + доод орой.'],
  'right.inner': ['Баруун дотор тоо', 'Баруун орой + төв.'],
  'right.mid': ['Баруун дунд тоо', 'Баруун дотор тоо + баруун орой.'],
  'top.inner': ['Дээд дотор тоо', 'Дээд орой + төв.'],
  'top.mid': ['Дээд дунд тоо', 'Дээд орой + дээд дотор тоо.'],
  'left.inner': ['Зүүн дотор тоо', 'Зүүн орой + төв.'],
  'left.mid': ['Зүүн дунд тоо', 'Зүүн орой + зүүн дотор тоо.'],
  'loveMoney.mid': ['Хайр, мөнгөний уулзвар', 'Доод дотор тоо + баруун дотор тоо.'],
  'loveMoney.love': ['Хайрын цэг', 'Доод дотор тоо + хайр, мөнгөний уулзвар.'],
  'loveMoney.money': ['Мөнгөний цэг', 'Хайр, мөнгөний уулзвар + баруун дотор тоо.'],
  'purposes.personal': ['Хувийн зорилго', '(Дээд + доод орой) + (зүүн + баруун орой).'],
  'purposes.social': ['Нийгмийн зорилго', '(Эцгийн удмын хоёр булан) + (эхийн удмын хоёр булан).'],
  'purposes.spiritual': ['Сүнслэг зорилго', 'Хувийн зорилго + нийгмийн зорилго.'],
  'purposes.planetary': ['Хорвоо ертөнцийн зорилго', 'Нийгмийн зорилго + сүнслэг зорилго.'],
};
export const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX', 'XXI', 'XXII'];

export function sourceText(chapter) {
  if (chapter.id === 'age-now' || chapter.id === 'age-next') {
    return 'Насны хүрээ: зүүн оройгоос (0 нас) цагийн зүүний дагуу, арван жил бүрт долоон цэг.';
  }
  if (chapter.at.length === 1) return SOURCES[chapter.at[0]]?.[1] ?? '';
  if (chapter.id === 'karmic-tails') return 'Доод оройн шугам, төвөөс гадагш: доод дотор тоо, доод дунд тоо, доод орой.';
  return `${chapter.at.map((key) => SOURCES[key]?.[0]).filter(Boolean).join(' · ')}.`;
}

export const shortTable = (entry, fields) =>
  `<table class="short">${fields.filter(([key]) => entry[key]).map(([key, label]) => `<tr><th>${label}</th><td>${esc(entry[key])}</td></tr>`).join('')}</table>`;

// The small card standing for one of the 22 energies.
export const arcana = (n, big = false) => (n
  ? `<span class="arcana${big ? ' big' : ''}"><small>${ROMAN[n - 1]}</small><b>${n}</b>${big ? `<em>${esc(TALENTS[n].name)}</em>` : ''}</span>`
  : '<span class="arcana"></span>');

function chapterValuesFor(chapter, hand, now, next, today) {
  if (chapter.id === 'age-now') return now ? [now.value] : [];
  if (chapter.id === 'age-next') return next ? [next.value] : [];
  return chapterValues(hand, chapter.at, today);
}

function isWritten(chapter, values, texts) {
  const written = texts?.[chapter.id];
  if (chapter.id === 'karmic-tails') return Boolean(written?.tails?.[values.join('-')]);
  if (chapter.id === 'career') return Boolean(written?.pairs?.[values.join('-')]);
  return Boolean(written?.texts && values.some((n) => written.texts[n]));
}

// The long text under a card (matrix/texts/long/<id>.json): an opening
// paragraph and three titled sections.
const LONG_SECTIONS = [['gives', 'Энэ эрчим танд юу өгдөг'], ['costs', 'Энэ эрчмийн сул тал'], ['key', 'Өсөлтийн түлхүүр']];

export function longHtml(long) {
  if (!long) return '';
  return `<div class="dlg-long">${long.intro ? `<p class="lead">${esc(long.intro)}</p>` : ''}`
    + LONG_SECTIONS.filter(([key]) => long[key]?.length)
      .map(([key, title]) => `<h5>${title}</h5>${long[key].map((line) => `<p>${esc(line)}</p>`).join('')}`).join('')
    + (long.questions?.length ? `<h5>Өөрөөсөө асуух нь</h5><ul>${long.questions.map((q) => `<li>${esc(q)}</li>`).join('')}</ul>` : '')
    + '</div>';
}

// The note for the reader's gender (texts/gender/<id>.json), shown under the
// neutral text only when a gender was chosen.
export const GENDER_TITLES = { male: 'Эрэгтэй хүний хувьд', female: 'Эмэгтэй хүний хувьд' };

export function genderHtml(entry, gender) {
  const text = gender && entry?.[gender];
  return text ? `<div class="gender-note"><h5>${GENDER_TITLES[gender]}</h5>${String(text).split(/\n\n+/).map((p) => `<p>${esc(p)}</p>`).join('')}</div>` : '';
}

// The chart with the chapter's positions lit, beside what the chapter asks.
// A small matrix with the given positions lit, beside a short label: shown
// with every number card so the reader sees where on the matrix it sits.
export const whereHtml = (m, at, text) => (m
  ? `<div class="dlg-where-loc"><figure>${renderLocator(m, at)}</figure><p class="dlg-where">${esc(text)}</p></div>`
  : `<p class="dlg-where">${esc(text)}</p>`);
// Every drawn position that holds the value n (for the strongest numbers).
export function positionsOf(m, n) {
  const keys = [];
  for (const [k, v] of Object.entries(m.points)) if (v === n) keys.push(k);
  for (const axis of ['left', 'top', 'right', 'bottom']) for (const part of ['inner', 'mid']) if (m.lines[axis][part] === n) keys.push(`${axis}.${part}`);
  for (const part of ['love', 'mid', 'money']) if (m.loveMoney[part] === n) keys.push(`loveMoney.${part}`);
  return keys;
}
export const locatorHtml = (m, at, rows) => `<div class="dlg-loc"><figure>${renderLocator(m, at)}</figure><dl class="dlg-meta">${rows}</dl></div>`;

function chapterDialogBody(chapter, values, texts, note, gender = '', hand = null) {
  const written = texts?.[chapter.id];
  // the tail is keyed from the centre outwards but read from the outside in
  const tail = chapter.id === 'karmic-tails' ? written?.tails?.[values.join('-')] : null;
  const rows = (tail ? `<dt>Таны үйлийн үр</dt><dd><b>${[...values].reverse().join(' · ')} · ${esc(tail.name)}</b></dd>` : '')
    + `<dd class="ask">${esc(chapter.asks)}</dd>${note ? `<dt>Одоо</dt><dd>${esc(note)}</dd>` : ''}`;
  let out = `<h3 class="dlg-title">${esc(chapter.name)}</h3>${hand ? locatorHtml(hand, chapter.at, rows) : `<dl class="dlg-meta"><dt>Энэ тоо хаанаас гардаг</dt><dd>${esc(sourceText(chapter))}</dd>${rows}</dl>`}`;
  if (chapter.id === 'karmic-tails') {
    const code = values.join('-');
    const entry = written?.tails?.[code];
    return `${out}<div class="dlg-card"><div class="tail">${[...values].reverse().map((n) => arcana(n)).join('')}<em>${[...values].reverse().join('-')}</em></div>`
      + `<div><h4>${entry ? esc(entry.name) : 'Товчхондоо'}</h4>${entry ? shortTable(entry, TAIL_FIELDS) : '<p class="soft">Энэ гурван тооны тайлбар бичигдэж байна.</p>'}</div></div>`
      + longHtml(written?.long?.[code]) + genderHtml(written?.gender?.[code], gender);
  }
  if (chapter.id === 'career') return out + careerHtml(values, written, hand, gender);
  // the eight decades, each read for its own age when those texts exist
  const ages = texts?.decadesAge;
  if (chapter.id === 'decades' && ages) {
    const own = gender ? ages.byGender?.[gender] : null;
    chapter.at.forEach((key, k) => {
      const n = values[k];
      const age = POINT_AGES[key];
      const t = own?.[age]?.[n] ?? ages.texts?.[age]?.[n];
      if (!n || !t) return;
      const where = `${age}-${age + 10} нас`;
      out += whereHtml(hand, [key], where)
        + `<div class="dlg-card">${arcana(n, true)}<div><h4>${esc(t.title)}</h4><p>${esc(t.text)}</p>`
        + `<p class="lesson"><b>Энэ арван жилийн сургамж.</b> ${esc(t.lesson)}</p></div></div>`;
    });
    return out;
  }
  // chapters that read several positions show each position with its own card
  const many = chapter.at.length > 1 && chapter.id !== 'sexuality';
  const seen = new Map();
  values.forEach((n, k) => {
    const key = chapter.at[k];
    if (!n || (seen.has(n) && !many)) return;
    const where = key in POINT_AGES ? `${POINT_AGES[key]} нас · ${POINT_MEANINGS[key].word}` : SOURCES[key]?.[0] ?? (key === 'centre' ? 'Төв · амин тоо' : '');
    // with several positions, each number shows where it sits on the matrix
    const label = (text) => whereHtml(hand, [key], text);
    // the same number in a second position of this chapter: point back to its
    // reading instead of printing it again
    if (seen.has(n)) {
      out += `${where ? label(where) : ''}<div class="dlg-card">${arcana(n)}<div><p>`
        + `Энэ байрлалд мөн ${n} · ${esc(TALENTS[n].name)} эрчим ирсэн. Түүний тайлбарыг дээр${seen.get(n) ? `, «${esc(seen.get(n))}» хэсэгт` : ''} уншина уу. `
        + 'Нэг эрчим хоёр байрлалд давхар гарсан нь энэ сэдэвт түүний нөлөө онцгой хүчтэй гэсэн үг.</p></div></div>';
      return;
    }
    seen.set(n, where);
    // a reading for a man or a woman uses that version where it is written;
    // its gender note is then already woven into the text
    const own = gender ? written?.byGender?.[gender] : null;
    const entry = own?.texts?.[n] ?? written?.texts?.[n];
    const long = own?.long?.[n] ?? written?.long?.[n];
    out += `${chapter.at.length > 1 && where ? label(where) : ''}<div class="dlg-card">${arcana(n, true)}<div><h4>Товчхондоо</h4>`
      + (entry ? shortTable(entry, FIELDS) : `<p>${esc(TALENTS[n].text)}</p><p class="soft">Энэ бүлгийн дэлгэрэнгүй тайлбар бичигдэж байна.</p>`)
      + `</div></div>${longHtml(long)}${own?.long?.[n] ? '' : genderHtml(written?.gender?.[n], gender)}<p class="more"><a href="numbers.html#n=${n}">${n} · ${esc(TALENTS[n].name)} эрчмийн тухай бүгдийг унших</a></p>`;
  });
  if (PAIR_CHAPTERS.includes(chapter.id)) out += pairsHtml(values, texts?.pairs, texts?.pairsCtx?.[chapter.id]);
  return out;
}

// The career chapter reads the talent (top) and the money channel (money
// point) together: concrete professions, skills and work setting for that
// pair, then how the number repeated most in the chart colours the work.
function careerHtml([talent, money], written, hand, gender) {
  const own = gender ? written?.byGender?.[gender] : null;
  const pair = own?.pairs?.[`${talent}-${money}`] ?? written?.pairs?.[`${talent}-${money}`];
  if (!pair) return `<p class="soft">Энэ хослолын мэргэжлийн тайлбар бичигдэж байна.</p>`;
  const strong = hand?.dominant?.values?.[0];
  const accent = strong ? (own?.accents?.[strong] ?? written?.accents?.[strong]) : null;
  const list = (title, items) => (items?.length ? `<h5>${title}</h5><ul>${items.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : '');
  const card = (n, label) => `<span class="pa-card">${arcana(n)}<small>${label}<br>${n} · ${esc(TALENTS[n].name)}</small></span>`;
  return `<p class="pair-arcana">${card(talent, 'Авьяас')}<span>+</span>${card(money, 'Мөнгөний цэг')}</p>`
    + `<p class="soft">Танд тохирох ажил хоёр цэгийн нийлбэрээс тодорхойлогддог. Матрицын дээд цэг (${talent}) таны юу хийж чаддагийг, `
    + `хайр ба мөнгөний шугам дээрх мөнгөний цэг (${money}) мөнгө танд ямар замаар ирдгийг хэлдэг.</p>`
    + `<div class="dlg-long"><p class="lead">${esc(pair.summary)}</p>`
    + list('Тохирох ажил мэргэжил', pair.professions) + list('Таны ажлын чадварууд', pair.skills)
    + (pair.environment ? `<h5>Танд тохирох ажлын орчин</h5><p>${esc(pair.environment)}</p>` : '')
    + (pair.avoid ? `<h5>Болгоомжлох зүйл</h5><p>${esc(pair.avoid)}</p>` : '')
    + (accent ? `<h5>Таны хамгийн хүчтэй эрчим ${strong} · ${esc(TALENTS[strong].name)} ажилд тань</h5><p>${esc(accent)}</p>` : '')
    + '</div>';
}

// Combination texts written for one context each (texts/pairs-ctx/<file>.json):
// the ten point pairs keyed "x-y" in position order, and the pair sections of
// four chapters keyed "a-b" with a < b. Where a context has no text yet the
// generic pair text (texts/pairs/) stands in.
export const PAIR_CONTEXTS = ['centre+top', 'centre+left', 'centre+right', 'centre+bottom', 'left+top', 'top+right', 'right+bottom',
  'left+bottom', 'centre+loveMoney.love', 'right+loveMoney.money', 'sexuality', 'parents', 'children', 'family-programmes'];
export const pairContextFile = (context) => context.replace('+', '_').replace('.', '-');

// Chapters that show several numbers also show how each two of them work
// together in one person (texts/pairs/<a>.json, every pair a ≤ b).
const PAIR_CHAPTERS = ['sexuality', 'parents', 'children', 'family-programmes'];

function pairsHtml(values, pairs, own = null) {
  if (!pairs && !own) return '';
  const distinct = [...new Set(values.filter(Boolean))].sort((x, y) => x - y);
  let out = '';
  for (let i = 0; i < distinct.length; i += 1) {
    for (let j = i + 1; j < distinct.length; j += 1) {
      const [a, b] = [distinct[i], distinct[j]];
      out += pairHtml(a, b, own?.[`${a}-${b}`] ?? pairs?.[a]?.[b]);
    }
  }
  return out ? `<div class="dlg-pairs"><h4>Эрчмүүдийн хослол</h4>${out}</div>` : '';
}

// Two energy names side by side. Names such as «Хайр ба харилцаа» already
// hold «ба», so joining with another «ба» reads wrong: «А, Б хоёр» then,
// and «А давхар» when both points carry the same energy.
export const pairName = (x, y) => (x === y ? `${x} давхар`
  : / ба /.test(x + y) ? `${x}, ${y} хоёр` : `${x} ба ${y}`);
const pairTitle = (a, b) => esc(pairName(TALENTS[a].name, TALENTS[b].name));

export const PAIR_ROWS = [['gift', 'Бэлэг'], ['tension', 'Зөрчил'], ['balance', 'Тэнцвэр']];
// Pairs with the bottom point read as meeting the soul's test.
const TEST_ROWS = [['tension', 'Сорилт хэрхэн илэрдэг'], ['gift', 'Давсан үед'], ['balance', 'Түлхүүр']];
export const PAIR_ROWS_BY_CONTEXT = { 'centre+bottom': TEST_ROWS, 'right+bottom': TEST_ROWS, 'left+bottom': TEST_ROWS };
const pairHtml = (a, b, pair, rows = PAIR_ROWS) => (pair
  ? `<div class="pair"><h5>${a} + ${b} · ${pairTitle(a, b)}</h5><p>${esc(pair.together)}</p>`
    + `<table class="short">${rows.map(([key, label]) => `<tr><th>${label}</th><td>${esc(pair[key])}</td></tr>`).join('')}</table></div>`
  : '');

// The main points of the chart read two at a time: how the numbers of, say,
// the centre and the top work together in one person. Pairs that the six
// links already read (А + В, Б + Г, the family corners) are left out.
export const POINT_NAMES = {
  centre: 'Амин тоо', top: 'Авьяас', left: 'Зан чанар', right: 'Сүнсний зорилго', bottom: 'Сүнсний сорилт',
  'loveMoney.love': 'Тохирох хань', 'loveMoney.money': 'Санхүүгийн суваг',
};
export const POINT_PAIRS = [
  ['centre', 'top'], ['centre', 'left'], ['centre', 'right'], ['centre', 'bottom'],
  ['left', 'top'], ['top', 'right'], ['right', 'bottom'], ['left', 'bottom'],
  ['centre', 'loveMoney.love'], ['right', 'loveMoney.money'],
];

function pointPairParts(hand, pairs, roman, own = {}) {
  if (!pairs) return null;
  let rows = '';
  let templates = '';
  let count = 0;
  const part = `${roman} · Гол цэгүүдийн хослол`;
  const usedGeneric = new Map(); // a generic pair text is printed once, then pointed to
  for (const [p, q] of POINT_PAIRS) {
    const [x, y] = chapterValues(hand, [p, q]);
    const [a, b] = x <= y ? [x, y] : [y, x];
    const fitted = own?.[`${p}+${q}`]?.[`${x}-${y}`];
    const pair = fitted ?? pairs[a]?.[b];
    if (!pair) continue;
    const before = fitted ? null : usedGeneric.get(`${a}-${b}`);
    if (!fitted && !before) usedGeneric.set(`${a}-${b}`, `${POINT_NAMES[p]} ба ${POINT_NAMES[q].toLowerCase()}`);
    count += 1;
    const id = `pair-${p}-${q}`;
    const name = `${POINT_NAMES[p]} ба ${POINT_NAMES[q].toLowerCase()}`;
    rows += `<button type="button" class="book-row ready" data-chapter="${id}">${arcana(x)}<span class="name">${esc(name)}</span>`
      + `<span class="nums">${x} + ${y}</span><span class="badge">Унших</span></button>`;
    const body = `<h3 class="dlg-title">${esc(name)}</h3>`
      + locatorHtml(hand, [p, q], `<dt>${esc(POINT_NAMES[p])}</dt><dd>${x} · ${esc(TALENTS[x].name)}</dd><dt>${esc(POINT_NAMES[q])}</dt><dd>${y} · ${esc(TALENTS[y].name)}</dd>`)
      + `<p class="pair-arcana">${arcana(x)}<span>+</span>${arcana(y)}</p>`
      + `<div class="dlg-pairs"><h4>Хамтдаа</h4>${before
        ? `<p class="soft">${x} ба ${y} тооны хослолын тайлбар «${esc(before)}» хэсэгт бий. Эдгээр хоёр цэгт зориулсан тусгай тайлбар бичигдэж байна.</p>`
        : pairHtml(x, y, pair, (fitted && PAIR_ROWS_BY_CONTEXT[`${p}+${q}`]) || PAIR_ROWS)}</div>`
      + `<p class="more"><a href="numbers.html#n=${x}">${x} · ${esc(TALENTS[x].name)}</a>${x === y ? '' : ` · <a href="numbers.html#n=${y}">${y} · ${esc(TALENTS[y].name)}</a>`}</p>`;
    templates += `<template data-chapter="${id}" data-part="${part}">${body}</template>`;
  }
  if (!count) return null;
  return { rows: `<div class="book-part"><header><span>${roman}</span><b>Гол цэгүүдийн хослол</b><small>${count} хослол</small></header>${rows}</div>`, templates, count };
}
const HAND_POINT = { left: 'А', top: 'Б', right: 'В', bottom: 'Г', centre: 'Д' };

// The owner's six links as a tenth part of the contents. Each has a base
// number (its two points added) and a detailed number (every number between
// them); texts in matrix/texts/links/<id>.json.
export const LINKS = [
  ['sky-earth', 'skyEarth', 'Б + Г · 20 ба 60 нас'],
  ['fate-struggle', 'fate', 'А + В · 0 ба 40 нас'],
  ['father-line', 'fatherLine', 'Е + И · 10 ба 50 нас'],
  ['mother-line', 'motherLine', 'Ж + З · 30 ба 70 нас'],
  ['family-men', 'familyMen', 'Е + Ж · 10 ба 30 нас'],
  ['family-women', 'familyWomen', 'И + З · 50 ба 70 нас'],
];
export const LINK_POINTS = {
  'sky-earth': ['top', 'bottom'], 'fate-struggle': ['left', 'right'], 'father-line': ['tl', 'br'],
  'mother-line': ['tr', 'bl'], 'family-men': ['tl', 'tr'], 'family-women': ['br', 'bl'],
};
export const LINK_FIELDS = [['essence', 'Мөн чанар'], ['gift', 'Бэлэг'], ['trap', 'Сул тал'], ['step', 'Зөвлөгөө']];

function linkParts(hand, links) {
  if (!links) return null;
  let rows = '';
  let templates = '';
  let count = 0;
  for (const [id, key, points] of LINKS) {
    const file = links[id];
    const link = hand[key];
    if (!file || !link) continue;
    count += 1;
    const base = link.value;
    const detail = link.detail?.value;
    const entry = file.texts[base];
    rows += `<button type="button" class="book-row ready" data-chapter="link-${id}">${arcana(base)}<span class="name">${esc(file.name)}</span>`
      + `<span class="nums">${detail ? `${base} · ${detail}` : base}</span><span class="badge">Унших</span></button>`;
    let body = `<h3 class="dlg-title">${esc(file.name)}</h3>`
      + locatorHtml(hand, LINK_POINTS[id], `<dt>Тоо</dt><dd>Үндсэн ${base}${detail ? ` · дэлгэрэнгүй ${detail}` : ''}</dd>`
        + `<dd class="ask">${esc(file.about)}</dd>`)
      + `<p class="dlg-where">Үндсэн тоо</p><div class="dlg-card">${arcana(base, true)}<div><h4>Товчхондоо</h4>${entry ? shortTable(entry, LINK_FIELDS) : ''}</div></div>`;
    if (detail && file.texts[detail]) {
      body += `<p class="dlg-where">Дэлгэрэнгүй тоо</p><div class="dlg-card">${arcana(detail, true)}<div><h4>Далд давхарга</h4><p>${esc(file.texts[detail].deeper)}</p></div></div>`;
    }
    templates += `<template data-chapter="link-${id}" data-part="X · Зургаан холбоос">${body}</template>`;
  }
  if (!count) return null;
  return { rows: `<div class="book-part"><header><span>X</span><b>Зургаан холбоос</b><small>${count} холбоос</small></header>${rows}</div>`, templates, count };
}

// Above the contents: the energy of the period the person is in now, with a
// button that opens its full chapter, and the numbers repeated most often.
function nowCardHtml(hand, texts, now, next) {
  let out = '';
  if (now) {
    const entry = texts?.['age-now']?.texts?.[now.value];
    out += `<div class="now-card"><span class="strong-loc">${renderLocator(hand, ['ring'])}</span>${arcana(now.value, true)}<div>`
      + `<small>Таны одоогийн эрчим · ${now.years} нас</small><h4>${now.value} · ${esc(TALENTS[now.value].name)}</h4>`
      + (entry ? shortTable(entry, FIELDS) : `<p>${esc(TALENTS[now.value].text)}</p>`)
      + '<footer><button type="button" class="now-read" data-chapter="age-now">Дэлгэрэнгүй унших</button>'
      + (next ? `<span>${String(next.from).replace('.', ',')} нас хүртэл, дараа нь <b>${next.value} · ${esc(TALENTS[next.value].name)}</b></span>` : '')
      + '</footer></div></div>';
  }
  const strong = (hand.dominant?.ranked ?? []).slice(0, 6);
  if (strong.length) {
    out += `<div class="strong"><h4>Хүчтэй эрчмүүд</h4><ul>${strong.map((r) => `<li><span class="strong-loc">${renderLocator(hand, positionsOf(hand, r.value))}</span>${arcana(r.value)}<span><b>${r.value} · ${esc(TALENTS[r.value].name)}</b><small>матрицад ${r.count} удаа</small></span></li>`).join('')}</ul></div>`;
  }
  return out;
}

// The contents of the reading laid out like a book: the 9 parts in two
// columns, one row per chapter with its number(s). A row opens the chapter
// in a dialog (wired by wireBook).
export function chaptersHtml(hand, texts, today = new Date(), gender = '') {
  const now = currentAge(hand, today);
  const next = nextAge(hand, today);
  let rows = '';
  let templates = '';
  let total = 0;
  let ready = 0;
  CHAPTERS.forEach((part, index) => {
    rows += `<div class="book-part"><header><span>${ROMAN[index]}</span><b>${esc(part.title)}</b><small>${part.chapters.length} бүлэг</small></header>`;
    for (const chapter of part.chapters) {
      const values = chapterValuesFor(chapter, hand, now, next, today);
      let note = '';
      if (chapter.id === 'age-now' && now) note = `Одоо ${now.years} нас: ${now.label} насны цэг.`;
      if (chapter.id === 'age-next' && next) note = `${String(next.from).replace('.', ',')} наснаас эхэлнэ.`;
      const shown = chapter.id === 'karmic-tails' ? [...values].reverse() : chapter.id === 'decades' ? values : [...new Set(values)];
      const written = isWritten(chapter, values, texts);
      total += 1;
      ready += written ? 1 : 0;
      rows += `<button type="button" class="book-row${written ? ' ready' : ''}" data-chapter="${chapter.id}">`
        + `${arcana(shown[0])}<span class="name">${esc(chapter.name)}</span><span class="nums">${shown.join(' · ')}</span>`
        + `<span class="badge">${written ? 'Унших' : 'Удахгүй'}</span></button>`;
      templates += `<template data-chapter="${chapter.id}" data-part="${ROMAN[index]} · ${esc(part.title)}">${chapterDialogBody(chapter, values, texts, note, gender, hand)}</template>`;
    }
    rows += '</div>';
  });
  const links = linkParts(hand, texts?.links);
  const combos = pointPairParts(hand, texts?.pairs, ROMAN[CHAPTERS.length + (links ? 1 : 0)], texts?.pairsCtx);
  for (const extra of [links, combos]) {
    if (!extra) continue;
    rows += extra.rows;
    templates += extra.templates;
    total += extra.count;
    ready += extra.count;
  }
  return `<section class="book">${nowCardHtml(hand, texts, now, next)}<h3>Агуулга</h3>`
    + `<p class="soft">${total} бүлгээс ${ready} нь бичигдсэн · бүлэг дээр дарж нээнэ</p>`
    + `<div class="book-progress"><i style="width:${Math.round((ready / total) * 100)}%"></i></div>`
    + `<div class="book-paper">${rows}</div>${templates}`
    + `<dialog class="book-dialog"><header><div><small></small><b>${dateStamp(hand.date)}</b></div>`
    + '<button type="button" class="close" aria-label="Хаах">×</button></header><div class="dlg-body"></div>'
    + '<footer><button type="button" class="close">Хаах</button></footer></dialog></section>';
}

// Opens a chapter row in the dialog. Self-contained so the standalone
// export can inline it with toString().
export function wireBook(root) {
  root.addEventListener('click', (event) => {
    const row = event.target.closest('button[data-chapter]');
    const book = event.target.closest('.book');
    if (row && book) {
      const dialog = book.querySelector('.book-dialog');
      const template = book.querySelector(`template[data-chapter="${row.dataset.chapter}"]`);
      dialog.querySelector('header small').textContent = template.dataset.part;
      dialog.querySelector('.dlg-body').innerHTML = template.innerHTML;
      dialog.showModal();
      dialog.querySelector('.dlg-body').scrollTop = 0;
      return;
    }
    const open = event.target.closest('dialog.book-dialog[open]');
    if (open && (event.target.closest('.close') || event.target === open)) open.close();
  });
}
