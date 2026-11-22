// The stars of a figure picture, worked out from its pixels. Used by the figure
// worker (figure-worker.js), so the work never holds up the page, and by gfx.js
// itself where a browser cannot run it in a worker.

// `data` is the picture's RGBA pixels, `S` pixels square. Returns `count` star
// positions where the picture is lit, more where it is brighter, each with the
// picture's own colour there, centred on 0 for a picture `size` units wide; and the
// picture's outline (`matte`, RGBA, its rows bottom first, as a texture takes them).
export function figureFromPixels(data, S, count, size) {
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
  const matte = new Uint8Array(S * S * 4);
  for (let y = 0; y < S; y++) {
    const row = (S - 1 - y) * S;   // the bottom row first
    for (let x = 0; x < S; x++) {
      const v = 255 * Math.min(1, Math.max(0, (soft[y * S + x] - 0.32) / 0.3));
      matte.set([v, v, v, 255], (row + x) * 4);
    }
  }
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
  return { pos, col, matte };
}
