// The world of the intro: the night sky, the Earth seen from space, the
// steppe with a ger, and the inside of the ger looking up at the toono.
// Every part is a group that the timeline in main.js switches on and moves.
import * as THREE from 'three';
import { fbm, glowTexture, grainTexture } from './gfx.js';

export const TOONO_R = 4; // the toono inside the ger is as wide as the matrix

export function createWorld(skyMap, earthMaps) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 4000);
  const glow = glowTexture();

  // ── sky: a photograph of the Milky Way on a sphere, and loose stars that twinkle
  skyMap.colorSpace = THREE.SRGBColorSpace;
  const skyMat = new THREE.MeshBasicMaterial({ map: skyMap, side: THREE.BackSide, fog: false, depthWrite: false });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(2400, 64, 32), skyMat);
  sky.rotation.y = Math.PI / 2; // galactic centre ahead of the camera
  const skyTilt = new THREE.Group();
  skyTilt.rotation.set(0.32, 0, 0.62);
  skyTilt.add(sky);
  scene.add(skyTilt);

  const STARS = 2600;
  const sPos = new Float32Array(STARS * 3); const sSize = new Float32Array(STARS);
  const sPhase = new Float32Array(STARS); const sCol = new Float32Array(STARS * 3);
  for (let i = 0; i < STARS; i++) {
    const v = new THREE.Vector3().randomDirection().multiplyScalar(900 + Math.random() * 900);
    sPos.set([v.x, v.y, v.z], i * 3);
    sSize[i] = 1.2 + Math.random() ** 6 * 5.5;
    sPhase[i] = Math.random();
    const warm = Math.random();
    sCol.set([0.82 + warm * 0.18, 0.86 + warm * 0.08, 1.0 - warm * 0.22], i * 3);
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
  starGeo.setAttribute('aSize', new THREE.BufferAttribute(sSize, 1));
  starGeo.setAttribute('aPhase', new THREE.BufferAttribute(sPhase, 1));
  starGeo.setAttribute('aColor', new THREE.BufferAttribute(sCol, 3));
  const starMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uPx: { value: 1 }, uOpacity: { value: 1 } },
    vertexShader: `
      attribute float aSize; attribute float aPhase; attribute vec3 aColor;
      uniform float uTime; uniform float uPx;
      varying vec3 vC; varying float vA;
      void main(){
        vC = aColor;
        vA = 0.7 + 0.3 * sin(uTime * (0.7 + aPhase * 1.9) + aPhase * 40.0);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = aSize * uPx * (0.85 + 0.15 * vA);
      }`,
    fragmentShader: `
      uniform float uOpacity; varying vec3 vC; varying float vA;
      void main(){
        float r = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, r);
        gl_FragColor = vec4(vC * 1.5, a * a * vA * uOpacity);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const stars = new THREE.Points(starGeo, starMat);
  stars.frustumCulled = false;
  scene.add(stars);

  // ── the light that travels: a bright core, a halo and a tail
  const lightCore = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glow, color: new THREE.Color(4.2, 3.4, 2.3), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true,
  }));
  const lightHalo = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glow, color: new THREE.Color(1.0, 0.72, 0.4), opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true,
  }));
  const TAIL = 70;
  const tailGeo = new THREE.BufferGeometry();
  tailGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(TAIL * 3), 3));
  tailGeo.setAttribute('aAge', new THREE.BufferAttribute(Float32Array.from({ length: TAIL }, (_, i) => i / TAIL), 1));
  const tailMat = new THREE.ShaderMaterial({
    uniforms: { uSize: { value: 1 }, uProj: { value: 600 }, uOpacity: { value: 1 } },
    vertexShader: `
      attribute float aAge; uniform float uSize; uniform float uProj; varying float vAge;
      void main(){
        vAge = aAge;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = max(1.0, uSize * (1.0 - aAge * 0.85) * uProj / -mv.z);
      }`,
    fragmentShader: `
      uniform float uOpacity; varying float vAge;
      void main(){
        float r = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, r);
        gl_FragColor = vec4(vec3(2.2, 1.7, 1.1), a * a * (1.0 - vAge) * (1.0 - vAge) * 0.5 * uOpacity);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const tail = new THREE.Points(tailGeo, tailMat);
  tail.frustumCulled = false;
  scene.add(lightCore, lightHalo, tail);
  const light = {
    // positions[0] is where the light is now, the rest are where it was
    set(positions, size, opacity = 1, halo = 4.5) {
      const show = opacity > 0.001;
      lightCore.visible = lightHalo.visible = tail.visible = show;
      if (!show) return;
      lightCore.position.copy(positions[0]);
      lightHalo.position.copy(positions[0]);
      lightCore.scale.setScalar(size);
      lightHalo.scale.setScalar(size * halo);
      lightCore.material.opacity = opacity;
      lightHalo.material.opacity = 0.5 * opacity;
      const attr = tailGeo.attributes.position;
      for (let i = 0; i < TAIL; i++) {
        const p = positions[Math.min(positions.length - 1, i)];
        attr.setXYZ(i, p.x, p.y, p.z);
      }
      attr.needsUpdate = true;
      tailMat.uniforms.uSize.value = size * 0.5;
      tailMat.uniforms.uOpacity.value = opacity;
    },
    TAIL,
  };

  // ── the Earth from space (photographic maps), night side towards us and
  // daylight along one limb. No city lights: the story is set in the time of
  // Бөртэ чоно and Гуа марал, long before electric light.
  const EARTH_R = 45;
  const space = new THREE.Group();
  const earth = new THREE.Group();
  earth.position.set(40, -42, -170);
  const sunDir = new THREE.Vector3(-0.62, 0.55, -0.56).normalize();
  const atmoUniforms = { uSun: { value: sunDir }, uI: { value: 1 } };
  for (const map of Object.values(earthMaps)) { map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 8; }
  earthMaps.clouds.wrapS = THREE.RepeatWrapping;
  const globeUniforms = {
    uDay: { value: earthMaps.day }, uClouds: { value: earthMaps.clouds },
    uSun: atmoUniforms.uSun, uDrift: { value: 0 },
  };
  const globe = new THREE.Mesh(new THREE.SphereGeometry(EARTH_R, 128, 96), new THREE.ShaderMaterial({
    uniforms: globeUniforms,
    vertexShader: `
      varying vec2 vUv; varying vec3 vN;
      void main(){
        vUv = uv;
        vN = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      uniform sampler2D uDay; uniform sampler2D uClouds; uniform vec3 uSun; uniform float uDrift;
      varying vec2 vUv; varying vec3 vN;
      void main(){
        float nd = dot(normalize(vN), uSun);
        float day = smoothstep(-0.1, 0.28, nd);
        vec3 land = texture2D(uDay, vUv).rgb;
        float cloud = texture2D(uClouds, vUv + vec2(uDrift, 0.0)).r;
        vec3 dayCol = mix(land, vec3(1.0), cloud * 0.8) * (0.2 + 1.25 * max(nd, 0.0));
        // at night: land and cloud just visible under the moon and the stars
        vec3 dark = land * vec3(0.035, 0.045, 0.07) + vec3(0.0, 0.003, 0.01) + cloud * vec3(0.02, 0.025, 0.035);
        gl_FragColor = vec4(mix(dark, dayCol, day), 1.0);
      }`,
  }));
  earth.add(globe);
  // turn the globe so that a place (latitude, longitude) faces `towards`, north kept up
  const aimEarth = (lat, lon, towards) => {
    const rad = Math.PI / 180;
    const place = new THREE.Vector3(Math.cos(lat * rad) * Math.cos(lon * rad), Math.sin(lat * rad), -Math.cos(lat * rad) * Math.sin(lon * rad));
    const h = towards.clone().normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(place, h);
    const flat = (v) => v.clone().addScaledVector(h, -v.dot(h)).normalize();
    const north = flat(new THREE.Vector3(0, 1, 0).applyQuaternion(q));
    const up = flat(new THREE.Vector3(0, 1, 0));
    const angle = Math.atan2(new THREE.Vector3().crossVectors(north, up).dot(h), north.dot(up));
    globe.quaternion.copy(new THREE.Quaternion().setFromAxisAngle(h, angle).multiply(q));
  };
  const atmoVertex = `
    varying vec3 vN; varying vec3 vV;
    void main(){
      vec4 w = modelMatrix * vec4(position, 1.0);
      vN = normalize(mat3(modelMatrix) * normal);
      vV = normalize(cameraPosition - w.xyz);
      gl_Position = projectionMatrix * viewMatrix * w;
    }`;
  // the thin bright air on the surface side of the limb
  earth.add(new THREE.Mesh(new THREE.SphereGeometry(EARTH_R * 1.004, 96, 64), new THREE.ShaderMaterial({
    uniforms: atmoUniforms, vertexShader: atmoVertex,
    fragmentShader: `
      uniform vec3 uSun; uniform float uI; varying vec3 vN; varying vec3 vV;
      void main(){
        float f = pow(1.0 - max(dot(vN, vV), 0.0), 3.2);
        float lit = smoothstep(-0.25, 0.55, dot(vN, uSun));
        vec3 col = mix(vec3(0.16, 0.38, 1.0), vec3(1.0, 0.96, 0.9), pow(f, 2.5) * lit);
        float a = f * (0.12 + lit * 1.6) * uI;
        gl_FragColor = vec4(col * a, a);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  })));
  // the glow that reaches a little way out into space
  earth.add(new THREE.Mesh(new THREE.SphereGeometry(EARTH_R * 1.09, 96, 64), new THREE.ShaderMaterial({
    uniforms: atmoUniforms, vertexShader: atmoVertex,
    fragmentShader: `
      uniform vec3 uSun; uniform float uI; varying vec3 vN; varying vec3 vV;
      void main(){
        float d = clamp(-dot(vN, vV) / 0.4, 0.0, 1.0);
        float lit = smoothstep(-0.5, 0.4, dot(normalize(vN - vV * dot(vN, vV)), uSun));
        float a = pow(d, 3.0) * (0.05 + lit * 0.75) * uI;
        gl_FragColor = vec4(vec3(0.3, 0.55, 1.0) * a, a);
      }`,
    transparent: true, depthWrite: false, side: THREE.BackSide, blending: THREE.AdditiveBlending,
  })));
  space.add(earth);
  scene.add(space);

  // ── the steppe at night
  const steppe = new THREE.Group();
  const fog = new THREE.FogExp2(0x070c18, 0.0017);
  const groundGeo = new THREE.PlaneGeometry(3600, 3600, 220, 220);
  groundGeo.rotateX(-Math.PI / 2);
  const gp = groundGeo.attributes.position;
  for (let i = 0; i < gp.count; i++) {
    const x = gp.getX(i); const z = gp.getZ(i);
    const d = Math.hypot(x, z);
    const near = Math.min(1, Math.max(0, (d - 30) / 260));
    const far = Math.min(1, Math.max(0, (d - 380) / 500));
    gp.setY(i, (fbm(x * 0.006 + 3.1, z * 0.006 + 7.7) - 0.45) * 26 * near * near
      + fbm(x * 0.0021 + 11, z * 0.0021 + 5, 5) * 190 * far * far);
  }
  groundGeo.computeVertexNormals();
  const grain = grainTexture();
  grain.wrapS = grain.wrapT = THREE.RepeatWrapping;
  grain.repeat.set(260, 260);
  steppe.add(new THREE.Mesh(groundGeo, new THREE.MeshStandardMaterial({ color: 0x4d5a62, map: grain, roughness: 1 })));
  steppe.add(new THREE.HemisphereLight(0x3a528c, 0x06080d, 1.5));
  const moon = new THREE.DirectionalLight(0x9db6ee, 2.6);
  moon.position.set(-90, 48, 34);
  steppe.add(moon);
  // a faint band of air along the horizon
  steppe.add(new THREE.Mesh(new THREE.CylinderGeometry(2300, 2300, 520, 64, 1, true), new THREE.ShaderMaterial({
    vertexShader: 'varying float vY; void main(){ vY = uv.y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'varying float vY; void main(){ float a = pow(1.0 - vY, 3.0) * 0.5; gl_FragColor = vec4(vec3(0.16, 0.27, 0.52) * a, a); }',
    transparent: true, depthWrite: false, side: THREE.BackSide, blending: THREE.AdditiveBlending, fog: false,
  })).translateY(200));

  const felt = new THREE.MeshStandardMaterial({ color: 0xcfcbbf, roughness: 0.95 });
  const rope = new THREE.MeshStandardMaterial({ color: 0x4a3d2e, roughness: 1 });
  const wood = new THREE.MeshStandardMaterial({ color: 0x8c3a1a, roughness: 0.8 });
  const warm = new THREE.Color(1.5, 0.8, 0.32);
  function makeGer(lit = true) {
    const ger = new THREE.Group();
    const wall = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 1.5, 56, 1, true), felt);
    wall.position.y = 0.75;
    const roof = new THREE.Mesh(new THREE.CylinderGeometry(0.82, 3.1, 1.25, 56, 1, true), felt);
    roof.position.y = 2.125;
    ger.add(wall, roof);
    // the ropes that hold the roof felt, from the toono down to the eave
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2 + 0.2;
      const from = new THREE.Vector3(Math.cos(a) * 0.86, 2.765, Math.sin(a) * 0.86);
      const to = new THREE.Vector3(Math.cos(a) * 3.12, 1.51, Math.sin(a) * 3.12);
      const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, from.distanceTo(to), 5), rope);
      cord.position.copy(from).lerp(to, 0.5);
      cord.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize());
      ger.add(cord);
    }
    for (const y of [0.5, 1.0, 1.5]) {
      const band = new THREE.Mesh(new THREE.TorusGeometry(y === 1.5 ? 3.09 : 3.012, y === 1.5 ? 0.03 : 0.016, 6, 72), rope);
      band.rotation.x = Math.PI / 2; band.position.y = y;
      ger.add(band);
    }
    // toono: a wooden ring with eight spokes, firelight coming up through it
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.05, 8, 48), wood);
    ring.rotation.x = Math.PI / 2; ring.position.y = 2.76;
    ger.add(ring);
    for (let k = 0; k < 4; k++) {
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.035, 0.04), wood);
      spoke.position.y = 2.76; spoke.rotation.y = (k * Math.PI) / 4;
      ger.add(spoke);
    }
    const fire = new THREE.Mesh(new THREE.CircleGeometry(0.79, 40), new THREE.MeshBasicMaterial({ color: warm.clone(), transparent: true, opacity: 0.6 }));
    fire.rotation.x = -Math.PI / 2; fire.position.y = 2.7;
    ger.add(fire);
    // door, facing the camera, light falling out of it
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.4, 0.1), wood);
    frame.position.set(0, 0.7, 2.99);
    const door = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 1.22), new THREE.MeshBasicMaterial({ color: warm.clone().multiplyScalar(0.75) }));
    door.position.set(0, 0.66, 3.05);
    ger.add(frame, door);
    const spill = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 5), new THREE.MeshBasicMaterial({
      map: glow, color: new THREE.Color(1.3, 0.62, 0.22), transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    spill.rotation.x = -Math.PI / 2; spill.position.set(0, 0.02, 4.6);
    ger.add(spill);
    if (lit) {
      const doorLight = new THREE.PointLight(0xffa050, 9, 14);
      doorLight.position.set(0, 0.7, 4.1);
      const topLight = new THREE.PointLight(0xffa050, 3, 9);
      topLight.position.set(0, 3.5, 0);
      ger.add(doorLight, topLight);
      ger.userData = { fire, topLight };
    }
    return ger;
  }
  const ger = makeGer();
  steppe.add(ger);
  for (const [x, z, s, turn] of [[-46, -58, 1, 0.5], [-58, -44, 0.9, 0.2], [64, -96, 1, -0.4]]) {
    const other = makeGer(false);
    other.position.set(x, 0, z); other.scale.setScalar(s); other.rotation.y = turn;
    steppe.add(other);
  }
  scene.add(steppe);

  // ── inside the ger, looking up: the toono lies in the XY plane and the
  // roof poles (унь) open towards the camera like a cone
  const interior = new THREE.Group();
  const fading = [];
  const fade = (m) => { m.transparent = true; fading.push(m); return m; };
  const toonoWood = fade(new THREE.MeshStandardMaterial({ color: 0xb04a1c, roughness: 0.65 }));
  const wheel = new THREE.Group();
  wheel.add(new THREE.Mesh(new THREE.TorusGeometry(TOONO_R, 0.17, 12, 96), toonoWood));
  wheel.add(new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.09, 10, 40), toonoWood));
  for (let k = 0; k < 4; k++) {
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(TOONO_R * 2, 0.13, 0.13), toonoWood);
    spoke.rotation.z = (k * Math.PI) / 4;
    wheel.add(spoke);
  }
  interior.add(wheel);
  const UNI = 81; const OUT_R = 19; const OUT_Z = 11;
  const uniMat = fade(new THREE.MeshStandardMaterial({ color: 0xc2501d, roughness: 0.7 }));
  const uni = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.055, 0.075, 1, 6), uniMat, UNI);
  const dummy = new THREE.Object3D();
  const up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < UNI; i++) {
    const a = (i / UNI) * Math.PI * 2;
    const from = new THREE.Vector3(Math.cos(a) * (TOONO_R + 0.1), Math.sin(a) * (TOONO_R + 0.1), 0.05);
    const to = new THREE.Vector3(Math.cos(a) * OUT_R, Math.sin(a) * OUT_R, OUT_Z);
    dummy.position.copy(from).lerp(to, 0.5);
    dummy.quaternion.setFromUnitVectors(up, to.clone().sub(from).normalize());
    dummy.scale.set(1, from.distanceTo(to), 1);
    dummy.updateMatrix();
    uni.setMatrixAt(i, dummy.matrix);
  }
  interior.add(uni);
  const cover = new THREE.Mesh(new THREE.CylinderGeometry(OUT_R + 0.35, TOONO_R + 0.22, OUT_Z, 72, 1, true),
    fade(new THREE.MeshStandardMaterial({ color: 0x6f6657, roughness: 1, side: THREE.DoubleSide })));
  cover.rotation.x = Math.PI / 2; cover.position.z = OUT_Z / 2 - 0.12;
  interior.add(cover);
  let hearthBase = 260;
  const hearth = new THREE.PointLight(0xff9a48, hearthBase, 60);
  hearth.position.set(0, -4, 10);
  interior.add(hearth, new THREE.AmbientLight(0x2a1c14, 0.6));
  scene.add(interior);
  interior.userData.setFade = (f) => {
    interior.visible = f < 0.999;
    for (const m of fading) m.opacity = 1 - f;
    hearthBase = 260 * (1 - f);
  };

  return {
    scene, camera, sky, skyMat, stars, starMat, light, space, earth, atmoUniforms, EARTH_R, aimEarth,
    steppe, fog, ger, interior, hearth, tailMat,
    tick(time) {
      starMat.uniforms.uTime.value = time;
      globeUniforms.uDrift.value = time * 0.0006;
      sky.rotation.y = Math.PI / 2 + time * 0.0016;
      hearth.intensity = hearthBase * (0.93 + 0.07 * Math.sin(time * 9.0) * Math.sin(time * 5.3));
    },
  };
}
