// The animated matrix site, as a working mock-up. An intro film (a light
// leaves the stars, reaches the Earth, the steppe and a ger, and the toono
// turns into the matrix), then the birth form, the numbers arriving, the
// amin too formed out of stars and the journey through the matrix, where
// every stop opens its chapters.
// A second birth date opens the couple matrix and its own journey.
//
// For checking a single frame: ?t=12 holds the intro at 12 seconds, ?skip
// starts at the form, ?demo=1990-01-01,male sends the form by itself and
// &stage=amin or &stage=journey jumps on; &pair=1992-02-02 adds a second person.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { AROUND, computeCouple, computeMatrix, isValidDate, reduce } from '../matrix.js';
import { POINT_AGES, POINT_MEANINGS } from '../draw.js';
import { CHAPTERS } from '../chapters.js';
import {
  FIELDS, LINKS, LINK_FIELDS, LINK_POINTS, PAIR_ROWS, PAIR_ROWS_BY_CONTEXT, POINT_NAMES, POINT_PAIRS, TAIL_FIELDS,
  currentAge, nextAge, pairContextFile, pairName,
} from '../report.js';
import { TALENTS } from '../talents.js';
import {
  COUPLE_PARTS, COUPLE_TAIL_FILES, COUPLE_ZONE_IDS, FIELDS as COUPLE_FIELDS, TAIL_FIELDS as COUPLE_TAIL_FIELDS, WHERE as COUPLE_WHERE,
} from '../couple.js';
import { createWorld } from './world.js';
import { REVEAL_T, createMatrix } from './matrix3d.js';
import { easeIn, easeInOut, easeOut, lerp, seg, smooth } from './gfx.js';

const $ = (id) => document.getElementById(id);
const query = new URLSearchParams(location.search);
const V = (x, y, z) => new THREE.Vector3(x, y, z);

const renderer = new THREE.WebGLRenderer({ canvas: $('scene'), antialias: true, powerPreference: 'high-performance' });
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const loader = new THREE.TextureLoader();
const [skyMap, day, clouds] = await Promise.all([
  loader.loadAsync('../../assets/sky_4k.jpg'),
  loader.loadAsync('../../assets/2k_earth_daymap.jpg'),
  loader.loadAsync('../../assets/2k_earth_clouds.jpg'),
  document.fonts.load('600 40px "Cormorant Garamond"'),
  document.fonts.load('500 40px Inter'),
  document.fonts.load('600 40px Inter'),
]);
const world = createWorld(skyMap, { day, clouds });
const { scene, camera } = world;
const matrix = createMatrix();
scene.add(matrix.group);

const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 }));
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.8, 0.75, 0.8);
composer.addPass(bloom);
composer.addPass(new OutputPass());

let W = 1; let H = 1; let proj = 600;
function resize() {
  W = window.innerWidth; H = window.innerHeight;
  const ratio = Math.min(window.devicePixelRatio, 2);
  renderer.setPixelRatio(ratio);
  renderer.setSize(W, H, false);
  composer.setPixelRatio(ratio);
  composer.setSize(W, H);
  camera.aspect = W / H;
  camera.updateProjectionMatrix();
  proj = (H * ratio) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
  world.starMat.uniforms.uPx.value = ratio;
  world.tailMat.uniforms.uProj.value = proj;
}
window.addEventListener('resize', resize);
resize();

// how far the camera stands so the matrix fits above `bottom` pixels of text
function fitDistance(bottom) {
  const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const need = 9.7;
  const free = Math.max(H - bottom, H * 0.3);
  return Math.max((need / (2 * tan)) * (H / free), need / (2 * tan * camera.aspect));
}

// ── the intro, as a function of time so any moment can be shown on its own
const T = { leave: 3, hit: 10.2, ger: 17, end: 25.2 };
const STAR = V(-95, 72, -230);
const CAM_SPACE = V(12, -10, -60);
const HIT = world.earth.position.clone().add(
  CAM_SPACE.clone().sub(world.earth.position).add(V(-22, 24, 0)).normalize().multiplyScalar(world.EARTH_R));
const BEND = V(-30, 40, -130);
// the light comes down over Mongolia
world.aimEarth(47, 104, HIT.clone().sub(world.earth.position));
const FALL_FROM = V(-90, 60, -160);
const ABOVE_TOONO = V(0, 5.2, 0);

function lightAt(t) {
  if (t < T.hit) {
    const k = seg(t, T.leave, T.hit) ** 2.2;
    return STAR.clone().multiplyScalar((1 - k) ** 2).addScaledVector(BEND, 2 * (1 - k) * k).addScaledVector(HIT, k * k);
  }
  if (t < T.ger) {
    const t0 = Math.max(t, T.hit + 0.3);
    const k = easeOut(seg(t0, T.hit + 0.3, 14.6));
    const p = FALL_FROM.clone().lerp(ABOVE_TOONO, k);
    p.x += Math.sin(k * Math.PI) * 14;
    const d = seg(t0, 14.6, 16.3);
    const a = (t0 - 14.6) * 5.5;
    p.x += Math.cos(a) * 0.95 * (1 - d) * seg(t0, 14.6, 15);
    p.z += Math.sin(a) * 0.95 * (1 - d) * seg(t0, 14.6, 15);
    p.y = lerp(p.y, 2.5, easeInOut(d));
    return p;
  }
  return V(0, 0, lerp(-7, 0.2, easeOut(seg(t, T.ger, 18.6))));
}
// the light now and where it was, for its tail, kept inside one shot
function lightTrail(t, from) {
  return Array.from({ length: world.light.TAIL }, (_, i) => lightAt(Math.max(from, t - i * 0.022)));
}

