// Particle shapes for each chapter of the scroll story.
// Every builder fills exactly `count` points (position + colour), so the
// vertex shader can morph point i of one shape into point i of the next.

const TAU = Math.PI * 2;

function mulberry32(seed) {
  return function () {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let rnd = mulberry32(1);

const gauss = () => {
  let u = 0;
  while (u === 0) u = rnd();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * rnd());
};
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const hex = (h) => {
  const n = parseInt(h.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

class PointSet {
  constructor(count) {
    this.count = count;
    this.pos = new Float32Array(count * 3);
    this.col = new Float32Array(count * 3);
    this.n = 0;
  }

  share(fraction) {
    return Math.floor(this.count * fraction);
  }

  add(x, y, z, c, k = 1) {
    if (this.n >= this.count) return;
    const i = this.n++ * 3;
    this.pos[i] = x;
    this.pos[i + 1] = y;
    this.pos[i + 2] = z;
    this.col[i] = c[0] * k;
    this.col[i + 1] = c[1] * k;
    this.col[i + 2] = c[2] * k;
  }

  finish() {
    // Points a shape does not need become faint background stars.
    const dim = hex('#9fb4ff');
    while (this.n < this.count) {
      this.add((rnd() * 2 - 1) * 11, (rnd() * 2 - 1) * 7, -2 - rnd() * 10, dim, 0.1 + rnd() * 0.25);
    }
    // Sort left → right so neighbouring points travel together between shapes.
    const keys = new Float32Array(this.count);
    const order = new Uint32Array(this.count);
    for (let i = 0; i < this.count; i++) {
      keys[i] = this.pos[i * 3] + (rnd() - 0.5) * 1.2;
      order[i] = i;
    }
    order.sort((a, b) => keys[a] - keys[b]);
    const pos = new Float32Array(this.count * 3);
    const col = new Float32Array(this.count * 3);
    order.forEach((src, dst) => {
      pos.set(this.pos.subarray(src * 3, src * 3 + 3), dst * 3);
      col.set(this.col.subarray(src * 3, src * 3 + 3), dst * 3);
    });
    return { pos, col };
  }
}

// ---------- primitives ----------

function cluster(s, n, x, y, z, r, c, k = 1) {
  for (let i = 0; i < n; i++) s.add(x + gauss() * r, y + gauss() * r, z + gauss() * r, c, k * (0.6 + rnd() * 0.5));
}

function segment(s, n, a, b, c, k = 1, jitter = 0.02) {
  for (let i = 0; i < n; i++) {
    const t = rnd();
    s.add(
      a[0] + (b[0] - a[0]) * t + gauss() * jitter,
      a[1] + (b[1] - a[1]) * t + gauss() * jitter,
      a[2] + (b[2] - a[2]) * t + gauss() * jitter,
      c,
      k * (0.7 + rnd() * 0.4),
    );
  }
}

// Ring in the xz plane (horizontal) or xy plane (facing the camera).
function ring(s, n, r, c, k = 1, { y = 0, plane = 'xz', jitter = 0.02 } = {}) {
  for (let i = 0; i < n; i++) {
    const a = rnd() * TAU;
    const rr = r + gauss() * jitter;
    if (plane === 'xz') s.add(Math.cos(a) * rr, y + gauss() * jitter, Math.sin(a) * rr, c, k * (0.7 + rnd() * 0.4));
    else s.add(Math.cos(a) * rr, Math.sin(a) * rr, gauss() * jitter, c, k * (0.7 + rnd() * 0.4));
  }
}

function disc(s, n, r, y, c, k = 1) {
  for (let i = 0; i < n; i++) {
    const a = rnd() * TAU;
    const rr = r * Math.sqrt(rnd());
    s.add(Math.cos(a) * rr, y + gauss() * 0.03, Math.sin(a) * rr, c, k * (0.5 + rnd() * 0.5));
  }
}

// ---------- silhouettes ----------

// Paths live in a 200 × 200 box.
const WOLF = [
  // sitting, head raised in a howl, facing right
  'M142 6 L124 36 L138 25 L131 44 C126 60 125 84 132 104 C135 116 134 128 132 138 L134 162 L137 186 L146 190 L146 195 L125 195 L122 186 L119 156 L114 150 C111 162 105 178 110 190 L113 195 L82 195 L42 196 C22 197 12 189 20 182 C32 176 46 181 56 173 C49 150 54 122 66 102 C76 86 88 72 95 58 C97 50 96 44 94 38 L88 15 L105 29 L114 24 Z',
];

const DOE = [
  // standing doe (no antlers), head up, facing left
  'M18 56 C20 48 28 42 38 40 L44 32 C36 22 34 12 40 8 C46 14 48 24 50 30 L54 30 C52 20 56 10 62 8 C66 16 62 26 60 34 C64 48 68 62 76 78 C82 88 92 92 106 92 C126 90 146 88 162 92 L172 96 L168 106 C170 116 166 128 160 136 L162 160 L168 186 L168 191 L158 191 L152 162 L150 142 C136 138 112 140 96 136 L94 162 L96 188 L96 191 L86 191 L84 162 L80 140 C72 126 62 104 52 84 C46 72 36 64 28 62 Z',
  // far-side legs
  'M104 134 L108 162 L110 188 L110 191 L101 191 L99 162 L94 136 Z',
  'M140 138 L144 162 L150 188 L150 191 L141 191 L136 162 L134 140 Z',
];

const rasterCache = new Map();

function rasterize(paths, res = 320) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = res;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.scale(res / 200, res / 200);
  ctx.fillStyle = '#fff';
  for (const d of paths) ctx.fill(new Path2D(d));
  const alpha = ctx.getImageData(0, 0, res, res).data;

  // A blurred copy approximates the distance to the outline, which gives
  // the flat silhouette a rounded, "pillow" depth.
  const soft = document.createElement('canvas');
  soft.width = soft.height = res;
  const sctx = soft.getContext('2d', { willReadFrequently: true });
  sctx.filter = `blur(${Math.round(res / 30)}px)`;
  sctx.drawImage(canvas, 0, 0);
  const blur = sctx.getImageData(0, 0, res, res).data;

  const at = (x, y) => (x < 0 || y < 0 || x >= res || y >= res ? 0 : alpha[(y * res + x) * 4 + 3]);
  const inside = [];
  const edge = [];
  for (let y = 0; y < res; y++) {
    for (let x = 0; x < res; x++) {
      if (at(x, y) < 128) continue;
      const i = y * res + x;
      inside.push(i);
      if (at(x - 2, y) < 128 || at(x + 2, y) < 128 || at(x, y - 2) < 128 || at(x, y + 2) < 128) edge.push(i);
    }
  }
  const depth = (i) => clamp01((blur[i * 4 + 3] / 255 - 0.5) * 2);
  return { res, inside, edge, depth };
}

function raster(name, paths) {
  if (!rasterCache.has(name)) rasterCache.set(name, rasterize(paths));
  return rasterCache.get(name);
}

function silhouette(s, sil, n, o) {
  const { res, inside, edge, depth } = sil;
  for (let k = 0; k < n; k++) {
    const onEdge = rnd() < 0.36;
    const list = onEdge ? edge : inside;
    const i = list[(rnd() * list.length) | 0];
    const px = (i % res) + rnd();
    const py = ((i / res) | 0) + rnd();
    const d = depth(i);
    const x = o.x + (px / res - 0.5) * o.size;
    const y = o.y + (0.5 - py / res) * o.size;
    const shell = rnd() < 0.7 ? (rnd() < 0.5 ? -1 : 1) : rnd() * 2 - 1;
    const z = shell * o.thick * Math.sqrt(Math.max(d, 0.04));
    if (onEdge) s.add(x, y, z, o.edge, 0.95);
    else s.add(x, y, z, mix(o.fill, o.edge, rnd() * 0.35), 0.45 + 0.35 * d);
  }
}

// ---------- chapters ----------

const BUILDERS = {
  // Тэнгэр: the Milky Way ("Тэнгэрийн оёдол") and loose stars
  stars(s) {
    const band = s.share(0.55);
    const a = 0.5; // matches the roll of the Milky Way dome in cosmos.js
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    const cool = hex('#cdd8ff');
    const warm = hex('#ffd9c4');
    for (let k = 0; k < band; k++) {
      const u = (rnd() * 2 - 1) * 12;
      const v = gauss() * 0.6 * (1 - (0.45 * Math.abs(u)) / 12);
      // faint sparkle over the photographed Milky Way, not a band of its own
      const bright = rnd() < 0.02 ? 0.9 : 0.12 + rnd() * 0.25;
      s.add(ca * u - sa * v, sa * u + ca * v, -2.5 - rnd() * 7, mix(cool, warm, rnd() * 0.5), bright);
    }
    const loose = s.share(0.3);
    for (let k = 0; k < loose; k++) {
      s.add((rnd() * 2 - 1) * 11, (rnd() * 2 - 1) * 6.5, -1 - rnd() * 9, cool, 0.15 + rnd() * 0.35);
    }
  },

  // Бөртэ чоно
  wolf(s) {
    silhouette(s, raster('wolf', WOLF), s.share(0.84), {
      x: 0.45, y: -0.15, size: 5.4, thick: 0.55, edge: hex('#e8f0ff'), fill: hex('#7ea4ea'),
    });
  },

  // Бөртэ чоно ба Гуа марал — sky and earth
  pair(s) {
    silhouette(s, raster('wolf', WOLF), s.share(0.4), {
      x: -1.55, y: -0.2, size: 4.1, thick: 0.45, edge: hex('#e8f0ff'), fill: hex('#7ea4ea'),
    });
    silhouette(s, raster('doe', DOE), s.share(0.4), {
      x: 2.05, y: -0.15, size: 4.3, thick: 0.45, edge: hex('#ffe6c2'), fill: hex('#e89a62'),
    });
    const ground = hex('#bcd58c');
    const nGround = s.share(0.07);
    for (let k = 0; k < nGround; k++) s.add(gauss() * 2.2, -2.2 + gauss() * 0.04, gauss() * 0.6, ground, 0.3 + rnd() * 0.3);
    // a thread of light between the two heads
    const gold = hex('#ffd98a');
    const nArc = s.share(0.04);
    for (let k = 0; k < nArc; k++) {
      const t = rnd();
      const x = (1 - t) * (1 - t) * -0.65 + 2 * (1 - t) * t * 0 + t * t * 0.45;
      const y = (1 - t) * (1 - t) * 1.85 + 2 * (1 - t) * t * 3.1 + t * t * 1.55;
      s.add(x + gauss() * 0.025, y + gauss() * 0.025, gauss() * 0.03, gold, 0.9);
    }
  },

  // Тэнгис: night sea, a moon, the pair crossing
  sea(s) {
    const deep = hex('#123d70');
    const teal = hex('#3fb3d8');
    const foam = hex('#d9f4ff');
    const moonC = hex('#fff1c9');
    const nWater = s.share(0.7);
    for (let k = 0; k < nWater; k++) {
      const x = (rnd() * 2 - 1) * 8;
      const z = 2.5 - Math.pow(rnd(), 0.8) * 10;
      const h = 0.2 * Math.sin(1.1 * x + 0.8 * z) + 0.12 * Math.sin(2.3 * x - 1.6 * z) + 0.05 * Math.sin(5.1 * x + 3.7 * z);
      const t = clamp01((h + 0.35) / 0.7);
      let c = mix(deep, teal, t);
      let b = 0.3 + 0.45 * t;
      if (h > 0.24 && rnd() < 0.6) {
        c = foam;
        b = 0.85;
      }
      if (Math.abs(x) < 0.22 + (2.5 - z) * 0.05 && rnd() < 0.55) {
        c = moonC;
        b = 0.95;
      }
      s.add(x, -1.3 + h, z, c, b);
    }
    const nMoon = s.share(0.09);
    for (let k = 0; k < nMoon; k++) {
      const a = rnd() * TAU;
      const r = rnd() < 0.35 ? 0.85 + gauss() * 0.02 : 0.85 * Math.sqrt(rnd());
      s.add(Math.cos(a) * r, 2.2 + Math.sin(a) * r, -6.5 + gauss() * 0.05, moonC, 0.8);
    }
    silhouette(s, raster('wolf', WOLF), s.share(0.05), {
      x: -0.55, y: -0.55, size: 1.2, thick: 0.12, edge: hex('#e8f0ff'), fill: hex('#7ea4ea'),
    });
    silhouette(s, raster('doe', DOE), s.share(0.05), {
      x: 0.55, y: -0.55, size: 1.25, thick: 0.12, edge: hex('#ffe6c2'), fill: hex('#e89a62'),
    });
  },

  // Бурхан Халдун and the source of the Onon river
  mountain(s) {
    const H = (x, z) =>
      3.0 * Math.exp(-((x + 0.2) ** 2) / 2.4 - ((z + 2) ** 2) / 3.2) +
      1.7 * Math.exp(-((x - 3.3) ** 2) / 2 - ((z + 1.4) ** 2) / 2.6) +
      1.4 * Math.exp(-((x + 3.7) ** 2) / 2.6 - ((z + 2.4) ** 2) / 2.6) +
      0.12 * Math.sin(2.7 * x + 1.3) * Math.cos(2.1 * z);
    const base = -1.7;
    const low = hex('#1a3550');
    const mid = hex('#3d7d8f');
    const high = hex('#f5e3b3');
    const nLand = s.share(0.78);
    for (let k = 0; k < nLand; k++) {
      const x = (rnd() * 2 - 1) * 7.5;
      const z = 1.8 - rnd() * 6;
      const h = Math.max(0, H(x, z));
      const t = clamp01(h / 3);
      const c = t < 0.5 ? mix(low, mid, t * 2) : mix(mid, high, (t - 0.5) * 2);
      s.add(x, base + h, z, c, 0.3 + 0.6 * t);
    }
    const river = hex('#8fe6ff');
    const nRiver = s.share(0.1);
    for (let k = 0; k < nRiver; k++) {
      const t = rnd();
      const x = -0.2 + 5.5 * t + 0.6 * Math.sin(t * 9) + gauss() * 0.05 * (1 + t);
      const z = -0.2 + 2.0 * t + gauss() * 0.05 * (1 + t);
      s.add(x, base + Math.max(0, H(x, z)) + 0.04, z, river, 0.9);
    }
    const sky = hex('#cdd8ff');
    const nSky = s.share(0.06);
    for (let k = 0; k < nSky; k++) s.add((rnd() * 2 - 1) * 9, 1.6 + rnd() * 4, -6 - rnd() * 3, sky, 0.3 + rnd() * 0.5);
  },

  // Алан гуа: a ger with light falling through the toono
  ger(s) {
    const R = 1.75;
    const base = -1.45;
    const wallH = 1.15;
    const top = base + wallH;
    const roofY = top + 0.9;
    const rT = 0.33;
    const lattice = hex('#e9d6ab');
    const pole = hex('#d9ae5f');
    const felt = hex('#8c7a57');
    const toono = hex('#ffe9a6');
    const door = hex('#ffad55');
    const beam = hex('#fff4cc');

    const nLattice = s.share(0.25);
    const K = 56;
    for (let k = 0; k < nLattice; k++) {
      const j = (rnd() * K) | 0;
      const dir = rnd() < 0.5 ? -1 : 1;
      const t = rnd();
      const a = (j / K) * TAU + dir * t * 0.42;
      s.add(R * Math.cos(a), base + t * wallH, R * Math.sin(a), lattice, 0.5);
    }
    const nWall = s.share(0.06);
    for (let k = 0; k < nWall; k++) {
      const a = rnd() * TAU;
      s.add(R * 1.01 * Math.cos(a), base + rnd() * wallH, R * 1.01 * Math.sin(a), felt, 0.3);
    }
    const nPoles = s.share(0.2);
    const P = 72;
    for (let k = 0; k < nPoles; k++) {
      const a = (((rnd() * P) | 0) / P) * TAU;
      const t = rnd();
      const r = R + (rT - R) * t;
      s.add(r * Math.cos(a), top + (roofY - top) * t, r * Math.sin(a), pole, 0.5);
    }
    const nRoof = s.share(0.05);
    for (let k = 0; k < nRoof; k++) {
      const a = rnd() * TAU;
      const t = rnd();
      const r = R + (rT - R) * t;
      s.add(r * Math.cos(a), top + (roofY - top) * t + 0.02, r * Math.sin(a), felt, 0.3);
    }
    const nToono = s.share(0.05);
    for (let k = 0; k < nToono; k++) {
      if (rnd() < 0.65) {
        const a = rnd() * TAU;
        s.add(rT * Math.cos(a), roofY, rT * Math.sin(a), toono, 0.9);
      } else {
        const u = rnd() * 2 - 1;
        const y = roofY + 0.14 * (1 - u * u);
        if (rnd() < 0.5) s.add(u * rT, y, 0, toono, 1.1);
        else s.add(0, y, u * rT, toono, 1.1);
      }
    }
    const nDoor = s.share(0.04);
    for (let k = 0; k < nDoor; k++) {
      const a = Math.PI / 2 + (rnd() - 0.5) * 0.36;
      s.add(R * 1.02 * Math.cos(a), base + rnd() * 0.95, R * 1.02 * Math.sin(a), door, 0.7);
    }
    const nBeam = s.share(0.17);
    for (let k = 0; k < nBeam; k++) {
      const a = rnd() * TAU;
      let y;
      let r;
      if (rnd() < 0.7) {
        const t = Math.pow(rnd(), 0.7);
        y = roofY + t * 6.5;
        r = rT * 0.9 * Math.sqrt(rnd()) * (1 + t * 0.6);
      } else {
        y = roofY - rnd() * (roofY - base);
        r = rT * (1 + (roofY - y) * 0.35) * Math.sqrt(rnd());
      }
      s.add(r * Math.cos(a), y, r * Math.sin(a), beam, 0.35 + 0.4 * (1 - r / (rT * 1.6)));
    }
    disc(s, s.share(0.04), 0.9, base, hex('#ffcf7a'), 0.6);
  },

  // Таван сум — five arrows bound together
  arrows(s) {
    const shaft = hex('#e7bf7a');
    const head = hex('#dfe8ff');
    const fletchA = hex('#ff7d5c');
    const fletchB = hex('#f6e6c8');
    const tie = hex('#ffd36b');
    const knot = 0.25;
    const L0 = -2.6;
    const L1 = 2.5;
    const radius = (y) => 0.07 + 0.11 * Math.abs(y - knot);
    const dirs = [0, 1, 2, 3, 4].map((j) => (j / 5) * TAU + 0.35);

    const nShaft = s.share(0.4);
    for (let k = 0; k < nShaft; k++) {
      const a = dirs[k % 5];
      const y = L0 + rnd() * (L1 - L0);
      const r = radius(y);
      // five shafts crowd together at the knot, so dim them there
      const glow = 0.2 + 0.4 * Math.min(1, Math.abs(y - knot) / 0.8);
      s.add(r * Math.cos(a) + gauss() * 0.008, y, r * Math.sin(a) + gauss() * 0.008, shaft, glow);
    }
    const nHead = s.share(0.12);
    for (let k = 0; k < nHead; k++) {
      const a = dirs[k % 5];
      const t = rnd();
      const w = 0.13 * Math.sin(Math.PI * Math.pow(t, 0.6)) * (1 - t * 0.2);
      const off = (rnd() * 2 - 1) * w;
      const r = radius(L1);
      s.add(r * Math.cos(a) - Math.sin(a) * off, L1 + t * 0.62, r * Math.sin(a) + Math.cos(a) * off, head, 0.8);
    }
    const nFletch = s.share(0.16);
    for (let k = 0; k < nFletch; k++) {
      const a = dirs[k % 5];
      const vane = (rnd() * 3) | 0;
      const t = rnd();
      const y = L0 + 0.12 + t * 0.85;
      const d = rnd() * 0.16 * Math.pow(Math.sin(Math.PI * t), 0.7);
      const av = a + (vane * TAU) / 3;
      const r = radius(y);
      s.add(r * Math.cos(a) + Math.cos(av) * d, y + d * 0.4, r * Math.sin(a) + Math.sin(av) * d, vane === 0 ? fletchA : fletchB, 0.7);
    }
    const nTie = s.share(0.07);
    for (let k = 0; k < nTie; k++) {
      const t = rnd();
      const a = t * 7 * TAU;
      const r = 0.15 + gauss() * 0.01;
      s.add(r * Math.cos(a), knot - 0.18 + t * 0.36, r * Math.sin(a), tie, 0.45);
    }
    const nDust = s.share(0.06);
    for (let k = 0; k < nDust; k++) {
      const a = rnd() * TAU;
      const r = 0.8 + rnd() * 2.2;
      s.add(r * Math.cos(a), gauss() * 1.4, r * Math.sin(a), tie, 0.25 + rnd() * 0.3);
    }
  },

  // Гурван ертөнц, 99 тэнгэр
  worlds(s) {
    const white = hex('#eef4ff');
    const black = hex('#7a6cff');
    const yU = 2.1;
    const yL = -2.1;
    const nTengri = s.share(0.26);
    const per = Math.floor(nTengri / 99);
    for (let t = 0; t < 99; t++) {
      // facing south, west is on the right: 55 white tengri west, 44 black tengri east
      const west = t < 55;
      const a = west ? -Math.PI / 2 + ((t + 0.5) / 55) * Math.PI : Math.PI / 2 + ((t - 55 + 0.5) / 44) * Math.PI;
      cluster(s, per, 2.7 * Math.cos(a), yU, 2.7 * Math.sin(a), 0.045, west ? white : black, west ? 1.0 : 1.15);
    }
    disc(s, s.share(0.06), 2.7, yU, hex('#8fb0ff'), 0.25);
    ring(s, s.share(0.08), 2.1, hex('#a8e0a0'), 0.7, { y: 0 });
    disc(s, s.share(0.08), 2.1, 0, hex('#ead79a'), 0.3);
    ring(s, s.share(0.07), 1.6, hex('#c84a62'), 0.75, { y: yL });
    disc(s, s.share(0.05), 1.6, yL, hex('#8a2f4a'), 0.35);
    const axis = hex('#ffe7a8');
    const nAxis = s.share(0.08);
    for (let k = 0; k < nAxis; k++) {
      const a = rnd() * TAU;
      const r = 0.05 * Math.sqrt(rnd());
      s.add(r * Math.cos(a), -2.8 + rnd() * 6.2, r * Math.sin(a), axis, 1.0);
    }
    // the shaman's path between the worlds
    const path = hex('#ffcf8a');
    const nPath = s.share(0.07);
    for (let k = 0; k < nPath; k++) {
      const t = rnd();
      const a = t * 5 * TAU;
      s.add(0.55 * Math.cos(a) + gauss() * 0.02, yL + t * (yU - yL), 0.55 * Math.sin(a) + gauss() * 0.02, path, 0.8);
    }
  },

  // Тоон мандал: 1, 3, 5, 9, 12, 99
  mandala(s) {
    const gold = hex('#ffd98a');
    const blue = hex('#9fd0ff');
    const amber = hex('#ffcf8a');
    const white = hex('#eef4ff');
    const jade = hex('#8fe6c8');
    const lift = (r) => -0.12 * r;
    const polygon = (n, r, step, share, c, k, rot = Math.PI / 2) => {
      const total = s.share(share);
      for (let j = 0; j < n; j++) {
        const a0 = rot + (j / n) * TAU;
        const a1 = rot + (((j + step) % n) / n) * TAU;
        segment(s, Math.floor(total / n), [r * Math.cos(a0), r * Math.sin(a0), lift(r)], [r * Math.cos(a1), r * Math.sin(a1), lift(r)], c, k, 0.015);
      }
    };
    cluster(s, s.share(0.04), 0, 0, 0, 0.09, gold, 1.4);
    polygon(3, 0.75, 1, 0.1, blue, 0.8);
    polygon(5, 1.45, 2, 0.14, amber, 0.75);
    // 7 planets of the week: Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn
    const planets = ['#ffd36b', '#e9efff', '#ff7a4d', '#9fe3c8', '#ffcf9a', '#fff1c9', '#d8c08e'].map(hex);
    const seven = Math.floor(s.share(0.05) / 7);
    for (let j = 0; j < 7; j++) {
      const a = Math.PI / 2 + (j / 7) * TAU;
      cluster(s, seven, 1.8 * Math.cos(a), 1.8 * Math.sin(a), lift(1.8), 0.07, planets[j], 1.2);
    }
    const nine = Math.floor(s.share(0.09) / 9);
    for (let j = 0; j < 9; j++) {
      const a = Math.PI / 2 + (j / 9) * TAU;
      cluster(s, nine, 2.1 * Math.cos(a), 2.1 * Math.sin(a), lift(2.1), 0.06, white, 1.1);
    }
    ring(s, s.share(0.05), 2.1, white, 0.35, { plane: 'xy', jitter: 0.012 });
    const twelve = Math.floor(s.share(0.12) / 12);
    for (let j = 0; j < 12; j++) {
      const a = Math.PI / 2 + (j / 12) * TAU;
      cluster(s, twelve, 2.75 * Math.cos(a), 2.75 * Math.sin(a), lift(2.75), 0.08, jade, 0.9);
    }
    ring(s, s.share(0.04), 2.75, jade, 0.3, { plane: 'xy', jitter: 0.012 });
    const ninetyNine = Math.floor(s.share(0.1) / 99);
    for (let j = 0; j < 99; j++) {
      const a = Math.PI / 2 + (j / 99) * TAU;
      cluster(s, ninetyNine, 3.35 * Math.cos(a), 3.35 * Math.sin(a), lift(3.35), 0.025, gold, 0.8);
    }
  },

  // 22 зам
  dial(s) {
    const linked = new Set([3, 4, 17, 18, 19]);
    const R = 2.7;
    const per = Math.floor(s.share(0.44) / 22);
    const warm = hex('#ffb85c');
    const cool = hex('#e9efff');
    for (let j = 1; j <= 22; j++) {
      const a = Math.PI / 2 - ((j - 1) / 22) * TAU;
      const on = linked.has(j);
      cluster(s, per, R * Math.cos(a), R * Math.sin(a), 0, on ? 0.085 : 0.065, on ? warm : cool, on ? 1.35 : 0.85);
      if (on) segment(s, s.share(0.015), [0, 0, 0], [R * 0.9 * Math.cos(a), R * 0.9 * Math.sin(a), 0], warm, 0.45, 0.01);
    }
    ring(s, s.share(0.08), R, cool, 0.28, { plane: 'xy', jitter: 0.01 });
    ring(s, s.share(0.05), R * 0.62, hex('#9fb4ff'), 0.25, { plane: 'xy', jitter: 0.01 });
    cluster(s, s.share(0.08), 0, 0, 0, 0.28, hex('#ffd98a'), 0.7);
  },
};

export function buildShape(name, count) {
  const build = BUILDERS[name];
  if (!build) throw new Error(`Unknown shape: ${name}`);
  rnd = mulberry32(name.length * 7919 + count);
  const set = new PointSet(count);
  build(set);
  return set.finish();
}
