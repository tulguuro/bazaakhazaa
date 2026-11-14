// Print one person's full reading as a PDF book, the same text the site
// shows: the drawings, the energy of the present age, the manuscript reading,
// then every chapter of the eleven parts opened one after another (short
// card, long text, the male or female note, pairs, links, point pairs).
// With two people it also prints their compatibility by амин тоо.
// Usage:
//   node tools/render_person_pdf.mjs 1977-04-15 --name=… --gender=male|female
//   node tools/render_person_pdf.mjs couple 1977-04-15 1981-05-16 --names=Нэг,Хоёр [--genders=male,female]
// Writes matrix/out/pdf/people/<name> <date>.pdf (matrix/out is not in git).
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { computeMatrix, isValidDate } from '../matrix/matrix.js';
import { renderGuide, renderHand, renderMap } from '../matrix/draw.js';
import { TALENTS } from '../matrix/talents.js';
import { CHAPTERS } from '../matrix/chapters.js';
import { arcana, chapterValues, chaptersHtml, dateStamp, esc, readingHtml } from '../matrix/report.js';
import { loadTexts, readText } from './load_texts.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const matrixDir = join(root, 'matrix');
const out = join(matrixDir, 'out', 'pdf', 'people');
mkdirSync(join(out, 'html'), { recursive: true });
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(existsSync);
const GENDER_WORD = { male: 'Эрэгтэй', female: 'Эмэгтэй' };

const args = process.argv.slice(2);
const flags = Object.fromEntries(args.filter((a) => a.startsWith('--')).map((a) => [a.slice(2, a.indexOf('=')), a.slice(a.indexOf('=') + 1)]));
const plain = args.filter((a) => !a.startsWith('--'));
const parseDate = (value) => {
  const match = /^(\d{1,4})-(\d{1,2})-(\d{1,2})$/.exec(value ?? '');
  const [year, month, day] = match ? match.slice(1).map(Number) : [];
  if (!match || !isValidDate(year, month, day)) {
    console.error(`Bad date: ${value}`);
    process.exit(1);
  }
  return { year, month, day };
};

const siteCss = readFileSync(join(matrixDir, 'matrix.css'), 'utf8');
// the site's styles on paper: dark ink, no page background, no buttons
const PRINT_CSS = `
@page { size: A4; margin: 16mm 15mm 16mm 15mm; }
:root { --bg: #fff; --ink: #232a48; --text: #2a2f45; --muted: #6b6f84; --gold: #8a6420; --line: #e6dcc3; color-scheme: light; }
html, body { background: #fff !important; color: var(--text); font-size: 10.5pt; }
.book { margin: 0; --paper: #fff; }
.more, .now-read, button { display: none !important; }
.cover { text-align: center; padding-top: 30mm; break-after: page; }
.cover h1 { font: 600 34pt/1.1 var(--serif); color: var(--ink); margin: 0 0 6pt; }
.cover .who { font: 500 11pt/1.5 var(--sans); color: var(--muted); }
.cover .centre { display: flex; justify-content: center; margin: 14mm 0 8mm; }
.cover nav { text-align: left; width: 120mm; margin: 12mm auto 0; font: 10.5pt/1.7 var(--sans); }
.cover nav a { color: var(--ink); text-decoration: none; }
.drawing { break-before: page; text-align: center; }
.drawing h2, .part > h2 { font: 600 20pt/1.2 var(--serif); color: var(--ink); margin: 0 0 8pt; padding-bottom: 5pt; border-bottom: 2px solid #b88a2e; text-align: left; }
.drawing svg { width: 100%; max-height: 230mm; }
.part { break-before: page; }
.chap { break-before: page; }
.part > .chap:first-of-type { break-before: auto; }
.chap .dlg-title { font-size: 17pt; }
.short, .dlg-card, .gender-note, .pair { break-inside: avoid; }
details > summary { list-style: none; }
.now-card, .strong { break-inside: avoid; color: var(--paper-ink); }
`;

function bookHtml(title, body) {
  return `<!doctype html><html lang="mn"><head><meta charset="utf-8"><title>${esc(title)}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap">
<style>${siteCss}${PRINT_CSS}</style></head><body>${body}</body></html>`;
}

