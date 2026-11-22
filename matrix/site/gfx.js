// Small drawing helpers shared by the scene and the matrix: easing, canvas
// textures, light ribbons and a value noise for the land.
import * as THREE from 'three';

export const clamp01 = (x) => Math.min(1, Math.max(0, x));
// 0 before a, 1 after b, linear between
export const seg = (t, a, b) => clamp01((t - a) / (b - a));
export const smooth = (x) => x * x * (3 - 2 * x);
export const easeOut = (x) => 1 - (1 - x) ** 3;
export const easeIn = (x) => x * x * x;
export const easeInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - ((-2 * x + 2) ** 3) / 2);
export const lerp = (a, b, t) => a + (b - a) * t;

function canvas(size, draw) {
  const c = document.createElement('canvas');
  c.width = size; c.height = size;
  draw(c.getContext('2d'), size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// soft round glow, white in the middle
export const glowTexture = () => canvas(128, (g, s) => {
  const grad = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.18, 'rgba(255,255,255,0.75)');
  grad.addColorStop(0.45, 'rgba(255,255,255,0.18)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, s, s);
});

// fine light and dark specks, to keep a large plain surface from looking flat
export const grainTexture = () => canvas(256, (g, s) => {
  g.fillStyle = '#b9b9b9';
  g.fillRect(0, 0, s, s);
  for (let i = 0; i < 9000; i++) {
    const v = 120 + Math.floor(Math.random() * 135);
    g.fillStyle = `rgba(${v},${v},${v},0.5)`;
    g.fillRect(Math.random() * s, Math.random() * s, 1 + Math.random() * 2, 1 + Math.random() * 2);
  }
});

// the round seat of a number, a ringed orb: a dark disc so lines behind do
// not cross the digits, a fine bright ring with a fainter one inside it, a
// little light held within and a soft glow outside
export const seatTexture = () => canvas(256, (g, s) => {
  const c = s / 2;
  const glow = g.createRadialGradient(c, c, s * 0.3, c, c, s * 0.5);
  glow.addColorStop(0, 'rgba(255,255,255,0.3)');
  glow.addColorStop(0.5, 'rgba(255,255,255,0.08)');
  glow.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = glow;
  g.fillRect(0, 0, s, s);
  g.beginPath(); g.arc(c, c, s * 0.33, 0, Math.PI * 2);
  g.fillStyle = 'rgba(9,6,22,0.9)'; g.fill();
  const held = g.createRadialGradient(c, c, 0, c, c, s * 0.33);
  held.addColorStop(0, 'rgba(255,255,255,0)');
  held.addColorStop(0.72, 'rgba(255,255,255,0.03)');
  held.addColorStop(1, 'rgba(255,255,255,0.2)');
  g.fillStyle = held; g.fill();
  g.lineWidth = s * 0.013; g.strokeStyle = 'rgba(255,255,255,1)'; g.stroke();
  g.beginPath(); g.arc(c, c, s * 0.285, 0, Math.PI * 2);
  g.lineWidth = s * 0.005; g.strokeStyle = 'rgba(255,255,255,0.5)'; g.stroke();
});

const numbers = new Map();
// a number drawn as a texture; cached by number and weight
export function numberTexture(n, weight = 500) {
  const key = `${n}/${weight}`;
  if (!numbers.has(key)) {
    numbers.set(key, canvas(128, (g, s) => {
      g.font = `600 ${s * 0.66}px "Cormorant Garamond", Georgia, serif`;
      g.textAlign = 'left'; g.textBaseline = 'alphabetic';
      g.fillStyle = '#fff';
      // Centre the ink itself, not the type's box: this face has old-style figures
      // (a 6 rises, a 9 hangs below the line) and uneven side spaces, so by its box
      // a digit sits off the middle of its seat.
      const m = g.measureText(String(n));
      const x = s / 2 - (m.actualBoundingBoxRight - m.actualBoundingBoxLeft) / 2;
      const y = s / 2 + (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2;
      g.fillText(String(n), x, y);
    }));
  }
  return numbers.get(key);
}

// Points of a text, for the star figure of the amin too: `count` positions
// inside the glyphs, centred on 0, the text `height` world units tall.
export function textPoints(text, count, height, maxWidth) {
  const W = 900; const H = 420;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.font = '600 380px "Cormorant Garamond", Georgia, serif';
  g.textAlign = 'center'; g.textBaseline = 'alphabetic';
  g.fillStyle = '#fff';
  g.fillText(text, W / 2, H * 0.82);
  const data = g.getImageData(0, 0, W, H).data;
  const inside = [];
  let minX = W; let maxX = 0; let minY = H; let maxY = 0;
  for (let y = 0; y < H; y += 2) {
    for (let x = 0; x < W; x += 2) {
      if (data[(y * W + x) * 4 + 3] > 120) {
        inside.push(x, y);
        minX = Math.min(minX, x); maxX = Math.max(maxX, x);
        minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      }
    }
  }
  const out = new Float32Array(count * 3);
  if (!inside.length) return out;
  const scale = Math.min(height / (maxY - minY), maxWidth / (maxX - minX));
  const cx = (minX + maxX) / 2; const cy = (minY + maxY) / 2;
  for (let i = 0; i < count; i++) {
    const k = Math.floor(Math.random() * (inside.length / 2)) * 2;
    out[i * 3] = (inside[k] + Math.random() * 2 - cx) * scale;
    out[i * 3 + 1] = -(inside[k + 1] + Math.random() * 2 - cy) * scale;
    out[i * 3 + 2] = (Math.random() - 0.5) * 0.25;
  }
  return out;
}

// Stars of a figure picture (a figure of starlight on a dark night): `count`
// positions where the picture is lit, more of them where it is brighter, each with
// the picture's own colour there; centred on 0, the square picture `size` units wide.
export function figurePoints(url, count, size) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onerror = () => resolve(null);
    img.onload = () => {
      const S = 512;
      const c = document.createElement('canvas');
      c.width = S; c.height = S;
      const g = c.getContext('2d', { willReadFrequently: true });
      g.drawImage(img, 0, 0, S, S);
      const data = g.getImageData(0, 0, S, S).data;
      const lum = new Float32Array(S * S);
      for (let i = 0; i < S * S; i++) lum[i] = (0.3 * data[i * 4] + 0.55 * data[i * 4 + 1] + 0.15 * data[i * 4 + 2]) / 255;
      // a pixel's weight is its light above the night, and more where the picture has an
      // edge (an outline, the eyes, a wing's feathers): that is what makes the figure read
      const cdf = new Float32Array(S * S);
      let total = 0;
      for (let i = 0; i < S * S; i++) {
        const x = i % S; const y = (i / S) | 0;
        let edge = 0;
        if (x > 0 && y > 0 && x < S - 1 && y < S - 1) {
          const gx = lum[i + 1] - lum[i - 1]; const gy = lum[i + S] - lum[i - S];
          edge = Math.sqrt(gx * gx + gy * gy);
        }
        const light = Math.max(0, lum[i] - 0.13);
        total += light > 0 ? light ** 1.5 + 1.4 * edge * Math.min(1, light * 6) : 0;
        cdf[i] = total;
      }
      // the outline of the figure, for standing it in front of the matrix: lit pixels,
      // smoothed, so small gaps inside the body close and loose specks of dust drop out
      const blur = (src) => {
        const r = 4; const mid = new Float32Array(S * S); const out = new Float32Array(S * S);
        for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
          let sum = 0; for (let d = -r; d <= r; d++) sum += src[y * S + Math.min(S - 1, Math.max(0, x + d))];
          mid[y * S + x] = sum / (2 * r + 1);
        }
        for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
          let sum = 0; for (let d = -r; d <= r; d++) sum += mid[Math.min(S - 1, Math.max(0, y + d)) * S + x];
          out[y * S + x] = sum / (2 * r + 1);
        }
        return out;
      };
      const soft = blur(blur(lum.map((l) => Math.min(1, Math.max(0, (l - 0.05) / 0.05)))));
      const matte = document.createElement('canvas');
      matte.width = S; matte.height = S;
      const mg = matte.getContext('2d');
      const md = mg.createImageData(S, S);
      for (let i = 0; i < S * S; i++) {
        const v = 255 * Math.min(1, Math.max(0, (soft[i] - 0.32) / 0.3));
        md.data.set([v, v, v, 255], i * 4);
      }
      mg.putImageData(md, 0, 0);
      const pos = new Float32Array(count * 3); const col = new Float32Array(count * 3);
      for (let k = 0; k < count; k++) {
        const r = Math.random() * total;
        let lo = 0; let hi = S * S - 1;
        while (lo < hi) { const mid = (lo + hi) >> 1; if (cdf[mid] < r) lo = mid + 1; else hi = mid; }
        const x = (lo % S) + Math.random(); const y = Math.floor(lo / S) + Math.random();
        pos[k * 3] = (x / S - 0.5) * size;
        pos[k * 3 + 1] = -(y / S - 0.5) * size;
        pos[k * 3 + 2] = (Math.random() - 0.5) * 0.2;
        // the picture's colour, lifted to the brightness of a star
        const R = data[lo * 4] / 255; const G = data[lo * 4 + 1] / 255; const B = data[lo * 4 + 2] / 255;
        // and its gold or silver deepened: many stars over one another wash out towards white
        const peak = Math.max(R, G, B, 0.05);
        const lift = 1.1 / peak;
        const grey = (R + G + B) / 3;
        const deep = (v) => Math.max(0, grey + (v - grey) * 1.8) * lift;
        col.set([deep(R), deep(G), deep(B)], k * 3);
      }
      resolve({ pos, col, image: img, matte, size });
    };
    img.src = url;
  });
}

