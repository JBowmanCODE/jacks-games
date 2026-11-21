import { CharacterDef } from "./characters";

export interface DrawCharOptions {
  x: number;
  y: number;
  scale?: number;
  facing?: 1 | -1; // 1 = right, -1 = left
  walkPhase?: number;
  shouting?: boolean;
  wet?: boolean;
  holding?: "none" | "watergun" | "popcorn" | "controller" | "pillow";
  aimAngle?: number;
  blocky?: boolean; // Roblox Rivals blocky avatar mode!
  isPlayer?: boolean;
  showName?: boolean;
  speech?: string;
}

/**
 * Shared HTML5 Canvas renderer for all 5 Rival Boys characters.
 * Preserves every exact visual trait:
 * - JackB: light brown hair in a mullet
 * - JackY: dark brown hair, a bit curly
 * - Harrison: blonde hair
 * - Ryan: dark skin + short black hair in a side parting
 * - Emma: shortest (heightScale 0.80) + dark brown hair with a bob and fringe
 */
export function drawCharacter(
  ctx: CanvasRenderingContext2D,
  c: CharacterDef,
  opts: DrawCharOptions
) {
  const {
    x,
    y,
    scale = 1,
    facing = 1,
    walkPhase = 0,
    shouting = false,
    wet = false,
    holding = "none",
    aimAngle = 0,
    blocky = false,
    isPlayer = false,
    showName = true,
    speech,
  } = opts;

  const s = scale * c.heightScale;
  const bob = Math.abs(Math.sin(walkPhase)) * 3.5;
  const legSwing = Math.sin(walkPhase) * 6;

  ctx.save();
  ctx.translate(x, y);

  // Ground shadow
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.beginPath();
  ctx.ellipse(0, 2, 16 * s, 6 * s, 0, 0, Math.PI * 2);
  ctx.fill();

  // Player ring highlight
  if (isPlayer) {
    ctx.strokeStyle = "#fde047";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(0, 2, 20 * s, 8 * s, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.save();
  ctx.translate(0, -bob);
  ctx.scale(s, s);

  // Legs
  ctx.fillStyle = c.shortsColor;
  ctx.strokeStyle = "#111827";
  ctx.lineWidth = 2;
  // Left leg
  ctx.beginPath();
  ctx.roundRect(-10, -18 + legSwing * 0.4, 8, 16, blocky ? 1 : 3);
  ctx.fill();
  ctx.stroke();
  // Right leg
  ctx.beginPath();
  ctx.roundRect(2, -18 - legSwing * 0.4, 8, 16, blocky ? 1 : 3);
  ctx.fill();
  ctx.stroke();

  // Shoes
  ctx.fillStyle = c.shoeColor;
  ctx.beginPath();
  ctx.roundRect(-11, -5 + legSwing * 0.4, 10, 5, 2);
  ctx.roundRect(1, -5 - legSwing * 0.4, 10, 5, 2);
  ctx.fill();
  ctx.stroke();

  // Back hair behind body (Mullet tail for JackB, Bob for Emma)
  if (c.hairStyle === "mullet") {
    ctx.fillStyle = c.hairColor;
    ctx.strokeStyle = "#5c3d22";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    // Mullet flows out behind head & down past neck!
    if (facing === 1) {
      ctx.moveTo(-14, -47);
      ctx.quadraticCurveTo(-22, -37, -18, -26);
      ctx.lineTo(-6, -30);
      ctx.lineTo(-4, -47);
    } else {
      ctx.moveTo(14, -47);
      ctx.quadraticCurveTo(22, -37, 18, -26);
      ctx.lineTo(6, -30);
      ctx.lineTo(4, -47);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (c.hairStyle === "bobfringe") {
    ctx.fillStyle = c.hairColor;
    ctx.strokeStyle = "#1f1109";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.roundRect(-16, -53, 32, 22, 8);
    ctx.fill();
    ctx.stroke();
  }

  // Torso (Hoodie / Roblox blocky torso)
  ctx.fillStyle = c.shirtColor;
  ctx.strokeStyle = "#111827";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(-13, -38, 26, 22, blocky ? 2 : 6);
  ctx.fill();
  ctx.stroke();

  // Hoodie accent stripe
  ctx.fillStyle = c.shirtAccent;
  ctx.fillRect(-12, -26, 24, 5);

  // Arms
  ctx.fillStyle = c.shirtColor;
  ctx.beginPath();
  ctx.roundRect(-18, -36 - legSwing * 0.3, 6, 15, blocky ? 1 : 3);
  ctx.roundRect(12, -36 + legSwing * 0.3, 6, 15, blocky ? 1 : 3);
  ctx.fill();
  ctx.stroke();

  // Head (blocky in Roblox mode, round normally)
  ctx.fillStyle = c.skinColor;
  ctx.strokeStyle = "#111827";
  ctx.lineWidth = 2;
  ctx.beginPath();
  if (blocky) {
    ctx.roundRect(-13, -64, 26, 26, 4);
  } else {
    ctx.arc(0, -51, 14, 0, Math.PI * 2);
  }
  ctx.fill();
  ctx.stroke();

  // Face
  const eyeShift = facing * 2.5;
  ctx.fillStyle = "#111827";
  ctx.beginPath();
  ctx.arc(-4.5 + eyeShift, -51, 2.2, 0, Math.PI * 2);
  ctx.arc(4.5 + eyeShift, -51, 2.2, 0, Math.PI * 2);
  ctx.fill();

  // Mouth
  if (shouting) {
    ctx.fillStyle = "#991b1b";
    ctx.beginPath();
    ctx.ellipse(eyeShift, -43.5, 5, 4.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#111827";
    ctx.lineWidth = 1.4;
    ctx.stroke();
    // Comic shout lines!
    ctx.strokeStyle = "#fde047";
    ctx.lineWidth = 2;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(facing * 16, -50 + i * 7);
      ctx.lineTo(facing * 23, -50 + i * 11);
      ctx.stroke();
    }
  } else {
    ctx.strokeStyle = "#111827";
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(eyeShift, -46, 4, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
  }

  // Front Hair — faithful for each character!
  drawHairTop(ctx, c, facing, blocky);

  // Held item
  if (holding === "watergun") {
    ctx.save();
    ctx.translate(0, -29);
    ctx.rotate(aimAngle);
    // Super soaker body
    ctx.fillStyle = c.watergunColor;
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.roundRect(6, -5, 22, 9, 3);
    ctx.fill();
    ctx.stroke();
    // Water tank on top
    ctx.fillStyle = "#38bdf8";
    ctx.beginPath();
    ctx.roundRect(10, -10, 12, 6, 3);
    ctx.fill();
    ctx.stroke();
    // Nozzle
    ctx.fillStyle = c.watergunAccent;
    ctx.fillRect(27, -3, 5, 5);
    ctx.restore();
  } else if (holding === "popcorn") {
    ctx.fillStyle = "#dc2626";
    ctx.strokeStyle = "#111827";
    ctx.lineWidth = 1.4;
    ctx.fillRect(facing * 8 - 5, -31, 10, 11);
    ctx.strokeRect(facing * 8 - 5, -31, 10, 11);
    ctx.fillStyle = "#fef08a";
    ctx.beginPath();
    ctx.arc(facing * 8 - 2, -33, 3, 0, Math.PI * 2);
    ctx.arc(facing * 8 + 2, -34, 3, 0, Math.PI * 2);
    ctx.arc(facing * 8, -32, 3, 0, Math.PI * 2);
    ctx.fill();
  } else if (holding === "controller") {
    ctx.fillStyle = "#1e293b";
    ctx.strokeStyle = "#94a3b8";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.roundRect(-8, -30, 16, 8, 3);
    ctx.fill();
    ctx.stroke();
  } else if (holding === "pillow") {
    ctx.fillStyle = "#f8fafc";
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(facing * 10 - 7, -38, 15, 13, 4);
    ctx.fill();
    ctx.stroke();
  }

  // Wet droplets if splashed
  if (wet) {
    ctx.fillStyle = "#38bdf8";
    for (let i = 0; i < 4; i++) {
      const dx = Math.sin(walkPhase * 2 + i * 1.9) * 11;
      const dy = -56 + ((walkPhase * 12 + i * 14) % 44);
      ctx.beginPath();
      ctx.arc(dx, dy, 2.3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore(); // end body scale/bob

  // Name tag
  if (showName) {
    ctx.font = "bold 11px 'Segoe UI', sans-serif";
    ctx.textAlign = "center";
    const label = c.name;
    const w = ctx.measureText(label).width + 10;
    ctx.fillStyle = isPlayer ? "rgba(250, 204, 21, 0.92)" : "rgba(15, 23, 42, 0.82)";
    ctx.beginPath();
    ctx.roundRect(-w / 2, 7, w, 15, 6);
    ctx.fill();
    ctx.fillStyle = isPlayer ? "#111827" : "#f8fafc";
    ctx.fillText(label, 0, 18);
  }

  // Speech bubble
  if (speech) {
    drawSpeechBubble(ctx, 0, -78 * s, speech, shouting);
  }

  ctx.restore();
}

export function drawHairTop(
  ctx: CanvasRenderingContext2D,
  c: CharacterDef,
  facing: 1 | -1,
  blocky = false
) {
  ctx.save();
  if (c.hairStyle === "mullet") {
    // JackB: Light brown short top + front sweep
    ctx.fillStyle = c.hairColor;
    ctx.strokeStyle = "#5c3d22";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(0, -55, 14.5, Math.PI * 0.95, Math.PI * 2.05);
    ctx.lineTo(13, -53);
    ctx.quadraticCurveTo(0, -60, -13, -53);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Side mullet fluff
    ctx.beginPath();
    ctx.moveTo(-facing * 12, -55);
    ctx.quadraticCurveTo(-facing * 20, -45, -facing * 16, -33);
    ctx.lineTo(-facing * 9, -42);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (c.hairStyle === "curly") {
    // JackY: Dark brown bouncy curls
    ctx.fillStyle = c.hairColor;
    ctx.strokeStyle = "#23140b";
    ctx.lineWidth = 1.4;
    const curls = [
      [-11, -58, 6.2],
      [-5, -63, 6.8],
      [3, -64, 7],
      [10, -59, 6.2],
      [13, -53, 4.5],
      [-13, -53, 4.5],
    ];
    for (const [cx, cy, r] of curls) {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  } else if (c.hairStyle === "blonde") {
    // Harrison: Golden blonde sporty swoop
    ctx.fillStyle = c.hairColor;
    ctx.strokeStyle = "#b78a14";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-14, -52);
    ctx.quadraticCurveTo(-15, -69, 2, -68);
    ctx.quadraticCurveTo(16, -67, 15, -52);
    ctx.quadraticCurveTo(5, -58, -3, -56);
    ctx.quadraticCurveTo(-10, -58, -14, -52);
    ctx.fill();
    ctx.stroke();
    // Bright highlight streak
    ctx.strokeStyle = c.hairHighlight;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-7, -62);
    ctx.quadraticCurveTo(2, -65, 9, -60);
    ctx.stroke();
  } else if (c.hairStyle === "sidepart") {
    // Ryan: Short black hair with crisp visible side parting
    ctx.fillStyle = c.hairColor;
    ctx.strokeStyle = "#050507";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    if (blocky) {
      ctx.roundRect(-13.5, -66, 27, 11, 3);
    } else {
      ctx.arc(0, -55, 14, Math.PI * 0.96, Math.PI * 2.04);
      ctx.lineTo(13, -55);
      ctx.quadraticCurveTo(0, -59, -13, -55);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Clear side part line!
    ctx.strokeStyle = c.skinColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-6, -65);
    ctx.lineTo(-7, -56);
    ctx.stroke();
  } else if (c.hairStyle === "bobfringe") {
    // Emma: Dark brown bob + straight fringe across forehead
    ctx.fillStyle = c.hairColor;
    ctx.strokeStyle = "#1f1109";
    ctx.lineWidth = 1.5;
    // Top cap + straight fringe
    ctx.beginPath();
    ctx.arc(0, -53, 15, Math.PI, Math.PI * 2);
    ctx.lineTo(15, -53);
    ctx.lineTo(-15, -53);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Side bob pieces hugging cheeks
    ctx.fillRect(-15, -53, 4.5, 16);
    ctx.fillRect(10.5, -53, 4.5, 16);
    // Straight fringe across forehead
    ctx.fillRect(-12, -57, 24, 5.5);
  }
  ctx.restore();
}

/**
 * Draw a sleeping boy horizontally under a blanket/sleeping bag (used in Living Room Sleepover!).
 * Shows their exact head, hair, skin tone, sleeping eyes (or sneaking awake eyes!), blanket & pillow.
 */
export function drawSleepingBoy(
  ctx: CanvasRenderingContext2D,
  c: CharacterDef,
  opts: {
    x: number;
    y: number;
    blanketColor: string;
    awake: boolean;
    activity?: "none" | "popcorn" | "roblox" | "pillow" | "shout";
    snorePhase: number;
    speech?: string;
  }
) {
  const { x, y, blanketColor, awake, activity = "none", snorePhase, speech } = opts;
  ctx.save();
  ctx.translate(x, y);

  // Pillow under head (left side)
  ctx.fillStyle = "#f1f5f9";
  ctx.strokeStyle = "#94a3b8";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(-54, -18, 30, 30, 8);
  ctx.fill();
  ctx.stroke();

  // Blanket / sleeping bag covering torso & legs (right side)
  const breathe = Math.sin(snorePhase) * 1.8;
  ctx.fillStyle = blanketColor;
  ctx.strokeStyle = "#0f172a";
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.roundRect(-22, -16 - breathe * 0.5, 76, 30 + breathe, 12);
  ctx.fill();
  ctx.stroke();

  // Blanket fold stripe
  ctx.fillStyle = "rgba(255,255,255,0.22)";
  ctx.fillRect(-20, -14, 12, 26);

  // Head resting on pillow
  ctx.save();
  ctx.translate(-36, -3);
  if (awake) {
    ctx.translate(0, -6); // pops head up slightly when awake!
  }

  // Back mullet for JackB peeking on pillow
  if (c.hairStyle === "mullet") {
    ctx.fillStyle = c.hairColor;
    ctx.beginPath();
    ctx.ellipse(-10, 4, 10, 7, 0.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Face circle
  ctx.fillStyle = c.skinColor;
  ctx.strokeStyle = "#111827";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Hair on top of head (shifted into head-local coords where center is 0,0 instead of 0,-51)
  ctx.save();
  ctx.translate(0, 51);
  drawHairTop(ctx, c, 1, false);
  ctx.restore();

  // Eyes (closed sleeping vs wide awake!)
  if (awake) {
    ctx.fillStyle = "#111827";
    ctx.beginPath();
    ctx.arc(-4, 0, 2.3, 0, Math.PI * 2);
    ctx.arc(5, 0, 2.3, 0, Math.PI * 2);
    ctx.fill();
    // Grin / shout mouth
    if (activity === "shout") {
      ctx.fillStyle = "#991b1b";
      ctx.beginPath();
      ctx.ellipse(0.5, 7, 4.5, 3.8, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.strokeStyle = "#111827";
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(0.5, 5, 4, 0.1 * Math.PI, 0.9 * Math.PI);
      ctx.stroke();
    }
  } else {
    ctx.strokeStyle = "#111827";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-7, 0);
    ctx.quadraticCurveTo(-4, 3, -1, 0);
    ctx.moveTo(2, 0);
    ctx.quadraticCurveTo(5, 3, 8, 0);
    ctx.stroke();
    // Little snoring "o" mouth
    ctx.fillStyle = "#7f1d1d";
    ctx.beginPath();
    ctx.arc(1, 6.5, 2 + Math.abs(Math.sin(snorePhase)) * 1.3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Secret midnight activity props!
  if (awake && activity === "roblox") {
    // Glowing phone under blanket!
    ctx.fillStyle = "rgba(56, 189, 248, 0.35)";
    ctx.beginPath();
    ctx.arc(-10, -18, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#38bdf8";
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 1.5;
    ctx.fillRect(-16, -24, 12, 8);
    ctx.strokeRect(-16, -24, 12, 8);
  } else if (awake && activity === "popcorn") {
    ctx.fillStyle = "#fef08a";
    ctx.beginPath();
    ctx.arc(-12, -18, 4, 0, Math.PI * 2);
    ctx.arc(-6, -20, 4, 0, Math.PI * 2);
    ctx.arc(-9, -15, 4, 0, Math.PI * 2);
    ctx.fill();
  } else if (awake && activity === "pillow") {
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#94a3b8";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(-14, -30, 18, 14, 5);
    ctx.fill();
    ctx.stroke();
  }

  // Floating Zzz when asleep
  if (!awake) {
    const zOffset = (snorePhase * 7) % 24;
    ctx.font = "bold 13px 'Segoe UI', sans-serif";
    ctx.fillStyle = `rgba(199, 210, 254, ${1 - zOffset / 26})`;
    ctx.fillText("Z", -36 + zOffset * 0.4, -22 - zOffset);
    ctx.font = "bold 10px 'Segoe UI', sans-serif";
    ctx.fillText("z", -26 + zOffset * 0.5, -14 - zOffset * 0.8);
  }

  // Name badge
  ctx.font = "bold 11px 'Segoe UI', sans-serif";
  ctx.textAlign = "center";
  const w = ctx.measureText(c.name).width + 12;
  ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
  ctx.beginPath();
  ctx.roundRect(-w / 2 + 8, 18, w, 16, 6);
  ctx.fill();
  ctx.fillStyle = "#f8fafc";
  ctx.fillText(c.name, 8, 30);

  if (speech) {
    drawSpeechBubble(ctx, -18, -36, speech, activity === "shout");
  }

  ctx.restore();
}

export function drawSpeechBubble(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  text: string,
  isShout = false
) {
  ctx.save();
  ctx.font = isShout
    ? "900 12px 'Segoe UI', sans-serif"
    : "bold 11px 'Segoe UI', sans-serif";
  const padX = 10;
  const textW = ctx.measureText(text).width;
  const w = Math.max(46, textW + padX * 2);
  const h = 24;

  ctx.fillStyle = isShout ? "#fef08a" : "#ffffff";
  ctx.strokeStyle = isShout ? "#dc2626" : "#0f172a";
  ctx.lineWidth = isShout ? 2.5 : 1.8;

  ctx.beginPath();
  ctx.roundRect(x - w / 2, y - h, w, h, isShout ? 6 : 10);
  ctx.fill();
  ctx.stroke();

  // Tail
  ctx.beginPath();
  ctx.moveTo(x - 5, y);
  ctx.lineTo(x, y + 7);
  ctx.lineTo(x + 5, y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = isShout ? "#991b1b" : "#0f172a";
  ctx.textAlign = "center";
  ctx.fillText(text, x, y - 8);
  ctx.restore();
}
