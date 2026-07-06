---
name: verify
description: How to build, run, and drive this Next.js games site for runtime verification (including mobile/touch emulation for the 3D paintball game).
---

# Verifying changes in jacks-games

Next.js 15 app, all games are client components under `app/<game>/`.

## Build & run

```powershell
npx next build            # must pass first
npx next start -p 3789    # run in background; stop it before rebuilding (Windows file locks on .next)
```

## Drive it

`puppeteer-core` is a devDependency — it drives the locally installed Chrome
(`C:\Program Files\Google\Chrome\Application\chrome.exe`). Edge (x86 install)
failed to launch headless via puppeteer; use Chrome.

- Scripts living outside the repo (scratchpad) must `require()` puppeteer-core
  by absolute path: `require("C:\\Users\\John\\Desktop\\jacks games\\node_modules\\puppeteer-core")`.
- Mobile: `page.emulate({ viewport: { width: 844, height: 390, isMobile: true, hasTouch: true } , userAgent: <iPhone UA> })`.
  `hasTouch: true` is what makes the games' `"ontouchstart" in window` checks pass.
- Multi-step touch gestures (joystick drags, button holds): use a CDP session with
  `Input.dispatchTouchEvent` (`touchStart`/`touchMove`/`touchEnd`) — this produces real
  pointer events so React `onPointerDown` + `setPointerCapture` work.

## Paintball specifics

- The engine instance is exposed at `window.__pbEngine` for observation:
  `__pbEngine.debugInfo()` returns `{ balls, decals, pos, weapon, score, fx, pickupsActive }`.
  Player yaw/pitch/pos.y are readable via `__pbEngine.player` (private in TS, fine at runtime).
- Desktop play uses pointer lock (silently fails headless — game still enters "playing").
  Touch play skips pointer lock and shows the TouchControls overlay (joystick bottom-left,
  FIRE/JUMP/✋/🎨/💨/C cluster bottom-right, ⏸ top-left).
- Good checks: joystick drag moves `debugInfo().pos`; FIRE hold makes `balls > 0`;
  look-drag changes `player.yaw`; JUMP raises `player.pos.y`; ⏸ shows the PAUSED overlay.
