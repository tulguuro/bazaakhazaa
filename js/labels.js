// Floating labels that belong to a shape: the numbers of the mandala and
// the 22 paths of the dial. They live in the shape's group, so they turn
// with it, and fade in only while their chapter is on screen.
import * as THREE from 'three';

const GOLD = '#f2c66d';
const WARM = '#ffb85c';
const INK = 'rgba(236, 240, 252, 0.88)';
const DIM = 'rgba(214, 222, 242, 0.78)';

const SERIF = '"Cormorant Garamond", Georgia, serif';
const SANS = 'Inter, system-ui, sans-serif';

// parts: [{ text, size, weight, family, color }], drawn on one baseline.
function textSprite(parts, height, center = [0.5, 0.5]) {
  const scale = 2;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const fonts = parts.map((p) => `${p.weight} ${p.size * scale}px ${p.family}`);
  const gap = 10 * scale;
  const widths = parts.map((p, i) => {
    ctx.font = fonts[i];
    return ctx.measureText(p.text).width;
  });
  const pad = 16 * scale;
  const tallest = Math.max(...parts.map((p) => p.size)) * scale;
  canvas.width = Math.ceil(widths.reduce((a, b) => a + b, 0) + gap * (parts.length - 1) + pad * 2);
  canvas.height = Math.ceil(tallest * 1.5);
  let x = pad;
  const baseline = canvas.height * 0.68;
  parts.forEach((p, i) => {
    ctx.font = fonts[i];
    ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
    ctx.shadowBlur = 10 * scale;
    ctx.fillStyle = p.color;
    ctx.fillText(p.text, x, baseline);
    x += widths[i] + gap;
  });
  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 4;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false, depthTest: false, opacity: 0 }),
  );
  sprite.scale.set((height * canvas.width) / canvas.height, height, 1);
  sprite.center.set(center[0], center[1]);
  sprite.renderOrder = 10;
  return sprite;
}

const numberLabel = (num, words, height, highlight = false, center) =>
  textSprite(
    [
      { text: num, size: 64, weight: 600, family: SERIF, color: highlight ? WARM : GOLD },
      ...(words ? [{ text: words, size: 34, weight: 500, family: SANS, color: INK }] : []),
    ],
    height,
    center,
  );

// A legend column beside the mandala, each entry tied to its ring by a
// faint leader line.
function mandalaLabels() {
  const group = new THREE.Group();
  const lift = (r) => -0.12 * r;
  const rings = [
    [0, '1', 'Тэнгэр'],
    [0.75, '3', 'гурван ертөнц'],
    [1.45, '5', 'таван сум · махбод'],
    [1.8, '7', 'долоон гариг'],
    [2.1, '9', 'есөн туг'],
    [2.75, '12', 'арван хоёр жил'],
    [3.35, '99', 'тэнгэр'],
  ];
  const column = 3.85;
  const leaders = [];
  rings.forEach(([r, num, words], k) => {
    const y = 2.1 - k * 0.7;
    const label = numberLabel(num, words, 0.5, false, [0, 0.5]);
    label.position.set(column, y, 0.05);
    group.add(label);
    const a = Math.atan2(y, column);
    leaders.push(r * Math.cos(a), r * Math.sin(a), lift(r), column - 0.08, y, 0.05);
  });
  const lines = new THREE.BufferGeometry();
  lines.setAttribute('position', new THREE.Float32BufferAttribute(leaders, 3));
  const leader = new THREE.LineSegments(
    lines,
    new THREE.LineBasicMaterial({ color: GOLD, transparent: true, opacity: 0, depthWrite: false, depthTest: false }),
  );
  leader.userData.maxOpacity = 0.3;
  group.add(leader);
  return group;
}

function dialLabels() {
  const group = new THREE.Group();
  const names = { 3: 'Хатан', 4: 'Эр хүн', 17: 'Од', 18: 'Сар', 19: 'Нар' };
  for (let j = 1; j <= 22; j++) {
    const a = Math.PI / 2 - ((j - 1) / 22) * Math.PI * 2;
    const on = j in names;
    const r = on ? 3.75 : 3.3;
    const label = on
      ? numberLabel(String(j), names[j], 0.58, true)
      : textSprite([{ text: String(j), size: 52, weight: 600, family: SERIF, color: DIM }], 0.44);
    label.position.set(r * Math.cos(a), r * Math.sin(a), 0.05);
    group.add(label);
  }
  return group;
}

const BUILDERS = { mandala: mandalaLabels, dial: dialLabels };

// Returns { group, index } entries for the chapters that have labels.
export async function createLabels(chapters) {
  try {
    await Promise.all([document.fonts.load(`600 64px ${SERIF}`), document.fonts.load(`500 34px ${SANS}`)]);
  } catch {
    // fall back to whatever fonts are available
  }
  return chapters
    .map((ch, index) => (BUILDERS[ch.shape] ? { group: BUILDERS[ch.shape](), index } : null))
    .filter(Boolean);
}

export function fadeLabels(sets, f) {
  for (const { group, index } of sets) {
    const w = Math.max(0, 1 - Math.abs(f - index) * 3);
    const opacity = w * w;
    group.visible = opacity > 0.001;
    for (const child of group.children) child.material.opacity = opacity * (child.userData.maxOpacity ?? 1);
  }
}
