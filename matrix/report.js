// The text sections of a reading as HTML strings: the arithmetic, the
// difference between the two variants and the readings from the manuscript.
// Shared by the page and by the standalone export (tools/render_report.mjs).
import { formula, reduce, ringLabel, ringPointAt } from './matrix.js';
import { HAND_LETTERS as L, POINT_AGES, POINT_MEANINGS } from './draw.js';

export const esc = (value) => String(value).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]);

// The readings name each of the nine main numbers by its meaning and age,
// not by its letter (the user's wish, 2026-11-13).
const PLACES = {
  centre: 'Амин сүнс · төв',
  ...Object.fromEntries(Object.entries(POINT_MEANINGS).map(([key, { word }]) => [key, `${word} · ${POINT_AGES[key]} нас`])),
};
const POINT_ORDER = ['centre', 'left', 'top', 'right', 'bottom', 'tl', 'tr', 'br', 'bl'];
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
function currentAge(hand, today = new Date()) {
  const age = ageOn(hand.date, today);
  if (!(age >= 0 && age < 80)) return null;
  return { ...ringPointAt(hand, age), years: Math.floor(age) };
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
    row('Энэ насны зорилго · Д-3', t.life, lifeSteps(hand)),
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
  if (now) rows.push(row('Энэ насны тоо', now.value, `${now.years} настай · насны хүрээн дээрх ${now.label} насны цэг`));
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

const PURPOSE_PLACE = 'энэ насны чухал даалгавар';

// Every distinct number of a matrix with the places where it appears: the
// personal purpose first, then the nine main numbers in chart order, then
// the other tasks.
function energiesOf(hand, now = null) {
  const p = hand.points;
  const t = hand.purposes;
  const holders = [
    ...(hand.dominant?.values ?? []).map((value) => [value, `хамгийн их нөлөөтэй (${hand.dominant.count} удаа)`]),
    ...(now ? [[now.value, `энэ насны тоо (${now.years} нас)`]] : []),
    [t.life, 'энэ насны зорилго'],
    ...[
      [hand.skyEarth, 'тэнгэр газрын холбоос'], [hand.fate, 'хувь заяаны тэмцэл'],
      [hand.fatherLine, 'эцгийн удмын хувь заяа'], [hand.motherLine, 'эхийн удмын хувь заяа'],
      [hand.familyMen, 'удмын эрчүүд'], [hand.familyWomen, 'удмын эмэгтэйчүүд'],
    ].flatMap(([link, name]) => [
      [link.value, name],
      ...(link.detail ? [[link.detail.value, `${name} (дэлгэрэнгүй)`]] : []),
    ]),
    [t.personal, PURPOSE_PLACE],
    ...POINT_ORDER.map((key) => [p[key], PLACES[key]]),
    [t.sky, 'тэнгэр'], [t.earth, 'газар'], [t.father, 'эцэг'], [t.mother, 'эх'],
    [t.spiritual, 'сүнслэг оюунлаг даалгавар'], [hand.loveMoney.mid, 'сахиусан тэнгэр'], [hand.loveMoney.love, 'хайр дурлал'], [hand.loveMoney.money, 'мөнгө санхүү'],
  ];
  const byEnergy = new Map();
  for (const [value, where] of holders) byEnergy.set(value, [...(byEnergy.get(value) ?? []), where]);
  // the green circles of the age ring: each number with the ages it covers
  const ages = new Map();
  for (const decade of hand.ring) {
    decade.points.forEach((value, index) => ages.set(value, [...(ages.get(value) ?? []), ringLabel(decade.age, index)]));
  }
  for (const [value, labels] of ages) {
    byEnergy.set(value, [...(byEnergy.get(value) ?? []), `насны хүрээ: ${labels.join('; ')} нас`]);
  }
  return byEnergy;
}

// The manuscript has two separate parts. The 22 readings are the positive
// and negative sides of each energy and belong to every number of a matrix.
// The "life purpose" texts stand apart: one is read for the person's life
// purpose number only.
const traits = (energy) => `<h4>Эерэг тал</h4>${paragraphs(energy.positive)}<h4>Сөрөг тал</h4>${paragraphs(energy.negative)}`;
const purposeTitle = (data, n) => (data.purposes[n].name ? `${n} · ${data.purposes[n].name}` : String(n));

// `data` is the parsed readings.json, or null when it has not been built.
// First the life purpose text for the personal purpose number, then the
// 22-readings entry of every number in the matrix. The personal purpose and
// the nine main numbers start open; numbers that only come from the other
// tasks start folded.
export function readingHtml(hand, data, today = new Date()) {
  if (!data) return NO_DATA;
  const now = currentAge(hand, today);
  const life = hand.purposes.life;
  let out = `<h3>Энэ насны зорилго, үүрэг даалгавар</h3><article class="purpose life"><span class="number">${esc(purposeTitle(data, life))}</span>`
    + `<p class="soft">${esc(lifeSteps(hand))}</p>${paragraphs(data.purposes[life].text)}</article>`;
  const { values: strongest, count, total } = hand.dominant;
  out += `<h3>Хамгийн их нөлөөтэй тоо</h3><article class="purpose life"><span class="number">${strongest.join(' · ')}</span>`
    + `<p class="soft">Матрицын ${total} тооноос ${strongest.length > 1 ? 'тус бүр ' : ''}${count} удаа давтагдсан тул хамгийн их нөлөөтэй. Тайлбар нь доорх жагсаалтын эхэнд байна.</p></article>`;
  if (now) {
    out += `<h3>Энэ насны тоо</h3><article class="purpose life"><span class="number">${now.value}</span>`
      + `<p class="soft">${now.years} настай: насны хүрээн дээрх ${esc(now.label)} насны цэг. Тайлбар нь доорх жагсаалтад байна.</p></article>`;
  }
  const main = new Set([life, ...strongest, ...(now ? [now.value] : []), ...Object.values(hand.points)]);
  out += '<h3>Матрицад гарсан тоонуудын тайлбар</h3>';
  for (const [value, places] of energiesOf(hand, now)) {
    // what the points holding this number mean, before the number's reading
    const meanings = Object.entries(POINT_MEANINGS)
      .filter(([key]) => hand.points[key] === value)
      .map(([key, { word, text }]) => `<p class="place"><b>${esc(word)} · ${POINT_AGES[key]} нас.</b> ${esc(text)}</p>`)
      .join('');
    out += `<details class="energy"${main.has(value) ? ' open' : ''}><summary><b>${value}</b><span>${esc(places.join(' · '))}</span></summary>${meanings}${traits(data.energies[value])}</details>`;
  }
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
  const present = energiesOf(hand);
  let out = '<p>22 эрчим тус бүрийн эерэг, сөрөг тал. Матриц бодоход эндээс тухайн хүний тоонд таарах нь дээр гарч ирнэ.</p>';
  for (const number of NUMBERS) {
    const note = present.has(number) ? `энэ матрицад: ${present.get(number).join(' · ')}` : '';
    out += `<details class="energy${present.has(number) ? ' present' : ''}"><summary><b>${number}</b><span>${esc(note)}</span></summary>${traits(data.energies[number])}</details>`;
  }
  return out;
}
