"use client";

import React from "react";
import { CharacterDef } from "./characters";

export type Expression = "happy" | "shouting" | "hyped" | "sleepy" | "wet";

interface Props {
  character: CharacterDef;
  size?: number;
  expression?: Expression;
  showFullHeight?: boolean;
  className?: string;
}

/**
 * Crisp custom SVG portrait for each of the 5 Rival Boys characters:
 * - JackB: light brown hair in a mullet
 * - JackY: dark brown hair, a bit curly
 * - Harrison: blonde hair
 * - Ryan: dark skin, short black hair in a side parting
 * - Emma: shortest, dark brown hair with a bob and fringe
 */
export default function CharacterPortrait({
  character: c,
  size = 96,
  expression = "happy",
  showFullHeight = false,
  className = "",
}: Props) {
  // When showFullHeight is true, Emma visually stands noticeably shorter inside the same frame!
  const scale = showFullHeight ? c.heightScale : 1;
  const yOffset = showFullHeight ? (1 - scale) * 110 : 0;

  return (
    <svg
      width={size}
      height={showFullHeight ? size * 1.18 : size}
      viewBox={showFullHeight ? "0 0 110 130" : "0 0 110 110"}
      className={className}
      aria-label={c.name}
    >
      <g transform={`translate(${(110 * (1 - scale)) / 2}, ${yOffset}) scale(${scale})`}>
        {/* Back hair layer (behind head/neck) */}
        {c.hairStyle === "mullet" && (
          <g>
            {/* Short, choppy messy mullet tufts just behind the neck (shaved sides!) */}
            <path
              d="M35 64 L30 74 L38 72 L36 79 L45 75 L55 78 L65 75 L74 79 L72 72 L80 74 L75 64 Z"
              fill={c.hairColor}
              stroke="#5c3d22"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
            <path
              d="M38 71 L43 75 M67 75 L72 71 M52 73 L55 77"
              stroke={c.hairHighlight}
              strokeWidth="2"
              strokeLinecap="round"
              fill="none"
            />
          </g>
        )}

        {c.hairStyle === "bobfringe" && (
          <g>
            {/* Dark brown chin-length bob curving neatly around Emma's face */}
            <path
              d="M24 44 C20 62, 22 76, 32 81 L78 81 C88 76, 90 62, 86 44 C84 22, 26 22, 24 44 Z"
              fill={c.hairColor}
              stroke="#1f1109"
              strokeWidth="2"
            />
          </g>
        )}

        {/* Body / Hoodie shoulders */}
        <path
          d={
            showFullHeight
              ? "M25 88 Q55 76 85 88 L90 124 Q55 130 20 124 Z"
              : "M24 86 Q55 74 86 86 L92 110 L18 110 Z"
          }
          fill={c.shirtColor}
          stroke="#111827"
          strokeWidth="2.5"
        />
        {/* Hoodie stripe / collar accent */}
        <path
          d="M42 82 Q55 94 68 82"
          fill="none"
          stroke={c.shirtAccent}
          strokeWidth="5"
          strokeLinecap="round"
        />
        {/* Hoodie drawstrings */}
        <line x1="48" y1="88" x2="46" y2="103" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" opacity="0.85" />
        <line x1="62" y1="88" x2="64" y2="103" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" opacity="0.85" />

        {/* Neck */}
        <rect x="47" y="70" width="16" height="15" rx="6" fill={c.skinShadow} />

        {/* Ears */}
        <circle cx="29" cy="54" r="6.5" fill={c.skinColor} stroke={c.skinShadow} strokeWidth="1.5" />
        <circle cx="81" cy="54" r="6.5" fill={c.skinColor} stroke={c.skinShadow} strokeWidth="1.5" />

        {/* Head */}
        <ellipse
          cx="55"
          cy="52"
          rx="26"
          ry="27"
          fill={c.skinColor}
          stroke="#1f2937"
          strokeWidth="2.2"
        />

        {/* Cheeks */}
        <ellipse cx="39" cy="60" rx="4.5" ry="2.6" fill="#fb7185" opacity={c.id === "ryan" ? 0.2 : 0.32} />
        <ellipse cx="71" cy="60" rx="4.5" ry="2.6" fill="#fb7185" opacity={c.id === "ryan" ? 0.2 : 0.32} />

        {/* Eyes */}
        {expression === "sleepy" ? (
          <g stroke="#111827" strokeWidth="2.8" fill="none" strokeLinecap="round">
            <path d="M39 52 Q44 56 49 52" />
            <path d="M61 52 Q66 56 71 52" />
          </g>
        ) : (
          <g>
            <ellipse cx="44" cy="52" rx="4.2" ry={expression === "shouting" ? 5.2 : 4.6} fill="#111827" />
            <ellipse cx="66" cy="52" rx="4.2" ry={expression === "shouting" ? 5.2 : 4.6} fill="#111827" />
            <circle cx="45.4" cy="50.5" r="1.6" fill="#ffffff" />
            <circle cx="67.4" cy="50.5" r="1.6" fill="#ffffff" />
            {/* Eyebrows */}
            {expression === "shouting" || expression === "hyped" ? (
              <g stroke={c.hairStyle === "blonde" ? "#b48a1e" : "#1f120b"} strokeWidth="2.5" strokeLinecap="round">
                <line x1="38" y1="43" x2="49" y2="45" />
                <line x1="72" y1="43" x2="61" y2="45" />
              </g>
            ) : (
              <g stroke={c.hairStyle === "blonde" ? "#b48a1e" : "#1f120b"} strokeWidth="2.2" strokeLinecap="round">
                <path d="M38 44 Q44 41 49 44" fill="none" />
                <path d="M61 44 Q66 41 72 44" fill="none" />
              </g>
            )}
          </g>
        )}

        {/* Mouth */}
        {expression === "shouting" ? (
          <g>
            <ellipse cx="55" cy="66" rx="9" ry="7.5" fill="#7f1d1d" stroke="#111827" strokeWidth="2" />
            <path d="M48 62 Q55 64 62 62" stroke="#ffffff" strokeWidth="2.5" fill="none" />
            <ellipse cx="55" cy="70.5" rx="5" ry="2.5" fill="#f43f5e" />
          </g>
        ) : expression === "sleepy" ? (
          <ellipse cx="55" cy="65" rx="4" ry="3" fill="#7f1d1d" stroke="#111827" strokeWidth="1.5" />
        ) : (
          <path
            d={expression === "hyped" ? "M44 62 Q55 74 66 62 Z" : "M45 63 Q55 71 65 63"}
            fill={expression === "hyped" ? "#ffffff" : "none"}
            stroke="#111827"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* FRONT HAIR STYLES — Distinct & faithful to every character! */}

        {/* JackB: Shaved/faded Ronaldo-style sides + messy textured top + short messy back mullet */}
        {c.hairStyle === "mullet" && (
          <g>
            {/* Subtle buzzed/shaved fade along the sides above the ears */}
            <path
              d="M29 49 C28 41, 31 35, 36 33 L38 41 C34 43, 31 46, 29 49 Z"
              fill={c.hairColor}
              opacity="0.32"
            />
            <path
              d="M81 49 C82 41, 79 35, 74 33 L72 41 C76 43, 79 46, 81 49 Z"
              fill={c.hairColor}
              opacity="0.32"
            />
            {/* Textured Ronaldo-style messy top (high and tight above the shaved sides!) */}
            <path
              d="M34 39 C33 27, 42 19, 55 18 C68 19, 77 27, 76 39 C71 34, 65 33, 59 35 L55 31 L50 35 C44 33, 39 35, 34 39 Z"
              fill={c.hairColor}
              stroke="#5c3d22"
              strokeWidth="1.9"
              strokeLinejoin="round"
            />
            {/* Messy textured spikes on top */}
            <path
              d="M40 26 L45 19 L50 24 L56 17 L62 24 L68 20 L71 27"
              fill={c.hairColor}
              stroke="#5c3d22"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            <path
              d="M42 29 Q54 24 67 28"
              fill="none"
              stroke={c.hairHighlight}
              strokeWidth="2.3"
              strokeLinecap="round"
            />
          </g>
        )}

        {/* JackY: Dark brown hair, a bit curly */}
        {c.hairStyle === "curly" && (
          <g fill={c.hairColor} stroke="#23140b" strokeWidth="1.8">
            <circle cx="34" cy="36" r="9.5" />
            <circle cx="44" cy="27" r="10.5" />
            <circle cx="56" cy="24" r="11" />
            <circle cx="68" cy="28" r="10" />
            <circle cx="77" cy="37" r="9" />
            <circle cx="49" cy="34" r="8" />
            <circle cx="63" cy="35" r="8" />
            <circle cx="31" cy="45" r="5.5" />
            <circle cx="79" cy="45" r="5.5" />
            {/* Curly highlight loops */}
            <path
              d="M41 25 A4 4 0 0 1 48 25 M54 22 A4.5 4.5 0 0 1 62 23 M66 27 A4 4 0 0 1 72 30"
              fill="none"
              stroke={c.hairHighlight}
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          </g>
        )}

        {/* Harrison: Bright golden blonde hair */}
        {c.hairStyle === "blonde" && (
          <g>
            <path
              d="M27 48 C25 27, 37 18, 56 18 C75 18, 85 28, 83 48 C79 38, 73 35, 65 36 C56 37, 45 31, 34 39 C30 42, 29 45, 27 48 Z"
              fill={c.hairColor}
              stroke="#b78a14"
              strokeWidth="2"
            />
            {/* Sporty blonde swoop spikes */}
            <path
              d="M36 27 Q50 14 70 25"
              fill={c.hairColor}
              stroke="#b78a14"
              strokeWidth="1.8"
            />
            <path
              d="M39 28 Q53 20 68 29 M44 33 Q56 28 66 33"
              fill="none"
              stroke={c.hairHighlight}
              strokeWidth="2.8"
              strokeLinecap="round"
            />
          </g>
        )}

        {/* Ryan: Dark skin, short black hair in a clear side parting */}
        {c.hairStyle === "sidepart" && (
          <g>
            {/* Neat short cropped black hair */}
            <path
              d="M28 47 C27 29, 38 20, 55 20 C72 20, 83 29, 82 47 C80 39, 75 34, 68 33 C58 32, 46 33, 38 35 C33 36, 30 40, 28 47 Z"
              fill={c.hairColor}
              stroke="#050507"
              strokeWidth="1.8"
            />
            {/* Crisp visible side parting line on the left side */}
            <path
              d="M41 23 L38 35"
              stroke={c.skinColor}
              strokeWidth="2.4"
              strokeLinecap="round"
            />
            {/* Sleek combed side-part sheen sweeping right */}
            <path
              d="M43 26 Q58 23 73 29 M43 31 Q57 29 70 32"
              fill="none"
              stroke={c.hairHighlight}
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          </g>
        )}

        {/* Emma: Shortest, dark brown hair with a bob and straight fringe */}
        {c.hairStyle === "bobfringe" && (
          <g>
            {/* Side bob pieces framing cheeks */}
            <path
              d="M24 42 C22 57, 24 72, 32 78 C35 72, 34 58, 33 44 Z"
              fill={c.hairColor}
              stroke="#1f1109"
              strokeWidth="1.8"
            />
            <path
              d="M86 42 C88 57, 86 72, 78 78 C75 72, 76 58, 77 44 Z"
              fill={c.hairColor}
              stroke="#1f1109"
              strokeWidth="1.8"
            />
            {/* Top dome + neat straight fringe (bangs) across forehead */}
            <path
              d="M24 44 C25 22, 40 17, 55 17 C70 17, 85 22, 86 44 L78 44 L78 42 L32 42 L32 44 Z"
              fill={c.hairColor}
              stroke="#1f1109"
              strokeWidth="1.8"
            />
            {/* Subtle fringe strand notches & shine */}
            <path
              d="M41 36 L41 42 M52 35 L52 42 M63 36 L63 42 M71 37 L71 42"
              stroke="#24130a"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            <path
              d="M37 26 Q55 21 73 26"
              fill="none"
              stroke={c.hairHighlight}
              strokeWidth="2.6"
              strokeLinecap="round"
            />
          </g>
        )}

        {/* Wet water droplets if soaked */}
        {expression === "wet" && (
          <g fill="#38bdf8" stroke="#0284c7" strokeWidth="1">
            <path d="M32 34 Q35 40 32 43 Q29 40 32 34 Z" />
            <path d="M78 38 Q81 44 78 47 Q75 44 78 38 Z" />
            <path d="M62 72 Q65 78 62 81 Q59 78 62 72 Z" />
          </g>
        )}
      </g>
    </svg>
  );
}