const CAPTIONS = [
  [0.8, 4.4, 'Тэнгэрт нэг гэрэл хөдөллөө.'],
  [5.2, 9.4, 'Тэр гэрэл дэлхийг зорив.'],
  [11.2, 14.4, 'Монгол нутаг. Нэгэн гэрийн тооно.'],
  [18, 21, 'Тооноор тэнгэр харагдана.'],
  [21.6, 25, 'Тооно таны матриц болон хувирна.'],
];
const caption = $('caption');
const veil = $('veil');
let captionText = '';

function introAt(t) {
  const shot = t < T.hit ? 'space' : t < T.ger ? 'steppe' : 'ger';
  world.space.visible = shot === 'space';
  world.steppe.visible = shot === 'steppe';
  scene.fog = shot === 'steppe' ? world.fog : null;
  camera.clearViewOffset();

  if (shot === 'space') {
    const k = easeInOut(seg(t, 2.5, T.hit));
    camera.position.copy(V(0, 0, 0).lerp(CAM_SPACE, k));
    const light = lightAt(t);
    camera.lookAt(light.clone().lerp(HIT, 0.5 * smooth(seg(t, 3, 7.5))));
    const size = lerp(2.2, 9, easeOut(seg(t, 1.4, 3))) * (1 + 0.12 * Math.sin(t * 5)) * lerp(1, 0.55, seg(t, 6, T.hit));
    world.light.set(lightTrail(t, 0), size, seg(t, 0.2, 1.4));
    world.atmoUniforms.uI.value = 0.55 + 0.45 * seg(t, 4, 9);
    world.skyMat.color.setScalar(1.9);
    world.interior.userData.setFade(1);
    matrix.group.visible = false;
  } else if (shot === 'steppe') {
    const k = easeInOut(seg(t, T.hit, 16.2));
    const dive = easeIn(seg(t, 16.1, T.ger));
    camera.position.copy(V(-8, 11, 40).lerp(V(0, 8.6, 4.4), k).lerp(V(0, 4.1, 0.9), dive));
    camera.lookAt(V(-3, 8.5, 0).lerp(V(0, 2.76, 0), smooth(seg(t, T.hit, 14.5))));
    const inside = seg(t, 15.9, 16.6);
    world.light.set(lightTrail(t, T.hit + 0.3), lerp(2.6, 0.3, easeOut(seg(t, T.hit, 14.6))), seg(t, T.hit + 0.3, T.hit + 1) * (1 - inside), 3);
    const { fire, topLight } = world.ger.userData;
    fire.material.opacity = 0.6 + 0.4 * inside;
    fire.material.color.setRGB(1.5, 0.8, 0.32).multiplyScalar(1 + 2.4 * inside);
    topLight.intensity = 3 + 40 * inside;
    world.skyMat.color.setScalar(1.55);
    world.interior.userData.setFade(1);
    matrix.group.visible = false;
  } else {
    const d = fitDistance(0);
    const k = easeInOut(seg(t, T.ger, 23.4));
    camera.position.copy(V(1.1, -1.6, d * 0.9).lerp(V(0, 0, d), k));
    camera.lookAt(0, 0, 0);
    camera.rotateZ(0.24 * (1 - k));
    world.light.set(lightTrail(t, T.ger), 0.9 * (1 + 0.14 * Math.sin(t * 4)), 1 - seg(t, 22.4, 24.2), 3.4);
    world.interior.userData.setFade(smooth(seg(t, 20.8, 23.6)));
    world.skyMat.color.setScalar(lerp(1.7, 1.25, seg(t, 21, 24.5)));
    matrix.group.visible = true;
    matrix.dim.value = 1;
    matrix.drawBlank(seg(t, 20.2, 24.7));
    matrix.setFigure(0, 0);
  }

  // a flash where the light meets the Earth, warm firelight on the way into the ger
  const flash = Math.min(seg(t, 9.5, T.hit), 1 - seg(t, T.hit, 11.3));
  const fire = Math.min(seg(t, 16.4, T.ger), 1 - seg(t, T.ger, 18.2));
  veil.style.background = fire > 0 ? '#ffd9a8' : '#e2ecff';
  veil.style.opacity = Math.max(flash, fire, 1 - seg(t, 0, 1.2)).toFixed(3);
  if (t < 1.2) veil.style.background = '#03050b';

  const line = CAPTIONS.find(([a, b]) => t >= a && t <= b);
  if (line && captionText !== line[2]) { captionText = line[2]; caption.textContent = captionText; }
  caption.style.opacity = line ? Math.min(seg(t, line[0], line[0] + 0.9), 1 - seg(t, line[1] - 0.9, line[1])).toFixed(3) : '0';
}

// ── after the intro
const form = $('form'); const amin = $('amin'); const journey = $('journey'); const reading = $('reading'); const form2 = $('form2');
const show = (el) => { el.hidden = false; requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('on'))); };
const hide = (el) => { el.classList.remove('on'); el.hidden = true; };

let state = 'intro';
let introT = query.has('t') ? Number(query.get('t')) : 0;
const held = query.has('t');
let time = 0; let stateStart = 0;
let gender = '';
let person = null; // { matrix, name, who, entry }
const view = { bottom: 0, wantBottom: 0, side: 0, wantSide: 0, pos: V(0, 0, 13), look: V(0, 0, 0), figure: 0, wantFigure: 0, wantDim: 1 };
const pointer = { x: 0, y: 0 };

function enter(next) {
  state = next;
  stateStart = time;
  matrix.focus = null;
  matrix.setBeam(null);
  matrix.setMarker(null);
  current = null;
  for (const el of [form, amin, journey, reading, form2]) hide(el);
  $('skip').hidden = next !== 'intro';
  caption.style.opacity = '0';
  veil.style.opacity = '0';
  if (next === 'form') { mode = 'person'; show(form); view.wantFigure = 0; view.wantDim = 1; }
  if (next === 'partner') { show(form2); view.wantFigure = 0; view.wantDim = 1; }
  if (next === 'reveal') { view.wantFigure = 0; view.wantDim = 1; }
  if (next === 'amin') { show(amin); view.wantFigure = 1; view.wantDim = 0.14; }
  if (next === 'journey') {
    $('own').hidden = mode !== 'couple';
    $('pair').hidden = mode === 'couple';
    $('hint').textContent = mode === 'couple'
      ? `${couple.names.join(' + ')} · хосын матриц`
      : 'Цэг дээр дарж тайлбарыг нь уншина уу. Хослол, холбоос, бүлгүүд «Агуулга» дотор бий.';
    show(journey);
    view.wantFigure = 0; view.wantDim = 1;
  }
}