// A flat strip along a path in the XY plane; uv.x runs 0..1 along it.
export function ribbon(points, width) {
  const n = points.length;
  const lengths = [0];
  for (let i = 1; i < n; i++) lengths.push(lengths[i - 1] + points[i].distanceTo(points[i - 1]));
  const total = lengths[n - 1];
  const pos = new Float32Array(n * 6);
  const uv = new Float32Array(n * 4);
  const index = [];
  for (let i = 0; i < n; i++) {
    const a = points[Math.max(0, i - 1)];
    const b = points[Math.min(n - 1, i + 1)];
    const tx = b.x - a.x; const ty = b.y - a.y;
    const len = Math.hypot(tx, ty) || 1;
    const nx = (-ty / len) * width * 0.5; const ny = (tx / len) * width * 0.5;
    pos.set([points[i].x + nx, points[i].y + ny, 0, points[i].x - nx, points[i].y - ny, 0], i * 6);
    uv.set([lengths[i] / total, 0, lengths[i] / total, 1], i * 4);
    if (i < n - 1) index.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.setIndex(index);
  return geo;
}

// A line of light: drawn up to uProgress, with a bright head while it grows
// and a pulse that can run along it. The light has a source, the heart of the
// matrix: a line is brightest near it and falls off outward. uDim is shared
// by every line.
export function lightMaterial(color, dim) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uProgress: { value: 0 },
      uOpacity: { value: 1 },
      uPulse: { value: -1 },
      uPulseAmp: { value: 0 },
      uDim: dim,
    },
    vertexShader: 'varying vec2 vUv; varying vec2 vP; void main(){ vUv = uv; vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `
      varying vec2 vP;
      uniform vec3 uColor; uniform float uProgress; uniform float uOpacity; uniform float uPulse; uniform float uPulseAmp; uniform float uDim;
      varying vec2 vUv;
      void main(){
        float across = 1.0 - abs(vUv.y * 2.0 - 1.0);
        float core = smoothstep(0.0, 0.85, across);
        float shown = 1.0 - smoothstep(uProgress - 0.012, uProgress, vUv.x);
        float growing = step(0.001, uProgress) * step(uProgress, 0.999);
        float head = exp(-pow((vUv.x - uProgress) * 26.0, 2.0)) * growing;
        float pulse = exp(-pow((vUv.x - uPulse) * 11.0, 2.0)) * uPulseAmp * shown;
        float a = core * (shown * uOpacity + head) * uDim;
        float far = length(vP);
        float near = 0.6 + 0.55 * exp(-far * 0.5);
        // eight lines meet at the heart; each fades as it nears it, so the
        // heart stays one clean point of light and not a knot of strokes
        float rise = 0.08 + 0.92 * smoothstep(0.12, 0.85, far);
        vec3 col = uColor * near * (1.0 + 3.0 * head + 3.5 * pulse);
        gl_FragColor = vec4(col * a + uColor * pulse * core * uDim, a) * rise;
      }`,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.CustomBlending,
    blendEquation: THREE.AddEquation,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneFactor,
  });
}

// value noise, for hills
const hash = (x, y) => {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
};
function noise(x, y) {
  const ix = Math.floor(x); const iy = Math.floor(y);
  const fx = x - ix; const fy = y - iy;
  const u = fx * fx * (3 - 2 * fx); const v = fy * fy * (3 - 2 * fy);
  return lerp(lerp(hash(ix, iy), hash(ix + 1, iy), u), lerp(hash(ix, iy + 1), hash(ix + 1, iy + 1), u), v);
}
export function fbm(x, y, octaves = 4) {
  let sum = 0; let amp = 0.5; let f = 1;
  for (let i = 0; i < octaves; i++) { sum += noise(x * f, y * f) * amp; amp *= 0.5; f *= 2.03; }
  return sum;
}
