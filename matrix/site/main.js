// The animated matrix site, as a working mock-up. The opening film (the Blue
// Wolf and the Fair Hind, from the turning sky to the toono of a ger) plays as
// a video; where it ends the matrix draws itself around the star left in the
// toono. Then the birth form, the numbers arriving, the
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
import { FIGURES, PICTURES } from './figures.js';
import {
  COUPLE_PARTS, COUPLE_TAIL_FILES, COUPLE_ZONE_IDS, FIELDS as COUPLE_FIELDS, TAIL_FIELDS as COUPLE_TAIL_FIELDS, WHERE as COUPLE_WHERE,
} from '../couple.js';
import { createWorld } from './world.js';
import { FIGURE_STARS, PHONE, REVEAL_T, createMatrix } from './matrix3d.js';
import { easeIn, easeInOut, easeOut, figurePoints, lerp, seg, smooth } from './gfx.js';
import { createSound } from './sound.js';
import { NIGHT, createBackdrop } from './backdrop.js';

const $ = (id) => document.getElementById(id);
const query = new URLSearchParams(location.search);
const V = (x, y, z) => new THREE.Vector3(x, y, z);

const renderer = new THREE.WebGLRenderer({ canvas: $('scene'), antialias: true, powerPreference: 'high-performance' });
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

// the page sits at the top of the site and this file two folders below it,
// so pictures and texts are found from this file, not from the page
const asset = (name) => new URL(`../../assets/${name}`, import.meta.url).href;
const textUrl = (path) => new URL(`../texts/${path}.json`, import.meta.url).href;

// The opening, on the site's song (film/edit/EDIT.md has the cut list): the film
// of the legend, then the clip in which the pair of starlight turns into the
// matrix (VIDEO-PROMPTS.md, clip 6). Seconds of the song:
//   PAIR.start      the pair's clip begins, under the last moment of the film
//   SCENE.from..to  the clip's last frame gives way to the scene, which shows
//                   the same painted matrix in the same place
//   FILM.end        the form comes (a drum hit of the song)
const FILM = { length: 47.71, end: 57.98 };
const PAIR = { start: 46.9, cross: 0.8, length: 10.04 };
const SCENE = { from: 56.4, to: 57.0 };
// where the clip's last frame has the matrix: centre and radius as shares of
// the frame (measured on v1-pair-matrix.mp4 by registering matrix-plate.png on it)
const CLIP = { cx: 0.4911, cy: 0.4681, r: 0.367 };
const film = $('film');
const pair = $('pairfilm');
const noIntro = query.has('skip') || query.has('demo') || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (noIntro) $('filmbox').hidden = true;
else {
  // a phone shows the film small and plays the lighter copy with ease
  const large = window.innerWidth >= 900 && window.innerWidth * Math.min(window.devicePixelRatio, 2) > 1500;
  film.src = asset(large ? 'film-1080.mp4' : 'film-720.mp4');
  pair.src = asset(large ? 'pair-1080.mp4' : 'pair-720.mp4');
}

const loader = new THREE.TextureLoader();
const [ringMap] = await Promise.all([
  loader.loadAsync(asset('matrix-plate.jpg')),
  document.fonts.load('600 40px "Cormorant Garamond"'),
  document.fonts.load('500 40px Inter'),
  document.fonts.load('600 40px Inter'),
]);
// The first intro's sky photograph and Earth maps are no longer shown, so they
// are not loaded: the world is given blank pictures in their place.
const blank = () => { const t = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1); t.needsUpdate = true; return t; };
const world = createWorld(blank(), { day: blank(), clouds: blank() });
const { scene, camera } = world;
world.sky.visible = false;
scene.background = new THREE.Color(NIGHT);
const backdrop = createBackdrop(ringMap);
scene.add(backdrop.mesh);
const matrix = createMatrix();
scene.add(matrix.group);
matrix.setPainted(true);

const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: PHONE ? 2 : 4 }));
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.8, 0.75, 0.8);
composer.addPass(bloom);
// the glow is soft by nature: a phone works it out at half size
if (PHONE) { const full = bloom.setSize.bind(bloom); bloom.setSize = (w, h) => full(Math.round(w / 2), Math.round(h / 2)); }
composer.addPass(new OutputPass());

