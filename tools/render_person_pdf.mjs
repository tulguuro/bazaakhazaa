// Print one person's full reading as a PDF book, the same text the site
// shows: the drawings, the portrait and life timeline,
// then every chapter of the eleven parts opened one after another (short
// card, long text, the male or female note, pairs, links, point pairs).
// With two people it also prints their compatibility by амин тоо.
// Usage:
//   node tools/render_person_pdf.mjs 1977-04-15 --name=… --gender=male|female [--clan=…] [--father=…]
//   node tools/render_person_pdf.mjs couple 1977-04-15 1981-05-16 --names=Нэг,Хоёр [--genders=male,female] [--method=all|outer] [--kind=couple|business]
// Writes matrix/out/pdf/people/<name> <date>.pdf (matrix/out is not in git).
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { COUPLE_METHODS, PYTHAGORAS_LINES, computeCouple, computeMatrix, isValidDate, pythagoras, ringPointAt } from '../matrix/matrix.js';
import { COUPLE_TAIL_FILES, PAIR_KINDS, coupleParts } from '../matrix/couple.js';
import { renderHand, renderLocator, renderMap } from '../matrix/draw.js';
import { TALENTS } from '../matrix/talents.js';
import { CHAPTERS } from '../matrix/chapters.js';
import { arcana, chapterValues, chaptersHtml, dateStamp, esc, personText, readingHtml } from '../matrix/report.js';
import { loadTexts, readText } from './load_texts.mjs';
import { dedupeBook } from './dedupe_book.mjs';

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
.pyth-art svg { width: 150mm; display: block; margin: 4mm auto; }
.pyth-intro { font-size: 11pt; }
.pyth-row { break-inside: avoid; padding: 2mm 0; border-bottom: 1px solid #eee5cf; } .pyth-row b span { margin-left: 2mm; color: #8a6420; } .pyth-row p { margin: 1mm 0 0; }
.pyth-row.lined { display: flex; gap: 5mm; align-items: center; } .pyth-row .mini svg { width: 22mm; height: 22mm; display: block; }
.now-card, .strong { break-inside: avoid; color: var(--paper-ink); }
.opening .kicker { margin: 0 0 2pt; font: 600 8pt var(--sans); letter-spacing: .16em; text-transform: uppercase; color: var(--gold); }
.opening h3 { font: 600 14pt/1.3 var(--serif); color: var(--ink); margin: 7mm 0 2mm; break-after: avoid; }
.opening .now-card, .opening .strong { box-shadow: none; }
.hist { margin: 6mm 0; padding: 4mm 6mm; border: 1px solid #e6dcc3; border-radius: 3mm; background: #fbf8f0; break-inside: avoid; }
.hist .hist-kicker { margin: 0 0 1mm; font: 600 7.5pt var(--sans); letter-spacing: .16em; text-transform: uppercase; color: var(--gold); }
.hist h4 { margin: 0; font: 600 14pt/1.3 var(--serif); color: var(--ink); } .hist .hist-who { margin: 0 0 2mm; font: italic 10pt var(--serif); color: var(--muted); }
.hist p { font: 11.5pt/1.55 var(--serif); margin: 0 0 2mm; } .hist .hist-lesson { font-style: italic; color: #6a4a2a; }
.hist .hist-src { font: 8pt/1.4 var(--sans); color: var(--muted); margin: 2mm 0 0; } .hist.tengri { background: #f3f6fb; border-color: #d5dbe8; }
.blessing.big { font-size: 16pt !important; line-height: 1.6 !important; text-align: center; margin-top: 30mm !important; }
.tail-deep { margin-top: 6mm; } .tail-deep h4, .tail-famous h4 { font: 600 13pt/1.3 var(--serif); color: var(--ink); margin: 6mm 0 2mm; break-after: avoid; }
.tail-deep p, .tail-famous p { font: 11.5pt/1.55 var(--serif); margin: 0 0 3mm; }
.tail-headline { font: italic 600 14pt/1.4 var(--serif) !important; color: var(--gold); padding: 3mm 5mm; border-left: 3pt solid #b88a2e; background: #faf5e8; }
.tail-list { margin: 0 0 3mm; padding-left: 6mm; } .tail-list li { font: 11.5pt/1.5 var(--serif); margin: 0 0 1.5mm; }
.tf-row { break-inside: avoid; padding: 2mm 0; border-bottom: 1px solid #eee5cf; } .tf-row b { font: 600 12pt var(--serif); color: var(--ink); }
.tf-row span { margin-left: 2mm; font-size: 8.5pt; color: var(--gold); } .tf-row small { display: block; color: var(--muted); } .tf-row p { margin: 1mm 0 0 !important; }
.opening p { font: 11.5pt/1.55 var(--serif); margin: 0 0 3mm; }
.opening .lead { font-style: italic; color: var(--muted); }
.portrait-head { display: flex; align-items: center; gap: 6mm; margin: 4mm 0 5mm; }
.portrait-head .ptitle { font: 600 24pt/1.15 var(--serif); color: var(--gold); margin: 0; }
.fold-title { font: 600 17pt/1.2 var(--serif); color: var(--ink); margin: 9mm 0 3mm; padding-top: 5mm; border-top: 1px solid #e6dcc3; break-after: avoid; }
.blessing { margin-top: 7mm !important; padding: 4mm 6mm; border-left: 3pt solid #b88a2e; background: #faf5e8; font-style: italic; font-size: 13pt !important; }
.tg-row, .tl-item { display: flex; gap: 4mm; align-items: flex-start; break-inside: avoid; padding: 2.5mm 0; border-bottom: 1px solid #eee5cf; }
.tl-item { display: block; }
.tg-row h4, .tl-head h4 { margin: 0 0 1mm; font: 600 12pt/1.3 var(--serif); color: var(--ink); }
.tl-head { display: flex; gap: 4mm; align-items: center; margin-bottom: 2mm; }
.tl-head small { font: 600 8pt var(--sans); letter-spacing: .08em; text-transform: uppercase; color: var(--gold); }
.tl-item.now { background: #fbf6ea; padding: 3mm 4mm; border-radius: 2.5mm; border: 1px solid #e6dcc3; margin: 2mm 0; }
.tl-item .advice { font-style: italic; color: #6a4a2a; }
.stages { list-style: none; padding: 0; } .stages li { display: flex; gap: 4mm; align-items: center; padding: 2mm 0; }
.stages li b { display: block; font: 600 11pt var(--serif); } .stages li small { color: var(--muted); }
.stages li.cur b { color: var(--gold); }
.famous { list-style: none; padding: 0; columns: 2; column-gap: 8mm; } .famous li { break-inside: avoid; margin: 0 0 2.5mm; }
.famous b { font: 600 11.5pt var(--serif); color: var(--ink); } .famous span { margin-left: 2mm; font-size: 8.5pt; color: var(--gold); } .famous small { display: block; color: var(--muted); }
.details { display: grid; grid-template-columns: 32mm 1fr; gap: 2.5mm 5mm; } .details dt { font: 600 8pt var(--sans); letter-spacing: .1em; text-transform: uppercase; color: var(--gold); padding-top: 1mm; }
.details dd { margin: 0; font: 11.5pt/1.45 var(--serif); }
`;

function bookHtml(title, body) {
  return `<!doctype html><html lang="mn"><head><meta charset="utf-8"><title>${esc(title)}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap">
<style>${siteCss}${PRINT_CSS}</style></head><body>${body}</body></html>`;
}

function print(name, raw) {
  const log = process.env.DEDUPE_LOG ? [] : null;
  const { html, removed } = dedupeBook(raw, { log });
  if (log) writeFileSync(join(out, 'html', `${name}.dedupe.json`), JSON.stringify(log, null, 1));
  const htmlFile = join(out, 'html', `${name}.html`);
  writeFileSync(htmlFile, html);
  if (removed) console.log(`${name}: ${removed} repeated sentences left out`);
  const pdf = join(out, `${name}.pdf`);
  execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--no-pdf-header-footer', '--virtual-time-budget=20000',
    `--print-to-pdf=${pdf}`, pathToFileURL(htmlFile).href], { stdio: 'ignore' });
  console.log(`${pdf}  ${(statSync(pdf).size / 1048576).toFixed(1)} MB`);
}

// The Pythagoras square drawn as a 3×3 board (columns 1-2-3, 4-5-6, 7-8-9),
// each cell with its digits, a strength bar and its name; the eight lines as
// bars around it; then the reading of this person's count in every cell.
const PYTH_NAMES = ['', 'Зан чанар', 'Эрч хүч', 'Сонирхол', 'Эрүүл мэнд', 'Логик, зөн', 'Хөдөлмөр', 'Аз', 'Хариуцлага', 'Ой санамж'];
const PYTH_LINE_NAMES = { 123: 'Өөрийн үнэлэмж', 456: 'Санхүү, мөнгө', 789: 'Авьяас чадвар', 147: 'Зорилго', 258: 'Гэр бүл', 369: 'Тогтвор', 159: 'Сүнслэг тэмүүлэл', 357: 'Хүсэл тачаал' };
// A small copy of the square with the cells of one line lit and joined by a
// gold line, so the reader sees which three cells the line reads.
function miniBoard(p, lit) {
  const c = 40;
  const centre = (d) => [6 + Math.floor((d - 1) / 3) * c + 18, 6 + ((d - 1) % 3) * c + 18];
  let s = '';
  for (let d = 1; d <= 9; d += 1) {
    const [cx, cy] = centre(d);
    const on = lit.includes(d);
    const n = p.counts[d];
    s += `<rect x="${cx - 18}" y="${cy - 18}" width="36" height="36" rx="6" fill="${on ? '#b88a2e' : '#f4efe3'}" stroke="#d9cfb6"/>`
      + `<text x="${cx}" y="${cy + (n > 3 ? 4 : 5)}" text-anchor="middle" font-size="${n > 3 ? 9 : n > 2 ? 11 : 14}" font-weight="700" fill="${on ? '#fff' : '#b5ab92'}">${n ? String(d).repeat(n) : '0'}</text>`;
  }
  const [a, b] = [centre(lit[0]), centre(lit[2])];
  s += `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="#8a6420" stroke-width="2.5" stroke-linecap="round" opacity="0.55"/>`;
  return `<svg viewBox="0 0 130 130" xmlns="http://www.w3.org/2000/svg" font-family="Inter, sans-serif">${s}</svg>`;
}
const lineBand = (v) => (v === 0 ? '0' : v <= 2 ? '1-2' : v <= 4 ? '3-4' : v <= 6 ? '5-6' : '7+');
function pythagorasSection(date) {
  const p = pythagoras(date);
  const texts = readText(matrixDir, 'pyth-readings.json');
  const cell = 130;
  const x0 = 150;
  const y0 = 40;
  const at = (d) => [x0 + Math.floor((d - 1) / 3) * cell, y0 + ((d - 1) % 3) * cell];
  let svg = '';
  for (let d = 1; d <= 9; d += 1) {
    const [x, y] = at(d);
    const n = p.counts[d];
    const fill = n === 0 ? '#f4efe3' : `rgba(184,138,46,${Math.min(0.15 + n * 0.17, 0.95)})`;
    svg += `<rect x="${x}" y="${y}" width="${cell - 8}" height="${cell - 8}" rx="14" fill="${fill}" stroke="#d9cfb6" stroke-width="2"/>`
      + `<text x="${x + 14}" y="${y + 26}" font-size="16" fill="#8a6420" font-weight="700">${d}</text>`
      + `<text x="${x + (cell - 8) / 2}" y="${y + 70}" text-anchor="middle" font-size="${n > 4 ? 26 : 34}" font-weight="700" fill="${n >= 3 ? '#fff' : '#232a48'}">${n ? String(d).repeat(n) : '0'}</text>`
      + `<text x="${x + (cell - 8) / 2}" y="${y + 104}" text-anchor="middle" font-size="14" fill="${n >= 3 ? '#fff' : '#555a70'}">${PYTH_NAMES[d]}</text>`;
  }
  // row sums on the right, column sums below, diagonals in the corners
  const bar = (x, y, value, label, vertical = false) => {
    const w = Math.min(value, 9) * 10;
    return `<text x="${x}" y="${y}" font-size="13" fill="#232a48" font-weight="700">${value}</text>`
      + `<rect x="${x + 22}" y="${y - 11}" width="${vertical ? 90 : 90}" height="10" rx="5" fill="#eee5cf"/><rect x="${x + 22}" y="${y - 11}" width="${w}" height="10" rx="5" fill="#b88a2e"/>`
      + `<text x="${x}" y="${y + 18}" font-size="12" fill="#8a6420">${label}</text>`;
  };
  ['147', '258', '369'].forEach((code, r) => { svg += bar(x0 + 3 * cell + 14, y0 + r * cell + 52, p.lines[code], PYTH_LINE_NAMES[code]); });
  ['123', '456', '789'].forEach((code, c) => { svg += bar(x0 + c * cell + 4, y0 + 3 * cell + 22, p.lines[code], PYTH_LINE_NAMES[code]); });
  svg += bar(10, y0 + 30, p.lines['159'], PYTH_LINE_NAMES['159']) + bar(10, y0 + 3 * cell - 30, p.lines['357'], PYTH_LINE_NAMES['357']);
  const drawing = `<svg viewBox="0 0 700 500" xmlns="http://www.w3.org/2000/svg" font-family="Inter, sans-serif">${svg}</svg>`;
  let html = `<p class="note">Огнооны цифрүүд ${[...p.date].join(' ')} · ажлын тоонууд ${p.working.join(', ')}</p><div class="pyth-art">${drawing}</div>`;
  if (texts?.intro) html += `<p class="pyth-intro">${esc(texts.intro)}</p>`;
  if (texts?.cells) {
    html += '<h3>Нүд бүр</h3>' + [1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => {
      const n = p.counts[d];
      const t = texts.cells[d]?.[String(Math.min(n, 6))];
      return `<div class="pyth-row"><b>${d} · ${esc(PYTH_NAMES[d])} <span>${n ? String(d).repeat(n) : '0'}</span></b><p>${esc(t ?? '')}</p></div>`;
    }).join('');
  }
  if (texts?.lines) {
    html += '<h3>Мөр, багана, диагональ</h3>' + PYTHAGORAS_LINES.map((code) => {
      const v = p.lines[code];
      return `<div class="pyth-row lined"><div class="mini">${miniBoard(p, [...code].map(Number))}</div><div><b>${[...code].join('-')} · ${esc(PYTH_LINE_NAMES[code])} <span>${v}</span></b><p>${esc(texts.lines[code]?.[lineBand(v)] ?? '')}</p></div></div>`;
    }).join('');
  }
  return html;
}

// A text that exists in a neutral and a male / female version
// (texts/<id>.json and texts/by-gender/<g>/<id>.json).
const gendered = (id, gender) => (gender && readText(matrixDir, 'by-gender', gender, `${id}.json`)?.texts) || readText(matrixDir, `${id}.json`)?.texts || {};
const yearsOld = (date, today = new Date()) => {
  const born = new Date(Date.UTC(2000, date.month - 1, date.day));
  born.setUTCFullYear(date.year);
  return Math.floor((today - born) / (365.2425 * 24 * 3600 * 1000));
};

// The opening of the book, after the drawings: the amin too portrait, how
// the main numbers work with it, people with the same amin too and the
// small details that suit this person.
function portraitHtml(hand, gender, history) {
  const n = hand.points.centre;
  const t = gendered('portrait', gender)[n];
  if (!t) return '';
  return `<section class="part opening" id="portrait"><p class="kicker">Амин тоо ${n} · ${esc(TALENTS[n].name)}</p><h2>Таны хөрөг</h2>`
    + `<div class="portrait-head"><span class="side-loc">${renderLocator(hand, ['centre'])}</span>${arcana(n, true)}<p class="ptitle">${esc(t.title)}</p></div>`
    + paras(t.who.join('\n\n'))
    + `<h3>Таны хүрч болох дээд боломж</h3>${paras(t.greatness.join('\n\n'))}`
    + `<h3>Тэр боломжоо хэрэгжүүлэх зам</h3>${paras(t.path)}`
    + (history ? history.portrait(n) : '')
    + `<p class="blessing">${esc(t.blessing)}</p></section>`;
}

const TOGETHER = [['left', 'Зан чанар'], ['top', 'Авьяас'], ['right', 'Сүнсний зорилго'], ['bottom', 'Сүнсний сорилт'], ['loveMoney.love', 'Хайр, хань']];
function togetherHtml(hand) {
  const c = hand.points.centre;
  let out = '';
  for (const [at, label] of TOGETHER) {
    const [, y] = chapterValues(hand, ['centre', at]);
    const file = readText(matrixDir, 'pairs-ctx', `centre_${at.replace('.', '-')}.json`);
    const pair = file?.pairs?.[`${c}-${y}`];
    if (!pair) continue;
    out += `<div class="tg-row"><span class="strong-loc">${renderLocator(hand, ['centre', at])}</span>${arcana(y)}<div><h4>${esc(label)} · ${y} ${esc(TALENTS[y].name)}</h4><p>${esc(pair.together)}</p></div></div>`;
  }
  return out ? `<section class="part opening" id="together"><h2>Таны тоонуудын хослол</h2>`
    + `<p class="lead">Таны амин тоо ${c} · ${esc(TALENTS[c].name)} матрицын гол цэгүүдтэй хэрхэн уялдахыг доор тайлбарлав.</p>${out}</section>` : '';
}

const FAMOUS_FIELDS = { mongolia: 'Монгол', world: 'Дэлхий' };
function famousHtml(hand) {
  const n = hand.points.centre;
  const list = readText(matrixDir, 'famous-by-amin.json')?.texts?.[n];
  if (!list?.length) return '';
  const groups = Object.entries(FAMOUS_FIELDS).map(([region, title]) => [title, list.filter((p) => p.region === region)]).filter(([, l]) => l.length);
  return `<section class="part opening" id="famous"><h2>Тантай ижил амин тоотой алдартнууд</h2>`
    + `<p class="lead">Эдгээр алдартан тантай ижил ${n} · ${esc(TALENTS[n].name)} амин тоотой. Нэг эрчим хүн бүрт өөр замаар илэрдэг ч тэдний амьдралаас өөрийнхөө хүчийг таньж болно.</p>`
    + groups.map(([title, l]) => `<h3>${title}</h3><ul class="famous">${l.map((p) => `<li><b>${esc(p.name)}</b><span>${esc(p.born.split('-').reverse().join('.'))}</span><small>${esc(p.who)}</small></li>`).join('')}</ul>`).join('')
    + '</section>';
}

const DETAIL_FIELDS = [['colors', 'Өнгө'], ['clothes', 'Хувцас'], ['car', 'Машин'], ['home', 'Гэр'], ['stone', 'Эрдэнийн чулуу'], ['metal', 'Металл'],
  ['day', 'Гараг'], ['season', 'Улирал'], ['direction', 'Зүг'], ['number', 'Азын тоо'], ['place', 'Газар орон'], ['hobby', 'Хобби'], ['animal', 'Амьтан'], ['plant', 'Ургамал']];
function detailsHtml(hand) {
  const n = hand.points.centre;
  const file = readText(matrixDir, 'details.json');
  const t = file?.texts?.[n];
  if (!t) return '';
  return `<section class="part opening" id="details"><h2>${esc(file.title)}</h2><dl class="details">`
    + DETAIL_FIELDS.filter(([k]) => t[k]).map(([k, label]) => `<dt>${label}</dt><dd>${esc(t[k])}</dd>`).join('') + '</dl></section>';
}

// «Өнгөрсөн · Одоо · Ирээдүй»: the decades lived, the period the person is
// in now and the ones ahead, each read by the energy the age ring gives it.
// A period whose energy came earlier points back instead of repeating.
function timelineHtml(hand, gender, nowHtml, today = new Date()) {
  const periods = gendered('periods', gender);
  const age = yearsOld(hand.date, today);
  const seen = new Map();
  const head = (from, to, n, extra = '', at = ['ring']) => `<div class="tl-head"><span class="strong-loc">${renderLocator(hand, at)}</span>${arcana(n)}<div><small>${from}${to !== null ? `-${to}` : ''} нас${extra}</small>`
    + `<h4>${n} · ${esc(TALENTS[n].name)}${periods[n] ? ` · ${esc(periods[n].theme)}` : ''}</h4></div></div>`;
  // past, present and future each tell a period differently, so a number
  // is printed once per kind
  const once = (n, where, html, kind = 'past') => {
    const key = `${kind}:${n}`;
    if (seen.has(key)) return `<p class="soft">Энэ үе ч мөн ${n} · ${esc(TALENTS[n].name)} эрчимтэй. Түүний утгыг «${esc(seen.get(key))}» хэсгээс уншина уу. Нэг эрчим дахин ирэхэд өмнө нь сурсан зүйлээ илүү гүн түвшинд давтдаг.</p>`;
    seen.set(key, where);
    return html;
  };
  const decades = hand.ring.map((d) => ({ ...d, end: d.age + 10 }));
  let past = '';
  // a lived decade is told for its own age (childhood, youth …) when written
  const ageTexts = gendered('decades-age', gender);
  // the lived decades are told in full in «Арван жилийн найман үе», so here each
  // one gets only its title
  let pastFull = false;
  for (const d of decades.filter((x) => x.end <= age)) {
    const p = periods[d.from];
    const a = ageTexts[d.age]?.[d.from];
    if (a) pastFull = true;
    past += `<div class="tl-item">${head(d.age, d.end, d.from, '', [d.position])}${a
      ? `<p class="soft"><b>${esc(a.title)}</b></p>`
      : p ? once(d.from, `${d.age}-${d.end} нас`, paras(p.past)) : ''}</div>`;
  }
  if (pastFull) past += '<p class="soft">Өнгөрсөн арван жил бүрийн дэлгэрэнгүйг «VIII · Амьдралын мөчлөг» хэсгийн «Арван жилийн найман үе» бүлгээс уншина уу.</p>';
  let present = '';
  const cur = decades.find((d) => d.age <= age && age < d.end);
  if (cur) {
    const p = periods[cur.from];
    present += `<div class="tl-item now">${head(cur.age, cur.end, cur.from, ' · таны одоогийн арван жил', [cur.position])}${p ? once(cur.from, `${cur.age}-${cur.end} нас`, paras(p.now), 'now') : ''}</div>`;
  }
  const point = ringPointAt(hand, age);
  if (point && periods[point.value] && point.value !== cur?.from) {
    present += `<div class="tl-item now">${head(point.label, null, point.value, ' · энэ жилийн эрчим')}${once(point.value, `${point.label} нас`, paras(periods[point.value].now), 'now')}</div>`;
  }
  present += nowHtml;
  let future = '';
  for (const d of decades.filter((x) => x.age > age)) {
    const p = periods[d.from];
    future += `<div class="tl-item">${head(d.age, d.end, d.from, '', [d.position])}${p ? once(d.from, `${d.age}-${d.end} нас`, paras(p.future.join('\n\n')) + `<p class="advice">${esc(p.advice)}</p>`, 'future') : ''}</div>`;
  }
  // the three purposes, each the task of its own stretch of life
  const P = hand.purposes;
  const stage = (from, to, n, label, text, at) => `<li class="${age >= from && (to === null || age < to) ? 'cur' : ''}"><span class="strong-loc">${renderLocator(hand, [at])}</span>${arcana(n)}<span><b>${from}${to ? `-${to}` : ''} нас · ${label} · ${n} ${esc(TALENTS[n].name)}</b><small>${text}</small></span></li>`;
  const purposes = `<h3>Насны зорилгууд</h3><ul class="stages">`
    + stage(20, 40, P.personal, 'Хувийн зорилго', 'Өөрийгөө олж, чадвараа хөгжүүлэх үе', 'purposes.personal')
    + stage(40, 60, P.social, 'Нийгмийн зорилго', 'Олж авснаа гэр бүл, хамт олондоо өгөх үе', 'purposes.social')
    + stage(60, null, P.spiritual, 'Сүнслэг зорилго', 'Мэргэн ухаанаа үлдээж, дараагийн үедээ өвлүүлэх үе', 'purposes.spiritual') + '</ul>';
  return `<section class="part opening" id="timeline"><h2>Өнгөрсөн · Одоо · Ирээдүй</h2>`
    + `<p class="lead">Матрицын насны тойрог таны амьдралын арван жил бүрд нэг эрчим өгдөг. Өнгөрсөн жилүүд танд юу үлдээснийг, одоо юу болж байгааг, цаашид юу хүлээж байгааг эндээс уншина уу.</p>`
    + (past ? `<h3>Өнгөрсөн</h3>${past}` : '') + `<h3>Одоо · ${age} нас</h3>${present}` + (future ? `<h3>Ирээдүй</h3>${future}` : '')
    + purposes + '</section>';
}

// The karmic tail told in full: how its three numbers read together, the
// past life, childhood, the present in love, work, family and body, the
// signs, the two futures and the steps, then famous people with the same
// tail and how it showed in their lives.
function tailDeepHtml(hand, gender) {
  const key = [hand.lines.bottom.inner, hand.lines.bottom.mid, hand.points.bottom].join('-');
  const all = readText(matrixDir, 'karmic-tails-deep.json')?.texts?.[key];
  let out = '';
  if (all) {
    const t = { ...all.neutral, ...(gender ? all[gender] : {}) };
    const list = (items) => `<ul class="tail-list">${items.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`;
    out += `<div class="tail-deep"><p class="tail-headline">${esc(t.headline)}</p>`
      + `<h4>Гурван тоо хамтдаа</h4>${paras(t.numbers)}`
      + `<h4>Өнгөрсөн төрөл</h4>${paras(t.past.join('\n\n'))}`
      + `<h4>Бага нас, төрсөн гэр бүл</h4>${paras(t.childhood)}`
      + '<h4>Одоо, таны амьдралд</h4>'
      + [['love', 'Хайр, хань'], ['work_money', 'Ажил, мөнгө'], ['family', 'Гэр бүл, ураг төрөл'], ['body', 'Бие, эрч хүч']]
        .map(([k, label]) => `<p><b>${label}.</b> ${esc(t.present[k])}</p>`).join('')
      + `<h4>Энэ гурван тооны хослол таны амьдралд идэвхтэй байгаагийн шинж</h4>${list(t.signs)}`
      + `<h4>Ирээдүй</h4><p><b>Сургамжаа ойлгоогүй үед.</b> ${esc(t.future_unworked)}</p><p><b>Сургамжаа давж гарсан үед.</b> ${esc(t.future_worked)}</p>`
      + `<h4>Чөлөөлөх алхмууд</h4>${list(t.steps)}</div>`;
  }
  const famous = readText(matrixDir, 'famous-by-tail.json')?.texts?.[key] ?? [];
  if (famous.length) {
    out += `<div class="tail-famous"><h4>Ижил үйлийн үртэй алдартнууд</h4>`
      + famous.map((p) => `<div class="tf-row"><b>${esc(p.name)}</b> <span>${esc(p.born.split('-').reverse().join('.'))}</span><small>${esc(p.who)}</small>`
        + `${p.story ? `<p>${esc(p.story)}</p>` : ''}</div>`).join('') + '</div>';
  }
  return out;
}

// «Тэнгэрийн ухаан»: verified episodes from the steppe empires (Хүннү to Их
// Монгол), one Tengri concept and one blessing per energy
// (texts/history.json, texts/blessings.json). A book uses each episode once:
// the portrait, the karmic tail, the ancestors' task, the part openings.
function historyPicker(hand) {
  const data = readText(matrixDir, 'history.json');
  const blessings = readText(matrixDir, 'blessings.json')?.texts ?? {};
  if (!data) return null;
  const used = new Set();
  const pick = (n) => {
    const e = (data.episodes[n] ?? []).find((x) => !used.has(x.title));
    if (e) used.add(e.title);
    return e;
  };
  const card = (e, kicker) => `<div class="hist"><p class="hist-kicker">${esc(kicker)}</p><h4>${esc(e.title)}</h4>`
    + `<p class="hist-who">${esc(e.figure)} · ${esc(e.era)}</p><p>${esc(e.episode)}</p><p class="hist-lesson">${esc(e.lesson)}</p>`
    + `<p class="hist-src">Эх сурвалж: ${esc(e.source)}${e.scholar ? `. Судлаач: ${esc(String(e.scholar).split(';')[0])}` : ''}</p></div>`;
  return {
    portrait(n) {
      const e = pick(n);
      const t = data.tengri?.[n];
      return (e ? card(e, 'Түүхийн толь') : '')
        + (t ? `<div class="hist tengri"><p class="hist-kicker">Тэнгэрийн ухаан</p><h4>${esc(t.name)}</h4><p>${esc(t.text)}</p></div>` : '');
    },
    chapter(n, kicker) {
      const e = pick(n);
      return e ? card(e, kicker) : '';
    },
    blessing(n) {
      return blessings[n] ? `<section class="part opening" id="blessing"><p class="kicker">Ерөөл</p><h2>Танд өргөх ерөөл</h2><p class="blessing big">${esc(blessings[n])}</p></section>` : '';
    },
  };
}
// Chapters that read the same point on the same topic are joined in the book
// (the site keeps them apart). The karmic tail chapter already tells its three
// numbers as past, present and key; the timeline already holds the current
// age; the portrait is the centre's reading.
const BOOK_SKIP = new Set(['wound', 'echo', 'key', 'age-now', 'core']);
const BOOK_FOLD = {
  'talents-father': ['father-karma', 'Эцгийн удмаас ирсэн авьяас'],
  'talents-mother': ['mother-karma', 'Эхийн удмаас ирсэн авьяас'],
  career: ['money', 'Ажил мэргэжил'],
};
const BOOK_RENAME = { 'father-karma': 'Эцгийн удам', 'mother-karma': 'Эхийн удам', money: 'Санхүүгийн суваг, ажил мэргэжил' };

// the energy whose story opens each part of the book
const PART_ENERGY = [['хэн бэ', 1], ['Удмын үйлийн үр', 20], ['Амьдралын зорилго', 7], ['Мөнгө', 10], ['Харилцаа', 6], ['Авьяас', 17],
  ['Эцэг эх', 3], ['Амьдралын мөчлөг', 13], ['Хувь заяа', 21], ['Зургаан холбоос', 14], ['Гол цэгүүдийн хослол', 4]];

function personBook({ date, name, gender, clan = '', father = '' }) {
  const hand = computeMatrix(date, 'hand');
  const texts = loadTexts(matrixDir);
  const readings = readText(matrixDir, '..', 'data', 'readings.json');
  const book = chaptersHtml(hand, texts, new Date(), gender);
  const now = book.slice(book.indexOf('<section class="book">') + '<section class="book">'.length, book.indexOf('<h3>Агуулга</h3>'));
  // every chapter's dialog body, in the order of the contents, under its part
  const parts = [];
  const history = historyPicker(hand);
  // the portrait picks first, so it gets the best story for the amin too
  const portrait = portraitHtml(hand, gender, history);
  const all = [...book.matchAll(/<template data-chapter="([^"]+)" data-part="([^"]+)">([\s\S]*?)<\/template>/g)];
  const bodyOf = (want) => all.find(([, id]) => id === want)?.[3] ?? '';
  // folded chapters lose their title and locator and become a subsection
  const asSection = (html, title) => `<h3 class="fold-title">${esc(title)}</h3>`
    + html.replace(/^<h3 class="dlg-title">[\s\S]*?<\/h3>(?:<div class="dlg-loc">[\s\S]*?<\/dl><\/div>)?/, '');
  const folds = {};
  for (const [src, [target, title]] of Object.entries(BOOK_FOLD)) {
    const html = bodyOf(src);
    if (html) (folds[target] ??= []).push(asSection(html, title));
  }
  for (const [, id, part, raw] of all) {
    if (BOOK_SKIP.has(id) || BOOK_FOLD[id]) continue;
    if (parts.at(-1)?.title !== part) parts.push({ title: part, chapters: [] });
    let body = raw;
    if (BOOK_RENAME[id]) body = body.replace(/^<h3 class="dlg-title">[\s\S]*?<\/h3>/, `<h3 class="dlg-title">${esc(BOOK_RENAME[id])}</h3>`);
    if (folds[id]) body += folds[id].join('');
    let extra = '';
    if (id === 'karmic-tails') extra = tailDeepHtml(hand, gender) + (history ? history.chapter(hand.points.bottom, 'Түүхийн толь · үйлийн үрийн даалгавар') : '');
    if (id === 'age-next' && history) {
      // the energy of the next period on the age ring
      const years = yearsOld(date);
      const cur = ringPointAt(hand, years);
      let next = null;
      for (let y = years + 1; y <= years + 3 && !next; y += 1) if (ringPointAt(hand, y).label !== cur.label) next = ringPointAt(hand, y);
      if (next) extra = history.chapter(next.value, 'Түүхийн толь · өвөг дээдсийн даалгавар');
    }
    parts.at(-1).chapters.push(body + extra);
  }

  // the core chapter is folded into the portrait: only its price, the side
  // the portrait does not tell, is kept
  const costs = bodyOf('core').match(/<h5>Энэ эрчмийн сул тал<\/h5>([\s\S]*?)(?=<h5>|<\/div>)/)?.[1] ?? '';
  const at = portrait.includes('<div class="hist') ? '<div class="hist' : '<p class="blessing">';
  const portraitFull = costs ? portrait.replace(at, `<h3>Таны сүүдэр тал</h3>${costs}${at}`) : portrait;
  const opening = [['portrait', 'Таны хөрөг', portraitFull], ['together', 'Таны тоонуудын хослол', togetherHtml(hand)],
    ['famous', 'Тантай ижил амин тоотой алдартнууд', famousHtml(hand)], ['details', 'Танд тохирох өнгө, эд зүйл, орчин', detailsHtml(hand)],
    ['timeline', 'Өнгөрсөн · Одоо · Ирээдүй', timelineHtml(hand, gender, now)]].filter(([, , html]) => html);
  const toc = [['drawings', 'Матрицын зураг'], ...opening.map(([id, t]) => [id, t]), ...(readings ? [['energies', 'Таны гол эрчмүүд']] : []),
    ...parts.map((p, i) => [`part-${i}`, p.title]), ['pythagoras', 'Нэмэлт · Пифагорын квадрат']];
  let body = `<section class="cover"><p class="kicker">Хувь тавилангийн матриц</p><h1>${esc(name)}</h1>`
    + (clan || father ? `<p class="who">${esc(personText({ clan, father, name }))}</p>` : '')
    + `<p class="who">${dateStamp(date)}${gender ? ` · ${GENDER_WORD[gender]}` : ''} · Амин тоо ${hand.points.centre} · ${esc(TALENTS[hand.points.centre].name)}</p>`
    + `<div class="centre">${arcana(hand.points.centre, true)}</div>`
    + `<nav><h3>Агуулга</h3><ol>${toc.map(([id, t]) => `<li><a href="#${id}">${esc(t)}</a></li>`).join('')}</ol></nav></section>`;
  body += `<section class="drawing" id="drawings"><h2>Матрицын гол цэгүүд</h2>${renderMap(hand)}</section>`
    + `<section class="drawing"><h2>Гараар зурсан матриц</h2>${renderHand(hand)}</section>`;
  body += opening.map(([, , html]) => html).join('');
  if (readings) body += `<section class="part" id="energies"><h2>Таны гол эрчмүүд</h2>${readingHtml(hand, readings, new Date(), { places: false, locate: true })}</section>`;
  parts.forEach((part, i) => {
    const pe = PART_ENERGY.find(([t]) => part.title.includes(t));
    const opener = pe && history ? history.chapter(pe[1], 'Хэсгийг нээх сургаал') : '';
    body += `<section class="part book" id="part-${i}"><h2>${esc(part.title)}</h2>${opener}${part.chapters.map((c) => `<article class="chap">${c}</article>`).join('')}</section>`;
  });
  // the Pythagoras square closes the book as an extra
  if (history) body += history.blessing(hand.points.centre);
  body += `<section class="part" id="pythagoras"><p class="kicker">Нэмэлт</p><h2>Пифагорын квадрат</h2>${pythagorasSection(date)}</section>`;
  print(`${name} ${dateStamp(date, '-')}`, bookHtml(`${name} · ${dateStamp(date)}`, `<main>${body}</main>`));
}

const AREAS = [['love', 'Хайр дурлал'], ['family', 'Гэр бүл'], ['business', 'Бизнесийн түнш'], ['friendship', 'Нөхөрлөл'], ['money', 'Мөнгө']];
const paras = (t) => String(t).split(/\n\n+/).map((p) => `<p>${esc(p)}</p>`).join('');

// How each of the two loves and talks, from their own matrix: the chapters
// on the partner, the relationship channel and the way of speaking.
const LOVE_CHAPTERS = [['partner', 'loveMoney.love'], ['relationship-channel', 'bottom.inner'], ['sexuality', 'centre']];
const SHORT = [['essence', 'Мөн чанар'], ['strength', 'Хүч'], ['trap', 'Сул тал'], ['step', 'Зөвлөгөө']];

function loveSide(person, index) {
  const hand = computeMatrix(person.date, 'hand');
  const texts = loadTexts(matrixDir);
  const readings = readText(matrixDir, '..', 'data', 'readings.json');
  let html = `<section class="couple side" id="side-${index}"><h2>Хайр, харилцаанд · ${esc(person.name)}</h2>`;
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

function coupleBook(people, method = 'all', kind = 'couple') {
  const business = kind === 'business';
  const centres = people.map((p) => computeMatrix(p.date, 'hand').points.centre);
  const [a, b] = [...centres].sort((x, y) => x - y);
  const t = readText(matrixDir, 'compat', `${a}-${b}.json`);
  if (!t) {
    console.error(`No compatibility text for ${a}-${b}`);
    process.exit(1);
  }
  const who = people.map((p, i) => `<div class="pp">${arcana(centres[i], true)}<p><b>${esc(p.name)}</b><br>${dateStamp(p.date)}<br>Амин тоо ${centres[i]} · ${esc(TALENTS[centres[i]].name)}</p></div>`).join('<span class="plus">+</span>');
  // the couple matrix: both charts added position by position, read zone by zone
  const couple = computeCouple(people[0].date, people[1].date, method);
  const { ids, dir } = PAIR_KINDS[kind];
  const zoneTexts = Object.fromEntries(ids.map((id) => [id, readText(matrixDir, dir, `${id}.json`)]).filter(([, f]) => f));
  zoneTexts.tails = business ? readText(matrixDir, 'business', 'tails.json')?.tails ?? {}
    : Object.assign({}, ...COUPLE_TAIL_FILES.map((f) => readText(matrixDir, 'couple', 'tails', `${f}.json`)?.tails ?? {}));
  const parts = coupleParts(couple, zoneTexts, kind);
  const METHOD_NOTE = {
    all: 'Хоёр хүний матрицын байрлал бүрийг хооронд нь нэмж бодсон (орос тооцоолуурын арга).',
    outer: 'Хоёр хүний үндсэн есөн цэгийг нэмээд, бусад тоог түүнээс бодсон.',
  };
  const toc = [['amin', 'Амин тоогоор тохирол'], ['couple-map', 'Хосын матриц'], ...parts.map((part, i) => [`cp-${i}`, part.title]),
    ...(business ? [] : people.map((p, i) => [`side-${i}`, `Хайр, харилцаанд · ${p.name}`]))];
  const body = `<section class="couple cover-c"><p class="kicker">Хувь тавилангийн матриц · ${business ? 'Бизнесийн түншлэл' : 'Хоёр хүний тохирол'}</p>`
    + `<h1>${people.map((p) => esc(p.name)).join(' + ')}</h1><div class="pair-head">${who}</div>`
    + `<nav><h3>Агуулга</h3><ol>${toc.map(([id, title]) => `<li><a href="#${id}">${esc(title)}</a></li>`).join('')}</ol></nav></section>`
    + `<section class="couple" id="amin"><h2>${centres.map((n) => esc(TALENTS[n].name)).join(' + ')}</h2><p class="motto">${esc(t.headline)}</p>`
    + `<table class="short scores">${AREAS.map(([k, title]) => `<tr><th>${title}</th><td>${'●'.repeat(t[k].score)}${'○'.repeat(5 - t[k].score)} ${t[k].score}/5</td></tr>`).join('')}</table>`
    + `<div class="ov">${paras(t.overview)}</div>`
    + AREAS.map(([k, title]) => `<h3>${title}</h3>${paras(t[k].text)}`).join('')
    + `<h3>Юу сайн ажилладаг</h3><ul>${t.strengths.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>`
    + `<h3>Хаана мөргөлддөг</h3><ul>${t.tensions.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>`
    + `<h3>Зөвлөгөө</h3>${paras(t.advice)}</section>`
    + `<section class="drawing" id="couple-map"><h2>${business ? 'Түншлэлийн матриц' : 'Хосын матриц'}</h2>${renderMap(couple)}<p class="note">${METHOD_NOTE[method]}</p></section>`
    + parts.map((part, i) => `<section class="part" id="cp-${i}"><h2>${esc(part.title)}</h2>${part.zones.map((z) => `<article class="chap">${z.html}</article>`).join('')}</section>`).join('')
    + (business ? '' : people.map((p, i) => loveSide(p, i)).join(''));
  const css = `.couple { color: var(--text); } .couple h1 { font: 600 28pt/1.15 var(--serif); color: var(--ink); text-align: center; margin: 6pt 0 10pt; }
.couple .kicker { text-align: center; } .pair-head { display: flex; align-items: center; justify-content: center; gap: 10mm; margin: 6mm 0; }
.pp { display: flex; align-items: center; gap: 4mm; } .pp p { margin: 0; font: 10pt/1.5 var(--sans); } .plus { font: 600 24pt var(--serif); color: #b88a2e; }
.couple h2 { font: 600 18pt/1.2 var(--serif); color: var(--ink); text-align: center; margin: 10pt 0 2pt; } .couple .motto { text-align: center; font-style: italic; }
.couple h3 { font: 600 14pt/1.2 var(--serif); color: #8a6420; margin: 12pt 0 4pt; break-after: avoid; } .side { break-before: page; } .cover-c { break-after: page; } .cover-c nav { width: 120mm; margin: 12mm auto 0; font: 10.5pt/1.7 var(--sans); } .cover-c nav a { color: var(--ink); text-decoration: none; } .note { font: 9pt var(--sans); color: var(--muted); text-align: center; } #amin h2 { margin-top: 0; } .side h2 { text-align: left; border-bottom: 2px solid #b88a2e; padding-bottom: 4pt; } .scores td { letter-spacing: .1em; color: #8a6420; }`;
  print(`${people.map((p) => p.name).join(' + ')} ${business ? 'бизнесийн түншлэл' : 'тохирол'}`, bookHtml(business ? 'Бизнесийн түншлэл' : 'Хоёр хүний тохирол', `<main class="book"><style>${css}</style>${body}</main>`));
}

if (plain[0] === 'couple') {
  const names = (flags.names ?? 'Нэгдүгээр хүн,Хоёрдугаар хүн').split(',');
  const genders = (flags.genders ?? ',').split(',').map((g) => ({ male: 'male', female: 'female', m: 'male', f: 'female' })[g] ?? '');
  const method = COUPLE_METHODS.includes(flags.method) ? flags.method : 'all';
  coupleBook([parseDate(plain[1]), parseDate(plain[2])].map((date, i) => ({ date, name: names[i], gender: genders[i] })), method, flags.kind === 'business' ? 'business' : 'couple');
} else {
  const gender = { male: 'male', female: 'female', m: 'male', f: 'female' }[flags.gender] ?? '';
  personBook({ date: parseDate(plain[0]), name: flags.name ?? dateStamp(parseDate(plain[0])), gender, clan: flags.clan ?? '', father: flags.father ?? '' });
}
