// Run with: node --test matrix/matrix.test.mjs
// Every expected number below was read off the source charts in
// G:\Projects\Zurha (the guide's calculator screenshots and the hand-drawn
// chart), except the last test, which is a worked example done by hand.
import test from 'node:test';
import assert from 'node:assert/strict';
import { computeMatrix, formula, isValidDate, reduce, ringLabel, ringPointAt } from './matrix.js';

const lineOf = (m, key, ...fields) => fields.map((field) => m.lines[key][field]);

test('reduce sums digits until the number is 22 or less', () => {
  assert.equal(reduce(22), 22);
  assert.equal(reduce(23), 5);
  assert.equal(reduce(38), 11);
  assert.equal(reduce(1989), 9);
});

test('formula shows the raw sum and its reduction', () => {
  assert.equal(formula(14, 1), '14 + 1 = 15');
  assert.equal(formula(15, 3, 9), '15 + 3 + 9 = 27 → 9');
});

test('isValidDate rejects impossible dates', () => {
  assert.ok(isValidDate(1989, 3, 15));
  assert.ok(isValidDate(2020, 2, 29));
  assert.ok(!isValidDate(2021, 2, 29));
  assert.ok(!isValidDate(1989, 13, 1));
  assert.ok(!isValidDate(1989, 3, 0));
});

test('guide variant matches the calculator screenshots (day 11 or 29, June, year sum 18)', () => {
  const m = computeMatrix({ year: 1980, month: 6, day: 29 }, 'guide');
  assert.deepEqual(m.points, { left: 11, top: 6, right: 18, bottom: 8, centre: 7, tl: 17, tr: 6, br: 8, bl: 19 });
  assert.deepEqual(lineOf(m, 'left', 'outer', 'mid', 'inner', 'heart'), [11, 11, 18, 7]);
  assert.deepEqual(lineOf(m, 'top', 'outer', 'mid', 'inner', 'heart'), [6, 19, 13, 20]);
  assert.deepEqual(lineOf(m, 'right', 'outer', 'mid', 'inner'), [18, 7, 7]);
  assert.deepEqual(lineOf(m, 'bottom', 'outer', 'mid', 'inner'), [8, 5, 15]);
  assert.deepEqual([m.familyCentre, m.innerPower], [5, 12]);
  assert.deepEqual(lineOf(m, 'tl', 'outer', 'mid', 'inner'), [17, 12, 22]);
  assert.deepEqual(lineOf(m, 'tr', 'outer', 'mid', 'inner'), [6, 17, 11]);
  assert.deepEqual(lineOf(m, 'br', 'outer', 'mid', 'inner'), [8, 21, 13]);
  assert.deepEqual(lineOf(m, 'bl', 'outer', 'mid', 'inner'), [19, 7, 6]);
  assert.deepEqual(m.loveMoney, { love: 10, mid: 22, money: 11 });
  assert.deepEqual(m.health.map((row) => [row.physics, row.energy, row.emotions]), [
    [11, 6, 17], [11, 19, 3], [18, 13, 4], [7, 20, 9], [7, 7, 14], [7, 15, 22], [18, 8, 8], [16, 16, 14],
  ]);
  assert.equal(m.ring[0].points[0], 5);
  assert.deepEqual(m.ring[1].points, [12, 22, 9, 5, 16, 11, 17]);
  assert.deepEqual(m.ring[2].points.slice(0, 2), [6, 18]);
  assert.equal(m.ring[5].points[6], 14);
  assert.deepEqual(m.ring[6].points.slice(0, 2), [7, 17]);
  assert.deepEqual(m.ring[7].points.slice(5), [14, 7]);
});

test('hand variant matches the hand-drawn chart', () => {
  const m = computeMatrix({ year: 2020, month: 1, day: 14 }, 'hand');
  assert.deepEqual(m.points, { left: 14, top: 1, right: 4, bottom: 19, centre: 11, tl: 15, tr: 5, br: 5, bl: 6 });
  const all = ['outer', 'mid', 'inner', 'step1', 'step2', 'step3'];
  assert.deepEqual(lineOf(m, 'left', ...all), [14, 21, 7, 7, 18, 11]);
  assert.deepEqual(lineOf(m, 'top', ...all), [1, 13, 12, 17, 5, 16]);
  assert.deepEqual(lineOf(m, 'right', ...all), [4, 19, 15, 5, 8, 19]);
  assert.deepEqual(lineOf(m, 'bottom', ...all), [19, 22, 3, 17, 14, 7]);
  assert.deepEqual(lineOf(m, 'tl', ...all), [15, 5, 8, 9, 19, 3]);
  assert.deepEqual(lineOf(m, 'tr', ...all), [5, 21, 16, 7, 9, 20]);
  assert.deepEqual(lineOf(m, 'bl', ...all), [6, 5, 17, 9, 10, 21]);
  // the love and money midpoint (18) sits where the bottom-right line's first step would be
  assert.deepEqual(lineOf(m, 'br', ...all), [5, 21, 16, null, 9, 20]);
  assert.deepEqual(m.loveMoney, { love: 21, mid: 18, money: 6 });
  assert.deepEqual(m.ring.map((decade) => decade.points), [
    [21, 7, 18, 11, 19, 8, 5],
    [19, 4, 20, 16, 6, 17, 18],
    [8, 7, 13, 6, 17, 11, 16],
    [19, 14, 5, 9, 22, 13, 17],
    [17, 13, 22, 9, 5, 14, 19],
    [16, 11, 17, 6, 13, 7, 8],
    [9, 8, 15, 7, 20, 13, 19],
    [14, 8, 10, 20, 9, 7, 21],
  ]);
  const p = m.purposes;
  assert.deepEqual([p.sky, p.earth, p.personal], [20, 18, 11]);
  assert.deepEqual([p.father, p.mother, p.social], [20, 11, 4]);
  assert.equal(p.spiritual, 15);
});