let W = 1; let H = 1; let proj = 600;
// how sharp the scene is drawn: a phone starts at 1.5 screen pixels per point, and any
// screen that cannot keep up is lowered step by step (see watchSpeed) down to 1
let ratioCap = PHONE ? 1.5 : 2;
function resize() {
  W = window.innerWidth; H = window.innerHeight;
  const ratio = Math.max(1, Math.min(window.devicePixelRatio, ratioCap));
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

// the intro says nothing in words: the owner wants the pictures alone to tell it
const CAPTIONS = [];
const caption = $('caption');
const veil = $('veil');
let captionText = '';

// Where the eye should rest in each shot, as a share of the film's width. Where
// the film is wider than its box, the part in view follows these points. Every shot begins with its own pair, so nothing slides across a cut.
const FOCUS = [
  [0, 0.50], [6.29, 0.53],
  [6.29, 0.65], [9.5, 0.64], [13.04, 0.52],
  [13.04, 0.58], [15.3, 0.60], [17.54, 0.57],
  [17.54, 0.75], [20, 0.52], [22, 0.50], [24, 0.54], [26.5, 0.52],
  [26.5, 0.78], [28.7, 0.68], [31, 0.48],
  [31, 0.60], [33, 0.58], [35.5, 0.50],
  [35.5, 0.50], [FILM.length, 0.50],
];
// The film's box and the film inside it. A wide screen is filled; an upright
// one gets a square across its middle. The film is slid with a transform,
// which the phone's graphics chip does by itself, and only when it has moved.
const filmBox = $('filmbox');
const laid = { box: '', move: '', fade: '' };
function layoutFilm(t) {
  const tall = W < H;
  // a little taller than square: the toono, the ger and both animals fit whole with room to spare
  const boxH = tall ? Math.min(H, Math.round(W * 1.15)) : H;
  const top = Math.round((H - boxH) / 2);
  const vidH = Math.max(boxH, (W * 9) / 16);
  const vidW = (vidH * 16) / 9;
  const box = `${W}|${boxH}|${top}`;
  if (box !== laid.box) {
    laid.box = box;
    filmBox.classList.toggle('filmbox--tall', tall);
    filmBox.style.width = `${W}px`;
    filmBox.style.height = `${boxH}px`;
    filmBox.style.top = `${top}px`;
    for (const v of [film, pair]) { v.style.width = `${vidW}px`; v.style.height = `${vidH}px`; }
  }
  let focus = 0.5;
  for (let i = 0; i < FOCUS.length - 1; i += 1) {
    const [a, from] = FOCUS[i]; const [b, to] = FOCUS[i + 1];
    if (t >= a && t < b) { focus = lerp(from, to, (t - a) / (b - a)); break; }
  }
  const x = -Math.min(Math.max(focus * vidW - W / 2, 0), vidW - W);
  const y = -(vidH - boxH) / 2;
  laid.geo = { vidW, vidH, x, y: top + y };
  const move = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
  if (move !== laid.move) { laid.move = move; film.style.transform = move; pair.style.transform = move; }
}

// The camera that shows the code's matrix exactly where the clip's last frame
// shows it: same centre on the screen, same size. The scene takes over from the
// clip in this view and then eases to its own.
function matchClip() {
  const { vidW, vidH, x, y } = laid.geo ?? { vidW: W, vidH: H, x: 0, y: 0 };
  const sx = x + CLIP.cx * vidW;
  const sy = y + CLIP.cy * vidH;
  const rpx = CLIP.r * vidH;
  const d = (R_WORLD * (H / 2)) / (Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * rpx);
  return { d, side: W / 2 - sx, bottom: 2 * (H / 2 - sy) };
}
const R_WORLD = 4;

// the scene is out of sight while the film covers it, and is left alone then
const covered = () => state === 'intro' && introT < SCENE.from - 0.3;

// the film, the pair's clip, and after them the scene, at second `t` of the song
function filmAt(t) {
  const fade = (1 - seg(t, SCENE.from, SCENE.to)).toFixed(3);
  if (fade !== laid.fade) { laid.fade = fade; filmBox.style.opacity = fade; }
  const cross = seg(t, PAIR.start, PAIR.start + PAIR.cross).toFixed(3);
  if (cross !== laid.cross) { laid.cross = cross; pair.style.opacity = cross; film.style.opacity = (1 - cross).toFixed(3); }
  layoutFilm(Math.min(t, FILM.length - 0.01));
  veil.style.background = '#03050b';
  veil.style.opacity = (1 - seg(t, 0, 1)).toFixed(3);
  if (t < SCENE.from - 0.3) return;
  // the scene, waiting under the clip in the clip's own view
  world.space.visible = world.steppe.visible = false;
  scene.fog = null;
  world.light.set([V(0, 0, 0)], 0.4, 0);
  const m = matchClip();
  camera.position.set(0, 0, m.d);
  camera.lookAt(0, 0, 0);
  camera.setViewOffset(W, H, m.side, m.bottom / 2, W, H);
  world.interior.userData.setFade(1);
  matrix.group.visible = true;
  matrix.dim.value = 1;
  matrix.drawBlank(1);
  matrix.setGather(1);
  matrix.setFigure(0, 0);
  caption.style.opacity = '0';
}

// The first intro, built in code: a light leaves the stars for the Earth and a
// ger. The film has taken its place; only its last moment is still used, as
// the state the form begins from.
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
const view = { bottom: 0, wantBottom: 0, side: 0, wantSide: 0, pos: V(0, 0, 13), look: V(0, 0, 0), figure: 0, wantFigure: 0, wantDim: 1, hasFigure: false, morph: 1 };
// seconds after the amin too opens: the figure has formed by 2.8, stays, then winds
// into one star and opens as the number
const FIGURE_HOLD = { from: 5.6, to: 10.0 };
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
    // one person's matrix stands without words; a couple's says whose it is
    $('hint').textContent = mode === 'couple' ? `${couple.names.join(' + ')} · хосын матриц` : '';
    $('hint').hidden = mode !== 'couple';
    show(journey);
    view.wantFigure = 0; view.wantDim = 1;
  }
}

