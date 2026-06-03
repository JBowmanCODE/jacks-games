export type Era = "Current" | "Legend";

export type Player = {
  name: string;
  nationality: string;
  flag: string;
  era: Era;
  stats: {
    clubGoals: number;
    intlGoals: number;
    intlCaps: number;
    ucl: number;       // Champions League titles
    trophies: number;  // total major trophies (club + intl)
    ballonar: number;  // Ballon d'Or awards
  };
};

export const STAT_LABELS: Record<keyof Player["stats"], string> = {
  clubGoals:  "Career Club Goals",
  intlGoals:  "International Goals",
  intlCaps:   "International Caps",
  ucl:        "Champions League Titles",
  trophies:   "Major Trophies",
  ballonar:   "Ballon d'Or Awards",
};

export const STAT_EMOJI: Record<keyof Player["stats"], string> = {
  clubGoals:  "⚽",
  intlGoals:  "🌍",
  intlCaps:   "🪪",
  ucl:        "🏆",
  trophies:   "🥇",
  ballonar:   "⭐",
};

export const PLAYERS: Player[] = [
  // ── Current Stars ──────────────────────────────────────────────────
  {
    name: "Lionel Messi",        nationality: "Argentina",  flag: "🇦🇷", era: "Current",
    stats: { clubGoals: 710, intlGoals: 109, intlCaps: 191, ucl: 4, trophies: 46, ballonar: 8 },
  },
  {
    name: "Cristiano Ronaldo",   nationality: "Portugal",   flag: "🇵🇹", era: "Current",
    stats: { clubGoals: 725, intlGoals: 133, intlCaps: 221, ucl: 5, trophies: 35, ballonar: 5 },
  },
  {
    name: "Neymar Jr",           nationality: "Brazil",     flag: "🇧🇷", era: "Current",
    stats: { clubGoals: 420, intlGoals: 79,  intlCaps: 125, ucl: 1, trophies: 28, ballonar: 0 },
  },
  {
    name: "Kylian Mbappé",       nationality: "France",     flag: "🇫🇷", era: "Current",
    stats: { clubGoals: 280, intlGoals: 53,  intlCaps: 87,  ucl: 1, trophies: 18, ballonar: 0 },
  },
  {
    name: "Erling Haaland",      nationality: "Norway",     flag: "🇳🇴", era: "Current",
    stats: { clubGoals: 270, intlGoals: 35,  intlCaps: 45,  ucl: 1, trophies: 8,  ballonar: 0 },
  },
  {
    name: "Harry Kane",          nationality: "England",    flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", era: "Current",
    stats: { clubGoals: 370, intlGoals: 68,  intlCaps: 108, ucl: 0, trophies: 1,  ballonar: 0 },
  },
  {
    name: "Mohamed Salah",       nationality: "Egypt",      flag: "🇪🇬", era: "Current",
    stats: { clubGoals: 320, intlGoals: 57,  intlCaps: 102, ucl: 1, trophies: 14, ballonar: 0 },
  },
  {
    name: "Kevin De Bruyne",     nationality: "Belgium",    flag: "🇧🇪", era: "Current",
    stats: { clubGoals: 130, intlGoals: 26,  intlCaps: 103, ucl: 1, trophies: 22, ballonar: 0 },
  },
  {
    name: "Luka Modrić",         nationality: "Croatia",    flag: "🇭🇷", era: "Current",
    stats: { clubGoals: 115, intlGoals: 25,  intlCaps: 176, ucl: 5, trophies: 26, ballonar: 1 },
  },
  {
    name: "Robert Lewandowski",  nationality: "Poland",     flag: "🇵🇱", era: "Current",
    stats: { clubGoals: 640, intlGoals: 82,  intlCaps: 148, ucl: 1, trophies: 22, ballonar: 0 },
  },
  {
    name: "Karim Benzema",       nationality: "France",     flag: "🇫🇷", era: "Current",
    stats: { clubGoals: 430, intlGoals: 37,  intlCaps: 97,  ucl: 5, trophies: 26, ballonar: 1 },
  },
  {
    name: "Virgil van Dijk",     nationality: "Netherlands",flag: "🇳🇱", era: "Current",
    stats: { clubGoals: 50,  intlGoals: 12,  intlCaps: 75,  ucl: 1, trophies: 10, ballonar: 0 },
  },
  {
    name: "Jude Bellingham",     nationality: "England",    flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", era: "Current",
    stats: { clubGoals: 65,  intlGoals: 14,  intlCaps: 40,  ucl: 1, trophies: 5,  ballonar: 0 },
  },
  {
    name: "Vinicius Jr",         nationality: "Brazil",     flag: "🇧🇷", era: "Current",
    stats: { clubGoals: 120, intlGoals: 28,  intlCaps: 52,  ucl: 2, trophies: 12, ballonar: 0 },
  },
  {
    name: "Rodri",               nationality: "Spain",      flag: "🇪🇸", era: "Current",
    stats: { clubGoals: 35,  intlGoals: 16,  intlCaps: 75,  ucl: 2, trophies: 18, ballonar: 1 },
  },
  {
    name: "Phil Foden",          nationality: "England",    flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", era: "Current",
    stats: { clubGoals: 90,  intlGoals: 12,  intlCaps: 42,  ucl: 1, trophies: 14, ballonar: 0 },
  },
  {
    name: "Bukayo Saka",         nationality: "England",    flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", era: "Current",
    stats: { clubGoals: 80,  intlGoals: 18,  intlCaps: 50,  ucl: 0, trophies: 3,  ballonar: 0 },
  },
  {
    name: "Antoine Griezmann",   nationality: "France",     flag: "🇫🇷", era: "Current",
    stats: { clubGoals: 310, intlGoals: 56,  intlCaps: 135, ucl: 0, trophies: 18, ballonar: 0 },
  },
  {
    name: "Heung-min Son",       nationality: "South Korea",flag: "🇰🇷", era: "Current",
    stats: { clubGoals: 200, intlGoals: 50,  intlCaps: 130, ucl: 0, trophies: 6,  ballonar: 0 },
  },
  {
    name: "Bruno Fernandes",     nationality: "Portugal",   flag: "🇵🇹", era: "Current",
    stats: { clubGoals: 145, intlGoals: 20,  intlCaps: 80,  ucl: 0, trophies: 6,  ballonar: 0 },
  },
  {
    name: "Marcus Rashford",     nationality: "England",    flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", era: "Current",
    stats: { clubGoals: 130, intlGoals: 17,  intlCaps: 60,  ucl: 0, trophies: 8,  ballonar: 0 },
  },
  {
    name: "Pedri",               nationality: "Spain",      flag: "🇪🇸", era: "Current",
    stats: { clubGoals: 30,  intlGoals: 8,   intlCaps: 42,  ucl: 0, trophies: 8,  ballonar: 0 },
  },
  {
    name: "Gavi",                nationality: "Spain",      flag: "🇪🇸", era: "Current",
    stats: { clubGoals: 15,  intlGoals: 8,   intlCaps: 40,  ucl: 0, trophies: 10, ballonar: 0 },
  },
  {
    name: "Trent Alexander-Arnold", nationality: "England", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", era: "Current",
    stats: { clubGoals: 25,  intlGoals: 4,   intlCaps: 33,  ucl: 1, trophies: 10, ballonar: 0 },
  },

  // ── Legends ────────────────────────────────────────────────────────
  {
    name: "Pelé",                nationality: "Brazil",     flag: "🇧🇷", era: "Legend",
    stats: { clubGoals: 643, intlGoals: 77,  intlCaps: 92,  ucl: 0, trophies: 15, ballonar: 0 },
  },
  {
    name: "Diego Maradona",      nationality: "Argentina",  flag: "🇦🇷", era: "Legend",
    stats: { clubGoals: 259, intlGoals: 34,  intlCaps: 91,  ucl: 0, trophies: 12, ballonar: 2 },
  },
  {
    name: "Zinedine Zidane",     nationality: "France",     flag: "🇫🇷", era: "Legend",
    stats: { clubGoals: 125, intlGoals: 31,  intlCaps: 108, ucl: 1, trophies: 14, ballonar: 3 },
  },
  {
    name: "Ronaldo R9",          nationality: "Brazil",     flag: "🇧🇷", era: "Legend",
    stats: { clubGoals: 352, intlGoals: 62,  intlCaps: 98,  ucl: 0, trophies: 12, ballonar: 3 },
  },
  {
    name: "Ronaldinho",          nationality: "Brazil",     flag: "🇧🇷", era: "Legend",
    stats: { clubGoals: 198, intlGoals: 33,  intlCaps: 97,  ucl: 1, trophies: 14, ballonar: 2 },
  },
  {
    name: "Thierry Henry",       nationality: "France",     flag: "🇫🇷", era: "Legend",
    stats: { clubGoals: 360, intlGoals: 51,  intlCaps: 123, ucl: 1, trophies: 15, ballonar: 0 },
  },
  {
    name: "David Beckham",       nationality: "England",    flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", era: "Legend",
    stats: { clubGoals: 130, intlGoals: 17,  intlCaps: 115, ucl: 2, trophies: 19, ballonar: 0 },
  },
  {
    name: "Wayne Rooney",        nationality: "England",    flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", era: "Legend",
    stats: { clubGoals: 260, intlGoals: 53,  intlCaps: 120, ucl: 1, trophies: 16, ballonar: 0 },
  },
  {
    name: "Alan Shearer",        nationality: "England",    flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", era: "Legend",
    stats: { clubGoals: 379, intlGoals: 30,  intlCaps: 63,  ucl: 0, trophies: 2,  ballonar: 0 },
  },
  {
    name: "Steven Gerrard",      nationality: "England",    flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", era: "Legend",
    stats: { clubGoals: 186, intlGoals: 21,  intlCaps: 114, ucl: 1, trophies: 10, ballonar: 0 },
  },
  {
    name: "Frank Lampard",       nationality: "England",    flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", era: "Legend",
    stats: { clubGoals: 280, intlGoals: 29,  intlCaps: 106, ucl: 1, trophies: 14, ballonar: 0 },
  },
  {
    name: "Patrick Vieira",      nationality: "France",     flag: "🇫🇷", era: "Legend",
    stats: { clubGoals: 65,  intlGoals: 6,   intlCaps: 107, ucl: 0, trophies: 14, ballonar: 0 },
  },
  {
    name: "Xavi Hernández",      nationality: "Spain",      flag: "🇪🇸", era: "Legend",
    stats: { clubGoals: 85,  intlGoals: 13,  intlCaps: 133, ucl: 4, trophies: 25, ballonar: 0 },
  },
  {
    name: "Andrés Iniesta",      nationality: "Spain",      flag: "🇪🇸", era: "Legend",
    stats: { clubGoals: 57,  intlGoals: 13,  intlCaps: 131, ucl: 4, trophies: 32, ballonar: 0 },
  },
  {
    name: "Didier Drogba",       nationality: "Ivory Coast",flag: "🇨🇮", era: "Legend",
    stats: { clubGoals: 295, intlGoals: 65,  intlCaps: 105, ucl: 1, trophies: 14, ballonar: 0 },
  },
  {
    name: "Samuel Eto'o",        nationality: "Cameroon",   flag: "🇨🇲", era: "Legend",
    stats: { clubGoals: 325, intlGoals: 56,  intlCaps: 118, ucl: 3, trophies: 16, ballonar: 0 },
  },
  {
    name: "Peter Shilton",       nationality: "England",    flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", era: "Legend",
    stats: { clubGoals: 1,   intlGoals: 0,   intlCaps: 125, ucl: 2, trophies: 8,  ballonar: 0 },
  },
  {
    name: "Bobby Charlton",      nationality: "England",    flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", era: "Legend",
    stats: { clubGoals: 249, intlGoals: 49,  intlCaps: 106, ucl: 1, trophies: 8,  ballonar: 1 },
  },
  {
    name: "Gary Lineker",        nationality: "England",    flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", era: "Legend",
    stats: { clubGoals: 281, intlGoals: 48,  intlCaps: 80,  ucl: 0, trophies: 5,  ballonar: 0 },
  },
  {
    name: "Paolo Maldini",       nationality: "Italy",      flag: "🇮🇹", era: "Legend",
    stats: { clubGoals: 33,  intlGoals: 7,   intlCaps: 126, ucl: 5, trophies: 25, ballonar: 0 },
  },
  {
    name: "Gianluigi Buffon",    nationality: "Italy",      flag: "🇮🇹", era: "Legend",
    stats: { clubGoals: 0,   intlGoals: 0,   intlCaps: 176, ucl: 0, trophies: 22, ballonar: 0 },
  },
];

export function getTwoPlayers(): [Player, Player] {
  const shuffled = [...PLAYERS].sort(() => Math.random() - 0.5);
  return [shuffled[0], shuffled[1]];
}
