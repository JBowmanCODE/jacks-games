"use client";

import { useEffect, useRef, useState, useCallback } from "react";

// ═══════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════
const GW = 960, GH = 560;
const PR = 15;
const GAME_SECS = 150;
const PICKUP_RESPAWN = 14000;
const RESPAWN_MS = 4500;
const P_SPEED = 2.9;
const B_SPEED = 2.0;
const ZONE_R = 54;

const PAINT = ["#ef4444","#f97316","#eab308","#22c55e","#3b82f6","#a855f7","#ec4899","#14b8a6"];

type WpnKey = "pistol"|"shotgun"|"smg"|"sniper";
const WPNS: Record<WpnKey,{name:string;dmg:number;spd:number;spread:number;rate:number;ammo:number;pellets:number}> = {
  pistol:  {name:"Pistol",  dmg:28, spd:9,  spread:.07, rate:350,  ammo:12, pellets:1},
  shotgun: {name:"Shotgun", dmg:20, spd:7,  spread:.32, rate:900,  ammo:6,  pellets:5},
  smg:     {name:"SMG",     dmg:13, spd:10, spread:.13, rate:110,  ammo:30, pellets:1},
  sniper:  {name:"Sniper",  dmg:90, spd:19, spread:.01, rate:1500, ammo:5,  pellets:1},
};

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════
type Team = "blue"|"red";
type V2 = {x:number;y:number};
type Wall = {x:number;y:number;w:number;h:number};

interface Entity {
  id:number; pos:V2; vel:V2; team:Team; hp:number;
  wpn:WpnKey; ammo:number; lastShot:number;
  pg:number; sg:number; lastG:number;
  isPlayer:boolean; deadUntil:number; angle:number; ink:string;
  btgt?:V2; bstate?:"patrol"|"attack"|"capture";
}
interface Bullet {id:number;pos:V2;vel:V2;team:Team;dmg:number;ink:string;life:number;spd:number;}
interface Grenade {id:number;pos:V2;vel:V2;team:Team;type:"paint"|"smoke";explodeAt:number;color:string;}
interface Splat {id:number;pos:V2;r:number;color:string;alpha:number;}
interface Smoke {id:number;pos:V2;r:number;endAt:number;}
interface Zone {id:string;pos:V2;label:string;owner:Team|null;cap:number;capTeam:Team|null;}
interface Pickup {id:number;pos:V2;kind:"health"|"ammo"|WpnKey|"pg"|"sg";avail:boolean;respawnAt:number;}
interface Particle {id:number;pos:V2;vel:V2;r:number;color:string;alpha:number;life:number;}

// ═══════════════════════════════════════════════════════════════════
// MAP
// ═══════════════════════════════════════════════════════════════════
// Minimal cover — open arena feel, nowhere to hide for long
const WALLS: Wall[] = [
  {x:0,y:0,w:GW,h:16},{x:0,y:GH-16,w:GW,h:16},{x:0,y:0,w:16,h:GH},{x:GW-16,y:0,w:16,h:GH},
  // Small symmetric cover boxes only
  {x:230,y:155,w:65,h:40},                          // left-top cover
  {x:230,y:GH-195,w:65,h:40},                       // left-bottom cover
  {x:GW-295,y:155,w:65,h:40},                       // right-top cover
  {x:GW-295,y:GH-195,w:65,h:40},                    // right-bottom cover
  // Centre cross (small)
  {x:GW/2-90,y:GH/2-18,w:180,h:36},                // horizontal bar
  {x:GW/2-18,y:GH/2-70,w:36,h:140},                // vertical bar
];

const ZONES: Zone[] = [
  {id:"A",pos:{x:220,y:GH/2},label:"A",owner:null,cap:0,capTeam:null},
  {id:"B",pos:{x:GW/2,y:GH/2},label:"B",owner:null,cap:0,capTeam:null},
  {id:"C",pos:{x:GW-220,y:GH/2},label:"C",owner:null,cap:0,capTeam:null},
];
const BS: V2[] = [{x:58,y:200},{x:58,y:280},{x:58,y:360},{x:80,y:150},{x:80,y:410}];
const RS: V2[] = [{x:GW-58,y:200},{x:GW-58,y:280},{x:GW-58,y:360},{x:GW-80,y:150},{x:GW-80,y:410}];

const PKUPS: Pickup[] = [
  {id:1,pos:{x:GW/2,y:120},kind:"health",avail:true,respawnAt:0},
  {id:2,pos:{x:GW/2,y:GH-120},kind:"health",avail:true,respawnAt:0},
  {id:3,pos:{x:330,y:GH/2},kind:"ammo",avail:true,respawnAt:0},
  {id:4,pos:{x:GW-330,y:GH/2},kind:"ammo",avail:true,respawnAt:0},
  {id:5,pos:{x:180,y:130},kind:"shotgun",avail:true,respawnAt:0},
  {id:6,pos:{x:GW-180,y:130},kind:"smg",avail:true,respawnAt:0},
  {id:7,pos:{x:180,y:GH-130},kind:"sniper",avail:true,respawnAt:0},
  {id:8,pos:{x:GW-180,y:GH-130},kind:"sniper",avail:true,respawnAt:0},
  {id:9,pos:{x:GW/2,y:GH/2-90},kind:"pg",avail:true,respawnAt:0},
  {id:10,pos:{x:GW/2,y:GH/2+90},kind:"sg",avail:true,respawnAt:0},
  {id:11,pos:{x:200,y:GH/2},kind:"pg",avail:true,respawnAt:0},
  {id:12,pos:{x:GW-200,y:GH/2},kind:"sg",avail:true,respawnAt:0},
];

// ═══════════════════════════════════════════════════════════════════
// PURE HELPERS
// ═══════════════════════════════════════════════════════════════════
let _uid = 200;
const uid = () => ++_uid;

const dist2 = (a:V2,b:V2) => (a.x-b.x)**2+(a.y-b.y)**2;
const dist  = (a:V2,b:V2) => Math.sqrt(dist2(a,b));
const norm  = (v:V2):V2 => {const l=Math.sqrt(v.x*v.x+v.y*v.y);return l>0?{x:v.x/l,y:v.y/l}:{x:0,y:0};};

function cHitsW(cx:number,cy:number,r:number,w:Wall):boolean {
  const nx=Math.max(w.x,Math.min(cx,w.x+w.w));
  const ny=Math.max(w.y,Math.min(cy,w.y+w.h));
  return (cx-nx)**2+(cy-ny)**2 < r*r;
}
function moveW(pos:V2,vel:V2,r:number):V2 {
  let nx=pos.x+vel.x,ny=pos.y;
  for(const w of WALLS) if(cHitsW(nx,ny,r,w)) nx=vel.x>0?w.x-r:w.x+w.w+r;
  ny=pos.y+vel.y;
  for(const w of WALLS) if(cHitsW(nx,ny,r,w)) ny=vel.y>0?w.y-r:w.y+w.h+r;
  return {x:Math.max(r+16,Math.min(GW-r-16,nx)),y:Math.max(r+16,Math.min(GH-r-16,ny))};
}
function los(a:V2,b:V2):boolean {
  const dx=b.x-a.x,dy=b.y-a.y,steps=Math.ceil(Math.sqrt(dx*dx+dy*dy)/10);
  for(let i=1;i<steps;i++){const px=a.x+dx*(i/steps),py=a.y+dy*(i/steps);for(const w of WALLS) if(px>=w.x&&px<=w.x+w.w&&py>=w.y&&py<=w.y+w.h) return false;}
  return true;
}