const lift = () => { $('loader').classList.add('gone'); setTimeout(() => { $('loader').hidden = true; }, 600); };
let filmOver = false;   // the film has played out, or cannot be played
let tail = null;         // when the film ended, and the second it ended on
let pairOn = false;      // the pair's clip has been started
let pairWarm = false;    // the pair's clip has been woken ahead of its start

function endIntro() {
  film.pause();
  pair.pause();
  filmBox.hidden = true;
  lift();
  matrix.setGather(1);
  matrix.setHeart(1);
  introAt(T.end);
  world.light.set([V(0, 0, 0)], 0.4, 0);
  world.space.visible = world.steppe.visible = false;
  scene.fog = null;
  // start from the clip's own view and ease from there to the form's
  const m = matchClip();
  view.pos.set(0, 0, m.d);
  view.look.set(0, 0, 0);
  view.side = m.side;
  view.bottom = m.bottom;
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
  const read = (path) => fetch(textUrl(path)).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  // the portrait of the amin too, and what its energy means in general
  // the figure of the number in stars, where its picture is made: 7.2 units square fills the ring
  // (?fig=N shows the figure of another number, for looking at a picture whose number
  // no birth date gives as an amin too: 1, 2, 15, 17, 19 and 21 only come at other points)
  const fig = Number(query.get('fig')) || n;
  const [texts, energy, stars] = await Promise.all([read(`by-gender/${gender}/portrait`), read(`numbers/${n}`),
    PICTURES.has(fig) ? figurePoints(asset(`figures/${fig}.jpg`), FIGURE_STARS, 7.2) : null]);
  const entry = texts?.texts?.[n];
  const character = String(energy?.sections?.character ?? '').split(/\n\n+/).filter(Boolean);
  const name = $('name').value.trim();
  const stamp = [year, String(month).padStart(2, '0'), String(day).padStart(2, '0')].join('.');
  // the journey's texts (several megabytes) wait until the figure has formed, so on a
  // phone they never compete with its picture; asking for the journey loads them at once
  person = { m, n, portrait: entry, keywords: energy?.keywords ?? [], character, gender, texts: null };
  const asked = person;
  setTimeout(() => { if (person === asked) personTexts(); }, 12000);
  matrix.setMatrix(m);
  matrix.setFigurePoints(stars);
  view.hasFigure = Boolean(stars);
  $('who').textContent = [$('clan').value.trim(), $('father').value.trim(), name, stamp].filter(Boolean).join(' · ');
  $('amin-kicker').textContent = name ? `${name}, таны амин тоо` : 'Таны амин тоо';
  $('amin-title').textContent = entry?.title ?? TALENTS[n].name;
  $('amin-name').textContent = `${n} · ${TALENTS[n].name}`;
  $('amin-figure').textContent = FIGURES[n].name;
  $('amin-figure-story').textContent = FIGURES[n].story;
  $('amin-figure-story').classList.add('short');
  $('amin-figure-more').textContent = 'Дэлгэрэнгүй';
  $('amin-figure-more').setAttribute('aria-expanded', 'false');
  // first what the energy means, not a scene from the portrait: that is read in the journey
  $('amin-keys').textContent = person.keywords.join(' · ');
  // what the energy means, then the figure of the number, then the person
  $('amin-text').textContent = TALENTS[n].text;
  $('amin-more').textContent = character[0] ? sentences(character[0], 2) : '';
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
// the song of the site, opened and closed by the visitor
// while the film runs the song keeps to the film's second, afterwards it goes its own way
const sound = createSound($('sound'), asset('urianhai-udgan.mp3'), {
  position: () => (state === 'intro' && !held ? introT : null),
  after: FILM.end,
});
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
const personTexts = () => (person.texts ??= loadTexts(person.gender));
function loadTexts(g) {
  const get = (path) => fetch(textUrl(path)).then((r) => (r.ok ? r.json() : null)).catch(() => null);
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
    // what the energy means comes first, then the person's own portrait
    const meaning = block('Энэ эрчим юуг илэрхийлдэг вэ', person.keywords.join(' · '), [['', TALENTS[n].text], ...person.character.map((text) => ['', text])]);
    if (!entry) return [`Таны амин тоо ${n}`, TALENTS[n].name, [meaning]];
    const out = [meaning, block('Таны амьдралд хэрхэн илэрдэг вэ', '', (entry.who ?? []).map((text) => ['', text]))];
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
  const texts = await (mode === 'couple' ? couple.texts : personTexts());
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
  const get = (path) => fetch(textUrl(path)).then((r) => (r.ok ? r.json() : null)).catch(() => null);
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
  // on the amin too a number with a figure shows the figure first: the stars gather
  // into it, it stays a while, then its stars flow on into the number
  const figureFirst = view.hasFigure && state === 'amin';
  view.morph = figureFirst ? seg(time - stateStart, FIGURE_HOLD.from, FIGURE_HOLD.to) : Math.min(1, view.morph + dt / 1.5);
  matrix.setFigure(view.figure, time, view.morph);
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
    // the film is the clock while it plays, so a pause to load never parts picture and song
    // After its last frame the clock of the wall carries on, as the song does.
    // the film is the clock, then the pair's clip; past the clip's last frame the wall clock
    if (!held) {
      // a few seconds ahead the clip is woken, so its first frames are decoded in time
      if (!pairWarm && introT >= PAIR.start - 3) {
        pairWarm = true;
        pair.play().then(() => { if (!pairOn) { pair.pause(); pair.currentTime = 0; } }).catch(() => {});
      }
      if (!pairOn && introT >= PAIR.start) {
        pairOn = true;
        // started late: join the song where it is, so the clock never steps back
        pair.currentTime = Math.max(0, introT - PAIR.start);
        pair.play().catch(() => {});
      }
      const pairRuns = pairOn && !pair.ended && !pair.paused && pair.currentTime > 0;
      const playing = pairOn ? pairRuns : !film.ended;
      if (playing) { introT = pairOn ? PAIR.start + pair.currentTime : film.currentTime; tail = null; }
      else {
        tail ??= { at: performance.now(), from: introT };
        introT = tail.from + (performance.now() - tail.at) / 1000;
      }
      if (playing) sound.follow(introT);
    }
    filmAt(Math.min(introT, FILM.end));
    if (introT >= FILM.end) endIntro();
  } else {
    interactive(dt);
  }
  if (covered()) return;
  // the painted matrix dims with the code's lines, under the amin too's figure
  backdrop.uniforms.uLight.value = 0.92 * lerp(0.3, 1, matrix.dim.value);
  matrix.apply(proj, time);
  world.tick(time);
}
// the finished frame, then the figure's picture on top of it: the picture keeps its own
// colours, untouched by the bloom and the tone mapping
function draw() {
  composer.render();
  matrix.syncOverlay();
  renderer.autoClear = false;
  renderer.render(matrix.overlay, camera);
  renderer.autoClear = true;
}
// on a phone the figure's story is folded to three lines until asked for
$('amin-figure-more').addEventListener('click', () => {
  const open = $('amin-figure-story').classList.toggle('short') === false;
  $('amin-figure-more').textContent = open ? 'Хураах' : 'Дэлгэрэнгүй';
  $('amin-figure-more').setAttribute('aria-expanded', String(open));
});
let last = performance.now();
// ?rec: the show stands still between frames and is moved only by matrixSite.tick,
// so a recording made slower than real time still comes out smooth
const recording = query.has('rec');
// watch the first seconds of the scene: if frames take longer than about 1/40 s on
// average, draw with fewer pixels (each step a quarter less sharp), at most three times
let speedFrames = 0; let speedSum = 0; let speedSteps = 0;
function watchSpeed(dt) {
  if (recording || speedSteps >= 3 || covered() || dt > 0.25) return;
  speedFrames += 1; speedSum += dt;
  if (speedFrames < 90) return;
  const slow = speedSum / speedFrames > 0.025;
  speedFrames = 0; speedSum = 0;
  if (!slow) { speedSteps = 3; return; }
  const now = Math.min(window.devicePixelRatio, ratioCap);
  if (now <= 1) { speedSteps = 3; return; }
  ratioCap = Math.max(1, now - 0.25); speedSteps += 1;
  resize();
}
function frame(now) {
  const dt = (now - last) / 1000;
  advance(recording ? 0 : Math.min(0.05, dt));
  last = now;
  watchSpeed(dt);
  // nothing of the scene shows while the film covers it
  if (!covered()) draw();
  requestAnimationFrame(frame);
}
// for checking by hand or by script: run the show forward without waiting
window.matrixSite = {
  // where the opening stands, for checking: the song's second, and whether the pair's clip runs
  clock: () => ({ introT, pairOn, pairWarm, state }),
  // how far the song stands from the film, in seconds, while both run
  songOffset: () => (sound.state === 'on' ? sound.audio.currentTime - introT : null),
  tick(seconds) {
    for (let s = 0; s < seconds - 1e-6; s += 1 / 60) advance(Math.min(1 / 60, seconds - s));
    draw();
  },
  step(seconds) {
    if (state === 'intro') endIntro();
    for (let s = 0; s < seconds; s += 1 / 30) advance(1 / 30);
    draw();
    return state;
  },
};

if (noIntro) endIntro();
else {
  layoutFilm(introT);   // the box has its size before the first frame is drawn
  film.addEventListener('playing', lift, { once: true });
  film.addEventListener('error', () => { filmOver = true; if (state === 'intro') endIntro(); });
  if (held) {
    // ?t= holds one moment of the film still
    const hold = () => {
      film.currentTime = Math.min(introT, FILM.length - 0.05);
      if (introT >= PAIR.start) {
        const toPair = () => { pair.currentTime = Math.min(introT - PAIR.start, PAIR.length - 0.05); };
        if (pair.readyState >= 1) toPair(); else pair.addEventListener('loadedmetadata', toPair, { once: true });
      }
    };
    film.addEventListener('seeked', lift, { once: true });
    if (film.readyState >= 1) hold(); else film.addEventListener('loadedmetadata', hold, { once: true });
  } else {
    // a phone that is saving power will not start a film by itself: go straight to the form
    film.play().catch(() => { filmOver = true; endIntro(); });
  }
}
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
