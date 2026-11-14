// Print everything the site has written about each of the 22 energies as a
// PDF book per number: matrix/out/pdf/<n>-<name>.pdf. Each book holds the
// profile, the reading of every chapter where the number can appear (short
// card and long text), the karmic tails that contain it, the six links, how
// it combines with the other 21 energies, and its compatibility pairs.
// Run tools/build_number_pages.mjs first. Usage: node tools/render_numbers_pdf.mjs [n …]
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { TALENTS } from '../matrix/talents.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const texts = join(root, 'matrix', 'texts');
const out = join(root, 'matrix', 'out', 'pdf');
mkdirSync(join(out, 'html'), { recursive: true });
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(existsSync);
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX', 'XXI', 'XXII'];
const esc = (v) => String(v).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const paras = (t) => String(t).split(/\n\n+/).map((p) => `<p>${esc(p)}</p>`).join('');
const table = (rows) => `<table>${rows.filter(([, v]) => v).map(([k, v]) => `<tr><th>${k}</th><td>${esc(v)}</td></tr>`).join('')}</table>`;
const read = (...p) => JSON.parse(readFileSync(join(texts, ...p), 'utf8'));

const SECTIONS = [['character', 'Зан чанар'], ['love', 'Хайр дурлал'], ['family', 'Гэр бүл'], ['friends', 'Найз нөхөд'], ['work', 'Ажил мэргэжил'],
  ['money', 'Мөнгө'], ['business', 'Бизнесийн түнш'], ['health', 'Эрүүл мэнд ба эрч хүч'], ['shadow', 'Сөрөг тал'], ['advice', 'Зөвлөгөө']];
const AREAS = [['love', 'Хайр дурлал'], ['family', 'Гэр бүл'], ['business', 'Бизнесийн түнш'], ['friendship', 'Нөхөрлөл'], ['money', 'Мөнгө']];

const genders = (g) => (g ? [['male', 'Эрэгтэй хүний хувьд'], ['female', 'Эмэгтэй хүний хувьд']]
  .filter(([k]) => g[k]).map(([k, t]) => `<div class="gn"><h5>${t}</h5>${paras(g[k])}</div>`).join('') : '');

function longHtml(long) {
  if (!long) return '';
  let html = long.intro ? `<p class="lead">${esc(long.intro)}</p>` : '';
  for (const [key, title] of [['gives', 'Энэ эрчим танд юу өгдөг'], ['costs', 'Энэ эрчмийн үнэ'], ['key', 'Өсөлтийн түлхүүр']]) {
    if (long[key]?.length) html += `<h5>${title}</h5>${long[key].map((p) => `<p>${esc(p)}</p>`).join('')}`;
  }
  if (long.questions?.length) html += `<h5>Өөрөөсөө асуух асуулт</h5><ul class="q">${long.questions.map((q) => `<li>${esc(q)}</li>`).join('')}</ul>`;
  return html;
}

