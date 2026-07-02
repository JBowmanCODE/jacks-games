import * as THREE from "three";

function makeCanvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return { c, ctx: c.getContext("2d")! };
}

function toTexture(c: HTMLCanvasElement, repeat = 1): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.anisotropy = 4;
  return t;
}

/** Mottled jungle floor: dark soil + grass patches + leaf litter. */
export function groundTexture(): THREE.CanvasTexture {
  const { c, ctx } = makeCanvas(512, 512);
  ctx.fillStyle = "#3d5226";
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 2600; i++) {
    const g = 60 + Math.random() * 70;
    const r = 30 + Math.random() * 30;
    ctx.fillStyle = `rgba(${r + 20},${g},${r},${0.12 + Math.random() * 0.25})`;
    const s = 3 + Math.random() * 14;
    ctx.beginPath();
    ctx.ellipse(Math.random() * 512, Math.random() * 512, s, s * 0.6, Math.random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  // dirt worn patches
  for (let i = 0; i < 60; i++) {
    ctx.fillStyle = `rgba(92,68,40,${0.05 + Math.random() * 0.1})`;
    const s = 20 + Math.random() * 50;
    ctx.beginPath();
    ctx.ellipse(Math.random() * 512, Math.random() * 512, s, s * 0.7, Math.random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  return toTexture(c, 24);
}

/** Chain-link fence: transparent with diamond wire pattern. */
export function chainLinkTexture(): THREE.CanvasTexture {
  const { c, ctx } = makeCanvas(256, 256);
  ctx.clearRect(0, 0, 256, 256);
  ctx.strokeStyle = "#b8bec4";
  ctx.lineWidth = 5;
  const step = 32;
  for (let x = -256; x < 512; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + 256, 256);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 256, 0);
    ctx.lineTo(x, 256);
    ctx.stroke();
  }
  const t = toTexture(c, 1);
  return t;
}

/** Canvas ring mat with center logo and scuffs. */
export function ringMatTexture(): THREE.CanvasTexture {
  const { c, ctx } = makeCanvas(512, 512);
  ctx.fillStyle = "#d8d2c2";
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 900; i++) {
    ctx.fillStyle = `rgba(120,110,90,${Math.random() * 0.12})`;
    ctx.fillRect(Math.random() * 512, Math.random() * 512, 2 + Math.random() * 6, 1 + Math.random() * 3);
  }
  ctx.strokeStyle = "#a33";
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.arc(256, 256, 150, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = "#a33";
  ctx.font = "bold 64px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("JUNGLE", 256, 225);
  ctx.fillText("MANIA", 256, 295);
  return toTexture(c, 1);
}

/** Ring apron skirt fabric. */
export function apronTexture(): THREE.CanvasTexture {
  const { c, ctx } = makeCanvas(512, 128);
  const grad = ctx.createLinearGradient(0, 0, 0, 128);
  grad.addColorStop(0, "#1a2a52");
  grad.addColorStop(1, "#101a36");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 128);
  ctx.fillStyle = "#e8c33a";
  ctx.font = "bold 56px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("PAINTBALL RUMBLE", 256, 64);
  return toTexture(c, 1);
}

/** Corrugated galvanized trash can. */
export function trashCanTexture(): THREE.CanvasTexture {
  const { c, ctx } = makeCanvas(256, 256);
  ctx.fillStyle = "#8d969e";
  ctx.fillRect(0, 0, 256, 256);
  for (let x = 0; x < 256; x += 16) {
    const grad = ctx.createLinearGradient(x, 0, x + 16, 0);
    grad.addColorStop(0, "#767f87");
    grad.addColorStop(0.5, "#a8b1b9");
    grad.addColorStop(1, "#767f87");
    ctx.fillStyle = grad;
    ctx.fillRect(x, 0, 16, 256);
  }
  for (let i = 0; i < 120; i++) {
    ctx.fillStyle = `rgba(60,55,50,${Math.random() * 0.25})`;
    ctx.fillRect(Math.random() * 256, Math.random() * 256, 2 + Math.random() * 8, 1 + Math.random() * 4);
  }
  return toTexture(c, 1);
}

export type FaceExpression = "normal" | "cute" | "angry" | "silly";

