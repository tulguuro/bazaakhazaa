// Print the structure of a full reading for review: every section and
// chapter in order, with the matrix positions it reads (a small chart), the
// question it answers and what it contains, plus the couple reading's zones.
// Usage: node tools/render_structure.mjs → matrix/out/pdf/Тайлбарын бүтэц.pdf
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { computeMatrix } from '../matrix/matrix.js';
import { renderLocator } from '../matrix/draw.js';
import { CHAPTERS } from '../matrix/chapters.js';
import { BUSINESS_PARTS, COUPLE_PARTS } from '../matrix/couple.js';
import { ROMAN, esc } from '../matrix/report.js';
import { loadTexts, readText } from './load_texts.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const matrixDir = join(root, 'matrix');
const texts = loadTexts(matrixDir);
const m = computeMatrix({ year: 1989, month: 3, day: 15 }, 'hand');
const loc = (at) => `<div class="loc">${renderLocator(m, at, { blank: true })}</div>`;
const WHERE = {
  left: 'Зүүн орой (А, 0 нас)', top: 'Дээд орой (Б, 20 нас)', right: 'Баруун орой (В, 40 нас)', bottom: 'Доод орой (Г, 60 нас)', centre: 'Төв (Д)',
  tl: 'Зүүн дээд булан (Е, 10 нас)', tr: 'Баруун дээд булан (Ж, 30 нас)', br: 'Баруун доод булан (И, 50 нас)', bl: 'Зүүн доод булан (З, 70 нас)',
  'top.inner': 'Дээд шугамын дотор тоо', 'top.mid': 'Дээд шугамын дунд тоо', 'left.inner': 'Зүүн шугамын дотор тоо', 'left.mid': 'Зүүн шугамын дунд тоо',
  'right.inner': 'Баруун шугамын дотор тоо', 'right.mid': 'Баруун шугамын дунд тоо', 'bottom.inner': 'Доод шугамын дотор тоо', 'bottom.mid': 'Доод шугамын дунд тоо',
  'loveMoney.love': 'Хайрын цэг', 'loveMoney.mid': 'Хайр, мөнгөний уулзвар', 'loveMoney.money': 'Мөнгөний цэг', familyCentre: 'Удмын төв (4 булангийн нийлбэр)',
  'purposes.personal': 'Хувийн зорилго (дээд+доод, зүүн+баруун)', 'purposes.social': 'Нийгмийн зорилго (эцгийн + эхийн шугам)',
  'purposes.spiritual': 'Сүнслэг зорилго (хувийн + нийгмийн)', 'purposes.planetary': 'Хорвоо ертөнцийн зорилго (нийгмийн + сүнслэг)',
  'purposes.father': 'Эцгийн удмын шугам', 'purposes.mother': 'Эхийн удмын шугам', ring: 'Насны хүрээ (0–80 нас)',
};
// How each position's number is obtained: from the date itself (бие даасан)
// or as a sum of other points (нийлбэр). Sums above 22 are reduced.
const HOW = {
  left: ['date', 'төрсөн өдөр'], top: ['date', 'төрсөн сар'], right: ['date', 'төрсөн оны цифрүүдийн нийлбэр'],
  bottom: ['sum', 'А + Б + В'], centre: ['sum', 'А + Б + В + Г'],
  tl: ['sum', 'А + Б'], tr: ['sum', 'Б + В'], br: ['sum', 'В + Г'], bl: ['sum', 'Г + А'],
  'top.inner': ['sum', 'Б + Д'], 'top.mid': ['sum', 'Б + дээд дотор тоо'], 'left.inner': ['sum', 'А + Д'], 'left.mid': ['sum', 'А + зүүн дотор тоо'],
  'right.inner': ['sum', 'В + Д'], 'right.mid': ['sum', 'В + баруун дотор тоо'], 'bottom.inner': ['sum', 'Г + Д'], 'bottom.mid': ['sum', 'Г + доод дотор тоо'],
  'loveMoney.mid': ['sum', 'доод дотор тоо + баруун дотор тоо'], 'loveMoney.love': ['sum', 'доод дотор тоо + уулзвар'], 'loveMoney.money': ['sum', 'баруун дотор тоо + уулзвар'],
  familyCentre: ['sum', 'Е + Ж + И + З'],
  'purposes.personal': ['sum', '(Б + Г) + (А + В)'], 'purposes.social': ['sum', '(Е + И) + (Ж + З)'],
  'purposes.spiritual': ['sum', 'хувийн + нийгмийн зорилго'], 'purposes.planetary': ['sum', 'нийгмийн + сүнслэг зорилго'],
  'purposes.father': ['sum', 'Е + И'], 'purposes.mother': ['sum', 'Ж + З'], ring: ['sum', 'хөрш хоёр цэгийн нийлбэрүүд, нас бүрт нэг тоо'],
};
const howText = (key) => {
  const [kind, formula] = HOW[key] ?? ['sum', ''];
  return `<span class="tag ${kind}">${kind === 'date' ? 'бие даасан тоо' : 'нийлбэр тоо'}</span> ${esc(WHERE[key] ?? key)}: ${esc(formula)}`;
};
const pairHow = (at) => at.map((key) => `<span class="tag sum">хоёр хүний нийлбэр</span> ${esc(WHERE[key] ?? key)}: 1-р хүний энэ цэг + 2-р хүний энэ цэг`);
// how a chapter reads its numbers
const READS = { single: 'Нэг тооны тайлбар', each: 'Тоо тус бүрийг тусад нь тайлбарлана', combo: 'Тоонуудыг хамтад нь, хослолоор тайлбарлана', sum: 'Хоёр цэгийг нэмж гарсан нэг тоог тайлбарлана' };
const reads = (c) => (['karmic-tails', 'career', 'sexuality'].includes(c.id) ? 'combo' : c.at.length === 1 || ['decades', 'age-now', 'age-next'].includes(c.id) ? 'single' : 'each');
const PAIR_CHAPTERS = ['sexuality', 'parents', 'children', 'family-programmes'];
const contents = (c) => (c.id === 'career' ? [
  'Авьяас ба санхүүгийн сувгийн хослол (240 хослол)',
  'Тохирох 8–10 тодорхой ажил мэргэжил', 'Таны ажлын 5 чадвар', 'Танд тохирох ажлын орчин, болгоомжлох зүйл',
  'Хамгийн хүчтэй (олон давтагддаг) эрчим ажилд тань хэрхэн нөлөөлөх',
] : c.id === 'core' ? [
  'Товч карт (мөн чанар · хүч · хавх · эхний алхам)', 'Дэлгэрэнгүй текст (оршил · юу өгдөг · үнэ · өсөлтийн түлхүүр · асуултууд)', 'Эрэгтэй, эмэгтэй хувилбар',
] : [
  c.id === 'karmic-tails' ? 'Гурван тооны хослолын нэр, тайлбар (26 хослол)' : 'Товч карт (мөн чанар · хүч · хавх · эхний алхам)',
  texts[c.id]?.long ? 'Дэлгэрэнгүй текст (оршил · юу өгдөг · үнэ · өсөлтийн түлхүүр · асуултууд)' : null,
  'Эрэгтэй, эмэгтэй хувилбар (бүрэн хоёр төрөл)',
  PAIR_CHAPTERS.includes(c.id) ? 'Эрчмүүдийн хослол (хоёр тоо хамтдаа, энэ бүлгийн сэдвээр)' : null,
].filter(Boolean));
const item = (number, name, at, ask, list, mode = null, how = null) => `<article>${loc(at)}<div><h3>${number} ${esc(name)}</h3>`
  + (mode ? `<p class="mode">${esc(READS[mode])}</p>` : '')
  + `<ul class="how">${(how ?? at.map(howText)).map((x) => `<li>${x}</li>`).join('')}</ul>`
  + (ask ? `<p class="ask">«${esc(ask)}»</p>` : '')
  + (list.length ? `<ul>${list.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : '') + '</div></article>';

let n = 0;
let body = '<h1>Тайлбарын бүтэц</h1><p class="lead">Хувь хүний бүрэн тайлбарын бүх хэсэг, дэд бүлэг дарааллаараа. Бүлэг бүрт: матрицын аль цэгийг уншдаг (зураг дээр алтан өнгөөр), ямар асуултад хариулдаг, юунаас бүрддэг. Засах, өөрчлөх зүйлээ бүлгийн дугаараар нь хэлээрэй.</p>'
  + '<div class="legend"><p><span class="tag date">бие даасан тоо</span> төрсөн огнооноос шууд гардаг тоо: А (өдөр), Б (сар), В (он).</p>'
  + '<p><span class="tag sum">нийлбэр тоо</span> бусад цэгүүдийн тоог нэмж гаргасан тоо. 22-оос их бол цифрүүдийг нь нэмж багасгана.</p>'
  + '<p>Үсэг: А зүүн орой · Б дээд орой · В баруун орой · Г доод орой · Д төв · Е, Ж, И, З булангууд.</p>'
  + '<p>Тайлбарын төрөл: <b>нэг тооны</b> (бүлэг нэг цэгийн тоог тайлбарлана) · <b>тоо тус бүр</b> (хэд хэдэн цэгийн тоог тус тусад нь) · <b>хослолоор</b> (тоонуудыг хамтад нь нэг утгаар) · <b>нийлбэрээр</b> (цэгүүдийг нэмж гарсан нэг тоог).</p></div>';
const section = (title, html) => {
  n += 1;
  body += `<section><h2>${n}. ${esc(title)}</h2>${html}</section>`;
};
section('Матрицын зураг', '<ul><li>Матрицын гол цэгүүд (цэг бүр утгаараа нэрлэгдсэн)</li><li>Гар зургийн матриц</li></ul>');
section('Одоогийн эрчим', '<ul><li>Одоогийн насны эрчим: товч карт, хэдэн нас хүртэл үргэлжлэх</li><li>Дараагийн эрчим хэдэн наснаас эхлэх</li><li>Хүчтэй эрчмүүд: матрицад хамгийн олон давтагдсан 6 тоо</li></ul>');
section('Гар бичмэлийн тайлбар', '<ul><li>Энэ насны зорилго, үүрэг даалгавар (Д-3 тоо)</li><li>Амин тоо (Д-1), энэ насны эрчим (Д-2), нийлбэр тоо (Д-3): эерэг ба сөрөг тал</li><li>Авьяас: бурхнаас, эхээс, эцгээс өгсөн</li><li>Цэгүүдийн утга: найман цэг ба насаар</li><li>Хамгийн их нөлөөтэй тоо</li></ul>');
CHAPTERS.forEach((part, index) => {
  section(`${ROMAN[index]} · ${part.title}`, part.chapters.map((c, k) => item(`${ROMAN[index]}.${k + 1}`, c.name, c.at, c.asks, contents(c), reads(c))).join(''));
});
const LINKS = [['Тэнгэр газрын холбоос', ['top', 'bottom']], ['Хувь заяаны тэмцэл', ['left', 'right']], ['Эцгийн удмын хувь заяа', ['tl', 'br']],
  ['Эхийн удмын хувь заяа', ['tr', 'bl']], ['Удмын эрчүүд', ['tl', 'tr']], ['Удмын эмэгтэйчүүд', ['br', 'bl']]];
section('X · Зургаан холбоос', LINKS.map(([name, at], k) => item(`X.${k + 1}`, name, at, '',
  ['Үндсэн тоо: мөн чанар · бэлэг · хавх · эхний алхам', 'Дэлгэрэнгүй тоо: далд давхарга'], 'sum',
  [...at.map(howText), `<span class="tag sum">нийлбэр тоо</span> Үндсэн тоо: ${esc(at.map((key) => WHERE[key].split(' (')[0]).join(' + '))}`,
    '<span class="tag sum">нийлбэр тоо</span> Дэлгэрэнгүй тоо: хоёр цэгийн хоорондох бүх тооны нийлбэр'])).join(''));
const PAIRS = [['Амин тоо ба авьяас', ['centre', 'top']], ['Амин тоо ба зан чанар', ['centre', 'left']], ['Амин тоо ба сүнсний зорилго', ['centre', 'right']],
  ['Амин тоо ба сүнсний сорилт', ['centre', 'bottom']], ['Зан чанар ба авьяас', ['left', 'top']], ['Авьяас ба сүнсний зорилго', ['top', 'right']],
  ['Сүнсний зорилго ба сүнсний сорилт', ['right', 'bottom']], ['Зан чанар ба сүнсний сорилт', ['left', 'bottom']], ['Амин тоо ба тохирох хань', ['centre', 'loveMoney.love']],
  ['Сүнсний зорилго ба санхүүгийн суваг', ['right', 'loveMoney.money']]];
section('XI · Гол цэгүүдийн хослол', PAIRS.map(([name, at], k) => item(`XI.${k + 1}`, name, at, '',
  ['Энэ хоёр цэгт зориулсан хослолын тайлбар: хамтдаа · бэлэг · зөрчил · тэнцвэр'], 'combo')).join(''));
body += '<section class="appendix"><h2>Хавсралт · Хосын тайлбарын бүтэц</h2><p class="lead">Хоёр хүний матрицыг байрлал бүрээр нь нэмж бодсон хосын матриц. Эхэнд амин тоогоор тохирол (хайр, гэр бүл, бизнес, нөхөрлөл, мөнгө), дараа нь:</p>';
COUPLE_PARTS.forEach((part, index) => {
  body += `<h3 class="ph">${ROMAN[index]} · ${esc(part.title)}</h3>`;
  body += part.zones.map((z, k) => item(`${ROMAN[index]}.${k + 1}`, z.name, z.at, readText(matrixDir, 'couple', `${z.id}.json`)?.asks ?? '',
    z.id === 'couple-tail' ? ['Гурван тоо тус бүр', 'Гурван тооны хослолын нэр, тайлбар (97 хослол)'] : [],
    z.at.length === 1 ? 'single' : z.id === 'couple-tail' ? 'combo' : 'each', pairHow(z.at))).join('');
});
body += '<p>Төгсгөлд хоёр хүн тус бүрийн хайр, харилцааны онцлог: тохирох хань, харилцааны суваг, бэлгийн энерги.</p></section>';
body += '<section class="appendix"><h2>Хавсралт · Бизнесийн түншлэлийн бүтэц</h2><p class="lead">Нөгөө л хос матрицыг бизнесийн түншлэлийн өнцгөөс уншина. Эхэнд амин тоогоор тохирол, дараа нь:</p>';
BUSINESS_PARTS.forEach((part, index) => {
  body += `<h3 class="ph">${ROMAN[index]} · ${esc(part.title)}</h3>`;
  body += part.zones.map((z, k) => item(`${ROMAN[index]}.${k + 1}`, z.name, z.at, readText(matrixDir, 'business', `${z.id}.json`)?.asks ?? '',
    z.id === 'biz-tail' ? ['Гурван тоо тус бүр', 'Гурван тооны хослолын нэр, тайлбар (97 хослол)'] : [],
    z.at.length === 1 ? 'single' : z.id === 'biz-tail' ? 'combo' : 'each', pairHow(z.at))).join('');
});
body += '</section>';

const html = `<!doctype html><html lang="mn"><head><meta charset="utf-8"><title>Тайлбарын бүтэц</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600&family=Inter:wght@400;600&display=swap">
<style>@page { size: A4; margin: 14mm; } body { margin: 0; color: #232a48; font: 10pt/1.45 Inter, sans-serif; }
h1 { font: 600 26pt "Cormorant Garamond", serif; margin: 0 0 3mm; } .lead { color: #555a70; }
h2 { font: 600 16pt "Cormorant Garamond", serif; border-bottom: 2px solid #b88a2e; padding-bottom: 1.5mm; margin: 6mm 0 2mm; break-after: avoid; }
h3 { font: 600 11.5pt Inter, sans-serif; margin: 0 0 1mm; } .ph { margin: 4mm 0 2mm; color: #8a6420; }
article { display: flex; gap: 4mm; align-items: center; padding: 2mm 0; border-bottom: 1px solid #eee5cf; break-inside: avoid; }
.loc { flex: 0 0 30mm; } .loc svg { width: 30mm; height: auto; display: block; }
.where { margin: 0; font-size: 8.5pt; color: #8a6420; } .ask { margin: 1mm 0; font: italic 11pt "Cormorant Garamond", serif; }
ul { margin: 1mm 0 0; padding-left: 4.5mm; } li { font-size: 9pt; }
ul.how { list-style: none; padding-left: 0; } ul.how li { font-size: 8.5pt; color: #3d4a6e; margin: .4mm 0; }
.tag { display: inline-block; font: 600 7pt Inter, sans-serif; padding: .2mm 1.6mm; border-radius: 1.5mm; margin-right: 1mm; }
.tag.date { background: #e3f1e6; color: #2f6b3d; } .tag.sum { background: #f5ead2; color: #7a5a17; }
.mode { margin: 0 0 .5mm; font: 600 8.5pt Inter, sans-serif; color: #a04a4a; }
.legend { border: 1px solid #e6dcc3; border-radius: 2mm; padding: 2mm 4mm; margin: 2mm 0 4mm; } .legend p { margin: 1mm 0; font-size: 9pt; } .appendix { break-before: page; }</style></head><body>${body}</body></html>`;
const out = join(matrixDir, 'out', 'pdf');
mkdirSync(join(out, 'html'), { recursive: true });
const file = join(out, 'html', 'structure.html');
writeFileSync(file, html);
const pdf = join(out, 'Тайлбарын бүтэц.pdf');
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(existsSync);
execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--no-pdf-header-footer', '--virtual-time-budget=15000', `--print-to-pdf=${pdf}`, pathToFileURL(file).href], { stdio: 'ignore' });
console.log(pdf);
