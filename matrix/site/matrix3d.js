// The matrix drawn in light: the ring and eight spokes that the toono turns
// into, the rhombus and the square, the numbers of one person, the age ring
// and the amin too formed out of stars. Each line is a hairline of light with
// a path of tiny stars along it; gold for the upright cross, lavender for
// the slanted one, on the violet night of the film.
import * as THREE from 'three';
import { AROUND } from '../matrix.js';
import { easeInOut, easeOut, glowTexture, lightMaterial, numberTexture, ribbon, seatTexture, seg, textPoints } from './gfx.js';

export const R = 4;
// a phone draws the figure with fewer stars: the picture carries the detail
export const PHONE = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches
  && Math.min(window.innerWidth, window.innerHeight) < 700;
export const FIGURE_STARS = PHONE ? 24000 : 40000;
export const REVEAL_T = 7.4; // seconds the numbers take to appear
const DEG = Math.PI / 180;
const ANGLE = { left: 180, tl: 135, top: 90, tr: 45, right: 0, br: -45, bottom: -90, bl: -135 };
const AXES = ['left', 'top', 'right', 'bottom'];
const DIAGONALS = ['tl', 'tr', 'br', 'bl'];
const GOLD = new THREE.Color(1.0, 0.76, 0.42);
const SILVER = new THREE.Color(0.72, 0.64, 1.0); // lavender, the cool light of the film's sky
const ROSE = new THREE.Color(1.0, 0.55, 0.5);
const PALE = new THREE.Color(1.0, 0.93, 0.8);
// where the five numbers of a line sit, as a share of the way out from the centre
const STEPS = [['mid', 0.85], ['inner', Math.SQRT1_2], ['step1', 0.53], ['step2', 0.37], ['step3', 0.215]];

const on = (key, f = 1) => new THREE.Vector3(Math.cos(ANGLE[key] * DEG) * R * f, Math.sin(ANGLE[key] * DEG) * R * f, 0);
const bump = (s, t0) => (s < t0 ? 0 : Math.exp(-(s - t0) * 3.5));

