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

/** Human face: eyes, brows, mouth on skin tone. */
export function faceTexture(skin: string): THREE.CanvasTexture {
  const { c, ctx } = makeCanvas(128, 128);
  ctx.fillStyle = skin;
  ctx.fillRect(0, 0, 128, 128);
  // eyes
  for (const ex of [44, 84]) {
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.ellipse(ex, 58, 9, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#3a2a1a";
    ctx.beginPath();
    ctx.arc(ex, 58, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(60,40,25,0.9)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(ex - 10, 46);
    ctx.lineTo(ex + 10, 44);
    ctx.stroke();
  }
  // nose + mouth
  ctx.strokeStyle = "rgba(0,0,0,0.25)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(64, 62);
  ctx.lineTo(64, 76);
  ctx.stroke();
  ctx.strokeStyle = "#7a4238";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(64, 86, 12, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();
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
