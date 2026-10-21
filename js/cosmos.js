// Deep-sky backdrop built from real imagery: the Milky Way panorama, the
// Whirlpool galaxy (M51, Hubble) and textured planets, plus a crisp star
// layer and the odd shooting star. Near layers drift upward as the story
// scrolls, so the reader seems to sink slowly through the sky.
import * as THREE from 'three';

const TAU = Math.PI * 2;
const rand = Math.random;
const hex = (h) => {
  const n = parseInt(h.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

// Star colours from hot blue-white to cool orange, weighted to white.
const TINTS = ['#a9bcff', '#c8d6ff', '#e9eeff', '#ffffff', '#fff6ec', '#ffe6c8', '#ffd2a1'].map(hex);

// Light comes from the left and slightly toward the viewer, so planets on
// the right show a gibbous face and planets on the left a crescent.
const SUN = new THREE.Vector3(-0.75, 0.28, 0.6).normalize();

// ---------- Milky Way dome ----------

const domeVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const domeFragment = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uGain;
  varying vec2 vUv;
  void main() {
    vec3 c = texture2D(uMap, vUv).rgb * uGain;
    // the panorama is cropped, so fade its borders into black
    float edge = smoothstep(0.0, 0.14, vUv.y) * smoothstep(1.0, 0.86, vUv.y)
               * smoothstep(0.0, 0.08, vUv.x) * smoothstep(1.0, 0.92, vUv.x);
    gl_FragColor = vec4(c * edge, 1.0);
  }
`;

// ---------- stars ----------

const starVertex = /* glsl */ `
  uniform float uTime;
  uniform float uScale;
  uniform float uPixelRatio;
  attribute vec3 color;
  attribute vec2 aStar;
  varying vec3 vColor;
  varying float vSpike;

  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    float twinkle = 0.75 + 0.25 * sin(uTime * (0.5 + fract(aStar.y * 7.0) * 2.0) + aStar.y * 40.0);
    vSpike = step(2.5, aStar.x);
    gl_PointSize = aStar.x * uScale * uPixelRatio / -mv.z * (1.0 + vSpike * 2.0);
    vColor = color * twinkle;
  }
`;

const starFragment = /* glsl */ `
  varying vec3 vColor;
  varying float vSpike;

  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    float a;
    if (vSpike > 0.5) {
      // a bright star: tight core, faint halo and thin diffraction spikes
      a = exp(-d * d * 160.0) * 1.4
        + (exp(-abs(c.x) * 90.0) * exp(-abs(c.y) * 7.0) + exp(-abs(c.y) * 90.0) * exp(-abs(c.x) * 7.0)) * 0.45
        + exp(-d * 10.0) * 0.08;
    } else {
      a = smoothstep(0.5, 0.0, d);
      a *= a;
    }
    if (a < 0.004) discard;
    gl_FragColor = vec4(vColor, a);
  }
`;

function starField(n, pixelRatio) {
  const pos = new Float32Array(n * 3);
  const col = new Float32Array(n * 3);
  const star = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) {
    const bright = rand() < 0.004;
    const k = bright ? 1.0 : 0.18 + Math.pow(rand(), 2.2) * 0.75;
    const c = TINTS[(rand() * TINTS.length) | 0];
    pos.set([(rand() * 2 - 1) * 80, (rand() * 2 - 1) * 70, -30 - rand() * 50], i * 3);
    col.set([c[0] * k, c[1] * k, c[2] * k], i * 3);
    star[i * 2] = bright ? 2.6 + rand() : 0.45 + rand() * 0.8;
    star[i * 2 + 1] = rand();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setAttribute('aStar', new THREE.BufferAttribute(star, 2));
  const material = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uScale: { value: 34 }, uPixelRatio: { value: pixelRatio } },
    vertexShader: starVertex,
    fragmentShader: starFragment,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const points = new THREE.Points(g, material);
  points.frustumCulled = false;
  return points;
}

// ---------- galaxy photograph ----------

const photoVertex = domeVertex;

const photoFragment = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uBlack;
  uniform float uGain;
  varying vec2 vUv;
  void main() {
    vec3 c = max(texture2D(uMap, vUv).rgb - uBlack, 0.0) * uGain;
    float edge = min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y));
    gl_FragColor = vec4(c * smoothstep(0.0, 0.14, edge), 1.0);
  }
`;

