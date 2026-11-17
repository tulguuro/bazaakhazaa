// The matrix drawn in light: the ring and eight spokes that the toono turns
// into, the rhombus and the square, the numbers of one person, the age ring
// and the amin too formed out of stars.
import * as THREE from 'three';
import { AROUND } from '../matrix.js';
import { easeInOut, easeOut, glowTexture, lightMaterial, numberTexture, ribbon, seatTexture, seg, textPoints } from './gfx.js';

export const R = 4;
export const REVEAL_T = 7.4; // seconds the numbers take to appear
const DEG = Math.PI / 180;
const ANGLE = { left: 180, tl: 135, top: 90, tr: 45, right: 0, br: -45, bottom: -90, bl: -135 };
const AXES = ['left', 'top', 'right', 'bottom'];
const DIAGONALS = ['tl', 'tr', 'br', 'bl'];
const GOLD = new THREE.Color(1.0, 0.76, 0.42);
const SILVER = new THREE.Color(0.5, 0.7, 1.0);
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
  function line(points, color, width = 0.075) {
    const mesh = new THREE.Mesh(ribbon(points, width), lightMaterial(color, dim));
    mesh.renderOrder = 1;
    group.add(mesh);
    const l = { mesh, u: mesh.material.uniforms };
    lines.push(l);
    return l;
  }
  const centre = new THREE.Vector3();
  const spokes = Object.fromEntries(AROUND.map((key) => [key, line([centre, on(key)], AXES.includes(key) ? GOLD : SILVER)]));
  const ring = line(Array.from({ length: 181 }, (_, i) => {
    const a = (180 - i * 2) * DEG; // from the left point, clockwise, the way age runs
    return new THREE.Vector3(Math.cos(a) * R, Math.sin(a) * R, 0);
  }), PALE, 0.085);
  const rhombus = AXES.map((key, i) => line([on(key), on(AXES[(i + 1) % 4])], GOLD));
  const square = DIAGONALS.map((key, i) => line([on(key), on(DIAGONALS[(i + 1) % 4])], SILVER));
  const loveFrom = on('bottom', Math.SQRT1_2);
  const loveTo = on('right', Math.SQRT1_2);
  const love = line([loveFrom, loveTo], ROSE, 0.1);

  // the line of light between the two places of a link or a combination
  const beam = line([centre, on('top')], PALE, 0.14);
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
      map: glow, color: node.color.clone().multiplyScalar(2.2), transparent: true, depthTest: false, opacity: 0, blending: THREE.AdditiveBlending,
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

  // the amin too as a figure of stars
  const N = 5200;
  const start = new Float32Array(N * 3); const seed = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    start.set([(Math.random() - 0.5) * 46, (Math.random() - 0.5) * 30, -26 + Math.random() * 28], i * 3);
    seed[i] = Math.random();
  }
  const figGeo = new THREE.BufferGeometry();
  figGeo.setAttribute('position', new THREE.BufferAttribute(start, 3));
  figGeo.setAttribute('aTarget', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
  figGeo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  const figMat = new THREE.ShaderMaterial({
    uniforms: { uForm: { value: 0 }, uTime: { value: 0 }, uProj: { value: 600 } },
    vertexShader: `
      attribute vec3 aTarget; attribute float aSeed;
      uniform float uForm; uniform float uTime; uniform float uProj; varying float vA;
      void main(){
        float k = clamp(uForm * 1.7 - aSeed * 0.7, 0.0, 1.0);
        k = k * k * (3.0 - 2.0 * k);
        vec3 p = mix(position, aTarget, k);
        float ang = (1.0 - k) * 2.2 * (aSeed - 0.5);
        p.xy = mat2(cos(ang), -sin(ang), sin(ang), cos(ang)) * p.xy;
        p.xy += 0.025 * vec2(sin(uTime * 1.3 + aSeed * 50.0), cos(uTime * 1.1 + aSeed * 31.0)) * k;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = max(1.2, (0.04 + 0.055 * fract(aSeed * 7.0)) * uProj / -mv.z);
        vA = smoothstep(0.0, 0.2, uForm) * (0.6 + 0.4 * sin(uTime * 2.0 + aSeed * 90.0));
      }`,
    fragmentShader: `
      varying float vA;
      void main(){
        float r = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, r);
        gl_FragColor = vec4(vec3(1.35, 1.02, 0.6), a * a * vA * 0.78);
      }`,
    transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
  });
  const figure = new THREE.Points(figGeo, figMat);
  figure.frustumCulled = false;
  figure.position.z = 1;
  figure.renderOrder = 5;
  group.add(figure);

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
    group, nodes, seats, dim, focus: null, marker: null,

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
      for (const s of smalls) s.num.material.map = numberTexture(m.lines[s.key][s.field]);
      for (const s of loveSeats) s.num.material.map = numberTexture(m.loveMoney[s.field]);
      for (const s of [...Object.values(nodes), ...smalls, ...loveSeats]) s.num.material.needsUpdate = true;
      figGeo.attributes.aTarget.array.set(textPoints(String(m.points.centre), N, 4.3, 5.8));
      figGeo.attributes.aTarget.needsUpdate = true;
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
        pulse(l, x, 0.45);
      });
      if (beamOn) pulse(beam, ((time * 0.42) % 1) * 1.3 - 0.15, 1.2);
    },

    // join two seats with a line of light, or take it away with null
    setBeam(keys) {
      beamOn = Boolean(keys);
      if (keys) {
        beam.mesh.geometry.dispose();
        beam.mesh.geometry = ribbon(keys.map((key) => seats[key].at), 0.14);
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

    // 0 scattered stars, 1 the amin too
    setFigure(form, time) {
      figMat.uniforms.uForm.value = form;
      figMat.uniforms.uTime.value = time;
      figure.visible = form > 0.001;
    },

    // write the state to the sprites; called every frame
    apply(proj) {
      ageMat.uniforms.uProj.value = proj;
      figMat.uniforms.uProj.value = proj;
      const d = dim.value;
      markerSprite.scale.setScalar(1.15 + 0.3 * Math.sin(figMat.uniforms.uTime.value * 3));
      markerSprite.material.opacity = d;
      const paint = (s) => {
        const chosen = api.focus && api.focus.some((key) => seats[key] === s);
        const size = s.size * (1 + 0.45 * s.flash) * (chosen ? 1.35 : 1);
        s.ring.scale.setScalar(size);
        s.num.scale.setScalar(size * 0.8);
        s.ring.material.opacity = s.show * d;
        s.num.material.opacity = s.show * d;
        s.ring.material.color.copy(s.color).multiplyScalar(1.1 + 3 * s.flash + (chosen ? 1.2 : 0));
        s.num.material.color.setScalar(1 + 2.5 * s.flash);
        if (s.dot) {
          s.dot.material.opacity = s.dotShow * (1 - s.show) * d;
          s.dot.scale.setScalar(s === nodes.centre ? 0.9 : 0.55);
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
