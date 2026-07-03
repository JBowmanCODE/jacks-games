import * as THREE from "three";
import { createHumanoid, poseHumanoid, addBodyPaint, clearBodyPaint, Humanoid, HumanoidOptions } from "./humanoid";
import { buildWorld, createTrashCan, WorldData, MAT_Y, APRON_HALF, CAGE_HALF, CAGE_H, ARENA } from "./world";
import { splatTexture, glowTexture, emojiTexture, soccerTexture } from "./textures";

// ---------- tuning ----------
const PLAYER_R = 0.32;
const BODY_H = 1.75;
const GRAV = 21;
const JUMP_V = 7.6;
const WALK = 4.3;
const SPRINT = 6.6;
const BOT_SPEED = 3.7;
const CLIMB_SPEED = 2.4;
const CAN_DMG = 100;
const RESPAWN_T = 3.5;
const MATCH_TIME = 600; // 10-minute matches; most splats when time runs out wins
const STEP_UP = 0.55;
const NADE_CD = 60;

const RED = 0xd93434;
const BLUE = 0x2f6fd9;
const PAINT_RED = [0xff2255, 0xff5533, 0xff3388];
const PAINT_BLUE = [0x22aaff, 0x3355ff, 0x00ddcc];

interface RosterEntry {
  name: string;
  num: string;
  opts?: HumanoidOptions;
  baseScale?: number;
}

const RED_ROSTER: RosterEntry[] = [
  { name: "Jack", num: "4", opts: { hair: "#a97c50" } },
  { name: "Emma", num: "7", opts: { hair: "#b5762f", hairStyle: "bob" } },
  { name: "Mama", num: "1", opts: { hair: "#141216", hairStyle: "ponytail" } },
  { name: "Papa", num: "9", opts: { hair: "#c5c8ca" } },
  { name: "Lil Fella", num: "0", opts: { hair: "#6e4a22", face: "cute", headScale: 1.32 }, baseScale: 0.72 },
];
const BLUE_ROSTER: RosterEntry[] = [
  { name: "Jimmy the Fish", num: "11" },
  { name: "Timmy 2 Toes", num: "2" },
  { name: "Big Dave", num: "99", baseScale: 1.12 },
  { name: "Angry Pete", num: "8", opts: { face: "angry" } },
  { name: "Silly Sam", num: "5", opts: { face: "silly" } },
];

const PRAISE = [
  "Nice Going!",
  "You hit that!",
  "Boom, he's gone!",
  "What a shot!",
  "SPLAT-TASTIC!",
  "Painted 'em!",
  "Bullseye!",
  "Splat attack!",
  "Unstoppable!",
  "Paint master!",
];
const PRAISE_BIG = [
  "BOOM! He's GONE!",
  "MEGA SPLAT!",
  "Total wipeout!",
  "KABOOM!!!",
  "That's gotta hurt!",
  "Now THAT'S paint!",
];

type DamageCause = "ball" | "can" | "bomb" | "spear";

const BOMB_RESPAWN = 120;
const BOMB_RADIUS = 6;
const RING_CAMP_LIMIT = 20; // seconds in the ring before the Enforcer comes
const ROPE_LINE = 2.9; // rope bounce boundary on the mat

// ---------- weapons ----------
export interface WeaponDef {
  key: string;
  name: string;
  icon: string;
  interval: number;
  speed: number;
  dmg: number;
  pellets: number;
  spread: number;
  ballR: number;
  grav: number;
  explosive?: number; // blast radius
  bounces?: number;
  homing?: boolean;
  rainbow?: boolean;
}

// Kid-friendly damage: the starter marker takes 10 hits to splat someone,
// and every upgrade is scaled around that.
const STARTER: WeaponDef = {
  key: "marker", name: "Splat Marker", icon: "🔫",
  interval: 0.16, speed: 42, dmg: 10, pellets: 1, spread: 0.012, ballR: 0.07, grav: 8,
};

const WEAPONS: WeaponDef[] = [
  { key: "smg", name: "Rapid Marker", icon: "💨", interval: 0.07, speed: 46, dmg: 5, pellets: 1, spread: 0.035, ballR: 0.06, grav: 8 },
  { key: "shotgun", name: "Double-Barrel Splatter", icon: "🎇", interval: 0.8, speed: 38, dmg: 6, pellets: 6, spread: 0.09, ballR: 0.06, grav: 9 },
  { key: "sniper", name: "Sniper Splat", icon: "🎯", interval: 0.95, speed: 75, dmg: 34, pellets: 1, spread: 0.002, ballR: 0.07, grav: 3 },
  { key: "minigun", name: "Paint Minigun", icon: "🌀", interval: 0.045, speed: 44, dmg: 4, pellets: 1, spread: 0.05, ballR: 0.055, grav: 8 },
  { key: "burst", name: "Triple Threat", icon: "🔱", interval: 0.34, speed: 44, dmg: 8, pellets: 3, spread: 0.02, ballR: 0.065, grav: 8 },
  { key: "bazooka", name: "Paint Bazooka", icon: "🚀", interval: 1.15, speed: 27, dmg: 25, pellets: 1, spread: 0.01, ballR: 0.16, grav: 13, explosive: 3.4 },
  { key: "bouncer", name: "Bouncy Blaster", icon: "🏀", interval: 0.3, speed: 36, dmg: 9, pellets: 1, spread: 0.02, ballR: 0.08, grav: 11, bounces: 2 },
  { key: "hornet", name: "Homing Hornet", icon: "🐝", interval: 0.42, speed: 32, dmg: 8, pellets: 1, spread: 0.02, ballR: 0.08, grav: 2, homing: true },
  { key: "rainbow", name: "Rainbow Repeater", icon: "🌈", interval: 0.09, speed: 46, dmg: 6, pellets: 1, spread: 0.025, ballR: 0.065, grav: 8, rainbow: true },
  { key: "goo", name: "Golden Goo Cannon", icon: "⭐", interval: 0.5, speed: 50, dmg: 15, pellets: 1, spread: 0.008, ballR: 0.1, grav: 6 },
];

// ---------- skills ----------
type SkillKey = "speed" | "big" | "small" | "invincible" | "jump" | "rapid" | "shield" | "arepa";

interface SkillDef {
  key: SkillKey;
  name: string;
  icon: string;
  dur: number; // seconds (0 = instant)
}

const SKILLS: SkillDef[] = [
  { key: "speed", name: "Speed Boost", icon: "⚡", dur: 30 },
  { key: "big", name: "GIANT Mode", icon: "🦍", dur: 30 },
  { key: "small", name: "Tiny Mode", icon: "🐭", dur: 30 },
  { key: "invincible", name: "Invincibility", icon: "🌟", dur: 10 },
  { key: "jump", name: "Moon Boots", icon: "🐰", dur: 30 },
  { key: "rapid", name: "Rapid Fire", icon: "🔥", dur: 20 },
  { key: "shield", name: "Paint Shield", icon: "🛡️", dur: 0 },
  { key: "arepa", name: "Colombian Arepa", icon: "🫓", dur: 0 },
  { key: "arepa", name: "Colombian Arepa", icon: "🫓", dur: 0 }, // twice in the pool — arepas are common!
];

export interface HudState {
  hp: number;
  shield: number;
  red: number;
  blue: number;
  time: number;
  prompt: string;
  carrying: boolean;
  carryingBomb: boolean;
  dead: boolean;
  respawnIn: number;
  onRoof: boolean;
  weapon: string;
  weaponIcon: string;
  gPaint: number; // seconds until ready, 0 = ready
  gSmoke: number;
  fx: { icon: string; name: string; sec: number }[];
  takedowns: number; // opponents you've splatted
  livesUsed: number; // times you've been splatted
}

export interface EngineCallbacks {
  onHud(h: HudState): void;
  onKill(line: string, isCan: boolean): void;
  onGameOver(winner: "red" | "blue" | "draw", red: number, blue: number): void;
  onDamage(): void;
  onPraise(text: string): void;
  onSpear(victim: string): void;
}

interface HpBar {
  sprite: THREE.Sprite;
  tex: THREE.CanvasTexture;
  ctx: CanvasRenderingContext2D;
  lastHp: number;
  lastShield: number;
}

