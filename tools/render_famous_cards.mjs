// Print a two-page matrix card for each famous person in
// matrix/texts/famous/*.json: photo, dates, short biography, key numbers and
// how they echo the life, then the matrix drawing. Photos come from Wikimedia
// Commons (free licences, credited on the card) and are cached in
// matrix/out/famous/img/. Writes matrix/out/pdf/famous/<group>/<name>.pdf and
// one combined book per group. Usage: node tools/render_famous_cards.mjs [group …]
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { computeMatrix, ringPointAt } from '../matrix/matrix.js';
import { renderGuide, renderMap } from '../matrix/draw.js';
import { TALENTS } from '../matrix/talents.js';
import { ROMAN, dateStamp, esc } from '../matrix/report.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = join(root, 'matrix', 'texts', 'famous');
// karmic tails are keyed from the centre outwards: inner-mid-bottom
const TAILS = JSON.parse(readFileSync(join(root, 'matrix', 'texts', 'karmic-tails.json'), 'utf8')).tails;
const imgDir = join(root, 'matrix', 'out', 'famous', 'img');
const outDir = join(root, 'matrix', 'out', 'pdf', 'famous');
mkdirSync(imgDir, { recursive: true });
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(existsSync);

const parse = (s) => {
  const [year, month, day] = s.split('-').map(Number);
  return { year, month, day };
};
const ageAt = (born, died) => died.year - born.year - ((died.month < born.month || (died.month === born.month && died.day < born.day)) ? 1 : 0);

async function photo(person) {
  if (!person.image?.url) return null;
  const ext = (person.image.url.match(/\.(jpe?g|png|webp|gif)(?:$|\?)/i)?.[1] ?? 'jpg').toLowerCase();
  const file = join(imgDir, `${person.id}.${ext}`);
  if (!existsSync(file)) {
    // Wikimedia answers 429 when asked too fast: wait and try again
    let response;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 1500 + attempt * 5000));
      response = await fetch(person.image.url, { headers: { 'User-Agent': 'zurhai-matrix-cards/1.0 (personal, non-commercial)' } });
      if (response.status !== 429) break;
    }
    const type = response.headers.get('content-type') ?? '';
    if (!response.ok || !type.startsWith('image/')) {
      console.warn(`no photo for ${person.id}: ${response.status} ${type}`);
      return null;
    }
    writeFileSync(file, Buffer.from(await response.arrayBuffer()));
  }
  const mime = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif' }[ext];
  return `data:${mime};base64,${readFileSync(file).toString('base64')}`;
}

const tile = (n, label) => `<div class="tile"><div class="arc"><small>${ROMAN[n - 1]}</small><b>${n}</b></div><div><span>${esc(label)}</span><strong>${esc(TALENTS[n].name)}</strong></div></div>`;

async function card(person) {
  const born = parse(person.born);
  const m = computeMatrix(born, 'guide');
  const p = m.points;
  const tail = [p.bottom, m.lines.bottom.mid, m.lines.bottom.inner];
  const tailText = TAILS[[...tail].reverse().join('-')];
  const died = person.died ? parse(person.died) : null;
  const end = died ? ringPointAt(m, ageAt(born, died)) : null;
  const img = await photo(person);
  const tiles = [
    [p.centre, 'Сэтгэл зүйн тухтай орон зай'], [p.left, 'Зан чанар'], [p.top, 'Авьяас'], [p.right, 'Сүнсний зорилго'],
    [p.bottom, 'Сүнсний сорилт'], [m.purposes.personal, 'Хувийн зорилго'], [m.purposes.social, 'Нийгмийн зорилго'], [m.purposes.spiritual, 'Сүнслэг зорилго'],
    [m.loveMoney.love, 'Хайрын цэг'], [m.loveMoney.money, 'Мөнгөний цэг'],
  ];
  const dates = `${dateStamp(born)}${died ? ` - ${dateStamp(died)}` : ''}`;
  return `<section class="card">
<header class="head">${img ? `<img src="${img}" alt="">` : '<div class="noimg"></div>'}
<div><p class="kicker">${esc(person.category)}</p><h1>${esc(person.name)}</h1><p class="role">${esc(person.role)}</p>
<p class="dates">${dates}${died ? ` · ${ageAt(born, died)} нас` : ''}</p>${person.date_note ? `<p class="dnote">${esc(person.date_note)}</p>` : ''}</div></header>
<p class="bio">${esc(person.bio)}</p>
<div class="tiles">${tiles.map(([n, label]) => tile(n, label)).join('')}</div>
<div class="tailbox"><h3>Үйлийн үр · ${tail.join(' · ')}${tailText ? ` · ${esc(tailText.name)}` : ''}</h3>${person.tail
    ? `<p>${esc(person.tail.past)}</p><p>${esc(person.tail.life)}</p><p class="lesson">${esc(person.tail.lesson)}</p>`
    : tailText ? `<p>${esc(tailText.present)} ${esc(tailText.trap)}</p>` : ''}</div>
${end ? `<p class="extra">Нас барсан насны эрчим (${end.label} нас): <b>${end.value} ${esc(TALENTS[end.value].name)}</b></p>` : ''}
<div class="note"><h3>Матриц ба амьдрал</h3><p>${esc(person.matrix_note)}</p></div>
${person.image?.url && img ? `<p class="credit">Зураг: ${esc(person.image.author ?? '')} · ${esc(person.image.license ?? '')} · Wikimedia Commons</p>` : ''}
</section>
<section class="chart"><h2>${esc(person.name)} · ${dateStamp(born)}</h2>${renderGuide(m)}<div class="small">${renderMap(computeMatrix(born, 'hand'))}</div></section>`;
}