test('ring labels and age lookup follow the calculator', () => {
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6].map((k) => ringLabel(10, k)),
    ['11-12,5', '12,5-13,5', '13,5-14', '15', '16-17,5', '17,5-18,5', '18,5-19']);
  const m = computeMatrix({ year: 1980, month: 6, day: 29 }, 'guide');
  assert.deepEqual(ringPointAt(m, 15), { label: '15', value: 5 });
  assert.deepEqual(ringPointAt(m, 12.6), { label: '12,5-13,5', value: 22 });
  assert.deepEqual(ringPointAt(m, 20.3), { label: '20', value: 6 });
  assert.deepEqual(ringPointAt(m, 19.8), { label: '20', value: 6 });
});

test('worked example: 15 March 1989', () => {
  for (const variant of ['hand', 'guide']) {
    const m = computeMatrix({ year: 1989, month: 3, day: 15 }, variant);
    assert.deepEqual(m.points, { left: 15, top: 3, right: 9, bottom: 9, centre: 9, tl: 18, tr: 12, br: 18, bl: 6 });
    assert.deepEqual(lineOf(m, 'left', 'mid', 'inner'), [21, 6]);
    assert.deepEqual(lineOf(m, 'tr', 'mid', 'inner'), [6, 21]);
    assert.deepEqual(m.loveMoney, { love: 9, mid: 9, money: 9 });
    assert.deepEqual([m.purposes.sky, m.purposes.earth, m.purposes.personal], [12, 6, 18]);
    assert.deepEqual([m.purposes.father, m.purposes.mother, m.purposes.social, m.purposes.spiritual], [9, 18, 9, 9]);
  }
});

test('life purpose is Д-3 = Д-1 + Д-2 (user chart for 23 July 1987)', () => {
  for (const variant of ['hand', 'guide']) {
    const m = computeMatrix({ year: 1987, month: 7, day: 23 }, variant);
    const p = m.points;
    assert.deepEqual([p.left, p.top, p.right, p.bottom, p.centre], [5, 7, 7, 19, 11]);
    assert.deepEqual([p.bl, p.tl, p.tr, p.br], [6, 12, 14, 8]);
    // Д-1 = 11, Д-2 = 6 + 12 + 14 + 8 = 40 → 4, Д-3 = 11 + 4 = 15
    assert.equal(m.purposes.life, 15);
  }
  assert.equal(computeMatrix({ year: 1987, month: 7, day: 23 }, 'guide').innerPower, 15);
});

test('the most repeated of the 108 numbers is the most influential (23 July 1987: 11, 12 times)', () => {
  const { dominant } = computeMatrix({ year: 1987, month: 7, day: 23 }, 'hand');
  assert.deepEqual(dominant, { values: [11], count: 12, total: 108 });
});

test('the base number of each link is its two points added (23 July 1987)', () => {
  for (const variant of ['hand', 'guide']) {
    const m = computeMatrix({ year: 1987, month: 7, day: 23 }, variant);
    const pair = (link) => [...link.values, link.sum, link.value];
    assert.deepEqual(pair(m.skyEarth), [7, 19, 26, 8]); // Б + Г
    assert.deepEqual(pair(m.fate), [5, 7, 12, 12]); // А + В
    assert.deepEqual(pair(m.fatherLine), [12, 8, 20, 20]); // Е + И
    assert.deepEqual(pair(m.motherLine), [14, 6, 20, 20]); // Ж + З
    assert.deepEqual(pair(m.familyMen), [12, 14, 26, 8]); // Е + Ж
    assert.deepEqual(pair(m.familyWomen), [8, 6, 14, 14]); // И + З
  }
});

test('the detailed number of each link adds every number between its two points (23 July 1987)', () => {
  const m = computeMatrix({ year: 1987, month: 7, day: 23 }, 'hand');
  const detail = (link) => [link.detail.sum, link.detail.value, link.detail.values.length];
  assert.deepEqual(detail(m.skyEarth), [169, 16, 13]);
  assert.deepEqual(m.skyEarth.detail.values, [7, 7, 18, 11, 11, 22, 11, 7, 14, 17, 3, 22, 19]);
  assert.deepEqual(detail(m.fate), [165, 12, 13]);
  assert.deepEqual(detail(m.fatherLine), [165, 12, 13]); // the angel's 21 on the И half
  assert.deepEqual(detail(m.motherLine), [157, 13, 13]);
  assert.deepEqual(detail(m.familyMen), [150, 6, 11]);
  assert.deepEqual(m.familyMen.detail.values, [12, 16, 4, 5, 19, 18, 21, 11, 8, 22, 14]);
  assert.deepEqual(detail(m.familyWomen), [117, 9, 11]);
  assert.equal(computeMatrix({ year: 1987, month: 7, day: 23 }, 'guide').skyEarth.detail, undefined);
});
