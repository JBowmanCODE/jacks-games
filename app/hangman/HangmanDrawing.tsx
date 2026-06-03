type Props = { wrongCount: number };

export default function HangmanDrawing({ wrongCount }: Props) {
  return (
    <svg
      viewBox="0 0 200 220"
      className="w-48 h-48 sm:w-56 sm:h-56"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Gallows */}
      <line x1="20" y1="210" x2="180" y2="210" stroke="#7c3aed" strokeWidth="4" />
      <line x1="60" y1="210" x2="60" y2="20"  stroke="#7c3aed" strokeWidth="4" />
      <line x1="60" y1="20"  x2="130" y2="20"  stroke="#7c3aed" strokeWidth="4" />
      <line x1="130" y1="20" x2="130" y2="45"  stroke="#7c3aed" strokeWidth="4" />

      {/* Head */}
      {wrongCount >= 1 && (
        <circle cx="130" cy="60" r="15" stroke="#f1f1f1" strokeWidth="3" fill="none" />
      )}
      {/* Body */}
      {wrongCount >= 2 && (
        <line x1="130" y1="75" x2="130" y2="135" stroke="#f1f1f1" strokeWidth="3" />
      )}
      {/* Left arm */}
      {wrongCount >= 3 && (
        <line x1="130" y1="90" x2="105" y2="115" stroke="#f1f1f1" strokeWidth="3" />
      )}
      {/* Right arm */}
      {wrongCount >= 4 && (
        <line x1="130" y1="90" x2="155" y2="115" stroke="#f1f1f1" strokeWidth="3" />
      )}
      {/* Left leg */}
      {wrongCount >= 5 && (
        <line x1="130" y1="135" x2="105" y2="165" stroke="#f1f1f1" strokeWidth="3" />
      )}
      {/* Right leg */}
      {wrongCount >= 6 && (
        <line x1="130" y1="135" x2="155" y2="165" stroke="#f1f1f1" strokeWidth="3" />
      )}
    </svg>
  );
}
