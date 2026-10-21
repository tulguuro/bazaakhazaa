// Scroll story: text cards, chapter navigation and the scroll → scene mapping.
// The WebGL scene is imported separately so the text keeps working without it.

const root = document.documentElement;
const chapters = [...document.querySelectorAll('.chapter')];
const cards = chapters.map((ch) => ch.querySelector('.card'));
const nav = document.querySelector('.chapters');
const progress = document.querySelector('.progress');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// How far (radians) each shape turns while its chapter is being read.
const SPIN = { stars: 0.15, wolf: 0.45, pair: 0.35, sea: 0.25, mountain: 0.5, ger: 1.3, arrows: 1.5, worlds: 1.3, mandala: 0.5, dial: 0.7 };
const DOLLY = 0.9;

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const smoothstep = (a, b, x) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

// ---------- layout ----------
// Each chapter holds its shape while its card is read; the morph to the next
// shape runs from 68% of this chapter to 22% of the next one.
let vh = window.innerHeight;
let tops = [];
let heights = [];
let morphStart = [];
let morphEnd = [];
let end = 0;

function layout() {
  vh = window.innerHeight;
  tops = chapters.map((ch) => ch.getBoundingClientRect().top + window.scrollY);
  heights = chapters.map((ch) => ch.offsetHeight);
  morphStart = [];
  morphEnd = [];
  for (let i = 0; i < chapters.length - 1; i++) {
    morphStart.push(tops[i] + 0.68 * heights[i]);
    morphEnd.push(tops[i + 1] + 0.22 * heights[i + 1]);
  }
  const last = chapters.length - 1;
  end = tops[last] + heights[last];
  cards.forEach((card) => card.style.setProperty('--h', `${card.offsetHeight}px`));
  scene?.resize();
}

function hold(i, h) {
  const spin = (SPIN[chapters[i].dataset.shape] ?? 0.4) * (reduceMotion ? 0.3 : 1);
  return { rot: (h - 0.5) * spin, dolly: h * DOLLY };
}

// Scene state for a viewport centre `c` (document px).
function target(c) {
  const n = chapters.length;
  for (let i = 0; i < n; i++) {
    const hs = i === 0 ? tops[0] : morphEnd[i - 1];
    const he = i === n - 1 ? end : morphStart[i];
    if (c < he || i === n - 1) return { f: i, ...hold(i, clamp01((c - hs) / (he - hs))) };
    if (c < morphEnd[i]) {
      const m = (c - morphStart[i]) / (morphEnd[i] - morphStart[i]);
      const e = m * m * (3 - 2 * m);
      const a = hold(i, 1);
      const b = hold(i + 1, 0);
      return { f: i + m, rot: a.rot + (b.rot - a.rot) * e, dolly: a.dolly + (b.dolly - a.dolly) * e };
    }
  }
  return { f: 0, rot: 0, dolly: 0 };
}

const keyScroll = (i) => (i === 0 ? 0 : tops[i] + 0.42 * heights[i] - vh / 2);

// ---------- navigation ----------
const navButtons = chapters.map((ch, i) => {
  const button = document.createElement('button');
  button.type = 'button';
  button.innerHTML = `<span class="label">${ch.dataset.title}</span><span class="dot"></span>`;
  button.setAttribute('aria-label', ch.dataset.title);
  button.addEventListener('click', () => window.scrollTo({ top: keyScroll(i), behavior: reduceMotion ? 'auto' : 'smooth' }));
  nav.append(button);
  return button;
});

let activeChapter = -1;
function updateNav(f) {
  const active = Math.round(f);
  if (active === activeChapter) return;
  navButtons[activeChapter]?.classList.remove('active');
  navButtons[active]?.classList.add('active');
  navButtons[active]?.setAttribute('aria-current', 'step');
  navButtons[activeChapter]?.removeAttribute('aria-current');
  activeChapter = active;
}

// ---------- cards ----------
function updateCards() {
  chapters.forEach((ch, i) => {
    const card = cards[i];
    let vis;
    if (card.classList.contains('card--flow')) {
      vis = smoothstep(vh * 0.98, vh * 0.7, card.getBoundingClientRect().top);
    } else {
      const r = ch.getBoundingClientRect();
      const u = (vh * 0.5 - r.top) / r.height;
      const fadeIn = i === 0 ? 1 : smoothstep(0.14, 0.26, u);
      vis = fadeIn * (1 - smoothstep(0.58, 0.7, u));
    }
    card.style.opacity = vis.toFixed(3);
    card.style.setProperty('--shift', `${((1 - vis) * 28).toFixed(1)}px`);
    card.classList.toggle('is-hidden', vis < 0.02);
  });
}

// ---------- pointer parallax ----------
const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
if (window.matchMedia('(pointer: fine)').matches && !reduceMotion) {
  window.addEventListener(
    'pointermove',
    (e) => {
      mouse.tx = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.ty = -((e.clientY / window.innerHeight) * 2 - 1);
    },
    { passive: true },
  );
}

// ---------- 3D scene ----------
let scene = null;
import('./scene.js')
  .then(({ createScene }) => {
    scene = createScene(
      document.getElementById('scene'),
      chapters.map((ch) => ({ shape: ch.dataset.shape, side: ch.dataset.side })),
      { reduceMotion },
    );
  })
  .catch((err) => {
    console.warn('3D scene disabled:', err);
    root.classList.add('no-webgl');
  })
  .finally(() => root.classList.add('is-ready'));

// ---------- loop ----------
layout();
window.addEventListener('resize', layout);
document.fonts?.ready.then(layout);
new ResizeObserver(layout).observe(document.querySelector('main'));

const cur = target(window.scrollY + vh / 2);
let last = performance.now();

function tick(now) {
  const dt = Math.min(0.25, (now - last) / 1000);
  last = now;

  const t = target(window.scrollY + vh / 2);
  const k = reduceMotion ? 1 : 1 - Math.exp(-dt * 5);
  cur.f += (t.f - cur.f) * k;
  cur.rot += (t.rot - cur.rot) * k;
  cur.dolly += (t.dolly - cur.dolly) * k;
  const km = 1 - Math.exp(-dt * 3);
  mouse.x += (mouse.tx - mouse.x) * km;
  mouse.y += (mouse.ty - mouse.y) * km;

  updateCards();
  updateNav(cur.f);
  const max = document.documentElement.scrollHeight - vh;
  progress.style.transform = `scaleX(${max > 0 ? clamp01(window.scrollY / max) : 0})`;

  scene?.frame(now / 1000, cur, mouse);
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