function endIntro() {
  introAt(T.end);
  world.light.set([V(0, 0, 0)], 1, 0);
  world.space.visible = world.steppe.visible = false;
  scene.fog = null;
  view.pos.copy(camera.position);
  enter('form');
}

const sentences = (text, n) => text.split(/(?<=[.!?])\s+/).slice(0, n).join(' ');

async function submit() {
  const [year, month, day] = ['year', 'month', 'day'].map((id) => Number($(id).value.trim()));
  const error = $('error');
  error.textContent = '';
  if (!isValidDate(year, month, day)) { error.textContent = 'Төрсөн он, сар, өдрөө зөв оруулна уу.'; return; }
  if (!gender) { error.textContent = 'Хүйсээ сонгоно уу.'; return; }
  const m = computeMatrix({ year, month, day }, 'hand');
  const n = m.points.centre;
  const texts = await fetch(`../texts/by-gender/${gender}/portrait.json`).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  const entry = texts?.texts?.[n];
  const name = $('name').value.trim();
  const stamp = [year, String(month).padStart(2, '0'), String(day).padStart(2, '0')].join('.');
  person = { m, n, portrait: entry, texts: loadTexts(gender) };
  matrix.setMatrix(m);
  $('who').textContent = [$('clan').value.trim(), $('father').value.trim(), name, stamp].filter(Boolean).join(' · ');
  $('amin-kicker').textContent = name ? `${name}, таны амин тоо` : 'Таны амин тоо';
  $('amin-title').textContent = entry?.title ?? TALENTS[n].name;
  $('amin-name').textContent = `${n} · ${TALENTS[n].name}`;
  $('amin-text').textContent = entry?.who?.[0] ? sentences(entry.who[0], 2) : TALENTS[n].text;
  enter('reveal');
}

form.addEventListener('submit', (e) => { e.preventDefault(); submit(); });
for (const button of document.querySelectorAll('.gender button')) {
  button.addEventListener('click', () => {
    gender = button.dataset.g;
    for (const b of document.querySelectorAll('.gender button')) b.setAttribute('aria-checked', String(b === button));
  });
}
$('skip').addEventListener('click', endIntro);
$('go').addEventListener('click', () => { enter('journey'); goTo(route()[0]); });
$('overview').addEventListener('click', () => enter('journey'));
$('again').addEventListener('click', () => enter('form'));
$('again2').addEventListener('click', () => enter('form'));
window.addEventListener('pointermove', (e) => { pointer.x = (e.clientX / W) * 2 - 1; pointer.y = (e.clientY / H) * 2 - 1; });

// ── the journey: every stop is one place on the matrix, or two places read
// together, with its texts. It begins with the portrait of the amin too.
const PLACES = ['centre', 'left', 'tl', 'top', 'tr', 'right', 'br', 'bottom', 'bl',
  'top.mid', 'top.inner', 'right.mid', 'right.inner', 'bottom.mid', 'bottom.inner',
  'loveMoney.love', 'loveMoney.mid', 'loveMoney.money'];
