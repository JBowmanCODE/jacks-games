import * as THREE from "three";
import { createHumanoid, poseHumanoid, addBodyPaint, clearBodyPaint, Humanoid } from "./humanoid";
import { buildWorld, createTrashCan, WorldData, MAT_Y, APRON_HALF, CAGE_HALF, CAGE_H, ARENA } from "./world";
import { splatTexture } from "./textures";

// ---------- tuning ----------
const PLAYER_R = 0.32;
const BODY_H = 1.75;
const GRAV = 21;
const JUMP_V = 7.6;
const WALK = 4.3;
const SPRINT = 6.6;
const BOT_SPEED = 3.7;
const CLIMB_SPEED = 2.4;
const FIRE_INTERVAL = 0.16;
const BALL_SPEED = 40;
const BALL_GRAV = 8;
const HIT_DMG = 34;
const CAN_DMG = 100;
const RESPAWN_T = 3.5;
const MATCH_TIME = 300;
const WIN_SCORE = 25;
const STEP_UP = 0.55;

const RED = 0xd93434;
const BLUE = 0x2f6fd9;
const PAINT_RED = [0xff2255, 0xff5533, 0xff3388];
const PAINT_BLUE = [0x22aaff, 0x3355ff, 0x00ddcc];

const RED_NAMES = ["Jack", "Rex", "Maya", "Duke", "Zoe"];
const BLUE_NAMES = ["Vince", "Kira", "Bruno", "Tess", "Axel"];

export interface HudState {
  hp: number;
  red: number;
  blue: number;
  time: number;
  prompt: string;
  carrying: boolean;
  dead: boolean;
  respawnIn: number;
  onRoof: boolean;
}

export interface EngineCallbacks {
  onHud(h: HudState): void;
  onKill(line: string, isCan: boolean): void;
  onGameOver(winner: "red" | "blue" | "draw", red: number, blue: number): void;
  onDamage(): void;
}

interface Fighter {
  rig: Humanoid;
  team: 0 | 1;
  name: string;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  yaw: number;
  pitch: number;
  hp: number;
  alive: boolean;
  deadT: number;
  walkPhase: number;
  speed01: number;
  isPlayer: boolean;
  climbing: boolean;
  grounded: boolean;
  fireCd: number;
  aiming: boolean;
  // bot brain
  wp: THREE.Vector3 | null;
  path: THREE.Vector3[];
  thinkT: number;
  strafe: number;
  target: Fighter | null;
  stuckT: number;
  lastPos: THREE.Vector3;
  burst: number;
}

interface Ball {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  mesh: THREE.Mesh;
  owner: Fighter;
  color: number;
  life: number;
}

interface Can {
  group: THREE.Group;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  held: Fighter | null;
  thrower: Fighter | null;
  graceT: number;
  spin: number;
}

interface Decal {
  mesh: THREE.Mesh;
  life: number;
}

interface Burst {
  points: THREE.Points;
  vels: THREE.Vector3[];
  life: number;
}

// ---------- tiny synth ----------
class Sfx {
  ctx: AudioContext | null = null;
  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AC();
    }
    if (this.ctx.state === "suspended") this.ctx.resume();
  }
  private env(gainV: number, dur: number) {
    const ctx = this.ctx!;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gainV, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    g.connect(ctx.destination);
    return g;
  }
  private noise(dur: number): AudioBufferSourceNode {
    const ctx = this.ctx!;
    const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    return src;
  }
  shoot() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.type = "triangle";
    o.frequency.setValueAtTime(520, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(160, ctx.currentTime + 0.09);
    o.connect(this.env(0.14, 0.09));
    o.start();
    o.stop(ctx.currentTime + 0.1);
  }
  splat() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const n = this.noise(0.12);
    const f = ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = 900;
    n.connect(f);
    f.connect(this.env(0.25, 0.12));
    n.start();
  }
  hurt() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.type = "sawtooth";
    o.frequency.setValueAtTime(140, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.18);
    o.connect(this.env(0.2, 0.18));
    o.start();
    o.stop(ctx.currentTime + 0.2);
  }
  clang() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    for (const fq of [210, 335, 507]) {
      const o = ctx.createOscillator();
      o.type = "square";
      o.frequency.value = fq;
      o.connect(this.env(0.05, 0.25));
      o.start();
      o.stop(ctx.currentTime + 0.3);
    }
  }
  whoosh() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const n = this.noise(0.3);
    const f = ctx.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.setValueAtTime(300, ctx.currentTime);
    f.frequency.exponentialRampToValueAtTime(1400, ctx.currentTime + 0.28);
    n.connect(f);
    f.connect(this.env(0.16, 0.3));
    n.start();
  }
  jingle(win: boolean) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const notes = win ? [523, 659, 784, 1047] : [392, 330, 262, 196];
    notes.forEach((fq, i) => {
      const o = ctx.createOscillator();
      o.type = "triangle";
      o.frequency.value = fq;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, ctx.currentTime + i * 0.16);
      g.gain.linearRampToValueAtTime(0.15, ctx.currentTime + i * 0.16 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.16 + 0.4);
      o.connect(g);
      g.connect(ctx.destination);
      o.start(ctx.currentTime + i * 0.16);
      o.stop(ctx.currentTime + i * 0.16 + 0.45);
    });
  }
}

export class PaintballEngine {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private world: WorldData;
  private cb: EngineCallbacks;
  private sfx = new Sfx();

