"use client";

import { useEffect, useRef, useState, useCallback } from "react";

// ═══════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════
const GW = 960, GH = 560;
const PR = 14;           // player radius
const GAME_SECS = 150;
const PICKUP_RESPAWN = 14000;
const RESPAWN_MS = 4500;
const P_SPEED = 2.9;
const B_SPEED = 2.0;
const ZONE_R = 54;

const PAINT = ["#ef4444","#f97316","#eab308","#22c55e","#3b82f6","#a855f7","#ec4899","#14b8a6"];

type WpnKey = "pistol"|"shotgun"|"smg"|"sniper";
const WPNS: Record<WpnKey,{name:string;dmg:number;spd:number;spread:number;rate:number;ammo:number;pellets:number;ink:string}> = {
  pistol:  {name:"Pistol",  dmg:28, spd:9,  spread:.07, rate:350,  ammo:12, pellets:1, ink:"#fbbf24"},
  shotgun: {name:"Shotgun", dmg:20, spd:7,  spread:.32, rate:900,  ammo:6,  pellets:5, ink:"#f97316"},
  smg:     {name:"SMG",     dmg:13, spd:10, spread:.13, rate:110,  ammo:30, pellets:1, ink:"#60a5fa"},
  sniper:  {name:"Sniper",  dmg:90, spd:19, spread:.01, rate:1500, ammo:5,  pellets:1, ink:"#a78bfa"},
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
  pg:number; sg:number; lastG:number;          // paint/smoke grenades
  isPlayer:boolean; deadUntil:number; angle:number; ink:string;
  btgt?:V2; bstate?:"patrol"|"attack"|"capture";
}
interface Bullet {id:number;pos:V2;vel:V2;team:Team;dmg:number;ink:string;life:number;}
interface Grenade {id:number;pos:V2;vel:V2;team:Team;type:"paint"|"smoke";explodeAt:number;color:string;}
interface Splat {id:number;pos:V2;r:number;color:string;alpha:number;}
interface Smoke {id:number;pos:V2;r:number;endAt:number;}
interface Zone {id:string;pos:V2;label:string;owner:Team|null;cap:number;capTeam:Team|null;}
interface Pickup {id:number;pos:V2;kind:"health"|"ammo"|WpnKey|"pg"|"sg";avail:boolean;respawnAt:number;}

// ═══════════════════════════════════════════════════════════════════
// MAP
// ═══════════════════════════════════════════════════════════════════
const WALLS: Wall[] = [
  // Border
  {x:0,y:0,w:GW,h:16},{x:0,y:GH-16,w:GW,h:16},{x:0,y:0,w:16,h:GH},{x:GW-16,y:0,w:16,h:GH},
  // Left cover blocks
  {x:130,y:110,w:60,h:100},{x:130,y:350,w:60,h:100},
  // Left divider
  {x:270,y:190,w:28,h:180},
  // Centre top/bottom barriers
  {x:350,y:70,w:260,h:36},{x:350,y:GH-106,w:260,h:36},
  // Centre pillars (2×2 grid)
  {x:365,y:195,w:50,h:55},{x:490,y:195,w:50,h:55},
  {x:365,y:310,w:50,h:55},{x:490,y:310,w:50,h:55},
  // Right divider (mirror)
  {x:GW-298,y:190,w:28,h:180},
  // Right cover blocks (mirror)
  {x:GW-190,y:110,w:60,h:100},{x:GW-190,y:350,w:60,h:100},
];