/** Human face: eyes, brows, mouth on skin tone, with optional expression. */
export function faceTexture(skin: string, expr: FaceExpression = "normal"): THREE.CanvasTexture {
  const { c, ctx } = makeCanvas(128, 128);
  ctx.fillStyle = skin;
  ctx.fillRect(0, 0, 128, 128);
  const eyeW = expr === "cute" ? 13 : 9;
  const eyeH = expr === "cute" ? 10 : 6;
  const pupil = expr === "cute" ? 5.5 : 3.5;
  for (const ex of [44, 84]) {
    const inward = ex < 64 ? 1 : -1; // toward the nose
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.ellipse(ex, 58, eyeW, eyeH, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#3a2a1a";
    ctx.beginPath();
    ctx.arc(ex, 58, pupil, 0, Math.PI * 2);
    ctx.fill();
    if (expr === "cute") {
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(ex - 2, 55, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = "rgba(60,40,25,0.9)";
    ctx.lineWidth = expr === "angry" ? 5 : 3;
    ctx.beginPath();
    if (expr === "angry") {
      // slanted down toward the nose
      ctx.moveTo(ex - 11 * inward, 40);
      ctx.lineTo(ex + 10 * inward, 51);
    } else {
      ctx.moveTo(ex - 10, 46 - (expr === "cute" ? 3 : 0));
      ctx.lineTo(ex + 10, 44 - (expr === "cute" ? 3 : 0));
    }
    ctx.stroke();
  }
  // chubby rosy cheeks
  if (expr === "cute") {
    ctx.fillStyle = "rgba(255,120,130,0.4)";
    for (const cx of [32, 96]) {
      ctx.beginPath();
      ctx.arc(cx, 80, 11, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // nose
  ctx.strokeStyle = "rgba(0,0,0,0.25)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(64, 62);
  ctx.lineTo(64, 76);
  ctx.stroke();
  // mouth
  ctx.strokeStyle = "#7a4238";
  ctx.lineWidth = 3;
  ctx.beginPath();
  if (expr === "angry") {
    ctx.arc(64, 100, 12, 1.15 * Math.PI, 1.85 * Math.PI);
  } else {
    ctx.arc(64, 86, expr === "cute" ? 14 : 12, 0.15 * Math.PI, 0.85 * Math.PI);
  }
  ctx.stroke();
  if (expr === "silly") {
    // tongue sticking out
    ctx.fillStyle = "#e56b78";
    ctx.beginPath();
    ctx.roundRect(56, 94, 16, 14, 6);
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.2)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(64, 96);
    ctx.lineTo(64, 106);
    ctx.stroke();
  }
  return toTexture(c, 1);
}

/** Camo pattern for pants/vests. */
export function camoTexture(base: string, blotch1: string, blotch2: string): THREE.CanvasTexture {
  const { c, ctx } = makeCanvas(128, 128);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 128, 128);
  for (const col of [blotch1, blotch2]) {
    ctx.fillStyle = col;
    for (let i = 0; i < 22; i++) {
      const x = Math.random() * 128;
      const y = Math.random() * 128;
      ctx.beginPath();
      ctx.ellipse(x, y, 8 + Math.random() * 14, 5 + Math.random() * 9, Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const t = toTexture(c, 1);
  return t;
}

/** Soft round paint splat with drips, tinted white (color via material). */
export function splatTexture(): THREE.CanvasTexture {
  const { c, ctx } = makeCanvas(128, 128);
  ctx.clearRect(0, 0, 128, 128);
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(64, 64, 34, 0, Math.PI * 2);
  ctx.fill();
  for (let i = 0; i < 14; i++) {
    const a = Math.random() * Math.PI * 2;
    const d = 28 + Math.random() * 28;
    const r = 3 + Math.random() * 9;
    ctx.beginPath();
    ctx.arc(64 + Math.cos(a) * d, 64 + Math.sin(a) * d, r, 0, Math.PI * 2);
    ctx.fill();
  }
  const t = toTexture(c, 1);
  t.wrapS = THREE.ClampToEdgeWrapping;
  t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

/** Classic white football with black pentagon patches. */
export function soccerTexture(): THREE.CanvasTexture {
  const { c, ctx } = makeCanvas(128, 128);
  ctx.fillStyle = "#f2f2ee";
  ctx.fillRect(0, 0, 128, 128);
  ctx.fillStyle = "#151515";
  const spots: [number, number][] = [
    [20, 24], [70, 14], [116, 30], [42, 64], [94, 70], [14, 90], [64, 108], [112, 104],
  ];
  for (const [x, y] of spots) {
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
      const px = x + Math.cos(a) * 13;
      const py = y + Math.sin(a) * 13;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  }
  return toTexture(c, 1);
}

/** Sky gradient dome texture. */
export function skyTexture(): THREE.CanvasTexture {
  const { c, ctx } = makeCanvas(16, 256);
  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, "#7ec8e8");
  grad.addColorStop(0.45, "#b8dcc8");
  grad.addColorStop(0.7, "#cfe3b0");
  grad.addColorStop(1, "#dfe8bc");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 16, 256);
  const t = toTexture(c, 1);
  t.wrapS = THREE.ClampToEdgeWrapping;
  t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

/** Jersey back with player name and number, like a sports shirt. */
export function jerseyBackTexture(teamColor: string, name: string, num: string): THREE.CanvasTexture {
  const { c, ctx } = makeCanvas(128, 160);
  ctx.fillStyle = teamColor;
  ctx.fillRect(0, 0, 128, 160);
  // subtle fabric shading
  const grad = ctx.createLinearGradient(0, 0, 0, 160);
  grad.addColorStop(0, "rgba(255,255,255,0.10)");
  grad.addColorStop(1, "rgba(0,0,0,0.18)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 160);
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.textAlign = "center";
  ctx.lineWidth = 3;
  // shrink to fit long names like JIMMY THE FISH
  let size = 34;
  ctx.font = `bold ${size}px Arial`;
  while (ctx.measureText(name).width > 116 && size > 11) {
    size -= 2;
    ctx.font = `bold ${size}px Arial`;
  }
  ctx.textBaseline = "middle";
  ctx.strokeText(name, 64, 38);
  ctx.fillText(name, 64, 38);
  ctx.font = "bold 78px Arial";
  ctx.strokeText(num, 64, 105);
  ctx.fillText(num, 64, 105);
  const t = toTexture(c, 1);
  t.wrapS = THREE.ClampToEdgeWrapping;
  t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

/** Soft radial glow for muzzle flashes and pickups. */
export function glowTexture(): THREE.CanvasTexture {
  const { c, ctx } = makeCanvas(64, 64);
  const grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.4, "rgba(255,255,255,0.5)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  const t = toTexture(c, 1);
  t.wrapS = THREE.ClampToEdgeWrapping;
  t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

/** An emoji rendered onto a transparent sprite texture. */
export function emojiTexture(emoji: string): THREE.CanvasTexture {
  const { c, ctx } = makeCanvas(128, 128);
  ctx.clearRect(0, 0, 128, 128);
  ctx.font = "96px serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(emoji, 64, 72);
  const t = toTexture(c, 1);
  t.wrapS = THREE.ClampToEdgeWrapping;
  t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

/** Frond/leaf texture with alpha for palms and ferns. */
export function frondTexture(color: string): THREE.CanvasTexture {
  const { c, ctx } = makeCanvas(128, 256);
  ctx.clearRect(0, 0, 128, 256);
  ctx.fillStyle = color;
  // central stem
  ctx.fillRect(60, 0, 8, 256);
  // leaflets angled off stem
  for (let y = 8; y < 250; y += 12) {
    const w = 52 * (1 - Math.abs(y - 128) / 300);
    ctx.beginPath();
    ctx.moveTo(64, y);
    ctx.quadraticCurveTo(64 - w, y + 2, 64 - w - 6, y + 14);
    ctx.quadraticCurveTo(64 - w * 0.5, y + 10, 64, y + 8);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(64, y);
    ctx.quadraticCurveTo(64 + w, y + 2, 64 + w + 6, y + 14);
    ctx.quadraticCurveTo(64 + w * 0.5, y + 10, 64, y + 8);
    ctx.fill();
  }
  const t = toTexture(c, 1);
  t.wrapS = THREE.ClampToEdgeWrapping;
  t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}