  private fighters: Fighter[] = [];
  private player!: Fighter;
  private balls: Ball[] = [];
  private cans: Can[] = [];
  private decals: Decal[] = [];
  private bursts: Burst[] = [];

  private keys = new Set<string>();
  private mouseDown = false;
  private raf = 0;
  private clock = new THREE.Clock();
  private running = false;
  private over = false;
  private timeLeft = MATCH_TIME;
  private score = { red: 0, blue: 0 };
  private hudT = 0;
  private shake = 0;
  private prompt = "";
  private splatTex = splatTexture();
  private ballGeo = new THREE.SphereGeometry(0.05, 8, 6);
  private ballMats = new Map<number, THREE.MeshBasicMaterial>();
  private disposed = false;

  constructor(canvas: HTMLCanvasElement, cb: EngineCallbacks) {
    this.cb = cb;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.camera = new THREE.PerspectiveCamera(70, canvas.clientWidth / canvas.clientHeight, 0.1, 400);
    this.world = buildWorld(this.scene);
    this.spawnTeams();
    this.spawnCans();
    this.bindInput();
    this.renderer.render(this.scene, this.camera);
  }

  // ================= setup =================
  private spawnTeams() {
    for (let i = 0; i < 5; i++) {
      this.fighters.push(this.makeFighter(0, RED_NAMES[i], i, i === 0));
      this.fighters.push(this.makeFighter(1, BLUE_NAMES[i], i, false));
    }
    this.player = this.fighters[0];
  }

  private spawnPoint(team: 0 | 1, idx: number): THREE.Vector3 {
    const x = team === 0 ? -46 : 46;
    return new THREE.Vector3(x + (team === 0 ? 1 : -1) * (idx % 2), 0, (idx - 2) * 2.2);
  }

  private makeFighter(team: 0 | 1, name: string, idx: number, isPlayer: boolean): Fighter {
    const rig = createHumanoid(team === 0 ? RED : BLUE, idx + team * 17 + 3);
    this.scene.add(rig.group);
    const pos = this.spawnPoint(team, idx);
    rig.group.position.copy(pos);
    const yaw = team === 0 ? Math.PI / 2 : -Math.PI / 2;
    rig.group.rotation.y = yaw;
    return {
      rig, team, name,
      pos, vel: new THREE.Vector3(),
      yaw, pitch: 0, hp: 100, alive: true, deadT: 0,
      walkPhase: 0, speed01: 0, isPlayer,
      climbing: false, grounded: true, fireCd: 0, aiming: isPlayer,
      wp: null, path: [], thinkT: Math.random() * 0.3, strafe: 1,
      target: null, stuckT: 0, lastPos: pos.clone(), burst: 0,
    };
  }

  private spawnCans() {
    for (const p of this.world.trashCanSpawns) {
      const group = createTrashCan();
      group.position.copy(p);
      this.scene.add(group);
      this.cans.push({ group, pos: p.clone(), vel: new THREE.Vector3(), held: null, thrower: null, graceT: 0, spin: 0 });
    }
  }

  // ================= input =================
  private onKeyDown = (e: KeyboardEvent) => {
    if (["KeyW", "KeyA", "KeyS", "KeyD", "Space", "ShiftLeft", "ShiftRight", "KeyE"].includes(e.code)) e.preventDefault();
    this.keys.add(e.code);
    if (e.code === "KeyE" && !e.repeat) this.interact();
  };
  private onKeyUp = (e: KeyboardEvent) => this.keys.delete(e.code);
  private onMouseMove = (e: MouseEvent) => {
    if (!this.running || document.pointerLockElement !== this.renderer.domElement) return;
    this.player.yaw -= e.movementX * 0.0021;
    this.player.pitch = THREE.MathUtils.clamp(this.player.pitch - e.movementY * 0.0021, -1.25, 1.25);
  };
  private onMouseDown = (e: MouseEvent) => {
    if (e.button !== 0 || !this.running) return;
    const held = this.cans.find((c) => c.held === this.player);
    if (held) this.throwCan(held, this.player);
    else this.mouseDown = true;
  };
  private onMouseUp = (e: MouseEvent) => {
    if (e.button === 0) this.mouseDown = false;
  };

  private bindInput() {
    document.addEventListener("keydown", this.onKeyDown);
    document.addEventListener("keyup", this.onKeyUp);
    document.addEventListener("mousemove", this.onMouseMove);
    document.addEventListener("mousedown", this.onMouseDown);
    document.addEventListener("mouseup", this.onMouseUp);
  }

  setRunning(r: boolean) {
    this.running = r && !this.over;
    if (this.running) {
      this.sfx.ensure();
      this.clock.getDelta();
      if (!this.raf) this.loop();
    }
  }

  start() {
    this.setRunning(true);
    if (!this.raf) this.loop();
  }

  reset() {
    this.over = false;
    this.timeLeft = MATCH_TIME;
    this.score = { red: 0, blue: 0 };
    for (let i = 0; i < this.fighters.length; i++) {
      const f = this.fighters[i];
      this.respawn(f);
      f.hp = 100;
      f.alive = true;
    }
    for (const d of this.decals) this.scene.remove(d.mesh);
    this.decals = [];
    for (const b of this.balls) this.scene.remove(b.mesh);
    this.balls = [];
    this.cans.forEach((c, i) => {
      c.held = null;
      c.vel.set(0, 0, 0);
      c.pos.copy(this.world.trashCanSpawns[i]);
      c.group.position.copy(c.pos);
      c.group.rotation.set(0, 0, 0);
    });
  }

