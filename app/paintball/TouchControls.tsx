"use client";

import { useEffect, useRef, useState } from "react";
import { PaintballEngine } from "./game/engine";

interface Props {
  engine: PaintballEngine;
  prompt: string;
  gPaint: number;
  gSmoke: number;
  onPause: () => void;
}

const STICK_R = 52; // px the knob can travel from center

function Joystick({ engine }: { engine: PaintballEngine }) {
  const baseRef = useRef<HTMLDivElement>(null);
  const pid = useRef<number | null>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0, sprint: false });

  useEffect(() => {
    return () => {
      engine.setTouchMove(0, 0);
      engine.setTouchSprint(false);
    };
  }, [engine]);

  const update = (clientX: number, clientY: number) => {
    const base = baseRef.current;
    if (!base) return;
    const rect = base.getBoundingClientRect();
    let dx = clientX - (rect.left + rect.width / 2);
    let dy = clientY - (rect.top + rect.height / 2);
    const d = Math.hypot(dx, dy);
    if (d > STICK_R) {
      dx = (dx / d) * STICK_R;
      dy = (dy / d) * STICK_R;
    }
    const sprint = d / STICK_R > 0.94;
    setKnob({ x: dx, y: dy, sprint });
    engine.setTouchMove(dx / STICK_R, -dy / STICK_R);
    engine.setTouchSprint(sprint);
  };

  const release = () => {
    pid.current = null;
    setKnob({ x: 0, y: 0, sprint: false });
    engine.setTouchMove(0, 0);
    engine.setTouchSprint(false);
  };

  return (
    <div
      ref={baseRef}
      className="pointer-events-auto absolute bottom-6 left-6 h-32 w-32 rounded-full border-2 border-white/25 bg-black/30 backdrop-blur-sm select-none [touch-action:none]"
      onContextMenu={(e) => e.preventDefault()}
      onPointerDown={(e) => {
        if (pid.current !== null) return;
        pid.current = e.pointerId;
        e.currentTarget.setPointerCapture(e.pointerId);
        update(e.clientX, e.clientY);
      }}
      onPointerMove={(e) => {
        if (pid.current === e.pointerId) update(e.clientX, e.clientY);
      }}
      onPointerUp={(e) => {
        if (pid.current === e.pointerId) release();
      }}
      onPointerCancel={(e) => {
        if (pid.current === e.pointerId) release();
      }}
    >
      <div
        className={`absolute left-1/2 top-1/2 h-14 w-14 rounded-full border-2 ${
          knob.sprint ? "border-lime-300 bg-lime-400/80" : "border-white/40 bg-white/30"
        }`}
        style={{ transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))` }}
      />
      <div className="absolute -top-6 left-1/2 -translate-x-1/2 font-mono text-[10px] font-bold tracking-widest text-white/50">
        {knob.sprint ? "SPRINT!" : "MOVE"}
      </div>
    </div>
  );
}

function HoldButton({
  className,
  label,
  sub,
  active,
  onHold,
  onTap,
}: {
  className: string;
  label: string;
  sub?: string;
  active?: boolean;
  onHold?: (down: boolean) => void;
  onTap?: () => void;
}) {
  return (
    <div
      className={`pointer-events-auto flex flex-col items-center justify-center rounded-full border-2 font-black backdrop-blur-sm select-none [touch-action:none] ${
        active ? "border-lime-300 bg-lime-400/80 text-black" : "border-white/25 bg-black/40 text-white"
      } ${className}`}
      onContextMenu={(e) => e.preventDefault()}
      onPointerDown={(e) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        onHold?.(true);
      }}
      onPointerUp={() => {
        onHold?.(false);
        onTap?.();
      }}
      onPointerCancel={() => onHold?.(false)}
    >
      <span className="leading-none">{label}</span>
      {sub && <span className="mt-0.5 font-mono text-[9px] font-bold leading-none opacity-80">{sub}</span>}
    </div>
  );
}

export default function TouchControls({ engine, prompt, gPaint, gSmoke, onPause }: Props) {
  const lookId = useRef<number | null>(null);
  const lookLast = useRef({ x: 0, y: 0 });
  const [crouch, setCrouch] = useState(false);

  useEffect(() => {
    return () => {
      engine.setFireHeld(false);
      for (const code of ["Space", "KeyC", "KeyE", "KeyG", "KeyH"]) engine.setVirtualKey(code, false);
    };
  }, [engine]);

  return (
    <>
      {/* drag anywhere (outside the controls) to aim */}
      <div
        className="absolute inset-0 [touch-action:none]"
        onContextMenu={(e) => e.preventDefault()}
        onPointerDown={(e) => {
          if (lookId.current !== null) return;
          lookId.current = e.pointerId;
          lookLast.current = { x: e.clientX, y: e.clientY };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (lookId.current !== e.pointerId) return;
          engine.touchLook(e.clientX - lookLast.current.x, e.clientY - lookLast.current.y);
          lookLast.current = { x: e.clientX, y: e.clientY };
        }}
        onPointerUp={(e) => {
          if (lookId.current === e.pointerId) lookId.current = null;
        }}
        onPointerCancel={(e) => {
          if (lookId.current === e.pointerId) lookId.current = null;
        }}
      />

      <Joystick engine={engine} />

      {/* pause */}
      <button
        className="pointer-events-auto absolute left-3 top-3 flex h-10 w-10 items-center justify-center rounded-lg bg-black/50 text-lg text-white backdrop-blur-sm [touch-action:none]"
        onClick={onPause}
      >
        ⏸
      </button>

      {/* action buttons */}
      <div className="absolute bottom-5 right-4 flex flex-col items-end gap-2.5">
        <div className="flex items-center gap-2.5">
          <HoldButton
            className={`h-12 w-12 text-lg ${gPaint > 0 ? "opacity-50" : ""}`}
            label="🎨"
            sub={gPaint > 0 ? `${gPaint}s` : "G"}
            onHold={(d) => engine.setVirtualKey("KeyG", d)}
          />
          <HoldButton
            className={`h-12 w-12 text-lg ${gSmoke > 0 ? "opacity-50" : ""}`}
            label="💨"
            sub={gSmoke > 0 ? `${gSmoke}s` : "H"}
            onHold={(d) => engine.setVirtualKey("KeyH", d)}
          />
        </div>
        <div className="flex items-center gap-2.5">
          <HoldButton
            className={`h-16 w-16 text-xl ${prompt ? "animate-pulse !border-yellow-300" : ""}`}
            label="✋"
            sub="E"
            onHold={(d) => engine.setVirtualKey("KeyE", d)}
          />
          <HoldButton
            className="h-16 w-16 text-sm"
            label="JUMP"
            onHold={(d) => engine.setVirtualKey("Space", d)}
          />
        </div>
        <div className="flex items-center gap-2.5">
          <HoldButton
            className="h-12 w-12 text-sm"
            label="C"
            sub="crouch"
            active={crouch}
            onTap={() => {
              const next = !crouch;
              setCrouch(next);
              engine.setVirtualKey("KeyC", next);
            }}
          />
          <HoldButton
            className="h-24 w-24 !border-red-400/60 !bg-red-500/70 text-lg"
            label="FIRE"
            onHold={(d) => engine.setFireHeld(d)}
          />
        </div>
      </div>
    </>
  );
}
