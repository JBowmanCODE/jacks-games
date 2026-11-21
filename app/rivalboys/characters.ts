export type CharacterId = "jackb" | "jacky" | "harrison" | "ryan" | "emma";

export type ActivityId =
  | "roblox"
  | "football"
  | "youtube"
  | "waterguns"
  | "bottleflip"
  | "sleepover";

export interface CharacterDef {
  id: CharacterId;
  name: string;
  gender: "boy" | "girl";
  tagline: string;
  appearanceNote: string;
  heightScale: number; // Emma is shortest!
  skinColor: string;
  skinShadow: string;
  hairColor: string;
  hairHighlight: string;
  hairStyle: "mullet" | "curly" | "blonde" | "sidepart" | "bobfringe";
  shirtColor: string;
  shirtAccent: string;
  shortsColor: string;
  shoeColor: string;
  watergunColor: string;
  watergunAccent: string;
  badgeGradient: string;
  ringColor: string;
  voicePitch: number;
  shouts: string[];
  robloxShouts: string[];
  footballShouts: string[];
  youtubeShouts: string[];
  watergunShouts: string[];
  sleepShouts: string[];
}

export const CHARACTERS: CharacterDef[] = [
  {
    id: "jackb",
    name: "JackB",
    gender: "boy",
    tagline: "Mullet Legend",
    appearanceNote: "Light brown mullet",
    heightScale: 1.0,
    skinColor: "#f7c9a6",
    skinShadow: "#dfa780",
    hairColor: "#a67549",
    hairHighlight: "#c49464",
    hairStyle: "mullet",
    shirtColor: "#ef4444",
    shirtAccent: "#991b1b",
    shortsColor: "#1e293b",
    shoeColor: "#ffffff",
    watergunColor: "#ef4444",
    watergunAccent: "#fde047",
    badgeGradient: "from-red-600 to-rose-700",
    ringColor: "#ef4444",
    voicePitch: 1.02,
    shouts: [
      "LET'S GOOO!!",
      "NO WAY BRO!!",
      "MULLET POWER!!",
      "WHO TOOK MY CONTROLLER?!",
      "AAAHHH!!",
    ],
    robloxShouts: ["1V1 ME RIGHT NOW!", "CLIP THAT!!", "HACKER!!", "NO SCOPE!!"],
    footballShouts: ["TOP BINS!!", "PASS IT TO ME!", "SIUUUU!!", "REF THAT'S A FOUL!"],
    youtubeShouts: ["NOOO HE FELL!!", "REWIND THAT!!", "PASS THE POPCORN!", "BRUH!!"],
    watergunShouts: ["SOAKED YA!!", "COLD COLD COLD!!", "DIRECT HIT!!", "RELOAD!!"],
    sleepShouts: ["I'M NOT TIRED!", "BRO STOP SNORING!", "SHHH FOOTSTEPS!", "MY BLANKET!"],
  },
  {
    id: "jacky",
    name: "JackY",
    gender: "boy",
    tagline: "Curly Chaos",
    appearanceNote: "Dark brown curly hair",
    heightScale: 1.0,
    skinColor: "#f6c6a0",
    skinShadow: "#dca279",
    hairColor: "#3c2415",
    hairHighlight: "#5a3822",
    hairStyle: "curly",
    shirtColor: "#22c55e",
    shirtAccent: "#15803d",
    shortsColor: "#1e293b",
    shoeColor: "#f8fafc",
    watergunColor: "#22c55e",
    watergunAccent: "#38bdf8",
    badgeGradient: "from-emerald-600 to-green-700",
    ringColor: "#22c55e",
    voicePitch: 0.96,
    shouts: [
      "BROOO!!",
      "WAIT FOR ME!!",
      "TOO EASY!!",
      "WHOA WATCH OUT!!",
      "YEEEESSS!!",
    ],
    robloxShouts: ["CLUTCHED IT!!", "MY STREAK!!", "HE'S ONE SHOT!", "GG EZ!!"],
    footballShouts: ["WHAT A SCREAMER!", "I'M OPEN!!", "GOALAZO!!", "HAND BALL!!"],
    youtubeShouts: ["OHHHHH!!", "SUBSCRIBE!!", "DON'T EAT IT ALL!", "HAHAHA!!"],
    watergunShouts: ["SPLASH ZONE!!", "GET DRENCHED!!", "AAAH MY HAIR!!", "WATER BALLOON!!"],
    sleepShouts: ["WHO THREW THAT PILLOW?!", "SNEAK POPCORN!", "ZZZZ...", "FIVE MORE MINS!"],
  },
  {
    id: "harrison",
    name: "Harrison",
    gender: "boy",
    tagline: "Blonde Striker",
    appearanceNote: "Blonde hair",
    heightScale: 1.0,
    skinColor: "#fbe0c4",
    skinShadow: "#e5ba93",
    hairColor: "#f2c94c",
    hairHighlight: "#fff1a8",
    hairStyle: "blonde",
    shirtColor: "#38bdf8",
    shirtAccent: "#0369a1",
    shortsColor: "#0f172a",
    shoeColor: "#fde047",
    watergunColor: "#0ea5e9",
    watergunAccent: "#f97316",
    badgeGradient: "from-sky-500 to-blue-700",
    ringColor: "#38bdf8",
    voicePitch: 1.08,
    shouts: [
      "OHHH COME ON!!",
      "WOOOHOOO!!",
      "WATCH THIS!!",
      "I CALL NEXT!!",
      "LOUDER!!",
    ],
    robloxShouts: ["GET BEAMED!!", "ROBLOX KING!!", "LAG!! IT'S LAG!!", "ELIMINATED!!"],
    footballShouts: ["WORLDIE!!", "WHAT A SAVE!!", "SHOOT!!", "KICKOFF!!"],
    youtubeShouts: ["WAIT LOOK AT THAT!", "CRUNCHY!!", "MY FAVOURITE VIDEO!", "NO WAY!!"],
    watergunShouts: ["SUPER SOAKER TIME!", "BULLSEYE!!", "IT'S FREEZING!!", "RUN!!"],
    sleepShouts: ["I CALLED SOFA!!", "STOP KICKING ME!", "PILLOW FIGHT!!", "SHHH ACT ASLEEP!"],
  },
  {
    id: "ryan",
    name: "Ryan",
    gender: "boy",
    tagline: "Side-Part Boss",
    appearanceNote: "Dark skin, short black side-part",
    heightScale: 1.0,
    skinColor: "#8d5b3c",
    skinShadow: "#70442a",
    hairColor: "#141418",
    hairHighlight: "#2f2f38",
    hairStyle: "sidepart",
    shirtColor: "#a855f7",
    shirtAccent: "#facc15",
    shortsColor: "#18181b",
    shoeColor: "#facc15",
    watergunColor: "#a855f7",
    watergunAccent: "#22d3ee",
    badgeGradient: "from-purple-600 to-indigo-700",
    ringColor: "#a855f7",
    voicePitch: 0.9,
    shouts: [
      "TOO SMOOTH!!",
      "LET'S GO BOYS!!",
      "YOU CAN'T CATCH ME!!",
      "NO CHANCE!!",
      "YOOOOO!!",
    ],
    robloxShouts: ["HEADSHOT!!", "UNDISPUTED!!", "BRO HOW?!", "RIVALS CHAMP!!"],
    footballShouts: ["NUTMEG!!", "BACK OF THE NET!", "THROUGH BALL!!", "UNSTOPPABLE!!"],
    youtubeShouts: ["THAT'S INSANE!!", "TOSS ME SOME!", "BRO LOOK!!", "LEGENDARY!!"],
    watergunShouts: ["GOTCHA!!", "DODGED IT!!", "MEGA SPLASH!!", "NO MERCY!!"],
    sleepShouts: ["FLOOR GANG!!", "TURN OFF THE LIGHT!", "DID YOU HEAR THAT?!", "ZZZZ..."],
  },
  {
    id: "emma",
    name: "Emma",
    gender: "girl",
    tagline: "Chaos Queen (Shortest!)",
    appearanceNote: "Shortest, dark brown bob & fringe",
    heightScale: 0.8,
    skinColor: "#f9d2b5",
    skinShadow: "#e2b08d",
    hairColor: "#382115",
    hairHighlight: "#573624",
    hairStyle: "bobfringe",
    shirtColor: "#ec4899",
    shirtAccent: "#9d174d",
    shortsColor: "#312e81",
    shoeColor: "#f472b6",
    watergunColor: "#ec4899",
    watergunAccent: "#fde047",
    badgeGradient: "from-pink-500 to-fuchsia-700",
    ringColor: "#ec4899",
    voicePitch: 1.32,
    shouts: [
      "I'M WINNING!!",
      "HEHEHE!!",
      "MY POPCORN!!",
      "BOYS ARE SO LOUD!!",
      "GOT YOU!!",
    ],
    robloxShouts: ["EMMA ON TOP!!", "TOO FAST FOR YOU!", "BOOM!!", "BEAT ALL THE BOYS!"],
    footballShouts: ["SUPER GOAL!!", "BLOW THE WHISTLE!", "NICE TRY BOYS!", "WATCH THIS!!"],
    youtubeShouts: ["I TOOK THE BOWL!!", "SO FUNNY!!", "MORE POPCORN!!", "HAHA GOTCHA!!"],
    watergunShouts: ["SPLASH ATTACK!!", "SHORTEST & FASTEST!", "SOAK THE BOYS!!", "HEHEHE!!"],
    sleepShouts: ["GO TO SLEEP BOYS!!", "I'M TELLING!!", "SHHHH!!", "WHO'S AWAKE?!"],
  },
];