  /** Debug/testing hook: place the player somewhere specific. */
  teleportPlayer(x: number, z: number, yaw?: number) {
    const p = this.player;
    p.pos.set(x, this.world.floorHeightAt(x, z, 0), z);
    p.vel.set(0, 0, 0);
    if (yaw !== undefined) p.yaw = yaw;
  }

  resize(w: number, h: number) {
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    document.removeEventListener("keydown", this.onKeyDown);
    document.removeEventListener("keyup", this.onKeyUp);
    document.removeEventListener("mousemove", this.onMouseMove);
    document.removeEventListener("mousedown", this.onMouseDown);
    document.removeEventListener("mouseup", this.onMouseUp);
    this.renderer.dispose();
  }

  // ================= interactions =================
  private interact() {
    if (!this.running) return;
    const p = this.player;
    if (!p.alive) return;
    if (p.climbing) {
      p.climbing = false;
      return;
    }
    const held = this.cans.find((c) => c.held === p);
    if (held) {
      // drop gently
      held.held = null;
      held.vel.set(0, 1, 0);
      held.thrower = p;
      held.graceT = 0.5;
      return;
    }
    const near = this.nearestCan(p.pos, 1.7);
    if (near && !near.held) {
      near.held = p;
      near.vel.set(0, 0, 0);
      return;
    }
    if (this.nearCageWall(p) && p.pos.y < CAGE_H - 0.3) {
      p.climbing = true;
      p.vel.set(0, 0, 0);
    }
  }

  private nearestCan(pos: THREE.Vector3, maxD: number): Can | null {
    let best: Can | null = null;
    let bd = maxD;
    for (const c of this.cans) {
      if (c.held) continue;
      const d = Math.hypot(c.pos.x - pos.x, c.pos.z - pos.z);
      if (d < bd && Math.abs(c.pos.y - pos.y) < 1.6) {
        bd = d;
        best = c;
      }
    }
    return best;
  }

  private nearCageWall(f: Fighter): boolean {
    for (const w of this.world.walls) {
      if (!w.cage) continue;
      const d = this.distToSeg(f.pos.x, f.pos.z, w.x1, w.z1, w.x2, w.z2);
      if (d < 0.85) return true;
    }
    return false;
  }

  private throwCan(can: Can, f: Fighter) {
    can.held = null;
    can.thrower = f;
    can.graceT = 0.45;
    const dir = new THREE.Vector3(
      Math.cos(f.pitch) * Math.sin(f.yaw),
      Math.sin(f.pitch),
      Math.cos(f.pitch) * Math.cos(f.yaw)
    );
    can.vel.copy(dir).multiplyScalar(13).add(new THREE.Vector3(0, 4.2, 0));
    can.spin = 6 + Math.random() * 4;
    this.sfx.whoosh();
  }

  // ================= combat =================
  private paintColor(team: 0 | 1): number {
    const list = team === 0 ? PAINT_RED : PAINT_BLUE;
    return list[Math.floor(Math.random() * list.length)];
  }

  private fire(f: Fighter, dir: THREE.Vector3) {
    const color = this.paintColor(f.team);
    let mat = this.ballMats.get(color);
    if (!mat) {
      mat = new THREE.MeshBasicMaterial({ color });
      this.ballMats.set(color, mat);
    }
    const mesh = new THREE.Mesh(this.ballGeo, mat);
    const origin = new THREE.Vector3();
    f.rig.muzzle.getWorldPosition(origin);
    mesh.position.copy(origin);
    this.scene.add(mesh);
    this.balls.push({
      pos: origin.clone(),
      vel: dir.clone().normalize().multiplyScalar(BALL_SPEED),
      mesh, owner: f, color, life: 2.6,
    });
    f.fireCd = f.isPlayer ? FIRE_INTERVAL : 0.32 + Math.random() * 0.2;
    this.sfx.shoot();
  }

  private playerAimDir(): THREE.Vector3 {
    const p = this.player;
    const dir = new THREE.Vector3(
      Math.cos(p.pitch) * Math.sin(p.yaw),
      Math.sin(p.pitch),
      Math.cos(p.pitch) * Math.cos(p.yaw)
    );
    // converge toward the crosshair point 40m out
    const camTarget = this.camera.position.clone().add(this.cameraDir().multiplyScalar(42));
    const origin = new THREE.Vector3();
    p.rig.muzzle.getWorldPosition(origin);
    const d = camTarget.sub(origin).normalize();
    return d.lengthSq() > 0 ? d : dir;
  }

  private cameraDir(): THREE.Vector3 {
    const d = new THREE.Vector3();
    this.camera.getWorldDirection(d);
    return d;
  }

  private damage(victim: Fighter, attacker: Fighter, dmg: number, hitWorld: THREE.Vector3, byCan: boolean) {
    if (!victim.alive || this.over) return;
    victim.hp -= dmg;
    const local = victim.rig.torso.worldToLocal(hitWorld.clone());
    addBodyPaint(victim.rig, this.paintColor(attacker.team), local);
    if (victim.isPlayer) {
      this.cb.onDamage();
      this.shake = Math.max(this.shake, 0.25);
      this.sfx.hurt();
    }
    if (victim.hp <= 0) {
      victim.alive = false;
      victim.deadT = 0;
      victim.hp = 0;
      const canDrop = this.cans.find((c) => c.held === victim);
      if (canDrop) {
        canDrop.held = null;
        canDrop.vel.set(0, 2, 0);
      }
      // self-splats and friendly fire score for the other team
      const scoringTeam = attacker.team === victim.team ? 1 - victim.team : attacker.team;
      if (scoringTeam === 0) this.score.red++;
      else this.score.blue++;
      this.cb.onKill(
        byCan ? `${attacker.name} CRUSHED ${victim.name} with a trash can!` : `${attacker.name} splatted ${victim.name}`,
        byCan
      );
      this.sfx.splat();
      if (this.score.red >= WIN_SCORE || this.score.blue >= WIN_SCORE) this.endGame();
    }
  }