const CSS = `
@page { size: A4; margin: 14mm; }
* { box-sizing: border-box; }
body { margin: 0; font: 10.5pt/1.55 Inter, "Segoe UI", sans-serif; color: #232a48; }
.card { break-after: page; }
.head { display: flex; gap: 6mm; align-items: center; padding: 4mm 5mm; border-radius: 5mm; background: linear-gradient(135deg, #232a48, #3a2f5c); color: #f2e6c4; }
.head img, .noimg { width: 30mm; height: 38mm; object-fit: cover; object-position: top; border-radius: 3mm; border: 2px solid #b88a2e; background: #4a4f6a; }
.kicker { margin: 0; font: 600 7.5pt Inter, sans-serif; letter-spacing: .18em; text-transform: uppercase; color: #e0bf74; }
h1 { margin: 1.5mm 0 1mm; font: 600 23pt/1.05 "Cormorant Garamond", Georgia, serif; color: #fff; }
.role { margin: 0; font-size: 11pt; color: #f2e6c4; }
.dates { margin: 2mm 0 0; font: 600 12pt Inter, sans-serif; color: #e0bf74; }
.dnote { margin: 1mm 0 0; font-size: 8pt; color: #c9cde0; font-style: italic; }
.bio { margin: 3mm 0 2.5mm; font: 11pt/1.4 "Cormorant Garamond", Georgia, serif; }
.tiles { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5mm 3mm; }
.tile { display: flex; align-items: center; gap: 2.5mm; padding: .8mm 2mm; border: 1px solid #e6dcc3; border-radius: 2.5mm; background: #fbf6ea; }
.arc { width: 8mm; height: 10.5mm; border-radius: 1.5mm; background: #232a48; border: 1px solid #b88a2e; color: #f2d48f; display: flex; flex-direction: column; align-items: center; justify-content: center; line-height: 1; }
.arc small { font-size: 5.5pt; } .arc b { font: 600 14pt "Cormorant Garamond", serif; }
.tile span { display: block; font: 600 7pt Inter, sans-serif; letter-spacing: .1em; text-transform: uppercase; color: #8a6420; }
.tile strong { font: 600 11.5pt "Cormorant Garamond", serif; }
.tailbox { margin: 3mm 0; padding: 2.5mm 4mm; border: 1px solid #e6dcc3; border-radius: 2.5mm; }
.tailbox h3 { margin: 0 0 1mm; font: 600 8pt Inter, sans-serif; letter-spacing: .1em; text-transform: uppercase; color: #a04a4a; }
.tailbox p { margin: 0; font: 10.5pt/1.35 "Cormorant Garamond", Georgia, serif; }
.tailbox p + p { margin-top: 1.2mm; }
.tailbox .lesson { font-style: italic; color: #6a4a2a; }
.extra { margin: 2mm 0; font-size: 10pt; } .extra b { color: #8a6420; }
.note { padding: 3mm 5mm; break-inside: avoid; border-left: 3pt solid #b88a2e; background: #faf5e8; }
.note h3 { margin: 0 0 1mm; font: 600 8pt Inter, sans-serif; letter-spacing: .14em; text-transform: uppercase; color: #8a6420; }
.note p { margin: 0; font: 10.5pt/1.38 "Cormorant Garamond", Georgia, serif; }
.credit { margin-top: 4mm; font-size: 7pt; color: #888; }
.chart { break-after: page; text-align: center; }
.chart h2 { margin: 0 0 3mm; font: 600 16pt "Cormorant Garamond", serif; }
.chart > svg { width: 122mm; height: auto; }
.small svg { width: 138mm; height: auto; margin-top: 1mm; }
`;

const page = (title, body) => `<!doctype html><html lang="mn"><head><meta charset="utf-8"><title>${esc(title)}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600&family=Inter:wght@400;600&display=swap">
<style>${CSS}</style></head><body>${body}</body></html>`;

function print(htmlFile, pdf) {
  execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--no-pdf-header-footer', '--virtual-time-budget=20000',
    `--print-to-pdf=${pdf}`, pathToFileURL(htmlFile).href], { stdio: 'ignore' });
  console.log(`${pdf}  ${(statSync(pdf).size / 1048576).toFixed(1)} MB`);
}

const wanted = process.argv.slice(2);
const groups = readdirSync(dataDir).filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5)).filter((g) => !wanted.length || wanted.includes(g));
for (const group of groups) {
  const people = JSON.parse(readFileSync(join(dataDir, `${group}.json`), 'utf8'));
  const dir = join(outDir, group);
  mkdirSync(join(dir, 'html'), { recursive: true });
  const cards = [];
  for (const [k, person] of people.entries()) {
    const html = await card(person);
    cards.push(html);
    const file = join(dir, 'html', `${person.id}.html`);
    writeFileSync(file, page(person.name, html));
    print(file, join(dir, `${String(k + 1).padStart(2, '0')} ${person.name}.pdf`));
  }
  const all = join(dir, 'html', '_all.html');
  writeFileSync(all, page(people[0]?.category ?? group, cards.join('')));
  print(all, join(outDir, `${people[0]?.category ?? group}.pdf`));
}
