// Compatibility of two people by their амин тоо (the centre of each
// matrix). Texts: texts/compat/<a>-<b>.json with a ≤ b. The dates live in the
// URL fragment (#d1=YYYY-MM-DD&d2=…), or two numbers can be given directly
// (#a=9&b=16); names are never put in the URL.
import { computeCouple, computeMatrix, isValidDate } from './matrix.js';
import { renderMap } from './draw.js';
import { COUPLE_TAIL_FILES, PAIR_KINDS, coupleParts } from './couple.js';
import { TALENTS } from './talents.js';
import { ROMAN, arcana, dateStamp, esc, wireBook } from './report.js';

const $ = (id) => document.getElementById(id);
const AREAS = [['love', 'Хайр дурлал'], ['family', 'Гэр бүл'], ['business', 'Бизнесийн түнш'], ['friendship', 'Нөхөрлөл'], ['money', 'Мөнгө']];
const paragraphs = (text) => String(text).split(/\n\n+/).map((p) => `<p>${esc(p)}</p>`).join('');
const parseDate = (value) => {
  const match = /^(\d{1,4})-(\d{1,2})-(\d{1,2})$/.exec(value ?? '');
  if (!match) return null;
  const [year, month, day] = match.slice(1).map(Number);
  return isValidDate(year, month, day) ? { year, month, day } : null;
};

function personHtml(n, label, date) {
  return `<div class="compat-person">${arcana(n, true)}<p><small>${esc(label)}${date ? ` · ${dateStamp(date)}` : ''}</small>`
    + `<b>Амин тоо ${n}</b><a href="numbers.html#n=${n}">${esc(TALENTS[n].name)}</a></p></div>`;
}

function resultHtml(text, people) {
  return `<div class="compat-head">${personHtml(...people[0])}<span class="compat-plus">+</span>${personHtml(...people[1])}</div>`
    // names joined with «+», since some names already contain «ба» (14 Тэнцвэр ба урлаг)
    + `<h2>${people.map(([n]) => esc(TALENTS[n].name)).join(' + ')}</h2><p class="motto">${esc(text.headline)}</p>`
    + `<div class="compat-scores">${AREAS.map(([key, title]) => `<div><span>${title}</span><i><b style="width:${(text[key]?.score ?? 0) * 20}%"></b></i><small>${text[key]?.score ?? '–'}/5</small></div>`).join('')}</div>`
    + `<div class="profile-text">${paragraphs(text.overview)}</div>`
    + `<div class="profile-sections">${AREAS.map(([key, title]) => (text[key] ? `<section><h3>${title}</h3>${paragraphs(text[key].text)}</section>` : '')).join('')}</div>`
    + '<div class="fits">'
    + `<div class="fit"><h4>Юу сайн ажилладаг</h4><ul>${text.strengths.map((s) => `<li>${esc(s)}</li>`).join('')}</ul></div>`
    + `<div class="fit"><h4>Хаана мөргөлддөг</h4><ul>${text.tensions.map((s) => `<li>${esc(s)}</li>`).join('')}</ul></div>`
    + '</div>'
    + `<h3>Зөвлөгөө</h3>${paragraphs(text.advice)}`;
}