function mkEntity(team:Team,idx:number,isPlayer:boolean):Entity {
  const sp=(team==="blue"?BS:RS)[idx%5];
  return {id:uid(),pos:{...sp},vel:{x:0,y:0},team,hp:100,wpn:"pistol",ammo:12,lastShot:0,pg:2,sg:1,lastG:0,isPlayer,deadUntil:0,angle:isPlayer?0:Math.PI,ink:PAINT[Math.floor(Math.random()*PAINT.length)],bstate:"capture"};
}

// ═══════════════════════════════════════════════════════════════════
// ADVANCED DRAW HELPERS
// ═══════════════════════════════════════════════════════════════════
function drawSplat(ctx:CanvasRenderingContext2D,s:Splat){
  ctx.save();
  ctx.globalAlpha=s.alpha;
  ctx.translate(s.pos.x,s.pos.y);
  ctx.fillStyle=s.color;
  const n=8, seed=s.id*0.37;
  ctx.beginPath();
  for(let i=0;i<n;i++){
    const a=(i/n)*Math.PI*2;
    const r=s.r*(0.6+0.4*Math.abs(Math.sin(seed+i*2.3)));
    const cx=Math.cos(a)*r, cy=Math.sin(a)*r;
    if(i===0) ctx.moveTo(cx,cy);
    else {
      const pa=((i-1)/n)*Math.PI*2;
      const pr=s.r*(0.6+0.4*Math.abs(Math.sin(seed+(i-1)*2.3)));
      ctx.bezierCurveTo(Math.cos(pa)*pr*1.15,Math.sin(pa)*pr*1.15,Math.cos(a)*r*1.15,Math.sin(a)*r*1.15,cx,cy);
    }
  }
  ctx.closePath(); ctx.fill();
  for(let i=0;i<4;i++){
    const a=seed+i*1.7, d=s.r*(0.9+0.35*Math.sin(seed+i*3));
    const dr=s.r*0.18*(0.4+0.6*Math.abs(Math.cos(seed+i*2)));
    ctx.beginPath(); ctx.ellipse(Math.cos(a)*d,Math.sin(a)*d,dr,dr*1.6,a,0,Math.PI*2); ctx.fill();
  }
  ctx.restore();
}

function drawEntity(ctx:CanvasRenderingContext2D,e:Entity,now:number){
  const {pos,angle,team,ink,isPlayer,hp,wpn,lastShot}=e;
  const tc=team==="blue"?"#2563eb":"#dc2626";
  const tl=team==="blue"?"#93c5fd":"#fca5a5";
  const gunLen=wpn==="sniper"?22:wpn==="shotgun"?14:18;

  // Drop shadow
  ctx.save();
  ctx.globalAlpha=0.35;
  ctx.fillStyle="#000";
  ctx.beginPath(); ctx.ellipse(pos.x+3,pos.y+5,PR*0.95,PR*0.6,0,0,Math.PI*2); ctx.fill();
  ctx.restore();

  // Body gradient
  const bg=ctx.createRadialGradient(pos.x-PR*0.35,pos.y-PR*0.35,0,pos.x,pos.y,PR);
  bg.addColorStop(0,tl); bg.addColorStop(1,tc);
  ctx.shadowColor=tc; ctx.shadowBlur=isPlayer?18:10;
  ctx.fillStyle=bg; ctx.beginPath(); ctx.arc(pos.x,pos.y,PR,0,Math.PI*2); ctx.fill();
  ctx.shadowBlur=0;

  // Ink paint splatter on body
  ctx.globalAlpha=0.6; ctx.fillStyle=ink;
  ctx.beginPath();
  ctx.arc(pos.x+Math.cos(angle+1.8)*5,pos.y+Math.sin(angle+1.8)*5,5,0,Math.PI*2); ctx.fill();
  ctx.beginPath();
  ctx.arc(pos.x+Math.cos(angle-2.1)*4,pos.y+Math.sin(angle-2.1)*4,3.5,0,Math.PI*2); ctx.fill();
  ctx.globalAlpha=1;

  // Helmet
  const hx=pos.x+Math.cos(angle)*4, hy=pos.y+Math.sin(angle)*4;
  ctx.fillStyle="#111827"; ctx.beginPath(); ctx.arc(hx,hy,PR*0.58,0,Math.PI*2); ctx.fill();

  // Visor arc (glowing)
  ctx.strokeStyle=tl+"ee"; ctx.lineWidth=3; ctx.shadowColor=tl; ctx.shadowBlur=8;
  ctx.beginPath(); ctx.arc(hx,hy,PR*0.42,angle-0.65,angle+0.65); ctx.stroke();
  ctx.shadowBlur=0;

  // Gun
  const gsx=pos.x+Math.cos(angle)*6, gsy=pos.y+Math.sin(angle)*6;
  const gex=gsx+Math.cos(angle)*gunLen, gey=gsy+Math.sin(angle)*gunLen;
  // Gun body
  ctx.strokeStyle="#1f2937"; ctx.lineWidth=wpn==="sniper"?4:wpn==="shotgun"?6:5; ctx.lineCap="round";
  ctx.beginPath(); ctx.moveTo(gsx,gsy); ctx.lineTo(gex,gey); ctx.stroke();
  ctx.strokeStyle="#374151"; ctx.lineWidth=wpn==="sniper"?2:wpn==="shotgun"?4:3;
  ctx.beginPath(); ctx.moveTo(gsx,gsy); ctx.lineTo(gex,gey); ctx.stroke();

  // Muzzle flash
  if(now-lastShot<90){
    const f=1-(now-lastShot)/90;
    ctx.save(); ctx.globalAlpha=f*0.9; ctx.shadowColor="#fff"; ctx.shadowBlur=16;
    const cols=wpn==="shotgun"?["#f97316","#fbbf24"]:["#fff","#fde68a"];
    ctx.fillStyle=cols[0]; ctx.beginPath(); ctx.arc(gex,gey,6*f,0,Math.PI*2); ctx.fill();
    ctx.fillStyle=cols[1]; ctx.beginPath(); ctx.arc(gex,gey,3*f,0,Math.PI*2); ctx.fill();
    // Flash star
    ctx.strokeStyle=cols[0]; ctx.lineWidth=1.5;
    for(let i=0;i<6;i++){const a=i*Math.PI/3;ctx.beginPath();ctx.moveTo(gex,gey);ctx.lineTo(gex+Math.cos(a)*10*f,gey+Math.sin(a)*10*f);ctx.stroke();}
    ctx.restore();
  }

  // Health bar
  const bw=PR*2.4, bh=4, bx=pos.x-bw/2, by=pos.y-PR-11;
  ctx.fillStyle="#000000aa"; ctx.fillRect(bx-1,by-1,bw+2,bh+2);
  const hc=hp>60?"#22c55e":hp>30?"#eab308":"#ef4444";
  ctx.fillStyle="#1f2937"; ctx.fillRect(bx,by,bw,bh);
  const hg=ctx.createLinearGradient(bx,by,bx+bw*(hp/100),by);
  hg.addColorStop(0,hc); hg.addColorStop(1,hc+"aa");
  ctx.fillStyle=hg; ctx.fillRect(bx,by,bw*(hp/100),bh);

  // YOU label
  if(isPlayer){
    ctx.fillStyle="#fff"; ctx.font="bold 10px 'Courier New'"; ctx.textAlign="center";
    ctx.shadowColor="#000"; ctx.shadowBlur=4;
    ctx.fillText("YOU",pos.x,pos.y-PR-14);
    ctx.shadowBlur=0; ctx.textAlign="left";
  }

  ctx.lineCap="butt";
}

