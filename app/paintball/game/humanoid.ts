import * as THREE from "three";
import { faceTexture, camoTexture, jerseyBackTexture, FaceExpression } from "./textures";

export interface Humanoid {
  /** Root group, origin at feet. */
  group: THREE.Group;
  torso: THREE.Group;
  head: THREE.Group;
  shoulderL: THREE.Group;
  shoulderR: THREE.Group;
  elbowL: THREE.Group;
  elbowR: THREE.Group;
  hipL: THREE.Group;
  hipR: THREE.Group;
  kneeL: THREE.Group;
  kneeR: THREE.Group;
  gun: THREE.Group;
  muzzle: THREE.Object3D;
  /** Where paint splats get attached. */
  paintTargets: THREE.Group;
}

const SKINS = ["#e8b48c", "#d29b6e", "#b07a50", "#8a5a38", "#6b432a", "#f0c8a0"];
const HAIRS = ["#2a1c10", "#4a3018", "#151210", "#6e4a22", "#888078", "#3a3a3c"];

const gunMetal = new THREE.MeshStandardMaterial({ color: 0x22262b, roughness: 0.4, metalness: 0.6 });

function limb(len: number, r: number, mat: THREE.Material): THREE.Mesh {
  const geo = new THREE.CapsuleGeometry(r, len, 3, 8);
  const m = new THREE.Mesh(geo, mat);
  // capsule is centered; shift so pivot is at the top of the limb
  m.position.y = -len / 2;
  m.castShadow = true;
  return m;
}

function paintballMarker(): { gun: THREE.Group; muzzle: THREE.Object3D } {
  const gun = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.09, 0.3), gunMetal);
  gun.add(body);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.26, 8), gunMetal);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.02, -0.26);
  gun.add(barrel);
  const hopper = new THREE.Mesh(
    new THREE.SphereGeometry(0.06, 10, 8),
    new THREE.MeshStandardMaterial({ color: 0x111318, roughness: 0.3 })
  );
  hopper.position.set(0, 0.1, -0.02);
  gun.add(hopper);
  const tank = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.035, 0.16, 10),
    new THREE.MeshStandardMaterial({ color: 0xb8b0a0, roughness: 0.35, metalness: 0.7 })
  );
  tank.rotation.x = Math.PI / 2;
  tank.position.set(0, -0.05, 0.2);
  gun.add(tank);
  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, 0.02, -0.42);
  gun.add(muzzle);
  return { gun, muzzle };
}

export interface HumanoidOptions {
  /** Override hair colour (CSS colour string). */
  hair?: string;
  /** Hairstyle: default short cap, bob, or ponytail. */
  hairStyle?: "short" | "bob" | "ponytail";
  /** Face expression: cute (big eyes + chubby cheeks), angry, silly (tongue out). */
  face?: FaceExpression;
  /** Scale applied to the whole head (e.g. 1.3 for a big cute head). */
  headScale?: number;
  /** Name printed across the back of the vest. */
  backName?: string;
  /** Number printed under the name. */
  backNumber?: string;
}

/**
 * Builds an articulated ~1.8m human paintball player.
 * seed drives skin tone / hair so teams look like different people.
 */
