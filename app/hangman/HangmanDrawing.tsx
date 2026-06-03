type Props = { wrongCount: number };

export default function HangmanDrawing({ wrongCount }: Props) {
  const dead = wrongCount >= 9;
  return (
    <svg
      viewBox="0 0 200 230"
      className="w-48 h-48 sm:w-56 sm:h-56"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Gallows */}
      <line x1="20" y1="220" x2="180" y2="220" stroke="#7c3aed" strokeWidth="4" />
      <line x1="60" y1="220" x2="60" y2="20"  stroke="#7c3aed" strokeWidth="4" />
      <line x1="60" y1="20"  x2="130" y2="20"  stroke="#7c3aed" strokeWidth="4" />
      <line x1="130" y1="20" x2="130" y2="45"  stroke="#7c3aed" strokeWidth="4" />

      {/* 1 — Head */}
      {wrongCount >= 1 && (
        <circle cx="130" cy="62" r="17" stroke="#f1f1f1" strokeWidth="3" fill="none" />
      )}
      {/* 2 — Left eye */}
      {wrongCount >= 2 && !dead && (
        <circle cx="124" cy="59" r="2.5" fill="#f1f1f1" />
      )}
      {/* 2 — Left eye X (dead) */}
      {wrongCount >= 2 && dead && (
        <>
          <line x1="121" y1="56" x2="127" y2="62" stroke="#f87171" strokeWidth="2" />
          <line x1="127" y1="56" x2="121" y2="62" stroke="#f87171" strokeWidth="2" />
        </>
      )}
      {/* 3 — Right eye */}
      {wrongCount >= 3 && !dead && (
        <circle cx="136" cy="59" r="2.5" fill="#f1f1f1" />
      )}
      {/* 3 — Right eye X (dead) */}
      {wrongCount >= 3 && dead && (
        <>
          <line x1="133" y1="56" x2="139" y2="62" stroke="#f87171" strokeWidth="2" />
          <line x1="139" y1="56" x2="133" y2="62" stroke="#f87171" strokeWidth="2" />
        </>
      )}
      {/* 4 — Mouth (smile becomes frown on death) */}
      {wrongCount >= 4 && (
        dead
          ? <path d="M124 68 Q130 64 136 68" stroke="#f87171" strokeWidth="2" fill="none" />
          : <path d="M124 66 Q130 70 136 66" stroke="#f1f1f1" strokeWidth="2" fill="none" />
      )}
      {/* 5 — Body */}
      {wrongCount >= 5 && (
        <line x1="130" y1="79" x2="130" y2="145" stroke="#f1f1f1" strokeWidth="3" />
      )}
      {/* 6 — Left arm */}
      {wrongCount >= 6 && (
        <line x1="130" y1="95" x2="105" y2="120" stroke="#f1f1f1" strokeWidth="3" />
      )}
      {/* 7 — Right arm */}
      {wrongCount >= 7 && (
        <line x1="130" y1="95" x2="155" y2="120" stroke="#f1f1f1" strokeWidth="3" />
      )}
      {/* 8 — Left leg */}
      {wrongCount >= 8 && (
        <line x1="130" y1="145" x2="105" y2="175" stroke="#f1f1f1" strokeWidth="3" />
      )}
      {/* 9 — Right leg */}
      {wrongCount >= 9 && (
        <line x1="130" y1="145" x2="155" y2="175" stroke="#f1f1f1" strokeWidth="3" />
      )}
    </svg>
  );
}