function book(n) {
  const page = read('by-number', `${n}.json`);
  const p = page.profile;
  let toc = [];
  let body = '';
  const section = (id, title, html) => {
    toc.push([id, title]);
    body += `<section class="part" id="${id}"><h2>${title}</h2>${html}</section>`;
  };

  // profile
  let html = `<div class="intro">${paras(p.overview)}</div>`;
  for (const [key, title] of SECTIONS) if (p.sections[key]) html += `<h3>${title}</h3>${paras(p.sections[key])}`;
  if (page.gender) html += `<h3>Эрэгтэй ба эмэгтэй хүнд</h3>${genders(page.gender)}`;
  html += '<h3>Танд тохирох зүйлс</h3><div class="fits">'
    + `<div><h4>Мэргэжил</h4><ul>${p.professions.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>`
    + `<div><h4>Өнгө</h4><ul>${p.colors.map((x) => `<li><b>${esc(x.color)}</b> — ${esc(x.why)}</li>`).join('')}</ul></div>`
    + `<div><h4>Тэжээвэр амьтан</h4><ul>${p.pets.map((x) => `<li><b>${esc(x.animal)}</b> — ${esc(x.why)}</li>`).join('')}</ul></div>`
    + `<div><h4>Машин</h4><ul><li><b>${esc(p.car.style)}</b> — ${esc(p.car.why)}</li></ul></div>`
    + `<div><h4>Хобби</h4><ul>${p.hobbies.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>`
    + `<div><h4>Тав тухтай газар</h4><ul>${p.places.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div></div>`;
  section('profile', 'Ерөнхий шинж', html);

  // chapters
  html = '<p class="note">Энэ тоо матрицын аль цэг дээр байгаагаас хамаарч өөр өөр утгатай. Доор энэ тоо гарч болох бүлэг бүрийн тайлбар байна.</p>';
  for (const part of page.parts) {
    html += `<h3 class="ptitle">${ROMAN[part.index]} · ${esc(part.title)}</h3>`;
    for (const c of part.chapters) {
      html += `<article class="ch"><h4>${esc(c.name)}</h4><p class="meta"><b>Хаанаас гардаг:</b> ${esc(c.source)}<br><b>Асуудаг:</b> ${esc(c.asks)}</p>`
        + (c.short ? table([['Мөн чанар', c.short.essence], ['Хүч', c.short.strength], ['Сул тал', c.short.trap], ['Зөвлөгөө', c.short.step]]) : '')
        + `${longHtml(c.long)}${genders(c.gender)}</article>`;
    }
  }
  section('chapters', 'Матрицын байрлал бүрт', html);

  if (page.tails.length) {
    section('tails', 'Энэ тоо орсон үйлийн үрийн сүүл', page.tails.map((t) => `<article class="ch"><h4>${esc(t.code)} · ${esc(t.name)}</h4>`
      + table([['Өнгөрсөн амьдрал', t.past], ['Энэ амьдралд', t.present], ['Сул тал', t.trap], ['Зөвлөгөө', t.step]]) + `${longHtml(t.long)}${genders(t.gender)}</article>`).join(''));
  }
  if (page.links.length) {
    section('links', 'Зургаан холбоос дээр', page.links.map((l) => `<article class="ch"><h4>${esc(l.name)}</h4><p class="meta">${esc(l.about)}</p>`
      + table([['Мөн чанар', l.essence], ['Бэлэг', l.gift], ['Сул тал', l.trap], ['Зөвлөгөө', l.step]])
      + `<p><b>Дэлгэрэнгүй тоо болбол:</b> ${esc(l.deeper)}</p></article>`).join(''));
  }
  if (page.pairs.length) {
    section('pairs', 'Нэг матрицад бусад эрчимтэй хамт', page.pairs.map((x) => `<article class="ch small"><h4>${n} + ${x.other} · ${esc(TALENTS[x.other].name)}</h4>`
      + `<p>${esc(x.together)}</p>${table([['Бэлэг', x.gift], ['Зөрчил', x.tension], ['Тэнцвэр', x.balance]])}</article>`).join(''));
  }
  if (page.compat.length) {
    html = '<p class="note">Амин тоо (матрицын төв) нь энэ тоотой хүн бусад амин тоотой хүнтэй хэр тохирох вэ. Оноо 5 хүртэл.</p>';
    for (const c of page.compat) {
      const [a, b] = [n, c.other].sort((x, y) => x - y);
      const t = read('compat', `${a}-${b}.json`);
      html += `<article class="ch"><h4>${n} + ${c.other} · ${esc(TALENTS[c.other].name)}</h4><p class="motto">${esc(t.headline)}</p>`
        + `<p class="scores">${AREAS.map(([k, title]) => `${title} ${'●'.repeat(t[k].score)}${'○'.repeat(5 - t[k].score)}`).join(' · ')}</p>`
        + paras(t.overview) + AREAS.map(([k, title]) => `<h5>${title}</h5>${paras(t[k].text)}`).join('')
        + `<h5>Юу сайн ажилладаг</h5><ul>${t.strengths.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>`
        + `<h5>Хаана мөргөлддөг</h5><ul>${t.tensions.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>`
        + `<h5>Зөвлөгөө</h5>${paras(t.advice)}</article>`;
    }
    section('compat', 'Амин тоогоор тохирол', html);
  }

  const cover = `<section class="cover"><p class="kicker">Хувь тавилангийн матриц · 22 эрчим</p><div class="card"><small>${ROMAN[n - 1]}</small><b>${n}</b></div>`
    + `<h1>${esc(p.name)}</h1><p class="arch">${esc(p.archetype)}</p><p class="motto">${esc(p.motto)}</p>`
    + `<p class="kw">${p.keywords.map(esc).join(' · ')}</p>`
    + `<nav><h3>Агуулга</h3><ol>${toc.map(([id, t]) => `<li><a href="#${id}">${t}</a></li>`).join('')}</ol></nav></section>`;

  return `<!doctype html><html lang="mn"><head><meta charset="utf-8"><title>${n} · ${esc(p.name)}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Inter:wght@400;600&display=swap">
<style>
@page { size: A4; margin: 18mm 17mm 18mm 17mm; }
* { box-sizing: border-box; }
body { margin: 0; color: #20253f; font: 11.5pt/1.55 "Cormorant Garamond", Georgia, serif; }
h1, h2, h3, h4, h5 { font-family: "Cormorant Garamond", Georgia, serif; color: #20253f; break-after: avoid; }
h2 { font-size: 22pt; margin: 0 0 10pt; padding-bottom: 6pt; border-bottom: 2px solid #b88a2e; }
h3 { font-size: 15pt; margin: 16pt 0 4pt; color: #8a6420; }
h4 { font-size: 13.5pt; margin: 0 0 4pt; }
h5 { font: 600 7.5pt/1.4 Inter, sans-serif; letter-spacing: .12em; text-transform: uppercase; color: #8a6420; margin: 10pt 0 3pt; }
p { margin: 0 0 6pt; }
.part { break-before: page; }
.cover { text-align: center; padding-top: 40mm; break-after: page; }
.cover .kicker { font: 600 8pt Inter, sans-serif; letter-spacing: .2em; text-transform: uppercase; color: #8a6420; }
.card { width: 46mm; height: 68mm; margin: 14mm auto 8mm; border: 2px solid #b88a2e; border-radius: 5mm; background: #232a48; color: #f2d48f; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.card small { font-size: 12pt; letter-spacing: .1em; }
.card b { font-size: 60pt; line-height: 1; }
.cover h1 { font-size: 34pt; margin: 0; }
.arch { font-size: 15pt; margin: 2pt 0 8pt; color: #8a6420; }
.motto { font-style: italic; font-size: 13pt; }
.kw { font: 9pt Inter, sans-serif; color: #555a70; }
.cover nav { text-align: left; width: 110mm; margin: 16mm auto 0; }
.cover nav a { color: #20253f; text-decoration: none; }
.intro p { font-size: 12.5pt; }
.note { color: #555a70; font-style: italic; }
.ptitle { break-before: page; font: 600 9pt Inter, sans-serif; letter-spacing: .14em; text-transform: uppercase; color: #8a6420; border-bottom: 1px solid #e0d5bb; padding-bottom: 3pt; }
.ptitle:first-of-type { break-before: auto; }
.ch { margin: 0 0 14pt; padding-bottom: 8pt; border-bottom: 1px solid #e6dcc3; }
.ch.small { break-inside: avoid; }
.meta { font: 8.5pt/1.45 Inter, sans-serif; color: #555a70; }
table { width: 100%; border-collapse: collapse; margin: 4pt 0 8pt; break-inside: avoid; }
th { width: 26mm; text-align: left; vertical-align: top; font: 600 7pt/1.6 Inter, sans-serif; letter-spacing: .08em; text-transform: uppercase; color: #8a6420; padding: 3pt 6pt 3pt 0; border-bottom: 1px solid #eee5cf; }
td { padding: 3pt 0; border-bottom: 1px solid #eee5cf; }
.lead::first-letter { float: left; font-size: 30pt; line-height: .85; margin: 2pt 5pt 0 0; color: #b88a2e; }
ul { margin: 0 0 6pt; padding-left: 14pt; }
ul.q li { font-style: italic; }
.fits { display: grid; grid-template-columns: 1fr 1fr; gap: 6pt 14pt; }
.fits h4 { font: 600 8pt Inter, sans-serif; letter-spacing: .1em; text-transform: uppercase; color: #8a6420; margin: 6pt 0 2pt; }
.scores { font: 8.5pt Inter, sans-serif; color: #8a6420; }
.gn { margin: 6pt 0 8pt; padding: 4pt 10pt; border-left: 2.5pt solid #b88a2e; background: #faf5e8; break-inside: avoid; }
.gn h5 { margin-top: 2pt; }
</style></head><body>${cover}${body}</body></html>`;
}

const which = process.argv.slice(2).map(Number).filter((n) => n >= 1 && n <= 22);
for (const n of which.length ? which : Array.from({ length: 22 }, (_, k) => k + 1)) {
  const html = join(out, 'html', `${n}.html`);
  writeFileSync(html, book(n));
  const pdf = join(out, `${String(n).padStart(2, '0')} - ${TALENTS[n].name}.pdf`);
  execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--no-pdf-header-footer', '--virtual-time-budget=15000',
    `--print-to-pdf=${pdf}`, pathToFileURL(html).href], { stdio: 'ignore' });
  console.log(`${pdf}  ${(statSync(pdf).size / 1048576).toFixed(1)} MB`);
}