const CORNERS = ['tl', 'tr', 'br', 'bl'];
const SQUARE = [...CORNERS, 'tl'];
// `seats` light up, `beam` is the path of the line of light between them
const ROUTE = [
  { kind: 'portrait', id: 'portrait', seats: ['centre'] },
  ...PLACES.map((key) => ({ kind: 'place', id: key, seats: [key] })),
  { kind: 'tail', id: 'karmic-tails', seats: ['bottom.inner', 'bottom.mid', 'bottom'], beam: ['bottom.inner', 'bottom'] },
  { kind: 'many', id: 'sexuality', seats: ['centre', 'bottom.inner', 'bottom'], beam: ['centre', 'bottom'] },
  { kind: 'career', id: 'career', seats: ['top', 'loveMoney.money'] },
  { kind: 'many', id: 'parents', seats: ['left', 'left.mid', 'left.inner'], beam: ['left', 'left.inner'] },
  { kind: 'many', id: 'children', seats: ['left', 'left.mid', 'left.inner'], beam: ['left', 'left.inner'] },
  { kind: 'age', id: 'age-now', seats: [] },
  { kind: 'age', id: 'age-next', seats: [] },
  { kind: 'one', id: 'family-comfort', key: 'familyCentre', seats: CORNERS, beam: SQUARE },
  { kind: 'many', id: 'family-programmes', seats: CORNERS, beam: SQUARE },
  { kind: 'one', id: 'destiny-personal', key: 'purposes.personal', seats: ['left', 'top', 'right', 'bottom'], beam: ['left', 'top', 'right', 'bottom', 'left'] },
  { kind: 'one', id: 'destiny-social', key: 'purposes.social', seats: CORNERS, beam: SQUARE },
  { kind: 'one', id: 'destiny-spiritual', key: 'purposes.spiritual', seats: AROUND },
  { kind: 'one', id: 'destiny-planetary', key: 'purposes.planetary', seats: AROUND },
  ...LINKS.map(([id, prop]) => ({ kind: 'link', id, prop, seats: LINK_POINTS[id] })),
  ...POINT_PAIRS.map(([p, q]) => ({ kind: 'pair', id: `${p}+${q}`, seats: [p, q] })),
  { kind: 'famous', id: 'famous', seats: ['centre'] },
];
// the list of every stop, shown in the same column as a stop's text
const CONTENTS = { kind: 'contents', id: 'contents', seats: [] };
const GROUPS = [
  ['Таны хөрөг', ['portrait']], ['Матрицын цэгүүд', ['place']], ['Бүлгүүд', ['tail', 'many', 'career', 'age', 'one']],
  ['Зургаан холбоос', ['link']], ['Гол цэгүүдийн хослол', ['pair']], ['Алдартнууд', ['famous']],
];
for (const stop of ROUTE) stop.group = GROUPS.find(([, kinds]) => kinds.includes(stop.kind))[0];
// chapters that read several places and the combinations of their numbers
const MANY = ROUTE.filter((stop) => stop.kind === 'many').map((stop) => stop.id);
const PLACE = {
  centre: 'Төв цэг · Амин тоо', familyCentre: 'Удмын төв',
  'left.mid': 'Зүүн дунд тоо', 'left.inner': 'Зүүн дотор тоо',
  'top.mid': 'Дээд дунд тоо', 'top.inner': 'Дээд дотор тоо',
  'right.mid': 'Баруун дунд тоо', 'right.inner': 'Баруун дотор тоо',
  'bottom.mid': 'Доод дунд тоо', 'bottom.inner': 'Доод дотор тоо',
  'loveMoney.love': 'Хайрын цэг', 'loveMoney.mid': 'Хайр, мөнгөний уулзвар', 'loveMoney.money': 'Мөнгөний цэг',
};
const ALL_CHAPTERS = CHAPTERS.flatMap((part) => part.chapters);
// the chapters read at one place: those that read that place alone, and for
// the eight outer points the decade that begins there
const chaptersAt = (key) => [
  ...ALL_CHAPTERS.filter((c) => c.at.length === 1 && c.at[0] === key),
  ...(key in POINT_AGES ? ALL_CHAPTERS.filter((c) => c.id === 'decades') : []),
];
const chapterOf = (id) => ALL_CHAPTERS.find((c) => c.id === id);
const partOf = (id) => CHAPTERS.find((part) => part.chapters.some((c) => c.id === id)).title;
const valueAt = (m, key) => {
  if (key in m.points) return m.points[key];
  if (key === 'familyCentre') return reduce(CORNERS.reduce((sum, corner) => sum + m.points[corner], 0));
  const [group, part] = key.split('.');
  if (group === 'purposes') return m.purposes[part];
  return group === 'loveMoney' ? m.loveMoney[part] : m.lines[group][part];
};
const numberName = (n) => `${n} · ${TALENTS[n].name}`;
const placeName = (key) => PLACE[key] ?? `${POINT_AGES[key]} нас · ${POINT_MEANINGS[key].word}`;

// every text the journey shows: the chapters in the person's gender, the six
// links, and the combinations (written for a pair of places, or the general one)
const textCache = {};
function loadTexts(g) {
  const get = (path) => fetch(`../texts/${path}.json`).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  const table = (list) => Promise.all(list).then(Object.fromEntries);
  textCache[g] ??= (async () => {
    const ids = [...new Set([...PLACES.flatMap(chaptersAt).map((c) => c.id), 'decades-age',
      ...ROUTE.filter((stop) => ['many', 'age', 'one'].includes(stop.kind)).map((stop) => stop.id)])];
    const contexts = [...POINT_PAIRS.map(([p, q]) => `${p}+${q}`), ...MANY];
    const [chapters, links, own, generic, tails, tailsDeep, career, famous] = await Promise.all([
      table(ids.map((id) => get(`by-gender/${g}/${id}`).then((d) => [id, d?.texts ?? {}]))),
      table(LINKS.map(([id]) => get(`links/${id}`).then((d) => [id, d]))),
      table(contexts.map((context) => get(`pairs-ctx/${pairContextFile(context)}`).then((d) => [context, d?.pairs ?? {}]))),
      table(Array.from({ length: 22 }, (_, k) => get(`pairs/${k + 1}`).then((d) => [k + 1, d?.pairs ?? {}]))),
      get('karmic-tails'), get('karmic-tails-deep'), get('career'), get('famous-by-amin'),
    ]);
    return { chapters, links, own, generic, tails, tailsDeep, career, famous };
  })();
  return textCache[g];
}
const make = (tag, cls, text) => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  node.textContent = text;
  return node;
};
// a titled block: heading, an optional line under it, then label and text rows
function block(title, lead, rows) {
  const section = make('section', 'chapter', '');
  section.append(make('h3', '', title));
  if (lead) section.append(make('p', 'chapter__asks', lead));
  for (const [label, text] of rows) {
    if (!text) continue;
    if (label) section.append(make('h4', '', label));
    section.append(make('p', '', text));
  }
  return section;
}
const para = (text, cls = 'reading__p') => make('p', cls, text);
const paragraphs = (text) => String(text ?? '').split(/\n\n+/).filter(Boolean).map((line) => ['', line]);
// a titled block that holds a list
function listBlock(title, items, cls = 'reading__list') {
  const section = block(title, '', []);
  const ul = make('ul', cls, '');
  ul.append(...items);
  section.append(ul);
  return section;
}
const bullets = (title, items) => listBlock(title, (items ?? []).map((text) => make('li', '', text)));
const fieldRows = (entry, fields = FIELDS) => fields.map(([field, label]) => [label, entry[field]]);
const pairBlock = (x, y, pair, rows = PAIR_ROWS, lead = '') => block(
  `${x} + ${y} · ${pairName(TALENTS[x].name, TALENTS[y].name)}`, lead,
  [['', pair.together], ...rows.map(([field, label]) => [label, pair[field]])]);