export function createHumanoid(teamColor: number, seed: number, opts?: HumanoidOptions): Humanoid {
  const rnd = (n: number) => {
    // deterministic per-seed variety
    const x = Math.sin(seed * 127.1 + n * 311.7) * 43758.5453;
    return x - Math.floor(x);
  };
  const skin = SKINS[Math.floor(rnd(1) * SKINS.length)];
  const hair = opts?.hair ?? HAIRS[Math.floor(rnd(2) * HAIRS.length)];
  const skinMat = new THREE.MeshStandardMaterial({ color: skin, roughness: 0.75 });
  const jerseyMat = new THREE.MeshStandardMaterial({ color: teamColor, roughness: 0.8 });
  const jerseyDark = new THREE.MeshStandardMaterial({
    color: new THREE.Color(teamColor).multiplyScalar(0.55),
    roughness: 0.8,
  });
  const pantsMat = new THREE.MeshStandardMaterial({
    map: camoTexture("#4a4a3a", "#35352a", "#5c5c46"),
    roughness: 0.9,
  });
  const bootMat = new THREE.MeshStandardMaterial({ color: 0x241c14, roughness: 0.9 });

  const group = new THREE.Group();

  // ---- legs ----
  const hipY = 0.94;
  const upperLegLen = 0.4;
  const lowerLegLen = 0.38;
  const mkLeg = (side: number) => {
    const hip = new THREE.Group();
    hip.position.set(0.11 * side, hipY, 0);
    hip.add(limb(upperLegLen, 0.075, pantsMat));
    const knee = new THREE.Group();
    knee.position.y = -upperLegLen;
    knee.add(limb(lowerLegLen, 0.062, pantsMat));
    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.09, 0.26), bootMat);
    boot.position.set(0, -lowerLegLen - 0.06, -0.05);
    boot.castShadow = true;
    knee.add(boot);
    hip.add(knee);
    group.add(hip);
    return { hip, knee };
  };
  const L = mkLeg(-1);
  const R = mkLeg(1);

  // ---- torso ----
  const torso = new THREE.Group();
  torso.position.y = hipY;
  group.add(torso);
  const chest = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.52, 0.24), jerseyMat);
  chest.position.y = 0.3;
  chest.castShadow = true;
  torso.add(chest);
  // tactical vest — the back face can carry a name and number
  let vestMats: THREE.Material | THREE.Material[] = jerseyDark;
  if (opts?.backName) {
    const darkHex = "#" + new THREE.Color(teamColor).multiplyScalar(0.55).getHexString();
    const backMat = new THREE.MeshStandardMaterial({
      map: jerseyBackTexture(darkHex, opts.backName, opts.backNumber ?? ""),
      roughness: 0.8,
    });
    // box material order: +x, -x, +y, -y, +z(front/face side), -z(back)
    vestMats = [jerseyDark, jerseyDark, jerseyDark, jerseyDark, jerseyDark, backMat];
  }
  const vest = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.3, 0.3), vestMats);
  vest.position.y = 0.34;
  torso.add(vest);
  const waist = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.14, 0.22), pantsMat);
  waist.position.y = 0.02;
  torso.add(waist);
  const paintTargets = new THREE.Group();
  torso.add(paintTargets);

  // ---- head ----
  const head = new THREE.Group();
  head.position.y = 0.68;
  torso.add(head);
  const faceMat = new THREE.MeshStandardMaterial({ map: faceTexture(skin, opts?.face ?? "normal"), roughness: 0.7 });
  const sideMat = skinMat;
  const skull = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.26, 0.24), [
    sideMat, sideMat, sideMat, sideMat, faceMat, sideMat,
  ]);
  skull.position.y = 0.13;
  skull.castShadow = true;
  head.add(skull);
  // hair
  const hairMat = new THREE.MeshStandardMaterial({ color: hair, roughness: 0.95 });
  const style = opts?.hairStyle ?? "short";
  const hairMesh = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.09, 0.26), hairMat);
  hairMesh.position.set(0, 0.25, -0.01);
  head.add(hairMesh);
  if (style === "bob") {
    // panels down the sides and back of the head
    for (const sx of [-1, 1]) {
      const side = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.2, 0.24), hairMat);
      side.position.set(0.128 * sx, 0.12, -0.02);
      head.add(side);
    }
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.2, 0.04), hairMat);
    back.position.set(0, 0.12, -0.135);
    head.add(back);
    // fringe
    const fringe = new THREE.Mesh(new THREE.BoxGeometry(0.23, 0.05, 0.03), hairMat);
    fringe.position.set(0, 0.245, 0.125);
    head.add(fringe);
  } else if (style === "ponytail") {
    const band = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 5), hairMat);
    band.position.set(0, 0.22, -0.15);
    head.add(band);
    const tail = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.26, 3, 6), hairMat);
    tail.position.set(0, 0.05, -0.19);
    tail.rotation.x = 0.28;
    head.add(tail);
  }
  if (opts?.headScale) head.scale.setScalar(opts.headScale);
  // paintball goggles strap + lens
  const lens = new THREE.Mesh(
    new THREE.BoxGeometry(0.2, 0.07, 0.03),
    new THREE.MeshStandardMaterial({ color: 0x88ccee, roughness: 0.1, metalness: 0.4, transparent: true, opacity: 0.75 })
  );
  lens.position.set(0, 0.16, 0.13);
  head.add(lens);
  const strap = new THREE.Mesh(
    new THREE.BoxGeometry(0.25, 0.045, 0.27),
    new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 })
  );
  strap.position.set(0, 0.16, 0);
  head.add(strap);
  // neck
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.06, 0.09, 8), skinMat);
  neck.position.y = 0.6;
  torso.add(neck);

  // ---- arms ----
  const upperArmLen = 0.3;
  const lowerArmLen = 0.28;
  const mkArm = (side: number) => {
    const shoulder = new THREE.Group();
    shoulder.position.set(0.26 * side, 0.5, 0);
    shoulder.add(limb(upperArmLen, 0.06, jerseyMat));
    const elbow = new THREE.Group();
    elbow.position.y = -upperArmLen;
    elbow.add(limb(lowerArmLen, 0.05, skinMat));
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), skinMat);
    hand.position.y = -lowerArmLen - 0.02;
    elbow.add(hand);
    shoulder.add(elbow);
    torso.add(shoulder);
    return { shoulder, elbow };
  };
  const armL = mkArm(-1);
  const armR = mkArm(1);

  // gun in right hand
  const { gun, muzzle } = paintballMarker();
  gun.position.set(0, -lowerArmLen - 0.04, -0.05);
  // barrel points along the arm; hopper sits on top when aiming
  gun.rotation.set(-Math.PI / 2, 0, Math.PI);
  gun.scale.setScalar(1.35);
  armR.elbow.add(gun);

  return {
    group,
    torso,
    head,
    shoulderL: armL.shoulder,
    shoulderR: armR.shoulder,
    elbowL: armL.elbow,
    elbowR: armR.elbow,
    hipL: L.hip,
    hipR: R.hip,
    kneeL: L.knee,
    kneeR: R.knee,
    gun,
    muzzle,
    paintTargets,
  };
}

