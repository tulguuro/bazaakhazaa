// The 22 energies page: a grid of the 22 cards and, for the chosen number,
// everything the site has written about it (texts/by-number/<n>.json, built
// by tools/build_number_pages.mjs).
import { TALENTS } from './talents.js';
import { FIELDS, ROMAN, TAIL_FIELDS, arcana, esc, longHtml, shortTable } from './report.js';

const $ = (id) => document.getElementById(id);
const SECTIONS = [
  ['character', 'Зан чанар'], ['love', 'Хайр дурлал'], ['family', 'Гэр бүл'], ['friends', 'Найз нөхөд'],
  ['work', 'Ажил мэргэжил'], ['money', 'Мөнгө'], ['business', 'Бизнесийн түнш'], ['health', 'Эрүүл мэнд ба эрч хүч'],
  ['shadow', 'Сөрөг тал'], ['advice', 'Зөвлөгөө'],
];
const SCORES = [['love', 'Хайр'], ['family', 'Гэр бүл'], ['business', 'Бизнес'], ['friendship', 'Найз'], ['money', 'Мөнгө']];
const LINK_FIELDS = [['essence', 'Мөн чанар'], ['gift', 'Бэлэг'], ['trap', 'Хавх'], ['step', 'Эхний алхам']];

const paragraphs = (text) => String(text).split(/\n\n+/).map((p) => `<p>${esc(p)}</p>`).join('');
const dots = (score) => '●'.repeat(score) + '○'.repeat(5 - score);

function gridHtml(current) {
  return Array.from({ length: 22 }, (_, k) => k + 1).map((n) =>
    `<a class="energy-tile${n === current ? ' current' : ''}" href="#n=${n}" aria-label="${n} · ${esc(TALENTS[n].name)}">`
    + `${arcana(n)}<span><b>${n}</b>${esc(TALENTS[n].name)}</span></a>`).join('');
}

function listCards(profile) {
  const card = (title, body) => `<div class="fit"><h4>${title}</h4>${body}</div>`;
  const items = (list) => `<ul>${list.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`;
  const why = (list, key) => `<ul>${list.map((x) => `<li><b>${esc(x[key])}</b><small>${esc(x.why)}</small></li>`).join('')}</ul>`;
  return '<div class="fits">'
    + card('Тохирох мэргэжил', items(profile.professions))
    + card('Өнгө', why(profile.colors, 'color'))
    + card('Тэжээвэр амьтан', why(profile.pets, 'animal'))
    + card('Машин', `<ul><li><b>${esc(profile.car.style)}</b><small>${esc(profile.car.why)}</small></li></ul>`)
    + card('Хобби', items(profile.hobbies))
    + card('Тав тухтай газар', items(profile.places))
    + '</div>';
}

function chaptersHtml(page) {
  let out = '<h3>Матрицын байрлал бүрт</h3><p class="soft">Энэ тоо таны матрицын аль цэг дээр байгаагаас хамаарч өөр өөр утгатай. Бүлэг дээр дарж уншаарай.</p>';
  for (const part of page.parts) {
    out += `<h4 class="part">${ROMAN[part.index]} · ${esc(part.title)}</h4>`;
    for (const c of part.chapters) {
      out += `<details class="energy chapter-read"><summary><span>${esc(c.name)}</span></summary>`
        + `<dl class="dlg-meta"><dt>Энэ тоо хаанаас гардаг</dt><dd>${esc(c.source)}</dd><dt>Энэ байрлал асуудаг</dt><dd>${esc(c.asks)}</dd></dl>`
        + `${c.short ? shortTable(c.short, FIELDS) : ''}${longHtml(c.long)}</details>`;
    }
  }
  return out;
}

function tailsHtml(page) {
  if (!page.tails.length) return '';
  return `<h3>Энэ тоо орсон үйлийн үрийн сүүл</h3>${page.tails.map((t) =>
    `<details class="energy chapter-read"><summary><b>${esc(t.code)}</b><span>${esc(t.name)}</span></summary>${shortTable(t, TAIL_FIELDS)}${longHtml(t.long)}</details>`).join('')}`;
}