export function createMatrix() {
  const group = new THREE.Group();
  const dim = { value: 1 };
  const glow = glowTexture();
  const seatMap = seatTexture();

  const lines = [];
  function line(points, color, width = 0.042) {
    const mesh = new THREE.Mesh(ribbon(points, width), lightMaterial(color, dim));
    mesh.renderOrder = 1;
    group.add(mesh);
    const l = { mesh, u: mesh.material.uniforms, points, color };
    lines.push(l);
    return l;
  }
  const centre = new THREE.Vector3();
  const spokes = Object.fromEntries(AROUND.map((key) => [key, line([centre, on(key)], AXES.includes(key) ? GOLD : SILVER)]));
  const ring = line(Array.from({ length: 181 }, (_, i) => {
    const a = (180 - i * 2) * DEG; // from the left point, clockwise, the way age runs
    return new THREE.Vector3(Math.cos(a) * R, Math.sin(a) * R, 0);
  }), PALE, 0.05);
  const rhombus = AXES.map((key, i) => line([on(key), on(AXES[(i + 1) % 4])], GOLD));
  const square = DIAGONALS.map((key, i) => line([on(key), on(DIAGONALS[(i + 1) % 4])], SILVER));
  const loveFrom = on('bottom', Math.SQRT1_2);
  const loveTo = on('right', Math.SQRT1_2);
  const love = line([loveFrom, loveTo], ROSE, 0.05);

  // ── star dust: every line is also a path of tiny stars, thick in places and
  // thin in others, most hugging the line and a few straying from it. In the
  // opening they hang free like the stars that came down through the toono,
  // and then each finds its place, those nearest the heart first.
  const dust = { pos: [], from: [], col: [], seed: [], size: [], kind: [] };
  let rs = 20261120;
  const rand = () => { rs = (rs * 1664525 + 1013904223) >>> 0; return rs / 4294967296; };
  for (const l of lines) {
    const pts = l.points;
    const acc = [0];
    for (let i = 1; i < pts.length; i++) acc.push(acc[i - 1] + pts[i].distanceTo(pts[i - 1]));
    const total = acc[acc.length - 1];
    const wave = rand() * 6.283;
    for (let n = Math.round(total * 34); n > 0; n--) {
      let t = rand();
      if (rand() > 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(t * total * 2.3 + wave))) t = rand();
      const d = t * total;
      let i = 1;
      while (i < acc.length - 1 && acc[i] < d) i++;
      const a = pts[i - 1]; const b = pts[i];
      const f = (d - acc[i - 1]) / ((acc[i] - acc[i - 1]) || 1);
      const tx = b.x - a.x; const ty = b.y - a.y; const len = Math.hypot(tx, ty) || 1;
      const off = rand() * 2 - 1;
      const stray = Math.sign(off) * off * off * (rand() < 0.14 ? 0.3 : 0.06);
      dust.pos.push(a.x + tx * f + (-ty / len) * stray, a.y + ty * f + (tx / len) * stray, (rand() - 0.5) * 0.1);
      const ang = rand() * 6.283; const rad = 3 + rand() * 13;
      dust.from.push(Math.cos(ang) * rad * 1.2, Math.sin(ang) * rad, -8 + rand() * 10);
      const v = 0.7 + rand() * 0.6;
      dust.col.push(l.color.r * v, l.color.g * v, l.color.b * v);
      dust.seed.push(rand()); dust.size.push(rand() ** 3); dust.kind.push(l === love ? 1 : 0);
    }
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.Float32BufferAttribute(dust.pos, 3));
  dustGeo.setAttribute('aFrom', new THREE.Float32BufferAttribute(dust.from, 3));
  dustGeo.setAttribute('aColor', new THREE.Float32BufferAttribute(dust.col, 3));
  dustGeo.setAttribute('aSeed', new THREE.Float32BufferAttribute(dust.seed, 1));
  dustGeo.setAttribute('aSize', new THREE.Float32BufferAttribute(dust.size, 1));
  dustGeo.setAttribute('aKind', new THREE.Float32BufferAttribute(dust.kind, 1));
  const dustMat = new THREE.ShaderMaterial({
    uniforms: {
      uGather: { value: 1 }, uShow: { value: 1 }, uFall: { value: 0 }, uTime: { value: 0 },
      uProj: { value: 600 }, uLove: { value: 0 }, uPainted: { value: 0 }, uDim: dim,
    },
    vertexShader: `
      attribute vec3 aFrom; attribute vec3 aColor; attribute float aSeed; attribute float aSize; attribute float aKind;
      uniform float uGather; uniform float uShow; uniform float uFall; uniform float uTime; uniform float uProj; uniform float uLove; uniform float uPainted;
      varying vec3 vC; varying float vA;
      void main(){
        float delay = 0.5 * clamp(length(position.xy) / 4.6, 0.0, 1.0) + 0.12 * aSeed;
        float k = smoothstep(delay, delay + 0.38, uGather);
        vec3 free = aFrom + vec3(0.3 * sin(uFall * 0.5 + aSeed * 40.0), -uFall * (0.25 + 0.5 * aSeed), 0.0);
        vec3 p = mix(free, position, k);
        float ang = (1.0 - k) * 1.5 * (aSeed - 0.5);
        p.xy = mat2(cos(ang), -sin(ang), sin(ang), cos(ang)) * p.xy;
        p.xy += 0.012 * vec2(sin(uTime * 1.3 + aSeed * 50.0), cos(uTime * 1.1 + aSeed * 31.0)) * k;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = max(1.1, (0.028 + 0.075 * aSize) * uProj / -mv.z);
        float twinkle = 0.62 + 0.38 * sin(uTime * (1.2 + aSeed * 2.0) + aSeed * 90.0);
        vA = uShow * twinkle * mix(0.55, 1.0, k) * mix(1.0, uLove, aKind) * mix(1.0, aKind, uPainted)
           * mix(1.0, 0.15 + 0.85 * smoothstep(0.15, 0.9, length(position.xy)), k);
        vC = aColor;
      }`,
    fragmentShader: `
      uniform float uDim; varying vec3 vC; varying float vA;
      void main(){
        float r = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, r);
        gl_FragColor = vec4(vC * 1.2, a * a * vA * uDim);
      }`,
    transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
  });
  const dustPoints = new THREE.Points(dustGeo, dustMat);
  dustPoints.frustumCulled = false;
  dustPoints.renderOrder = 1;
  group.add(dustPoints);


  // ── the heart: Altan gadas at the centre of the matrix, drawn the way a lens
  // sees a star. A very small hot point, light that falls off smoothly with no
  // edge, and a hair-thin streak along the horizon with a fainter one upright.
  const heartMat = new THREE.ShaderMaterial({
    uniforms: { uLevel: { value: 1 }, uTime: { value: 0 }, uDim: dim },
    vertexShader: 'varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `
      uniform float uLevel; uniform float uTime; uniform float uDim; varying vec2 vP;
      void main(){
        float r = length(vP);
        float ax = abs(vP.x); float ay = abs(vP.y);
        float point = 2.4 * exp(-r * r / 0.0018);
        float inner = 0.42 / (1.0 + pow(r / 0.1, 2.4));
        float halo = 0.07 / (1.0 + pow(r / 0.85, 2.0));
        float streak = 0.26 * exp(-ay / 0.018) / (1.0 + pow(ax / 1.0, 2.0));
        float upright = 0.06 * exp(-ax / 0.018) / (1.0 + pow(ay / 0.55, 2.0));
        float edge = smoothstep(3.4, 1.5, r);
        float breath = 1.0 + 0.035 * sin(uTime * 1.3);
        vec3 white = vec3(1.0, 0.96, 0.88); vec3 warm = vec3(1.0, 0.8, 0.52);
        vec3 col = white * (point + inner) + warm * (halo + streak + upright);
        gl_FragColor = vec4(col * edge * breath * uLevel * uDim, 1.0);
      }`,
    transparent: true, depthWrite: false, depthTest: false,
    blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
  });
  const heart = new THREE.Mesh(new THREE.PlaneGeometry(7, 7), heartMat);
  heart.renderOrder = 1;
  group.add(heart);
  let heartLevel = 1;

  // the line of light between the two places of a link or a combination
  const beam = line([centre, on('top')], PALE, 0.1);
  lines.pop();
  let beamOn = false;

  // where the person stands on the age ring, for the chapters about age
  const markerSprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glow, color: new THREE.Color(3.4, 2.5, 1.2), transparent: true, depthTest: false, blending: THREE.AdditiveBlending,
  }));
  markerSprite.renderOrder = 4;
  markerSprite.visible = false;
  group.add(markerSprite);

  // a number in its round seat
  function seat(at, size, color) {
    const ringSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: seatMap, color: color.clone(), transparent: true, depthTest: false, opacity: 0 }));
    const num = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthTest: false, opacity: 0 }));
    ringSprite.position.copy(at); num.position.copy(at);
    ringSprite.renderOrder = 2; num.renderOrder = 3;
    group.add(ringSprite, num);
    return { at, size, color, ring: ringSprite, num, show: 0, flash: 0, grow: 1 };
  }
  const nodes = {};
  for (const key of AROUND) nodes[key] = seat(on(key), 1.12, AXES.includes(key) ? GOLD : SILVER);
  nodes.centre = seat(centre, 1.6, PALE);
  // the small glowing knot shown at each point before there are numbers
  for (const node of Object.values(nodes)) {
    node.dot = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glow, color: node.color.clone().multiplyScalar(1.7), transparent: true, depthTest: false, opacity: 0, blending: THREE.AdditiveBlending,
    }));
    node.dot.position.copy(node.at); node.dot.renderOrder = 2;
    group.add(node.dot);
    node.dotShow = 0;
  }
  const smalls = [];
  for (const key of AROUND) {
    for (const [field, f] of STEPS) {
      if (key === 'br' && field === 'step1') continue; // the love line's middle number sits here
      smalls.push({ ...seat(on(key, f), 0.56, AXES.includes(key) ? GOLD : SILVER), key, field, t0: 4.6 + (1 - f) * 1.8 });
    }
  }
  const loveSeats = ['love', 'mid', 'money'].map((field, i) => ({
    ...seat(loveFrom.clone().lerp(loveTo, 0.25 + i * 0.25), 0.62, field === 'money' ? GOLD : ROSE), field, t0: 6.1 + i * 0.2,
  }));

  // every seat by the name of its place: 'left', 'bottom.inner', 'loveMoney.love'
  const seats = { ...nodes };
  for (const s of smalls) seats[`${s.key}.${s.field}`] = s;
  for (const s of loveSeats) seats[`loveMoney.${s.field}`] = s;

  // the age ring: seven years marked between each pair of outer points
  const dotPos = []; const dotOrder = []; const dotSize = [];
  AROUND.forEach((key, k) => {
    for (let j = 1; j <= 7; j++) {
      const a = (ANGLE[key] - j * 5.625) * DEG;
      dotPos.push(Math.cos(a) * R, Math.sin(a) * R, 0);
      dotOrder.push((k * 8 + j) / 64);
      dotSize.push(j === 4 ? 1.7 : 1);
    }
  });
  const ageGeo = new THREE.BufferGeometry();
  ageGeo.setAttribute('position', new THREE.Float32BufferAttribute(dotPos, 3));
  ageGeo.setAttribute('aOrder', new THREE.Float32BufferAttribute(dotOrder, 1));
  ageGeo.setAttribute('aSize', new THREE.Float32BufferAttribute(dotSize, 1));
  const ageMat = new THREE.ShaderMaterial({
    uniforms: { uShow: { value: 0 }, uProj: { value: 600 }, uDim: dim },
    vertexShader: `
      attribute float aOrder; attribute float aSize; uniform float uShow; uniform float uProj; varying float vA;
      void main(){
        vA = smoothstep(aOrder, aOrder + 0.03, uShow) * (1.0 + 2.5 * exp(-pow((uShow - aOrder) * 14.0, 2.0)));
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = 0.2 * aSize * uProj / -mv.z;
      }`,
    fragmentShader: `
      uniform float uDim; varying float vA;
      void main(){
        float r = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.05, r);
        gl_FragColor = vec4(vec3(1.5, 1.3, 1.0), a * a * vA * uDim);
      }`,
    transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
  });
  const ages = new THREE.Points(ageGeo, ageMat);
  ages.renderOrder = 2;
  group.add(ages);

  // the amin too as a figure of stars. When the number has a figure of its own
  // (a picture of starlight, assets/figures/<n>.jpg), the stars first gather into
  // that figure, in its own colours, and then flow on into the number (uMorph 0 to 1).
  const N = FIGURE_STARS;
  const start = new Float32Array(N * 3); const seed = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    start.set([(Math.random() - 0.5) * 46, (Math.random() - 0.5) * 30, -26 + Math.random() * 28], i * 3);
    seed[i] = Math.random();
  }
  const figGeo = new THREE.BufferGeometry();
  figGeo.setAttribute('position', new THREE.BufferAttribute(start, 3));
  figGeo.setAttribute('aTarget', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
  figGeo.setAttribute('aFig', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
  figGeo.setAttribute('aCol', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
  figGeo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  figGeo.setAttribute('aDelay', new THREE.BufferAttribute(new Float32Array(N), 1));
  const figMat = new THREE.ShaderMaterial({
    uniforms: { uForm: { value: 0 }, uMorph: { value: 1 }, uTime: { value: 0 }, uProj: { value: 600 }, uPicture: { value: 0 }, uCore: { value: 0.05 } },
    vertexShader: `
      attribute vec3 aTarget; attribute vec3 aFig; attribute vec3 aCol; attribute float aSeed; attribute float aDelay;
      uniform float uForm; uniform float uMorph; uniform float uTime; uniform float uProj; uniform float uPicture; uniform float uCore;
      varying float vA; varying vec3 vC;
      void main(){
        float k = clamp(uForm * 1.7 - aSeed * 0.7, 0.0, 1.0);
        k = k * k * (3.0 - 2.0 * k);
        // figure to number: the stars of the figure wind inward, the outermost first, into
        // one star at the centre; the number then opens out of that star on the same turn
        float m = clamp(uMorph * 1.5 - aDelay * 0.5, 0.0, 1.0);
        float a = smoothstep(0.0, 0.5, m);
        float b = smoothstep(0.5, 1.0, m);
        vec2 ball = 0.2 * fract(aSeed * 17.0) * vec2(cos(aSeed * 61.0), sin(aSeed * 61.0));
        float turn = m < 0.5 ? a * 2.6 : 2.6 + b * 3.6832;
        vec2 spot = m < 0.5 ? mix(aFig.xy, ball, a) : mix(ball, aTarget.xy, b);
        vec3 goal = vec3(mat2(cos(turn), sin(turn), -sin(turn), cos(turn)) * spot, mix(aFig.z, aTarget.z, m));
        float core = a * (1.0 - b);
        vec3 p = mix(position, goal, k);
        float ang = (1.0 - k) * 2.2 * (aSeed - 0.5);
        p.xy = mat2(cos(ang), -sin(ang), sin(ang), cos(ang)) * p.xy;
        p.xy += 0.025 * vec2(sin(uTime * 1.3 + aSeed * 50.0), cos(uTime * 1.1 + aSeed * 31.0)) * k;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        // the figure is drawn in fine stars; the number keeps its larger ones
        float size = mix(0.018 + 0.026 * fract(aSeed * 7.0), 0.034 + 0.046 * fract(aSeed * 7.0), b);
        gl_PointSize = max(1.0, size * uProj / -mv.z);
        float twinkle = 0.7 + 0.3 * sin(uTime * 2.0 + aSeed * 90.0);
        // over the picture of the figure the stars only glitter; packed into the one star
        // or into the number they each shine less, so nothing burns out to white
        float lit = mix(mix(0.8, mix(0.1, 0.42, smoothstep(0.0, 0.2, uMorph)), smoothstep(0.7, 1.0, uForm) * uPicture), 0.2, b) * mix(1.0, uCore, core);
        vA = smoothstep(0.0, 0.2, uForm) * twinkle * lit;
        vC = mix(aCol, vec3(1.35, 1.02, 0.6), a);
      }`,
    fragmentShader: `
      varying float vA; varying vec3 vC;
      void main(){
        float r = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, r);
        gl_FragColor = vec4(vC, a * a * vA * 0.78);
      }`,
    transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
  });
  const figure = new THREE.Points(figGeo, figMat);
  figure.frustumCulled = false;
  figure.position.z = 1;
  figure.renderOrder = 5;
  group.add(figure);

  // the picture of the figure itself, in its own gold and silver, standing in front of
  // the matrix: it comes up under the stars once they have gathered, and goes as they
  // leave for the number
  const picMat = new THREE.ShaderMaterial({
    uniforms: { uMap: { value: null }, uMatte: { value: null }, uShow: { value: 0 }, uTime: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `
      uniform sampler2D uMap; uniform sampler2D uMatte; uniform float uShow; uniform float uTime; varying vec2 vUv;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      void main(){
        // a still picture, kept alive: it breathes very slightly and its stars glitter each
        // in their own time. It is drawn after the bloom and the tone mapping (see overlay),
        // so its own pixels reach the screen as painted: faces stay sharp and true.
        vec2 uv = (vUv - 0.5) / (1.0 + 0.005 * sin(uTime * 0.9)) + 0.5;
        vec3 c = max(texture2D(uMap, uv).rgb - vec3(0.012, 0.01, 0.02), 0.0);   // the picture's night gives no light
        vec2 cell = floor(uv * 190.0);
        float glint = 0.5 + 0.5 * sin(uTime * (1.5 + 3.0 * hash(cell)) + 40.0 * hash(cell + 7.0));
        c *= 0.96 + 0.14 * glint * glint * glint;
        vec2 e = smoothstep(0.0, 0.07, vUv) * smoothstep(0.0, 0.07, 1.0 - vUv);
        // inside its own outline the figure covers what is behind it, as a body standing in
        // front of the matrix; outside it nothing is touched (premultiplied: one, 1 - alpha)
        float body = texture2D(uMatte, uv).r * e.x * e.y * uShow;
        // straight to the screen: linear back to the screen's sRGB by hand
        vec3 s = pow(c, vec3(1.0 / 2.2));
        gl_FragColor = vec4(s * e.x * e.y * uShow, body * 0.94);
      }`,
    transparent: true, depthWrite: false, depthTest: false,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
    blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
  });
  const picture = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), picMat);
  picture.position.z = 1;
  picture.renderOrder = 4.5;
  picture.visible = false;
  // the picture lives in a scene of its own, drawn on top of the finished frame (after the
  // bloom and the tone mapping), placed by the matrix group's own transform each frame
  const overlay = new THREE.Scene();
  const overlayRoot = new THREE.Group();
  overlayRoot.matrixAutoUpdate = false;
  overlay.add(overlayRoot);
  overlayRoot.add(picture);

  const pulse = (l, x, amp = 1) => {
    const live = x > 0 && x < 1;
    l.u.uPulse.value = live ? x : -1;
    l.u.uPulseAmp.value = live ? amp * Math.sin(Math.PI * x) ** 0.5 : 0;
  };
  const hideNumbers = () => {
    for (const s of [...Object.values(nodes), ...smalls, ...loveSeats]) { s.show = 0; s.flash = 0; }
    ageMat.uniforms.uShow.value = 0;
    love.u.uProgress.value = 0;
  };

  const api = {
    group, nodes, seats, dim, focus: null, marker: null, overlay,

    // follow the matrix group with the overlay (call once a frame, before drawing it)
    syncOverlay() {
      group.updateMatrixWorld();
      overlayRoot.matrix.copy(group.matrixWorld);
      overlayRoot.matrixWorldNeedsUpdate = true;
    },

    // the empty matrix growing out of the toono: 0 nothing, 1 all its lines
    drawBlank(p) {
      for (const key of AROUND) spokes[key].u.uProgress.value = easeInOut(seg(p, 0, 0.42));
      ring.u.uProgress.value = easeInOut(seg(p, 0.12, 0.7));
      rhombus.forEach((l, i) => { l.u.uProgress.value = easeInOut(seg(p, 0.48 + i * 0.05, 0.78 + i * 0.05)); });
      square.forEach((l, i) => { l.u.uProgress.value = easeInOut(seg(p, 0.62 + i * 0.05, 0.94 + i * 0.05)); });
      for (const node of Object.values(nodes)) node.dotShow = seg(p, 0.82, 1);
      nodes.centre.dotShow = seg(p, 0, 0.1);
      hideNumbers();
    },

    setMatrix(m) {
      for (const [key, node] of Object.entries(nodes)) node.num.material.map = numberTexture(m.points[key], 600);
      // a couple matrix has no numbers on the inner half of its lines: those seats stay empty
      for (const s of smalls) {
        const value = m.lines[s.key][s.field];
        s.off = value == null;
        if (!s.off) s.num.material.map = numberTexture(value);
      }
      for (const s of loveSeats) s.num.material.map = numberTexture(m.loveMoney[s.field]);
      for (const s of [...Object.values(nodes), ...smalls, ...loveSeats]) s.num.material.needsUpdate = true;
      figGeo.attributes.aTarget.array.set(textPoints(String(m.points.centre), N, 4.3, 5.8));
      figGeo.attributes.aTarget.needsUpdate = true;
      this.setFigurePoints(null);
    },

    // the numbers arriving, s seconds after the form was sent
    reveal(s) {
      api.drawBlank(1);
      const show = (node, t0) => { node.show = easeOut(seg(s, t0, t0 + 0.5)); node.flash = bump(s, t0); };
      AXES.forEach((key, i) => show(nodes[key], i * 0.6));
      rhombus.forEach((l, i) => pulse(l, seg(s, 0.15 + i * 0.6, 0.75 + i * 0.6)));
      for (const key of AXES) pulse(spokes[key], 1 - seg(s, 2.4, 3.2));
      show(nodes.centre, 3.1);
      for (const key of DIAGONALS) pulse(spokes[key], seg(s, 3.5, 4.3));
      DIAGONALS.forEach((key, i) => show(nodes[key], 4.2 + i * 0.12));
      square.forEach((l, i) => pulse(l, seg(s, 4.4 + i * 0.2, 5.1 + i * 0.2)));
      for (const sm of smalls) show(sm, sm.t0);
      ageMat.uniforms.uShow.value = seg(s, 5.0, 6.8) * 1.1;
      love.u.uProgress.value = easeInOut(seg(s, 5.6, 6.4));
      for (const ls of loveSeats) show(ls, ls.t0);
      pulse(ring, seg(s, 5.0, 6.8), 0.6);
    },

    // slow pulses that keep the matrix alive while nothing else happens
    idle(time) {
      lines.forEach((l, i) => {
        const x = ((time * 0.11 + i * 0.173) % 1) * 2.6 - 0.8;
        pulse(l, x, 0.2);   // a faint glint, not a bright dash
      });
      if (beamOn) pulse(beam, ((time * 0.42) % 1) * 1.3 - 0.15, 1.2);
    },

    // join two seats with a line of light, or take it away with null
    setBeam(keys) {
      beamOn = Boolean(keys);
      if (keys) {
        beam.mesh.geometry.dispose();
        beam.mesh.geometry = ribbon(keys.map((key) => seats[key].at), 0.1);
      }
      beam.u.uProgress.value = beamOn ? 1 : 0;
      beam.u.uPulseAmp.value = 0;
    },

    // mark an age on the ring (a year takes 4.5 degrees, clockwise from the left point)
    setMarker(years) {
      const a = (180 - (years ?? 0) * 4.5) * DEG;
      api.marker = years == null ? null : new THREE.Vector3(Math.cos(a) * R, Math.sin(a) * R, 0);
      markerSprite.visible = Boolean(api.marker);
      if (api.marker) markerSprite.position.copy(api.marker);
    },

    // Painted: the matrix's lines, dust, heart and point lights are in the picture
    // behind (matrix-plate.png), so the code keeps only the numbers, the love
    // and money line, the age marks and the lines of light drawn on request.
    setPainted(on) {
      api.painted = on;
      for (const l of lines) if (l !== love) l.mesh.visible = !on;
      dustMat.uniforms.uPainted.value = on ? 1 : 0;
      heart.visible = !on;
    },

    // how bright the heart burns: 1 at rest, more while it is still the lone star of the film
    setHeart(level) { heartLevel = level; },

    // The star dust of the lines: `gather` 0 hanging free, 1 every star on its
    // line; `show` fades it in; `fall` is how many seconds the free stars have drifted down.
    setGather(gather, show = 1, fall = 0) {
      dustMat.uniforms.uGather.value = gather;
      dustMat.uniforms.uShow.value = show;
      dustMat.uniforms.uFall.value = fall;
    },

    // the stars of a figure picture (from figurePoints), or null: straight to the number
    setFigurePoints(points) {
      const fig = figGeo.attributes.aFig.array; const col = figGeo.attributes.aCol.array;
      const delay = figGeo.attributes.aDelay.array; const target = figGeo.attributes.aTarget.array;
      picMat.uniforms.uMap.value?.dispose();
      picMat.uniforms.uMatte.value?.dispose();
      picMat.uniforms.uMap.value = null;
      picMat.uniforms.uMatte.value = null;
      figMat.uniforms.uPicture.value = points ? 1 : 0;
      if (!points) {
        fig.set(target); col.fill(1); delay.fill(0);
      } else {
        fig.set(points.pos); col.set(points.col);
        // the outermost stars leave first: the wing tips, the tail, the hooves; the rider last
        let far = 0;
        for (let i = 0; i < N; i++) far = Math.max(far, Math.hypot(fig[i * 3], fig[i * 3 + 1]));
        for (let i = 0; i < N; i++) delay[i] = 0.8 * (1 - Math.hypot(fig[i * 3], fig[i * 3 + 1]) / far) + 0.2 * Math.random();
        const map = new THREE.Texture(points.image);
        map.colorSpace = THREE.SRGBColorSpace;
        map.needsUpdate = true;
        picMat.uniforms.uMap.value = map;
        picMat.uniforms.uMatte.value = new THREE.CanvasTexture(points.matte);
        picture.scale.setScalar(points.size);
      }
      for (const key of ['aFig', 'aCol', 'aDelay']) figGeo.attributes[key].needsUpdate = true;
    },

    // 0 scattered stars, 1 the amin too; morph 0 the figure, 1 the number
    setFigure(form, time, morph = 1) {
      figMat.uniforms.uMorph.value = morph;
      figMat.uniforms.uForm.value = form;
      const show = picMat.uniforms.uMap.value ? seg(form, 0.7, 1) * (1 - seg(morph, 0, 0.16)) : 0;
      picMat.uniforms.uShow.value = show;
      picMat.uniforms.uTime.value = time;
      picture.visible = show > 0.001;
      figMat.uniforms.uTime.value = time;
      figure.visible = form > 0.001;
    },

    // write the state to the sprites; called every frame
    apply(proj, time = 0) {
      ageMat.uniforms.uProj.value = proj;
      figMat.uniforms.uProj.value = proj;
      dustMat.uniforms.uProj.value = proj;
      dustMat.uniforms.uTime.value = time;
      dustMat.uniforms.uLove.value = love.u.uProgress.value;
      heartMat.uniforms.uTime.value = time;
      // once the amin too sits in its seat the heart steps back behind it
      heartMat.uniforms.uLevel.value = heartLevel * (1 - 0.8 * nodes.centre.show);
      const d = dim.value;
      markerSprite.scale.setScalar(1.15 + 0.3 * Math.sin(figMat.uniforms.uTime.value * 3));
      markerSprite.material.opacity = d;
      const paint = (s) => {
        const chosen = api.focus && api.focus.some((key) => seats[key] === s);
        const size = s.size * (1 + 0.45 * s.flash) * (chosen ? 1.35 : 1);
        s.ring.scale.setScalar(size);
        s.num.scale.setScalar(size * 0.8);
        s.ring.material.opacity = s.off ? 0 : s.show * d;
        s.num.material.opacity = s.off ? 0 : s.show * d;
        s.ring.material.color.copy(s.color).multiplyScalar(1.1 + 3 * s.flash + (chosen ? 1.2 : 0));
        s.num.material.color.setScalar(1 + 2.5 * s.flash);
        if (s.dot) {
          // the heart has its own light; the eight outer points get a small fine one
          s.dot.material.opacity = s === nodes.centre || api.painted ? 0 : s.dotShow * (1 - s.show) * d;
          s.dot.scale.setScalar(0.3);
        }
      };
      for (const s of [...Object.values(nodes), ...smalls, ...loveSeats]) paint(s);
    },

    // the seat (one of `keys`) nearest to a place on the screen, within reach of a finger
    pick(x, y, camera, w, h, keys) {
      let best = null; let bestD = 40;
      for (const key of keys) {
        const [sx, sy] = api.screen(key, camera, w, h);
        const dist = Math.hypot(sx - x, sy - y);
        if (dist < bestD) { best = key; bestD = dist; }
      }
      return best;
    },
    screen(key, camera, w, h) {
      const v = seats[key].at.clone().applyMatrix4(group.matrixWorld).project(camera);
      return [(v.x * 0.5 + 0.5) * w, (-v.y * 0.5 + 0.5) * h];
    },
  };
  return api;
}