/**
 * Poses limbs each frame.
 * walkPhase advances with distance moved; speed01 is 0 idle → 1 sprint.
 * aimPitch tilts the aiming arms and head (radians, +up).
 * aiming=true holds the marker up two-handed.
 * crouch is 0..1 — bends knees and lowers the torso.
 */
export function poseHumanoid(
  h: Humanoid,
  walkPhase: number,
  speed01: number,
  aimPitch: number,
  aiming: boolean,
  climbing = false,
  crouch = 0
) {
  const swing = Math.sin(walkPhase) * 0.85 * speed01;
  const swingB = Math.sin(walkPhase + Math.PI) * 0.85 * speed01;

  if (climbing) {
    const c = Math.sin(walkPhase * 2);
    h.shoulderL.rotation.set(Math.PI - 0.4 + c * 0.25, 0, 0.25);
    h.shoulderR.rotation.set(Math.PI - 0.4 - c * 0.25, 0, -0.25);
    h.elbowL.rotation.x = -0.5;
    h.elbowR.rotation.x = -0.5;
    h.hipL.rotation.x = -0.6 + c * 0.3;
    h.hipR.rotation.x = -0.6 - c * 0.3;
    h.kneeL.rotation.x = 0.9;
    h.kneeR.rotation.x = 0.9;
    h.head.rotation.x = -0.4;
    return;
  }

  // legs (crouch bends knees and drops the hips)
  h.hipL.rotation.x = swing - 1.05 * crouch;
  h.hipR.rotation.x = swingB - 1.05 * crouch;
  h.kneeL.rotation.x = Math.max(0, -swing) * 1.2 + 0.08 * speed01 + 1.45 * crouch;
  h.kneeR.rotation.x = Math.max(0, -swingB) * 1.2 + 0.08 * speed01 + 1.45 * crouch;

  // subtle torso bob & lean
  h.torso.position.y = 0.94 + Math.abs(Math.sin(walkPhase)) * 0.035 * speed01 - 0.36 * crouch;
  h.torso.rotation.x = 0.06 * speed01 + 0.2 * crouch;

  if (aiming) {
    // two-handed marker hold, arms track pitch (arm axis -y; -PI/2 about x points it forward +z)
    h.shoulderR.rotation.set(-Math.PI / 2 - aimPitch, 0, -0.12);
    h.elbowR.rotation.set(-0.15, 0, 0);
    h.shoulderL.rotation.set(-Math.PI / 2 - aimPitch + 0.3, 0.55, 0);
    h.elbowL.rotation.set(-0.9, 0, 0);
    h.head.rotation.x = -aimPitch * 0.5;
  } else {
    h.shoulderL.rotation.set(swingB * 0.6, 0, 0.08);
    h.shoulderR.rotation.set(swing * 0.6, 0, -0.08);
    h.elbowL.rotation.set(-0.25 - Math.max(0, swingB) * 0.4, 0, 0);
    h.elbowR.rotation.set(-0.25 - Math.max(0, swing) * 0.4, 0, 0);
    h.head.rotation.x = 0;
  }
}

/** Attach a paint blob to a character where they got hit. */
export function addBodyPaint(h: Humanoid, color: number, localPos: THREE.Vector3) {
  const blob = new THREE.Mesh(
    new THREE.SphereGeometry(0.055 + Math.random() * 0.045, 8, 6),
    new THREE.MeshStandardMaterial({ color, roughness: 0.25 })
  );
  blob.scale.z = 0.4;
  blob.position.copy(localPos);
  blob.lookAt(localPos.clone().multiplyScalar(2));
  h.paintTargets.add(blob);
  if (h.paintTargets.children.length > 10) {
    const old = h.paintTargets.children[0] as THREE.Mesh;
    old.geometry.dispose();
    (old.material as THREE.Material).dispose();
    h.paintTargets.remove(old);
  }
}

export function clearBodyPaint(h: Humanoid) {
  for (const c of [...h.paintTargets.children] as THREE.Mesh[]) {
    c.geometry.dispose();
    (c.material as THREE.Material).dispose();
    h.paintTargets.remove(c);
  }
}