interface Fighter {
  rig: Humanoid;
  hpBar: HpBar;
  team: 0 | 1;
  name: string;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  yaw: number;
  pitch: number;
  hp: number;
  shield: number;
  alive: boolean;
  deadT: number;
  walkPhase: number;
  speed01: number;
  isPlayer: boolean;
  climbing: boolean;
  grounded: boolean;
  fireCd: number;
  aiming: boolean;
  weapon: WeaponDef;
  fx: Map<SkillKey, number>;
  scaleCur: number;
  baseScale: number;
  glow: THREE.Mesh | null;
  kb: THREE.Vector3; // knockback impulse (rope bounces, spears)
  ringT: number; // time spent camping in the ring
  crouchK: number; // 0..1 crouch blend
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
  dmg: number;
  grav: number;
  explosive?: number;
  bounces: number;
  homing: boolean;
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

interface Decal { mesh: THREE.Mesh; life: number }
interface Burst { points: THREE.Points; vels: THREE.Vector3[]; life: number }
interface Flash { sprite: THREE.Sprite; life: number }

interface Nade {
  kind: "paint" | "smoke";
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  mesh: THREE.Mesh;
  fuse: number;
  owner: Fighter;
}

interface Smoke {
  group: THREE.Group;
  pos: THREE.Vector3;
  life: number;
  maxLife: number;
  radius: number;
}

interface CatState {
  group: THREE.Group;
  tag: THREE.Sprite;
  pos: THREE.Vector3;
  held: boolean;
  wander: THREE.Vector3 | null;
  thinkT: number;
  meowCd: number;
  walkT: number;
}

interface Football {
  mesh: THREE.Mesh;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
}

interface WrestlerState {
  rig: Humanoid;
  hpBar: HpBar;
  hp: number;
  state: "runback" | "bounce" | "charge" | "slam" | "getup" | "taunt" | "guard";
  t: number;
  target: Fighter | null;
  pos: THREE.Vector3;
  dir: THREE.Vector3;
  dest: THREE.Vector3;
  walkPhase: number;
  hit: boolean;
  guardT: number;
}

const WRESTLER_HP = 500;
const WRESTLER_BONUS = 3;

interface BombState {
  group: THREE.Group;
  icon: THREE.Sprite;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  state: "idle" | "held" | "flying" | "gone";
  holder: Fighter | null;
  thrower: Fighter | null;
  respawnT: number;
  bobT: number;
  fuse: number;
}

interface Pickup {
  kind: "weapon" | "skill";
  weapon?: WeaponDef;
  skill?: SkillDef;
  group: THREE.Group;
  icon: THREE.Sprite;
  pos: THREE.Vector3;
  active: boolean;
  respawnT: number;
  bobT: number;
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
    const buf = ctx.createBuffer(1, Math.max(1, Math.floor(ctx.sampleRate * dur)), ctx.sampleRate);
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
    o.frequency.setValueAtTime(560, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(170, ctx.currentTime + 0.09);
    o.connect(this.env(0.18, 0.09));
    o.start();
    o.stop(ctx.currentTime + 0.1);
    const n = this.noise(0.05);
    const f = ctx.createBiquadFilter();
    f.type = "highpass";
    f.frequency.value = 2000;
    n.connect(f);
    f.connect(this.env(0.06, 0.05));
    n.start();
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
  boom() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(160, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(35, ctx.currentTime + 0.5);
    o.connect(this.env(0.4, 0.5));
    o.start();
    o.stop(ctx.currentTime + 0.55);
    const n = this.noise(0.4);
    const f = ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = 500;
    n.connect(f);
    f.connect(this.env(0.3, 0.4));
    n.start();
  }
  hiss() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const n = this.noise(0.8);
    const f = ctx.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.value = 3500;
    n.connect(f);
    f.connect(this.env(0.12, 0.8));
    n.start();
  }
  meow() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.type = "sawtooth";
    o.frequency.setValueAtTime(620, ctx.currentTime);
    o.frequency.linearRampToValueAtTime(880, ctx.currentTime + 0.12);
    o.frequency.exponentialRampToValueAtTime(430, ctx.currentTime + 0.35);
    const f = ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = 1800;
    o.connect(f);
    f.connect(this.env(0.12, 0.35));
    o.start();
    o.stop(ctx.currentTime + 0.4);
  }
  boing() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(140, ctx.currentTime);
    o.frequency.linearRampToValueAtTime(420, ctx.currentTime + 0.16);
    o.connect(this.env(0.2, 0.2));
    o.start();
    o.stop(ctx.currentTime + 0.22);
  }
  kick() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const n = this.noise(0.08);
    const f = ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = 350;
    n.connect(f);
    f.connect(this.env(0.3, 0.08));
    n.start();
  }
  pickup() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    [440, 660, 880].forEach((fq, i) => {
      const o = ctx.createOscillator();
      o.type = "triangle";
      o.frequency.value = fq;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, ctx.currentTime + i * 0.06);
      g.gain.linearRampToValueAtTime(0.12, ctx.currentTime + i * 0.06 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.06 + 0.18);
      o.connect(g);
      g.connect(ctx.destination);
      o.start(ctx.currentTime + i * 0.06);
      o.stop(ctx.currentTime + i * 0.06 + 0.2);
    });
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
  private flashes: Flash[] = [];
  private nades: Nade[] = [];
  private smokes: Smoke[] = [];
  private pickups: Pickup[] = [];
  private bomb!: BombState;
  private bombHome = new THREE.Vector3(0, CAGE_H + 0.04, 0);
  private bubble: { sprite: THREE.Sprite; t: number } | null = null;
  private cat!: CatState;
  private footballs: Football[] = [];
  private wrestler: WrestlerState | null = null;

  private keys = new Set<string>();
  private mouseDown = false;
  private raf = 0;
  private clock = new THREE.Clock();
  private running = false;
  private over = false;
  private timeLeft = MATCH_TIME;
  private score = { red: 0, blue: 0 };
  private nadeCd = { paint: 0, smoke: 0 };
  private takedowns = 0;
  private livesUsed = 0;
  private hudT = 0;
  private shake = 0;
  private prompt = "";
  private splatTex = splatTexture();
  private glowTex = glowTexture();
  private ballGeo = new THREE.SphereGeometry(1, 10, 8); // unit sphere, scaled per ball
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
    this.spawnPickups();
    this.spawnBomb();
    this.spawnCat();
    this.spawnFootballs();
    this.bindInput();
    this.renderer.render(this.scene, this.camera);
  }

  // ================= setup =================
  private spawnTeams() {
    for (let i = 0; i < 5; i++) {
      this.fighters.push(this.makeFighter(0, RED_ROSTER[i], i, i === 0));
      this.fighters.push(this.makeFighter(1, BLUE_ROSTER[i], i, false));
    }
    this.player = this.fighters[0];
  }

  private spawnPoint(team: 0 | 1, idx: number): THREE.Vector3 {
    const x = team === 0 ? -46 : 46;
    return new THREE.Vector3(x + (team === 0 ? 1 : -1) * (idx % 2), 0, (idx - 2) * 2.2);
  }

  private makeHpBar(rig: Humanoid): HpBar {
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 12;
    const ctx = canvas.getContext("2d")!;
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false })
    );
    sprite.scale.set(0.95, 0.18, 1);
    sprite.position.y = 2.14;
    rig.group.add(sprite);
    const bar: HpBar = { sprite, tex, ctx, lastHp: -1, lastShield: -1 };
    this.drawHpBar(bar, 100, 0);
    return bar;
  }

  private drawHpBar(bar: HpBar, hp: number, shield: number) {
    const ctx = bar.ctx;
    ctx.clearRect(0, 0, 64, 12);
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.fillRect(0, 0, 64, 12);
    const w = (Math.max(0, hp) / 100) * 60;
    ctx.fillStyle = hp > 60 ? "rgba(74,222,128,0.85)" : hp > 30 ? "rgba(250,204,21,0.85)" : "rgba(239,68,68,0.9)";
    ctx.fillRect(2, 2, w, shield > 0 ? 5 : 8);
    if (shield > 0) {
      ctx.fillStyle = "rgba(56,189,248,0.9)";
      ctx.fillRect(2, 8, (Math.min(100, shield) / 100) * 60, 2);
    }
    bar.tex.needsUpdate = true;
    bar.lastHp = hp;
    bar.lastShield = shield;
  }

  private makeFighter(team: 0 | 1, entry: RosterEntry, idx: number, isPlayer: boolean): Fighter {
    const rig = createHumanoid(team === 0 ? RED : BLUE, idx + team * 17 + 3, {
      ...entry.opts,
      backName: entry.name.toUpperCase(),
      backNumber: entry.num,
    });
    this.scene.add(rig.group);
    const pos = this.spawnPoint(team, idx);
    rig.group.position.copy(pos);
    const yaw = team === 0 ? Math.PI / 2 : -Math.PI / 2;
    rig.group.rotation.y = yaw;
    const baseScale = entry.baseScale ?? 1;
    rig.group.scale.setScalar(baseScale);
    return {
      rig, hpBar: this.makeHpBar(rig), team, name: entry.name,
      pos, vel: new THREE.Vector3(),
      yaw, pitch: 0, hp: 100, shield: 0, alive: true, deadT: 0,
      walkPhase: 0, speed01: 0, isPlayer,
      climbing: false, grounded: true, fireCd: 0, aiming: isPlayer,
      weapon: STARTER, fx: new Map(), scaleCur: baseScale, baseScale, glow: null,
      kb: new THREE.Vector3(), ringT: 0, crouchK: 0,
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

  private pickupSpots(): { kind: "weapon" | "skill"; pos: THREE.Vector3 }[] {
    const w = (x: number, y: number, z: number) => ({ kind: "weapon" as const, pos: new THREE.Vector3(x, y, z) });
    const s = (x: number, y: number, z: number) => ({ kind: "skill" as const, pos: new THREE.Vector3(x, y, z) });
    return [
      // weapons: ring centre, cage roof, clearing ring, mid-jungle, near bases
      w(0, MAT_Y, 0),
      w(2.4, CAGE_H + 0.04, -2.4),
      w(10, 0, 10), w(-10, 0, -10), w(-12, 0, 12), w(12, 0, -12),
      w(24, 0, 4), w(-24, 0, -4),
      w(38, 0, 14), w(-38, 0, -14),
      // skills
      s(0, 0, 16), s(0, 0, -16), s(18, 0, 18), s(-18, 0, -18),
      s(30, 0, -22), s(-30, 0, 22), s(-1.8, CAGE_H + 0.04, 1.8),
    ];
  }

  private spawnPickups() {
    for (const spot of this.pickupSpots()) {
      const group = new THREE.Group();
      const icon = new THREE.Sprite(new THREE.SpriteMaterial({ map: null, transparent: true, depthWrite: false }));
      icon.scale.set(0.85, 0.85, 1);
      icon.position.y = 1.15;
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glowTex, transparent: true, depthWrite: false, opacity: 0.8 }));
      glow.scale.set(1.7, 1.7, 1);
      glow.position.y = 0.55;
      group.add(glow);
      const base = new THREE.Mesh(
        new THREE.CylinderGeometry(0.42, 0.5, 0.12, 12),
        new THREE.MeshStandardMaterial({ color: 0x222831, roughness: 0.4, metalness: 0.6 })
      );
      base.position.y = 0.06;
      group.add(base);
      group.add(icon);
      group.position.copy(spot.pos);
      this.scene.add(group);
      const p: Pickup = {
        kind: spot.kind,
        group, icon, pos: spot.pos.clone(),
        active: false, respawnT: 0.01, bobT: Math.random() * 6,
      };
      this.pickups.push(p);
    }
  }

  /** Black-and-white cat with a black tail, based on the boss's real cat. */
  private spawnCat() {
    const group = new THREE.Group();
    const white = new THREE.MeshStandardMaterial({ color: 0xf4f2ee, roughness: 0.9 });
    const black = new THREE.MeshStandardMaterial({ color: 0x17181a, roughness: 0.95 });
    // body (horizontal capsule)
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.26, 4, 8), white);
    body.rotation.z = Math.PI / 2;
    body.position.set(0, 0.19, 0);
    body.castShadow = true;
    group.add(body);
    // big black patch on the back like the photo
    const patch = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), black);
    patch.scale.set(1.5, 0.7, 1.05);
    patch.position.set(0.02, 0.27, 0);
    group.add(patch);
    const patch2 = new THREE.Mesh(new THREE.SphereGeometry(0.06, 7, 5), black);
    patch2.scale.set(1.2, 0.8, 1);
    patch2.position.set(-0.05, 0.14, 0.07);
    group.add(patch2);
    // head + black ear patch
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.095, 10, 8), white);
    head.position.set(0.24, 0.27, 0);
    head.castShadow = true;
    group.add(head);
    const headPatch = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), black);
    headPatch.scale.set(0.9, 0.7, 0.9);
    headPatch.position.set(0.22, 0.33, 0.04);
    group.add(headPatch);
    for (const s of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.07, 4), s === 1 ? black : white);
      ear.position.set(0.24, 0.37, 0.05 * s);
      group.add(ear);
    }
    // eyes + pink nose
    for (const s of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.014, 6, 5), new THREE.MeshBasicMaterial({ color: 0x2a4d2a }));
      eye.position.set(0.325, 0.29, 0.038 * s);
      group.add(eye);
    }
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 5), new THREE.MeshBasicMaterial({ color: 0xd98a94 }));
    nose.position.set(0.34, 0.26, 0);
    group.add(nose);
    // black tail curving up
    for (let i = 0; i < 3; i++) {
      const seg = new THREE.Mesh(new THREE.CapsuleGeometry(0.024 - i * 0.004, 0.09, 3, 6), black);
      seg.position.set(-0.24 - i * 0.035, 0.24 + i * 0.085, 0);
      seg.rotation.z = 0.5 - i * 0.25;
      group.add(seg);
    }
    // legs
    for (const [lx, lz] of [[0.14, 0.06], [0.14, -0.06], [-0.12, 0.06], [-0.12, -0.06]] as [number, number][]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.14, 6), white);
      leg.position.set(lx, 0.07, lz);
      leg.castShadow = true;
      group.add(leg);
    }
    // floating tag so the cat is easy to spot in the jungle
    const tag = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: emojiTexture("🐈"), transparent: true, depthWrite: false, opacity: 0.9 })
    );
    tag.scale.set(0.5, 0.5, 1);
    tag.position.y = 0.95;
    group.add(tag);
    group.position.set(8, 0, -7);
    this.scene.add(group);
    this.cat = { group, tag, pos: new THREE.Vector3(8, 0, -7), held: false, wander: null, thinkT: 1, meowCd: 5, walkT: 0 };
  }

  private spawnFootballs() {
    const tex = soccerTexture();
    const spots = [
      new THREE.Vector3(6, 0, 8),
      new THREE.Vector3(-8, 0, -9),
      new THREE.Vector3(14, 0, -3),
      new THREE.Vector3(0, MAT_Y, 1.5),
    ];
    for (const p of spots) {
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.16, 14, 12),
        new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 })
      );
      mesh.position.copy(p).setY(p.y + 0.16);
      mesh.castShadow = true;
      this.scene.add(mesh);
      this.footballs.push({ mesh, pos: p.clone(), vel: new THREE.Vector3() });
    }
  }

  // ================= the Enforcer =================
  private ropesPointAwayFrom(target: Fighter): THREE.Vector3 {
    const away = new THREE.Vector3(target.pos.x, 0, target.pos.z);
    if (away.lengthSq() < 0.01) away.set(1, 0, 0);
    away.normalize();
    return new THREE.Vector3(-away.x * (ROPE_LINE - 0.3), MAT_Y, -away.z * (ROPE_LINE - 0.3));
  }

  private summonWrestler(target: Fighter) {
    const rig = createHumanoid(0xc98858, 77, { hair: "#181818", backName: "ENFORCER", backNumber: "1" });
    rig.group.scale.set(1.5, 1.2, 1.5); // big and muscley
    this.scene.add(rig.group);
    const pos = this.ropesPointAwayFrom(target);
    rig.group.position.copy(pos);
    this.addBurst(pos.clone().setY(MAT_Y + 1.5), new THREE.Vector3(0, 1, 0), 0xffffff);
    const hpBar = this.makeHpBar(rig);
    // undo his 1.5x body scale so the bar stays a normal size
    hpBar.sprite.scale.set(0.95 / 1.5, 0.18 / 1.2, 1);
    hpBar.sprite.position.y = 2.3;
    this.drawHpBar(hpBar, 100, 0);
    this.wrestler = {
      rig, hpBar, hp: WRESTLER_HP,
      state: "bounce", t: 0.6, target, pos,
      dir: new THREE.Vector3(), dest: new THREE.Vector3(),
      walkPhase: 0, hit: false, guardT: 0,
    };
    this.sfx.boing();
    this.cb.onKill(`💪 THE ENFORCER is coming for ${target.name}!`, true);
  }

  /** Enforcer is already guarding the ring — send him at a new camper. */
  private commandSpear(target: Fighter) {
    const w = this.wrestler!;
    w.target = target;
    w.hit = false;
    w.dest.copy(this.ropesPointAwayFrom(target));
    w.state = "runback";
    this.cb.onKill(`💪 THE ENFORCER has spotted ${target.name} camping!`, true);
  }

  private hurtWrestler(dmg: number, attacker: Fighter, hitWorld: THREE.Vector3, color: number) {
    const w = this.wrestler;
    if (!w) return;
    w.hp -= dmg;
    addBodyPaint(w.rig, color, w.rig.torso.worldToLocal(hitWorld.clone()));
    this.drawHpBar(w.hpBar, Math.max(0, Math.round((w.hp / WRESTLER_HP) * 100)), 0);
    if (w.hp <= 0) {
      // bonus points for taking out the big man
      if (attacker.team === 0) this.score.red += WRESTLER_BONUS;
      else this.score.blue += WRESTLER_BONUS;
      this.cb.onKill(`🏆 ${attacker.name} took out THE ENFORCER! +${WRESTLER_BONUS} team points!`, true);
      if (attacker.isPlayer) {
        this.takedowns++;
        this.cb.onPraise("ENFORCER DOWN!!!");
      }
      for (let i = 0; i < 3; i++) {
        this.addBurst(w.pos.clone().setY(MAT_Y + 1 + i * 0.5), new THREE.Vector3(0, 1, 0), [0xffffff, 0xffcc22, 0xff4422][i]);
      }
      this.sfx.jingle(attacker.team === 0);
      this.scene.remove(w.rig.group);
      this.wrestler = null;
    }
  }

  private updateWrestler(dt: number) {
    const w = this.wrestler;
    if (!w) return;
    w.t -= dt;
    w.pos.y = MAT_Y;
    const clampInRing = () => {
      w.pos.x = THREE.MathUtils.clamp(w.pos.x, -CAGE_HALF + 0.5, CAGE_HALF - 0.5);
      w.pos.z = THREE.MathUtils.clamp(w.pos.z, -CAGE_HALF + 0.5, CAGE_HALF - 0.5);
    };

    if (w.state === "runback" && w.target) {
      const dx = w.dest.x - w.pos.x;
      const dz = w.dest.z - w.pos.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.35) {
        w.state = "bounce";
        w.t = 0.6;
      } else {
        w.pos.x += (dx / d) * 6.5 * dt;
        w.pos.z += (dz / d) * 6.5 * dt;
        w.walkPhase += 6.5 * dt * 2.4;
        w.rig.group.rotation.y = Math.atan2(dx, dz);
        poseHumanoid(w.rig, w.walkPhase, 0.8, 0, false);
      }
    } else if (w.state === "bounce" && w.target) {
      // hitting the ropes, winding up
      w.rig.group.rotation.y = Math.atan2(w.target.pos.x - w.pos.x, w.target.pos.z - w.pos.z);
      poseHumanoid(w.rig, 0, 0, 0, false, false, 0.45 + Math.sin(w.t * 22) * 0.1);
      if (w.t <= 0) {
        w.state = "charge";
        w.dir.set(w.target.pos.x - w.pos.x, 0, w.target.pos.z - w.pos.z).normalize();
        w.t = 1.2;
        this.sfx.whoosh();
      }
    } else if (w.state === "charge") {
      w.pos.addScaledVector(w.dir, 14 * dt);
      w.walkPhase += 14 * dt * 2.4;
      w.rig.group.rotation.y = Math.atan2(w.dir.x, w.dir.z);
      poseHumanoid(w.rig, w.walkPhase, 1, 0, false, false, 0.3);
      // football-tackle form: shoulder dropped, arms swept back
      w.rig.torso.rotation.x = 0.55;
      w.rig.shoulderL.rotation.set(0.9, 0, 0.5);
      w.rig.shoulderR.rotation.set(0.9, 0, -0.5);
      w.rig.head.rotation.x = -0.35;
      const t = w.target;
      if (!w.hit && t && t.alive) {
        const d = Math.hypot(t.pos.x - w.pos.x, t.pos.z - w.pos.z);
        if (d < 1.05) {
          w.hit = true;
          t.kb.set(w.dir.x * 13, 0, w.dir.z * 13);
          t.vel.y = 4.5;
          this.damage(t, t, 55, new THREE.Vector3(t.pos.x, t.pos.y + 1.1, t.pos.z), "spear");
          this.cb.onSpear(t.name);
          this.shake = Math.max(this.shake, 0.85);
          this.sfx.boom();
          this.sfx.hurt();
          // dive follow-through
          w.state = "slam";
          w.t = 0.5;
        }
      }
      if (w.state === "charge" && (w.t <= 0 || Math.abs(w.pos.x) > CAGE_HALF - 0.5 || Math.abs(w.pos.z) > CAGE_HALF - 0.5)) {
        clampInRing();
        w.state = "taunt";
        w.t = 1.2;
      }
    } else if (w.state === "slam") {
      // crashing down through the tackle, sliding on the mat
      const k = 1 - Math.max(0, w.t) / 0.5;
      w.rig.group.rotation.x = -1.3 * k;
      w.pos.addScaledVector(w.dir, (1 - k) * 6 * dt);
      clampInRing();
      if (w.t <= 0) {
        w.state = "getup";
        w.t = 0.6;
      }
    } else if (w.state === "getup") {
      w.rig.group.rotation.x = -1.3 * (Math.max(0, w.t) / 0.6);
      if (w.t <= 0) {
        w.rig.group.rotation.x = 0;
        w.state = "taunt";
        w.t = 1.2;
      }
    } else if (w.state === "taunt") {
      // flexing to the crowd
      poseHumanoid(w.rig, w.t * 6, 0, 0, false, true);
      if (w.t <= 0) {
        w.state = "guard";
        w.target = null;
      }
    } else if (w.state === "guard") {
      // prowling the ring, daring anyone to stay
      w.guardT += dt;
      const gx = Math.cos(w.guardT * 0.55) * 1.7;
      const gz = Math.sin(w.guardT * 0.55) * 1.7;
      const dx = gx - w.pos.x;
      const dz = gz - w.pos.z;
      const d = Math.hypot(dx, dz);
      if (d > 0.1) {
        w.pos.x += (dx / d) * Math.min(2.2 * dt, d);
        w.pos.z += (dz / d) * Math.min(2.2 * dt, d);
        w.walkPhase += 2.2 * dt * 2.4;
        w.rig.group.rotation.y = Math.atan2(dx, dz);
      }
      poseHumanoid(w.rig, w.walkPhase, 0.35, 0, false);
    }
    w.rig.group.position.copy(w.pos);
  }

  private updateRingCamping(dt: number) {
    for (const f of this.fighters) {
      const inRing =
        f.alive &&
        Math.abs(f.pos.x) < APRON_HALF - 0.1 &&
        Math.abs(f.pos.z) < APRON_HALF - 0.1 &&
        f.pos.y > 0.9 &&
        f.pos.y < CAGE_H - 1;
      if (inRing) {
        const before = f.ringT;
        f.ringT += dt;
        if (f.isPlayer && before < RING_CAMP_LIMIT - 5 && f.ringT >= RING_CAMP_LIMIT - 5) {
          this.cb.onKill("⚠️ Ring camper detected! Get out before the ENFORCER arrives!", true);
        }
        if (f.ringT >= RING_CAMP_LIMIT) {
          if (!this.wrestler) {
            f.ringT = -3; // grace after the spear
            this.summonWrestler(f);
          } else if (this.wrestler.state === "guard") {
            f.ringT = -3;
            this.commandSpear(f);
          }
        }
      } else {
        f.ringT = Math.max(0, f.ringT - dt * 2);
      }
    }
  }

  private spawnBomb() {
    const group = new THREE.Group();
    const shell = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 14, 12),
      new THREE.MeshStandardMaterial({ color: 0x14161a, roughness: 0.35, metalness: 0.7 })
    );
    shell.position.y = 0.3;
    shell.castShadow = true;
    group.add(shell);
    const fuseStub = new THREE.Mesh(
      new THREE.CylinderGeometry(0.035, 0.035, 0.16, 8),
      new THREE.MeshStandardMaterial({ color: 0x8a7a58, roughness: 0.9 })
    );
    fuseStub.position.y = 0.65;
    group.add(fuseStub);
    const spark = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: this.glowTex, color: 0xffa02e, transparent: true, depthWrite: false })
    );
    spark.scale.setScalar(0.35);
    spark.position.y = 0.78;
    group.add(spark);
    const icon = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: emojiTexture("💣"), transparent: true, depthWrite: false })
    );
    icon.scale.set(0.9, 0.9, 1);
    icon.position.y = 1.35;
    group.add(icon);
    group.position.copy(this.bombHome);
    this.scene.add(group);
    this.bomb = {
      group, icon,
      pos: this.bombHome.clone(),
      vel: new THREE.Vector3(),
      state: "idle", holder: null, thrower: null,
      respawnT: 0, bobT: 0, fuse: 0,
    };
  }

  private throwBomb() {
    const b = this.bomb;
    const p = this.player;
    b.state = "flying";
    b.holder = null;
    b.thrower = p;
    b.fuse = 4;
    b.pos.set(p.pos.x, p.pos.y + 1.7 * p.scaleCur, p.pos.z);
    const dir = this.cameraDir();
    b.vel.copy(dir).multiplyScalar(14).add(new THREE.Vector3(0, 4.8, 0));
    this.sfx.whoosh();
  }

  private detonateBomb(pos: THREE.Vector3) {
    const b = this.bomb;
    this.sfx.boom();
    this.sfx.boom();
    this.shake = Math.max(this.shake, 0.9);
    for (let i = 0; i < 10; i++) {
      const ang = Math.random() * Math.PI * 2;
      const d = Math.random() * BOMB_RADIUS * 0.75;
      const px = pos.x + Math.cos(ang) * d;
      const pz = pos.z + Math.sin(ang) * d;
      const fh = this.world.floorHeightAt(px, pz, pos.y);
      this.addDecal(new THREE.Vector3(px, fh, pz), new THREE.Vector3(0, 1, 0), this.paintColor(Math.random() < 0.5 ? 0 : 1));
    }
    for (let i = 0; i < 6; i++) {
      this.addBurst(
        pos,
        new THREE.Vector3((Math.random() - 0.5) * 2, 1, (Math.random() - 0.5) * 2).normalize(),
        [0xff8822, 0xffcc22, 0xff4422, 0xffffff][i % 4]
      );
    }
    // the BIG BOMB spares no one — both teams, even the thrower
    const thrower = b.thrower ?? this.player;
    for (const f of this.fighters) {
      if (!f.alive) continue;
      const d = Math.hypot(f.pos.x - pos.x, (f.pos.y + 1) - pos.y, f.pos.z - pos.z);
      if (d < BOMB_RADIUS) {
        this.damage(f, thrower, 999, new THREE.Vector3(f.pos.x, f.pos.y + 1.1, f.pos.z), "bomb");
      }
    }
    b.state = "gone";
    b.group.visible = false;
    b.respawnT = BOMB_RESPAWN;
  }

  private updateBomb(dt: number) {
    const b = this.bomb;
    if (b.state === "gone") {
      b.respawnT -= dt;
      if (b.respawnT <= 0) {
        b.state = "idle";
        b.pos.copy(this.bombHome);
        b.group.position.copy(b.pos);
        b.group.visible = true;
        this.cb.onKill("💣 The BIG BOMB is back on the cage roof!", true);
      }
      return;
    }
    if (b.state === "idle") {
      b.bobT += dt;
      b.icon.position.y = 1.35 + Math.sin(b.bobT * 2.4) * 0.12;
      b.group.rotation.y += dt;
      return;
    }
    if (b.state === "held") {
      const h = b.holder!;
      b.pos.set(h.pos.x, h.pos.y + 2.05 * h.scaleCur, h.pos.z);
      b.group.position.copy(b.pos);
      if (!h.alive) {
        // dropped where they fell — still armed and grabbable
        b.state = "idle";
        b.holder = null;
        b.pos.y = this.world.floorHeightAt(b.pos.x, b.pos.z, b.pos.y);
        b.group.position.copy(b.pos);
      }
      return;
    }
    // flying
    b.fuse -= dt;
    b.vel.y -= 18 * dt;
    b.pos.addScaledVector(b.vel, dt);
    const [rx, rz] = this.resolveXZ(b.pos.x, b.pos.z, b.pos.y, 0.3, b.pos.y + 0.6);
    b.pos.x = rx;
    b.pos.z = rz;
    b.group.position.copy(b.pos);
    b.group.rotation.x += dt * 7;
    const fh = this.world.floorHeightAt(b.pos.x, b.pos.z, b.pos.y);
    if (b.pos.y <= fh + 0.1 || b.fuse <= 0) {
      b.pos.y = Math.max(b.pos.y, fh);
      this.detonateBomb(b.pos);
    }
  }

  private rollPickup(p: Pickup) {
    const mat = p.icon.material as THREE.SpriteMaterial;
    mat.map?.dispose();
    if (p.kind === "weapon") {
      p.weapon = WEAPONS[Math.floor(Math.random() * WEAPONS.length)];
      mat.map = emojiTexture(p.weapon.icon);
    } else {
      p.skill = SKILLS[Math.floor(Math.random() * SKILLS.length)];
      mat.map = emojiTexture(p.skill.icon);
    }
    mat.needsUpdate = true;
    const glowMat = (p.group.children[0] as THREE.Sprite).material as THREE.SpriteMaterial;
    glowMat.color.set(p.kind === "weapon" ? 0xffc14d : 0x7de8ff);
    p.active = true;
    p.group.visible = true;
  }

  // ================= input =================
  private onKeyDown = (e: KeyboardEvent) => {
    if (["KeyW", "KeyA", "KeyS", "KeyD", "Space", "ShiftLeft", "ShiftRight", "KeyE", "KeyG", "KeyH", "KeyC"].includes(e.code))
      e.preventDefault();
    this.keys.add(e.code);
    if (e.repeat) return;
    if (e.code === "KeyE") this.interact();
    if (e.code === "KeyG") this.throwNade("paint");
    if (e.code === "KeyH") this.throwNade("smoke");
  };
  private onKeyUp = (e: KeyboardEvent) => this.keys.delete(e.code);
  private onMouseMove = (e: MouseEvent) => {
    if (!this.running || document.pointerLockElement !== this.renderer.domElement) return;
    this.player.yaw -= e.movementX * 0.0021;
    this.player.pitch = THREE.MathUtils.clamp(this.player.pitch - e.movementY * 0.0021, -1.25, 1.25);
  };
  private onMouseDown = (e: MouseEvent) => {
    if (e.button !== 0 || !this.running) return;
    if (this.bomb.state === "held" && this.bomb.holder === this.player) {
      this.throwBomb();
      return;
    }
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
    this.nadeCd = { paint: 0, smoke: 0 };
    this.takedowns = 0;
    this.livesUsed = 0;
    for (const f of this.fighters) {
      f.weapon = STARTER;
      f.fx.clear();
      f.shield = 0;
      this.respawn(f);
    }
    for (const d of this.decals) this.scene.remove(d.mesh);
    this.decals = [];
    for (const b of this.balls) this.scene.remove(b.mesh);
    this.balls = [];
    for (const n of this.nades) this.scene.remove(n.mesh);
    this.nades = [];
    for (const s of this.smokes) this.scene.remove(s.group);
    this.smokes = [];
    this.cans.forEach((c, i) => {
      c.held = null;
      c.vel.set(0, 0, 0);
      c.pos.copy(this.world.trashCanSpawns[i]);
      c.group.position.copy(c.pos);
      c.group.rotation.set(0, 0, 0);
    });
    for (const p of this.pickups) {
      p.active = false;
      p.group.visible = false;
      p.respawnT = 0.01;
    }
    this.bomb.state = "idle";
    this.bomb.holder = null;
    this.bomb.thrower = null;
    this.bomb.pos.copy(this.bombHome);
    this.bomb.group.position.copy(this.bomb.pos);
    this.bomb.group.rotation.set(0, 0, 0);
    this.bomb.group.visible = true;
    if (this.wrestler) {
      this.scene.remove(this.wrestler.rig.group);
      this.wrestler = null;
    }
    this.cat.held = false;
    this.cat.pos.set(8, 0, -7);
    this.cat.wander = null;
    this.footballs.forEach((fb, i) => {
      const spots = [
        new THREE.Vector3(6, 0, 8),
        new THREE.Vector3(-8, 0, -9),
        new THREE.Vector3(14, 0, -3),
        new THREE.Vector3(0, MAT_Y, 1.5),
      ];
      fb.pos.copy(spots[i]);
      fb.vel.set(0, 0, 0);
      fb.mesh.position.copy(fb.pos).setY(fb.pos.y + 0.16);
    });
  }

  /** Debug/testing hook: place the player somewhere specific. */
  teleportPlayer(x: number, z: number, yaw?: number) {
    const p = this.player;
    p.pos.set(x, this.world.floorHeightAt(x, z, 0), z);
    p.vel.set(0, 0, 0);
    if (yaw !== undefined) p.yaw = yaw;
  }

  /** Debug/testing hook. */
  debugInfo() {
    return {
      balls: this.balls.length,
      decals: this.decals.length,
      pos: this.player.pos.toArray().map((n) => Math.round(n * 10) / 10),
      weapon: this.player.weapon.name,
      score: { ...this.score },
      fx: [...this.player.fx.keys()],
      pickupsActive: this.pickups.filter((p) => p.active).length,
    };
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
  private nearBomb(): boolean {
    const b = this.bomb;
    const p = this.player;
    return (
      b.state === "idle" &&
      Math.hypot(b.pos.x - p.pos.x, b.pos.z - p.pos.z) < 1.6 &&
      Math.abs(b.pos.y - p.pos.y) < 1.6
    );
  }

  private interact() {
    if (!this.running) return;
    const p = this.player;
    if (!p.alive) return;
    if (p.climbing) {
      p.climbing = false;
      return;
    }
    if (this.bomb.state === "held" && this.bomb.holder === p) {
      // set the bomb down gently
      this.bomb.state = "idle";
      this.bomb.holder = null;
      this.bomb.pos.set(p.pos.x + Math.sin(p.yaw) * 0.7, this.world.floorHeightAt(p.pos.x, p.pos.z, p.pos.y), p.pos.z + Math.cos(p.yaw) * 0.7);
      this.bomb.group.position.copy(this.bomb.pos);
      return;
    }
    const held = this.cans.find((c) => c.held === p);
    if (held) {
      held.held = null;
      held.vel.set(0, 1, 0);
      held.thrower = p;
      held.graceT = 0.5;
      return;
    }
    if (this.nearBomb()) {
      this.bomb.state = "held";
      this.bomb.holder = p;
      this.sfx.pickup();
      return;
    }
    if (this.cat.held) {
      this.cat.held = false;
      this.cat.pos.set(
        p.pos.x + Math.sin(p.yaw) * 0.8,
        this.world.floorHeightAt(p.pos.x, p.pos.z, p.pos.y),
        p.pos.z + Math.cos(p.yaw) * 0.8
      );
      this.cat.wander = null;
      this.cat.thinkT = 4;
      return;
    }
    if (this.nearCat()) {
      this.cat.held = true;
      this.sfx.meow();
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

  private nearCat(): boolean {
    const p = this.player;
    return (
      !this.cat.held &&
      Math.hypot(this.cat.pos.x - p.pos.x, this.cat.pos.z - p.pos.z) < 1.8 &&
      Math.abs(this.cat.pos.y - p.pos.y) < 1.6
    );
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
    const dir = f.isPlayer ? this.cameraDir() : this.aimVector(f);
    can.vel.copy(dir).multiplyScalar(13).add(new THREE.Vector3(0, 4.2, 0));
    can.spin = 6 + Math.random() * 4;
    this.sfx.whoosh();
  }

  private aimVector(f: Fighter): THREE.Vector3 {
    return new THREE.Vector3(
      Math.cos(f.pitch) * Math.sin(f.yaw),
      Math.sin(f.pitch),
      Math.cos(f.pitch) * Math.cos(f.yaw)
    );
  }

  // ================= grenades =================
  private throwNade(kind: "paint" | "smoke") {
    if (!this.running || this.over) return;
    const p = this.player;
    if (!p.alive || p.climbing) return;
    if (this.nadeCd[kind] > 0) return;
    this.nadeCd[kind] = NADE_CD;
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.13, 10, 8),
      new THREE.MeshStandardMaterial({
        color: kind === "paint" ? 0xff3388 : 0x9aa4ac,
        roughness: 0.4,
        metalness: 0.3,
      })
    );
    const origin = new THREE.Vector3(p.pos.x, p.pos.y + 1.5, p.pos.z);
    mesh.position.copy(origin);
    mesh.castShadow = true;
    this.scene.add(mesh);
    const dir = this.cameraDir();
    this.nades.push({
      kind,
      pos: origin.clone(),
      vel: dir.multiplyScalar(15).add(new THREE.Vector3(0, 4.5, 0)),
      mesh, fuse: 2.2, owner: p,
    });
    this.sfx.whoosh();
  }

  private detonatePaint(pos: THREE.Vector3, owner: Fighter) {
    this.sfx.boom();
    this.shake = Math.max(this.shake, 0.5);
    // paint everywhere
    for (let i = 0; i < 7; i++) {
      const ang = Math.random() * Math.PI * 2;
      const d = Math.random() * 3;
      const px = pos.x + Math.cos(ang) * d;
      const pz = pos.z + Math.sin(ang) * d;
      const fh = this.world.floorHeightAt(px, pz, pos.y);
      this.addDecal(new THREE.Vector3(px, fh, pz), new THREE.Vector3(0, 1, 0), this.paintColor(owner.team));
    }
    for (let i = 0; i < 4; i++) {
      this.addBurst(pos, new THREE.Vector3((Math.random() - 0.5) * 2, 1, (Math.random() - 0.5) * 2).normalize(), this.paintColor(owner.team));
    }
    // AoE damage to enemies
    for (const f of this.fighters) {
      if (!f.alive || f.team === owner.team) continue;
      const d = Math.hypot(f.pos.x - pos.x, (f.pos.y + 1) - pos.y, f.pos.z - pos.z);
      if (d < 4.5) {
        const dmg = Math.round(30 * (1 - (d / 4.5) * 0.55));
        this.damage(f, owner, dmg, new THREE.Vector3(f.pos.x, f.pos.y + 1.1, f.pos.z), "ball");
      }
    }
  }

  private startSmoke(pos: THREE.Vector3) {
    this.sfx.hiss();
    const group = new THREE.Group();
    for (let i = 0; i < 11; i++) {
      const puff = new THREE.Mesh(
        new THREE.SphereGeometry(0.9 + Math.random() * 1.1, 8, 6),
        new THREE.MeshLambertMaterial({ color: 0xc8cdd2, transparent: true, opacity: 0.55 })
      );
      puff.position.set((Math.random() - 0.5) * 4, 0.5 + Math.random() * 2.2, (Math.random() - 0.5) * 4);
      group.add(puff);
    }
    group.position.copy(pos);
    group.scale.setScalar(0.2);
    this.scene.add(group);
    this.smokes.push({ group, pos: pos.clone(), life: 14, maxLife: 14, radius: 3.6 });
  }

  /** 2D segment intersection; returns t along a→b or null. */
  private segHit2D(
    ax: number, az: number, bx: number, bz: number,
    x1: number, z1: number, x2: number, z2: number
  ): number | null {
    const rx = bx - ax;
    const rz = bz - az;
    const sx = x2 - x1;
    const sz = z2 - z1;
    const denom = rx * sz - rz * sx;
    if (Math.abs(denom) < 1e-9) return null;
    const t = ((x1 - ax) * sz - (z1 - az) * sx) / denom;
    const u = ((x1 - ax) * rz - (z1 - az) * rx) / denom;
    return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? t : null;
  }

  /** Cage walls block sight/shots between two LOW points; roof-height fighters are exposed. */
  private cageBlocks(ax: number, az: number, ay: number, bx: number, bz: number, by: number): boolean {
    if (ay > CAGE_H - 0.6 || by > CAGE_H - 0.6) return false;
    for (const w of this.world.walls) {
      if (!w.cage) continue;
      const t = this.segHit2D(ax, az, bx, bz, w.x1, w.z1, w.x2, w.z2);
      if (t !== null) {
        const yAt = ay + (by - ay) * t;
        if (yAt > w.minY && yAt < w.maxY) return true;
      }
    }
    return false;
  }

  private losBlockedSmoky(ax: number, az: number, ay: number, bx: number, bz: number, by: number): boolean {
    if (this.world.losBlocked(ax, az, bx, bz)) return true;
    if (this.cageBlocks(ax, az, ay + 1.4, bx, bz, by + 1.4)) return true;
    for (const s of this.smokes) {
      const dx = bx - ax;
      const dz = bz - az;
      const lenSq = dx * dx + dz * dz || 1;
      const t = THREE.MathUtils.clamp(((s.pos.x - ax) * dx + (s.pos.z - az) * dz) / lenSq, 0, 1);
      const px = ax + dx * t;
      const pz = az + dz * t;
      if ((px - s.pos.x) ** 2 + (pz - s.pos.z) ** 2 < s.radius * s.radius) return true;
    }
    return false;
  }

  // ================= combat =================
  private paintColor(team: 0 | 1): number {
    const list = team === 0 ? PAINT_RED : PAINT_BLUE;
    return list[Math.floor(Math.random() * list.length)];
  }

  private ballMat(color: number): THREE.MeshBasicMaterial {
    let mat = this.ballMats.get(color);
    if (!mat) {
      mat = new THREE.MeshBasicMaterial({ color });
      this.ballMats.set(color, mat);
    }
    return mat;
  }

  private fire(f: Fighter, dir: THREE.Vector3, originOverride?: THREE.Vector3) {
    const w = f.weapon;
    const origin = new THREE.Vector3();
    f.rig.muzzle.getWorldPosition(origin);
    const flashPos = origin.clone();
    if (originOverride) origin.copy(originOverride);
    for (let i = 0; i < w.pellets; i++) {
      const color = w.rainbow
        ? new THREE.Color().setHSL(Math.random(), 1, 0.55).getHex()
        : w.key === "goo"
          ? 0xffcc22
          : this.paintColor(f.team);
      const mesh = new THREE.Mesh(this.ballGeo, this.ballMat(color));
      mesh.scale.setScalar(w.ballR);
      mesh.position.copy(origin);
      this.scene.add(mesh);
      // crouching steadies your aim
      const spread = w.spread * (1 - 0.5 * f.crouchK);
      const d = dir.clone();
      d.x += (Math.random() - 0.5) * 2 * spread;
      d.y += (Math.random() - 0.5) * 2 * spread;
      d.z += (Math.random() - 0.5) * 2 * spread;
      this.balls.push({
        pos: origin.clone(),
        vel: d.normalize().multiplyScalar(w.speed),
        mesh, owner: f, color, life: 3,
        dmg: w.dmg, grav: w.grav,
        explosive: w.explosive,
        bounces: w.bounces ?? 0,
        homing: !!w.homing,
      });
    }
    // muzzle flash (always at the gun tip)
    const flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glowTex, color: 0xfff0a8, transparent: true, depthWrite: false }));
    flash.position.copy(flashPos);
    flash.scale.setScalar(0.5 + Math.random() * 0.2);
    this.scene.add(flash);
    this.flashes.push({ sprite: flash, life: 0.06 });

    const rapid = f.fx.has("rapid") ? 0.5 : 1;
    f.fireCd = f.isPlayer ? w.interval * rapid : Math.max(w.interval * 1.5, 0.12);
    this.sfx.shoot();
  }

  /** Shots travel exactly along the crosshair ray so paint lands on the cross. */
  private playerShotRay(): { origin: THREE.Vector3; dir: THREE.Vector3 } {
    const dir = this.cameraDir();
    // spawn just past the player's body, on the camera axis
    const origin = this.camera.position.clone().addScaledVector(dir, 1.6);
    return { origin, dir };
  }

  private cameraDir(): THREE.Vector3 {
    const d = new THREE.Vector3();
    this.camera.getWorldDirection(d);
    return d;
  }

  private damage(victim: Fighter, attacker: Fighter, dmg: number, hitWorld: THREE.Vector3, cause: DamageCause) {
    if (!victim.alive || this.over) return;
    if (victim.fx.has("invincible")) {
      this.addBurst(hitWorld, new THREE.Vector3(0, 1, 0), 0xffe066);
      return;
    }
    // overshield soaks first
    if (victim.shield > 0) {
      const soak = Math.min(victim.shield, dmg);
      victim.shield -= soak;
      dmg -= soak;
    }
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
      if (attacker.isPlayer && victim.team !== attacker.team) this.takedowns++;
      if (victim.isPlayer) this.livesUsed++;
      const line =
        cause === "can"
          ? `${attacker.name} CRUSHED ${victim.name} with a trash can!`
          : cause === "bomb"
            ? `💥 ${attacker.name} BLEW UP ${victim.name}!`
            : cause === "spear"
              ? `💪 THE ENFORCER SPEARED ${victim.name}!!`
              : `${attacker.name} splatted ${victim.name}`;
      this.cb.onKill(line, cause !== "ball");
      if (attacker.isPlayer && attacker !== victim) {
        const list = cause === "ball" ? PRAISE : PRAISE_BIG;
        this.cb.onPraise(list[Math.floor(Math.random() * list.length)]);
      }
      this.sfx.splat();
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
    f.fx.clear();
    f.shield = 0;
    f.kb.set(0, 0, 0);
    f.ringT = 0;
    f.crouchK = 0;
    f.rig.group.rotation.set(0, f.yaw, 0);
    f.rig.group.position.copy(f.pos);
    clearBodyPaint(f.rig);
  }

  // ================= pickups & skills =================
  /** Speech bubble above the player's head, e.g. after munching an arepa. */
  private showBubble(text: string, seconds: number) {
    if (this.bubble) {
      this.player.rig.group.remove(this.bubble.sprite);
      (this.bubble.sprite.material as THREE.SpriteMaterial).map?.dispose();
      (this.bubble.sprite.material as THREE.Material).dispose();
    }
    const canvas = document.createElement("canvas");
    canvas.width = 320;
    canvas.height = 96;
    const ctx = canvas.getContext("2d")!;
    // rounded bubble with a little tail
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.strokeStyle = "rgba(0,0,0,0.65)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(4, 4, 312, 62, 18);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(140, 64);
    ctx.lineTo(160, 92);
    ctx.lineTo(180, 64);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#222";
    ctx.font = "bold 26px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 160, 36);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
    sprite.scale.set(2.1, 0.63, 1);
    sprite.position.y = 2.55;
    this.player.rig.group.add(sprite);
    this.bubble = { sprite, t: seconds };
  }

  private applySkill(f: Fighter, skill: SkillDef) {
    if (skill.key === "shield") {
      f.shield = 100;
    } else if (skill.key === "arepa") {
      f.hp = 100;
      if (f.isPlayer) this.showBubble("mmm arepa 100% health", 2);
    } else {
      f.fx.set(skill.key, skill.dur);
      // big and small are mutually exclusive
      if (skill.key === "big") f.fx.delete("small");
      if (skill.key === "small") f.fx.delete("big");
    }
    if (f.isPlayer) {
      this.cb.onKill(
        skill.key === "arepa" ? "🫓 You ate a Colombian arepa — health back to 100%!" : `You grabbed ${skill.icon} ${skill.name}!`,
        false
      );
    }
    this.sfx.pickup();
  }

  private updatePickups(dt: number) {
    for (const p of this.pickups) {
      if (!p.active) {
        p.respawnT -= dt;
        if (p.respawnT <= 0) this.rollPickup(p);
        continue;
      }
      p.bobT += dt;
      p.icon.position.y = 1.15 + Math.sin(p.bobT * 2.2) * 0.12;
      p.group.rotation.y += dt * 1.5;
      for (const f of this.fighters) {
        if (!f.alive) continue;
        if (p.kind === "skill" && !f.isPlayer) continue; // skills are for the player
        const d = Math.hypot(f.pos.x - p.pos.x, f.pos.z - p.pos.z);
        if (d < 1.0 && Math.abs(f.pos.y - p.pos.y) < 1.6) {
          if (p.kind === "weapon" && p.weapon) {
            f.weapon = p.weapon;
            if (f.isPlayer) this.cb.onKill(`You found the ${p.weapon.icon} ${p.weapon.name}!`, false);
            this.sfx.pickup();
          } else if (p.skill) {
            this.applySkill(f, p.skill);
          }
          p.active = false;
          p.group.visible = false;
          p.respawnT = 22 + Math.random() * 10;
          break;
        }
      }
    }
  }

  private updateEffects(f: Fighter, dt: number) {
    for (const [k, t] of f.fx) {
      const nt = t - dt;
      if (nt <= 0) f.fx.delete(k);
      else f.fx.set(k, nt);
    }
    const targetScale = f.baseScale * (f.fx.has("big") ? 1.45 : f.fx.has("small") ? 0.62 : 1);
    f.scaleCur += (targetScale - f.scaleCur) * Math.min(1, dt * 6);
    f.rig.group.scale.setScalar(f.scaleCur);
    // invincibility glow
    if (f.fx.has("invincible")) {
      if (!f.glow) {
        f.glow = new THREE.Mesh(
          new THREE.SphereGeometry(0.85, 12, 10),
          new THREE.MeshBasicMaterial({ color: 0xffdf5e, transparent: true, opacity: 0.22, depthWrite: false })
        );
        f.glow.scale.set(1, 1.4, 1);
        f.glow.position.y = 1.05;
        f.rig.group.add(f.glow);
      }
      (f.glow.material as THREE.MeshBasicMaterial).opacity = 0.16 + Math.sin(performance.now() * 0.01) * 0.08;
    } else if (f.glow) {
      this.disposeMesh(f.glow);
      f.rig.group.remove(f.glow);
      f.glow = null;
    }
  }

  private disposeMesh(m: THREE.Mesh) {
    m.geometry.dispose();
    (m.material as THREE.Material).dispose();
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
      this.disposeMesh(old.mesh);
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
    // knockback impulses (rope bounces, spears) decay quickly
    let nx = f.pos.x + wishX * speed * dt + f.kb.x * dt;
    let nz = f.pos.z + wishZ * speed * dt + f.kb.z * dt;
    f.kb.multiplyScalar(Math.pow(0.03, dt));
    if (f.kb.lengthSq() < 0.01) f.kb.set(0, 0, 0);
    [nx, nz] = this.resolveXZ(nx, nz, f.pos.y, PLAYER_R, f.pos.y + BODY_H);
    const fh = this.world.floorHeightAt(nx, nz, f.pos.y);
    if (fh - f.pos.y > STEP_UP) {
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

    let best: Fighter | null = null;
    let bd = 46;
    for (const e of this.fighters) {
      if (e.team === f.team || !e.alive) continue;
      const d = f.pos.distanceTo(e.pos);
      if (d < bd && !this.losBlockedSmoky(f.pos.x, f.pos.z, f.pos.y, e.pos.x, e.pos.z, e.pos.y)) {
        bd = d;
        best = e;
      }
    }
    f.target = best;
    if (Math.random() < 0.25) f.strafe = -f.strafe;

    if (f.pos.distanceToSquared(f.lastPos) < 0.02 && !f.target) {
      f.stuckT += 0.25;
      if (f.stuckT > 1) {
        f.wp = null;
        f.path = [];
        f.stuckT = 0;
      }
    } else f.stuckT = 0;
    f.lastPos.copy(f.pos);

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
    this.nadeCd.paint = Math.max(0, this.nadeCd.paint - dt);
    this.nadeCd.smoke = Math.max(0, this.nadeCd.smoke - dt);
    if (!p.alive) return;

    const speedMult = p.fx.has("speed") ? 1.5 : 1;
    const jumpMult = p.fx.has("jump") ? 1.55 : 1;

    if (p.climbing) {
      if (!this.nearCageWall(p) || p.pos.y >= CAGE_H) {
        p.climbing = false;
      } else {
        p.pos.y += CLIMB_SPEED * dt;
        p.walkPhase += dt * 4;
        if (p.pos.y >= CAGE_H) {
          p.pos.y = CAGE_H + 0.04;
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
      const crouching = this.keys.has("KeyC") && p.grounded;
      p.crouchK += ((crouching ? 1 : 0) - p.crouchK) * Math.min(1, dt * 9);
      const onMat = this.world.floorHeightAt(p.pos.x, p.pos.z, p.pos.y) === MAT_Y && p.pos.y <= MAT_Y + 0.05;
      if (this.keys.has("Space") && p.grounded) {
        // the ring floor is springy — jump higher off the mat
        p.vel.y = JUMP_V * jumpMult * (onMat ? 1.35 : 1);
        if (onMat) this.sfx.boing();
        p.grounded = false;
      }
      const crouchMult = 1 - 0.55 * p.crouchK;
      this.moveFighter(p, dt, wx, wz, (sprint && !crouching ? SPRINT : WALK) * speedMult * crouchMult);
      // bounce off the ring ropes (the door lane is exempt so you can still walk out)
      if (onMat && p.pos.y <= MAT_Y + 0.3) {
        const overX = Math.abs(p.pos.x) > ROPE_LINE;
        const overZ = Math.abs(p.pos.z) > ROPE_LINE;
        const inDoorLane = p.pos.z > 2.3 && p.pos.x > 0.5 && p.pos.x < 2.7;
        if ((overX || overZ) && !inDoorLane) {
          const inward = new THREE.Vector3(-Math.sign(p.pos.x) * (overX ? 1 : 0), 0, -Math.sign(p.pos.z) * (overZ ? 1 : 0)).normalize();
          p.kb.set(inward.x * 8, 0, inward.z * 8);
          if (p.vel.y <= 0.5) p.vel.y = 3.4;
          this.sfx.boing();
        }
      }
    }

    p.fireCd -= dt;
    const holdingCan = this.cans.some((c) => c.held === p);
    const holdingBomb = this.bomb.state === "held" && this.bomb.holder === p;
    if (this.mouseDown && !holdingCan && !holdingBomb && p.fireCd <= 0 && !p.climbing) {
      const ray = this.playerShotRay();
      this.fire(p, ray.dir, ray.origin);
      this.shake = Math.max(this.shake, 0.045);
    }

    if (p.climbing) this.prompt = "E — let go";
    else if (holdingBomb) this.prompt = "CLICK — THROW THE BIG BOMB (run away after!)   E — set it down";
    else if (this.cat.held) this.prompt = "E — put the cat down somewhere SAFE 🐈";
    else if (holdingCan) this.prompt = "CLICK — hurl the trash can!   E — set it down";
    else if (this.nearBomb()) this.prompt = "E — grab the BIG BOMB!";
    else if (this.nearCat()) this.prompt = "E — rescue the cat";
    else if (this.nearestCan(p.pos, 1.7)) this.prompt = "E — pick up trash can";
    else if (this.nearCageWall(p) && p.pos.y < CAGE_H - 0.3) this.prompt = "E — climb the cage";
    else this.prompt = "";
  }

  private updateFighterVisual(f: Fighter, dt: number) {
    this.updateEffects(f, dt);
    // own bar would fill the screen this close to the camera — the HUD covers it
    f.hpBar.sprite.visible = f.alive && !f.isPlayer;
    if (f.alive && (f.hpBar.lastHp !== Math.round(f.hp) || f.hpBar.lastShield !== Math.round(f.shield))) {
      this.drawHpBar(f.hpBar, Math.round(f.hp), Math.round(f.shield));
    }
    if (!f.alive) {
      f.deadT += dt;
      const k = Math.min(1, f.deadT / 0.4);
      f.rig.group.rotation.x = (-Math.PI / 2) * k;
      if (f.deadT >= RESPAWN_T) this.respawn(f);
      f.rig.group.position.copy(f.pos);
      return;
    }
    f.rig.group.rotation.x = 0;
    f.rig.group.position.copy(f.pos);
    f.rig.group.rotation.y = f.yaw;
    poseHumanoid(f.rig, f.walkPhase, f.speed01, f.pitch, f.aiming && !f.climbing, f.climbing, f.crouchK);
  }

  private hitRadius(f: Fighter): number {
    return 0.38 * f.scaleCur;
  }

  private updateBalls(dt: number) {
    for (let i = this.balls.length - 1; i >= 0; i--) {
      const b = this.balls[i];
      b.life -= dt;
      b.vel.y -= b.grav * dt;
      // homing steers toward the nearest enemy
      if (b.homing) {
        let best: Fighter | null = null;
        let bd = 28;
        for (const f of this.fighters) {
          if (f.team === b.owner.team || !f.alive) continue;
          const d = b.pos.distanceTo(f.pos);
          if (d < bd) {
            bd = d;
            best = f;
          }
        }
        if (best) {
          const speed = b.vel.length();
          const want = new THREE.Vector3(best.pos.x, best.pos.y + 1.1, best.pos.z).sub(b.pos).normalize();
          b.vel.normalize().lerp(want, Math.min(1, dt * 4)).normalize().multiplyScalar(speed);
        }
      }
      const prevX = b.pos.x;
      const prevY = b.pos.y;
      const prevZ = b.pos.z;
      b.pos.addScaledVector(b.vel, dt);
      b.mesh.position.copy(b.pos);
      // stretch along velocity so shots read as tracers
      b.mesh.lookAt(b.pos.clone().add(b.vel));
      const r = (b.mesh.scale.x + b.mesh.scale.y) / 2 || 0.07;
      b.mesh.scale.set(r, r, r * 2.4);

      let dead = b.life <= 0 || Math.abs(b.pos.x) > ARENA + 30 || Math.abs(b.pos.z) > ARENA + 30;
      let exploded = false;

      if (!dead) {
        // chain-link cage blocks paint — inside the ring is cover (swept so fast shots can't tunnel)
        for (const w of this.world.walls) {
          if (!w.cage) continue;
          const t = this.segHit2D(prevX, prevZ, b.pos.x, b.pos.z, w.x1, w.z1, w.x2, w.z2);
          if (t === null) continue;
          const yAt = prevY + (b.pos.y - prevY) * t;
          if (yAt <= w.minY || yAt >= w.maxY) continue;
          const hx = prevX + (b.pos.x - prevX) * t;
          const hz = prevZ + (b.pos.z - prevZ) * t;
          let nx = w.z2 - w.z1;
          let nz = -(w.x2 - w.x1);
          const nl = Math.hypot(nx, nz) || 1;
          nx /= nl;
          nz /= nl;
          if (nx * (prevX - hx) + nz * (prevZ - hz) < 0) {
            nx = -nx;
            nz = -nz;
          }
          this.addDecal(new THREE.Vector3(hx, yAt, hz), new THREE.Vector3(nx, 0, nz), b.color);
          this.addBurst(new THREE.Vector3(hx, yAt, hz), new THREE.Vector3(nx, 0.3, nz).normalize(), b.color);
          this.sfx.splat();
          dead = true;
          exploded = !!b.explosive;
          break;
        }
        // roof panel blocks shots from above/below
        if (!dead && (prevY - CAGE_H) * (b.pos.y - CAGE_H) < 0) {
          const t = (CAGE_H - prevY) / (b.pos.y - prevY);
          const hx = prevX + (b.pos.x - prevX) * t;
          const hz = prevZ + (b.pos.z - prevZ) * t;
          if (Math.abs(hx) <= CAGE_HALF && Math.abs(hz) <= CAGE_HALF) {
            const ny = prevY > CAGE_H ? 1 : -1;
            this.addDecal(new THREE.Vector3(hx, CAGE_H, hz), new THREE.Vector3(0, ny, 0), b.color);
            this.addBurst(new THREE.Vector3(hx, CAGE_H + ny * 0.05, hz), new THREE.Vector3(0, ny, 0), b.color);
            this.sfx.splat();
            dead = true;
            exploded = !!b.explosive;
          }
        }
      }

      if (!dead) {
        for (const f of this.fighters) {
          if (f === b.owner || !f.alive || f.team === b.owner.team) continue;
          const hr = this.hitRadius(f);
          const top = f.pos.y + (1.6 - 0.45 * f.crouchK) * f.scaleCur;
          const cy = THREE.MathUtils.clamp(b.pos.y, f.pos.y + 0.15, top);
          const dx = b.pos.x - f.pos.x;
          const dz = b.pos.z - f.pos.z;
          if (dx * dx + dz * dz < hr * hr && Math.abs(b.pos.y - cy) < 0.25) {
            this.damage(f, b.owner, b.dmg, b.pos, "ball");
            this.addBurst(b.pos, new THREE.Vector3(0, 1, 0), b.color);
            dead = true;
            exploded = !!b.explosive;
            break;
          }
        }
      }
      if (!dead) {
        const fh = this.world.floorHeightAt(b.pos.x, b.pos.z, b.pos.y);
        if (b.pos.y <= fh + 0.04) {
          if (b.bounces > 0 && b.pos.y >= fh - 0.2) {
            b.bounces--;
            b.pos.y = fh + 0.05;
            b.vel.y = Math.abs(b.vel.y) * 0.75;
            b.vel.x *= 0.9;
            b.vel.z *= 0.9;
          } else {
            if (b.pos.y < fh - 0.2) {
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
            exploded = !!b.explosive;
          }
        }
      }
      if (!dead) {
        for (const c of this.world.cylinders) {
          if (c.r < 0.2) continue;
          const dx = b.pos.x - c.x;
          const dz = b.pos.z - c.z;
          const d = Math.hypot(dx, dz);
          if (d < c.r + 0.06 && b.pos.y < 11) {
            const n = new THREE.Vector3(dx / (d || 1), 0, dz / (d || 1));
            if (b.bounces > 0) {
              b.bounces--;
              const dot = b.vel.x * n.x + b.vel.z * n.z;
              b.vel.x -= 2 * dot * n.x;
              b.vel.z -= 2 * dot * n.z;
              b.vel.multiplyScalar(0.75);
              b.pos.x = c.x + n.x * (c.r + 0.1);
              b.pos.z = c.z + n.z * (c.r + 0.1);
            } else {
              const hit = new THREE.Vector3(c.x + n.x * c.r, b.pos.y, c.z + n.z * c.r);
              this.addDecal(hit, n, b.color);
              this.addBurst(hit, n, b.color);
              this.sfx.splat();
              dead = true;
              exploded = !!b.explosive;
            }
            break;
          }
        }
      }
      if (!dead && this.wrestler) {
        // paint the big man — he soaks a LOT of hits
        const w = this.wrestler;
        const wdx = b.pos.x - w.pos.x;
        const wdz = b.pos.z - w.pos.z;
        if (wdx * wdx + wdz * wdz < 0.6 * 0.6 && b.pos.y > w.pos.y && b.pos.y < w.pos.y + 2.3) {
          this.addBurst(b.pos, new THREE.Vector3(0, 1, 0), b.color);
          this.sfx.splat();
          this.hurtWrestler(b.dmg, b.owner, b.pos, b.color);
          dead = true;
          exploded = !!b.explosive;
        }
      }
      if (!dead) {
        // hitting the cat is a war crime — the player takes the damage
        const cat = this.cat;
        const cdx = b.pos.x - cat.pos.x;
        const cdz = b.pos.z - cat.pos.z;
        if (cdx * cdx + cdz * cdz < 0.34 * 0.34 && b.pos.y > cat.pos.y - 0.1 && b.pos.y < cat.pos.y + 0.55) {
          this.addBurst(b.pos, new THREE.Vector3(0, 1, 0), b.color);
          this.sfx.meow();
          if (b.owner.team === 1 && this.player.alive) {
            this.damage(
              this.player,
              b.owner,
              b.dmg,
              new THREE.Vector3(this.player.pos.x, this.player.pos.y + 1.1, this.player.pos.z),
              "ball"
            );
            this.cb.onKill("😾 They hit the cat! Jack takes the damage!", true);
          }
          dead = true;
          exploded = !!b.explosive;
        }
      }
      if (!dead) {
        for (const c of this.cans) {
          if (c.held) continue;
          const dx = b.pos.x - c.pos.x;
          const dz = b.pos.z - c.pos.z;
          if (dx * dx + dz * dz < 0.11 && b.pos.y > c.pos.y && b.pos.y < c.pos.y + 0.75) {
            this.addBurst(b.pos, new THREE.Vector3(dx, 0.4, dz).normalize(), b.color);
            this.sfx.clang();
            dead = true;
            exploded = !!b.explosive;
            break;
          }
        }
      }
      if (dead) {
        if (exploded) this.explode(b.pos, b.owner, b.explosive!, b.dmg);
        this.scene.remove(b.mesh);
        this.balls.splice(i, 1);
      }
    }
  }

  private explode(pos: THREE.Vector3, owner: Fighter, radius: number, dmg: number) {
    this.sfx.boom();
    this.shake = Math.max(this.shake, 0.4);
    for (let i = 0; i < 4; i++) {
      const ang = Math.random() * Math.PI * 2;
      const d = Math.random() * radius * 0.8;
      const px = pos.x + Math.cos(ang) * d;
      const pz = pos.z + Math.sin(ang) * d;
      const fh = this.world.floorHeightAt(px, pz, pos.y);
      this.addDecal(new THREE.Vector3(px, fh, pz), new THREE.Vector3(0, 1, 0), this.paintColor(owner.team));
    }
    for (let i = 0; i < 3; i++) {
      this.addBurst(pos, new THREE.Vector3((Math.random() - 0.5) * 2, 1, (Math.random() - 0.5) * 2).normalize(), this.paintColor(owner.team));
    }
    for (const f of this.fighters) {
      if (!f.alive || f.team === owner.team) continue;
      const d = Math.hypot(f.pos.x - pos.x, (f.pos.y + 1) - pos.y, f.pos.z - pos.z);
      if (d < radius) {
        this.damage(f, owner, Math.round(dmg * (1 - (d / radius) * 0.5)), new THREE.Vector3(f.pos.x, f.pos.y + 1.1, f.pos.z), "ball");
      }
    }
  }

  private updateNades(dt: number) {
    for (let i = this.nades.length - 1; i >= 0; i--) {
      const n = this.nades[i];
      n.fuse -= dt;
      n.vel.y -= 18 * dt;
      n.pos.addScaledVector(n.vel, dt);
      const [rx, rz] = this.resolveXZ(n.pos.x, n.pos.z, n.pos.y, 0.13, n.pos.y + 0.26);
      n.pos.x = rx;
      n.pos.z = rz;
      const fh = this.world.floorHeightAt(n.pos.x, n.pos.z, n.pos.y);
      let landed = false;
      if (n.pos.y <= fh + 0.1) {
        n.pos.y = fh + 0.1;
        landed = true;
      }
      n.mesh.position.copy(n.pos);
      n.mesh.rotation.x += dt * 9;
      if (landed || n.fuse <= 0) {
        if (n.kind === "paint") this.detonatePaint(n.pos, n.owner);
        else this.startSmoke(n.pos);
        this.scene.remove(n.mesh);
        this.disposeMesh(n.mesh);
        this.nades.splice(i, 1);
      }
    }
  }

  private updateSmokes(dt: number) {
    for (let i = this.smokes.length - 1; i >= 0; i--) {
      const s = this.smokes[i];
      s.life -= dt;
      const grow = Math.min(1, (s.maxLife - s.life) * 1.6);
      s.group.scale.setScalar(0.2 + grow * 0.8);
      const fade = s.life < 3 ? s.life / 3 : 1;
      for (const puff of s.group.children as THREE.Mesh[]) {
        (puff.material as THREE.MeshLambertMaterial).opacity = 0.55 * fade;
        puff.rotation.y += dt * 0.3;
      }
      if (s.life <= 0) {
        for (const puff of [...s.group.children] as THREE.Mesh[]) this.disposeMesh(puff);
        this.scene.remove(s.group);
        this.smokes.splice(i, 1);
      }
    }
  }

  private updateCans(dt: number) {
    for (const c of this.cans) {
      c.graceT -= dt;
      if (c.held) {
        const h = c.held;
        c.pos.set(h.pos.x, h.pos.y + 1.95 * h.scaleCur, h.pos.z);
        c.group.position.copy(c.pos);
        c.group.rotation.set(0, h.yaw, 0);
        if (!h.alive) c.held = null;
        continue;
      }
      const speed = c.vel.length();
      if (speed > 0.01 || c.pos.y > this.world.floorHeightAt(c.pos.x, c.pos.z, c.pos.y) + 0.01) {
        c.vel.y -= GRAV * 0.9 * dt;
        c.pos.addScaledVector(c.vel, dt);
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
        if (c.pos.y > fh + 0.05) {
          c.group.rotation.x += c.spin * dt;
        } else {
          c.group.rotation.x *= Math.pow(0.001, dt);
          c.group.rotation.z *= Math.pow(0.001, dt);
        }
        c.group.position.copy(c.pos);
        if (speed > 5.5) {
          for (const f of this.fighters) {
            if (!f.alive) continue;
            if (f === c.thrower && c.graceT > 0) continue;
            const dx = c.pos.x - f.pos.x;
            const dz = c.pos.z - f.pos.z;
            const hr = 0.6 * f.scaleCur;
            if (dx * dx + dz * dz < hr * hr && c.pos.y > f.pos.y - 0.3 && c.pos.y < f.pos.y + 1.9 * f.scaleCur) {
              const attacker = c.thrower ?? f;
              if (attacker.team !== f.team || attacker === f) {
                this.damage(f, attacker, CAN_DMG, c.pos.clone().setY(f.pos.y + 1.2), "can");
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

  private updateCat(dt: number) {
    const c = this.cat;
    c.meowCd -= dt;
    c.tag.position.y = 0.95 + Math.sin(performance.now() * 0.003) * 0.07;
    // audible hint when the cat is nearby
    if (c.meowCd <= 0) {
      c.meowCd = 9 + Math.random() * 9;
      if (!c.held && this.running && c.pos.distanceTo(this.player.pos) < 28) this.sfx.meow();
    }
    if (c.held) {
      const p = this.player;
      c.pos.set(
        p.pos.x + Math.sin(p.yaw) * 0.45,
        p.pos.y + (1.05 - 0.35 * p.crouchK) * p.scaleCur,
        p.pos.z + Math.cos(p.yaw) * 0.45
      );
      c.group.position.copy(c.pos);
      c.group.rotation.y = p.yaw + Math.PI / 2;
      if (!p.alive) c.held = false;
      return;
    }
    c.thinkT -= dt;
    if (c.thinkT <= 0) {
      c.thinkT = 3 + Math.random() * 6;
      if (Math.random() < 0.3) {
        c.wander = null; // sit for a while
      } else {
        const a = Math.random() * Math.PI * 2;
        const d = 6 + Math.random() * 22;
        c.wander = new THREE.Vector3(Math.cos(a) * d, 0, Math.sin(a) * d);
      }
    }
    if (c.wander) {
      const dx = c.wander.x - c.pos.x;
      const dz = c.wander.z - c.pos.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 0.4) c.wander = null;
      else {
        const step = 1.15 * dt;
        let nx = c.pos.x + (dx / dist) * step;
        let nz = c.pos.z + (dz / dist) * step;
        [nx, nz] = this.resolveXZ(nx, nz, c.pos.y, 0.2, c.pos.y + 0.4);
        c.pos.x = nx;
        c.pos.z = nz;
        c.group.rotation.y = Math.atan2(dx, dz) - Math.PI / 2;
        c.walkT += dt * 9;
        c.group.position.y = c.pos.y + Math.abs(Math.sin(c.walkT)) * 0.02;
      }
    }
    c.pos.y = this.world.floorHeightAt(c.pos.x, c.pos.z, c.pos.y);
    c.group.position.set(c.pos.x, c.pos.y, c.pos.z);
  }

  private updateFootballs(dt: number) {
    for (const fb of this.footballs) {
      // kicks: any fighter walking into the ball punts it
      for (const f of this.fighters) {
        if (!f.alive) continue;
        const dx = fb.pos.x - f.pos.x;
        const dz = fb.pos.z - f.pos.z;
        const d = Math.hypot(dx, dz);
        if (d < 0.55 && Math.abs(fb.pos.y - f.pos.y) < 1) {
          const power = 3.5 + f.speed01 * 5;
          fb.vel.x = (dx / (d || 1)) * power;
          fb.vel.z = (dz / (d || 1)) * power;
          fb.vel.y = 1.6 + f.speed01 * 1.6;
          this.sfx.kick();
        }
      }
      if (fb.vel.lengthSq() > 0.001) {
        fb.vel.y -= 16 * dt;
        fb.pos.addScaledVector(fb.vel, dt);
        const [rx, rz] = this.resolveXZ(fb.pos.x, fb.pos.z, fb.pos.y, 0.16, fb.pos.y + 0.32);
        if (rx !== fb.pos.x || rz !== fb.pos.z) {
          const nx = rx - fb.pos.x;
          const nz = rz - fb.pos.z;
          const nl = Math.hypot(nx, nz) || 1;
          const dot = (fb.vel.x * nx + fb.vel.z * nz) / nl;
          if (dot < 0) {
            fb.vel.x -= 1.7 * dot * (nx / nl);
            fb.vel.z -= 1.7 * dot * (nz / nl);
          }
          fb.pos.x = rx;
          fb.pos.z = rz;
        }
        const fh = this.world.floorHeightAt(fb.pos.x, fb.pos.z, fb.pos.y) + 0.16;
        if (fb.pos.y < fh) {
          fb.pos.y = fh;
          fb.vel.y = fb.vel.y < -1 ? -fb.vel.y * 0.55 : 0;
          fb.vel.x *= 0.985;
          fb.vel.z *= 0.985;
        }
        // roll friction + spin
        const damp = Math.pow(0.35, dt);
        fb.vel.x *= damp;
        fb.vel.z *= damp;
        if (fb.vel.lengthSq() < 0.02) fb.vel.set(0, 0, 0);
        fb.mesh.position.copy(fb.pos);
        fb.mesh.rotation.x += fb.vel.z * dt * 6;
        fb.mesh.rotation.z -= fb.vel.x * dt * 6;
      }
    }
  }

  private updateFx(dt: number) {
    if (this.bubble) {
      this.bubble.t -= dt;
      if (this.bubble.t <= 0) {
        this.player.rig.group.remove(this.bubble.sprite);
        (this.bubble.sprite.material as THREE.SpriteMaterial).map?.dispose();
        (this.bubble.sprite.material as THREE.Material).dispose();
        this.bubble = null;
      }
    }
    for (let i = this.flashes.length - 1; i >= 0; i--) {
      const fl = this.flashes[i];
      fl.life -= dt;
      if (fl.life <= 0) {
        this.scene.remove(fl.sprite);
        (fl.sprite.material as THREE.Material).dispose();
        this.flashes.splice(i, 1);
      }
    }
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
        this.disposeMesh(d.mesh);
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
    const eye = new THREE.Vector3(p.pos.x, p.pos.y + (1.5 - 0.5 * p.crouchK) * p.scaleCur, p.pos.z);
    const dir = this.aimVector(p);
    const right = new THREE.Vector3(-Math.cos(p.yaw), 0, Math.sin(p.yaw));
    // over-the-shoulder: offset right so your own character doesn't block the view
    const wanted = eye.clone().addScaledVector(dir, -3.2).addScaledVector(right, 0.95).add(new THREE.Vector3(0, 0.35, 0));
    const camFloor = this.world.floorHeightAt(wanted.x, wanted.z, wanted.y) + 0.25;
    if (wanted.y < camFloor) wanted.y = camFloor;
    this.camera.position.lerp(wanted, 1 - Math.pow(0.0001, dt));
    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - dt * 1.4);
      this.camera.position.x += (Math.random() - 0.5) * this.shake * 0.25;
      this.camera.position.y += (Math.random() - 0.5) * this.shake * 0.25;
    }
    const lookAt = eye.clone().addScaledVector(right, 0.5).addScaledVector(dir, 10);
    this.camera.lookAt(lookAt);
  }

  private pushHud() {
    const p = this.player;
    const fx: { icon: string; name: string; sec: number }[] = [];
    for (const [k, t] of p.fx) {
      const def = SKILLS.find((s) => s.key === k);
      if (def) fx.push({ icon: def.icon, name: def.name, sec: Math.ceil(t) });
    }
    this.cb.onHud({
      hp: Math.max(0, Math.round(p.hp)),
      shield: Math.max(0, Math.round(p.shield)),
      red: this.score.red,
      blue: this.score.blue,
      time: Math.max(0, Math.ceil(this.timeLeft)),
      prompt: this.prompt,
      carrying: this.cans.some((c) => c.held === p),
      carryingBomb: this.bomb.state === "held" && this.bomb.holder === p,
      dead: !p.alive,
      respawnIn: p.alive ? 0 : Math.max(0, RESPAWN_T - p.deadT),
      onRoof: p.pos.y > CAGE_H - 0.6 && Math.abs(p.pos.x) < CAGE_HALF + 0.5 && Math.abs(p.pos.z) < CAGE_HALF + 0.5,
      weapon: p.weapon.name,
      weaponIcon: p.weapon.icon,
      gPaint: Math.ceil(this.nadeCd.paint),
      gSmoke: Math.ceil(this.nadeCd.smoke),
      fx,
      takedowns: this.takedowns,
      livesUsed: this.livesUsed,
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
      this.updateNades(dt);
      this.updateSmokes(dt);
      this.updateCans(dt);
      this.updateBomb(dt);
      this.updateCat(dt);
      this.updateFootballs(dt);
      this.updateRingCamping(dt);
      this.updateWrestler(dt);
      this.updatePickups(dt);
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