// the name of a stop in the contents, and the numbers it reads
function stopLabel(stop, texts) {
  const m = subject();
  const numbers = (keys) => keys.map((key) => valueAt(m, key)).join(' · ');
  if (stop.kind === 'compat') return ['Амин тоогоор тохирол', `${couple.a} + ${couple.b}`];
  if (stop.kind === 'zone') return [texts.zones[stop.id]?.name ?? stop.zone.name, numbers(stop.zone.at)];
  if (stop.kind === 'portrait') return [person.portrait?.title ?? 'Хөрөг', String(m.points.centre)];
  if (stop.kind === 'place') return [placeName(stop.id), String(valueAt(m, stop.id))];
  if (stop.kind === 'link') return [texts.links[stop.id]?.name ?? stop.id, String(m[stop.prop].value)];
  if (stop.kind === 'pair') return [`${POINT_NAMES[stop.seats[0]]} ба ${POINT_NAMES[stop.seats[1]].toLowerCase()}`, numbers(stop.seats).replace(' · ', ' + ')];
  if (stop.kind === 'famous') return [texts.famous?.title ?? 'Алдартнууд', ''];
  if (stop.kind === 'one') return [chapterOf(stop.id).name, String(valueAt(m, stop.key))];
  if (stop.kind === 'age') return [chapterOf(stop.id).name, ''];
  return [chapterOf(stop.id).name, numbers(stop.kind === 'tail' ? [...stop.seats].reverse() : stop.seats)];
}

// what one stop says: [kicker, title, blocks]
function stopContent(stop, texts) {
  const m = subject();
  if (stop.kind === 'contents') {
    return [mode === 'couple' ? couple.names.join(' + ') : 'Аялал', 'Агуулга', [...new Set(route().map((s) => s.group))].map((title) => {
      const section = make('section', 'toc', '');
      section.append(make('h3', '', title));
      for (const item of route().filter((s) => s.group === title)) {
        const [name, numbers] = stopLabel(item, texts);
        const row = make('button', 'toc__row', '');
        row.type = 'button';
        row.append(make('span', '', name), make('em', '', numbers));
        row.addEventListener('click', () => goTo(item));
        section.append(row);
      }
      return section;
    })];
  }
  if (mode === 'couple') return coupleContent(stop, texts);
  const c = chapterOf(stop.id);
  if (stop.kind === 'tail') {
    // keyed from the centre outwards, read from the outside in
    const values = stop.seats.map((key) => valueAt(m, key));
    const code = values.join('-');
    const tail = texts.tails?.tails?.[code];
    const all = texts.tailsDeep?.texts?.[code];
    const deep = all ? { ...all.neutral, ...(gender ? all[gender] : {}) } : null;
    const out = [para(c.asks, 'reading__ask')];
    if (deep?.headline) out.push(para(deep.headline, 'blessing'));
    if (tail) out.push(block('Товчхондоо', '', fieldRows(tail, TAIL_FIELDS)));
    if (deep) {
      out.push(block('Гурван тоо хамтдаа', '', paragraphs(deep.numbers)));
      out.push(block('Өнгөрсөн төрөл', '', (deep.past ?? []).map((line) => ['', line])));
      out.push(block('Бага нас, төрсөн гэр бүл', '', paragraphs(deep.childhood)));
      out.push(block('Одоо, таны амьдралд', '', [['Хайр, хань', deep.present?.love], ['Ажил, мөнгө', deep.present?.work_money],
        ['Гэр бүл, ураг төрөл', deep.present?.family], ['Бие, эрч хүч', deep.present?.body]]));
      out.push(bullets('Энэ гурван тоо таны амьдралд идэвхтэй байгаагийн шинж', deep.signs));
      out.push(block('Ирээдүй', '', [['Сургамжаа ойлгоогүй үед', deep.future_unworked], ['Сургамжаа давж гарсан үед', deep.future_worked]]));
      out.push(bullets('Чөлөөлөх алхмууд', deep.steps));
    }
    return [`${c.name} · ${[...values].reverse().join(' · ')}`, tail?.name ?? c.name, out];
  }
  if (stop.kind === 'many') {
    // every number once, with the places where it stands; then the numbers two at a time
    const where = new Map();
    for (const key of c.at) {
      const n = valueAt(m, key);
      where.set(n, [...(where.get(n) ?? []), placeName(key)]);
    }
    const written = texts.chapters[c.id] ?? {};
    const out = [para(c.asks, 'reading__ask')];
    for (const [n, names] of where) if (written[n]) out.push(block(numberName(n), names.join(' · '), fieldRows(written[n])));
    const distinct = [...where.keys()].sort((a, b) => a - b);
    distinct.forEach((a, i) => distinct.slice(i + 1).forEach((b) => {
      const pair = texts.own[c.id]?.[`${a}-${b}`] ?? texts.generic[a]?.[b];
      if (pair) out.push(pairBlock(a, b, pair, PAIR_ROWS, 'Эрчмүүдийн хослол'));
    }));
    return [partOf(c.id), c.name, out];
  }
  if (stop.kind === 'career') {
    const [talent, money] = stop.seats.map((key) => valueAt(m, key));
    const pair = texts.career?.pairs?.[`${talent}-${money}`];
    const out = [para(c.asks, 'reading__ask')];
    if (pair) {
      out.push(para(pair.summary), bullets('Тохирох ажил мэргэжил', pair.professions), bullets('Таны ажлын чадварууд', pair.skills));
      if (pair.environment) out.push(block('Танд тохирох ажлын орчин', '', [['', pair.environment]]));
      if (pair.avoid) out.push(block('Болгоомжлох зүйл', '', [['', pair.avoid]]));
      const strong = m.dominant?.values?.[0];
      const accent = strong && texts.career.accents?.[strong];
      if (accent) out.push(block(`Таны хамгийн хүчтэй эрчим ${numberName(strong)} ажилд тань`, '', [['', accent]]));
    }
    return [`Авьяас ${talent} · мөнгөний цэг ${money}`, c.name, out];
  }
  if (stop.kind === 'age') {
    const now = currentAge(m);
    const point = stop.id === 'age-now' ? now : nextAge(m);
    const out = [para(c.asks, 'reading__ask')];
    if (!point) return [partOf(c.id), c.name, out];
    const entry = texts.chapters[c.id]?.[point.value];
    out.push(block(numberName(point.value), '', entry ? fieldRows(entry) : [['', TALENTS[point.value].text]]));
    return [stop.id === 'age-now' ? `Одоо · ${now.years} нас` : `${point.from} наснаас`, c.name, out];
  }
  if (stop.kind === 'one') {
    const n = valueAt(m, stop.key);
    const entry = texts.chapters[c.id]?.[n];
    return [partOf(c.id), c.name, [para(c.asks, 'reading__ask'),
      block(numberName(n), '', entry ? fieldRows(entry) : [['', TALENTS[n].text]])]];
  }
  if (stop.kind === 'famous') {
    const n = m.points.centre;
    const people = texts.famous?.texts?.[n] ?? [];
    const out = [para(`Эдгээр алдартан тантай ижил ${numberName(n)} амин тоотой. Нэг эрчим хүн бүрт өөр замаар илэрдэг ч тэдний амьдралаас өөрийнхөө хүчийг таньж болно.`)];
    for (const [region, title] of [['mongolia', 'Монгол'], ['world', 'Дэлхий']]) {
      const group = people.filter((p) => p.region === region);
      if (!group.length) continue;
      out.push(listBlock(title, group.map((p) => {
        const li = make('li', '', '');
        li.append(make('b', '', p.name), make('span', '', p.born.split('-').reverse().join('.')), make('small', '', p.who));
        return li;
      }), 'famous'));
    }
    return [numberName(n), texts.famous?.title ?? 'Алдартнууд', out];
  }
  if (stop.kind === 'portrait') {
    const entry = person.portrait;
    const n = m.points.centre;
    if (!entry) return [`Таны амин тоо ${n}`, TALENTS[n].name, [block(numberName(n), '', [['', TALENTS[n].text]])]];
    const out = (entry.who ?? []).map((text) => make('p', 'reading__p', text));
    if (entry.greatness?.length) out.push(block('Таны хүрч болох дээд боломж', '', entry.greatness.map((text) => ['', text])));
    if (entry.path) out.push(block('Тэр боломжоо хэрэгжүүлэх зам', '', [['', entry.path]]));
    if (entry.blessing) out.push(make('p', 'blessing', entry.blessing));
    return [`Таны хөрөг · ${numberName(n)}`, entry.title, out];
  }
  if (stop.kind === 'place') {
    const key = stop.id;
    const n = valueAt(m, key);
    const age = POINT_AGES[key];
    // the decade that begins at an outer point is read for that age where it is written
    const decade = texts.chapters['decades-age']?.[age]?.[n];
    const blocks = chaptersAt(key).filter((ch) => texts.chapters[ch.id]?.[n] && !(decade && ch.id === 'decades')).map((ch) => block(
      ch.id === 'decades' ? `${age} наснаас ${age + 10} нас хүртэл` : ch.name, ch.asks, fieldRows(texts.chapters[ch.id][n])));
    if (decade) blocks.push(block(`${age} наснаас ${age + 10} нас хүртэл`, decade.title, [['', decade.text], ['Энэ арван жилийн сургамж', decade.lesson]]));
    return [PLACE[key] ?? `${age} нас · ${POINT_MEANINGS[key].word}`, numberName(n), blocks];
  }
  if (stop.kind === 'link') {
    const file = texts.links[stop.id];
    const base = m[stop.prop].value;
    const detail = m[stop.prop].detail?.value;
    const blocks = [];
    if (file?.texts?.[base]) blocks.push(block(numberName(base), 'Үндсэн тоо', LINK_FIELDS.map(([field, label]) => [label, file.texts[base][field]])));
    if (detail && file?.texts?.[detail]?.deeper) blocks.push(block(numberName(detail), 'Дэлгэрэнгүй тоо', [['Далд давхарга', file.texts[detail].deeper]]));
    return [`Холбоос · ${stop.seats.map((key) => POINT_AGES[key]).join(' ба ')} нас`, file?.name ?? '', blocks];
  }
  const [p, q] = stop.seats;
  const [x, y] = [valueAt(m, p), valueAt(m, q)];
  const fitted = texts.own[stop.id]?.[`${x}-${y}`];
  const pair = fitted ?? texts.generic[Math.min(x, y)]?.[Math.max(x, y)];
  const rows = (fitted && PAIR_ROWS_BY_CONTEXT[stop.id]) || PAIR_ROWS;
  const blocks = pair ? [pairBlock(x, y, pair, rows)] : [];
  return ['Хослол', `${POINT_NAMES[p]} ба ${POINT_NAMES[q].toLowerCase()}`, blocks];
}

