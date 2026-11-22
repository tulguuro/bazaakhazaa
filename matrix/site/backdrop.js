// Where the matrix lives: open night sky ringed by the Milky Way, with the
// matrix itself painted in fine gold light (matrix-plate.png, made on
// Higgsfield for this site; the pair of starlight turns into it in the
// opening). The code lays only the numbers over the painted lines, so the
// picture must sit exactly where the code's matrix is.
import * as THREE from 'three';

// the night around the picture: the colour of its own edges (measured on
// sky-ring.png, about #1d1729 after the 0.92 dimming), so it runs on without a seam
export const NIGHT = '#1a1526';

const PLATE = { w: 2752, h: 1536, cx: 0.5, cy: 0.5 };   // the matrix centre in the picture (measured)
const HEIGHT = 4 / 0.3757;   // world units: the painted circle's radius (577 px) is 37.57% of the height and must be 4

export function createBackdrop(map) {
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;
  const width = (HEIGHT * PLATE.w) / PLATE.h;
  const material = new THREE.ShaderMaterial({
    uniforms: { map: { value: map }, uLight: { value: 0.92 }, uShow: { value: 1 }, uNight: { value: new THREE.Color(NIGHT) } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `
      uniform sampler2D map; uniform float uLight; uniform float uShow; uniform vec3 uNight; varying vec2 vUv;
      void main(){
        vec3 c = texture2D(map, vUv).rgb * uLight;
        // a long soft edge into the plain night colour, so the picture has no border
        float edge = smoothstep(0.0, 0.22, vUv.x) * smoothstep(0.0, 0.22, 1.0 - vUv.x)
                   * smoothstep(0.0, 0.22, vUv.y) * smoothstep(0.0, 0.22, 1.0 - vUv.y);
        gl_FragColor = vec4(mix(uNight, c, edge), uShow);
      }`,
    transparent: true, depthWrite: false, depthTest: false, fog: false,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, HEIGHT), material);
  // put the matrix centre of the picture, not the picture's centre, behind the heart of the matrix
  // in the plane of the matrix itself: the painted lines must stay under the code's numbers
  // from every distance and angle the camera takes
  mesh.position.set((0.5 - PLATE.cx) * width, (PLATE.cy - 0.5) * HEIGHT, -0.01);
  mesh.renderOrder = -10;
  mesh.frustumCulled = false;
  return { mesh, uniforms: material.uniforms };
}