function drawBullet(ctx:CanvasRenderingContext2D,b:Bullet){
  const s=Math.sqrt(b.vel.x**2+b.vel.y**2);
  const nx=s>0?b.vel.x/s:0, ny=s>0?b.vel.y/s:0;
  const tlen=14;
  // Trail
  const tg=ctx.createLinearGradient(b.pos.x,b.pos.y,b.pos.x-nx*tlen,b.pos.y-ny*tlen);
  tg.addColorStop(0,b.ink+"dd"); tg.addColorStop(1,b.ink+"00");
  ctx.strokeStyle=tg; ctx.lineWidth=3; ctx.lineCap="round";
  ctx.beginPath(); ctx.moveTo(b.pos.x,b.pos.y); ctx.lineTo(b.pos.x-nx*tlen,b.pos.y-ny*tlen); ctx.stroke();
  // Head
  ctx.shadowColor=b.ink; ctx.shadowBlur=10;
  ctx.fillStyle="#fff"; ctx.beginPath(); ctx.arc(b.pos.x,b.pos.y,3.5,0,Math.PI*2); ctx.fill();
  ctx.fillStyle=b.ink; ctx.beginPath(); ctx.arc(b.pos.x,b.pos.y,2,0,Math.PI*2); ctx.fill();
  ctx.shadowBlur=0; ctx.lineCap="butt";
}

function drawWall(ctx:CanvasRenderingContext2D,w:Wall){
  // Shadow
  ctx.fillStyle="rgba(0,0,0,0.45)"; ctx.fillRect(w.x+4,w.y+4,w.w,w.h);
  // Main face
  const wg=ctx.createLinearGradient(w.x,w.y,w.x,w.y+w.h);
  wg.addColorStop(0,"#374151"); wg.addColorStop(1,"#1f2937");
  ctx.fillStyle=wg; ctx.fillRect(w.x,w.y,w.w,w.h);
  // Top highlight
  ctx.fillStyle="#4b5563"; ctx.fillRect(w.x,w.y,w.w,3);
  // Left highlight
  ctx.fillStyle="#4b5563aa"; ctx.fillRect(w.x,w.y,3,w.h);
  // Bottom & right dark edge
  ctx.fillStyle="#111827"; ctx.fillRect(w.x,w.y+w.h-2,w.w,2);
  ctx.fillRect(w.x+w.w-2,w.y,2,w.h);
}

function drawZone(ctx:CanvasRenderingContext2D,z:Zone,now:number){
  const col=z.owner==="blue"?"#3b82f6":z.owner==="red"?"#ef4444":"#6b7280";
  const pulse=Math.sin(now/500)*0.15+0.85;

  // Outer glow ring
  ctx.save();
  ctx.globalAlpha=0.18*pulse;
  ctx.fillStyle=col;
  ctx.beginPath(); ctx.arc(z.pos.x,z.pos.y,ZONE_R+10*pulse,0,Math.PI*2); ctx.fill();
  ctx.restore();

  // Floor fill
  ctx.globalAlpha=0.22;
  const zg=ctx.createRadialGradient(z.pos.x,z.pos.y,0,z.pos.x,z.pos.y,ZONE_R);
  zg.addColorStop(0,col+"99"); zg.addColorStop(1,col+"00");
  ctx.fillStyle=zg; ctx.beginPath(); ctx.arc(z.pos.x,z.pos.y,ZONE_R,0,Math.PI*2); ctx.fill();
  ctx.globalAlpha=1;

  // Border ring
  ctx.strokeStyle=col; ctx.lineWidth=2.5;
  ctx.beginPath(); ctx.arc(z.pos.x,z.pos.y,ZONE_R,0,Math.PI*2); ctx.stroke();

  // Capture progress arc
  if(z.capTeam&&z.cap>0&&z.cap<100){
    const prog=z.capTeam==="blue"?z.cap/100:1-z.cap/100;
    const cc=z.capTeam==="blue"?"#60a5fa":"#f87171";
    ctx.shadowColor=cc; ctx.shadowBlur=8;
    ctx.strokeStyle=cc; ctx.lineWidth=5;
    ctx.beginPath(); ctx.arc(z.pos.x,z.pos.y,ZONE_R+3,-Math.PI/2,-Math.PI/2+prog*Math.PI*2); ctx.stroke();
    ctx.shadowBlur=0;
    // Scan line while capturing
    const scanA=(now/600)%( Math.PI*2);
    ctx.globalAlpha=0.3; ctx.strokeStyle=cc; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(z.pos.x,z.pos.y); ctx.lineTo(z.pos.x+Math.cos(scanA)*ZONE_R,z.pos.y+Math.sin(scanA)*ZONE_R); ctx.stroke();
    ctx.globalAlpha=1;
  }

  // Label
  ctx.fillStyle="#ffffffee"; ctx.font="bold 16px 'Courier New'"; ctx.textAlign="center";
  ctx.shadowColor="#000"; ctx.shadowBlur=5;
  ctx.fillText(z.label,z.pos.x,z.pos.y+6);
  ctx.shadowBlur=0; ctx.textAlign="left";
}

function drawPickup(ctx:CanvasRenderingContext2D,p:Pickup,now:number){
  const bob=Math.sin(now/600+p.id)*4;
  const cols:Record<string,string>={health:"#22c55e",ammo:"#f59e0b",pistol:"#fbbf24",shotgun:"#f97316",smg:"#60a5fa",sniper:"#a78bfa",pg:"#ec4899",sg:"#9ca3af"};
  const labels:Record<string,string>={health:"HP",ammo:"AMO",pistol:"PST",shotgun:"SHT",smg:"SMG",sniper:"SNP",pg:"PNT",sg:"SMK"};
  const c=cols[p.kind]??"#fff";
  ctx.save(); ctx.translate(p.pos.x,p.pos.y+bob);
  // Glow
  ctx.shadowColor=c; ctx.shadowBlur=16;
  ctx.fillStyle=c+"33"; ctx.beginPath(); ctx.arc(0,0,18,0,Math.PI*2); ctx.fill();
  // Hexagon border
  ctx.strokeStyle=c; ctx.lineWidth=2;
  ctx.beginPath();
  for(let i=0;i<6;i++){const a=i*Math.PI/3-Math.PI/6;if(i===0)ctx.moveTo(Math.cos(a)*17,Math.sin(a)*17);else ctx.lineTo(Math.cos(a)*17,Math.sin(a)*17);}
  ctx.closePath(); ctx.stroke();
  // Label
  ctx.fillStyle=c; ctx.font="bold 9px 'Courier New'"; ctx.textAlign="center"; ctx.shadowBlur=0;
  ctx.fillText(labels[p.kind]??"?",0,4);
  ctx.restore();
}