let current = null; // the stop being read
async function goTo(stop) {
  current = stop;
  matrix.focus = stop && stop.kind !== 'portrait' ? stop.seats : null;
  matrix.setBeam(stop ? stop.beam ?? (stop.seats.length === 2 ? stop.seats : null) : null);
  // the chapters about age mark the person's place on the age ring
  const agePoint = stop?.kind === 'age' ? (stop.id === 'age-now' ? currentAge(person.m) : nextAge(person.m)) : null;
  matrix.setMarker(agePoint ? agePoint.years ?? agePoint.from : null);
  if (!stop) { hide(reading); if (state === 'journey') show(journey); return; }
  hide(journey);
  const body = $('r-body');
  body.replaceChildren();
  $('r-kicker').textContent = '';
  $('r-title').textContent = '';
  $('r-count').textContent = stop === CONTENTS ? '' : `${route().indexOf(stop) + 1} / ${route().length}`;
  show(reading);
  const texts = await (mode === 'couple' ? couple : person).texts;
  if (current !== stop) return;
  const [kicker, title, blocks] = stopContent(stop, texts);
  $('r-kicker').textContent = kicker;
  $('r-title').textContent = title;
  body.append(...blocks);
  $('r-scroll').scrollTop = 0;
}
const travel = (step) => goTo(route()[(route().indexOf(current) + step + route().length) % route().length]);
// the stop that reads one seat: its own stop, or in a couple matrix the zone that reads that place alone
const placeStop = (key) => route().find((stop) => (stop.kind === 'place' && stop.id === key)
  || (stop.kind === 'zone' && stop.zone.at.length === 1 && stop.zone.at[0] === key)) ?? null;
