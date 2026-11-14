// Print every Pythagoras square reading as one reference PDF: what the
// square is, each of the 9 cells at every count (empty to six or more) and
// each of the 8 lines at every strength, each with a small board showing the
// cells it reads. Texts: matrix/texts/pyth-readings.json.
// Usage: node tools/render_pyth_book.mjs → matrix/out/pdf/Пифагорын квадратын бүх тайлбар.pdf
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const t = JSON.parse(readFileSync(join(root, 'matrix', 'texts', 'pyth-readings.json'), 'utf8'));
const esc = (v) => String(v ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const NAMES = ['', 'Зан чанар, хүсэл эрмэлзэл', 'Эрч хүч', 'Шинийг судлах сонирхол', 'Эрүүл мэнд, амьдралын хүч', 'Логик ба зөн совин',
  'Хөдөлмөрлөх хандлага', 'Аз, амжилт', 'Хариуцлага, энэрэл', 'Ой санамж, оюун'];
const LINES = { 147: 'Зорилго, эрмэлзэл', 258: 'Гэр бүлсэг байдал', 369: 'Тогтвор суурьшил', 123: 'Өөрийн үнэлэмж', 456: 'Санхүү, мөнгө',
  789: 'Авьяас чадвар', 159: 'Оюунлаг, сүнслэг тэмүүлэл', 357: 'Махан биеийн хүсэл сонирхол' };
const COUNTS = [['0', 'хоосон'], ['1', 'нэг удаа'], ['2', 'хоёр удаа'], ['3', 'гурван удаа'], ['4', 'дөрвөн удаа'], ['5', 'таван удаа'], ['6', 'зургаа ба түүнээс дээш']];
const LEVELS = [['0', 'Байхгүй (0)'], ['1-2', 'Сул (1–2)'], ['3-4', 'Дунд (3–4)'], ['5-6', 'Хүчтэй (5–6)'], ['7+', 'Маш хүчтэй (7+)']];

// a small 3×3 board, columns 1-2-3 · 4-5-6 · 7-8-9, with the given cells lit
function board(lit) {
  let s = '';
  for (let d = 1; d <= 9; d += 1) {
    const x = 6 + Math.floor((d - 1) / 3) * 40;
    const y = 6 + ((d - 1) % 3) * 40;
    const on = lit.includes(d);
    s += `<rect x="${x}" y="${y}" width="36" height="36" rx="6" fill="${on ? '#b88a2e' : '#f4efe3'}" stroke="#d9cfb6"/>`
      + `<text x="${x + 18}" y="${y + 24}" text-anchor="middle" font-size="16" font-weight="700" fill="${on ? '#fff' : '#a59a80'}">${d}</text>`;
  }
  return `<svg viewBox="0 0 130 130" xmlns="http://www.w3.org/2000/svg" font-family="Inter, sans-serif">${s}</svg>`;
}

let body = `<h1>Пифагорын квадратын бүх тайлбар</h1><p class="lead">${esc(t.intro)}</p>`
  + '<div class="howto"><div class="b">' + board([]) + '</div><p>Квадрат 3×3 нүдтэй: багана бүр 1-2-3, 4-5-6, 7-8-9. Нүдэнд тухайн цифр төрсөн огноо болон ажлын тоонуудад хэдэн удаа орсныг бичдэг (жишээ нь «111» гэвэл 1 гурван удаа). Мөр, багана, диагональ бүр гурван нүдний цифрийн нийт тоо бөгөөд тухайн чанарын хүчийг заана.</p></div>';
body += '<h2>Нүд бүр</h2>';
for (let d = 1; d <= 9; d += 1) {
  body += `<section class="cell"><div class="head"><div class="b">${board([d])}</div><h3>${d} · ${esc(NAMES[d])}</h3></div>`
    + COUNTS.map(([k, label]) => `<div class="row"><b>${k === '0' ? '0' : String(d).repeat(Number(k))}${k === '6' ? '…' : ''}</b><span>${label}</span><p>${esc(t.cells[d][k])}</p></div>`).join('')
    + '</section>';
}
body += '<h2 class="new">Мөр, багана, диагональ</h2>';
for (const [code, name] of Object.entries(LINES)) {
  body += `<section class="cell"><div class="head"><div class="b">${board([...code].map(Number))}</div><h3>${[...code].join('-')} · ${esc(name)}</h3></div>`
    + LEVELS.map(([k, label]) => `<div class="row"><b>${k}</b><span>${label}</span><p>${esc(t.lines[code][k])}</p></div>`).join('')
    + '</section>';
}
const html = `<!doctype html><html lang="mn"><head><meta charset="utf-8"><title>Пифагорын квадратын бүх тайлбар</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600&family=Inter:wght@400;600;700&display=swap">
<style>@page { size: A4; margin: 15mm; } body { margin: 0; color: #232a48; font: 11pt/1.5 "Cormorant Garamond", Georgia, serif; }
h1 { font-size: 26pt; margin: 0 0 3mm; } h2 { font-size: 18pt; border-bottom: 2px solid #b88a2e; padding-bottom: 2mm; margin: 6mm 0 3mm; } h2.new { break-before: page; }
.lead { font-size: 12pt; } .howto { display: flex; gap: 6mm; align-items: center; border: 1px solid #e6dcc3; border-radius: 3mm; padding: 3mm 5mm; }
.howto p { margin: 0; font: 9.5pt/1.5 Inter, sans-serif; } .b svg { width: 22mm; height: 22mm; display: block; }
.cell { margin: 0 0 5mm; padding-bottom: 2mm; border-bottom: 1px solid #e6dcc3; }
.head { break-after: avoid; display: flex; gap: 5mm; align-items: center; } h3 { margin: 0; font: 600 13pt Inter, sans-serif; }
.row { break-inside: avoid; display: grid; grid-template-columns: 18mm 30mm 1fr; gap: 3mm; padding: 1.5mm 0; border-top: 1px solid #f1eadb; }
.row b { font: 700 13pt Inter, sans-serif; color: #8a6420; } .row span { font: 8.5pt Inter, sans-serif; color: #555a70; padding-top: 1mm; } .row p { margin: 0; }</style>
</head><body>${body}</body></html>`;
const out = join(root, 'matrix', 'out', 'pdf');
mkdirSync(join(out, 'html'), { recursive: true });
const file = join(out, 'html', 'pyth.html');
writeFileSync(file, html);
const pdf = join(out, 'Пифагорын квадратын бүх тайлбар.pdf');
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(existsSync);
execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--no-pdf-header-footer', '--virtual-time-budget=15000', `--print-to-pdf=${pdf}`, pathToFileURL(file).href], { stdio: 'ignore' });
console.log(pdf);
