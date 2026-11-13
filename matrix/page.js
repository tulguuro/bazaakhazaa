// Matrix calculator page: reads a birth date and a matrix type, then shows
// the drawing of that type, the readings taken from the manuscript
// (data/readings.json, built by tools/extract_readings.py) and the arithmetic.
import { VARIANTS, computeMatrix, isValidDate } from './matrix.js';
import { renderGuide, renderHand } from './draw.js';
import { CHAPTERS } from './chapters.js';
import { chakraOrgansHtml, chaptersHtml, pythagorasHtml, dateStamp, differenceHtml, healthHtml, libraryHtml, personText, pointsHtml, readingHtml, tasksHtml, wireBook } from './report.js';

const DEFAULT_DATE = { year: 1989, month: 3, day: 15 };
// Both types are valid readings of the same birth date; each is drawn like its source chart.
const TYPES = {
  hand: {
    title: 'Гар зургийн матриц',
    caption: 'Гараар зурсан матрицтай адил: найман шугам бүрт таван тоо, гадуур нь жилийн тоонууд.',
    render: renderHand,
  },
  guide: {
    title: 'Зааврын матриц',
    caption: 'Зааврын хуудсууд дээрх калькулятортай адил: удмын шугам тусдаа төвтэй, гадуур нь насны хүрээ.',
    render: renderGuide,
  },
};
const $ = (id) => document.getElementById(id);

// the chapter texts written for this project (texts/<chapter id>.json); a missing file is skipped
const CHAPTER_FILES = CHAPTERS.flatMap((part) => part.chapters.map((chapter) => chapter.id));
const chapterTexts = Promise.all(CHAPTER_FILES.map((id) =>
  fetch(`texts/${id}.json`).then((r) => (r.ok ? r.json() : null)).catch(() => null)))
  .then((list) => Object.fromEntries(list.filter(Boolean).map((t) => [t.id, t])))
  // the long texts: texts/long/index.json lists the chapters that have one
  .then(async (texts) => {
    const ids = await fetch('texts/long/index.json').then((r) => (r.ok ? r.json() : [])).catch(() => []);
    await Promise.all(ids.map((id) => fetch(`texts/long/${id}.json`).then((r) => (r.ok ? r.json() : null)).catch(() => null)
      .then((long) => { if (long && texts[id]) texts[id].long = long.texts; })));
    // the six links
    const linkIds = ['sky-earth', 'fate-struggle', 'father-line', 'mother-line', 'family-men', 'family-women'];
    const links = await Promise.all(linkIds.map((id) => fetch(`texts/links/${id}.json`).then((r) => (r.ok ? r.json() : null)).catch(() => null)));
    texts.links = Object.fromEntries(links.filter(Boolean).map((l) => [l.id, l]));
    // how two energies combine inside one matrix: texts/pairs/<a>.json
    const pairs = await Promise.all(Array.from({ length: 22 }, (_, k) => fetch(`texts/pairs/${k + 1}.json`)
      .then((r) => (r.ok ? r.json() : null)).catch(() => null)));
    texts.pairs = Object.fromEntries(pairs.filter(Boolean).map((p) => [p.a, p.pairs]));
    // the male / female notes: texts/gender/index.json lists the chapters that have them
    const genderIds = await fetch('texts/gender/index.json').then((r) => (r.ok ? r.json() : [])).catch(() => []);
    await Promise.all(genderIds.filter((id) => texts[id]).map((id) => fetch(`texts/gender/${id}.json`).then((r) => (r.ok ? r.json() : null)).catch(() => null)
      .then((g) => { if (g && texts[id]) texts[id].gender = g.texts; })));
    return texts;
  });

const readings = fetch('data/readings.json')
  .then((response) => (response.ok ? response.json() : null))
  .catch(() => null);