function print(name, html) {
  const htmlFile = join(out, 'html', `${name}.html`);
  writeFileSync(htmlFile, html);
  const pdf = join(out, `${name}.pdf`);
  execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--no-pdf-header-footer', '--virtual-time-budget=20000',
    `--print-to-pdf=${pdf}`, pathToFileURL(htmlFile).href], { stdio: 'ignore' });
  console.log(`${pdf}  ${(statSync(pdf).size / 1048576).toFixed(1)} MB`);
}

function personBook({ date, name, gender }) {
  const hand = computeMatrix(date, 'hand');
  const guide = computeMatrix(date, 'guide');
  const texts = loadTexts(matrixDir);
  const readings = readText(matrixDir, '..', 'data', 'readings.json');
  const book = chaptersHtml(hand, texts, new Date(), gender);
  const now = book.slice(book.indexOf('<section class="book">') + '<section class="book">'.length, book.indexOf('<h3>Агуулга</h3>'));
  // every chapter's dialog body, in the order of the contents, under its part
  const parts = [];
  for (const [, part, body] of book.matchAll(/<template data-chapter="[^"]+" data-part="([^"]+)">([\s\S]*?)<\/template>/g)) {
    if (parts.at(-1)?.title !== part) parts.push({ title: part, chapters: [] });
    parts.at(-1).chapters.push(body);
  }

  const toc = [['drawings', 'Матрицын зураг'], ['now', 'Одоогийн эрчим'], ...(readings ? [['manuscript', 'Гар бичмэлийн тайлбар']] : []),
    ...parts.map((p, i) => [`part-${i}`, p.title])];
  let body = `<section class="cover"><p class="kicker">Хувь тавилангийн матриц</p><h1>${esc(name)}</h1>`
    + `<p class="who">${dateStamp(date)}${gender ? ` · ${GENDER_WORD[gender]}` : ''} · Амин тоо ${hand.points.centre} · ${esc(TALENTS[hand.points.centre].name)}</p>`
    + `<div class="centre">${arcana(hand.points.centre, true)}</div>`
    + `<nav><h3>Агуулга</h3><ol>${toc.map(([id, t]) => `<li><a href="#${id}">${esc(t)}</a></li>`).join('')}</ol></nav></section>`;
  body += `<section class="drawing" id="drawings"><h2>Матрицын гол цэгүүд</h2>${renderMap(hand)}</section>`
    + `<section class="drawing"><h2>Гар зургийн матриц</h2>${renderHand(hand)}</section>`
    + `<section class="drawing"><h2>Зааврын матриц</h2>${renderGuide(guide)}</section>`;
  body += `<section class="part book" id="now"><h2>Одоогийн эрчим</h2>${now}</section>`;
  if (readings) body += `<section class="part" id="manuscript"><h2>Гар бичмэлийн тайлбар</h2>${readingHtml(hand, readings)}</section>`;
  parts.forEach((part, i) => {
    body += `<section class="part book" id="part-${i}"><h2>${esc(part.title)}</h2>${part.chapters.map((c) => `<article class="chap">${c}</article>`).join('')}</section>`;
  });
  print(`${name} ${dateStamp(date, '-')}`, bookHtml(`${name} · ${dateStamp(date)}`, `<main>${body}</main>`));
}

const AREAS = [['love', 'Хайр дурлал'], ['family', 'Гэр бүл'], ['business', 'Бизнесийн түнш'], ['friendship', 'Нөхөрлөл'], ['money', 'Мөнгө']];
const paras = (t) => String(t).split(/\n\n+/).map((p) => `<p>${esc(p)}</p>`).join('');

// How each of the two loves and talks, from their own matrix: the chapters
// on the partner, the relationship channel and the way of speaking.
const LOVE_CHAPTERS = [['partner', 'loveMoney.love'], ['relationship-channel', 'bottom.inner'], ['communication', 'centre'], ['sexuality', 'centre']];
const SHORT = [['essence', 'Мөн чанар'], ['strength', 'Хүч'], ['trap', 'Хавх'], ['step', 'Эхний алхам']];

function loveSide(person, index) {
  const hand = computeMatrix(person.date, 'hand');
  const texts = loadTexts(matrixDir);
  let html = `<section class="couple side"><h2>${esc(person.name)} — хайр, харилцаанд</h2>`;
  for (const [id, key] of LOVE_CHAPTERS) {
    const chapter = CHAPTERS.flatMap((part) => part.chapters).find((c) => c.id === id);
    const n = chapterValues(hand, [key])[0];
    const short = texts[id]?.texts?.[n];
    const long = texts[id]?.long?.[n];
    const note = person.gender ? texts[id]?.gender?.[n]?.[person.gender] : '';
    if (!short) continue;
    html += `<h3>${esc(chapter.name)} · ${n} ${esc(TALENTS[n].name)}</h3>`
      + (long?.intro ? `<p>${esc(long.intro)}</p>` : '')
      + `<table class="short">${SHORT.map(([k, label]) => `<tr><th>${label}</th><td>${esc(short[k])}</td></tr>`).join('')}</table>`
      + (note ? `<div class="gender-note"><h5>${GENDER_WORD[person.gender]} хүний хувьд</h5>${paras(note)}</div>` : '');
  }
  return `${html}</section>`;
}

function coupleBook(people) {
  const centres = people.map((p) => computeMatrix(p.date, 'hand').points.centre);
  const [a, b] = [...centres].sort((x, y) => x - y);
  const t = readText(matrixDir, 'compat', `${a}-${b}.json`);
  if (!t) {
    console.error(`No compatibility text for ${a}-${b}`);
    process.exit(1);
  }
  const who = people.map((p, i) => `<div class="pp">${arcana(centres[i], true)}<p><b>${esc(p.name)}</b><br>${dateStamp(p.date)}<br>Амин тоо ${centres[i]} · ${esc(TALENTS[centres[i]].name)}</p></div>`).join('<span class="plus">+</span>');
  const body = `<section class="couple"><p class="kicker">Хувь тавилангийн матриц · Хоёр хүний тохирол</p>`
    + `<h1>${people.map((p) => esc(p.name)).join(' + ')}</h1><div class="pair-head">${who}</div>`
    + `<h2>${centres.map((n) => esc(TALENTS[n].name)).join(' + ')}</h2><p class="motto">${esc(t.headline)}</p>`
    + `<table class="short scores">${AREAS.map(([k, title]) => `<tr><th>${title}</th><td>${'●'.repeat(t[k].score)}${'○'.repeat(5 - t[k].score)} ${t[k].score}/5</td></tr>`).join('')}</table>`
    + `<div class="ov">${paras(t.overview)}</div>`
    + AREAS.map(([k, title]) => `<h3>${title}</h3>${paras(t[k].text)}`).join('')
    + `<h3>Юу сайн ажилладаг</h3><ul>${t.strengths.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>`
    + `<h3>Хаана мөргөлддөг</h3><ul>${t.tensions.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>`
    + `<h3>Зөвлөгөө</h3>${paras(t.advice)}</section>`
    + people.map((p, i) => loveSide(p, i)).join('');
  const css = `.couple { color: var(--text); } .couple h1 { font: 600 28pt/1.15 var(--serif); color: var(--ink); text-align: center; margin: 6pt 0 10pt; }
.couple .kicker { text-align: center; } .pair-head { display: flex; align-items: center; justify-content: center; gap: 10mm; margin: 6mm 0; }
.pp { display: flex; align-items: center; gap: 4mm; } .pp p { margin: 0; font: 10pt/1.5 var(--sans); } .plus { font: 600 24pt var(--serif); color: #b88a2e; }
.couple h2 { font: 600 18pt/1.2 var(--serif); color: var(--ink); text-align: center; margin: 10pt 0 2pt; } .couple .motto { text-align: center; font-style: italic; }
.couple h3 { font: 600 14pt/1.2 var(--serif); color: #8a6420; margin: 12pt 0 4pt; break-after: avoid; } .side { break-before: page; } .side h2 { text-align: left; border-bottom: 2px solid #b88a2e; padding-bottom: 4pt; } .scores td { letter-spacing: .1em; color: #8a6420; }`;
  print(`${people.map((p) => p.name).join(' + ')} тохирол`, bookHtml('Хоёр хүний тохирол', `<main class="book"><style>${css}</style>${body}</main>`));
}

if (plain[0] === 'couple') {
  const names = (flags.names ?? 'Нэгдүгээр хүн,Хоёрдугаар хүн').split(',');
  const genders = (flags.genders ?? ',').split(',').map((g) => ({ male: 'male', female: 'female', m: 'male', f: 'female' })[g] ?? '');
  coupleBook([parseDate(plain[1]), parseDate(plain[2])].map((date, i) => ({ date, name: names[i], gender: genders[i] })));
} else {
  const gender = { male: 'male', female: 'female', m: 'male', f: 'female' }[flags.gender] ?? '';
  personBook({ date: parseDate(plain[0]), name: flags.name ?? dateStamp(parseDate(plain[0])), gender });
}
