import Link from "next/link";

const games = [
  {
    href: "/chess",
    title: "Chess vs Bot",
    description: "Play chess against an AI opponent. Choose your difficulty and test your skills!",
    emoji: "♟️",
    color: "from-purple-800 to-purple-600",
    border: "border-purple-700",
  },
  {
    href: "/hangman",
    title: "Hangman",
    description: "Guess the hidden word one letter at a time — challenging vocabulary for ages 15+.",
    emoji: "💀",
    color: "from-red-900 to-red-700",
    border: "border-red-800",
  },
];

const comingSoon = [
  { title: "Wordle", emoji: "🔤", color: "from-green-900 to-green-700" },
  { title: "Sudoku", emoji: "🔢", color: "from-blue-900 to-blue-700" },
  { title: "Snake", emoji: "🐍", color: "from-emerald-900 to-emerald-700" },
];

export default function Home() {
  return (
    <div>
      <div className="mb-10 sm:mb-12 text-center px-2">
        <h1 className="mb-3 text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white">
          Welcome to <span className="text-purple-400">Jack&apos;s Games</span>
        </h1>
        <p className="text-base sm:text-lg text-gray-400">
          Free browser games for kids aged 10+. No downloads. No accounts. Just play.
        </p>
      </div>

      <section className="mb-10 sm:mb-12">
        <h2 className="mb-4 sm:mb-6 text-xs sm:text-sm font-semibold text-purple-300 uppercase tracking-widest">
          Play Now
        </h2>
        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {games.map((game) => (
            <Link
              key={game.href}
              href={game.href}
              className={`group relative overflow-hidden rounded-2xl border ${game.border} bg-gradient-to-br ${game.color} p-5 sm:p-6 shadow-lg transition-transform hover:-translate-y-1`}
            >
              <div className="mb-3 text-4xl sm:text-5xl">{game.emoji}</div>
              <h3 className="mb-1 text-lg sm:text-xl font-bold text-white">{game.title}</h3>
              <p className="text-sm text-gray-200 leading-relaxed">{game.description}</p>
              <span className="mt-4 inline-block rounded-full bg-white/20 px-4 py-1 text-xs font-semibold text-white group-hover:bg-white/30 transition-colors">
                Play →
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-4 sm:mb-6 text-xs sm:text-sm font-semibold text-gray-500 uppercase tracking-widest">
          Coming Soon
        </h2>
        <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-3">
          {comingSoon.map((game) => (
            <div
              key={game.title}
              className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${game.color} p-5 sm:p-6 opacity-40 select-none`}
            >
              <div className="mb-2 text-3xl sm:text-4xl">{game.emoji}</div>
              <h3 className="text-base sm:text-lg font-bold text-white">{game.title}</h3>
              <span className="mt-3 inline-block rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white">
                Coming Soon
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