// ---------- planets ----------

const planetVertex = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorld;
  void main() {
    vUv = uv;
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorld = wp.xyz;
    vNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const planetFragment = /* glsl */ `
  uniform sampler2D uMap;
  uniform sampler2D uRingMap;
  uniform vec3 uSun;
  uniform vec3 uAtmos;
  uniform float uAtmosStrength;
  uniform float uLimb;
  uniform float uExposure;
  uniform vec3 uCenter;
  uniform float uRadius;
  uniform float uHasRing;
  uniform vec3 uRingNormal;
  uniform vec2 uRing;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorld;

  void main() {
    vec3 n = normalize(vNormal);
    vec3 v = normalize(cameraPosition - vWorld);
    vec3 L = normalize(uSun);
    vec3 albedo = texture2D(uMap, vUv).rgb;

    float ndl = dot(n, L);
    float diffuse = clamp((ndl + 0.04) / 1.04, 0.0, 1.0);
    // gas giants darken toward the limb
    diffuse *= mix(1.0, pow(max(dot(n, v), 0.0), 0.35), uLimb);

    // shadow of the rings on the globe
    if (uHasRing > 0.5) {
      float t = dot(uCenter - vWorld, uRingNormal) / dot(L, uRingNormal);
      if (t > 0.0) {
        float r = length(vWorld + L * t - uCenter) / uRadius;
        if (r > uRing.x && r < uRing.y) {
          float a = texture2D(uRingMap, vec2((r - uRing.x) / (uRing.y - uRing.x), 0.5)).a;
          diffuse *= 1.0 - 0.8 * a;
        }
      }
    }

    vec3 col = albedo * diffuse * uExposure;
    float rim = pow(1.0 - max(dot(n, v), 0.0), 4.0);
    col += uAtmos * rim * uAtmosStrength * smoothstep(-0.25, 0.4, ndl);
    gl_FragColor = vec4(col, 1.0);
  }
`;

const ringVertex = /* glsl */ `
  varying vec3 vLocal;
  varying vec3 vWorld;
  void main() {
    vLocal = position;
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorld = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const ringFragment = /* glsl */ `
  uniform sampler2D uRingMap;
  uniform vec3 uSun;
  uniform vec3 uCenter;
  uniform float uRadius;
  uniform vec2 uRing;
  uniform float uExposure;
  varying vec3 vLocal;
  varying vec3 vWorld;

  void main() {
    float r = length(vLocal.xy) / uRadius;
    float t = (r - uRing.x) / (uRing.y - uRing.x);
    if (t < 0.0 || t > 1.0) discard;
    vec4 tex = texture2D(uRingMap, vec2(t, 0.5));
    // the planet's shadow falling across the rings
    vec3 L = normalize(uSun);
    vec3 toCenter = uCenter - vWorld;
    float along = dot(toCenter, L);
    float miss = length(toCenter - along * L);
    float lit = along > 0.0 ? smoothstep(uRadius * 0.97, uRadius * 1.03, miss) : 1.0;
    gl_FragColor = vec4(tex.rgb * mix(0.05, 1.0, lit) * uExposure, tex.a * 0.95);
  }
`;

function planet(textures, { map, radius, exposure = 1.0, limb = 0, atmos = '#000000', atmosStrength = 0, tilt = 0, ring = null }) {
  const body = new THREE.Group();
  const uniforms = {
    uMap: { value: textures(map) },
    uRingMap: { value: ring ? textures(ring.map) : null },
    uSun: { value: SUN },
    uAtmos: { value: new THREE.Vector3(...hex(atmos)) },
    uAtmosStrength: { value: atmosStrength },
    uLimb: { value: limb },
    uExposure: { value: exposure },
    uCenter: { value: new THREE.Vector3() },
    uRadius: { value: radius },
    uHasRing: { value: ring ? 1 : 0 },
    uRingNormal: { value: new THREE.Vector3(0, 1, 0) },
    uRing: { value: new THREE.Vector2(ring?.inner ?? 0, ring?.outer ?? 0) },
  };
  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 96, 64),
    new THREE.ShaderMaterial({ uniforms, vertexShader: planetVertex, fragmentShader: planetFragment }),
  );
  const spin = new THREE.Group();
  spin.rotation.z = tilt;
  spin.add(sphere);
  body.add(spin);

  let ringMesh = null;
  if (ring) {
    ringMesh = new THREE.Mesh(
      new THREE.RingGeometry(radius * ring.inner, radius * ring.outer, 192, 1),
      new THREE.ShaderMaterial({
        uniforms: {
          uRingMap: uniforms.uRingMap,
          uSun: uniforms.uSun,
          uCenter: uniforms.uCenter,
          uRadius: uniforms.uRadius,
          uRing: uniforms.uRing,
          uExposure: uniforms.uExposure,
        },
        vertexShader: ringVertex,
        fragmentShader: ringFragment,
        side: THREE.DoubleSide,
        transparent: true,
        depthWrite: false,
      }),
    );
    ringMesh.rotation.set(ring.tiltX, ring.tiltY, 0);
    body.add(ringMesh);
  }

  const normal = new THREE.Vector3();
  function sync() {
    body.getWorldPosition(uniforms.uCenter.value);
    if (ringMesh) {
      ringMesh.updateWorldMatrix(true, false);
      normal.set(0, 0, 1).transformDirection(ringMesh.matrixWorld);
      uniforms.uRingNormal.value.copy(normal);
    }
  }
  return { body, sphere, sync };
}

// ---------- shooting stars ----------

const meteorVertex = domeVertex;

const meteorFragment = /* glsl */ `
  uniform float uAlpha;
  varying vec2 vUv;
  void main() {
    float across = 1.0 - abs(vUv.y - 0.5) * 2.0;
    float a = pow(vUv.x, 4.0) * across * across * uAlpha;
    gl_FragColor = vec4(1.0, 0.96, 0.9, a);
  }
`;

// ---------- assembly ----------

export function createCosmos(scene, renderer, { small = false, reduceMotion = false } = {}) {
  const loader = new THREE.TextureLoader();
  const anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const cache = new Map();
  const textures = (name) => {
    if (!cache.has(name)) {
      const t = loader.load(`assets/${name}`);
      t.anisotropy = anisotropy;
      cache.set(name, t);
    }
    return cache.get(name);
  };

  // Milky Way: a partial sphere around the camera (the panorama covers
  // 225° × 112.5° around the galactic centre), rolled so the band rises
  // to the right.
  const H = THREE.MathUtils.degToRad(225);
  const V = THREE.MathUtils.degToRad(112.5);
  const domeGeometry = new THREE.SphereGeometry(150, 96, 48, 1.5 * Math.PI - H / 2, H, (Math.PI - V) / 2, V);
  domeGeometry.scale(-1, 1, 1);
  const dome = new THREE.Mesh(
    domeGeometry,
    new THREE.ShaderMaterial({
      uniforms: { uMap: { value: textures(small ? 'sky_2k.jpg' : 'sky_4k.jpg') }, uGain: { value: 0.65 } },
      vertexShader: domeVertex,
      fragmentShader: domeFragment,
      depthTest: false,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  dome.rotation.z = 0.5;
  dome.renderOrder = -1;
  dome.frustumCulled = false;
  const skyPivot = new THREE.Group();
  skyPivot.add(dome);
  scene.add(skyPivot);

  const far = new THREE.Group();
  const mid = new THREE.Group();
  const near = new THREE.Group();
  scene.add(far, mid, near);
  // How far each layer rises over the whole story (world units).
  const travel = { far: 6, mid: 22, near: 160 };

  const stars = starField(small ? 2500 : 5000, renderer.getPixelRatio());
  far.add(stars);

  // The Whirlpool galaxy greets the reader in the opening sky.
  const galaxy = new THREE.Mesh(
    new THREE.PlaneGeometry(22, 22 * (888 / 1280)),
    new THREE.ShaderMaterial({
      uniforms: { uMap: { value: textures('m51.jpg') }, uBlack: { value: 0.05 }, uGain: { value: 0.65 } },
      vertexShader: photoVertex,
      fragmentShader: photoFragment,
      depthWrite: false,
      transparent: true,
      blending: THREE.AdditiveBlending,
    }),
  );
  galaxy.position.set(small ? 4 : -21, small ? 14 : 14, -58);
  galaxy.rotation.set(-0.25, 0.35, 0.3);
  mid.add(galaxy);

  // Five of the seven planets that name the Mongolian week pass by.
  const bodies = [
    planet(textures, { map: '2k_jupiter.jpg', radius: 3.0, exposure: 1.05, limb: 1, atmos: '#e8d2b0', atmosStrength: 0.12, tilt: 0.05 }),
    planet(textures, {
      map: '2k_saturn.jpg', radius: 2.3, exposure: 1.1, limb: 1, atmos: '#f0e0b8', atmosStrength: 0.1, tilt: 0.45,
      ring: { map: '2k_saturn_ring_alpha.png', inner: 1.24, outer: 2.27, tiltX: -1.2, tiltY: 0.35 },
    }),
    planet(textures, { map: '1k_mars.jpg', radius: 1.4, exposure: 1.0, atmos: '#ff9a6b', atmosStrength: 0.25, tilt: 0.44 }),
    planet(textures, { map: '1k_moon.jpg', radius: 1.7, exposure: 1.15, tilt: 0.1 }),
    planet(textures, { map: '1k_venus_atmosphere.jpg', radius: 1.6, exposure: 1.0, limb: 0.6, atmos: '#fff1c9', atmosStrength: 0.35, tilt: 0.05 }),
  ];
  // A planet reaches eye level when the scroll fraction is -y / travel.near;
  // these sit between chapters, so they sweep past mostly while the shapes
  // morph and the text is hidden.
  const places = [
    [21, -25, -32],
    [-21, -59, -34],
    [21, -93, -28],
    [-21, -109, -30],
    [20, -142, -34],
  ];
  bodies.forEach((b, i) => {
    const [x, y, z] = places[i];
    b.body.position.set(small ? x * 0.42 : x, y, z);
    near.add(b.body);
  });

  // Shooting star.
  const meteorMaterial = new THREE.ShaderMaterial({
    uniforms: { uAlpha: { value: 0 } },
    vertexShader: meteorVertex,
    fragmentShader: meteorFragment,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const meteor = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), meteorMaterial);
  meteor.frustumCulled = false;
  meteor.visible = false;
  scene.add(meteor);
  const fall = { start: 0, next: 4, dir: new THREE.Vector2(), from: new THREE.Vector3() };

  let lastTime = 0;
  function update(time, progress, camera, mouse) {
    const dt = Math.min(0.1, time - lastTime);
    lastTime = time;

    // The Milky Way sits at infinity: it follows the camera and only turns.
    skyPivot.position.copy(camera.position);
    skyPivot.rotation.y = -progress * 0.45 - mouse.x * 0.02;
    skyPivot.rotation.x = mouse.y * 0.015;

    far.position.set(-mouse.x * 0.6, progress * travel.far - mouse.y * 0.4, 0);
    mid.position.set(-mouse.x * 1.2, progress * travel.mid - mouse.y * 0.8, 0);
    near.position.set(-mouse.x * 2.0, progress * travel.near - mouse.y * 1.2, 0);

    stars.material.uniforms.uTime.value = time;
    bodies.forEach((b, i) => {
      if (!reduceMotion) b.sphere.rotation.y += dt * (0.025 + i * 0.006);
      b.sync();
    });

    if (reduceMotion) return;
    if (!meteor.visible && time > fall.next) {
      const angle = (rand() < 0.5 ? -0.5 : -2.64) + (rand() - 0.5) * 0.3;
      fall.dir.set(Math.cos(angle), Math.sin(angle));
      fall.from.set(camera.position.x + (rand() * 2 - 1) * 14, camera.position.y + 5 + rand() * 7, -24);
      fall.start = time;
      meteor.visible = true;
      meteor.rotation.z = angle;
    }
    if (meteor.visible) {
      const t = (time - fall.start) / 0.8;
      if (t >= 1) {
        meteor.visible = false;
        fall.next = time + 6 + rand() * 9;
      } else {
        const travelled = t * 20;
        meteor.position.set(fall.from.x + fall.dir.x * travelled, fall.from.y + fall.dir.y * travelled, fall.from.z);
        meteor.scale.set(3 + 4 * Math.sin(Math.PI * t), 0.035, 1);
        meteorMaterial.uniforms.uAlpha.value = 0.8 * Math.sin(Math.PI * t);
      }
    }
  }

  return { update };
}