function linksHtml(page) {
  if (!page.links.length) return '';
  return `<h3>Зургаан холбоос дээр</h3>${page.links.map((l) =>
    `<details class="energy chapter-read"><summary><span>${esc(l.name)}</span></summary><p class="soft">${esc(l.about)}</p>`
    + `${shortTable(l, LINK_FIELDS)}<p><b>Дэлгэрэнгүй тоо болбол:</b> ${esc(l.deeper)}</p></details>`).join('')}`;
}

function compatHtml(page) {
  if (!page.compat.length) return '';
  const rows = [...page.compat].sort((x, y) => (y.scores.love ?? 0) - (x.scores.love ?? 0));
  return `<h3>Амин тоогоор тохирол</h3><p class="soft">Таны амин тоо ${page.n} бол бусад амин тоотой хүнтэй хэр тохирох вэ.</p>`
    + `<div class="table-wrap"><table class="compat-table"><thead><tr><th>Амин тоо</th>${SCORES.map(([, t]) => `<th>${t}</th>`).join('')}</tr></thead><tbody>`
    + rows.map((r) => `<tr><td><a href="compat.html#a=${page.n}&b=${r.other}">${r.other} · ${esc(TALENTS[r.other].name)}</a><small>${esc(r.headline)}</small></td>`
      + SCORES.map(([k]) => `<td class="dots" title="${r.scores[k]}/5">${r.scores[k] ? dots(r.scores[k]) : ''}</td>`).join('') + '</tr>').join('')
    + '</tbody></table></div>';
}

function pairsHtml(page) {
  if (!page.pairs.length) return '';
  return '<h3>Нэг матрицад өөр эрчимтэй хамт</h3><p class="soft">Таны матрицад энэ тоо өөр тоотой хамт гарвал хоёр эрчим хэрхэн хамт ажилладаг вэ.</p>'
    + page.pairs.map((p) => `<details class="energy chapter-read"><summary><b>${page.n} + ${p.other}</b><span>${esc(TALENTS[p.other].name)}</span></summary>`
      + `<p>${esc(p.together)}</p><table class="short"><tr><th>Бэлэг</th><td>${esc(p.gift)}</td></tr><tr><th>Зөрчил</th><td>${esc(p.tension)}</td></tr><tr><th>Тэнцвэр</th><td>${esc(p.balance)}</td></tr></table></details>`).join('');
}

function profileHtml(page) {
  const p = page.profile;
  if (!p) return `<p class="soft">${page.n}-ийн танилцуулга бичигдэж байна.</p>`;
  return `<div class="profile-hero">${arcana(page.n, true)}<div><p class="kicker">${ROMAN[page.n - 1]} · ${esc(p.archetype)}</p>`
    + `<h2>${page.n} · ${esc(p.name)}</h2><p class="motto">${esc(p.motto)}</p>`
    + `<ul class="chips">${p.keywords.map((k) => `<li>${esc(k)}</li>`).join('')}</ul></div></div>`
    + `<div class="profile-text">${paragraphs(p.overview)}</div>`
    + `<div class="profile-sections">${SECTIONS.map(([key, title]) => (p.sections[key] ? `<section><h3>${title}</h3>${paragraphs(p.sections[key])}</section>` : '')).join('')}</div>`
    + `<h3>Танд тохирох зүйлс</h3>${listCards(p)}`
    + compatHtml(page) + chaptersHtml(page) + tailsHtml(page) + linksHtml(page) + pairsHtml(page);
}

async function show() {
  const n = Number(new URLSearchParams(location.hash.slice(1)).get('n'));
  $('grid').innerHTML = gridHtml(n);
  if (!(n >= 1 && n <= 22)) {
    $('profile').innerHTML = '';
    document.title = '22 эрчим';
    return;
  }
  $('profile').innerHTML = '<p class="soft">Ачаалж байна…</p>';
  const page = await fetch(`texts/by-number/${n}.json`).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  $('profile').innerHTML = page ? profileHtml(page) : '<p class="soft">Энэ тооны мэдээлэл олдсонгүй.</p>';
  document.title = `${n} · ${TALENTS[n].name} · 22 эрчим`;
  $('profile').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

window.addEventListener('hashchange', show);
show();
