// Compatibility of two people by their амин тоо (the centre of each
// matrix). Texts: texts/compat/<a>-<b>.json with a ≤ b. The dates live in the
// URL fragment (#d1=YYYY-MM-DD&d2=…), or two numbers can be given directly
// (#a=9&b=16); names are never put in the URL.
import { computeMatrix, isValidDate } from './matrix.js';
import { TALENTS } from './talents.js';
import { ROMAN, arcana, dateStamp, esc } from './report.js';

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
  document.title = `${a} + ${b} · Хоёр хүний тохирол`;
  $('result').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

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
