// The reading of a couple matrix (computeCouple in matrix.js): eighteen zones
// of the relationship, each read from one or more positions of the summed
// chart. Texts: matrix/texts/couple/<id>.json, one entry per energy with
// essence, gift, trap, step and a longer paragraph (more).
import { TALENTS } from './talents.js';
import { arcana, chapterValues, esc, locatorHtml, whereHtml } from './report.js';

export const COUPLE_PARTS = [
  { title: 'Хосын мөн чанар', zones: [
    { id: 'couple-centre', name: 'Хосын уур амьсгал', at: ['centre'] },
    { id: 'couple-why', name: 'Яагаад учирсан бэ', at: ['left', 'top'] },
    { id: 'couple-image', name: 'Бусдад харагдах байдал', at: ['left'] },
    { id: 'couple-resources', name: 'Хосын нөөц, авьяас', at: ['top'] },
  ] },
  { title: 'Сургамж ба сорилт', zones: [
    { id: 'couple-lesson', name: 'Хосын гол сургамж', at: ['bottom'] },
    { id: 'couple-trouble', name: 'Бэрхшээл, сорилт', at: ['right', 'bottom'] },
    { id: 'couple-tail', name: 'Хосын үйлийн үрийн сүүл', at: ['bottom', 'bottom.mid', 'bottom.inner'] },
    { id: 'couple-hold', name: 'Холбоог юу барьж байдаг вэ', at: ['tl'] },
    { id: 'couple-risk', name: 'Харилцааг юу эвдэж болох вэ', at: ['tr'] },
  ] },
  { title: 'Хайр ба харилцаа', zones: [
    { id: 'couple-channel', name: 'Харилцааны суваг', at: ['bottom.inner', 'loveMoney.mid', 'loveMoney.love'] },
    { id: 'couple-parents', name: 'Эцэг эх болохдоо', at: ['left.inner', 'left.mid'] },
  ] },
  { title: 'Мөнгө ба гэр орон', zones: [
    { id: 'couple-material', name: 'Эд хөрөнгө, гэр орон', at: ['right'] },
    { id: 'couple-money-feelings', name: 'Мөнгө ба мэдрэмж', at: ['loveMoney.mid'] },
    { id: 'couple-money', name: 'Хосын мөнгөний суваг', at: ['right.inner', 'loveMoney.money'] },
  ] },
  { title: 'Удам ба зорилго', zones: [
    { id: 'couple-lines', name: 'Хоёр удмын хөтөлбөр', at: ['purposes.father', 'purposes.mother'] },
    { id: 'couple-purpose-personal', name: 'Хосын хувийн зорилго', at: ['purposes.personal'] },
    { id: 'couple-purpose-social', name: 'Хосын нийгмийн зорилго', at: ['purposes.social'] },
    { id: 'couple-purpose-spiritual', name: 'Хосын сүнслэг зорилго', at: ['purposes.spiritual'] },
  ] },
];
export const COUPLE_ZONE_IDS = COUPLE_PARTS.flatMap((part) => part.zones.map((zone) => zone.id));

// The same pair matrix read for business partners (texts/business/<id>.json).
export const BUSINESS_PARTS = [
  { title: 'Түншлэлийн мөн чанар', zones: [
    { id: 'biz-centre', name: 'Түншлэлийн уур амьсгал', at: ['centre'] },
    { id: 'biz-why', name: 'Яагаад хамтарсан бэ', at: ['left', 'top'] },
    { id: 'biz-image', name: 'Зах зээлд харагдах байдал', at: ['left'] },
    { id: 'biz-resources', name: 'Хамтын нөөц, давуу тал', at: ['top'] },
  ] },
  { title: 'Сургамж ба эрсдэл', zones: [
    { id: 'biz-lesson', name: 'Түншлэлийн гол сургамж', at: ['bottom'] },
    { id: 'biz-trouble', name: 'Бэрхшээл, эрсдэл', at: ['right', 'bottom'] },
    { id: 'biz-tail', name: 'Түншлэлийн хуучин хэв маяг', at: ['bottom', 'bottom.mid', 'bottom.inner'] },
    { id: 'biz-hold', name: 'Түншлэлийг юу барьдаг вэ', at: ['tl'] },
    { id: 'biz-risk', name: 'Түншлэлийг юу эвдэж болох вэ', at: ['tr'] },
  ] },
  { title: 'Хамтын ажил ба баг', zones: [
    { id: 'biz-channel', name: 'Хамтран ажиллах суваг', at: ['bottom.inner', 'loveMoney.mid', 'loveMoney.love'] },
    { id: 'biz-team', name: 'Баг, ажилчдаа удирдах нь', at: ['left.inner', 'left.mid'] },
  ] },
  { title: 'Мөнгө ба хөрөнгө', zones: [
    { id: 'biz-material', name: 'Хөрөнгө, бизнесийн суурь', at: ['right'] },
    { id: 'biz-money-trust', name: 'Мөнгө ба итгэлцэл', at: ['loveMoney.mid'] },
    { id: 'biz-money', name: 'Хамтын орлогын суваг', at: ['right.inner', 'loveMoney.money'] },
  ] },
  { title: 'Хамтын зорилго', zones: [
    { id: 'biz-purpose-personal', name: 'Хамтын бизнесийн зорилго', at: ['purposes.personal'] },
    { id: 'biz-purpose-social', name: 'Нийгэмд үзүүлэх нөлөө', at: ['purposes.social'] },
    { id: 'biz-purpose-spiritual', name: 'Түншлэлийн өндөр зорилго', at: ['purposes.spiritual'] },
  ] },
];
export const BUSINESS_ZONE_IDS = BUSINESS_PARTS.flatMap((part) => part.zones.map((zone) => zone.id));
export const PAIR_KINDS = { couple: { parts: COUPLE_PARTS, ids: COUPLE_ZONE_IDS, dir: 'couple' }, business: { parts: BUSINESS_PARTS, ids: BUSINESS_ZONE_IDS, dir: 'business' } };

