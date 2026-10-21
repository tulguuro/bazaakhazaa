// WebGL particle scene. One point cloud morphs between the chapter shapes;
// main.js decides which pair of shapes is shown and how far along the morph is.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { buildShape } from './shapes.js';
import { createCosmos } from './cosmos.js';
import { createLabels, fadeLabels } from './labels.js';

// All colours in this project are authored as display values.
THREE.ColorManagement.enabled = false;

// Camera per shape. `fit` is the half-width that must stay on screen,
// `fitH` the half-height (shapes taller than wide), `tint` the background glow.
const VIEWS = {
  stars: { pos: [0, 0, 9], look: [0, 0, 0], fit: 3.0, tint: '#0a1430' },
  wolf: { pos: [0, 0.2, 7.6], look: [0, 0, 0], fit: 2.0, tint: '#09122b' },
  pair: { pos: [0, 0.2, 8.6], look: [0, 0, 0], fit: 3.5, tint: '#121230' },
  sea: { pos: [0, 1.5, 7.4], look: [0, -0.3, -1], fit: 3.2, tint: '#041d33' },
  mountain: { pos: [0, 1.0, 8.4], look: [0, 0.2, -1], fit: 4.2, tint: '#081d2b' },
  ger: { pos: [0, 2.0, 6.8], look: [0, 0.4, 0], fit: 2.2, tint: '#1b1309' },
  arrows: { pos: [0, 0.3, 6.4], look: [0, 0.1, 0], fit: 1.0, fitH: 3.3, tint: '#170d0e' },
  worlds: { pos: [0, 4.4, 8.6], look: [0, 0.2, 0], fit: 3.1, fitH: 3.3, tint: '#0d0a26' },
  // the mandala's legend column sits to its right, so frame both together
  mandala: { pos: [1.7, 0, 9.6], look: [1.7, 0, 0], fit: 5.3, fitH: 3.7, tint: '#110d21' },
  dial: { pos: [0, 0, 9.4], look: [0, 0, 0], fit: 4.4, fitH: 4.1, tint: '#140d1d' },
};

const hex = (h) => {
  const n = parseInt(h.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

const pointVertex = /* glsl */ `
  uniform float uMix;
  uniform float uTime;
  uniform float uSize;
  uniform float uMotion;
  uniform float uPixelRatio;
  uniform float uTravel;
  uniform vec2 uTanHalf;
  attribute vec3 aTo;
  attribute vec3 cFrom;
  attribute vec3 cTo;
  attribute vec4 aRand;
  attribute float aIdx;
  varying vec3 vColor;

  float ease(float x) { return x * x * (3.0 - 2.0 * x); }

  void main() {
    // The shape dissolves and re-forms in a sweep from left to right.
    float delay = 0.42 * (0.65 * aIdx + 0.35 * aRand.z);
    float t = clamp((uMix - delay) / 0.58, 0.0, 1.0);

    vec3 a = (modelViewMatrix * vec4(position, 1.0)).xyz;
    vec3 b = (modelViewMatrix * vec4(aTo, 1.0)).xyz;

    // Between shapes every point becomes a star somewhere in the visible sky.
    float depth = 7.0 + aRand.w * 15.0;
    vec3 s = vec3(
      (aRand.x * 2.0 - 1.0) * uTanHalf.x * depth * 1.05,
      (aRand.y * 2.0 - 1.0) * uTanHalf.y * depth * 1.05,
      -depth);
    s.xy += 0.12 * vec2(sin(uTime * 0.3 + aRand.y * 20.0), cos(uTime * 0.25 + aRand.x * 20.0));

    vec3 p;
    float star = 0.0;
    if (uTravel > 0.5) {
      if (t < 0.5) {
        float k = ease(t * 2.0);
        p = mix(a, s, k);
        star = k;
      } else {
        float k = ease(t * 2.0 - 1.0);
        p = mix(s, b, k);
        star = 1.0 - k;
      }
      // a soft arc instead of a straight flight
      p += vec3(sin(aRand.x * 6.2831), cos(aRand.y * 6.2831), 0.0) * sin(t * 6.2831) * 0.35;
    } else {
      p = mix(a, b, ease(t));
    }

    // Gentle breathing while a shape holds.
    p += uMotion * 0.03 * (1.0 - star) * vec3(
      sin(uTime * 0.7 + aRand.x * 40.0),
      cos(uTime * 0.6 + aRand.y * 40.0),
      sin(uTime * 0.8 + aRand.w * 40.0));

    gl_Position = projectionMatrix * vec4(p, 1.0);
    gl_PointSize = uSize * uPixelRatio * (0.45 + aRand.w * 0.9) * mix(1.0, 0.55, star) / -p.z;

    float twinkle = 1.0 - uMotion * (0.3 + 0.45 * star) * (0.5 + 0.5 * sin(uTime * (0.8 + aRand.y * 2.4) + aRand.x * 50.0));
    vec3 col = t < 0.5 ? cFrom : cTo;
    col = mix(col, vec3(0.85, 0.9, 1.0) * (0.45 + aRand.y * 0.6), star * 0.75);
    // a brief spark as each point lands in its new place
    float spark = uTravel * smoothstep(0.8, 0.95, t) * (1.0 - smoothstep(0.95, 1.0, t));
    vColor = col * twinkle * (1.0 + spark * 1.4);
  }
`;

const pointFragment = /* glsl */ `
  varying vec3 vColor;

  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    float a = smoothstep(0.5, 0.0, d);
    gl_FragColor = vec4(vColor, a * a);
  }
`;

const skyVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.999, 1.0);
  }
