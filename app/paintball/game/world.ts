import * as THREE from "three";
import {
  groundTexture,
  chainLinkTexture,
  ringMatTexture,
  apronTexture,
  trashCanTexture,
  skyTexture,
  frondTexture,
} from "./textures";

// ---- layout constants ----
export const ARENA = 62; // playable half-size
export const MAT_Y = 1.1; // top of ring platform
export const APRON_HALF = 3.7; // ring platform half width (flush with cage walls)
export const CAGE_HALF = 3.7;
export const CAGE_H = 5.0;
/** Door gap on +Z cage wall, between these x values. */
export const DOOR_X0 = 0.9;
export const DOOR_X1 = 2.3;

export interface CylCollider { x: number; z: number; r: number }
export interface WallSeg { x1: number; z1: number; x2: number; z2: number; minY: number; maxY: number; cage?: boolean }

export interface WorldData {
  cylinders: CylCollider[];
  walls: WallSeg[];
  floorHeightAt(x: number, z: number, feetY: number): number;
  losBlocked(ax: number, az: number, bx: number, bz: number): boolean;
  waypoints: THREE.Vector3[];
  ringPathIn: THREE.Vector3[];
  trashCanSpawns: THREE.Vector3[];
  motes: THREE.Points;
  fronds: THREE.Mesh[];
}

function inSquare(x: number, z: number, half: number) {
  return Math.abs(x) <= half && Math.abs(z) <= half;
}

// steps outside the cage door
const STEP = { x0: DOOR_X0, x1: DOOR_X1, z0: CAGE_HALF, z1: CAGE_HALF + 0.75, z2: CAGE_HALF + 1.5, h1: 0.74, h2: 0.37 };

