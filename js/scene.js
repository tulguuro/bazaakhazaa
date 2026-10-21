// WebGL particle scene. One point cloud morphs between the chapter shapes;
// main.js decides which pair of shapes is shown and how far along the morph is.
import * as THREE from 'three';
import { buildShape } from './shapes.js';

// Camera per shape. `fit` is the half-width that must stay on screen,
// `tint` colours the background glow.
const VIEWS = {
  stars: { pos: [0, 0, 9], look: [0, 0, 0], fit: 3.0, tint: '#0b1736' },
  wolf: { pos: [0, 0.2, 7.6], look: [0, 0, 0], fit: 2.0, tint: '#0a1532' },
  pair: { pos: [0, 0.2, 8.6], look: [0, 0, 0], fit: 3.5, tint: '#16153a' },
  sea: { pos: [0, 1.5, 7.4], look: [0, -0.3, -1], fit: 3.2, tint: '#05223d' },
  mountain: { pos: [0, 1.0, 8.4], look: [0, 0.2, -1], fit: 4.2, tint: '#0a2233' },
  ger: { pos: [0, 2.0, 6.8], look: [0, 0.4, 0], fit: 2.2, tint: '#21170a' },
  arrows: { pos: [0, 0.3, 6.4], look: [0, 0.1, 0], fit: 1.0, tint: '#1c0f10' },
  worlds: { pos: [0, 1.7, 9.4], look: [0, 0.1, 0], fit: 3.1, tint: '#100c2e' },
  mandala: { pos: [0, 0, 9.2], look: [0, 0, 0], fit: 3.5, tint: '#140f27' },
  dial: { pos: [0, 0, 8.8], look: [0, 0, 0], fit: 3.1, tint: '#170f22' },
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
  attribute vec3 aTo;
  attribute vec3 cFrom;
  attribute vec3 cTo;
  attribute vec4 aRand;
  varying vec3 vColor;

  void main() {
    float delay = aRand.z * 0.4;
    float t = clamp((uMix - delay) / 0.6, 0.0, 1.0);
    t = t * t * (3.0 - 2.0 * t);
    vec3 p = mix(position, aTo, t);

    // Points rise and swirl while they travel between shapes.
    float lift = sin(t * 3.14159265);
    p += vec3(
      sin(aRand.x * 6.2831 + uTime * 0.6),
      cos(aRand.y * 6.2831 + uTime * 0.5) + 0.6,
      sin(aRand.w * 6.2831 + uTime * 0.4)) * lift * 0.9;

    // Gentle breathing at rest.
    p += uMotion * 0.03 * vec3(
      sin(uTime * 0.7 + aRand.x * 40.0),
      cos(uTime * 0.6 + aRand.y * 40.0),
      sin(uTime * 0.8 + aRand.w * 40.0));

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize * uPixelRatio * (0.45 + aRand.w * 0.9) / -mv.z;

    float twinkle = 1.0 - uMotion * 0.3 * (0.5 + 0.5 * sin(uTime * (0.8 + aRand.y * 2.2) + aRand.x * 50.0));
    vColor = mix(cFrom, cTo, t) * twinkle * (1.0 + lift * 0.4);
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
    gl_FragColor = vec4(mix(vec3(0.008, 0.012, 0.035), uTint, g), 1.0);
  }
`;

export function createScene(canvas, chapters, { reduceMotion = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 120);

  const small = window.innerWidth < 760;
  const count = small ? 15000 : 28000;
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
  sky.renderOrder = -1;
  scene.add(sky);

  // ---- morphing cloud ----
  const geometry = new THREE.BufferGeometry();
  const from = new THREE.BufferAttribute(new Float32Array(count * 3), 3);
  const to = new THREE.BufferAttribute(new Float32Array(count * 3), 3);
  const cFrom = new THREE.BufferAttribute(new Float32Array(count * 3), 3);
  const cTo = new THREE.BufferAttribute(new Float32Array(count * 3), 3);
  const rand = new Float32Array(count * 4);
  for (let i = 0; i < rand.length; i++) rand[i] = Math.random();
  geometry.setAttribute('position', from);
  geometry.setAttribute('aTo', to);
  geometry.setAttribute('cFrom', cFrom);
  geometry.setAttribute('cTo', cTo);
  geometry.setAttribute('aRand', new THREE.BufferAttribute(rand, 4));

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uMix: { value: 0 },
      uTime: { value: 0 },
      uSize: { value: small ? 30 : 24 },
      uMotion: { value: reduceMotion ? 0 : 1 },
      uPixelRatio: { value: renderer.getPixelRatio() },
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

  // ---- distant stars (static) ----
  const farCount = Math.floor(count / 10);
  const farPos = new Float32Array(farCount * 3);
  const farCol = new Float32Array(farCount * 3);
  const farRand = new Float32Array(farCount * 4);
  for (let i = 0; i < farCount; i++) {
    farPos.set([(Math.random() * 2 - 1) * 40, (Math.random() * 2 - 1) * 25, -15 - Math.random() * 20], i * 3);
    const b = 0.25 + Math.random() * 0.45;
    farCol.set([0.8 * b, 0.86 * b, b], i * 3);
    farRand.set([Math.random(), Math.random(), 0, Math.random()], i * 4);
  }
  const farGeometry = new THREE.BufferGeometry();
  farGeometry.setAttribute('position', new THREE.BufferAttribute(farPos, 3));
  farGeometry.setAttribute('aTo', new THREE.BufferAttribute(farPos, 3));
  farGeometry.setAttribute('cFrom', new THREE.BufferAttribute(farCol, 3));
  farGeometry.setAttribute('cTo', new THREE.BufferAttribute(farCol, 3));
  farGeometry.setAttribute('aRand', new THREE.BufferAttribute(farRand, 4));
  const farMaterial = material.clone();
  farMaterial.uniforms.uSize.value = material.uniforms.uSize.value * 1.4;
  const far = new THREE.Points(farGeometry, farMaterial);
  far.frustumCulled = false;
  scene.add(far);

  let pair = -1;
  function setPair(i) {
    from.array.set(shapes[i].pos);
    to.array.set(shapes[i + 1].pos);
    cFrom.array.set(shapes[i].col);
    cTo.array.set(shapes[i + 1].col);
    from.needsUpdate = to.needsUpdate = cFrom.needsUpdate = cTo.needsUpdate = true;
    pair = i;
  }

  // Camera for chapter i: frame the shape beside its text card and back
  // off far enough that the whole shape fits narrow screens.
  function viewFor(i) {
    const v = VIEWS[chapters[i].shape];
    const dir = new THREE.Vector3(...v.pos).sub(new THREE.Vector3(...v.look));
    const dist = dir.length();
    dir.normalize();
    const tanHalf = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const d = Math.max(dist, (v.fit * 1.12) / (tanHalf * camera.aspect));
    const halfH = d * tanHalf;
    const halfW = halfH * camera.aspect;
    const side = chapters[i].side;
    let ox = 0;
    let oy = 0;
    if (window.innerWidth >= 760) {
      if (side === 'left') ox = -Math.min(2.1, halfW * 0.4);
      if (side === 'right') ox = Math.min(2.1, halfW * 0.4);
    } else if (side !== 'center') {
      oy = -halfH * 0.36;
    }
    const look = new THREE.Vector3(v.look[0] + ox, v.look[1] + oy, v.look[2]);
    return { look, pos: look.clone().addScaledVector(dir, d), tint: hex(v.tint) };
  }

  let views = [];
  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
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
    farMaterial.uniforms.uTime.value = time;

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

    renderer.render(scene, camera);
  }

  return { frame, resize };
}