`;

const skyFragment = /* glsl */ `
  uniform vec3 uTint;
  uniform float uAspect;
  varying vec2 vUv;
  void main() {
    vec2 p = vUv - vec2(0.5, 0.6);
    p.x *= uAspect;
    float g = smoothstep(1.25, 0.0, length(p) * 1.35);
    gl_FragColor = vec4(mix(vec3(0.004, 0.006, 0.018), uTint, g), 1.0);
  }
`;

export function createScene(canvas, chapters, { reduceMotion = false } = {}) {
  const small = window.innerWidth < 760;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, small ? 2 : 1.5));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 200);

  const count = small ? 16000 : 36000;
  const shapes = chapters.map((ch) => buildShape(ch.shape, count));

  // ---- background glow ----
  const sky = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    new THREE.ShaderMaterial({
      uniforms: { uTint: { value: new THREE.Vector3() }, uAspect: { value: 1 } },
      vertexShader: skyVertex,
      fragmentShader: skyFragment,
      depthTest: false,
      depthWrite: false,
    }),
  );
  sky.frustumCulled = false;
  sky.renderOrder = -2;
  scene.add(sky);

  const cosmos = createCosmos(scene, renderer, { small, reduceMotion });

  // ---- morphing cloud ----
  const geometry = new THREE.BufferGeometry();
  const from = new THREE.BufferAttribute(new Float32Array(count * 3), 3);
  const to = new THREE.BufferAttribute(new Float32Array(count * 3), 3);
  const cFrom = new THREE.BufferAttribute(new Float32Array(count * 3), 3);
  const cTo = new THREE.BufferAttribute(new Float32Array(count * 3), 3);
  const rand = new Float32Array(count * 4);
  for (let i = 0; i < rand.length; i++) rand[i] = Math.random();
  // Shapes are sorted left → right, so the index doubles as a sweep order.
  const idx = new Float32Array(count);
  for (let i = 0; i < count; i++) idx[i] = i / count;
  geometry.setAttribute('position', from);
  geometry.setAttribute('aTo', to);
  geometry.setAttribute('cFrom', cFrom);
  geometry.setAttribute('cTo', cTo);
  geometry.setAttribute('aRand', new THREE.BufferAttribute(rand, 4));
  geometry.setAttribute('aIdx', new THREE.BufferAttribute(idx, 1));

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uMix: { value: 0 },
      uTime: { value: 0 },
      uSize: { value: small ? 30 : 22 },
      uMotion: { value: reduceMotion ? 0 : 1 },
      uPixelRatio: { value: renderer.getPixelRatio() },
      uTravel: { value: 1 },
      uTanHalf: { value: new THREE.Vector2(1, 1) },
    },
    vertexShader: pointVertex,
    fragmentShader: pointFragment,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const cloud = new THREE.Points(geometry, material);
  cloud.frustumCulled = false;
  const group = new THREE.Group();
  group.add(cloud);
  scene.add(group);

  let labels = [];
  createLabels(chapters).then((sets) => {
    labels = sets;
    sets.forEach(({ group: g }) => group.add(g));
  });

  // ---- glow ----
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), small ? 0.5 : 0.6, 0.45, 0.5);
  composer.addPass(bloom);

  let pair = -1;
  function setPair(i) {
    from.array.set(shapes[i].pos);
    to.array.set(shapes[i + 1].pos);
    cFrom.array.set(shapes[i].col);
    cTo.array.set(shapes[i + 1].col);
    from.needsUpdate = to.needsUpdate = cFrom.needsUpdate = cTo.needsUpdate = true;
    material.uniforms.uTravel.value = chapters[i].shape === chapters[i + 1].shape ? 0 : 1;
    pair = i;
  }

  // Camera for chapter i: put the shape in the middle of the space the text
  // leaves free, and back off far enough that the whole shape fits.
  function viewFor(i) {
    const v = VIEWS[chapters[i].shape];
    const dir = new THREE.Vector3(...v.pos).sub(new THREE.Vector3(...v.look));
    const dist = dir.length();
    dir.normalize();
    const w = window.innerWidth;
    const side = chapters[i].side;
    const beside = w >= 760 && side !== 'center';
    const gutter = Math.min(120, Math.max(16, 0.07 * w));
    const textFrac = beside ? Math.min(0.6, (gutter + Math.min(420, w) + 24) / w) : 0;
    const free = beside ? Math.max(1 - textFrac, 0.55) : 1;
    const tanHalf = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    // the reading dolly pushes in by up to 0.9, so keep that much spare
    const d = Math.max(dist, (v.fit * 1.12) / (free * tanHalf * camera.aspect), v.fitH ? (v.fitH * 1.08) / tanHalf + 0.9 : 0);
    const halfH = d * tanHalf;
    const halfW = halfH * camera.aspect;
    let ox = 0;
    let oy = 0;
    if (beside) ox = (side === 'left' ? -1 : 1) * (1 - free) * halfW;
    else if (w < 760 && side !== 'center') oy = -halfH * 0.36;
    const look = new THREE.Vector3(v.look[0] + ox, v.look[1] + oy, v.look[2]);
    return { look, pos: look.clone().addScaledVector(dir, d), tint: hex(v.tint) };
  }

  let views = [];
  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    composer.setPixelRatio(renderer.getPixelRatio());
    composer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const tanHalf = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    material.uniforms.uTanHalf.value.set(tanHalf * camera.aspect, tanHalf);
    sky.material.uniforms.uAspect.value = w / h;
    views = chapters.map((_, i) => viewFor(i));
  }
  resize();

  const camPos = new THREE.Vector3();
  const camLook = new THREE.Vector3();
  const back = new THREE.Vector3();

  function frame(time, state, mouse) {
    const n = shapes.length;
    const i = Math.min(Math.floor(state.f), n - 2);
    const m = Math.min(1, Math.max(0, state.f - i));
    if (i !== pair) setPair(i);
    material.uniforms.uMix.value = m;
    material.uniforms.uTime.value = time;

    const e = m * m * (3 - 2 * m);
    const a = views[i];
    const b = views[i + 1];
    camPos.lerpVectors(a.pos, b.pos, e);
    camLook.lerpVectors(a.look, b.look, e);
    back.subVectors(camPos, camLook).normalize();
    camPos.addScaledVector(back, -state.dolly);
    camPos.x += mouse.x * 0.35;
    camPos.y += mouse.y * 0.22;
    camera.position.copy(camPos);
    camera.lookAt(camLook);

    sky.material.uniforms.uTint.value.set(
      a.tint[0] + (b.tint[0] - a.tint[0]) * e,
      a.tint[1] + (b.tint[1] - a.tint[1]) * e,
      a.tint[2] + (b.tint[2] - a.tint[2]) * e,
    );

    group.rotation.y = state.rot + (reduceMotion ? 0 : Math.sin(time * 0.22) * 0.08) + mouse.x * 0.12;
    group.rotation.x = mouse.y * 0.05;
    fadeLabels(labels, state.f);

    cosmos.update(time, state.scroll, camera, mouse);
    composer.render();
  }

  return { frame, resize };
}