const ZONES: Zone[] = [
  {id:"A",pos:{x:220,y:GH/2},label:"Zone A",owner:null,cap:0,capTeam:null},
  {id:"B",pos:{x:GW/2,y:GH/2},label:"Zone B",owner:null,cap:0,capTeam:null},
  {id:"C",pos:{x:GW-220,y:GH/2},label:"Zone C",owner:null,cap:0,capTeam:null},
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
// PURE HELPERS (module-level, no closure)
// ═══════════════════════════════════════════════════════════════════
let _uid = 200;
const uid = () => ++_uid;

const dist2 = (a:V2,b:V2) => (a.x-b.x)**2+(a.y-b.y)**2;
const dist  = (a:V2,b:V2) => Math.sqrt(dist2(a,b));
const norm  = (v:V2):V2 => { const l=Math.sqrt(v.x*v.x+v.y*v.y); return l>0?{x:v.x/l,y:v.y/l}:{x:0,y:0}; };

function cHitsW(cx:number,cy:number,r:number,w:Wall):boolean {
  const nx=Math.max(w.x,Math.min(cx,w.x+w.w));
  const ny=Math.max(w.y,Math.min(cy,w.y+w.h));
  return (cx-nx)**2+(cy-ny)**2 < r*r;
}

function moveW(pos:V2,vel:V2,r:number):V2 {
  let nx=pos.x+vel.x, ny=pos.y;
  for(const w of WALLS) if(cHitsW(nx,ny,r,w)) nx=vel.x>0?w.x-r:w.x+w.w+r;
  ny=pos.y+vel.y;
  for(const w of WALLS) if(cHitsW(nx,ny,r,w)) ny=vel.y>0?w.y-r:w.y+w.h+r;
  return {x:Math.max(r+16,Math.min(GW-r-16,nx)), y:Math.max(r+16,Math.min(GH-r-16,ny))};
}

function los(a:V2,b:V2):boolean {
  const dx=b.x-a.x, dy=b.y-a.y;
  const steps=Math.ceil(Math.sqrt(dx*dx+dy*dy)/10);
  for(let i=1;i<steps;i++){
    const px=a.x+dx*(i/steps), py=a.y+dy*(i/steps);
    for(const w of WALLS) if(px>=w.x&&px<=w.x+w.w&&py>=w.y&&py<=w.y+w.h) return false;
  }
  return true;
}

function mkEntity(team:Team,idx:number,isPlayer:boolean):Entity {
  const sp=(team==="blue"?BS:RS)[idx%5];
  return {
    id:uid(), pos:{...sp}, vel:{x:0,y:0}, team, hp:100,
    wpn:"pistol", ammo:12, lastShot:0,
    pg:2, sg:1, lastG:0,
    isPlayer, deadUntil:0, angle:isPlayer?0:Math.PI,
    ink:PAINT[Math.floor(Math.random()*PAINT.length)],
    bstate:"capture",
  };
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
  const zns   = useRef<Zone[]>(ZONES.map(z=>({...z})));
  const pkups = useRef<Pickup[]>(PKUPS.map(p=>({...p})));
  const bScr  = useRef(0);
  const rScr  = useRef(0);
  const tLeft = useRef(GAME_SECS);
  const phase = useRef<"playing"|"bluewon"|"redwon"|"draw">("playing");
  const lastT = useRef(0);
  const scrT  = useRef(0);
  const keys  = useRef<Record<string,boolean>>({});
  const mpos  = useRef<V2>({x:GW/2,y:GH/2});
  const mdown = useRef(false);
  const raf   = useRef(0);
  const feed  = useRef<string[]>([]);
  const tlJ   = useRef<{id:number;sx:number;sy:number;dx:number;dy:number}|null>(null);
  const trJ   = useRef<{id:number;shooting:boolean}|null>(null);

  const [hud,setHud] = useState({hp:100,ammo:12,wpn:"pistol" as WpnKey,pg:2,sg:1,bScr:0,rScr:0,tLeft:GAME_SECS,phase:"playing" as typeof phase.current,feed:[] as string[]});

  // ── Shoot ──────────────────────────────────────────────────────────
  function shoot(e:Entity,angle:number,now:number){
    const w=WPNS[e.wpn];
    if(now-e.lastShot<w.rate||e.ammo<=0) return;
    e.ammo--; e.lastShot=now;
    for(let p=0;p<w.pellets;p++){
      const a=angle+(Math.random()-.5)*w.spread*(p>0?2:1);
      bults.current.push({id:uid(),pos:{x:e.pos.x+Math.cos(a)*(PR+2),y:e.pos.y+Math.sin(a)*(PR+2)},vel:{x:Math.cos(a)*w.spd,y:Math.sin(a)*w.spd},team:e.team,dmg:w.dmg,ink:e.ink,life:95});
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
    e.pos={...sp}; e.vel={x:0,y:0}; e.hp=100; e.deadUntil=0;
    e.wpn="pistol"; e.ammo=12; e.pg=2; e.sg=1;
  }

  function mkFeed(msg:string){ feed.current=[msg,...feed.current].slice(0,5); }

  // ── Bot AI ─────────────────────────────────────────────────────────
  function botTick(bot:Entity,now:number){
    if(bot.deadUntil>0) return;
    const enemies=ents.current.filter(e=>e.team!==bot.team&&e.deadUntil===0);
    const allies =ents.current.filter(e=>e.team===bot.team&&e.id!==bot.id&&e.deadUntil===0);

    // Nearest enemy
    let ne:Entity|null=null, nd=Infinity;
    for(const e of enemies){const d=dist(bot.pos,e.pos);if(d<nd){nd=d;ne=e;}}

    // Priority zone: uncaptured or enemy-owned
    const sortedZ=[...zns.current].sort((a,b)=>{
      const aPri=(a.owner!==bot.team)?0:1;
      const bPri=(b.owner!==bot.team)?0:1;
      return aPri-bPri||(dist(bot.pos,a.pos)-dist(bot.pos,b.pos));
    });
    const tz=sortedZ[0];

    // State
    if(bot.hp<28) bot.bstate="patrol";
    else if(ne&&nd<320) bot.bstate="attack";
    else bot.bstate="capture";

    let tgt:V2=tz?.pos??{x:GW/2,y:GH/2};
    if(bot.bstate==="attack"&&ne) tgt=ne.pos;
    else if(bot.bstate==="patrol"&&ne){
      const n=norm({x:bot.pos.x-ne.pos.x,y:bot.pos.y-ne.pos.y});
      tgt={x:bot.pos.x+n.x*120,y:bot.pos.y+n.y*120};
    }

    // Ammo search
    if(bot.ammo===0){
      const ap=pkups.current.find(p=>p.kind==="ammo"&&p.avail);
      if(ap) tgt=ap.pos;
    }

    // Spread: slight repulsion from same-team bots
    let rx=0,ry=0;
    for(const a of allies){const d=dist(bot.pos,a.pos);if(d<50&&d>0){const n=norm({x:bot.pos.x-a.pos.x,y:bot.pos.y-a.pos.y});rx+=n.x*0.4;ry+=n.y*0.4;}}

    // Move
    if(dist(bot.pos,tgt)>22){
      const d=norm({x:tgt.x-bot.pos.x,y:tgt.y-bot.pos.y});
      const jx=(Math.random()-.5)*.35, jy=(Math.random()-.5)*.35;
      bot.vel={x:(d.x+jx+rx)*B_SPEED,y:(d.y+jy+ry)*B_SPEED};
    } else bot.vel={x:rx*B_SPEED,y:ry*B_SPEED};

    // Aim & shoot
    if(ne&&nd<380){
      bot.angle=Math.atan2(ne.pos.y-bot.pos.y,ne.pos.x-bot.pos.x);
      if(los(bot.pos,ne.pos)){
        const inSmk=smkR.current.some(s=>dist(bot.pos,s.pos)<s.r&&Date.now()<s.endAt);
        if(!inSmk||nd<80) shoot(bot,bot.angle+(Math.random()-.5)*.08,now);
      }
    } else if(Math.abs(bot.vel.x)+Math.abs(bot.vel.y)>.1){
      bot.angle=Math.atan2(bot.vel.y,bot.vel.x);
    }

    // Grenades
    if(ne&&nd<180&&now-bot.lastG>5500){
      const nearby=enemies.filter(e=>dist(e.pos,ne!.pos)<90);
      if(nearby.length>=2&&bot.pg>0) throwG(bot,"paint",bot.angle,now);
      else if(bot.sg>0&&bot.hp<45) throwG(bot,"smoke",Math.atan2(bot.pos.y-ne.pos.y,bot.pos.x-ne.pos.x),now);
    }
  }

  // ── Update ─────────────────────────────────────────────────────────
  const update = useCallback(()=>{
    if(phase.current!=="playing") return;
    const now=Date.now();
    const dt=lastT.current ? Math.min((now-lastT.current)/16.67,3) : 1;
    lastT.current=now;

    // Timer & scoring
    tLeft.current-=dt/60;
    if(tLeft.current<=0){
      tLeft.current=0;
      phase.current=bScr.current>rScr.current?"bluewon":rScr.current>bScr.current?"redwon":"draw";
    }
    scrT.current+=dt/60;
    if(scrT.current>=2){ scrT.current=0; for(const z of zns.current){ if(z.owner==="blue") bScr.current++; else if(z.owner==="red") rScr.current++; } }

    // Respawn pickups
    for(const p of pkups.current) if(!p.avail&&now>=p.respawnAt) p.avail=true;
    // Respawn entities
    for(const e of ents.current) if(e.deadUntil>0&&now>=e.deadUntil) respawn(e);

    // Bot AI
    for(const e of ents.current) if(!e.isPlayer) botTick(e,now);

    // Player input
    const pl=ents.current.find(e=>e.isPlayer);
    if(pl&&pl.deadUntil===0){
      const spd=P_SPEED*dt;
      pl.vel={x:0,y:0};
      if(keys.current["w"]||keys.current["arrowup"])   pl.vel.y-=spd;
      if(keys.current["s"]||keys.current["arrowdown"]) pl.vel.y+=spd;
      if(keys.current["a"]||keys.current["arrowleft"]) pl.vel.x-=spd;
      if(keys.current["d"]||keys.current["arrowright"])pl.vel.x+=spd;
      if(tlJ.current){ pl.vel.x+=tlJ.current.dx*spd; pl.vel.y+=tlJ.current.dy*spd; }
      pl.angle=Math.atan2(mpos.current.y-pl.pos.y,mpos.current.x-pl.pos.x);
      if(mdown.current||trJ.current?.shooting) shoot(pl,pl.angle,now);
      if(keys.current["g"]){throwG(pl,"paint",pl.angle,now);delete keys.current["g"];}
      if(keys.current["h"]){throwG(pl,"smoke",pl.angle,now);delete keys.current["h"];}
      const wpnMap:Record<string,WpnKey>={"1":"pistol","2":"shotgun","3":"smg","4":"sniper"};
      for(const [k,w] of Object.entries(wpnMap)) if(keys.current[k]){pl.wpn=w;pl.ammo=WPNS[w].ammo;delete keys.current[k];}
    }

    // Move all entities
    for(const e of ents.current){
      if(e.deadUntil>0) continue;
      const scale=e.isPlayer?1:dt;
      e.pos=moveW(e.pos,{x:e.vel.x*scale,y:e.vel.y*scale},PR);
    }

    // Bullets
    bults.current=bults.current.filter(b=>{
      b.pos.x+=b.vel.x*dt; b.pos.y+=b.vel.y*dt; b.life-=dt;
      if(b.pos.x<0||b.pos.x>GW||b.pos.y<0||b.pos.y>GH) return false;
      for(const w of WALLS) if(cHitsW(b.pos.x,b.pos.y,4,w)){ splts.current.push({id:uid(),pos:{...b.pos},r:7+Math.random()*8,color:b.ink,alpha:.85}); return false; }
      for(const e of ents.current){
        if(e.team===b.team||e.deadUntil>0) continue;
        if(dist(b.pos,e.pos)<PR+3){
          e.hp-=b.dmg;
          splts.current.push({id:uid(),pos:{...b.pos},r:10+Math.random()*12,color:b.ink,alpha:.9});
          if(e.hp<=0){ e.hp=0; e.deadUntil=now+RESPAWN_MS; mkFeed(`${e.isPlayer?"YOU":e.team==="blue"?"Blue ally":"Red bot"} eliminated!`); }
          return false;
        }
      }
      return b.life>0;
    });

    // Grenades
    grenR.current=grenR.current.filter(g=>{
      g.pos=moveW(g.pos,g.vel,8); g.vel.x*=.93; g.vel.y*=.93;
      if(now>=g.explodeAt){
        if(g.type==="paint"){
          splts.current.push({id:uid(),pos:{...g.pos},r:75+Math.random()*25,color:g.color,alpha:.72});
          for(let i=0;i<10;i++){const a=Math.random()*Math.PI*2,r=Math.random()*65;splts.current.push({id:uid(),pos:{x:g.pos.x+Math.cos(a)*r,y:g.pos.y+Math.sin(a)*r},r:6+Math.random()*14,color:g.color,alpha:.68});}
          for(const e of ents.current){ if(e.team===g.team||e.deadUntil>0) continue; if(dist(e.pos,g.pos)<85){e.hp-=40;if(e.hp<=0){e.hp=0;e.deadUntil=now+RESPAWN_MS;mkFeed("Paint grenade elimination! 🎨");}}}
        } else {
          smkR.current.push({id:uid(),pos:{...g.pos},r:95,endAt:now+6500});
        }
        return false;
      }
      return true;
    });

    // Cleanup
    smkR.current=smkR.current.filter(s=>now<s.endAt);
    for(const s of splts.current) s.alpha-=.0008*dt;
    splts.current=splts.current.filter(s=>s.alpha>.04).slice(-600);

    // Zones
    for(const z of zns.current){
      const bi=ents.current.filter(e=>e.team==="blue"&&e.deadUntil===0&&dist(e.pos,z.pos)<ZONE_R).length;
      const ri=ents.current.filter(e=>e.team==="red" &&e.deadUntil===0&&dist(e.pos,z.pos)<ZONE_R).length;
      if(bi>ri){ z.capTeam="blue"; z.cap=Math.min(100,z.cap+bi*.32*dt); if(z.cap>=100) z.owner="blue"; }
      else if(ri>bi){ z.capTeam="red"; z.cap=Math.max(0,z.cap-ri*.32*dt); if(z.cap<=0){z.owner="red";z.cap=0;} }
    }

    // Pickups
    for(const p of pkups.current){
      if(!p.avail) continue;
      for(const e of ents.current){
        if(e.deadUntil>0) continue;
        if(dist(e.pos,p.pos)<PR+14){
          let got=false;
          const w=WPNS[e.wpn];
          if(p.kind==="health"&&e.hp<100){e.hp=Math.min(100,e.hp+55);got=true;}
          else if(p.kind==="ammo"){e.ammo=Math.min(w.ammo*2,e.ammo+w.ammo);got=true;}
          else if(p.kind==="pg"){e.pg=Math.min(5,e.pg+2);got=true;}
          else if(p.kind==="sg"){e.sg=Math.min(3,e.sg+1);got=true;}
          else if(["pistol","shotgun","smg","sniper"].includes(p.kind)){e.wpn=p.kind as WpnKey;e.ammo=WPNS[p.kind as WpnKey].ammo;got=true;}
          if(got){p.avail=false;p.respawnAt=now+PICKUP_RESPAWN;break;}
        }
      }
    }

    // HUD update (every ~8 frames)
    if(Math.random()<.125){
      const p=ents.current.find(e=>e.isPlayer);
      setHud({hp:p?.deadUntil?0:(p?.hp??0),ammo:p?.ammo??0,wpn:p?.wpn??"pistol",pg:p?.pg??0,sg:p?.sg??0,bScr:bScr.current,rScr:rScr.current,tLeft:Math.ceil(tLeft.current),phase:phase.current,feed:[...feed.current]});
    }
  },[]);

  // ── Render ─────────────────────────────────────────────────────────
  const render = useCallback(()=>{
    const canvas=cv.current; if(!canvas) return;
    const ctx=canvas.getContext("2d"); if(!ctx) return;
    const now=Date.now();

    // Floor
    ctx.fillStyle="#1a2e1a"; ctx.fillRect(0,0,GW,GH);
    ctx.strokeStyle="#1f361f"; ctx.lineWidth=1;
    for(let x=0;x<GW;x+=40){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,GH);ctx.stroke();}
    for(let y=0;y<GH;y+=40){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(GW,y);ctx.stroke();}

    // Paint splats
    for(const s of splts.current){ ctx.globalAlpha=s.alpha; ctx.fillStyle=s.color; ctx.beginPath(); ctx.arc(s.pos.x,s.pos.y,s.r,0,Math.PI*2); ctx.fill(); }
    ctx.globalAlpha=1;

    // Base zones
    ctx.fillStyle="#3b82f618"; ctx.strokeStyle="#3b82f640"; ctx.lineWidth=1.5;
    ctx.fillRect(16,16,110,GH-32); ctx.strokeRect(16,16,110,GH-32);
    ctx.fillStyle="#ef444418"; ctx.strokeStyle="#ef444440";
    ctx.fillRect(GW-126,16,110,GH-32); ctx.strokeRect(GW-126,16,110,GH-32);

    // Capture zones
    for(const z of zns.current){
      const col=z.owner==="blue"?"#3b82f6":z.owner==="red"?"#ef4444":"#6b7280";
      ctx.fillStyle=col+"30"; ctx.strokeStyle=col; ctx.lineWidth=2.5;
      ctx.beginPath(); ctx.arc(z.pos.x,z.pos.y,ZONE_R,0,Math.PI*2); ctx.fill(); ctx.stroke();
      if(z.capTeam&&z.cap>0&&z.cap<100){
        const prog=z.capTeam==="blue"?z.cap/100:1-z.cap/100;
        ctx.strokeStyle=z.capTeam==="blue"?"#60a5fa":"#f87171"; ctx.lineWidth=5;
        ctx.beginPath(); ctx.arc(z.pos.x,z.pos.y,ZONE_R-5,-Math.PI/2,-Math.PI/2+prog*Math.PI*2); ctx.stroke();
      }
      ctx.fillStyle="#ffffffdd"; ctx.font="bold 12px monospace"; ctx.textAlign="center";
      ctx.fillText(z.label,z.pos.x,z.pos.y+5);
    }
    ctx.textAlign="left";

    // Pickups
    const pkIcons:Record<string,string>={health:"❤️",ammo:"📦",pistol:"🔫",shotgun:"💥",smg:"⚡",sniper:"🎯",pg:"🎨",sg:"💨"};
    for(const p of pkups.current){
      if(!p.avail) continue;
      ctx.fillStyle="#ffffff18"; ctx.beginPath(); ctx.arc(p.pos.x,p.pos.y,15,0,Math.PI*2); ctx.fill();
      ctx.font="14px serif"; ctx.textAlign="center";
      ctx.fillText(pkIcons[p.kind]??p.kind,p.pos.x,p.pos.y+5);
    }
    ctx.textAlign="left";

    // Walls
    ctx.fillStyle="#374151"; ctx.strokeStyle="#4b5563"; ctx.lineWidth=1;
    for(const w of WALLS){ ctx.fillRect(w.x,w.y,w.w,w.h); ctx.strokeRect(w.x,w.y,w.w,w.h); }

    // Smoke
    for(const s of smkR.current){
      const rem=(s.endAt-now)/6500;
      ctx.globalAlpha=Math.min(0.6,rem*0.7);
      const g=ctx.createRadialGradient(s.pos.x,s.pos.y,0,s.pos.x,s.pos.y,s.r);
      g.addColorStop(0,"#9ca3afee"); g.addColorStop(1,"#9ca3af00");
      ctx.fillStyle=g; ctx.beginPath(); ctx.arc(s.pos.x,s.pos.y,s.r,0,Math.PI*2); ctx.fill();
    }
    ctx.globalAlpha=1;

    // Bullets
    ctx.shadowBlur=7;
    for(const b of bults.current){ ctx.fillStyle=b.ink; ctx.shadowColor=b.ink; ctx.beginPath(); ctx.arc(b.pos.x,b.pos.y,4,0,Math.PI*2); ctx.fill(); }
    ctx.shadowBlur=0;

    // Grenades
    for(const g of grenR.current){
      const pulse=Math.sin(now/90)*.25+.75;
      ctx.globalAlpha=pulse;
      ctx.fillStyle=g.type==="paint"?g.color:"#9ca3af"; ctx.shadowColor=ctx.fillStyle; ctx.shadowBlur=8;
      ctx.beginPath(); ctx.arc(g.pos.x,g.pos.y,8,0,Math.PI*2); ctx.fill();
      ctx.shadowBlur=0; ctx.globalAlpha=1;
      const fl=(g.explodeAt-now)/2000;
      ctx.strokeStyle="#fff"; ctx.lineWidth=2.5;
      ctx.beginPath(); ctx.arc(g.pos.x,g.pos.y,11,-Math.PI/2,-Math.PI/2+Math.max(0,fl)*Math.PI*2); ctx.stroke();
    }

    // Entities
    const pl=ents.current.find(e=>e.isPlayer);
    for(const e of ents.current){
      if(e.deadUntil>0){
        const sp=(e.team==="blue"?BS:RS)[ents.current.filter(en=>en.team===e.team).indexOf(e)%5];
        ctx.globalAlpha=.28; ctx.fillStyle=e.team==="blue"?"#3b82f6":"#ef4444";
        ctx.beginPath(); ctx.arc(sp.x,sp.y,PR,0,Math.PI*2); ctx.fill();
        ctx.globalAlpha=1;
        if(e.isPlayer){ ctx.fillStyle="#fff"; ctx.font="bold 10px monospace"; ctx.textAlign="center"; ctx.fillText(`${((e.deadUntil-now)/1000).toFixed(1)}s`,sp.x,sp.y+4); ctx.textAlign="left";}
        continue;
      }

      // In smoke — dim enemies
      const inSmk=smkR.current.some(s=>dist(e.pos,s.pos)<s.r&&now<s.endAt);
      if(inSmk&&pl&&e.team!==pl.team&&!e.isPlayer) ctx.globalAlpha=.12;

      const tc=e.team==="blue"?"#3b82f6":"#ef4444";
      ctx.shadowColor=tc; ctx.shadowBlur=e.isPlayer?14:5;
      ctx.fillStyle=tc; ctx.beginPath(); ctx.arc(e.pos.x,e.pos.y,PR,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle=e.ink; ctx.lineWidth=3;
      ctx.beginPath(); ctx.arc(e.pos.x,e.pos.y,PR,0,Math.PI*2); ctx.stroke();
      ctx.shadowBlur=0;
      // Barrel
      ctx.strokeStyle=e.isPlayer?"#ffffff":"#ffffffbb"; ctx.lineWidth=3;
      ctx.beginPath(); ctx.moveTo(e.pos.x,e.pos.y); ctx.lineTo(e.pos.x+Math.cos(e.angle)*(PR+11),e.pos.y+Math.sin(e.angle)*(PR+11)); ctx.stroke();
      // HP bar
      const bx=e.pos.x-PR,by=e.pos.y-PR-9;
      ctx.fillStyle="#111"; ctx.fillRect(bx,by,PR*2,4);
      ctx.fillStyle=e.hp>60?"#22c55e":e.hp>30?"#eab308":"#ef4444";
      ctx.fillRect(bx,by,PR*2*(e.hp/100),4);
      // You label
      if(e.isPlayer){ ctx.fillStyle="#ffffffee"; ctx.font="bold 9px monospace"; ctx.textAlign="center"; ctx.fillText("YOU",e.pos.x,e.pos.y-PR-12); ctx.textAlign="left"; }
      ctx.globalAlpha=1;
    }

    // Base labels
    ctx.fillStyle="#3b82f660"; ctx.font="bold 10px monospace"; ctx.textAlign="center";
    ctx.fillText("BLUE",70,GH/2); ctx.fillStyle="#ef444460"; ctx.fillText("RED",GW-70,GH/2);
    ctx.textAlign="left";

    // Minimap
    const mx=GW-86,my=GH-66,mw=72,mh=54;
    ctx.fillStyle="#00000099"; ctx.fillRect(mx-2,my-2,mw+4,mh+4);
    ctx.strokeStyle="#ffffff20"; ctx.lineWidth=1; ctx.strokeRect(mx-2,my-2,mw+4,mh+4);
    for(const e of ents.current){
      if(e.deadUntil>0) continue;
      ctx.fillStyle=e.team==="blue"?"#60a5fa":"#f87171";
      const ds=e.isPlayer?4:2.5;
      ctx.fillRect(mx+e.pos.x*(mw/GW)-ds/2,my+e.pos.y*(mh/GH)-ds/2,ds,ds);
    }
    for(const z of zns.current){
      ctx.strokeStyle=z.owner==="blue"?"#3b82f6":z.owner==="red"?"#ef4444":"#6b7280";
      ctx.lineWidth=1; ctx.beginPath(); ctx.arc(mx+z.pos.x*(mw/GW),my+z.pos.y*(mh/GH),4,0,Math.PI*2); ctx.stroke();
    }
  },[]);

  // ── Game loop ──────────────────────────────────────────────────────
  const loop = useCallback(()=>{update();render();raf.current=requestAnimationFrame(loop);},[update,render]);

  const initGame = useCallback(()=>{
    ents.current=[]; bults.current=[]; grenR.current=[]; splts.current=[]; smkR.current=[];
    zns.current=ZONES.map(z=>({...z})); pkups.current=PKUPS.map(p=>({...p}));
    bScr.current=0; rScr.current=0; tLeft.current=GAME_SECS;
    phase.current="playing"; lastT.current=0; scrT.current=0; feed.current=[];
    ents.current.push(mkEntity("blue",0,true));
    for(let i=1;i<5;i++) ents.current.push(mkEntity("blue",i,false));
    for(let i=0;i<5;i++) ents.current.push(mkEntity("red",i,false));
  },[]);

  useEffect(()=>{
    initGame();
    raf.current=requestAnimationFrame(loop);
    const kd=(e:KeyboardEvent)=>{ keys.current[e.key.toLowerCase()]=true; if(["arrowup","arrowdown","arrowleft","arrowright"," "].includes(e.key.toLowerCase())) e.preventDefault(); };
    const ku=(e:KeyboardEvent)=>{ keys.current[e.key.toLowerCase()]=false; };
    const mm=(e:MouseEvent)=>{ const r=cv.current?.getBoundingClientRect(); if(!r) return; mpos.current={x:(e.clientX-r.left)*(GW/r.width),y:(e.clientY-r.top)*(GH/r.height)}; };
    const md=(e:MouseEvent)=>{ if(e.button===0) mdown.current=true; };
    const mu=(e:MouseEvent)=>{ if(e.button===0) mdown.current=false; };
    const ts=(e:TouchEvent)=>{ e.preventDefault(); const r=cv.current?.getBoundingClientRect(); if(!r) return; for(const t of Array.from(e.changedTouches)){ const gx=(t.clientX-r.left)*(GW/r.width); if(gx<GW/2) tlJ.current={id:t.identifier,sx:t.clientX,sy:t.clientY,dx:0,dy:0}; else trJ.current={id:t.identifier,shooting:true}; } };
    const tm=(e:TouchEvent)=>{ e.preventDefault(); const r=cv.current?.getBoundingClientRect(); if(!r) return; for(const t of Array.from(e.changedTouches)){ if(tlJ.current?.id===t.identifier){ const dx=(t.clientX-tlJ.current.sx)/65,dy=(t.clientY-tlJ.current.sy)/65,l=Math.sqrt(dx*dx+dy*dy),n=l>1?1/l:1; tlJ.current={...tlJ.current,dx:dx*n,dy:dy*n}; } if(trJ.current?.id===t.identifier){ mpos.current={x:(t.clientX-r.left)*(GW/r.width),y:(t.clientY-r.top)*(GH/r.height)}; } } };
    const te=(e:TouchEvent)=>{ for(const t of Array.from(e.changedTouches)){ if(tlJ.current?.id===t.identifier) tlJ.current=null; if(trJ.current?.id===t.identifier){trJ.current=null;mdown.current=false;} } };
    window.addEventListener("keydown",kd); window.addEventListener("keyup",ku);
    const c=cv.current;
    if(c){ c.addEventListener("mousemove",mm); c.addEventListener("mousedown",md); c.addEventListener("mouseup",mu); c.addEventListener("touchstart",ts,{passive:false}); c.addEventListener("touchmove",tm,{passive:false}); c.addEventListener("touchend",te,{passive:false}); c.addEventListener("contextmenu",e=>e.preventDefault()); }
    return ()=>{ cancelAnimationFrame(raf.current); window.removeEventListener("keydown",kd); window.removeEventListener("keyup",ku); if(c){c.removeEventListener("mousemove",mm);c.removeEventListener("mousedown",md);c.removeEventListener("mouseup",mu);} };
  },[initGame,loop]);

  const mm=Math.floor(hud.tLeft/60), ss=String(hud.tLeft%60).padStart(2,"0");

  return (
    <div className="flex flex-col items-center gap-3 px-2 w-full max-w-5xl mx-auto select-none">
      {/* HUD bar */}
      <div className="w-full flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-sm">❤️</span>
            <div className="w-20 h-3 rounded-full bg-gray-800 overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{width:`${Math.max(0,hud.hp)}%`,background:hud.hp>60?"#22c55e":hud.hp>30?"#eab308":"#ef4444"}}/>
            </div>
            <span className="text-xs text-gray-300 font-mono w-6">{hud.hp}</span>
          </div>
          <span className="text-xs text-gray-300 font-mono">🔫 {WPNS[hud.wpn].name} {hud.ammo}/{WPNS[hud.wpn].ammo}</span>
          <span className="text-xs text-gray-400">🎨×{hud.pg} 💨×{hud.sg}</span>
        </div>
        <div className="flex items-center gap-3 font-bold text-sm">
          <span className="text-blue-400">🔵 {hud.bScr}</span>
          <span className="text-gray-300 font-mono text-base">{mm}:{ss}</span>
          <span className="text-red-400">{hud.rScr} 🔴</span>
        </div>
        <div className="flex gap-1.5">
          {(["pistol","shotgun","smg","sniper"] as WpnKey[]).map((w,i)=>(
            <button key={w} onPointerDown={e=>{e.preventDefault();const p=ents.current.find(e=>e.isPlayer);if(p){p.wpn=w;p.ammo=WPNS[w].ammo;}}}
              className={`rounded px-2 py-0.5 text-xs font-bold border touch-manipulation ${hud.wpn===w?"bg-purple-600 border-purple-400 text-white":"bg-gray-900 border-gray-700 text-gray-400"}`}>
              {i+1}:{w[0].toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Game over */}
      {hud.phase!=="playing"&&(
        <div className={`w-full rounded-2xl py-3 px-6 text-center font-extrabold text-xl border-2 flex items-center justify-center gap-6 ${hud.phase==="bluewon"?"bg-blue-900/60 border-blue-500 text-blue-200":hud.phase==="redwon"?"bg-red-900/60 border-red-500 text-red-200":"bg-gray-800 border-gray-500 text-gray-200"}`}>
          {hud.phase==="bluewon"?"🏆 BLUE TEAM WINS!":hud.phase==="redwon"?"💀 RED TEAM WINS!":"🤝 DRAW!"}
          <button onClick={()=>{initGame();setHud(h=>({...h,phase:"playing",bScr:0,rScr:0,tLeft:GAME_SECS}));}} className="rounded-xl bg-purple-600 px-4 py-1 text-base font-bold text-white hover:bg-purple-500">Play Again</button>
        </div>
      )}

      {/* Canvas */}
      <div className="relative w-full touch-none" style={{aspectRatio:`${GW}/${GH}`}}>
        <canvas ref={cv} width={GW} height={GH} className="w-full h-full rounded-xl border-2 border-purple-800 shadow-2xl shadow-purple-900/50"/>

        {/* Kill feed */}
        <div className="absolute top-2 left-2 space-y-1 pointer-events-none">
          {hud.feed.map((m,i)=>(<div key={i} className="rounded px-2 py-0.5 text-xs font-semibold bg-black/70 text-white">{m}</div>))}
        </div>

        {/* Left joystick hint */}
        <div className="absolute bottom-4 left-4 w-16 h-16 rounded-full border-2 border-white/15 bg-white/5 flex items-center justify-center pointer-events-none">
          <span className="text-white/20 text-[9px] text-center leading-tight">MOVE<br/>WASD</span>
        </div>

        {/* Grenade buttons (tablet) */}
        <div className="absolute bottom-4 right-4 flex flex-col gap-2 pointer-events-auto">
          <button onPointerDown={e=>{e.preventDefault();const p=ents.current.find(e=>e.isPlayer);if(p)throwG(p,"paint",p.angle,Date.now());}} className="w-12 h-12 rounded-full bg-pink-700/80 border-2 border-pink-400 text-xl flex items-center justify-center touch-manipulation active:scale-90">🎨</button>
          <button onPointerDown={e=>{e.preventDefault();const p=ents.current.find(e=>e.isPlayer);if(p)throwG(p,"smoke",p.angle,Date.now());}} className="w-12 h-12 rounded-full bg-gray-700/80 border-2 border-gray-400 text-xl flex items-center justify-center touch-manipulation active:scale-90">💨</button>
        </div>
      </div>

      {/* Controls legend */}
      <div className="text-[11px] text-gray-600 flex flex-wrap gap-3 justify-center">
        <span>WASD: Move</span><span>Mouse: Aim</span><span>Click: Shoot</span>
        <span>G: Paint Grenade</span><span>H: Smoke Grenade</span><span>1-4: Switch Weapon</span>
        <span>Tablet: Left drag = move · Right drag = aim+shoot · Buttons = grenades</span>
      </div>

      <a href="/" className="text-xs text-gray-600 hover:text-gray-400">← Back to Games</a>
    </div>
  );
}