async function show() {
  const params = new URLSearchParams(location.hash.slice(1));
  const dates = [parseDate(params.get('d1')), parseDate(params.get('d2'))];
  let numbers = [Number(params.get('a')), Number(params.get('b'))];
  if (dates[0] && dates[1]) {
    numbers = dates.map((date) => computeMatrix(date, 'hand').points.centre);
    ['y', 'm', 'd'].forEach((k, i) => {
      $(`${k}1`).value = Object.values(dates[0])[i];
      $(`${k}2`).value = Object.values(dates[1])[i];
    });
  }
  if (!numbers.every((n) => n >= 1 && n <= 22)) {
    $('result').innerHTML = '';
    return;
  }
  const [a, b] = [...numbers].sort((x, y) => x - y);
  const text = await fetch(`texts/compat/${a}-${b}.json`).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  const people = [[numbers[0], $('n1').value || 'Нэгдүгээр хүн', dates[0]], [numbers[1], $('n2').value || 'Хоёрдугаар хүн', dates[1]]];
  $('result').innerHTML = text ? resultHtml(text, people)
    : `<div class="compat-head">${personHtml(...people[0])}<span class="compat-plus">+</span>${personHtml(...people[1])}</div><p class="soft">${a} ба ${b} амин тооны тохирлын тайлбар бичигдэж байна.</p>`;
  if (dates[0] && dates[1]) {
    const method = params.get('m') === 'outer' ? 'outer' : 'all';
    $('result').insertAdjacentHTML('beforeend', await coupleHtml(dates, method, 'couple') + await coupleHtml(dates, method, 'business'));
  }
  document.title = `${a} + ${b} · Хоёр хүний тохирол`;
  $('result').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// The whole two charts added together and read zone by zone, each zone a
// row that opens in a dialog like the chapters of the personal reading.
const pairTexts = {};
const KIND_TEXT = {
  couple: ['Хосын матриц', 'Хосын уншлага', 'Хоёр хүний матрицын байрлал бүрийг хооронд нь нэмж бодсон хосын матриц. Тоо бүр харилцааны нэг талыг уншина.'],
  business: ['Бизнесийн түншлэл', 'Түншлэлийн уншлага', 'Нөгөө л хос матрицыг бизнесийн түншлэлийн өнцгөөс уншина: шийдвэр, мөнгө, үүрэг, эрсдэл, хамтын зорилго.'],
};
async function coupleHtml(dates, method, kind = 'couple') {
  const { ids, dir } = PAIR_KINDS[kind];
  const get = (path) => fetch(path).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  if (!pairTexts[kind]) {
    const texts = Object.fromEntries((await Promise.all(ids.map((id) => get(`texts/${dir}/${id}.json`)))).filter(Boolean).map((f) => [f.id, f]));
    texts.tails = kind === 'couple'
      ? Object.assign({}, ...(await Promise.all(COUPLE_TAIL_FILES.map((f) => get(`texts/couple/tails/${f}.json`)))).map((f) => f?.tails ?? {}))
      : (await get('texts/business/tails.json'))?.tails ?? {};
    pairTexts[kind] = texts;
  }
  const coupleTexts = pairTexts[kind];
  const couple = computeCouple(dates[0], dates[1], method);
  const parts = coupleParts(couple, coupleTexts, kind);
  let rows = '';
  let templates = '';
  parts.forEach((part, i) => {
    rows += `<div class="book-part"><header><span>${ROMAN[i]}</span><b>${esc(part.title)}</b><small>${part.zones.length} бүс</small></header>`;
    for (const zone of part.zones) {
      const ready = Boolean(coupleTexts[zone.id]);
      rows += `<button type="button" class="book-row${ready ? ' ready' : ''}" data-chapter="${zone.id}">${arcana(zone.values[0])}<span class="name">${esc(zone.name)}</span>`
        + `<span class="nums">${[...new Set(zone.values)].join(' · ')}</span><span class="badge">${ready ? 'Унших' : 'Удахгүй'}</span></button>`;
      templates += `<template data-chapter="${zone.id}" data-part="${ROMAN[i]} · ${esc(part.title)}">${zone.html}</template>`;
    }
    rows += '</div>';
  });
  const [heading, readingTitle, about] = KIND_TEXT[kind];
  return `<section class="book couple-book" id="${kind}"><h3>${heading}</h3><p class="soft">${about}</p>`
    + (kind === 'couple' ? `<div class="paper">${renderMap(couple)}</div>` : '')
    + `<h3>${readingTitle}</h3><div class="book-paper">${rows}</div>${templates}`
    + `<dialog class="book-dialog"><header><div><small></small><b>${dateStamp(dates[0])} + ${dateStamp(dates[1])}</b></div>`
    + '<button type="button" class="close" aria-label="Хаах">×</button></header><div class="dlg-body"></div>'
    + '<footer><button type="button" class="close">Хаах</button></footer></dialog></section>';
}
wireBook($('result'));

$('compat-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const dates = [1, 2].map((k) => ({ year: Number($(`y${k}`).value), month: Number($(`m${k}`).value), day: Number($(`d${k}`).value) }));
  if (!dates.every((d) => isValidDate(d.year, d.month, d.day))) {
    $('compat-error').textContent = 'Огноо буруу байна. Хоёр хүний он, сар, өдрийг шалгана уу.';
    $('compat-error').hidden = false;
    return;
  }
  $('compat-error').hidden = true;
  const next = `#d1=${dateStamp(dates[0], '-')}&d2=${dateStamp(dates[1], '-')}`;
  if (location.hash === next) show();
  else location.hash = next;
});

window.addEventListener('hashchange', show);
show();