export function buildWorld(scene: THREE.Scene): WorldData {
  const cylinders: CylCollider[] = [];
  const walls: WallSeg[] = [];
  const fronds: THREE.Mesh[] = [];

  // ================= sky, fog, lights =================
  scene.fog = new THREE.FogExp2(0xaec89a, 0.0135);
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(240, 24, 16),
    new THREE.MeshBasicMaterial({ map: skyTexture(), side: THREE.BackSide, fog: false })
  );
  scene.add(sky);

  const hemi = new THREE.HemisphereLight(0xcfe8d8, 0x2c3a1e, 0.95);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff2d8, 2.2);
  sun.position.set(28, 45, 18);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -30;
  sun.shadow.camera.right = 30;
  sun.shadow.camera.top = 30;
  sun.shadow.camera.bottom = -30;
  sun.shadow.camera.far = 110;
  sun.shadow.bias = -0.0006;
  scene.add(sun);

  // ================= ground =================
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(320, 320),
    new THREE.MeshStandardMaterial({ map: groundTexture(), roughness: 1 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // ================= foliage materials =================
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5a4630, roughness: 0.95 });
  const trunkMat2 = new THREE.MeshStandardMaterial({ color: 0x6b5138, roughness: 0.95 });
  const canopyMats = [0x2e5e26, 0x25501f, 0x3a6e2c, 0x1f4a1c].map(
    (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 1, flatShading: true })
  );
  const vineMat = new THREE.MeshStandardMaterial({ color: 0x3f6b2a, roughness: 1 });
  const palmFrondMat = new THREE.MeshStandardMaterial({
    map: frondTexture("#3f7a2e"),
    transparent: true,
    alphaTest: 0.45,
    side: THREE.DoubleSide,
    roughness: 1,
  });
  const fernMat = new THREE.MeshStandardMaterial({
    map: frondTexture("#4a8a34"),
    transparent: true,
    alphaTest: 0.45,
    side: THREE.DoubleSide,
    roughness: 1,
  });

  const foliage = new THREE.Group();
  scene.add(foliage);

  function bigTree(x: number, z: number, s: number) {
    const g = new THREE.Group();
    const h = 9 * s;
    const r = 0.55 * s;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.72, r, h, 8), trunkMat);
    trunk.position.y = h / 2;
    trunk.castShadow = true;
    g.add(trunk);
    // buttress roots
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + 0.4;
      const root = new THREE.Mesh(new THREE.BoxGeometry(0.2 * s, 1.4 * s, 1.0 * s), trunkMat2);
      root.position.set(Math.cos(a) * r * 1.15, 0.55 * s, Math.sin(a) * r * 1.15);
      root.rotation.y = -a + Math.PI / 2;
      root.rotation.x = 0.35;
      g.add(root);
    }
    // canopy blobs
    const blobs = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < blobs; i++) {
      const br = (1.8 + Math.random() * 1.6) * s;
      const blob = new THREE.Mesh(
        new THREE.IcosahedronGeometry(br, 1),
        canopyMats[Math.floor(Math.random() * canopyMats.length)]
      );
      blob.position.set((Math.random() - 0.5) * 3.4 * s, h - 0.5 * s + (Math.random() - 0.3) * 1.6 * s, (Math.random() - 0.5) * 3.4 * s);
      blob.castShadow = true;
      g.add(blob);
      // hanging vines from canopy edge
      if (Math.random() < 0.8) {
        const vl = 2.5 + Math.random() * 4;
        const vine = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, vl, 5), vineMat);
        vine.position.set(blob.position.x + (Math.random() - 0.5) * br, blob.position.y - br * 0.4 - vl / 2, blob.position.z + (Math.random() - 0.5) * br);
        vine.rotation.z = (Math.random() - 0.5) * 0.15;
        g.add(vine);
      }
    }
    g.position.set(x, 0, z);
    foliage.add(g);
    cylinders.push({ x, z, r: r + 0.15 });
  }

  function palmTree(x: number, z: number, s: number) {
    const g = new THREE.Group();
    const segs = 6;
    const h = 5.5 * s;
    const lean = (Math.random() - 0.5) * 0.9;
    let px = 0;
    for (let i = 0; i < segs; i++) {
      const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.13 * s, 0.16 * s, h / segs + 0.1, 7), trunkMat2);
      px += (lean / segs) * i;
      seg.position.set(px, (i + 0.5) * (h / segs), 0);
      seg.rotation.z = -lean * 0.25;
      seg.castShadow = true;
      g.add(seg);
    }
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      const frond = new THREE.Mesh(new THREE.PlaneGeometry(0.9 * s, 2.6 * s), palmFrondMat);
      frond.position.set(px + Math.cos(a) * 0.9 * s, h + 0.15, Math.sin(a) * 0.9 * s);
      frond.rotation.order = "YXZ";
      frond.rotation.y = -a + Math.PI / 2;
      frond.rotation.x = -Math.PI / 2 + 0.55;
      frond.castShadow = true;
      g.add(frond);
      fronds.push(frond);
    }
    const coco = new THREE.Mesh(new THREE.SphereGeometry(0.16 * s, 6, 5), trunkMat);
    coco.position.set(px, h - 0.15, 0);
    g.add(coco);
    g.position.set(x, 0, z);
    g.rotation.y = Math.random() * Math.PI * 2;
    foliage.add(g);
    cylinders.push({ x, z, r: 0.25 * s });
  }

  function fern(x: number, z: number, s: number) {
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + Math.random();
      const blade = new THREE.Mesh(new THREE.PlaneGeometry(0.5 * s, 1.1 * s), fernMat);
      blade.position.set(x + Math.cos(a) * 0.2, 0.4 * s, z + Math.sin(a) * 0.2);
      blade.rotation.order = "YXZ";
      blade.rotation.y = -a + Math.PI / 2;
      blade.rotation.x = -0.9 + Math.random() * 0.25;
      foliage.add(blade);
    }
  }

  function rock(x: number, z: number, s: number) {
    const m = new THREE.Mesh(
      new THREE.DodecahedronGeometry(s, 0),
      new THREE.MeshStandardMaterial({ color: 0x6a7565, roughness: 1, flatShading: true })
    );
    m.position.set(x, s * 0.45, z);
    m.rotation.set(Math.random(), Math.random() * 3, Math.random());
    m.castShadow = true;
    m.receiveShadow = true;
    foliage.add(m);
    // mossy top
    const moss = new THREE.Mesh(
      new THREE.SphereGeometry(s * 0.75, 7, 5),
      new THREE.MeshStandardMaterial({ color: 0x4a7030, roughness: 1, flatShading: true })
    );
    moss.position.set(x, s * 0.85, z);
    moss.scale.y = 0.35;
    foliage.add(moss);
    cylinders.push({ x, z, r: s * 0.9 });
  }

  // scatter jungle, keeping the central clearing + door approach open
  const clearing = 11;
  const taken: CylCollider[] = [];
  function freeSpot(minR: number, maxR: number, pad: number): [number, number] | null {
    for (let tries = 0; tries < 40; tries++) {
      const a = Math.random() * Math.PI * 2;
      const d = minR + Math.random() * (maxR - minR);
      const x = Math.cos(a) * d;
      const z = Math.sin(a) * d;
      if (Math.abs(x) > ARENA - 2 || Math.abs(z) > ARENA - 2) continue;
      // keep spawn lanes clear
      if (Math.abs(z) < 4 && Math.abs(x) > 38) continue;
      if (taken.every((t) => (t.x - x) ** 2 + (t.z - z) ** 2 > (t.r + pad) ** 2)) {
        taken.push({ x, z, r: pad });
        return [x, z];
      }
    }
    return null;
  }

  for (let i = 0; i < 26; i++) {
    const p = freeSpot(clearing + 4, ARENA - 4, 3.2);
    if (p) bigTree(p[0], p[1], 0.8 + Math.random() * 0.9);
  }
  for (let i = 0; i < 22; i++) {
    const p = freeSpot(clearing, ARENA - 3, 2.0);
    if (p) palmTree(p[0], p[1], 0.8 + Math.random() * 0.7);
  }
  for (let i = 0; i < 14; i++) {
    const p = freeSpot(clearing - 2, ARENA - 6, 1.6);
    if (p) rock(p[0], p[1], 0.7 + Math.random() * 1.1);
  }
  for (let i = 0; i < 90; i++) {
    const a = Math.random() * Math.PI * 2;
    const d = 7 + Math.random() * (ARENA - 8);
    fern(Math.cos(a) * d, Math.sin(a) * d, 0.7 + Math.random() * 0.9);
  }
  // impenetrable jungle border ring (visual wall of big trees)
  for (let i = 0; i < 46; i++) {
    const a = (i / 46) * Math.PI * 2;
    const d = ARENA + 3 + Math.random() * 6;
    bigTree(Math.cos(a) * d, Math.sin(a) * d, 1.1 + Math.random() * 0.8);
  }
  // arena boundary walls (invisible)
  walls.push(
    { x1: -ARENA, z1: -ARENA, x2: ARENA, z2: -ARENA, minY: 0, maxY: 50 },
    { x1: ARENA, z1: -ARENA, x2: ARENA, z2: ARENA, minY: 0, maxY: 50 },
    { x1: ARENA, z1: ARENA, x2: -ARENA, z2: ARENA, minY: 0, maxY: 50 },
    { x1: -ARENA, z1: ARENA, x2: -ARENA, z2: -ARENA, minY: 0, maxY: 50 }
  );

  // dust motes drifting in the light
  const moteGeo = new THREE.BufferGeometry();
  const motePos = new Float32Array(240 * 3);
  for (let i = 0; i < 240; i++) {
    motePos[i * 3] = (Math.random() - 0.5) * 60;
    motePos[i * 3 + 1] = 0.5 + Math.random() * 9;
    motePos[i * 3 + 2] = (Math.random() - 0.5) * 60;
  }
  moteGeo.setAttribute("position", new THREE.BufferAttribute(motePos, 3));
  const motes = new THREE.Points(
    moteGeo,
    new THREE.PointsMaterial({ color: 0xfff8d0, size: 0.06, transparent: true, opacity: 0.55 })
  );
  scene.add(motes);

  // ================= THE WWE CAGE RING =================
  const ringGroup = new THREE.Group();
  scene.add(ringGroup);

  // platform skirt
  const apron = new THREE.Mesh(
    new THREE.BoxGeometry(APRON_HALF * 2, MAT_Y - 0.04, APRON_HALF * 2),
    new THREE.MeshStandardMaterial({ map: apronTexture(), roughness: 0.9 })
  );
  apron.position.y = (MAT_Y - 0.04) / 2;
  apron.castShadow = true;
  apron.receiveShadow = true;
  ringGroup.add(apron);
  // canvas mat
  const mat = new THREE.Mesh(new THREE.PlaneGeometry(APRON_HALF * 2, APRON_HALF * 2), new THREE.MeshStandardMaterial({ map: ringMatTexture(), roughness: 0.85 }));
  mat.rotation.x = -Math.PI / 2;
  mat.position.y = MAT_Y + 0.001;
  mat.receiveShadow = true;
  ringGroup.add(mat);

  // corner posts + pads + ropes
  const postMat = new THREE.MeshStandardMaterial({ color: 0x9aa2ab, metalness: 0.8, roughness: 0.3 });
  const ropeColors = [0xcc2222, 0xeeeeee, 0x2244cc];
  const cornerXZ = 2.95;
  const corners: [number, number][] = [
    [-cornerXZ, -cornerXZ],
    [cornerXZ, -cornerXZ],
    [cornerXZ, cornerXZ],
    [-cornerXZ, cornerXZ],
  ];
  for (const [cx, cz] of corners) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.9, 10), postMat);
    post.position.set(cx, MAT_Y + 0.95, cz);
    post.castShadow = true;
    ringGroup.add(post);
    const pad = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.55, 0.22),
      new THREE.MeshStandardMaterial({ color: cx * cz > 0 ? 0xcc2222 : 0x2244cc, roughness: 0.7 })
    );
    pad.position.set(cx, MAT_Y + 1.25, cz);
    ringGroup.add(pad);
    cylinders.push({ x: cx, z: cz, r: 0.16 });
  }
  for (let tier = 0; tier < 3; tier++) {
    const y = MAT_Y + 0.55 + tier * 0.42;
    const ropeMat = new THREE.MeshStandardMaterial({ color: ropeColors[tier], roughness: 0.6 });
    for (let s = 0; s < 4; s++) {
      const [ax, az] = corners[s];
      const [bx, bz] = corners[(s + 1) % 4];
      const len = Math.hypot(bx - ax, bz - az);
      const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, len, 6), ropeMat);
      rope.position.set((ax + bx) / 2, y, (az + bz) / 2);
      rope.rotation.z = Math.PI / 2;
      rope.rotation.y = Math.atan2(bz - az, bx - ax);
      ringGroup.add(rope);
    }
  }

  // ---- the steel cage ----
  const linkTex = chainLinkTexture();
  const cageMat = new THREE.MeshStandardMaterial({
    map: linkTex,
    transparent: true,
    alphaTest: 0.4,
    side: THREE.DoubleSide,
    color: 0xcdd2d6,
    roughness: 0.4,
    metalness: 0.6,
  });
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x565e66, metalness: 0.8, roughness: 0.35 });

  function cagePanel(w: number, h: number): THREE.Mesh {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), cageMat.clone());
    (mesh.material as THREE.MeshStandardMaterial).map = linkTex.clone();
    const m = (mesh.material as THREE.MeshStandardMaterial).map!;
    m.repeat.set(w / 1.2, h / 1.2);
    m.needsUpdate = true;
    return mesh;
  }

  // four walls; +Z wall has the door gap
  const sides: { x1: number; z1: number; x2: number; z2: number }[] = [
    { x1: -CAGE_HALF, z1: -CAGE_HALF, x2: CAGE_HALF, z2: -CAGE_HALF }, // -Z
    { x1: CAGE_HALF, z1: -CAGE_HALF, x2: CAGE_HALF, z2: CAGE_HALF }, // +X
    { x1: -CAGE_HALF, z1: CAGE_HALF, x2: -CAGE_HALF, z2: -CAGE_HALF }, // -X
  ];
  for (const s of sides) {
    const len = Math.hypot(s.x2 - s.x1, s.z2 - s.z1);
    const panel = cagePanel(len, CAGE_H);
    panel.position.set((s.x1 + s.x2) / 2, CAGE_H / 2, (s.z1 + s.z2) / 2);
    panel.rotation.y = Math.atan2(s.z1 - s.z2, s.x2 - s.x1);
    ringGroup.add(panel);
    walls.push({ ...s, minY: 0, maxY: CAGE_H, cage: true });
  }
  // +Z wall split around the door
  const zw = CAGE_HALF;
  const segA = { x1: -CAGE_HALF, z1: zw, x2: DOOR_X0, z2: zw };
  const segB = { x1: DOOR_X1, z1: zw, x2: CAGE_HALF, z2: zw };
  for (const s of [segA, segB]) {
    const len = Math.abs(s.x2 - s.x1);
    const panel = cagePanel(len, CAGE_H);
    panel.position.set((s.x1 + s.x2) / 2, CAGE_H / 2, zw);
    ringGroup.add(panel);
    walls.push({ ...s, minY: 0, maxY: CAGE_H, cage: true });
  }
  // lintel above the door so the wall looks continuous up high
  // (starts at 3.3 so heads clear it when walking up the steps onto the apron)
  const DOOR_TOP = 3.3;
  const lintel = cagePanel(DOOR_X1 - DOOR_X0, CAGE_H - DOOR_TOP);
  lintel.position.set((DOOR_X0 + DOOR_X1) / 2, DOOR_TOP + (CAGE_H - DOOR_TOP) / 2, zw);
  ringGroup.add(lintel);
  walls.push({ x1: DOOR_X0, z1: zw, x2: DOOR_X1, z2: zw, minY: DOOR_TOP, maxY: CAGE_H, cage: true });
  // open door panel, hinged at DOOR_X1, swung outward
  const doorPanel = cagePanel(DOOR_X1 - DOOR_X0, DOOR_TOP);
  const doorPivot = new THREE.Group();
  doorPivot.position.set(DOOR_X1, DOOR_TOP / 2, zw);
  doorPanel.position.x = -(DOOR_X1 - DOOR_X0) / 2;
  doorPivot.add(doorPanel);
  doorPivot.rotation.y = -1.9; // swung open
  ringGroup.add(doorPivot);

  // cage frame: corner poles, top rails, mid rails
  for (const [cx, cz] of [
    [-CAGE_HALF, -CAGE_HALF],
    [CAGE_HALF, -CAGE_HALF],
    [CAGE_HALF, CAGE_HALF],
    [-CAGE_HALF, CAGE_HALF],
  ] as [number, number][]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, CAGE_H, 8), frameMat);
    pole.position.set(cx, CAGE_H / 2, cz);
    pole.castShadow = true;
    ringGroup.add(pole);
    cylinders.push({ x: cx, z: cz, r: 0.12 });
    // creeping ivy on the poles — overgrown jungle reclaiming the cage
    for (let k = 0; k < 4; k++) {
      const ivy = new THREE.Mesh(new THREE.SphereGeometry(0.16 + Math.random() * 0.12, 6, 5), vineMat);
      ivy.position.set(cx + (Math.random() - 0.5) * 0.2, 0.4 + Math.random() * (CAGE_H - 1), cz + (Math.random() - 0.5) * 0.2);
      ivy.scale.set(1, 1.6, 1);
      ringGroup.add(ivy);
    }
  }
  for (const y of [CAGE_H, 2.5]) {
    for (let s = 0; s < 4; s++) {
      const [ax, az] = [
        [-CAGE_HALF, -CAGE_HALF],
        [CAGE_HALF, -CAGE_HALF],
        [CAGE_HALF, CAGE_HALF],
        [-CAGE_HALF, CAGE_HALF],
      ][s] as [number, number];
      const [bx, bz] = [
        [CAGE_HALF, -CAGE_HALF],
        [CAGE_HALF, CAGE_HALF],
        [-CAGE_HALF, CAGE_HALF],
        [-CAGE_HALF, -CAGE_HALF],
      ][s] as [number, number];
      const len = Math.hypot(bx - ax, bz - az);
      const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, len, 8), frameMat);
      rail.position.set((ax + bx) / 2, y, (az + bz) / 2);
      rail.rotation.z = Math.PI / 2;
      rail.rotation.y = Math.atan2(bz - az, bx - ax);
      ringGroup.add(rail);
    }
  }
  // walkable chain-link roof + support beams
  const roof = cagePanel(CAGE_HALF * 2, CAGE_HALF * 2);
  roof.rotation.x = -Math.PI / 2;
  roof.position.y = CAGE_H;
  ringGroup.add(roof);
  for (let i = -1; i <= 1; i++) {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(CAGE_HALF * 2, 0.07, 0.1), frameMat);
    beam.position.set(0, CAGE_H - 0.05, i * (CAGE_HALF - 0.6));
    ringGroup.add(beam);
  }
  // hanging vines draped over the roof edge
  for (let i = 0; i < 8; i++) {
    const vl = 1 + Math.random() * 2.2;
    const vine = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.04, vl, 5), vineMat);
    const side = Math.floor(Math.random() * 4);
    const t = (Math.random() - 0.5) * 2 * (CAGE_HALF - 0.3);
    const pos: [number, number][] = [
      [t, -CAGE_HALF],
      [t, CAGE_HALF],
      [-CAGE_HALF, t],
      [CAGE_HALF, t],
    ];
    vine.position.set(pos[side][0], CAGE_H - vl / 2 + 0.1, pos[side][1]);
    ringGroup.add(vine);
  }

  // steel entry steps outside the door
  const stepMat = new THREE.MeshStandardMaterial({ color: 0x777f88, metalness: 0.7, roughness: 0.4 });
  const step1 = new THREE.Mesh(new THREE.BoxGeometry(STEP.x1 - STEP.x0, STEP.h1, STEP.z1 - STEP.z0), stepMat);
  step1.position.set((STEP.x0 + STEP.x1) / 2, STEP.h1 / 2, (STEP.z0 + STEP.z1) / 2);
  step1.castShadow = true;
  ringGroup.add(step1);
  const step2 = new THREE.Mesh(new THREE.BoxGeometry(STEP.x1 - STEP.x0, STEP.h2, STEP.z2 - STEP.z1), stepMat);
  step2.position.set((STEP.x0 + STEP.x1) / 2, STEP.h2 / 2, (STEP.z1 + STEP.z2) / 2);
  step2.castShadow = true;
  ringGroup.add(step2);

  // ================= collision + queries =================
  function floorHeightAt(x: number, z: number, feetY: number): number {
    // cage roof (only counts if you're already up there)
    if (inSquare(x, z, CAGE_HALF + 0.2) && feetY >= CAGE_H - 0.5) return CAGE_H + 0.04;
    // ring platform
    if (inSquare(x, z, APRON_HALF)) return MAT_Y;
    // steps
    if (x >= STEP.x0 && x <= STEP.x1) {
      if (z >= STEP.z0 && z <= STEP.z1) return STEP.h1;
      if (z > STEP.z1 && z <= STEP.z2) return STEP.h2;
    }
    return 0;
  }

  function losBlocked(ax: number, az: number, bx: number, bz: number): boolean {
    // 2D segment vs tree/rock circles (chain-link is see-through)
    const dx = bx - ax;
    const dz = bz - az;
    const lenSq = dx * dx + dz * dz;
    for (const c of cylinders) {
      if (c.r < 0.3) continue; // posts don't block sight
      const t = Math.max(0, Math.min(1, ((c.x - ax) * dx + (c.z - az) * dz) / (lenSq || 1)));
      const px = ax + dx * t;
      const pz = az + dz * t;
      if ((px - c.x) ** 2 + (pz - c.z) ** 2 < c.r * c.r) return true;
    }
    return false;
  }

  // bot navigation
  const waypoints: THREE.Vector3[] = [];
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const d = 9 + (i % 3) * 5;
    waypoints.push(new THREE.Vector3(Math.cos(a) * d, 0, Math.sin(a) * d));
  }
  waypoints.push(new THREE.Vector3(-40, 0, 8), new THREE.Vector3(40, 0, -8), new THREE.Vector3(-25, 0, -25), new THREE.Vector3(25, 0, 25));
  const ringPathIn = [
    new THREE.Vector3((DOOR_X0 + DOOR_X1) / 2, 0, CAGE_HALF + 3.2),
    new THREE.Vector3((DOOR_X0 + DOOR_X1) / 2, 0, CAGE_HALF + 1.1),
    new THREE.Vector3((DOOR_X0 + DOOR_X1) / 2, MAT_Y, CAGE_HALF - 0.8),
    new THREE.Vector3(0, MAT_Y, 0),
  ];

  const trashCanSpawns = [
    new THREE.Vector3(-1.6, CAGE_H + 0.04, -1.6),
    new THREE.Vector3(1.8, CAGE_H + 0.04, 0.6),
    new THREE.Vector3(-0.4, CAGE_H + 0.04, 1.9),
    new THREE.Vector3(-6.5, 0, 5.5),
    new THREE.Vector3(7.2, 0, -4.8),
    new THREE.Vector3(-42, 0, 3),
    new THREE.Vector3(42, 0, -3),
  ];

  return { cylinders, walls, floorHeightAt, losBlocked, waypoints, ringPathIn, trashCanSpawns, motes, fronds };
}

/** Galvanized steel trash can with lid — the throwable. */
export function createTrashCan(): THREE.Group {
  const g = new THREE.Group();
  const tex = trashCanTexture();
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.26, 0.21, 0.62, 12),
    new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5, metalness: 0.7 })
  );
  body.position.y = 0.31;
  body.castShadow = true;
  g.add(body);
  const lid = new THREE.Mesh(
    new THREE.CylinderGeometry(0.28, 0.28, 0.06, 12),
    new THREE.MeshStandardMaterial({ color: 0x9aa4ac, roughness: 0.4, metalness: 0.8 })
  );
  lid.position.y = 0.65;
  lid.castShadow = true;
  g.add(lid);
  const knob = new THREE.Mesh(
    new THREE.SphereGeometry(0.05, 8, 6),
    new THREE.MeshStandardMaterial({ color: 0x9aa4ac, metalness: 0.8, roughness: 0.4 })
  );
  knob.position.y = 0.71;
  g.add(knob);
  return g;
}