  private endGame() {
    if (this.over) return;
    this.over = true;
    this.running = false;
    const { red, blue } = this.score;
    const winner = red > blue ? "red" : blue > red ? "blue" : "draw";
    this.sfx.jingle(winner === "red");
    this.cb.onGameOver(winner, red, blue);
    document.exitPointerLock?.();
  }

  private respawn(f: Fighter) {
    const idx = this.fighters.filter((x) => x.team === f.team).indexOf(f);
    f.pos.copy(this.spawnPoint(f.team, Math.max(0, idx)));
    f.pos.x += (Math.random() - 0.5) * 2;
    f.pos.z += (Math.random() - 0.5) * 2;
    f.vel.set(0, 0, 0);
    f.hp = 100;
    f.alive = true;
    f.climbing = false;
    f.yaw = f.team === 0 ? Math.PI / 2 : -Math.PI / 2;
    f.pitch = 0;
    f.target = null;
    f.wp = null;
    f.path = [];
    f.rig.group.rotation.set(0, f.yaw, 0);
    f.rig.group.position.copy(f.pos);
    clearBodyPaint(f.rig);
  }

  // ================= splats & particles =================
  private addDecal(pos: THREE.Vector3, normal: THREE.Vector3, color: number) {
    const size = 0.45 + Math.random() * 0.5;
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(size, size),
      new THREE.MeshBasicMaterial({
        map: this.splatTex,
        color,
        transparent: true,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -2,
      })
    );
    mesh.position.copy(pos).addScaledVector(normal, 0.02);
    mesh.lookAt(pos.clone().add(normal));
    mesh.rotateZ(Math.random() * Math.PI * 2);
    this.scene.add(mesh);
    this.decals.push({ mesh, life: 25 });
    if (this.decals.length > 90) {
      const old = this.decals.shift()!;
      this.scene.remove(old.mesh);
      old.mesh.geometry.dispose();
      (old.mesh.material as THREE.Material).dispose();
    }
  }

  private addBurst(pos: THREE.Vector3, normal: THREE.Vector3, color: number) {
    const n = 10;
    const geo = new THREE.BufferGeometry();
    const arr = new Float32Array(n * 3);
    const vels: THREE.Vector3[] = [];
    for (let i = 0; i < n; i++) {
      arr[i * 3] = pos.x;
      arr[i * 3 + 1] = pos.y;
      arr[i * 3 + 2] = pos.z;
      const v = new THREE.Vector3((Math.random() - 0.5) * 2, Math.random() * 1.5, (Math.random() - 0.5) * 2)
        .addScaledVector(normal, 1.5)
        .multiplyScalar(1.6 + Math.random() * 2);
      vels.push(v);
    }
    geo.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    const points = new THREE.Points(
      geo,
      new THREE.PointsMaterial({ color, size: 0.07, transparent: true, opacity: 0.95 })
    );
    this.scene.add(points);
    this.bursts.push({ points, vels, life: 0.5 });
  }

  // ================= physics helpers =================
  private distToSeg(px: number, pz: number, x1: number, z1: number, x2: number, z2: number): number {
    const dx = x2 - x1;
    const dz = z2 - z1;
    const t = THREE.MathUtils.clamp(((px - x1) * dx + (pz - z1) * dz) / (dx * dx + dz * dz || 1), 0, 1);
    return Math.hypot(px - (x1 + dx * t), pz - (z1 + dz * t));
  }

  /** Push a point out of walls/cylinders. Returns new xz. */
  private resolveXZ(x: number, z: number, feetY: number, radius: number, headY: number): [number, number] {
    for (const c of this.world.cylinders) {
      // trees don't block you when you're up on the roof level above them? trunks are tall — keep blocking
      const dx = x - c.x;
      const dz = z - c.z;
      const d = Math.hypot(dx, dz);
      const min = c.r + radius;
      if (d < min && d > 0.0001) {
        x = c.x + (dx / d) * min;
        z = c.z + (dz / d) * min;
      }
    }
    for (const w of this.world.walls) {
      if (feetY >= w.maxY - 0.12 || headY <= w.minY) continue;
      const dx2 = w.x2 - w.x1;
      const dz2 = w.z2 - w.z1;
      const t = THREE.MathUtils.clamp(((x - w.x1) * dx2 + (z - w.z1) * dz2) / (dx2 * dx2 + dz2 * dz2 || 1), 0, 1);
      const cx = w.x1 + dx2 * t;
      const cz = w.z1 + dz2 * t;
      let nx = x - cx;
      let nz = z - cz;
      const d = Math.hypot(nx, nz);
      const min = radius + 0.06;
      if (d < min) {
        if (d < 0.0001) {
          nx = dz2;
          nz = -dx2;
          const nl = Math.hypot(nx, nz) || 1;
          nx /= nl;
          nz /= nl;
        } else {
          nx /= d;
          nz /= d;
        }
        x = cx + nx * min;
        z = cz + nz * min;
      }
    }
    return [x, z];
  }

  private moveFighter(f: Fighter, dt: number, wishX: number, wishZ: number, speed: number) {
    const startX = f.pos.x;
    const startZ = f.pos.z;
    let nx = f.pos.x + wishX * speed * dt;
    let nz = f.pos.z + wishZ * speed * dt;
    [nx, nz] = this.resolveXZ(nx, nz, f.pos.y, PLAYER_R, f.pos.y + BODY_H);
    // ledge rule: can't walk up more than STEP_UP
    const fh = this.world.floorHeightAt(nx, nz, f.pos.y);
    if (fh - f.pos.y > STEP_UP) {
      // try sliding on each axis
      let sx = f.pos.x + wishX * speed * dt;
      const fhX = this.world.floorHeightAt(sx, f.pos.z, f.pos.y);
      if (fhX - f.pos.y <= STEP_UP) {
        [sx] = this.resolveXZ(sx, f.pos.z, f.pos.y, PLAYER_R, f.pos.y + BODY_H);
        f.pos.x = sx;
      } else {
        let sz = f.pos.z + wishZ * speed * dt;
        const fhZ = this.world.floorHeightAt(f.pos.x, sz, f.pos.y);
        if (fhZ - f.pos.y <= STEP_UP) {
          const r = this.resolveXZ(f.pos.x, sz, f.pos.y, PLAYER_R, f.pos.y + BODY_H);
          f.pos.z = r[1];
        }
      }
    } else {
      f.pos.x = nx;
      f.pos.z = nz;
    }
    // gravity + floor
    f.vel.y -= GRAV * dt;
    f.pos.y += f.vel.y * dt;
    const floor = this.world.floorHeightAt(f.pos.x, f.pos.z, f.pos.y);
    if (f.pos.y <= floor) {
      f.pos.y = floor;
      f.vel.y = 0;
      f.grounded = true;
    } else if (floor > 0 && f.pos.y - floor < STEP_UP && f.vel.y <= 0) {
      f.pos.y = floor;
      f.vel.y = 0;
      f.grounded = true;
    } else {
      f.grounded = f.pos.y - floor < 0.02;
    }
    const moved = Math.hypot(f.pos.x - startX, f.pos.z - startZ);
    f.walkPhase += moved * 2.4;
    f.speed01 = THREE.MathUtils.clamp(moved / (SPRINT * dt + 0.0001), 0, 1);
  }

  // ================= bots =================
  private botThink(f: Fighter, dt: number) {
    f.thinkT -= dt;
    if (f.thinkT > 0) return;
    f.thinkT = 0.22 + Math.random() * 0.12;

    // acquire target
    let best: Fighter | null = null;
    let bd = 46;
    for (const e of this.fighters) {
      if (e.team === f.team || !e.alive) continue;
      const d = f.pos.distanceTo(e.pos);
      if (d < bd && !this.world.losBlocked(f.pos.x, f.pos.z, e.pos.x, e.pos.z)) {
        bd = d;
        best = e;
      }
    }
    f.target = best;
    if (Math.random() < 0.25) f.strafe = -f.strafe;

    // unstuck check
    if (f.pos.distanceToSquared(f.lastPos) < 0.02 && !f.target) {
      f.stuckT += 0.25;
      if (f.stuckT > 1) {
        f.wp = null;
        f.path = [];
        f.stuckT = 0;
      }
    } else f.stuckT = 0;
    f.lastPos.copy(f.pos);

    // choose destination if idle
    if (!f.target && !f.wp && f.path.length === 0) {
      const insideRing = Math.abs(f.pos.x) <= APRON_HALF && Math.abs(f.pos.z) <= APRON_HALF && f.pos.y > 0.8;
      if (insideRing) {
        if (Math.random() < 0.5) {
          f.path = [...this.world.ringPathIn].reverse().map((v) => v.clone());
        } else {
          f.wp = new THREE.Vector3((Math.random() - 0.5) * 4.5, MAT_Y, (Math.random() - 0.5) * 4.5);
        }
      } else if (Math.random() < 0.18) {
        f.path = this.world.ringPathIn.map((v) => v.clone());
      } else {
        f.wp = this.world.waypoints[Math.floor(Math.random() * this.world.waypoints.length)].clone();
      }
    }
  }

  private botMove(f: Fighter, dt: number) {
    let wishX = 0;
    let wishZ = 0;
    let speed = BOT_SPEED;
    if (f.target) {
      const t = f.target;
      const dx = t.pos.x - f.pos.x;
      const dz = t.pos.z - f.pos.z;
      const dist = Math.hypot(dx, dz);
      f.yaw = Math.atan2(dx, dz);
      const dy = t.pos.y + 1.2 - (f.pos.y + 1.45);
      f.pitch = Math.atan2(dy, dist);
      f.aiming = true;
      // strafe + spacing
      const fx = dx / (dist || 1);
      const fz = dz / (dist || 1);
      const rx = -fz * f.strafe;
      const rz = fx * f.strafe;
      if (dist > 26) {
        wishX = fx + rx * 0.5;
        wishZ = fz + rz * 0.5;
      } else if (dist < 7) {
        wishX = -fx + rx;
        wishZ = -fz + rz;
      } else {
        wishX = rx;
        wishZ = rz;
      }
      // shoot
      f.fireCd -= dt;
      if (f.fireCd <= 0 && dist < 40) {
        if (f.burst <= 0) f.burst = 2 + Math.floor(Math.random() * 3);
        const origin = new THREE.Vector3();
        f.rig.muzzle.getWorldPosition(origin);
        const aim = new THREE.Vector3(t.pos.x, t.pos.y + 1.15, t.pos.z).sub(origin).normalize();
        aim.x += (Math.random() - 0.5) * 0.055;
        aim.y += (Math.random() - 0.5) * 0.045;
        aim.z += (Math.random() - 0.5) * 0.055;
        this.fire(f, aim.normalize());
        f.burst--;
        if (f.burst <= 0) f.fireCd = 0.75 + Math.random() * 0.6;
      }
    } else {
      f.aiming = false;
      f.pitch = 0;
      if (!f.wp && f.path.length > 0) f.wp = f.path.shift()!;
      if (f.wp) {
        const dx = f.wp.x - f.pos.x;
        const dz = f.wp.z - f.pos.z;
        const dist = Math.hypot(dx, dz);
        if (dist < 1.2) {
          f.wp = f.path.length > 0 ? f.path.shift()! : null;
        } else {
          f.yaw = Math.atan2(dx, dz);
          wishX = dx / dist;
          wishZ = dz / dist;
          speed = BOT_SPEED * (f.path.length > 0 ? 1.15 : 0.85);
        }
      }
    }
    const wl = Math.hypot(wishX, wishZ);
    if (wl > 1) {
      wishX /= wl;
      wishZ /= wl;
    }
    this.moveFighter(f, dt, wishX, wishZ, speed);
  }

  // ================= per-frame =================
  private updatePlayer(dt: number) {
    const p = this.player;
    if (!p.alive) return;

    if (p.climbing) {
      if (!this.nearCageWall(p) || p.pos.y >= CAGE_H) {
        p.climbing = false;
      } else {
        p.pos.y += CLIMB_SPEED * dt;
        p.walkPhase += dt * 4;
        if (p.pos.y >= CAGE_H) {
          p.pos.y = CAGE_H + 0.04;
          // pull onto the roof
          const toC = new THREE.Vector3(-p.pos.x, 0, -p.pos.z).normalize();
          p.pos.x += toC.x * 0.7;
          p.pos.z += toC.z * 0.7;
          p.pos.x = THREE.MathUtils.clamp(p.pos.x, -CAGE_HALF + 0.3, CAGE_HALF - 0.3);
          p.pos.z = THREE.MathUtils.clamp(p.pos.z, -CAGE_HALF + 0.3, CAGE_HALF - 0.3);
          p.climbing = false;
        }
      }
    } else {
      const fwdX = Math.sin(p.yaw);
      const fwdZ = Math.cos(p.yaw);
      const rightX = -fwdZ;
      const rightZ = fwdX;
      let wx = 0;
      let wz = 0;
      if (this.keys.has("KeyW")) {
        wx += fwdX;
        wz += fwdZ;
      }
      if (this.keys.has("KeyS")) {
        wx -= fwdX;
        wz -= fwdZ;
      }
      if (this.keys.has("KeyD")) {
        wx += rightX;
        wz += rightZ;
      }
      if (this.keys.has("KeyA")) {
        wx -= rightX;
        wz -= rightZ;
      }
      const wl = Math.hypot(wx, wz);
      if (wl > 0) {
        wx /= wl;
        wz /= wl;
      }
      const sprint = this.keys.has("ShiftLeft") || this.keys.has("ShiftRight");
      if (this.keys.has("Space") && p.grounded) {
        p.vel.y = JUMP_V;
        p.grounded = false;
      }
      this.moveFighter(p, dt, wx, wz, sprint ? SPRINT : WALK);
    }

    // firing
    p.fireCd -= dt;
    const holdingCan = this.cans.some((c) => c.held === p);
    if (this.mouseDown && !holdingCan && p.fireCd <= 0 && !p.climbing) {
      const dir = this.playerAimDir();
      dir.x += (Math.random() - 0.5) * 0.012;
      dir.y += (Math.random() - 0.5) * 0.012;
      this.fire(p, dir.normalize());
      this.shake = Math.max(this.shake, 0.04);
    }

    // interaction prompt
    if (p.climbing) this.prompt = "E — let go";
    else if (holdingCan) this.prompt = "CLICK — hurl the trash can!   E — set it down";
    else if (this.nearestCan(p.pos, 1.7)) this.prompt = "E — pick up trash can";
    else if (this.nearCageWall(p) && p.pos.y < CAGE_H - 0.3) this.prompt = "E — climb the cage";
    else this.prompt = "";
  }

  private updateFighterVisual(f: Fighter, dt: number) {
    if (!f.alive) {
      f.deadT += dt;
      // topple backwards
      const k = Math.min(1, f.deadT / 0.4);
      f.rig.group.rotation.x = (-Math.PI / 2) * k;
      if (f.deadT >= RESPAWN_T) this.respawn(f);
      f.rig.group.position.copy(f.pos);
      return;
    }
    f.rig.group.rotation.x = 0;
    f.rig.group.position.copy(f.pos);
    f.rig.group.rotation.y = f.yaw;
    poseHumanoid(f.rig, f.walkPhase, f.speed01, f.pitch, f.aiming && !f.climbing, f.climbing);
  }

  private updateBalls(dt: number) {
    for (let i = this.balls.length - 1; i >= 0; i--) {
      const b = this.balls[i];
      b.life -= dt;
      b.vel.y -= BALL_GRAV * dt;
      b.pos.addScaledVector(b.vel, dt);
      b.mesh.position.copy(b.pos);
      let dead = b.life <= 0 || Math.abs(b.pos.x) > ARENA + 30 || Math.abs(b.pos.z) > ARENA + 30;

      if (!dead) {
        // fighters
        for (const f of this.fighters) {
          if (f === b.owner || !f.alive || f.team === b.owner.team) continue;
          const cy = THREE.MathUtils.clamp(b.pos.y, f.pos.y + 0.15, f.pos.y + 1.6);
          const dx = b.pos.x - f.pos.x;
          const dz = b.pos.z - f.pos.z;
          if (dx * dx + dz * dz < 0.38 * 0.38 && Math.abs(b.pos.y - cy) < 0.25) {
            this.damage(f, b.owner, HIT_DMG, b.pos, false);
            this.addBurst(b.pos, new THREE.Vector3(0, 1, 0), b.color);
            dead = true;
            break;
          }
        }
      }
      if (!dead) {
        // floor (or the side of a raised floor, e.g. the ring skirt)
        const fh = this.world.floorHeightAt(b.pos.x, b.pos.z, b.pos.y);
        if (b.pos.y <= fh + 0.04) {
          if (b.pos.y < fh - 0.2) {
            // hit a vertical face — splat outward
            const n = new THREE.Vector3(b.pos.x, 0, b.pos.z).normalize().multiplyScalar(-1);
            const hit = b.pos.clone().addScaledVector(n, -0.05);
            this.addDecal(hit, n, b.color);
            this.addBurst(hit, n, b.color);
          } else {
            this.addDecal(new THREE.Vector3(b.pos.x, fh, b.pos.z), new THREE.Vector3(0, 1, 0), b.color);
            this.addBurst(b.pos, new THREE.Vector3(0, 1, 0), b.color);
          }
          this.sfx.splat();
          dead = true;
        }
      }
      if (!dead) {
        // tree trunks / rocks
        for (const c of this.world.cylinders) {
          if (c.r < 0.2) continue;
          const dx = b.pos.x - c.x;
          const dz = b.pos.z - c.z;
          const d = Math.hypot(dx, dz);
          if (d < c.r + 0.06 && b.pos.y < 11) {
            const n = new THREE.Vector3(dx / (d || 1), 0, dz / (d || 1));
            const hit = new THREE.Vector3(c.x + n.x * c.r, b.pos.y, c.z + n.z * c.r);
            this.addDecal(hit, n, b.color);
            this.addBurst(hit, n, b.color);
            this.sfx.splat();
            dead = true;
            break;
          }
        }
      }
      if (!dead) {
        // trash cans ping off
        for (const c of this.cans) {
          if (c.held) continue;
          const dx = b.pos.x - c.pos.x;
          const dz = b.pos.z - c.pos.z;
          if (dx * dx + dz * dz < 0.11 && b.pos.y > c.pos.y && b.pos.y < c.pos.y + 0.75) {
            this.addBurst(b.pos, new THREE.Vector3(dx, 0.4, dz).normalize(), b.color);
            this.sfx.clang();
            dead = true;
            break;
          }
        }
      }
      if (dead) {
        this.scene.remove(b.mesh);
        this.balls.splice(i, 1);
      }
    }
  }

  private updateCans(dt: number) {
    for (const c of this.cans) {
      c.graceT -= dt;
      if (c.held) {
        const h = c.held;
        c.pos.set(h.pos.x, h.pos.y + 1.95, h.pos.z);
        c.group.position.copy(c.pos);
        c.group.rotation.set(0, h.yaw, 0);
        if (!h.alive) c.held = null;
        continue;
      }
      const speed = c.vel.length();
      if (speed > 0.01 || c.pos.y > this.world.floorHeightAt(c.pos.x, c.pos.z, c.pos.y) + 0.01) {
        c.vel.y -= GRAV * 0.9 * dt;
        c.pos.addScaledVector(c.vel, dt);
        // walls & cylinders bounce
        const [rx, rz] = this.resolveXZ(c.pos.x, c.pos.z, c.pos.y, 0.28, c.pos.y + 0.7);
        if (rx !== c.pos.x || rz !== c.pos.z) {
          const nx = rx - c.pos.x;
          const nz = rz - c.pos.z;
          const nl = Math.hypot(nx, nz) || 1;
          const dot = (c.vel.x * nx + c.vel.z * nz) / nl;
          if (dot < 0) {
            c.vel.x -= 1.5 * dot * (nx / nl);
            c.vel.z -= 1.5 * dot * (nz / nl);
            if (speed > 2) this.sfx.clang();
          }
          c.pos.x = rx;
          c.pos.z = rz;
        }
        const fh = this.world.floorHeightAt(c.pos.x, c.pos.z, c.pos.y);
        if (c.pos.y < fh) {
          c.pos.y = fh;
          if (c.vel.y < -1.5) this.sfx.clang();
          c.vel.y = c.vel.y < -2 ? -c.vel.y * 0.32 : 0;
          c.vel.x *= 0.72;
          c.vel.z *= 0.72;
        }
        if (c.vel.lengthSq() < 0.04 && c.pos.y <= fh + 0.01) c.vel.set(0, 0, 0);
        // spin while airborne, settle upright on the ground
        if (c.pos.y > fh + 0.05) {
          c.group.rotation.x += c.spin * dt;
        } else {
          c.group.rotation.x *= Math.pow(0.001, dt);
          c.group.rotation.z *= Math.pow(0.001, dt);
        }
        c.group.position.copy(c.pos);
        // crush check
        if (speed > 5.5) {
          for (const f of this.fighters) {
            if (!f.alive) continue;
            if (f === c.thrower && c.graceT > 0) continue;
            const dx = c.pos.x - f.pos.x;
            const dz = c.pos.z - f.pos.z;
            if (dx * dx + dz * dz < 0.6 * 0.6 && c.pos.y > f.pos.y - 0.3 && c.pos.y < f.pos.y + 1.9) {
              const attacker = c.thrower ?? f;
              if (attacker.team !== f.team || attacker === f) {
                this.damage(f, attacker, CAN_DMG, c.pos.clone().setY(f.pos.y + 1.2), true);
                this.addBurst(c.pos, new THREE.Vector3(0, 1, 0), this.paintColor(attacker.team));
                this.shake = Math.max(this.shake, 0.35);
                c.vel.multiplyScalar(-0.25);
                this.sfx.clang();
              }
            }
          }
        }
      }
    }
  }

  private updateFx(dt: number) {
    for (let i = this.bursts.length - 1; i >= 0; i--) {
      const b = this.bursts[i];
      b.life -= dt;
      const attr = b.points.geometry.getAttribute("position") as THREE.BufferAttribute;
      for (let j = 0; j < b.vels.length; j++) {
        b.vels[j].y -= 14 * dt;
        attr.setXYZ(
          j,
          attr.getX(j) + b.vels[j].x * dt,
          attr.getY(j) + b.vels[j].y * dt,
          attr.getZ(j) + b.vels[j].z * dt
        );
      }
      attr.needsUpdate = true;
      (b.points.material as THREE.PointsMaterial).opacity = Math.max(0, b.life * 2);
      if (b.life <= 0) {
        this.scene.remove(b.points);
        b.points.geometry.dispose();
        (b.points.material as THREE.Material).dispose();
        this.bursts.splice(i, 1);
      }
    }
    for (let i = this.decals.length - 1; i >= 0; i--) {
      const d = this.decals[i];
      d.life -= dt;
      if (d.life < 3) (d.mesh.material as THREE.MeshBasicMaterial).opacity = d.life / 3;
      if (d.life <= 0) {
        this.scene.remove(d.mesh);
        d.mesh.geometry.dispose();
        (d.mesh.material as THREE.Material).dispose();
        this.decals.splice(i, 1);
      }
    }
    this.world.motes.rotation.y += dt * 0.01;
    const t = performance.now() * 0.001;
    for (let i = 0; i < this.world.fronds.length; i++) {
      const f = this.world.fronds[i];
      f.rotation.z = Math.sin(t * 0.8 + i * 1.7) * 0.05;
    }
  }

  private updateCamera(dt: number) {
    const p = this.player;
    const eye = new THREE.Vector3(p.pos.x, p.pos.y + 1.5, p.pos.z);
    const dir = new THREE.Vector3(
      Math.cos(p.pitch) * Math.sin(p.yaw),
      Math.sin(p.pitch),
      Math.cos(p.pitch) * Math.cos(p.yaw)
    );
    const right = new THREE.Vector3(-Math.cos(p.yaw), 0, Math.sin(p.yaw));
    const wanted = eye.clone().addScaledVector(dir, -3.4).addScaledVector(right, 0.55).add(new THREE.Vector3(0, 0.32, 0));
    // keep camera above ground
    const camFloor = this.world.floorHeightAt(wanted.x, wanted.z, wanted.y) + 0.25;
    if (wanted.y < camFloor) wanted.y = camFloor;
    this.camera.position.lerp(wanted, 1 - Math.pow(0.0001, dt));
    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - dt * 1.4);
      this.camera.position.x += (Math.random() - 0.5) * this.shake * 0.25;
      this.camera.position.y += (Math.random() - 0.5) * this.shake * 0.25;
    }
    const lookAt = eye.clone().addScaledVector(dir, 10);
    this.camera.lookAt(lookAt);
  }

  private pushHud() {
    const p = this.player;
    this.cb.onHud({
      hp: Math.max(0, Math.round(p.hp)),
      red: this.score.red,
      blue: this.score.blue,
      time: Math.max(0, Math.ceil(this.timeLeft)),
      prompt: this.prompt,
      carrying: this.cans.some((c) => c.held === p),
      dead: !p.alive,
      respawnIn: p.alive ? 0 : Math.max(0, RESPAWN_T - p.deadT),
      onRoof: p.pos.y > CAGE_H - 0.6 && Math.abs(p.pos.x) < CAGE_HALF + 0.5 && Math.abs(p.pos.z) < CAGE_HALF + 0.5,
    });
  }

  private loop = () => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.loop);
    const dt = Math.min(this.clock.getDelta(), 0.05);
    if (this.running) {
      this.timeLeft -= dt;
      if (this.timeLeft <= 0) this.endGame();
      this.updatePlayer(dt);
      for (const f of this.fighters) {
        if (!f.isPlayer && f.alive) {
          this.botThink(f, dt);
          this.botMove(f, dt);
        }
        this.updateFighterVisual(f, dt);
      }
      this.updateBalls(dt);
      this.updateCans(dt);
      this.updateFx(dt);
      this.updateCamera(dt);
      this.hudT -= dt;
      if (this.hudT <= 0) {
        this.hudT = 0.1;
        this.pushHud();
      }
    }
    this.renderer.render(this.scene, this.camera);
  };
}