function drawSmoke(ctx:CanvasRenderingContext2D,s:Smoke,now:number){
  const rem=Math.max(0,(s.endAt-now)/6500);
  for(let i=0;i<4;i++){
    const off=Math.sin(now/800+i*1.6)*12;
    ctx.globalAlpha=0.18*rem;
    const sg=ctx.createRadialGradient(s.pos.x+off,s.pos.y+off*0.5,0,s.pos.x,s.pos.y,s.r*(0.7+i*0.1));
    sg.addColorStop(0,"#d1d5dbcc"); sg.addColorStop(0.6,"#9ca3af88"); sg.addColorStop(1,"#9ca3af00");
    ctx.fillStyle=sg; ctx.beginPath(); ctx.arc(s.pos.x+off,s.pos.y+off*0.5,s.r*(0.7+i*0.1),0,Math.PI*2); ctx.fill();
  }
  ctx.globalAlpha=1;
}

function drawFloor(ctx:CanvasRenderingContext2D){
  // Base dark
  ctx.fillStyle="#0d1117"; ctx.fillRect(0,0,GW,GH);
  // Checker tiles
  for(let tx=0;tx<GW;tx+=48) for(let ty=0;ty<GH;ty+=48){
    ctx.fillStyle=((tx/48+ty/48)%2===0)?"#111826":"#0d1117";
    ctx.fillRect(tx,ty,48,48);
  }
  // Very subtle grid
  ctx.strokeStyle="#1a2233"; ctx.lineWidth=0.5;
  for(let x=0;x<GW;x+=48){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,GH);ctx.stroke();}
  for(let y=0;y<GH;y+=48){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(GW,y);ctx.stroke();}
  // Base areas
  const blG=ctx.createLinearGradient(16,0,130,0);
  blG.addColorStop(0,"#1e40af22"); blG.addColorStop(1,"#1e40af00");
  ctx.fillStyle=blG; ctx.fillRect(16,16,114,GH-32);
  const rdG=ctx.createLinearGradient(GW-130,0,GW-16,0);
  rdG.addColorStop(0,"#7f1d1d00"); rdG.addColorStop(1,"#7f1d1d22");
  ctx.fillStyle=rdG; ctx.fillRect(GW-130,16,114,GH-32);
  // Vignette
  const vig=ctx.createRadialGradient(GW/2,GH/2,GH*0.3,GW/2,GH/2,GH*0.85);
  vig.addColorStop(0,"rgba(0,0,0,0)"); vig.addColorStop(1,"rgba(0,0,0,0.55)");
  ctx.fillStyle=vig; ctx.fillRect(0,0,GW,GH);
}