$('start').addEventListener('click', () => goTo(route()[0]));
$('prev').addEventListener('click', () => travel(-1));
$('next').addEventListener('click', () => travel(1));
$('close').addEventListener('click', () => goTo(null));
$('contents').addEventListener('click', () => goTo(CONTENTS));
$('contents2').addEventListener('click', () => goTo(CONTENTS));
window.addEventListener('keydown', (e) => {
  if (state !== 'journey' || !current) return;
  if (e.key === 'ArrowRight') travel(1);
  if (e.key === 'ArrowLeft') travel(-1);
  if (e.key === 'Escape') goTo(null);
});
$('scene').addEventListener('click', (e) => {
  if (state !== 'journey') return;
  const stop = placeStop(matrix.pick(e.clientX, e.clientY, camera, W, H, PLACES));
  if (stop !== current) goTo(stop);
});
$('scene').addEventListener('pointermove', (e) => {
  if (state !== 'journey') return;
  $('scene').style.cursor = matrix.pick(e.clientX, e.clientY, camera, W, H, PLACES) ? 'pointer' : '';
});

// ── two people: the couple matrix (both charts added place by place) read
// zone by zone, after the compatibility of the two amin too
let mode = 'person';
let couple = null; // { m, a, b, names, texts }
const AREAS = [['love', 'Хайр дурлал'], ['family', 'Гэр бүл'], ['business', 'Бизнесийн түнш'], ['friendship', 'Нөхөрлөл'], ['money', 'Мөнгө']];
const PURPOSE_SEATS = {
  'purposes.father': ['tl', 'br'], 'purposes.mother': ['tr', 'bl'],
  'purposes.personal': ['left', 'top', 'right', 'bottom'], 'purposes.social': CORNERS, 'purposes.spiritual': AROUND,
};
const COUPLE_ROUTE = [
  { kind: 'compat', id: 'compat', seats: [], group: 'Амин тоогоор тохирол' },
  ...COUPLE_PARTS.flatMap((part) => part.zones.map((zone) => {
    const seats = [...new Set(zone.at.flatMap((key) => PURPOSE_SEATS[key] ?? [key]))];
    return { kind: 'zone', id: zone.id, zone, seats, group: part.title, beam: seats.length === 2 || seats.length === 3 ? seats : null };
  })),
];
const route = () => (mode === 'couple' ? COUPLE_ROUTE : ROUTE);
const subject = () => (mode === 'couple' ? couple.m : person.m);
function loadCoupleTexts(a, b) {
  const get = (path) => fetch(`../texts/${path}.json`).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  return (async () => {
    const [zones, tails, compat] = await Promise.all([
      Promise.all(COUPLE_ZONE_IDS.map((id) => get(`couple/${id}`).then((d) => [id, d]))).then(Object.fromEntries),
      Promise.all(COUPLE_TAIL_FILES.map((f) => get(`couple/tails/${f}`))).then((files) => Object.assign({}, ...files.map((f) => f?.tails ?? {}))),
      get(`compat/${Math.min(a, b)}-${Math.max(a, b)}`),
    ]);
    return { zones, tails, compat };
  })();
}
function coupleContent(stop, texts) {
  const { m, a, b } = couple;
  if (stop.kind === 'compat') {
    const text = texts.compat;
    const title = `${TALENTS[a].name} + ${TALENTS[b].name}`;
    if (!text) return [`Амин тоо ${a} + ${b}`, title, [para(`${a} ба ${b} амин тооны тохирлын тайлбар бичигдэж байна.`)]];
    const scores = make('ul', 'scores', '');
    for (const [key, name] of AREAS) {
      const score = text[key]?.score ?? 0;
      const li = make('li', '', '');
      const bar = make('i', '', '');
      const fill = make('b', '', '');
      fill.style.width = `${score * 20}%`;
      bar.append(fill);
      li.append(make('span', '', name), bar, make('small', '', `${score}/5`));
      scores.append(li);
    }
    return [`Амин тоо ${a} + ${b}`, title, [
      para(text.headline, 'blessing'), scores, ...paragraphs(text.overview).map(([, line]) => para(line)),
      ...AREAS.filter(([key]) => text[key]).map(([key, name]) => block(name, '', paragraphs(text[key].text))),
      bullets('Юу сайн ажилладаг', text.strengths), bullets('Хаана мөргөлддөг', text.tensions),
      block('Зөвлөгөө', '', paragraphs(text.advice)),
    ]];
  }
  const { zone } = stop;
  const file = texts.zones[zone.id];
  const values = zone.at.map((key) => valueAt(m, key));
  const out = [para(file?.asks ?? '', 'reading__ask')];
  // the three numbers of the bottom line are also read as one story
  if (zone.id === 'couple-tail') {
    const code = [...values].reverse().join('-');
    const combo = texts.tails[code];
    if (combo) out.push(block(combo.name, `Гурван тоо хамтдаа · ${code}`, [['', combo.story], ...fieldRows(combo, COUPLE_TAIL_FIELDS)]));
  }
  const seen = new Set();
  values.forEach((n, k) => {
    if (!n || seen.has(n)) return;
    seen.add(n);
    const entry = file?.texts?.[n];
    out.push(block(numberName(n), zone.at.length > 1 ? COUPLE_WHERE[zone.at[k]] ?? '' : '',
      entry ? [...fieldRows(entry, COUPLE_FIELDS), ['', entry.more]] : [['', TALENTS[n].text]]));
  });
  return [stop.group, file?.name ?? zone.name, out];
}