// The date and type live in the URL fragment, which never reaches a server
// or its logs. Names are not put in the URL at all.
function stateFromUrl() {
  const params = new URLSearchParams(location.hash.slice(1));
  const match = /^(\d{1,4})-(\d{1,2})-(\d{1,2})$/.exec(params.get('d') ?? '');
  const [year, month, day] = match ? match.slice(1).map(Number) : [];
  const type = VARIANTS.includes(params.get('t')) ? params.get('t') : 'hand';
  const gender = { m: 'male', f: 'female' }[params.get('g')] ?? '';
  return { date: match && isValidDate(year, month, day) ? { year, month, day } : DEFAULT_DATE, type, gender, person: {} };
}

const state = stateFromUrl();
wireBook($('reading'));

async function show() {
  const { date, type } = state;
  const hand = computeMatrix(date, 'hand');
  const guide = computeMatrix(date, 'guide');
  const person = personText(state.person);
  $('chart-title').textContent = TYPES[type].title;
  $('person').textContent = person ? `${person} · ${dateStamp(date)}` : dateStamp(date);
  $('person').hidden = false;
  $('chart-caption').textContent = TYPES[type].caption;
  $('chart').innerHTML = TYPES[type].render(type === 'hand' ? hand : guide);
  $('calc-points').innerHTML = pointsHtml(hand);
  $('calc-tasks').innerHTML = tasksHtml(hand, guide, type);
  $('health-block').hidden = type !== 'guide';
  $('health').innerHTML = healthHtml(guide);
  $('difference').innerHTML = differenceHtml(hand, guide);
  const data = await readings;
  $('reading').innerHTML = readingHtml(hand, data) + chaptersHtml(hand, await chapterTexts, new Date(), state.gender);
  $('library').innerHTML = libraryHtml(hand, data);
  $('chakra-organs').innerHTML = chakraOrgansHtml(data);
  $('pythagoras').innerHTML = pythagorasHtml(date, data);
  document.title = `${dateStamp(date)} · ${TYPES[type].title}`;
  history.replaceState(null, '', `#d=${dateStamp(date, '-')}&t=${type}${state.gender ? `&g=${state.gender[0]}` : ''}`);
}

const form = $('date-form');
const fields = { year: $('year'), month: $('month'), day: $('day') };
const personFields = { clan: $('clan'), father: $('father'), name: $('name') };

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const date = Object.fromEntries(Object.entries(fields).map(([key, input]) => [key, Number(input.value)]));
  const error = $('date-error');
  if (!isValidDate(date.year, date.month, date.day)) {
    error.textContent = 'Ийм огноо байхгүй байна. Он, сар, өдрөө шалгана уу.';
    error.hidden = false;
    return;
  }
  error.hidden = true;
  state.date = date;
  state.person = Object.fromEntries(Object.entries(personFields).map(([key, input]) => [key, input.value]));
  state.gender = $('gender').value;
  show();
});
$('gender').addEventListener('change', () => {
  state.gender = $('gender').value;
  show();
});
for (const input of Object.values(fields)) {
  input.addEventListener('input', () => {
    $('date-error').hidden = true;
  });
}

const typeRadios = [...document.querySelectorAll('#types input')];
for (const radio of typeRadios) {
  radio.addEventListener('change', () => {
    state.type = radio.value;
    show();
  });
}

// Fill the form from the state, then draw.
function sync() {
  for (const [key, input] of Object.entries(fields)) input.value = state.date[key];
  for (const [key, input] of Object.entries(personFields)) input.value = state.person[key] ?? '';
  for (const radio of typeRadios) radio.checked = radio.value === state.type;
  $('gender').value = state.gender;
  show();
}

// A link or a typed address can change the fragment without reloading the page.
window.addEventListener('hashchange', () => {
  const next = stateFromUrl();
  if (dateStamp(next.date) === dateStamp(state.date) && next.type === state.type && next.gender === state.gender) return;
  Object.assign(state, next);
  sync();
});

sync();
