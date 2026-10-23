import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const BLUE = 0x548cff, LIME = 0xbfd92e, N0 = 0x010d16, N1 = 0x011826, N2 = 0x07243a;
const C = (h) => new THREE.Color(h);

function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

function canvasTex(w, h, draw, srgb = true) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

const glowTex = canvasTex(256, 256, (g, w, h) => {
  const r = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
  r.addColorStop(0, 'rgba(255,255,255,1)');
  r.addColorStop(0.25, 'rgba(255,255,255,.45)');
  r.addColorStop(0.6, 'rgba(255,255,255,.1)');
  r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, w, h);
});

function glow(color, sx, sy, opacity = 1, pos = [0, 0, 0]) {
  const m = new THREE.SpriteMaterial({ map: glowTex, color: C(color), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity, fog: false });
  const s = new THREE.Sprite(m);
  s.scale.set(sx, sy ?? sx, 1);
  s.position.set(...pos);
  return s;
}

function sky({ top, mid, low, sunDir = [0, 0.05, -1], sunColor = 0xffb070, sunPower = 60, glowStrength = 1.2, discSize = 0.0, discBoost = 40, midAt = 0.3 }) {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: {
      top: { value: C(top) }, mid: { value: C(mid) }, low: { value: C(low) },
      sunDir: { value: new THREE.Vector3(...sunDir).normalize() }, sunColor: { value: C(sunColor) },
      sunPower: { value: sunPower }, glowStrength: { value: glowStrength }, discSize: { value: discSize }, discBoost: { value: discBoost }, midAt: { value: midAt },
    },
    vertexShader: 'varying vec3 vD; void main(){ vD = position; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: `varying vec3 vD; uniform vec3 top,mid,low,sunDir,sunColor; uniform float sunPower,glowStrength,discSize,discBoost,midAt;
      void main(){ vec3 d = normalize(vD); float h = d.y;
        vec3 c = mix(low, mid, smoothstep(-0.02, midAt, h));
        c = mix(c, top, smoothstep(midAt*0.6, 0.95, h));
        float s = max(dot(d, normalize(sunDir)), 0.);
        c += sunColor * (pow(s, sunPower) * glowStrength + pow(s, sunPower*0.12) * glowStrength * 0.18);
        if (discSize > 0.) c += sunColor * discBoost * smoothstep(1.-discSize, 1.-discSize*0.7, s);
        gl_FragColor = vec4(c, 1.); }`,
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(500, 64, 32), mat);
  m.renderOrder = -10;
  return m;
}

function envFrom(renderer, scene) {
  const pm = new THREE.PMREMGenerator(renderer);
  const t = pm.fromScene(scene, 0.02, 0.1, 1000).texture;
  pm.dispose();
  return t;
}

// Studio-like environment: dark room with coloured strip lights.
function studioEnv(renderer, panels, base = 0x020a12) {
  const s = new THREE.Scene();
  s.background = C(base);
  s.add(new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), new THREE.MeshBasicMaterial({ color: C(base), side: THREE.BackSide })));
  for (const p of panels) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(p.size[0], p.size[1]), new THREE.MeshBasicMaterial({ color: C(p.color).multiplyScalar(p.i), side: THREE.DoubleSide }));
    m.position.set(...p.pos);
    m.lookAt(0, 0, 0);
    s.add(m);
  }
  return envFrom(renderer, s);
}

function baseScene(bg, fogColor, fogNear, fogFar) {
  const scene = new THREE.Scene();
  scene.background = C(fogColor === N1 ? N1 : bg);
  scene.fog = new THREE.Fog(C(fogColor), fogNear, fogFar);
  return scene;
}

function perspective(fov, pos, look, near = 0.1, far = 1000) {
  const c = new THREE.PerspectiveCamera(fov, 16 / 9, near, far);
  c.position.set(...pos);
  c.lookAt(...look);
  return c;
}

function shiftContent(camera, W, H, fx, fy = 0) {
  camera.setViewOffset(W, H, -fx * W, -fy * H, W, H);
}

function ocean({ size = 400, seg = 700, amp = 0.12, color = N0, rough = 0.1, metal = 0.9, waveScale = 1, fadeAt = 0 }) {
  const g = new THREE.PlaneGeometry(size, size, seg, seg);
  g.rotateX(-Math.PI / 2);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i);
    const d = Math.min(1, Math.abs(z) / 30 + 0.3) * Math.exp(-Math.max(0, Math.abs(z) - 25) / 40);
    const k = waveScale;
    const y = (Math.sin((x * 0.83 + z * 0.41) * 0.8 * k) * 0.5 + Math.sin((x * -0.37 + z * 0.93) * 1.3 * k + 1.3) * 0.35 + Math.sin((x * 0.61 - z * 0.52) * 2.2 * k + 2.9) * 0.2 + Math.sin((x * 0.14 + z * 0.99) * 0.6 * k + 4.1) * 0.4) * amp * d;
    p.setY(i, y);
  }
  g.computeVertexNormals();
  return new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: C(color), roughness: rough, metalness: metal, envMapIntensity: 1 }));
}

// Dark glossy floor over a mirrored copy of the objects.
function addMirrored(scene, group, floorColor = N0, opacity = 0.78, size = 400) {
  const m = group.clone();
  m.scale.y *= -1;
  scene.add(m);
  const f = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshBasicMaterial({ color: C(floorColor), transparent: true, opacity }));
  f.rotation.x = -Math.PI / 2;
  f.position.y = 0.002;
  scene.add(f);
  return f;
}

function fogBands(scene, color, y, z0, z1, n, w, h, op, xs = [-30, 30]) {
  const r = rng(9);
  for (let i = 0; i < n; i++) {
    const z = z0 + (z1 - z0) * (i / n);
    scene.add(glow(color, w * (0.6 + r()), h * (0.6 + r() * 0.8), op * (0.5 + r() * 0.5), [xs[0] + (xs[1] - xs[0]) * r(), y + r() * h * 0.2, z]));
  }
}

function rimRig(scene, { blue = 6, warm = 0, warmColor = 0xffb070 } = {}) {
  scene.add(new THREE.HemisphereLight(C(0x2a4a7a), C(N0), 0.5));
  const a = new THREE.DirectionalLight(C(BLUE), blue);
  a.position.set(-6, 5, -8);
  scene.add(a);
  const b = new THREE.DirectionalLight(C(0xbcd4ff), blue * 0.5);
  b.position.set(8, 4, -6);
  scene.add(b);
  if (warm) {
    const w = new THREE.DirectionalLight(C(warmColor), warm);
    w.position.set(4, 3, 6);
    scene.add(w);
  }
}

const gloss = (color, extra = {}) => new THREE.MeshPhysicalMaterial({ color: C(color), metalness: 0.6, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.06, envMapIntensity: 1.2, ...extra });
const emissive = (color, k = 3) => new THREE.MeshBasicMaterial({ color: C(color).multiplyScalar(k), toneMapped: true });

/* ------------------------------------------------------------------ */

function horizon({ renderer, W, H }) {
  const sunDir = [0.42, 0.035, -1];
  const dome = sky({ top: N0, mid: 0x0b3354, low: 0x5a7fb0, sunDir, sunColor: 0xff8a45, sunPower: 140, glowStrength: 0.9, discSize: 0.0006, discBoost: 14, midAt: 0.22 });
  const envScene = new THREE.Scene(); envScene.add(dome.clone());
  const scene = baseScene(N0, 0x2b4d78, 40, 330);
  scene.add(dome);
  scene.environment = envFrom(renderer, envScene);
  const sea = ocean({ size: 600, seg: 900, amp: 0.2, color: 0x06182a, rough: 0.05, metal: 0.15 });
  scene.add(sea);
  const camera = perspective(32, [0, 1.6, 0], [2, 1.55, -40]);
  // sun glow column + haze
  const sun = new THREE.Vector3(...sunDir).normalize().multiplyScalar(300);
  scene.add(glow(0xff8a45, 90, 26, 0.45, [sun.x, sun.y + 1, sun.z]));
  scene.add(glow(0xffc890, 14, 6, 0.8, [sun.x, sun.y, sun.z]));
  scene.add(glow(0xff7a3a, 7, 150, 0.22, [sun.x * 0.18, 0.2, sun.z * 0.18]));
  fogBands(scene, 0x6a8fc0, 4, -280, -120, 12, 160, 14, 0.14, [-200, 200]);
  return { scene, camera, bloom: [0.35, 0.8, 0.85], exposure: 1.0 };
}

function marine({ renderer, W, H }) {
  const sunDir = [-0.55, 0.06, -1];
  const dome = sky({ top: N0, mid: 0x0d3a60, low: 0x4f7db8, sunDir, sunColor: 0xff8a45, sunPower: 90, glowStrength: 0.8, midAt: 0.25 });
  const envScene = new THREE.Scene(); envScene.add(dome.clone());
  const scene = baseScene(N0, 0x1d4570, 30, 300);
  scene.add(dome);
  scene.environment = envFrom(renderer, envScene);
  scene.add(ocean({ size: 500, seg: 800, amp: 0.1, color: 0x06182a, rough: 0.05, metal: 0.15, waveScale: 0.8 }));

  const ship = new THREE.Group();
  const shape = new THREE.Shape();
  shape.moveTo(-9, -1.2); shape.lineTo(-9, 1.7); shape.lineTo(8.2, 1.7);
  shape.quadraticCurveTo(10.6, 1.5, 11.2, 0.6); shape.lineTo(9.4, -1.2); shape.closePath();
  const hullG = new THREE.ExtrudeGeometry(shape, { depth: 3, bevelEnabled: true, bevelSize: 0.35, bevelThickness: 0.35, bevelSegments: 6, curveSegments: 24 });
  hullG.translate(0, 0, -1.5);
  const hp = hullG.attributes.position;
  for (let i = 0; i < hp.count; i++) {
    const x = hp.getX(i), y = hp.getY(i);
    let k = 1;
    if (x > 3) k = 1 - Math.pow((x - 3) / 8.5, 1.6) * 0.95;
    if (y < 0) k *= 1 - Math.min(1, -y / 1.4) * 0.35;
    hp.setZ(i, hp.getZ(i) * Math.max(k, 0.03));
  }
  hullG.computeVertexNormals();
  const hull = new THREE.Mesh(hullG, gloss(0x0d2d4d, { metalness: 0.5, roughness: 0.3, envMapIntensity: 2.2 }));
  ship.add(hull);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(18, 0.12, 3.9), emissive(0x7c1d1d, 0));
  stripe.visible = false; ship.add(stripe);
  const r = rng(5);
  const cols = [0x0f3a6d, 0x1b4f96, 0x548cff, 0x0b2b4c, 0x2b64c4, 0x123660];
  for (let ix = 0; ix < 11; ix++) for (let iz = 0; iz < 3; iz++) {
    const hgt = 1 + Math.floor(r() * 3.6 * (1 - Math.abs(ix - 5) / 9));
    for (let iy = 0; iy < hgt; iy++) {
      const lime = ix === 6 && iz === 1 && iy === hgt - 1;
      const m = gloss(lime ? LIME : cols[Math.floor(r() * cols.length)], { metalness: 0.3, roughness: 0.4, clearcoat: 0.6 });
      const b = new THREE.Mesh(new RoundedBoxGeometry(1.45, 1.1, 0.95, 2, 0.04), m);
      b.position.set(-4.6 + ix * 1.5, 2.3 + iy * 1.12, -1.05 + iz * 1.05);
      ship.add(b);
    }
  }
  const bridge = new THREE.Mesh(new RoundedBoxGeometry(2.4, 5, 3.4, 3, 0.1), gloss(0x8fa8c8, { metalness: 0.3, roughness: 0.35 }));
  bridge.position.set(-7.4, 4.4, 0); ship.add(bridge);
  const win = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.5, 3), emissive(0xffc98a, 1.2));
  win.position.set(-6.18, 6.2, 0); ship.add(win);
  const funnel = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.65, 1.4, 20), gloss(BLUE));
  funnel.position.set(-7.6, 7.6, 0); ship.add(funnel);
  ship.position.set(2, 0.5, 0);
  ship.rotation.y = 0.32;
  const wrap = new THREE.Group(); wrap.add(ship);
  scene.add(wrap);
  
  // mirrored hull in water
  const mir = ship.clone(); mir.scale.y = -0.9; mir.position.y = -0.5 - 0.05;
  mir.traverse((o) => { if (o.material) { o.material = o.material.clone(); o.material.transparent = true; o.material.opacity = 0.35; } });
  scene.add(mir);
  rimRig(scene, { blue: 5, warm: 3 });
  const sun = new THREE.Vector3(...sunDir).normalize().multiplyScalar(300);
  scene.add(glow(0xff8a45, 90, 24, 0.5, [sun.x, sun.y + 1, sun.z]));
  fogBands(scene, 0x4f7db8, 3, -250, -100, 10, 160, 12, 0.14, [-200, 200]);
  const camera = perspective(30, [-3, 2.6, 36], [4, 3.0, 0]);
  shiftContent(camera, W, H, 0.12);
  return { scene, camera, bloom: [0.3, 0.8, 0.85], exposure: 1.1 };
}

function aviation({ renderer, W, H }) {
  const sunDir = [-0.5, 0.0, -1];
  const dome = sky({ top: N0, mid: 0x07243a, low: 0x2f5f98, sunDir, sunColor: 0xff8f4f, sunPower: 60, glowStrength: 0.75, midAt: 0.45 });
  const envScene = new THREE.Scene(); envScene.add(dome.clone());
  const scene = baseScene(N0, 0x0b2e4d, 80, 500);
  scene.add(dome);
  scene.environment = envFrom(renderer, envScene);
  scene.environmentIntensity = 1.3;

  const plane = new THREE.Group();
  const mat = gloss(0xdfeaff, { metalness: 0.5, roughness: 0.25, envMapIntensity: 1.8 });
  const prof = [[0, 7.2], [0.35, 6.8], [0.62, 5.6], [0.78, 3.5], [0.8, 0], [0.76, -3.5], [0.6, -6], [0.32, -7.6], [0.12, -8.2], [0, -8.3]]
    .map(([r, y]) => new THREE.Vector2(r, y));
  const fus = new THREE.Mesh(new THREE.LatheGeometry(prof, 64), mat);
  fus.rotation.z = -Math.PI / 2; plane.add(fus);
  const wingS = new THREE.Shape();
  wingS.moveTo(1.6, 0.4); wingS.lineTo(-1.8, 8.8); wingS.lineTo(-3.0, 8.8); wingS.lineTo(-2.6, 0.4); wingS.closePath();
  const wingG = new THREE.ExtrudeGeometry(wingS, { depth: 0.14, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05, bevelSegments: 2 });
  wingG.rotateX(-Math.PI / 2);
  const wR = new THREE.Mesh(wingG, mat); wR.position.set(0, -0.2, 0); wR.rotation.z = 0.05;
  const wL = wR.clone(); wL.scale.z = -1; wL.rotation.z = -0.05;
  plane.add(wR, wL);
  const tailS = new THREE.Shape();
  tailS.moveTo(0, 0); tailS.lineTo(-2.2, 3.0); tailS.lineTo(-3.1, 3.0); tailS.lineTo(-2.6, 0); tailS.closePath();
  const tailG = new THREE.ExtrudeGeometry(tailS, { depth: 0.1, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.04, bevelSegments: 2 });
  tailG.translate(0, 0, -0.05);
  const fin = new THREE.Mesh(tailG, mat); fin.position.set(-5.2, 0.5, 0); plane.add(fin);
  const stabS = new THREE.Shape();
  stabS.moveTo(0.4, 0.2); stabS.lineTo(-1.5, 3.2); stabS.lineTo(-2.3, 3.2); stabS.lineTo(-2.0, 0.2); stabS.closePath();
  const stabG = new THREE.ExtrudeGeometry(stabS, { depth: 0.1, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03 });
  stabG.rotateX(-Math.PI / 2);
  const sR = new THREE.Mesh(stabG, mat); sR.position.set(-5.8, 0.2, 0); plane.add(sR);
  const sL = sR.clone(); sL.scale.z = -1; plane.add(sL);
  for (const z of [-3.2, 3.2]) {
    const e = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.42, 2.2, 32), gloss(0x9db4d8, { metalness: 0.9, roughness: 0.25 }));
    e.rotation.z = Math.PI / 2; e.position.set(0.3, -0.75, z); plane.add(e);
    const inlet = new THREE.Mesh(new THREE.CircleGeometry(0.4, 32), new THREE.MeshBasicMaterial({ color: 0x02080f }));
    inlet.rotation.y = Math.PI / 2; inlet.position.set(1.41, -0.75, z); plane.add(inlet);
  }
  const win = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.01, 0.01), emissive(LIME));
  plane.add(win);
  for (const [z, c] of [[-8.8, 0x548cff], [8.8, LIME]]) {
    const l = glow(c, 2.4, 2.4, 1, [-2.9, 0.05, z]); plane.add(l);
  }
  plane.add(glow(0xffffff, 1.6, 1.6, 0.9, [-8.3, 0.4, 0]));
  plane.scale.setScalar(0.68);
  plane.position.set(5.6, 3.2, -12);
  plane.rotation.set(0.12, -0.38, 0.17);
  scene.add(plane);
  const key = new THREE.DirectionalLight(C(0xff9a60), 3);
  key.position.set(-10, 0, -8); scene.add(key);
  const fill = new THREE.DirectionalLight(C(BLUE), 2.2);
  fill.position.set(5, 8, 8); scene.add(fill);

  // cloud layers
  const r = rng(11);
  const cloud = canvasTex(512, 128, (g, w, h) => {
    for (let i = 0; i < 40; i++) {
      const x = w * (0.15 + r() * 0.7), y = h * (0.35 + r() * 0.3), rad = 20 + r() * 50;
      const gr = g.createRadialGradient(x, y, 0, x, y, rad);
      gr.addColorStop(0, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
    }
  });
  for (let i = 0; i < 18; i++) {
    const t = i / 18;
    const m = new THREE.SpriteMaterial({ map: cloud, color: C(t < 0.35 ? 0xc07a60 : 0x2d5a90), transparent: true, opacity: 0.18 + r() * 0.2, depthWrite: false, fog: false });
    const s = new THREE.Sprite(m);
    const dist = 200 + r() * 100;
    s.scale.set(120 + r() * 140, 22 + r() * 16, 1);
    s.position.set(-120 + r() * 300, -6 + t * 40 + r() * 6, -dist);
    scene.add(s);
  }
  const camera = perspective(32, [0, 0, 6], [2.0, 1.8, -10]);
  return { scene, camera, bloom: [0.3, 0.7, 0.85], exposure: 1.1 };
}

function carBody(res) {
  const g = new THREE.SphereGeometry(1, res * 2, res);
  const p = g.attributes.position;
  const gauss = (x, c, s) => Math.exp(-(((x - c) / s) ** 2));
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const X = x * 2.7;
    const cab = gauss(X, -0.15, 1.0);
    let Y;
    if (y >= 0) Y = y * (0.36 + 0.46 * cab);
    else Y = y * 0.26;
    const Z = z * (1.02 - 0.2 * cab * Math.max(y, 0));
    const nose = X > 1.2 ? (X - 1.2) / 1.5 : 0;
    p.setXYZ(i, X, Y - nose * nose * 0.08 * (Y > 0 ? 1 : 0), Z);
  }
  g.computeVertexNormals();
  return g;
}

function carGroup(solidMat, wheelMat) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(carBody(96), solidMat);
  body.position.y = 0.62; g.add(body);
  for (const x of [-1.6, 1.55]) for (const z of [-0.86, 0.86]) {
    const t = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.13, 24, 48), wheelMat);
    t.position.set(x, 0.5, z); g.add(t);
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.2, 32), gloss(0xa9b8d0, { metalness: 1, roughness: 0.2 }));
    rim.rotation.x = Math.PI / 2; rim.position.set(x, 0.5, z); g.add(rim);
  }
  return { g, body };
}

function wireframe({ renderer, W, H }) {
  const scene = baseScene(N0, N1, 8, 40);
  scene.environment = studioEnv(renderer, [
    { color: BLUE, i: 6, pos: [-8, 4, -6], size: [12, 2] }, { color: 0xbcd4ff, i: 5, pos: [8, 6, -4], size: [10, 2] },
    { color: 0xffb070, i: 3, pos: [0, 3, 9], size: [8, 2] }, { color: BLUE, i: 2.5, pos: [0, 10, 0], size: [14, 8] },
  ]);
  const carRot = -0.45, carPos = new THREE.Vector3(1.3, 0, 0), clipX = 0.35;
  const nrm = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), carRot);
  const p0 = carPos.clone().addScaledVector(nrm, clipX);
  const solidMat = gloss(0x0a3a8a, { metalness: 0.75, roughness: 0.14, clipShadows: true });
  solidMat.clippingPlanes = [new THREE.Plane().setFromNormalAndCoplanarPoint(nrm.clone(), p0)];
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x03080e, roughness: 0.5 });
  const car = new THREE.Group();
  const { g, body } = carGroup(solidMat, wheelMat);
  car.add(g);
  const wire = new THREE.Mesh(carBody(26), new THREE.MeshBasicMaterial({ color: C(BLUE).multiplyScalar(1.6), wireframe: true, transparent: true, opacity: 0.8, clippingPlanes: [new THREE.Plane().setFromNormalAndCoplanarPoint(nrm.clone().negate(), p0)] }));
  wire.position.y = 0.62; car.add(wire);
  const inner = new THREE.Mesh(carBody(26), new THREE.MeshBasicMaterial({ color: 0x010a14, clippingPlanes: [new THREE.Plane().setFromNormalAndCoplanarPoint(nrm.clone().negate(), p0)] }));
  inner.scale.setScalar(0.995); inner.position.y = 0.62; car.add(inner);
  const scan = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.1), new THREE.MeshBasicMaterial({ color: C(LIME).multiplyScalar(1.4), transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false }));
  scan.rotation.y = Math.PI / 2; scan.position.set(clipX, 0.95, 0); scan.scale.set(1.6, 1.2, 1);
  const edge = new THREE.Mesh(new THREE.PlaneGeometry(0.012, 1.3), emissive(LIME, 2.5));
  edge.rotation.y = Math.PI / 2; edge.position.set(clipX, 0.9, 0);
  car.add(scan, edge);
  car.rotation.y = carRot;
  car.position.copy(carPos);
  scene.add(car);
  addMirrored(scene, car, N0, 0.8);
  rimRig(scene, { blue: 3, warm: 1.2 });
  scene.add(glow(BLUE, 14, 4, 0.35, [0, 0.1, -4]));
  scene.add(glow(BLUE, 9, 9, 0.16, [3, 3, -6]));
  const camera = perspective(28, [-1.0, 1.9, 10.8], [0.8, 0.7, 0]);
  shiftContent(camera, W, H, 0.06);
  return { scene, camera, bloom: [0.4, 0.7, 0.85], exposure: 1.05 };
}

function render({ renderer, W, H }) {
  const scene = baseScene(N0, N1, 10, 45);
  scene.environment = studioEnv(renderer, [
    { color: BLUE, i: 8, pos: [-7, 3, -5], size: [10, 2] }, { color: 0xffffff, i: 6, pos: [7, 5, -3], size: [8, 2] },
    { color: LIME, i: 2.5, pos: [-4, 6, 4], size: [4, 1] }, { color: 0xbcd4ff, i: 4, pos: [0, 9, 0], size: [10, 6] }, { color: 0x4a7fe0, i: 3, pos: [4, 2, 8], size: [8, 2] },
  ]);
  const g = new THREE.Group();
  const cryst = new THREE.Mesh(new THREE.IcosahedronGeometry(1.9, 1), new THREE.MeshPhysicalMaterial({ color: C(0x1a4fb8), metalness: 0.35, roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.03, flatShading: true, envMapIntensity: 1.8, iridescence: 0.5 }));
  cryst.position.set(0, 2.6, 0); cryst.rotation.set(0.5, 0.6, 0.15); g.add(cryst);
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(1.93, 1)), new THREE.LineBasicMaterial({ color: C(0xbcd4ff), transparent: true, opacity: 0.35 }));
  edges.position.copy(cryst.position); edges.rotation.copy(cryst.rotation); g.add(edges);
  const r = rng(3);
  const smalls = [[new THREE.OctahedronGeometry(0.55), [-2.6, 0.9, 1.2], BLUE], [new THREE.OctahedronGeometry(0.4), [2.9, 1.1, 1.8], 0x0e3a82], [new THREE.TetrahedronGeometry(0.5), [3.4, 0.7, -0.8], LIME], [new THREE.IcosahedronGeometry(0.35, 0), [-3.4, 0.5, -0.6], 0x2a64d0], [new THREE.OctahedronGeometry(0.28), [2.2, 4.6, -1], BLUE]];
  for (const [geo, pos, c] of smalls) {
    const m = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ color: C(c), metalness: c === LIME ? 0.2 : 0.4, roughness: 0.1, clearcoat: 1, flatShading: true, envMapIntensity: 1.6 }));
    m.position.set(pos[0], pos[1] + 0.2, pos[2]); m.rotation.set(r() * 3, r() * 3, r() * 3); g.add(m);
  }
  g.position.x = 4.2;
  scene.add(g);
  addMirrored(scene, g, N0, 0.82);
  rimRig(scene, { blue: 2.5, warm: 0.6 });
  scene.add(glow(BLUE, 16, 16, 0.3, [4.2, 2.6, -2.5]));
  scene.add(glow(BLUE, 22, 3, 0.35, [4, 0.05, -2]));
  const camera = perspective(30, [0, 3, 15], [3.5, 1.9, 0]);
  return { scene, camera, bloom: [0.4, 0.7, 0.85], exposure: 1.05 };
}

function twin({ renderer, W, H }) {
  const scene = baseScene(N0, N1, 12, 55);
  scene.environment = studioEnv(renderer, [
    { color: BLUE, i: 7, pos: [-7, 3, -5], size: [10, 2] }, { color: 0xffffff, i: 5, pos: [7, 5, -3], size: [8, 2] },
    { color: 0xbcd4ff, i: 4, pos: [0, 9, 0], size: [10, 6] }, { color: 0xffb070, i: 2, pos: [3, 2, 8], size: [8, 2] },
  ]);
  const solid = new THREE.Mesh(new THREE.TorusKnotGeometry(1.1, 0.38, 360, 64, 2, 3), gloss(0x1558d6, { metalness: 0.5, roughness: 0.1 }));
  solid.position.set(5.3, 2.3, 0.6); solid.rotation.set(0.4, 0.5, 0);
  const wireG = new THREE.TorusKnotGeometry(1.1, 0.38, 90, 14, 2, 3);
  const wire = new THREE.Mesh(wireG, new THREE.MeshBasicMaterial({ color: C(BLUE).multiplyScalar(1.7), wireframe: true, transparent: true, opacity: 0.7 }));
  wire.position.set(1.4, 2.3, -1.2); wire.rotation.copy(solid.rotation);
  const wcore = new THREE.Mesh(wireG, new THREE.MeshBasicMaterial({ color: 0x010a14 }));
  wcore.scale.setScalar(0.985); wcore.position.copy(wire.position); wcore.rotation.copy(wire.rotation);
  const pts = new THREE.Points(wireG, new THREE.PointsMaterial({ color: C(LIME).multiplyScalar(1.5), size: 0.045, sizeAttenuation: true }));
  pts.position.copy(wire.position); pts.rotation.copy(wire.rotation);
  const g = new THREE.Group(); g.add(solid, wire, wcore);
  scene.add(g, pts);
  addMirrored(scene, g, N0, 0.82);
  // connection rings on the floor
  for (const [x, z] of [[5.3, 0.6], [1.4, -1.2]]) {
    const ring = new THREE.Mesh(new THREE.RingGeometry(1.3, 1.34, 96), new THREE.MeshBasicMaterial({ color: C(BLUE).multiplyScalar(1.4), transparent: true, opacity: 0.6, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2; ring.position.set(x, 0.01, z); scene.add(ring);
  }
  const bridge = new THREE.Mesh(new THREE.PlaneGeometry(3.9, 0.02), emissive(LIME, 1.6));
  bridge.rotation.x = -Math.PI / 2; bridge.position.set(3.35, 0.012, -0.3); bridge.rotation.z = 0.0; scene.add(bridge);
  rimRig(scene, { blue: 2.5, warm: 0.5 });
  scene.add(glow(BLUE, 22, 3, 0.35, [3.4, 0.05, -2]));
  scene.add(glow(BLUE, 14, 14, 0.22, [3.5, 3, -4]));
  const camera = perspective(30, [0, 3.2, 15], [3.3, 1.8, 0]);
  return { scene, camera, bloom: [0.4, 0.7, 0.85], exposure: 1.05 };
}

function sensing({ renderer, W, H }) {
  const scene = baseScene(N0, N1, 6, 30);
  scene.environment = studioEnv(renderer, [{ color: BLUE, i: 5, pos: [-6, 3, -4], size: [8, 3] }, { color: 0xffffff, i: 3, pos: [6, 4, -4], size: [6, 2] }, { color: 0xffb070, i: 1.5, pos: [0, 4, -8], size: [8, 3] }]);
  // windshield dusk gradient
  const ws = canvasTex(512, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#07243a'); gr.addColorStop(0.55, '#1d4a80'); gr.addColorStop(0.88, '#d08a62'); gr.addColorStop(1, '#4a3a58');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  });
  const wind = new THREE.Mesh(new THREE.PlaneGeometry(22, 8), new THREE.MeshBasicMaterial({ map: ws, fog: false, color: 0xbbbbbb }));
  wind.position.set(2, 3.2, -9); scene.add(wind);
  const dark = new THREE.MeshStandardMaterial({ color: 0x030c14, roughness: 0.35, metalness: 0.4 });
  const dash = new THREE.Mesh(new RoundedBoxGeometry(24, 1.8, 3, 4, 0.3), new THREE.MeshStandardMaterial({ color: 0x030c14, roughness: 0.8, metalness: 0.1 }));
  dash.position.set(1, -0.9, -2.5); scene.add(dash);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(26, 1, 6), dark);
  roof.position.set(1, 7, -4); scene.add(roof);
  for (const [x, rz] of [[-9.5, 0.45], [12.5, -0.45]]) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(1.2, 9, 1.2), dark);
    p.position.set(x, 3, -4); p.rotation.z = rz; scene.add(p);
  }
  // seat + occupant silhouette (right side)
  const seatMat = gloss(0x0b2a47, { metalness: 0.35, roughness: 0.3 });
  const body = new THREE.Group();
  const seatBack = new THREE.Mesh(new RoundedBoxGeometry(2.7, 3.4, 0.6, 6, 0.28), gloss(0x04121f, { metalness: 0.2, roughness: 0.45 }));
  seatBack.position.set(0, 1.5, 1.2); body.add(seatBack);
  const shoulders = new THREE.Mesh(new THREE.CapsuleGeometry(0.62, 1.7, 16, 32), seatMat);
  shoulders.rotation.z = Math.PI / 2; shoulders.position.set(0, 3.55, 0.5); body.add(shoulders);
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.95, 1.2, 16, 32), seatMat);
  torso.scale.set(1.0, 1, 0.65); torso.position.set(0, 2.2, 0.5); body.add(torso);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.38, 0.6, 24), seatMat);
  neck.position.set(0, 4.1, 0.5); body.add(neck);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.68, 48, 32), seatMat);
  head.scale.set(0.92, 1.08, 1); head.position.set(0, 4.8, 0.5); body.add(head);
  for (const x of [-0.55, 0.55]) { const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.3, 12), gloss(0x04121f)); post.position.set(x, 3.7, 1.15); body.add(post); }
  body.position.set(6.2, -0.4, 1.4); scene.add(body);
  const wheel = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.14, 24, 96), gloss(0x0a1c2e, { metalness: 0.5, roughness: 0.3 }));
  wheel.position.set(6.2, 1.5, -1.6); wheel.rotation.x = -0.9; scene.add(wheel);
  // scan rings around occupant
  const ringMat = (c, k) => new THREE.MeshBasicMaterial({ color: C(c).multiplyScalar(k), transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false });
  [[0.4, 2.7, BLUE, 2], [1.4, 2.4, BLUE, 1.5], [2.4, 2.1, BLUE, 1.2], [3.6, 1.7, LIME, 1.8], [4.9, 1.3, BLUE, 1.0]].forEach(([y, r, c, k], i) => {
    const m = new THREE.Mesh(new THREE.TorusGeometry(r, i === 3 ? 0.022 : 0.014, 8, 160), ringMat(c, k));
    m.rotation.x = Math.PI / 2 + 0.08; m.position.set(6.2, y - 0.4, 1.4); m.scale.z = 1; scene.add(m);
    const halo = new THREE.Mesh(new THREE.RingGeometry(r - 0.02, r + 0.5, 128), new THREE.MeshBasicMaterial({ color: C(c).multiplyScalar(0.25), transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    halo.rotation.x = Math.PI / 2 + 0.08; halo.position.copy(m.position); scene.add(halo);
  });
  const rim = new THREE.DirectionalLight(C(0x8fb4ff), 4);
  rim.position.set(2, 4, -8); scene.add(rim);
  const rim2 = new THREE.DirectionalLight(C(0xffa070), 1.5);
  rim2.position.set(12, 3, -6); scene.add(rim2);
  scene.add(new THREE.HemisphereLight(C(0x2a4a7a), C(N0), 0.4));
  scene.add(glow(BLUE, 8, 8, 0.25, [6.2, 3, 0.5]));
  const camera = perspective(40, [1.5, 3.1, 11], [3.2, 2.6, 0]);
  return { scene, camera, bloom: [0.5, 0.8, 0.6], exposure: 1.0 };
}

function cockpit({ renderer, W, H }) {
  const scene = baseScene(N0, N1, 10, 40);
  scene.environment = studioEnv(renderer, [{ color: BLUE, i: 5, pos: [4, 5, -4], size: [10, 3] }, { color: 0xffffff, i: 2, pos: [-6, 4, -2], size: [6, 2] }, { color: 0xffb070, i: 2, pos: [0, 3, -9], size: [10, 2] }]);
  const ws = canvasTex(512, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#010d16'); gr.addColorStop(0.6, '#0b3354'); gr.addColorStop(0.92, '#c87a50'); gr.addColorStop(1, '#2a3a58');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  });
  const wind = new THREE.Mesh(new THREE.PlaneGeometry(60, 20), new THREE.MeshBasicMaterial({ map: ws, fog: false }));
  wind.position.set(0, 7, -22); scene.add(wind);
  // dashboard
  const dashS = new THREE.Shape();
  dashS.moveTo(-14, 0); dashS.lineTo(14, 0); dashS.lineTo(14, 1.5); dashS.quadraticCurveTo(0, 3.2, -14, 1.5); dashS.closePath();
  const dash = new THREE.Mesh(new THREE.ExtrudeGeometry(dashS, { depth: 4, bevelEnabled: true, bevelSize: 0.25, bevelThickness: 0.25, bevelSegments: 6, curveSegments: 40 }), gloss(0x0a2036, { metalness: 0.5, roughness: 0.2, envMapIntensity: 1.5 }));
  dash.position.set(0, -2.6, -9); scene.add(dash);
  // curved display
  const R = 9;
  const ui = canvasTex(2048, 512, (g, w, h) => {
    const bg = g.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, '#03101c'); bg.addColorStop(0.5, '#082a4a'); bg.addColorStop(1, '#0b3b6c');
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    const r = rng(7);
    const card = (x, y, cw, ch, c, a) => { g.fillStyle = c; g.globalAlpha = a; g.beginPath(); g.roundRect(x, y, cw, ch, 26); g.fill(); g.globalAlpha = 1; };
    card(60, 50, 520, 412, '#548CFF', 0.16); card(620, 50, 540, 190, '#548CFF', 0.12); card(620, 272, 540, 190, '#ffffff', 0.06); card(1200, 50, 380, 412, '#548CFF', 0.1); card(1620, 50, 370, 190, '#ffffff', 0.07); card(1620, 272, 370, 190, '#BFD92E', 0.14);
    // speed arc
    g.lineWidth = 26; g.lineCap = 'round';
    g.strokeStyle = 'rgba(84,140,255,.25)'; g.beginPath(); g.arc(320, 290, 160, Math.PI * 0.8, Math.PI * 2.2); g.stroke();
    g.strokeStyle = '#8fb4ff'; g.shadowColor = '#548CFF'; g.shadowBlur = 30; g.beginPath(); g.arc(320, 290, 160, Math.PI * 0.8, Math.PI * 1.7); g.stroke();
    g.shadowBlur = 0;
    // route line + map
    g.strokeStyle = '#548CFF'; g.lineWidth = 8; g.beginPath(); g.moveTo(660, 210); g.bezierCurveTo(800, 80, 900, 220, 1120, 90); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,.2)'; g.lineWidth = 3;
    for (let i = 0; i < 8; i++) { g.beginPath(); g.moveTo(640, 300 + i * 20); g.lineTo(640 + 160 + r() * 340, 300 + i * 20); g.stroke(); }
    // bars
    for (let i = 0; i < 9; i++) { g.fillStyle = i === 6 ? '#BFD92E' : 'rgba(143,180,255,.7)'; const bh = 60 + r() * 250; g.fillRect(1235 + i * 38, 440 - bh, 24, bh); }
    g.fillStyle = '#BFD92E'; g.beginPath(); g.arc(1805, 367, 56, 0, 7); g.fill();
    g.fillStyle = 'rgba(255,255,255,.85)'; for (let i = 0; i < 3; i++) g.fillRect(1660, 90 + i * 40, 150 - i * 30, 12);
    g.strokeStyle = 'rgba(255,255,255,.25)'; g.lineWidth = 6; g.strokeRect(2, 2, w - 4, h - 4);
  });
  const arc = 0.8, sg = new THREE.PlaneGeometry(1, 1, 96, 1);
  const sp = sg.attributes.position;
  for (let i = 0; i < sp.count; i++) {
    const t = sp.getX(i) * arc;
    sp.setXYZ(i, R * Math.sin(t), sp.getY(i) * 2.6, R * (1 - Math.cos(t)));
  }
  sg.computeVertexNormals();
  const screen = new THREE.Mesh(sg, new THREE.MeshBasicMaterial({ map: ui, color: C(0xffffff).multiplyScalar(1.15) }));
  screen.position.set(3.4, 1.5, -8); screen.rotation.y = -0.2;
  scene.add(screen);
  scene.add(glow(BLUE, 16, 6, 0.3, [3.4, 1.9, -7.8]));
  scene.add(glow(BLUE, 24, 2.5, 0.3, [3.4, 0.4, -7]));
  // wheel
  const wheel = new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.28, 32, 96, Math.PI * 1.2), gloss(0x050d17, { metalness: 0.5, roughness: 0.3 }));
  wheel.position.set(-4.2, -1.8, -3); wheel.rotation.set(-0.6, 0.2, 0.3); scene.add(wheel);
  scene.add(new THREE.HemisphereLight(C(0x2a5a9a), C(N0), 0.5));
  const l = new THREE.PointLight(C(BLUE), 40, 20); l.position.set(2.6, 1.0, -6); scene.add(l);
  const rim = new THREE.DirectionalLight(C(0xffa070), 2); rim.position.set(0, 2, -10); scene.add(rim);
  const camera = perspective(40, [0, 0.5, 5], [1.2, 1.0, -8]);
  return { scene, camera, bloom: [0.45, 0.8, 0.75], exposure: 1.0 };
}

function engine({ renderer, W, H }) {
  const scene = baseScene(N0, N1, 20, 60);
  scene.environment = studioEnv(renderer, [
    { color: BLUE, i: 2.2, pos: [-7, 4, -5], size: [10, 2] }, { color: 0xffffff, i: 1.5, pos: [7, 6, 3], size: [8, 2] }, { color: 0xbcd4ff, i: 0.7, pos: [0, 9, 0], size: [10, 8] },
  ]);
  const g = new THREE.Group();
  const add = (w, h, d, x, y, z, c, extra) => {
    const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 6, Math.min(0.14, h / 3)), gloss(c, { metalness: 0.5, roughness: 0.14, ...extra }));
    m.position.set(x, y + h / 2, z); g.add(m); return m;
  };
  add(6.4, 0.35, 6.4, 0, 0, 0, 0x061a30, { metalness: 0.5, roughness: 0.35 });
  const r = rng(21);
  const shades = [0x1a4fb8, 0x2a64d0, 0x548cff, 0x123f94, 0x0e3578];
  let top = 0.35;
  const cells = [[-1.5, -1.5, 1.5], [0, -1.5, 2.4], [1.5, -1.5, 1.1], [-1.5, 0, 2.0], [0, 0, 3.4], [1.5, 0, 1.7], [-1.5, 1.5, 1.0], [0, 1.5, 2.1], [1.5, 1.5, 2.8]];
  cells.forEach(([x, z, h], i) => {
    const lime = i === 8;
    add(1.32, h, 1.32, x, 0.35, z, lime ? LIME : shades[i % shades.length], lime ? { metalness: 0.05, roughness: 0.2, envMapIntensity: 0.8, emissive: C(0x4a5c00) } : {});
    if (h > 2) add(0.9, 0.5, 0.9, x, 0.35 + h, z, shades[(i + 2) % shades.length]);
  });
  // glowing inlays
  const inlay = new THREE.Mesh(new THREE.BoxGeometry(6.0, 0.03, 0.04), emissive(BLUE, 1.6));
  inlay.position.set(0, 0.37, 3.21); g.add(inlay);
  const inlay2 = inlay.clone(); inlay2.rotation.y = Math.PI / 2; inlay2.position.set(3.21, 0.37, 0); g.add(inlay2);
  scene.add(g);
  addMirrored(scene, g, N0, 0.8);
  rimRig(scene, { blue: 2.5, warm: 0.8 });
  scene.add(glow(BLUE, 22, 6, 0.4, [0, 0.05, 0]));
  scene.add(glow(BLUE, 16, 16, 0.18, [0, 4, -4]));
  const camera = new THREE.OrthographicCamera(-4.4 * 16 / 9, 4.4 * 16 / 9, 4.4, -4.4, 0.1, 200);
  camera.position.set(14, 11, 14); camera.lookAt(0, 1.7, 0);
  shiftContent(camera, W, H, 0.17, 0.0);
  scene.fog = new THREE.Fog(C(N1), 22, 60);
  return { scene, camera, bloom: [0.35, 0.7, 0.9], exposure: 1.0 };
}

function industrial({ renderer, W, H }) {
  const scene = baseScene(N0, N1, 14, 60);
  scene.environment = studioEnv(renderer, [
    { color: BLUE, i: 7, pos: [-7, 4, -5], size: [10, 2] }, { color: 0xffffff, i: 5, pos: [7, 5, -3], size: [8, 2] }, { color: 0xffb070, i: 2.5, pos: [4, 3, 8], size: [6, 2] }, { color: 0xbcd4ff, i: 3, pos: [0, 9, 0], size: [10, 6] },
  ]);
  const g = new THREE.Group();
  const steel = gloss(0x0b3a7a, { metalness: 0.7, roughness: 0.18 });
  const dk = gloss(0x071a2c, { metalness: 0.6, roughness: 0.3 });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.9, 0.6, 64), dk); base.position.y = 0.3; g.add(base);
  const turret = new THREE.Group(); turret.position.y = 0.6; turret.rotation.y = -0.5; g.add(turret);
  { const t = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.3, 1.0, 48), steel); t.position.y = 0.5; turret.add(t); }
  const joint = (parent, y, r, c) => {
    const s = new THREE.Mesh(new THREE.SphereGeometry(r, 48, 32), dk); s.position.y = y; parent.add(s);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r * 1.02, 0.05, 12, 64), emissive(c, 2.8)); ring.position.y = y; ring.rotation.x = Math.PI / 2; parent.add(ring);
    return s;
  };
  const shoulder = new THREE.Group(); shoulder.position.y = 1.3; shoulder.rotation.z = -0.55; turret.add(shoulder);
  const lower = new THREE.Mesh(new RoundedBoxGeometry(0.9, 3.8, 0.9, 6, 0.3), steel); lower.position.y = 1.9; shoulder.add(lower);
  const s1 = new THREE.Mesh(new THREE.SphereGeometry(0.75, 48, 32), dk); shoulder.add(s1);
  const ring1 = new THREE.Mesh(new THREE.TorusGeometry(0.78, 0.05, 12, 64), emissive(BLUE, 2.8)); ring1.rotation.y = Math.PI / 2; shoulder.add(ring1);
  const elbow = new THREE.Group(); elbow.position.y = 3.9; elbow.rotation.z = 1.5; shoulder.add(elbow);
  const s2 = new THREE.Mesh(new THREE.SphereGeometry(0.65, 48, 32), dk); elbow.add(s2);
  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(0.68, 0.05, 12, 64), emissive(LIME, 2.8)); ring2.rotation.y = Math.PI / 2; elbow.add(ring2);
  const upper = new THREE.Mesh(new RoundedBoxGeometry(0.7, 3.2, 0.7, 6, 0.25), steel); upper.position.y = 1.6; elbow.add(upper);
  const wrist = new THREE.Group(); wrist.position.y = 3.3; wrist.rotation.z = 0.5; elbow.add(wrist);
  wrist.add(new THREE.Mesh(new THREE.SphereGeometry(0.42, 32, 24), dk));
  const ring3 = new THREE.Mesh(new THREE.TorusGeometry(0.44, 0.04, 12, 48), emissive(BLUE, 2.8)); ring3.rotation.y = Math.PI / 2; wrist.add(ring3);
  const hand = new THREE.Mesh(new RoundedBoxGeometry(0.9, 0.3, 0.5, 4, 0.1), dk); hand.position.y = 0.6; wrist.add(hand);
  for (const x of [-0.35, 0.35]) { const f = new THREE.Mesh(new RoundedBoxGeometry(0.14, 0.7, 0.3, 3, 0.05), steel); f.position.set(x, 1.0, 0); wrist.add(f); }
  g.position.set(5.0, 0, 0); g.scale.setScalar(0.72);
  scene.add(g);
  // background machine shapes
  const bg = new THREE.Group();
  const r = rng(13);
  for (let i = 0; i < 9; i++) {
    const h = 2 + r() * 6;
    const m = new THREE.Mesh(new RoundedBoxGeometry(1.5 + r() * 2.5, h, 1.5 + r() * 2, 3, 0.15), gloss(i % 3 ? 0x06192b : 0x0a2a4a, { metalness: 0.5, roughness: 0.3 }));
    m.position.set(3 + r() * 14, h / 2, -9 - r() * 8); bg.add(m);
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.06, h * 0.7, 0.03), emissive(i === 4 ? LIME : BLUE, 2.2));
    strip.position.set(m.position.x + 0.6, h / 2, m.position.z + 1.1); bg.add(strip);
  }
  scene.add(bg);
  const all = new THREE.Group(); all.add(g, bg); scene.add(all);
  addMirrored(scene, all, N0, 0.8);
  rimRig(scene, { blue: 2.8, warm: 1 });
  scene.add(glow(BLUE, 16, 4, 0.4, [5.4, 0.05, 0]));
  scene.add(glow(BLUE, 14, 14, 0.15, [6, 4, -7]));
  const camera = perspective(30, [-1.5, 3.4, 18], [4, 2.4, 0]);
  return { scene, camera, bloom: [0.4, 0.7, 0.85], exposure: 1.05 };
}

function terminal({ renderer, W, H }) {
  const scene = baseScene(N0, N1, 10, 50);
  scene.environment = studioEnv(renderer, [
    { color: BLUE, i: 7, pos: [-7, 4, -5], size: [10, 2] }, { color: 0xffffff, i: 5, pos: [7, 5, -3], size: [8, 2] }, { color: 0xbcd4ff, i: 3, pos: [0, 9, 0], size: [10, 6] }, { color: 0xffb070, i: 2, pos: [3, 2, 8], size: [8, 2] },
  ]);
  const g = new THREE.Group();
  const bodyM = gloss(0x071e36, { metalness: 0.7, roughness: 0.16 });
  const slab = new THREE.Mesh(new RoundedBoxGeometry(2.7, 4.2, 0.55, 8, 0.28), bodyM); g.add(slab);
  const bezel = new THREE.Mesh(new RoundedBoxGeometry(2.3, 1.9, 0.08, 6, 0.04), new THREE.MeshStandardMaterial({ color: 0x010608, roughness: 0.2, metalness: 0.4 }));
  bezel.position.set(0, 0.95, 0.28); g.add(bezel);
  const tex = canvasTex(1024, 832, (c, w, h) => {
    const bgd = c.createLinearGradient(0, 0, w, h);
    bgd.addColorStop(0, '#0a2f5a'); bgd.addColorStop(1, '#1a5fd0');
    c.fillStyle = bgd; c.fillRect(0, 0, w, h);
    const rg = c.createRadialGradient(w / 2, h * 0.42, 0, w / 2, h * 0.42, w * 0.6);
    rg.addColorStop(0, 'rgba(143,180,255,.6)'); rg.addColorStop(1, 'rgba(143,180,255,0)');
    c.fillStyle = rg; c.fillRect(0, 0, w, h);
    c.strokeStyle = '#BFD92E'; c.lineWidth = 34; c.lineCap = 'round'; c.lineJoin = 'round';
    c.shadowColor = '#BFD92E'; c.shadowBlur = 40;
    c.beginPath(); c.arc(w / 2, h * 0.4, 190, 0, 7); c.stroke();
    c.beginPath(); c.moveTo(w / 2 - 90, h * 0.4 + 5); c.lineTo(w / 2 - 20, h * 0.4 + 75); c.lineTo(w / 2 + 100, h * 0.4 - 70); c.stroke();
    c.shadowBlur = 0; c.fillStyle = 'rgba(255,255,255,.75)'; c.beginPath(); c.roundRect(w * 0.3, h * 0.78, w * 0.4, 28, 14); c.fill();
    c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.roundRect(w * 0.38, h * 0.86, w * 0.24, 20, 10); c.fill();
  });
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(2.14, 1.74), new THREE.MeshBasicMaterial({ map: tex, color: C(0xffffff).multiplyScalar(1.5) }));
  screen.position.set(0, 0.95, 0.33); g.add(screen);
  const keyM = gloss(0x0c2e50, { metalness: 0.5, roughness: 0.25 });
  for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) {
    const k = new THREE.Mesh(new RoundedBoxGeometry(0.55, 0.38, 0.1, 4, 0.06), r === 3 && c === 2 ? gloss(LIME, { metalness: 0.2 }) : keyM);
    k.position.set((c - 1) * 0.68, -0.4 - r * 0.5, 0.3); g.add(k);
  }
  const slot = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.04, 0.05), emissive(BLUE, 2));
  slot.position.set(0, 1.98, 0.3); g.add(slot);
  g.position.set(5.0, 2.5, 0); g.rotation.set(-0.12, -0.42, 0.0);
  const foot = new THREE.Group(); foot.add(g);
  scene.add(foot);
  addMirrored(scene, foot, N0, 0.82);
  const l = new THREE.PointLight(C(BLUE), 30, 16); l.position.set(5, 2.8, 3.5); scene.add(l);
  rimRig(scene, { blue: 2.5, warm: 0.8 });
  scene.add(glow(BLUE, 9, 9, 0.22, [4.6, 3.2, 1.2]));
  scene.add(glow(BLUE, 22, 3, 0.4, [5, 0.05, 0.5]));
  const camera = perspective(30, [0, 3.4, 12.5], [3.4, 2.3, 0]);
  return { scene, camera, bloom: [0.4, 0.7, 0.85], exposure: 1.05 };
}

function skyline({ renderer, W, H }) {
  const sunDir = [-0.2, 0.03, -1];
  const dome = sky({ top: N0, mid: 0x0b3354, low: 0x4f78b0, sunDir, sunColor: 0xff9a60, sunPower: 40, glowStrength: 0.9, midAt: 0.25 });
  const scene = baseScene(N0, 0x1d4570, 40, 260);
  scene.add(dome);
  const win = (seed) => {
    const r = rng(seed);
    return canvasTex(64, 128, (g, w, h) => {
      g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
      for (let y = 2; y < h - 2; y += 4) for (let x = 2; x < w - 2; x += 4) {
        if (r() < 0.16) { const v = r(); g.fillStyle = v < 0.65 ? '#ffc98a' : v < 0.9 ? '#8fb4ff' : '#dfff5a'; g.globalAlpha = 0.4 + r() * 0.6; g.fillRect(x, y, 2, 2.4); }
      }
    });
  };
  const wins = [win(1), win(2), win(3), win(4)];
  const city = new THREE.Group();
  const r = rng(77);
  for (let layer = 0; layer < 5; layer++) {
    const z = -30 - layer * 22;
    const n = 26;
    for (let i = 0; i < n; i++) {
      const x = -90 + (i / n) * 200 + r() * 5 + layer * 3;
      const sx = (x + 90) / 200;
      const hgt = (5 + r() * 16 + (r() < 0.1 ? 14 : 0)) * (0.18 + sx * 0.8) * (1 + layer * 0.1);
      const w = 3 + r() * 5, d = 3 + r() * 5;
      const t = wins[Math.floor(r() * 4)].clone(); t.needsUpdate = true; t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(Math.max(1, Math.round(w / 3)), Math.max(1, Math.round(hgt / 8)));
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, hgt, d), new THREE.MeshStandardMaterial({ color: 0x04131f, roughness: 0.3, metalness: 0.6, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.9 - layer * 0.1 }));
      m.position.set(x, hgt / 2, z + r() * 6); city.add(m);
      if (r() < 0.2) { const sp = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.25, hgt * 0.25, 8), emissive(0x04131f, 1)); sp.position.set(x, hgt + hgt * 0.12, m.position.z); city.add(sp);
        city.add(glow(LIME, 1.4, 1.4, 0.9, [x, hgt + hgt * 0.25, m.position.z])); }
    }
  }
  scene.add(city);
  const water = new THREE.Mesh(new THREE.PlaneGeometry(500, 500), new THREE.MeshBasicMaterial({ color: C(N0), transparent: true, opacity: 0.8 }));
  const mir = city.clone(); mir.scale.y = -1; scene.add(mir);
  water.rotation.x = -Math.PI / 2; water.position.y = 0.01; scene.add(water);
  scene.add(new THREE.HemisphereLight(C(0x3a6aa8), C(N0), 0.6));
  const d = new THREE.DirectionalLight(C(0xff9a60), 1.5); d.position.set(-5, 3, -10); scene.add(d);
  scene.add(glow(0xff9a60, 90, 24, 0.55, [-30, 3, -170]));
  fogBands(scene, 0x4f78b0, 6, -170, -40, 14, 120, 18, 0.12, [-90, 90]);
  // light streaks on water
  const sr = rng(4);
  for (let i = 0; i < 60; i++) {
    const x = -50 + sr() * 150, z = -25 - sr() * 40;
    const c = sr() < 0.7 ? 0xffb070 : sr() < 0.5 ? BLUE : LIME;
    scene.add(glow(c, 0.7, 4 + sr() * 8, 0.5, [x, 0.05, z]));
  }
  const camera = perspective(30, [0, 3.2, 40], [10, 9, -60]);
  shiftContent(camera, W, H, 0.0);
  return { scene, camera, bloom: [0.45, 0.8, 0.8], exposure: 1.0 };
}

function bokeh() {
  const scene = new THREE.Scene();
  const bgTex = canvasTex(1024, 576, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, h);
    gr.addColorStop(0, '#010d16'); gr.addColorStop(0.5, '#011826'); gr.addColorStop(1, '#07243a');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    const rg = g.createRadialGradient(w * 0.75, h * 0.55, 0, w * 0.75, h * 0.55, w * 0.5);
    rg.addColorStop(0, 'rgba(84,140,255,.28)'); rg.addColorStop(1, 'rgba(84,140,255,0)');
    g.fillStyle = rg; g.fillRect(0, 0, w, h);
  });
  scene.background = bgTex;
  const disc = canvasTex(256, 256, (g, w, h) => {
    const r = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    r.addColorStop(0, 'rgba(255,255,255,.5)'); r.addColorStop(0.82, 'rgba(255,255,255,.62)'); r.addColorStop(0.93, 'rgba(255,255,255,.95)'); r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r; g.fillRect(0, 0, w, h);
  });
  const rd = rng(31);
  const pal = [BLUE, BLUE, 0x2a64d0, 0x8fb4ff, 0x3a78e8, 0x1b4f96, BLUE, 0x1b4f96, LIME, 0xffb070];
  for (let i = 0; i < 170; i++) {
    const t = rd();
    const x = -9 + Math.pow(rd(), 0.7) * 24, y = -6 + rd() * 12;
    if (x < 0 && rd() < 0.8) continue;
    const c = pal[Math.floor(rd() * pal.length)];
    const size = (c === LIME ? 0.9 : 0.6) + Math.pow(rd(), 2.2) * 6;
    const op = c === LIME ? 0.16 : (0.07 + rd() * 0.2) * (size > 3 ? 0.7 : 1);
    const m = new THREE.SpriteMaterial({ map: disc, color: C(c), transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false });
    const s = new THREE.Sprite(m); s.scale.set(size, size, 1); s.position.set(x, y, -t * 10); scene.add(s);
  }
  const camera = perspective(40, [0, 0, 20], [0, 0, 0]);
  return { scene, camera, bloom: [0.3, 0.8, 0.7], exposure: 1.1 };
}

function waves({ renderer, W, H }) {
  const scene = baseScene(N0, N1, 20, 90);
  scene.environment = studioEnv(renderer, [
    { color: BLUE, i: 3, pos: [6, 3, -6], size: [14, 3] }, { color: 0xffffff, i: 1.5, pos: [-4, 6, -4], size: [10, 2] },
    { color: 0xffb070, i: 1.2, pos: [-8, 2, 6], size: [8, 2] }, { color: 0xbcd4ff, i: 0.8, pos: [0, 9, 0], size: [14, 8] }, { color: LIME, i: 1, pos: [8, 2, 4], size: [3, 1] },
  ]);
  const layers = [
    { z: -14, y: -0.2, c: 0x0c3a78, a: 1.2, ph: 0.0, f: 0.22 }, { z: -9, y: -0.55, c: 0x0a2e5c, a: 1.0, ph: 1.4, f: 0.28 },
    { z: -4.5, y: -0.9, c: 0x1a5fd0, a: 0.9, ph: 2.6, f: 0.32 }, { z: 0, y: -1.35, c: 0x07243a, a: 0.8, ph: 3.9, f: 0.4 }, { z: 4.5, y: -1.8, c: 0x548cff, a: 0.55, ph: 5.0, f: 0.45 },
  ];
  for (const L of layers) {
    const g = new THREE.PlaneGeometry(80, 7, 480, 90);
    g.rotateX(-Math.PI / 2);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), zz = p.getZ(i);
      const env = THREE.MathUtils.smoothstep(x, -14, 10) * 0.9 + 0.1;
      const y = (Math.sin(x * L.f + L.ph + zz * 0.25) * 1.0 + Math.sin(x * L.f * 2.1 + L.ph * 1.7 - zz * 0.5) * 0.28) * L.a * env;
      p.setY(i, y);
    }
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, new THREE.MeshPhysicalMaterial({ color: C(L.c), metalness: 0.65, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.04, envMapIntensity: 0.5, side: THREE.DoubleSide }));
    m.position.set(0, L.y, L.z); scene.add(m);
  }
  const line = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(Array.from({ length: 60 }, (_, i) => { const x = -30 + i * 1.3; return new THREE.Vector3(x, -1.2 + (Math.sin(x * 0.4 + 3.9) + Math.sin(x * 0.84 + 6.6) * 0.28) * 0.8 * (THREE.MathUtils.smoothstep(x, -14, 10) * 0.9 + 0.1) + 0.05, 0.1); })), 200, 0.025, 6), emissive(LIME, 2));
  scene.add(line);
  scene.add(new THREE.HemisphereLight(C(0x2a4a7a), C(N0), 0.4));
  const k = new THREE.DirectionalLight(C(0xbcd4ff), 0.5); k.position.set(5, 6, -8); scene.add(k);
  scene.add(glow(BLUE, 30, 10, 0.18, [10, 0.5, -20]));
  const camera = perspective(32, [0, 3.2, 14], [4, -0.6, 0]);
  return { scene, camera, bloom: [0.2, 0.5, 1.0], exposure: 0.8 };
}

function space({ renderer, W, H }) {
  const scene = new THREE.Scene();
  scene.background = C(0x00060c);
  scene.environment = studioEnv(renderer, [
    { color: 0xfff0d8, i: 5, pos: [9, 3, -8], size: [8, 3] }, { color: BLUE, i: 2.4, pos: [-8, 2, 4], size: [10, 4] },
    { color: 0xbcd4ff, i: 1.2, pos: [0, 8, 2], size: [10, 6] }, { color: 0xffffff, i: 0.8, pos: [0, -6, 4], size: [10, 3] },
  ], 0x01060c);

  // Stars
  const rs = rng(77);
  const n = 14000, pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const u = rs() * 2 - 1, a = rs() * Math.PI * 2, r = Math.sqrt(1 - u * u);
    pos.set([Math.cos(a) * r * 450, u * 450, Math.sin(a) * r * 450], i * 3);
    const b = Math.pow(rs(), 3) * 0.8 + 0.15, tint = rs();
    const c = tint < 0.2 ? [0.7, 0.8, 1] : tint < 0.3 ? [1, 0.92, 0.8] : [1, 1, 1];
    col.set([c[0] * b, c[1] * b, c[2] * b], i * 3);
  }
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  sg.setAttribute('color', new THREE.BufferAttribute(col, 3));
  scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ size: 1.6, sizeAttenuation: false, vertexColors: true, transparent: true, depthWrite: false, fog: false })));
  scene.add(glow(BLUE, 90, 50, 0.10, [-40, 28, -120]));
  scene.add(glow(0x2a3a9a, 70, 40, 0.08, [20, 36, -130]));

  // Planet with night-side city lights
  const R = 80, PC = [0, -86, -60];
  const rc = rng(5);
  const surf = canvasTex(2048, 1024, (g, w, h) => {
    g.fillStyle = '#061a30'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 260; i++) {
      const x = rc() * w, y = rc() * h, rx = 40 + rc() * 220, ry = 20 + rc() * 90;
      const gr = g.createRadialGradient(x, y, 0, x, y, rx);
      const k = rc();
      gr.addColorStop(0, k < 0.5 ? 'rgba(14,60,96,.5)' : 'rgba(4,20,40,.55)');
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.save(); g.translate(x, y); g.scale(1, ry / rx); g.translate(-x, -y);
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, rx, 0, 7); g.fill(); g.restore();
    }
    for (let i = 0; i < 140; i++) {
      const x = rc() * w, y = h * (0.25 + rc() * 0.6), rx = 80 + rc() * 260;
      const gr = g.createRadialGradient(x, y, 0, x, y, rx);
      gr.addColorStop(0, 'rgba(190,215,255,.09)'); gr.addColorStop(1, 'rgba(190,215,255,0)');
      g.save(); g.translate(x, y); g.scale(1, 0.16); g.translate(-x, -y);
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, rx, 0, 7); g.fill(); g.restore();
    }
  });
  const lights = canvasTex(4096, 2048, (g, w, h) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
    g.globalCompositeOperation = 'lighter';
    for (let c = 0; c < 220; c++) {
      const cx = w * (0.04 + rc() * 0.5), cy = h * (0.1 + rc() * 0.4), spread = 14 + rc() * 90, cnt = 120 + rc() * 520;
      for (let i = 0; i < cnt; i++) {
        const a = rc() * 6.283, d = Math.pow(rc(), 1.9) * spread;
        const x = cx + Math.cos(a) * d * 1.7, y = cy + Math.sin(a) * d, r = 0.9 + rc() * 1.7;
        const gr = g.createRadialGradient(x, y, 0, x, y, r);
        const a0 = 0.25 + rc() * 0.6;
        gr.addColorStop(0, `rgba(255,${200 + Math.floor(rc() * 45)},${120 + Math.floor(rc() * 70)},${a0})`); gr.addColorStop(1, 'rgba(255,170,80,0)');
        g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
      }
    }
  });
  const planet = new THREE.Mesh(new THREE.SphereGeometry(R, 256, 128), new THREE.MeshStandardMaterial({ map: surf, emissiveMap: lights, emissive: C(0xffffff), emissiveIntensity: 0.9, roughness: 0.85, metalness: 0.05 }));
  planet.position.set(...PC);
  scene.add(planet);
  const rim = new THREE.Mesh(new THREE.SphereGeometry(R * 1.004, 128, 64), new THREE.ShaderMaterial({
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
    uniforms: { c: { value: C(0x4a9bff) } },
    vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vN = normalize(normalMatrix*normal); vec4 mv = modelViewMatrix*vec4(position,1.); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }',
    fragmentShader: 'varying vec3 vN; varying vec3 vV; uniform vec3 c; void main(){ float f = pow(1. - max(dot(vN, vV), 0.), 4.); gl_FragColor = vec4(c * f * 2.2, f); }',
  }));
  rim.position.set(...PC);
  scene.add(rim);
  const halo = new THREE.Mesh(new THREE.SphereGeometry(R * 1.05, 128, 64), new THREE.ShaderMaterial({
    side: THREE.BackSide, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
    uniforms: { c: { value: C(0x2f78ff) } },
    vertexShader: 'varying vec3 vN; void main(){ vN = normalize(normalMatrix*normal); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: 'varying vec3 vN; uniform vec3 c; void main(){ float f = pow(max(0.62 - dot(vN, vec3(0.,0.,1.)), 0.), 3.); gl_FragColor = vec4(c * f * 3.0, f); }',
  }));
  halo.position.set(...PC);
  scene.add(halo);
  scene.add(glow(0xfff0d8, 9, 2.2, 0.85, [23, -9.6, -62]));
  scene.add(glow(0x6aa8ff, 34, 6, 0.28, [22, -9.2, -62]));

  // Satellite
  const sat = new THREE.Group();
  const foil = new THREE.MeshPhysicalMaterial({ color: C(0xb59a62), metalness: 0.92, roughness: 0.32, clearcoat: 0.4, envMapIntensity: 1.6 });
  const dark = gloss(0x0c2a48, { metalness: 0.7, roughness: 0.3 });
  const body = new THREE.Mesh(new RoundedBoxGeometry(1.1, 0.95, 1.5, 6, 0.05), foil);
  sat.add(body);
  const bus = new THREE.Mesh(new RoundedBoxGeometry(1.14, 0.34, 1.0, 4, 0.04), dark);
  bus.position.set(0, -0.2, 0.1); sat.add(bus);
  const strip = new THREE.Mesh(new THREE.BoxGeometry(1.16, 0.03, 0.06), emissive(LIME, 1.6));
  strip.position.set(0, -0.02, 0.76); sat.add(strip);
  const cell = canvasTex(512, 256, (g, w, h) => {
    g.fillStyle = '#16478f'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(170,205,255,.6)'; g.lineWidth = 2;
    for (let x = 0; x <= w; x += w / 8) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
    for (let y = 0; y <= h; y += h / 4) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, 'rgba(120,170,255,.25)'); gr.addColorStop(1, 'rgba(0,0,0,.1)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  });
  const panelMat = new THREE.MeshPhysicalMaterial({ map: cell, color: C(0xffffff), emissive: C(0x1a4a9a), emissiveMap: cell, emissiveIntensity: 0.55, metalness: 0.55, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 1.3 });
  for (const s of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.9, 12), dark);
    arm.rotation.z = Math.PI / 2; arm.position.set(s * 1.0, 0, 0); sat.add(arm);
    for (let i = 0; i < 2; i++) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.035, 1.3), panelMat);
      p.position.set(s * (1.75 + i * 1.42), 0, 0); sat.add(p);
    }
  }
  const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.7, 10), dark);
  boom.position.set(0.25, 0.8, 0.1); boom.rotation.z = -0.35; sat.add(boom);
  const dish = new THREE.Mesh(new THREE.SphereGeometry(0.46, 40, 20, 0, Math.PI * 2, 0, 0.95), new THREE.MeshPhysicalMaterial({ color: C(0xdfe6f0), metalness: 0.5, roughness: 0.25, side: THREE.DoubleSide, envMapIntensity: 1.2 }));
  dish.position.set(0.4, 1.12, 0.1); dish.rotation.set(-0.95, 0.4, -0.35); sat.add(dish);
  const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.3, 0.32, 24, 1, true), gloss(0x2a3d55, { side: THREE.DoubleSide }));
  nozzle.rotation.x = Math.PI / 2; nozzle.position.set(0, 0, -0.9); sat.add(nozzle);
  for (const [x, y] of [[-0.35, 0.5], [0.4, -0.5]]) {
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.6, 8), dark);
    rod.position.set(x, y + 0.3 * Math.sign(y), 0.5); sat.add(rod);
  }
  sat.position.set(1.3, 1.1, -1);
  sat.rotation.set(0.28, -0.75, -0.12);
  sat.scale.setScalar(0.85);
  scene.add(sat);

  const sun = new THREE.DirectionalLight(C(0xfff0d8), 4.5);
  sun.position.set(16, 5, -22); scene.add(sun);
  const fill = new THREE.DirectionalLight(C(0x7aa8ff), 1.4);
  fill.position.set(-7, 3, 9); scene.add(fill);
  scene.add(new THREE.HemisphereLight(C(0x24407a), C(0x01060c), 0.35));

  const camera = perspective(34, [0, 0.4, 10], [0.5, 2.4, -60]);
  return { scene, camera, bloom: [0.5, 0.8, 0.82], exposure: 1.0 };
}

export const scenes = { horizon, marine, aviation, wireframe, render, twin, sensing, cockpit, engine, industrial, terminal, skyline, bokeh, waves, space };