export const BOYS: CharacterDef[] = CHARACTERS.filter((c) => c.gender === "boy");

export function getCharacter(id: CharacterId): CharacterDef {
  return CHARACTERS.find((c) => c.id === id) ?? CHARACTERS[0];
}

export function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export interface ActivityMeta {
  id: ActivityId;
  title: string;
  shortTitle: string;
  emoji: string;
  description: string;
  color: string;
  accent: string;
}

export const ACTIVITIES: ActivityMeta[] = [
  {
    id: "roblox",
    title: "Roblox Rivals",
    shortTitle: "Roblox Rivals",
    emoji: "🎮",
    description: "Blast rival avatars in a neon Roblox arena! Dash, aim, build streaks & scream!",
    color: "from-violet-700 to-fuchsia-700",
    accent: "#c084fc",
  },
  {
    id: "football",
    title: "Backyard Football",
    shortTitle: "Football",
    emoji: "⚽",
    description: "2v2 kickabout chaos! Dribble, shoot top bins & watch for Golden Balls!",
    color: "from-emerald-700 to-green-700",
    accent: "#4ade80",
  },
  {
    id: "youtube",
    title: "YouTube & Popcorn",
    shortTitle: "YouTube + Popcorn",
    emoji: "🍿",
    description: "Watch crazy YouTube clips, snatch flying popcorn & shout during Hype Moments!",
    color: "from-red-700 to-amber-700",
    accent: "#fbbf24",
  },
  {
    id: "waterguns",
    title: "Watergun Chaos",
    shortTitle: "Waterguns",
    emoji: "🔫",
    description: "Spray everyone with Super Soakers, throw water balloons & refill at the hose!",
    color: "from-cyan-700 to-blue-700",
    accent: "#38bdf8",
  },
  {
    id: "bottleflip",
    title: "Bottle Flip",
    shortTitle: "Bottle Flip",
    emoji: "🍾",
    description: "Flip 5 different water bottles! Land upright streaks & insane Cap Flips!",
    color: "from-sky-600 to-teal-700",
    accent: "#2dd4bf",
  },
  {
    id: "sleepover",
    title: "Living Room Sleepover",
    shortTitle: "Sleepover",
    emoji: "🛋️",
    description: "2 boys on the sofa, 2 boys on the floor! Sneak popcorn & pretend to sleep when footsteps come!",
    color: "from-indigo-800 to-slate-800",
    accent: "#818cf8",
  },
];
