// Print the main matrix numbers of a famous person, for writing their card.
// Usage: node tools/famous_numbers.mjs 1878-12-18 [1953-03-05]
// The second date (death) adds the energy of the age they died at.
import { computeMatrix, ringPointAt } from '../matrix/matrix.js';
import { TALENTS } from '../matrix/talents.js';

const parse = (s) => {
  const [year, month, day] = s.split('-').map(Number);
  return { year, month, day };
};
const [born, died] = process.argv.slice(2).map(parse);
const guide = computeMatrix(born, 'guide');
const name = (n) => `${n} ${TALENTS[n].name}`;
const p = guide.points;
const rows = {
  'Тав тухын бүс (төв)': name(p.centre),
  'Зан чанар (зүүн орой)': name(p.left),
  'Авьяас (дээд орой)': name(p.top),
  'Сүнсний зорилго, мөнгө (баруун орой)': name(p.right),
  'Сүнсний сорилт (доод орой)': name(p.bottom),
  'Үйлийн үрийн сүүл': [p.bottom, guide.lines.bottom.mid, guide.lines.bottom.inner].join('-'),
  'Хувийн зорилго': name(guide.purposes.personal),
  'Нийгмийн зорилго': name(guide.purposes.social),
  'Сүнслэг зорилго': name(guide.purposes.spiritual),
  'Хайрын цэг': name(guide.loveMoney.love),
  'Мөнгөний цэг': name(guide.loveMoney.money),
};
if (died) {
  const before = (died.month < born.month || (died.month === born.month && died.day < born.day)) ? 1 : 0;
  const age = died.year - born.year - before;
  const at = ringPointAt(guide, age);
  rows[`Нас барсан нас ${age}, насны эрчим (${at.label})`] = name(at.value);
}
for (const [k, v] of Object.entries(rows)) console.log(`${k}: ${v}`);