// ═══════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════
export default function PaintballGame() {
  const cv    = useRef<HTMLCanvasElement>(null);
  const ents  = useRef<Entity[]>([]);
  const bults = useRef<Bullet[]>([]);
  const grenR = useRef<Grenade[]>([]);
  const splts = useRef<Splat[]>([]);
  const smkR  = useRef<Smoke[]>([]);
  const parts  = useRef<Particle[]>([]);
  const zns   = useRef<Zone[]>(ZONES.map(z=>({...z})));
  const pkups = useRef<Pickup[]>(PKUPS.map(p=>({...p})));
  const bScr  = useRef(0);
  const rScr  = useRef(0);
  const tLeft = useRef(GAME_SECS);
  const phase = useRef<"playing"|"bluewon"|"redwon"|"draw">("playing");
  const lastT = useRef(0);
  const scrT  = useRef(0);
  const shake = useRef({mag:0,end:0});
  const keys  = useRef<Record<string,boolean>>({});
  const mpos  = useRef<V2>({x:GW/2,y:GH/2});
  const mdown = useRef(false);
  const raf   = useRef(0);
  const feed  = useRef<string[]>([]);
  const tlJ   = useRef<{id:number;sx:number;sy:number;dx:number;dy:number}|null>(null);
  const trJ   = useRef<{id:number;shooting:boolean}|null>(null);

  const [hud,setHud]=useState({hp:100,ammo:12,wpn:"pistol" as WpnKey,pg:2,sg:1,bScr:0,rScr:0,tLeft:GAME_SECS,phase:"playing" as typeof phase.current,feed:[] as string[]});

  function shoot(e:Entity,angle:number,now:number){
    const w=WPNS[e.wpn];
    if(now-e.lastShot<w.rate||e.ammo<=0) return;
    e.ammo--; e.lastShot=now;
    for(let p=0;p<w.pellets;p++){
      const a=angle+(Math.random()-.5)*w.spread*(p>0?2:1);
      const spd=w.spd;
      bults.current.push({id:uid(),pos:{x:e.pos.x+Math.cos(a)*(PR+2),y:e.pos.y+Math.sin(a)*(PR+2)},vel:{x:Math.cos(a)*spd,y:Math.sin(a)*spd},team:e.team,dmg:w.dmg,ink:e.ink,life:95,spd});
    }
  }
  function throwG(e:Entity,type:"paint"|"smoke",angle:number,now:number){
    if(type==="paint"&&e.pg<=0) return;
    if(type==="smoke"&&e.sg<=0) return;
    if(now-e.lastG<1200) return;
    if(type==="paint") e.pg--; else e.sg--;
    e.lastG=now;
    grenR.current.push({id:uid(),pos:{...e.pos},vel:{x:Math.cos(angle)*3.8,y:Math.sin(angle)*3.8},team:e.team,type,explodeAt:now+(type==="paint"?2000:1700),color:type==="paint"?PAINT[Math.floor(Math.random()*PAINT.length)]:"#9ca3af"});
  }
  function respawn(e:Entity){
    const sp=(e.team==="blue"?BS:RS)[ents.current.filter(en=>en.team===e.team).indexOf(e)%5];
    e.pos={...sp};e.vel={x:0,y:0};e.hp=100;e.deadUntil=0;e.wpn="pistol";e.ammo=12;e.pg=2;e.sg=1;
  }
  function mkFeed(msg:string){feed.current=[msg,...feed.current].slice(0,5);}

  function spawnExplosion(pos:V2,color:string,count=16){
    for(let i=0;i<count;i++){
      const a=Math.random()*Math.PI*2,spd=2+Math.random()*5;
      parts.current.push({id:uid(),pos:{...pos},vel:{x:Math.cos(a)*spd,y:Math.sin(a)*spd},r:2+Math.random()*4,color,alpha:1,life:30+Math.random()*25});
    }
  }

  function botTick(bot:Entity,now:number){
    if(bot.deadUntil>0) return;
    const enemies=ents.current.filter(e=>e.team!==bot.team&&e.deadUntil===0);
    const allies=ents.current.filter(e=>e.team===bot.team&&e.id!==bot.id&&e.deadUntil===0);
    let ne:Entity|null=null,nd=Infinity;
    for(const e of enemies){const d=dist(bot.pos,e.pos);if(d<nd){nd=d;ne=e;}}
    const sortedZ=[...zns.current].sort((a,b)=>{const ap=a.owner!==bot.team?0:1,bp=b.owner!==bot.team?0:1;return ap-bp||(dist(bot.pos,a.pos)-dist(bot.pos,b.pos));});
    const tz=sortedZ[0];
    if(bot.hp<28) bot.bstate="patrol";
    else if(ne&&nd<320) bot.bstate="attack";
    else bot.bstate="capture";
    let tgt:V2=tz?.pos??{x:GW/2,y:GH/2};
    if(bot.bstate==="attack"&&ne) tgt=ne.pos;
    else if(bot.bstate==="patrol"&&ne){const n=norm({x:bot.pos.x-ne.pos.x,y:bot.pos.y-ne.pos.y});tgt={x:bot.pos.x+n.x*120,y:bot.pos.y+n.y*120};}
    if(bot.ammo===0){const ap=pkups.current.find(p=>p.kind==="ammo"&&p.avail);if(ap) tgt=ap.pos;}
    let rx=0,ry=0;
    for(const a of allies){const d=dist(bot.pos,a.pos);if(d<50&&d>0){const n=norm({x:bot.pos.x-a.pos.x,y:bot.pos.y-a.pos.y});rx+=n.x*.4;ry+=n.y*.4;}}
    if(dist(bot.pos,tgt)>22){const d=norm({x:tgt.x-bot.pos.x,y:tgt.y-bot.pos.y});bot.vel={x:(d.x+(Math.random()-.5)*.35+rx)*B_SPEED,y:(d.y+(Math.random()-.5)*.35+ry)*B_SPEED};}
    else bot.vel={x:rx*B_SPEED,y:ry*B_SPEED};
    if(ne&&nd<380){bot.angle=Math.atan2(ne.pos.y-bot.pos.y,ne.pos.x-bot.pos.x);if(los(bot.pos,ne.pos)){const inSmk=smkR.current.some(s=>dist(bot.pos,s.pos)<s.r&&Date.now()<s.endAt);if(!inSmk||nd<80) shoot(bot,bot.angle+(Math.random()-.5)*.08,now);}}
    else if(Math.abs(bot.vel.x)+Math.abs(bot.vel.y)>.1) bot.angle=Math.atan2(bot.vel.y,bot.vel.x);
    if(ne&&nd<180&&now-bot.lastG>5500){const nb=enemies.filter(e=>dist(e.pos,ne!.pos)<90);if(nb.length>=2&&bot.pg>0) throwG(bot,"paint",bot.angle,now);else if(bot.sg>0&&bot.hp<45) throwG(bot,"smoke",Math.atan2(bot.pos.y-ne.pos.y,bot.pos.x-ne.pos.x),now);}
  }

  const update=useCallback(()=>{
    if(phase.current!=="playing") return;
    const now=Date.now();
    const dt=lastT.current?Math.min((now-lastT.current)/16.67,3):1;
    lastT.current=now;
    tLeft.current-=dt/60;
    if(tLeft.current<=0&&phase.current==="playing"){
      tLeft.current=0;
      phase.current=bScr.current>rScr.current?"bluewon":rScr.current>bScr.current?"redwon":"draw";
      // Force immediate HUD update so game-over banner appears instantly
      const p2=ents.current.find(e=>e.isPlayer);
      setHud({hp:p2?.deadUntil?0:(p2?.hp??0),ammo:p2?.ammo??0,wpn:p2?.wpn??"pistol",pg:p2?.pg??0,sg:p2?.sg??0,bScr:bScr.current,rScr:rScr.current,tLeft:0,phase:phase.current,feed:[...feed.current]});
    }
    scrT.current+=dt/60;
    if(scrT.current>=2){scrT.current=0;for(const z of zns.current){if(z.owner==="blue") bScr.current++;else if(z.owner==="red") rScr.current++;}}
    for(const p of pkups.current) if(!p.avail&&now>=p.respawnAt) p.avail=true;
    for(const e of ents.current) if(e.deadUntil>0&&now>=e.deadUntil) respawn(e);
    for(const e of ents.current) if(!e.isPlayer) botTick(e,now);
    const pl=ents.current.find(e=>e.isPlayer);
    if(pl&&pl.deadUntil===0){
      const spd=P_SPEED*dt; pl.vel={x:0,y:0};
      if(keys.current["w"]||keys.current["arrowup"]) pl.vel.y-=spd;
      if(keys.current["s"]||keys.current["arrowdown"]) pl.vel.y+=spd;
      if(keys.current["a"]||keys.current["arrowleft"]) pl.vel.x-=spd;
      if(keys.current["d"]||keys.current["arrowright"]) pl.vel.x+=spd;
      if(tlJ.current){pl.vel.x+=tlJ.current.dx*spd;pl.vel.y+=tlJ.current.dy*spd;}
      pl.angle=Math.atan2(mpos.current.y-pl.pos.y,mpos.current.x-pl.pos.x);
      if(mdown.current||trJ.current?.shooting) shoot(pl,pl.angle,now);
      if(keys.current["g"]){throwG(pl,"paint",pl.angle,now);delete keys.current["g"];}
      if(keys.current["h"]){throwG(pl,"smoke",pl.angle,now);delete keys.current["h"];}
      const wm:Record<string,WpnKey>={"1":"pistol","2":"shotgun","3":"smg","4":"sniper"};
      for(const[k,w]of Object.entries(wm)) if(keys.current[k]){pl.wpn=w;pl.ammo=WPNS[w].ammo;delete keys.current[k];}
    }
    for(const e of ents.current){if(e.deadUntil>0) continue;const sc=e.isPlayer?1:dt;e.pos=moveW(e.pos,{x:e.vel.x*sc,y:e.vel.y*sc},PR);}
    bults.current=bults.current.filter(b=>{
      b.pos.x+=b.vel.x*dt;b.pos.y+=b.vel.y*dt;b.life-=dt;
      if(b.pos.x<0||b.pos.x>GW||b.pos.y<0||b.pos.y>GH) return false;
      for(const w of WALLS) if(cHitsW(b.pos.x,b.pos.y,4,w)){splts.current.push({id:uid(),pos:{...b.pos},r:6+Math.random()*8,color:b.ink,alpha:.88});return false;}
      for(const e of ents.current){
        if(e.team===b.team||e.deadUntil>0) continue;
        if(dist(b.pos,e.pos)<PR+3){
          e.hp-=b.dmg;spawnExplosion(b.pos,b.ink,6);
          splts.current.push({id:uid(),pos:{...b.pos},r:9+Math.random()*11,color:b.ink,alpha:.92});
          if(e.hp<=0){e.hp=0;e.deadUntil=now+RESPAWN_MS;spawnExplosion(e.pos,e.ink,20);mkFeed(`${e.isPlayer?"YOU":e.team==="blue"?"Blue ally":"Red bot"} eliminated!`);}
          return false;
        }
      }
      return b.life>0;
    });
    grenR.current=grenR.current.filter(g=>{
      g.pos=moveW(g.pos,g.vel,8);g.vel.x*=.93;g.vel.y*=.93;
      if(now>=g.explodeAt){
        shake.current={mag:g.type==="paint"?12:7,end:now+450};
        if(g.type==="paint"){
          splts.current.push({id:uid(),pos:{...g.pos},r:70+Math.random()*25,color:g.color,alpha:.75});
          for(let i=0;i<12;i++){const a=Math.random()*Math.PI*2,r=Math.random()*65;splts.current.push({id:uid(),pos:{x:g.pos.x+Math.cos(a)*r,y:g.pos.y+Math.sin(a)*r},r:5+Math.random()*14,color:g.color,alpha:.7});}
          spawnExplosion(g.pos,g.color,28);
          for(const e of ents.current){if(e.team===g.team||e.deadUntil>0) continue;if(dist(e.pos,g.pos)<85){e.hp-=40;if(e.hp<=0){e.hp=0;e.deadUntil=now+RESPAWN_MS;mkFeed("Paint grenade elimination! 🎨");}}}
        } else smkR.current.push({id:uid(),pos:{...g.pos},r:95,endAt:now+6500});
        return false;
      }
      return true;
    });
    // Particles
    parts.current=parts.current.filter(p=>{p.pos.x+=p.vel.x*dt;p.pos.y+=p.vel.y*dt;p.vel.x*=0.92;p.vel.y*=0.92;p.alpha-=dt/p.life*1.5;return p.alpha>0;});
    smkR.current=smkR.current.filter(s=>now<s.endAt);
    for(const s of splts.current) s.alpha-=.0007*dt;
    splts.current=splts.current.filter(s=>s.alpha>.04).slice(-700);
    for(const z of zns.current){
      const bi=ents.current.filter(e=>e.team==="blue"&&e.deadUntil===0&&dist(e.pos,z.pos)<ZONE_R).length;
      const ri=ents.current.filter(e=>e.team==="red"&&e.deadUntil===0&&dist(e.pos,z.pos)<ZONE_R).length;
      if(bi>ri){z.capTeam="blue";z.cap=Math.min(100,z.cap+bi*.32*dt);if(z.cap>=100) z.owner="blue";}
      else if(ri>bi){z.capTeam="red";z.cap=Math.max(0,z.cap-ri*.32*dt);if(z.cap<=0){z.owner="red";z.cap=0;}}
    }
    for(const p of pkups.current){
      if(!p.avail) continue;
      for(const e of ents.current){
        if(e.deadUntil>0) continue;
        if(dist(e.pos,p.pos)<PR+14){
          let got=false;const w=WPNS[e.wpn];
          if(p.kind==="health"&&e.hp<100){e.hp=Math.min(100,e.hp+55);got=true;}
          else if(p.kind==="ammo"){e.ammo=Math.min(w.ammo*2,e.ammo+w.ammo);got=true;}
          else if(p.kind==="pg"){e.pg=Math.min(5,e.pg+2);got=true;}
          else if(p.kind==="sg"){e.sg=Math.min(3,e.sg+1);got=true;}
          else if(["pistol","shotgun","smg","sniper"].includes(p.kind)){e.wpn=p.kind as WpnKey;e.ammo=WPNS[p.kind as WpnKey].ammo;got=true;}
          if(got){p.avail=false;p.respawnAt=now+PICKUP_RESPAWN;break;}
        }
      }
    }
    if(Math.random()<.125){const p=ents.current.find(e=>e.isPlayer);setHud({hp:p?.deadUntil?0:(p?.hp??0),ammo:p?.ammo??0,wpn:p?.wpn??"pistol",pg:p?.pg??0,sg:p?.sg??0,bScr:bScr.current,rScr:rScr.current,tLeft:Math.ceil(tLeft.current),phase:phase.current,feed:[...feed.current]});}
  },[]);

  const render=useCallback(()=>{
    const canvas=cv.current;if(!canvas) return;
    const ctx=canvas.getContext("2d");if(!ctx) return;
    const now=Date.now();
    const ZOOM=1.5;
    // Camera target: live player position, else map centre
    const camEnt=ents.current.find(e=>e.isPlayer&&e.deadUntil===0);
    const rawCX=camEnt?camEnt.pos.x:GW/2, rawCY=camEnt?camEnt.pos.y:GH/2;
    // Clamp so camera never shows outside world
    const camX=Math.max(GW/(2*ZOOM),Math.min(GW-GW/(2*ZOOM),rawCX));
    const camY=Math.max(GH/(2*ZOOM),Math.min(GH-GH/(2*ZOOM),rawCY));
    ctx.save();
    // Screen shake (applied in screen space before world transform)
    if(now<shake.current.end){const f=(shake.current.end-now)/450,m=shake.current.mag*f;ctx.translate((Math.random()-.5)*m,(Math.random()-.5)*m);}
    // Camera follow: world → screen
    ctx.translate(GW/2-camX*ZOOM, GH/2-camY*ZOOM);
    ctx.scale(ZOOM,ZOOM);
    // Floor
    drawFloor(ctx);
    // Paint splats
    for(const s of splts.current) drawSplat(ctx,s);
    // Zones
    for(const z of zns.current) drawZone(ctx,z,now);
    // Pickups
    for(const p of pkups.current) if(p.avail) drawPickup(ctx,p,now);
    // Walls
    for(const w of WALLS) drawWall(ctx,w);
    // Smoke
    for(const s of smkR.current) drawSmoke(ctx,s,now);
    // Bullets
    for(const b of bults.current) drawBullet(ctx,b);
    // Particles
    for(const p of parts.current){ctx.save();ctx.globalAlpha=Math.max(0,p.alpha);ctx.shadowColor=p.color;ctx.shadowBlur=8;ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.pos.x,p.pos.y,p.r,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;ctx.restore();}
    // Grenades
    for(const g of grenR.current){
      const pulse=Math.sin(now/90)*.25+.75;
      ctx.save();ctx.globalAlpha=pulse;ctx.shadowColor=g.type==="paint"?g.color:"#d1d5db";ctx.shadowBlur=12;
      ctx.fillStyle=g.type==="paint"?g.color:"#9ca3af";ctx.beginPath();ctx.arc(g.pos.x,g.pos.y,8,0,Math.PI*2);ctx.fill();
      ctx.shadowBlur=0;ctx.globalAlpha=1;
      const fl=Math.max(0,(g.explodeAt-now)/2000);
      ctx.strokeStyle="#fff";ctx.lineWidth=2.5;ctx.beginPath();ctx.arc(g.pos.x,g.pos.y,11,-Math.PI/2,-Math.PI/2+fl*Math.PI*2);ctx.stroke();
      ctx.restore();
    }
    // Entities
    const pl=ents.current.find(e=>e.isPlayer);
    // Sort: dead last, player on top
    const sorted=[...ents.current].sort((a,b)=>(a.isPlayer?1:0)-(b.isPlayer?1:0));
    for(const e of sorted){
      if(e.deadUntil>0){
        const sp=(e.team==="blue"?BS:RS)[ents.current.filter(en=>en.team===e.team).indexOf(e)%5];
        ctx.save();ctx.globalAlpha=.22+(Math.sin(now/300)*.08);
        ctx.fillStyle=e.team==="blue"?"#3b82f6":"#ef4444";ctx.beginPath();ctx.arc(sp.x,sp.y,PR,0,Math.PI*2);ctx.fill();
        ctx.globalAlpha=1;
        if(e.isPlayer&&phase.current==="playing"){const secLeft=Math.max(0,(e.deadUntil-now)/1000);ctx.fillStyle="#fff";ctx.font="bold 10px 'Courier New'";ctx.textAlign="center";ctx.fillText(`${secLeft.toFixed(1)}s`,sp.x,sp.y+4);ctx.textAlign="left";}
        ctx.restore();
        continue;
      }
      const inSmk=smkR.current.some(s=>dist(e.pos,s.pos)<s.r&&now<s.endAt);
      if(inSmk&&pl&&e.team!==pl.team&&!e.isPlayer) ctx.globalAlpha=.1;
      drawEntity(ctx,e,now);
      ctx.globalAlpha=1;
    }
    // Base labels
    ctx.font="bold 11px 'Courier New'";ctx.textAlign="center";
    ctx.fillStyle="#3b82f655";ctx.fillText("BLUE BASE",70,GH/2);
    ctx.fillStyle="#ef444455";ctx.fillText("RED BASE",GW-70,GH/2);
    ctx.textAlign="left";
    // Restore world transform — everything below is screen-space
    ctx.restore();
    // Minimap (screen space)
    const mx=GW-86,my=GH-66,mw=72,mh=54;
    ctx.fillStyle="rgba(0,0,0,0.82)";ctx.fillRect(mx-2,my-2,mw+4,mh+4);
    ctx.strokeStyle="#ffffff18";ctx.lineWidth=1;ctx.strokeRect(mx-2,my-2,mw+4,mh+4);
    // Camera viewport rect on minimap
    const vw=(GW/1.5)*(mw/GW), vh=(GH/1.5)*(mh/GH);
    const vcx=(camX-GW/(2*1.5))*(mw/GW)+mx, vcy=(camY-GH/(2*1.5))*(mh/GH)+my;
    ctx.strokeStyle="#ffffff30";ctx.lineWidth=1;ctx.strokeRect(Math.max(mx,vcx),Math.max(my,vcy),Math.min(vw,mw),Math.min(vh,mh));
    for(const e of ents.current){
      if(e.deadUntil>0) continue;
      ctx.fillStyle=e.team==="blue"?"#60a5fa":"#f87171";
      const ds=e.isPlayer?4:2.5;ctx.fillRect(mx+e.pos.x*(mw/GW)-ds/2,my+e.pos.y*(mh/GH)-ds/2,ds,ds);
    }
    for(const z of zns.current){
      ctx.strokeStyle=z.owner==="blue"?"#3b82f6":z.owner==="red"?"#ef4444":"#4b5563";
      ctx.lineWidth=1;ctx.beginPath();ctx.arc(mx+z.pos.x*(mw/GW),my+z.pos.y*(mh/GH),4,0,Math.PI*2);ctx.stroke();
    }
  },[]);

  const loop=useCallback(()=>{update();render();raf.current=requestAnimationFrame(loop);},[update,render]);

  const initGame=useCallback(()=>{
    ents.current=[];bults.current=[];grenR.current=[];splts.current=[];smkR.current=[];parts.current=[];
    zns.current=ZONES.map(z=>({...z}));pkups.current=PKUPS.map(p=>({...p}));
    bScr.current=0;rScr.current=0;tLeft.current=GAME_SECS;phase.current="playing";lastT.current=0;scrT.current=0;feed.current=[];shake.current={mag:0,end:0};
    ents.current.push(mkEntity("blue",0,true));
    for(let i=1;i<5;i++) ents.current.push(mkEntity("blue",i,false));
    for(let i=0;i<5;i++) ents.current.push(mkEntity("red",i,false));
  },[]);

  useEffect(()=>{
    initGame();raf.current=requestAnimationFrame(loop);
    const kd=(e:KeyboardEvent)=>{keys.current[e.key.toLowerCase()]=true;if(["arrowup","arrowdown","arrowleft","arrowright"," "].includes(e.key.toLowerCase())) e.preventDefault();};
    const ku=(e:KeyboardEvent)=>{keys.current[e.key.toLowerCase()]=false;};
    const mm=(e:MouseEvent)=>{
      const r=cv.current?.getBoundingClientRect();if(!r) return;
      const ZOOM=1.5;
      const sx=(e.clientX-r.left)*(GW/r.width), sy=(e.clientY-r.top)*(GH/r.height);
      const camEnt=ents.current.find(en=>en.isPlayer&&en.deadUntil===0);
      const rawCX=camEnt?camEnt.pos.x:GW/2, rawCY=camEnt?camEnt.pos.y:GH/2;
      const camX=Math.max(GW/(2*ZOOM),Math.min(GW-GW/(2*ZOOM),rawCX));
      const camY=Math.max(GH/(2*ZOOM),Math.min(GH-GH/(2*ZOOM),rawCY));
      mpos.current={x:(sx-GW/2)/ZOOM+camX, y:(sy-GH/2)/ZOOM+camY};
    };
    const md=(e:MouseEvent)=>{if(e.button===0) mdown.current=true;};
    const mu=(e:MouseEvent)=>{if(e.button===0) mdown.current=false;};
    const ts=(e:TouchEvent)=>{e.preventDefault();const r=cv.current?.getBoundingClientRect();if(!r) return;for(const t of Array.from(e.changedTouches)){const gx=(t.clientX-r.left)*(GW/r.width);if(gx<GW/2) tlJ.current={id:t.identifier,sx:t.clientX,sy:t.clientY,dx:0,dy:0};else trJ.current={id:t.identifier,shooting:true};}};
    const tm=(e:TouchEvent)=>{e.preventDefault();const r=cv.current?.getBoundingClientRect();if(!r) return;for(const t of Array.from(e.changedTouches)){if(tlJ.current?.id===t.identifier){const dx=(t.clientX-tlJ.current.sx)/65,dy=(t.clientY-tlJ.current.sy)/65,l=Math.sqrt(dx*dx+dy*dy),n=l>1?1/l:1;tlJ.current={...tlJ.current,dx:dx*n,dy:dy*n};}if(trJ.current?.id===t.identifier){
  const ZOOM=1.5;
  const sx=(t.clientX-r.left)*(GW/r.width), sy=(t.clientY-r.top)*(GH/r.height);
  const camEnt=ents.current.find(en=>en.isPlayer&&en.deadUntil===0);
  const rawCX=camEnt?camEnt.pos.x:GW/2, rawCY=camEnt?camEnt.pos.y:GH/2;
  const camX=Math.max(GW/(2*ZOOM),Math.min(GW-GW/(2*ZOOM),rawCX));
  const camY=Math.max(GH/(2*ZOOM),Math.min(GH-GH/(2*ZOOM),rawCY));
  mpos.current={x:(sx-GW/2)/ZOOM+camX, y:(sy-GH/2)/ZOOM+camY};
}}};
    const te=(e:TouchEvent)=>{for(const t of Array.from(e.changedTouches)){if(tlJ.current?.id===t.identifier) tlJ.current=null;if(trJ.current?.id===t.identifier){trJ.current=null;mdown.current=false;}}};
    window.addEventListener("keydown",kd);window.addEventListener("keyup",ku);
    const c=cv.current;
    if(c){c.addEventListener("mousemove",mm);c.addEventListener("mousedown",md);c.addEventListener("mouseup",mu);c.addEventListener("touchstart",ts,{passive:false});c.addEventListener("touchmove",tm,{passive:false});c.addEventListener("touchend",te,{passive:false});c.addEventListener("contextmenu",e=>e.preventDefault());}
    return()=>{cancelAnimationFrame(raf.current);window.removeEventListener("keydown",kd);window.removeEventListener("keyup",ku);if(c){c.removeEventListener("mousemove",mm);c.removeEventListener("mousedown",md);c.removeEventListener("mouseup",mu);}};
  },[initGame,loop]);

  const mm2=Math.floor(hud.tLeft/60),ss=String(hud.tLeft%60).padStart(2,"0");

  return (
    <div className="flex flex-col items-center gap-3 px-2 w-full max-w-5xl mx-auto select-none">
      {/* HUD */}
      <div className="w-full flex flex-wrap items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-red-400 font-bold">HP</span>
            <div className="w-24 h-3.5 rounded-full bg-gray-900 border border-gray-700 overflow-hidden">
              <div className="h-full rounded-full transition-all duration-100" style={{width:`${Math.max(0,hud.hp)}%`,background:`linear-gradient(90deg,${hud.hp>60?"#16a34a":"#dc2626"},${hud.hp>60?"#22c55e":"#ef4444"})`}}/>
            </div>
            <span className="text-xs text-gray-300 font-mono w-7">{hud.hp}</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg bg-gray-900/80 border border-gray-700 px-2.5 py-1">
            <span className="text-[10px] font-bold text-yellow-400">{WPNS[hud.wpn].name.toUpperCase()}</span>
            <span className="text-xs font-mono text-white">{hud.ammo}<span className="text-gray-500">/{WPNS[hud.wpn].ammo}</span></span>
          </div>
          <div className="flex gap-1.5 text-xs text-gray-400">
            <span className="rounded bg-gray-900 border border-gray-700 px-1.5 py-0.5">🎨 {hud.pg}</span>
            <span className="rounded bg-gray-900 border border-gray-700 px-1.5 py-0.5">💨 {hud.sg}</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 rounded-xl bg-blue-900/60 border border-blue-700 px-3 py-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-400 inline-block"/>
            <span className="font-bold text-blue-200 text-base">{hud.bScr}</span>
          </div>
          <span className="font-mono text-lg font-bold text-white tabular-nums">{mm2}:{ss}</span>
          <div className="flex items-center gap-1.5 rounded-xl bg-red-900/60 border border-red-700 px-3 py-1.5">
            <span className="font-bold text-red-200 text-base">{hud.rScr}</span>
            <span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block"/>
          </div>
        </div>
        <div className="flex gap-1">
          {(["pistol","shotgun","smg","sniper"] as WpnKey[]).map((w,i)=>(
            <button key={w} onPointerDown={e=>{e.preventDefault();const p=ents.current.find(e=>e.isPlayer);if(p){p.wpn=w;p.ammo=WPNS[w].ammo;}}}
              className={`rounded px-2 py-1 text-[10px] font-bold border touch-manipulation ${hud.wpn===w?"bg-purple-700 border-purple-500 text-white":"bg-gray-900 border-gray-700 text-gray-500 hover:border-gray-500"}`}>
              {i+1} {w[0].toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {hud.phase!=="playing"&&(
        <div className={`w-full rounded-2xl py-3 px-6 text-center font-extrabold text-2xl border-2 flex items-center justify-center gap-6 ${hud.phase==="bluewon"?"bg-blue-950/80 border-blue-500 text-blue-200":hud.phase==="redwon"?"bg-red-950/80 border-red-500 text-red-200":"bg-gray-900 border-gray-500 text-gray-200"}`}>
          {hud.phase==="bluewon"?"🏆 BLUE TEAM WINS!":hud.phase==="redwon"?"💀 RED TEAM WINS!":"🤝 DRAW!"}
          <button onClick={()=>{initGame();setHud(h=>({...h,phase:"playing",bScr:0,rScr:0,tLeft:GAME_SECS}));}} className="rounded-xl bg-purple-600 px-5 py-2 text-base font-bold text-white hover:bg-purple-500">Play Again</button>
        </div>
      )}

      <div className="relative w-full touch-none" style={{aspectRatio:`${GW}/${GH}`}}>
        <canvas ref={cv} width={GW} height={GH} className="w-full h-full rounded-xl border border-gray-700 shadow-2xl"/>
        {/* Kill feed */}
        <div className="absolute top-2 left-2 space-y-1 pointer-events-none">
          {hud.feed.map((m,i)=>(
            <div key={i} className={`rounded px-2 py-0.5 text-xs font-bold backdrop-blur-sm border transition-opacity ${i===0?"bg-black/80 border-gray-600 text-white opacity-100":"bg-black/50 border-gray-700 text-gray-400 opacity-60"}`}>{m}</div>
          ))}
        </div>
        {/* Joystick hint */}
        <div className="absolute bottom-4 left-4 w-14 h-14 rounded-full border-2 border-white/10 bg-white/5 flex items-center justify-center pointer-events-none">
          <span className="text-white/15 text-[8px] text-center leading-tight">MOVE</span>
        </div>
        {/* Touch grenade buttons */}
        <div className="absolute bottom-4 right-4 flex flex-col gap-2 pointer-events-auto">
          <button onPointerDown={e=>{e.preventDefault();const p=ents.current.find(e=>e.isPlayer);if(p)throwG(p,"paint",p.angle,Date.now());}} className="w-12 h-12 rounded-full bg-pink-800/90 border-2 border-pink-500 text-lg flex items-center justify-center touch-manipulation shadow-lg active:scale-90">🎨</button>
          <button onPointerDown={e=>{e.preventDefault();const p=ents.current.find(e=>e.isPlayer);if(p)throwG(p,"smoke",p.angle,Date.now());}} className="w-12 h-12 rounded-full bg-gray-800/90 border-2 border-gray-500 text-lg flex items-center justify-center touch-manipulation shadow-lg active:scale-90">💨</button>
        </div>
      </div>

      <div className="text-[10px] text-gray-700 flex flex-wrap gap-3 justify-center">
        <span>WASD Move</span><span>Mouse Aim</span><span>Click Shoot</span><span>G Paint Grenade</span><span>H Smoke Grenade</span><span>1-4 Switch Weapon</span>
      </div>
      <a href="/" className="text-xs text-gray-700 hover:text-gray-500">← Back to Games</a>
    </div>
  );
}
