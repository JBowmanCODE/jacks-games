export type Category = {
  name: string;
  words: string[];
};

export const CATEGORIES: Category[] = [
  {
    name: "Science",
    words: [
      "photosynthesis", "mitochondria", "electromagnetic", "chromosome",
      "metamorphosis", "equilibrium", "precipitation", "thermodynamics",
      "hypothesis", "gravitational", "radioactive", "biodiversity",
      "condensation", "acceleration", "evaporation", "photon",
      "nucleus", "neutron", "ecosystem", "catalyst",
    ],
  },
  {
    name: "Geography",
    words: [
      "mediterranean", "archipelago", "equatorial", "peninsula",
      "hemisphere", "topography", "subtropical", "tectonic",
      "stratosphere", "longitude", "latitude", "volcano",
      "earthquake", "tsunami", "monsoon", "savannah",
      "troposphere", "estuary", "tributary", "meander",
    ],
  },
  {
    name: "History",
    words: [
      "renaissance", "imperialism", "democracy", "civilization",
      "parliament", "sovereignty", "confederation", "constitution",
      "industrialization", "colonialism", "oppression", "monarchy",
      "revolution", "reformation", "persecution", "nationalism",
      "feudalism", "aristocracy", "reformation", "enlightenment",
    ],
  },
  {
    name: "Literature",
    words: [
      "protagonist", "antagonist", "soliloquy", "allegory",
      "foreshadowing", "metaphor", "narrative", "rhetorical",
      "symbolism", "monologue", "omniscient", "dystopian",
      "satire", "paradox", "irony", "hyperbole",
      "alliteration", "onomatopoeia", "euphemism", "denouement",
    ],
  },
  {
    name: "Vocabulary",
    words: [
      "serendipity", "ephemeral", "melancholy", "labyrinth",
      "pandemonium", "cacophony", "dilapidated", "flamboyant",
      "nonchalant", "exhilaration", "perseverance", "catastrophic",
      "philosophical", "phenomenal", "magnificent", "ambiguous",
      "sophisticated", "eloquent", "inevitable", "clandestine",
      "precarious", "tenacious", "voracious", "juxtaposition",
      "omnipotent", "oblivious", "meticulous", "erroneous",
    ],
  },
  {
    name: "Technology",
    words: [
      "algorithm", "encryption", "bandwidth", "database",
      "artificial", "cybersecurity", "blockchain", "processor",
      "microchip", "semiconductor", "biometric", "protocol",
      "interface", "neural", "quantum", "firmware",
      "repository", "framework", "compiler", "recursion",
    ],
  },
];

export function getRandomWordAndCategory(): { word: string; category: string } {
  const cat = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
  const word = cat.words[Math.floor(Math.random() * cat.words.length)];
  return { word, category: cat.name };
}