// where each position sits on the couple chart, shown above its card
const WHERE = {
  centre: 'Төв', left: 'Зүүн орой', top: 'Дээд орой', right: 'Баруун орой', bottom: 'Доод орой',
  tl: 'Зүүн дээд булан', tr: 'Баруун дээд булан', 'bottom.mid': 'Доод шугамын дунд тоо', 'bottom.inner': 'Доод шугамын дотор тоо',
  'loveMoney.mid': 'Хайр, мөнгөний уулзвар', 'loveMoney.love': 'Хайрын цэг', 'loveMoney.money': 'Мөнгөний цэг',
  'right.inner': 'Баруун шугамын дотор тоо', 'left.inner': 'Зүүн шугамын дотор тоо', 'left.mid': 'Зүүн шугамын дунд тоо',
  'purposes.father': 'Эцгийн удмын шугам', 'purposes.mother': 'Эхийн удмын шугам',
  'purposes.personal': 'Хувийн зорилго', 'purposes.social': 'Нийгмийн зорилго', 'purposes.spiritual': 'Сүнслэг зорилго',
};
const FIELDS = [['essence', 'Мөн чанар'], ['gift', 'Бэлэг'], ['trap', 'Сул тал'], ['step', 'Зөвлөгөө']];
const TAIL_FIELDS = [['now', 'Өнөөдөр'], ['trap', 'Сул тал'], ['key', 'Түлхүүр'], ['step', 'Зөвлөгөө']];
// files of texts/couple/tails/ holding the 97 three-number couple tails
export const COUPLE_TAIL_FILES = ['part1', 'part2'];

// One zone opened: its title and question, then a card per number.
export function coupleZoneHtml(couple, zone, file, tails = null) {
  const values = chapterValues(couple, zone.at);
  const many = zone.at.length > 1;
  let out = `<h3 class="dlg-title">${esc(file?.name ?? zone.name)}</h3>${locatorHtml(couple, zone.at, `<dd class="ask">${esc(file?.asks ?? '')}</dd>`)}`;
  // the couple's karmic tail is also read as one three-number scenario
  if (zone.id === 'couple-tail' || zone.id === 'biz-tail') {
    const key = [...values].reverse().join('-');
    const combo = tails?.[key];
    if (combo) {
      out += `<div class="dlg-pairs"><h4>Гурван тоо хамтдаа · ${key}</h4><div class="pair"><h5>${esc(combo.name)}</h5><p>${esc(combo.story)}</p>`
        + `<table class="short">${TAIL_FIELDS.map(([k, label]) => `<tr><th>${label}</th><td>${esc(combo[k])}</td></tr>`).join('')}</table></div></div>`;
    }
  }
  const seen = new Set();
  values.forEach((n, k) => {
    if (!n || seen.has(n)) return;
    seen.add(n);
    const entry = file?.texts?.[n];
    out += `${many ? whereHtml(couple, [zone.at[k]], WHERE[zone.at[k]] ?? '') : ''}<div class="dlg-card">${arcana(n, true)}<div><h4>${n} · ${esc(TALENTS[n].name)}</h4>`
      + (entry ? `<table class="short">${FIELDS.map(([key, label]) => (entry[key] ? `<tr><th>${label}</th><td>${esc(entry[key])}</td></tr>` : '')).join('')}</table>` : `<p>${esc(TALENTS[n].text)}</p>`)
      + `</div></div>${entry?.more ? `<div class="dlg-long"><p class="lead">${esc(entry.more)}</p></div>` : ''}`;
  });
  return out;
}

// Every part with its zones, in order, for print or for a dialog list.
export function coupleParts(couple, texts, kind = 'couple') {
  return PAIR_KINDS[kind].parts.map((part) => ({
    title: part.title,
    zones: part.zones.map((zone) => ({ id: zone.id, name: texts?.[zone.id]?.name ?? zone.name, values: chapterValues(couple, zone.at), html: coupleZoneHtml(couple, zone, texts?.[zone.id], texts?.tails) })),
  }));
}
