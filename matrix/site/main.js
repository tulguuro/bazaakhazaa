// The animated matrix site, as a working mock-up. An intro film (a light
// leaves the stars, reaches the Earth, the steppe and a ger, and the toono
// turns into the matrix), then the birth form, the numbers arriving, the
// amin too formed out of stars and the journey through the matrix, where
// every stop opens its chapters.
//
// For checking a single frame: ?t=12 holds the intro at 12 seconds, ?skip
// starts at the form, ?demo=1990-01-01,male sends the form by itself and
// &stage=amin or &stage=journey jumps on.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { computeMatrix, isValidDate } from '../matrix.js';
import { POINT_AGES, POINT_MEANINGS } from '../draw.js';
import { CHAPTERS } from '../chapters.js';
import { FIELDS } from '../report.js';
import { TALENTS } from '../talents.js';
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
const form = $('form'); const amin = $('amin'); const journey = $('journey'); const reading = $('reading');
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
  for (const el of [form, amin, journey, reading]) hide(el);
  $('skip').hidden = next !== 'intro';
  caption.style.opacity = '0';
  veil.style.opacity = '0';
  if (next === 'form') { show(form); view.wantFigure = 0; view.wantDim = 1; }
  if (next === 'reveal') { view.wantFigure = 0; view.wantDim = 1; }
  if (next === 'amin') { show(amin); view.wantFigure = 1; view.wantDim = 0.14; }
  if (next === 'journey') { show(journey); view.wantFigure = 0; view.wantDim = 1; }
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
  person = { m, n, texts: loadChapters(gender) };
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
$('go').addEventListener('click', () => enter('journey'));
$('again').addEventListener('click', () => enter('form'));
$('again2').addEventListener('click', () => enter('form'));
window.addEventListener('pointermove', (e) => { pointer.x = (e.clientX / W) * 2 - 1; pointer.y = (e.clientY / H) * 2 - 1; });

// ── the journey: every stop is a place on the matrix with its own chapters
const ROUTE = ['centre', 'left', 'tl', 'top', 'tr', 'right', 'br', 'bottom', 'bl',
  'top.mid', 'top.inner', 'right.mid', 'right.inner', 'bottom.mid', 'bottom.inner',
  'loveMoney.love', 'loveMoney.mid', 'loveMoney.money'];
const PLACE = {
  centre: 'Төв цэг · Амин тоо',
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
const valueAt = (m, key) => {
  if (key in m.points) return m.points[key];
  const [group, part] = key.split('.');
  return group === 'loveMoney' ? m.loveMoney[part] : m.lines[group][part];
};
const chapterCache = {};
function loadChapters(g) {
  chapterCache[g] ??= Promise.all([...new Set(ROUTE.flatMap(chaptersAt))].map((c) =>
    fetch(`../texts/by-gender/${g}/${c.id}.json`).then((r) => (r.ok ? r.json() : null)).catch(() => null)
      .then((data) => [c.id, data?.texts ?? {}])))
    .then(Object.fromEntries);
  return chapterCache[g];
}
const make = (tag, cls, text) => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  node.textContent = text;
  return node;
};

async function focusOn(key) {
  matrix.focus = key;
  if (!key) { hide(reading); if (state === 'journey') show(journey); return; }
  hide(journey);
  const n = valueAt(person.m, key);
  $('r-kicker').textContent = PLACE[key] ?? `${POINT_AGES[key]} нас · ${POINT_MEANINGS[key].word}`;
  $('r-title').textContent = `${n} · ${TALENTS[n].name}`;
  $('r-count').textContent = `${ROUTE.indexOf(key) + 1} / ${ROUTE.length}`;
  const body = $('r-body');
  body.replaceChildren();
  show(reading);
  const texts = await person.texts;
  if (matrix.focus !== key) return;
  for (const c of chaptersAt(key)) {
    const entry = texts[c.id]?.[n];
    if (!entry) continue;
    const age = POINT_AGES[key];
    const block = make('section', 'chapter', '');
    block.append(make('h3', '', c.id === 'decades' ? `${age} наснаас ${age + 10} нас хүртэл` : c.name), make('p', 'chapter__asks', c.asks));
    for (const [field, name] of FIELDS) if (entry[field]) block.append(make('h4', '', name), make('p', '', entry[field]));
    body.append(block);
  }
  $('r-scroll').scrollTop = 0;
}
const travel = (step) => focusOn(ROUTE[(ROUTE.indexOf(matrix.focus) + step + ROUTE.length) % ROUTE.length]);
$('start').addEventListener('click', () => focusOn(ROUTE[0]));
$('prev').addEventListener('click', () => travel(-1));
$('next').addEventListener('click', () => travel(1));
$('close').addEventListener('click', () => focusOn(null));
window.addEventListener('keydown', (e) => {
  if (state !== 'journey' || !matrix.focus) return;
  if (e.key === 'ArrowRight') travel(1);
  if (e.key === 'ArrowLeft') travel(-1);
  if (e.key === 'Escape') focusOn(null);
});
$('scene').addEventListener('click', (e) => {
  if (state !== 'journey') return;
  const key = matrix.pick(e.clientX, e.clientY, camera, W, H, ROUTE);
  if (key !== matrix.focus) focusOn(key);
});
$('scene').addEventListener('pointermove', (e) => {
  if (state !== 'journey') return;
  $('scene').style.cursor = matrix.pick(e.clientX, e.clientY, camera, W, H, ROUTE) ? 'pointer' : '';
});

const bottomOf = { form, amin, journey };
function interactive(dt) {
  const el = bottomOf[state];
  // the chapters of a stop take the right side of a wide screen, the lower part of a narrow one
  const wide = W > 860;
  const reads = matrix.focus && !reading.hidden;
  view.wantBottom = reads ? (wide ? 0 : reading.offsetHeight * 0.9) : el && !el.hidden ? el.offsetHeight + 8 : 0;
  view.wantSide = reads && wide ? reading.offsetWidth * 0.5 : 0;
  const a = 1 - Math.exp(-dt * 3.2);
  view.bottom = lerp(view.bottom, view.wantBottom, a);
  view.side = lerp(view.side, view.wantSide, a);
  const focus = matrix.focus ? matrix.seats[matrix.focus].at : null;
  // a chosen stop is brought close
  const goal = focus
    ? V(focus.x, focus.y, fitDistance(0) * (wide ? 0.74 : 0.6))
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
  if (state === 'reveal') { matrix.reveal(s); if (s > REVEAL_T) enter('amin'); }
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
  if (stage) { matrix.reveal(99); enter(stage); }
}
requestAnimationFrame(frame);
