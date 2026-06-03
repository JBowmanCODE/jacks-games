export type Difficulty = "easy" | "medium" | "hard";

export type Category = {
  name: string;
  words: string[];
};

export type DifficultyConfig = {
  label: string;
  age: string;
  emoji: string;
  categories: Category[];
};

const EASY_CATEGORIES: Category[] = [
  {
    name: "Animals",
    words: [
      "cat", "dog", "fish", "bird", "frog", "bear", "lion", "duck",
      "cow", "pig", "hen", "fox", "owl", "bee", "ant", "bat",
      "crab", "deer", "goat", "wolf",
    ],
  },
  {
    name: "Food",
    words: [
      "cake", "milk", "egg", "rice", "soup", "bread", "apple", "grape",
      "lemon", "mango", "pizza", "chips", "pasta", "beans", "corn",
      "pear", "plum", "lime", "peach", "melon",
    ],
  },
  {
    name: "Colours",
    words: [
      "red", "blue", "pink", "green", "gold", "grey", "brown",
      "black", "white", "cream", "peach", "lilac", "coral",
    ],
  },
  {
    name: "Things Around You",
    words: [
      "book", "door", "ball", "tree", "star", "moon", "sun", "rain",
      "snow", "wind", "fire", "rock", "leaf", "seed", "road",
      "lamp", "sock", "coat", "bell", "drum",
    ],
  },
  {
    name: "Actions",
    words: [
      "jump", "swim", "play", "read", "sing", "draw", "walk", "run",
      "skip", "kick", "clap", "wave", "wink", "bake", "ride",
    ],
  },
];

const MEDIUM_CATEGORIES: Category[] = [
  {
    name: "Nature",
    words: [
      "forest", "island", "desert", "glacier", "canyon", "meadow",
      "swamp", "jungle", "valley", "crater", "geyser", "lagoon",
      "marsh", "tundra", "delta", "dune", "cliff", "ridge", "plain",
    ],
  },
  {
    name: "Animals",
    words: [
      "dolphin", "penguin", "giraffe", "leopard", "gorilla", "hamster",
      "lobster", "octopus", "panther", "peacock", "pelican", "piranha",
      "raccoon", "sparrow", "vulture", "walrus", "weasel", "zebra",
      "cheetah", "platypus",
    ],
  },
  {
    name: "School",
    words: [
      "science", "history", "english", "maths", "biology", "library",
      "student", "teacher", "homework", "project", "lesson", "pencil",
      "compass", "calendar", "diagram", "equation", "grammar", "chapter",
      "results", "subject",
    ],
  },
  {
    name: "Places",
    words: [
      "castle", "museum", "stadium", "airport", "harbour", "village",
      "market", "factory", "bridge", "temple", "palace", "prison",
      "theatre", "church", "station", "garden", "orchard", "bakery",
      "hospital", "cottage",
    ],
  },
  {
    name: "Sports & Hobbies",
    words: [
      "cricket", "tennis", "hockey", "cycling", "fishing", "camping",
      "surfing", "dancing", "cooking", "drawing", "knitting", "skating",
      "bowling", "boxing", "diving", "fencing", "rowing", "hiking",
      "archery", "climbing",
    ],
  },
];

const HARD_CATEGORIES: Category[] = [
  {
    name: "Science",
    words: [
      "photosynthesis", "mitochondria", "electromagnetic", "chromosome",
      "metamorphosis", "equilibrium", "precipitation", "thermodynamics",
      "hypothesis", "gravitational", "radioactive", "biodiversity",
      "condensation", "acceleration", "evaporation", "nucleus",
      "ecosystem", "catalyst", "diffraction", "covalent",
    ],
  },
  {
    name: "Geography",
    words: [
      "mediterranean", "archipelago", "equatorial", "peninsula",
      "hemisphere", "topography", "subtropical", "tectonic",
      "stratosphere", "longitude", "latitude", "troposphere",
      "estuary", "tributary", "meander", "lithosphere",
      "isthmus", "atoll", "escarpment", "permafrost",
    ],
  },
  {
    name: "History",
    words: [
      "renaissance", "imperialism", "sovereignty", "confederation",
      "constitution", "industrialization", "colonialism", "monarchy",
      "reformation", "persecution", "nationalism", "feudalism",
      "aristocracy", "enlightenment", "totalitarian", "suffragette",
      "abolitionist", "mercantilism", "inquisition", "annexation",
    ],
  },
  {
    name: "Literature",
    words: [
      "protagonist", "antagonist", "soliloquy", "allegory",
      "foreshadowing", "rhetorical", "symbolism", "omniscient",
      "dystopian", "onomatopoeia", "euphemism", "denouement",
      "alliteration", "juxtaposition", "catharsis", "hubris",
      "anachronism", "bildungsroman", "metafiction", "unreliable",
    ],
  },
  {
    name: "Vocabulary",
    words: [
      "serendipity", "ephemeral", "melancholy", "labyrinth",
      "pandemonium", "cacophony", "dilapidated", "flamboyant",
      "nonchalant", "exhilaration", "perseverance", "catastrophic",
      "philosophical", "clandestine", "precarious", "tenacious",
      "voracious", "meticulous", "erroneous", "superfluous",
    ],
  },
  {
    name: "Technology",
    words: [
      "algorithm", "encryption", "cybersecurity", "blockchain",
      "semiconductor", "biometric", "protocol", "firmware",
      "repository", "compiler", "recursion", "abstraction",
      "bandwidth", "virtualisation", "cryptography", "heuristic",
      "parallelism", "refactoring", "middleware", "containerisation",
    ],
  },
];

export const DIFFICULTY_CONFIG: Record<Difficulty, DifficultyConfig> = {
  easy: {
    label: "Easy",
    age: "Age 8+",
    emoji: "😊",
    categories: EASY_CATEGORIES,
  },
  medium: {
    label: "Medium",
    age: "Age 10+",
    emoji: "🤔",
    categories: MEDIUM_CATEGORIES,
  },
  hard: {
    label: "Hard",
    age: "Age 16+",
    emoji: "💀",
    categories: HARD_CATEGORIES,
  },
};

export function getRandomWordAndCategory(difficulty: Difficulty): {
  word: string;
  category: string;
} {
  const categories = DIFFICULTY_CONFIG[difficulty].categories;
  const cat = categories[Math.floor(Math.random() * categories.length)];
  const word = cat.words[Math.floor(Math.random() * cat.words.length)];
  return { word, category: cat.name };
}