async function submitPartner() {
  const [year, month, day] = ['year2', 'month2', 'day2'].map((id) => Number($(id).value.trim()));
  const error = $('error2');
  error.textContent = '';
  if (!isValidDate(year, month, day)) { error.textContent = 'Төрсөн он, сар, өдрийг зөв оруулна уу.'; return; }
  const a = person.n;
  const b = computeMatrix({ year, month, day }, 'hand').points.centre;
  couple = {
    m: computeCouple(person.m.date, { year, month, day }, 'all'), a, b,
    names: [$('name').value.trim() || 'Та', $('name2').value.trim() || 'Хос тань'],
    texts: loadCoupleTexts(a, b),
  };
  mode = 'couple';
  matrix.setMatrix(couple.m);
  enter('reveal');
}
function backToPerson() {
  mode = 'person';
  matrix.setMatrix(person.m);
  enter('journey');
}
form2.addEventListener('submit', (e) => { e.preventDefault(); submitPartner(); });
for (const id of ['pair', 'pair0']) $(id).addEventListener('click', () => enter('partner'));
$('back').addEventListener('click', () => enter('journey'));
$('own').addEventListener('click', backToPerson);

const bottomOf = { form, amin, journey, partner: form2 };
function interactive(dt) {
  const el = bottomOf[state];
  // the chapters of a stop take the right side of a wide screen, the lower part of a narrow one
  const wide = W > 860;
  const reads = current && !reading.hidden;
  view.wantBottom = reads ? (wide ? 0 : reading.offsetHeight * 0.9) : el && !el.hidden ? el.offsetHeight + 8 : 0;
  view.wantSide = reads && wide ? reading.offsetWidth * 0.5 : 0;
  const a = 1 - Math.exp(-dt * 3.2);
  view.bottom = lerp(view.bottom, view.wantBottom, a);
  view.side = lerp(view.side, view.wantSide, a);
  // a chosen stop is brought close: one place, or two places and the line between them.
  // The portrait keeps the whole matrix, with the amin too in stars over it.
  const portrait = current?.kind === 'portrait';
  if (state === 'journey') { view.wantFigure = portrait ? 1 : 0; view.wantDim = portrait ? 0.14 : 1; }
  const places = !current || portrait ? [] : matrix.marker ? [matrix.marker] : current.seats.map((key) => matrix.seats[key].at);
  const focus = places.length ? places.reduce((sum, p) => sum.add(p), V(0, 0, 0)).multiplyScalar(1 / places.length) : null;
  const span = focus ? Math.max(...places.map((p) => p.distanceTo(focus))) * 2 : 0;
  const goal = focus
    ? V(focus.x, focus.y, fitDistance(0) * Math.min(1, Math.max(wide ? 0.74 : 0.6, (span + 4.6) / 9.7)))
    : V(-pointer.x * 0.45, pointer.y * 0.3, fitDistance(view.bottom));
  view.pos.lerp(goal, a);
  view.look.lerp(focus ? V(focus.x, focus.y, 0) : V(0, 0, 0), a);
  camera.position.copy(view.pos);
  camera.lookAt(view.look);
  camera.setViewOffset(W, H, view.side, view.bottom / 2, W, H);

  matrix.dim.value = lerp(matrix.dim.value, view.wantDim, 1 - Math.exp(-dt * 2.2));
  const step = view.wantFigure > view.figure ? dt / 2.8 : -dt / 1.3;
  view.figure = Math.min(1, Math.max(0, Math.abs(view.wantFigure - view.figure) < Math.abs(step) ? view.wantFigure : view.figure + step));
  matrix.setFigure(view.figure, time);
  world.skyMat.color.setScalar(1.25);

  const s = time - stateStart;
  if (state === 'form') { matrix.drawBlank(1); matrix.idle(time); }
  if (state === 'reveal') {
    matrix.reveal(s);
    // one person goes on to the amin too, a couple straight to its first text
    if (s > REVEAL_T && mode === 'couple') { enter('journey'); goTo(route()[0]); } else if (s > REVEAL_T) enter('amin');
  }
  if (state === 'partner') { matrix.reveal(99); matrix.idle(time); }
  if (state === 'amin') matrix.reveal(99);
  if (state === 'journey') { matrix.reveal(99); matrix.idle(time); }

}

// one step of the whole show
function advance(dt) {
  time += dt;
  if (state === 'intro') {
    if (!held) introT += dt;
    introAt(Math.min(introT, T.end));
    if (introT >= T.end) endIntro();
  } else {
    interactive(dt);
  }
  matrix.apply(proj);
  world.tick(time);
}
let last = performance.now();
function frame(now) {
  advance(Math.min(0.05, (now - last) / 1000));
  last = now;
  composer.render();
  requestAnimationFrame(frame);
}
// for checking by hand or by script: run the show forward without waiting
window.matrixSite = {
  step(seconds) {
    for (let s = 0; s < seconds; s += 1 / 30) advance(1 / 30);
    composer.render();
    return state;
  },
};

$('loader').classList.add('gone');
setTimeout(() => { $('loader').hidden = true; }, 600);
if (query.has('skip') || query.has('demo') || window.matchMedia('(prefers-reduced-motion: reduce)').matches) endIntro();
if (query.has('demo')) {
  const [date, g] = query.get('demo').split(',');
  const [y, mo, d] = date.split('-');
  $('year').value = y; $('month').value = Number(mo); $('day').value = Number(d);
  gender = g || 'male';
  await submit();
  const stage = query.get('stage');
  if (query.has('pair')) {
    const [y2, m2, d2] = query.get('pair').split('-');
    $('year2').value = y2; $('month2').value = Number(m2); $('day2').value = Number(d2);
    await submitPartner();
  }
  if (stage) { matrix.reveal(99); enter(stage); }
}
requestAnimationFrame(frame);
