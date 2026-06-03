export type Category =
  | "Finishing Moves"
  | "Catchphrases"
  | "Nicknames"
  | "Tag Teams"
  | "Real Names"
  | "Championships"
  | "Origins";

export type Question = {
  question: string;
  answers: [string, string, string, string]; // [correct, wrong, wrong, wrong]
  category: Category;
};

export const QUESTIONS: Question[] = [
  // ── Finishing Moves ──────────────────────────────────────────────
  { category: "Finishing Moves", question: "What is Stone Cold Steve Austin's finishing move?", answers: ["Stone Cold Stunner", "Sweet Chin Music", "RKO", "Pedigree"] },
  { category: "Finishing Moves", question: "What is The Rock's finishing move?", answers: ["The People's Elbow / Rock Bottom", "Stone Cold Stunner", "Tombstone Piledriver", "Swanton Bomb"] },
  { category: "Finishing Moves", question: "What is John Cena's finishing move?", answers: ["Attitude Adjustment", "Go To Sleep", "RKO", "F-5"] },
  { category: "Finishing Moves", question: "What is The Undertaker's finishing move?", answers: ["Tombstone Piledriver", "F-5", "Sweet Chin Music", "Pedigree"] },
  { category: "Finishing Moves", question: "What is Shawn Michaels' finishing move?", answers: ["Sweet Chin Music", "Tombstone Piledriver", "RKO", "Spear"] },
  { category: "Finishing Moves", question: "What is Randy Orton's finishing move?", answers: ["RKO", "F-5", "Phenomenal Forearm", "Kinshasa"] },
  { category: "Finishing Moves", question: "What is Brock Lesnar's finishing move?", answers: ["F-5", "RKO", "GTS", "Sister Abigail"] },
  { category: "Finishing Moves", question: "What is CM Punk's finishing move?", answers: ["Go To Sleep (GTS)", "Attitude Adjustment", "RKO", "Pedigree"] },
  { category: "Finishing Moves", question: "What is Triple H's finishing move?", answers: ["Pedigree", "Stone Cold Stunner", "Rock Bottom", "F-5"] },
  { category: "Finishing Moves", question: "What is AJ Styles' finishing move?", answers: ["Phenomenal Forearm / Styles Clash", "RKO", "Coup de Grace", "Crossface"] },
  { category: "Finishing Moves", question: "What is Seth Rollins' finishing move?", answers: ["Curb Stomp", "RKO", "Swanton Bomb", "Pedigree"] },
  { category: "Finishing Moves", question: "What is Finn Bálor's finishing move?", answers: ["Coup de Grace", "RKO", "Sweet Chin Music", "Pedigree"] },
  { category: "Finishing Moves", question: "What is Bray Wyatt's finishing move?", answers: ["Sister Abigail", "RKO", "F-5", "Tombstone Piledriver"] },
  { category: "Finishing Moves", question: "What is Roman Reigns' finishing move?", answers: ["Spear", "RKO", "GTS", "Pedigree"] },
  { category: "Finishing Moves", question: "What is Jeff Hardy's finishing move?", answers: ["Swanton Bomb", "RKO", "Spear", "Curb Stomp"] },
  { category: "Finishing Moves", question: "What is Sasha Banks' finishing move?", answers: ["Bank Statement", "Figure Eight", "RKO", "Sharpshooter"] },
  { category: "Finishing Moves", question: "What is Becky Lynch's finishing move?", answers: ["Dis-Arm-Her", "Bank Statement", "Codebreaker", "Pedigree"] },
  { category: "Finishing Moves", question: "What is Goldberg's finishing move?", answers: ["Jackhammer / Spear", "F-5", "RKO", "Tombstone Piledriver"] },
  { category: "Finishing Moves", question: "What is Chris Jericho's finishing move?", answers: ["Walls of Jericho / Codebreaker", "RKO", "Pedigree", "Kinshasa"] },
  { category: "Finishing Moves", question: "What is Batista's finishing move?", answers: ["Batista Bomb", "Spear", "RKO", "Attitude Adjustment"] },

  // ── Catchphrases ─────────────────────────────────────────────────
  { category: "Catchphrases", question: "Who says 'And that's the bottom line, 'cause Stone Cold said so!'?", answers: ["Stone Cold Steve Austin", "The Rock", "John Cena", "Triple H"] },
  { category: "Catchphrases", question: "Who says 'Can you smell what The Rock is cooking?'?", answers: ["The Rock", "Stone Cold Steve Austin", "CM Punk", "John Cena"] },
  { category: "Catchphrases", question: "Who says 'You can't see me!'?", answers: ["John Cena", "Randy Orton", "The Miz", "Sheamus"] },
  { category: "Catchphrases", question: "Who says 'It's a great day to be alive!'?", answers: ["Kurt Angle", "Triple H", "Edge", "Chris Jericho"] },
  { category: "Catchphrases", question: "Who says 'I am the best in the world at what I do'?", answers: ["CM Punk", "AJ Styles", "The Miz", "Seth Rollins"] },
  { category: "Catchphrases", question: "Who says 'I'm the Miz… and I'm AWESOME!'?", answers: ["The Miz", "John Cena", "Randy Orton", "Dolph Ziggler"] },
  { category: "Catchphrases", question: "Who says 'Suck it!'?", answers: ["D-Generation X (Triple H & Shawn Michaels)", "The Rock", "Stone Cold Steve Austin", "The New Age Outlaws"] },
  { category: "Catchphrases", question: "Who says 'Oh, you didn't know?'?", answers: ["Road Dogg (New Age Outlaws)", "The Rock", "CM Punk", "Mick Foley"] },
  { category: "Catchphrases", question: "Who says 'Have a nice day!'?", answers: ["Mick Foley", "Undertaker", "Mankind", "Triple H"] },
  { category: "Catchphrases", question: "Who says 'Believe that!'?", answers: ["Roman Reigns", "John Cena", "Seth Rollins", "Big E"] },
  { category: "Catchphrases", question: "Who says 'The Champ is here!'?", answers: ["John Cena", "The Rock", "Randy Orton", "Batista"] },
  { category: "Catchphrases", question: "Who shouts 'WHAT?' repeatedly during promos?", answers: ["Stone Cold Steve Austin", "The Rock", "Triple H", "Kane"] },

  // ── Nicknames ─────────────────────────────────────────────────────
  { category: "Nicknames", question: "What is The Rock's nickname?", answers: ["The Great One / The People's Champion", "The Phenom", "The Beast Incarnate", "The Viper"] },
  { category: "Nicknames", question: "What is The Undertaker's nickname?", answers: ["The Phenom / The Dead Man", "The Great One", "The Beast Incarnate", "The Heartbreak Kid"] },
  { category: "Nicknames", question: "What is Brock Lesnar's nickname?", answers: ["The Beast Incarnate", "The Phenom", "The Viper", "The Chosen One"] },
  { category: "Nicknames", question: "What is Shawn Michaels' nickname?", answers: ["The Heartbreak Kid (HBK)", "The Phenomenal One", "The Viper", "The Showstopper"] },
  { category: "Nicknames", question: "What is Randy Orton's nickname?", answers: ["The Viper / The Legend Killer", "The Beast", "The Phenom", "The Game"] },
  { category: "Nicknames", question: "What is Triple H's nickname?", answers: ["The Game / The King of Kings", "The Viper", "The Beast Incarnate", "The Showstopper"] },
  { category: "Nicknames", question: "What is AJ Styles' nickname?", answers: ["The Phenomenal One", "The Viper", "The Best in the World", "The Heartbreak Kid"] },
  { category: "Nicknames", question: "What is Becky Lynch's nickname?", answers: ["The Man", "The Phenomenal One", "The Boss", "The Queen"] },
  { category: "Nicknames", question: "What is Charlotte Flair's nickname?", answers: ["The Queen", "The Man", "The Boss", "The Goddess"] },
  { category: "Nicknames", question: "What is Sasha Banks' nickname?", answers: ["The Boss", "The Queen", "The Man", "The Empress"] },

  // ── Tag Teams ─────────────────────────────────────────────────────
  { category: "Tag Teams", question: "What tag team did Shawn Michaels and Triple H form?", answers: ["D-Generation X (DX)", "The Hardy Boyz", "The Dudley Boyz", "The New Day"] },
  { category: "Tag Teams", question: "What tag team did Matt and Jeff Hardy form?", answers: ["The Hardy Boyz", "The Dudley Boyz", "Edge & Christian", "D-Generation X"] },
  { category: "Tag Teams", question: "What team did Big E, Kofi Kingston and Xavier Woods form?", answers: ["The New Day", "The Shield", "Evolution", "The Nexus"] },
  { category: "Tag Teams", question: "Dean Ambrose, Roman Reigns and Seth Rollins formed which group?", answers: ["The Shield", "The New Day", "The Wyatt Family", "Evolution"] },
  { category: "Tag Teams", question: "What tag team did Bubba Ray and D-Von Dudley form?", answers: ["The Dudley Boyz", "The Hardy Boyz", "Edge & Christian", "The APA"] },
  { category: "Tag Teams", question: "Which tag team was famous for 3D (3 Dimensional) as a finisher?", answers: ["The Dudley Boyz", "The Hardy Boyz", "LOD / Road Warriors", "The Usos"] },
  { category: "Tag Teams", question: "Which team did The Usos align with under Roman Reigns' Bloodline?", answers: ["The Bloodline", "The Shield", "The New Day", "The Wyatt Family"] },
  { category: "Tag Teams", question: "Which legendary tag team had the Road Warriors / Legion of Doom?", answers: ["Hawk & Animal", "Bubba Ray & D-Von", "Matt & Jeff Hardy", "Edge & Christian"] },

  // ── Real Names ────────────────────────────────────────────────────
  { category: "Real Names", question: "What is The Rock's real name?", answers: ["Dwayne Johnson", "Mike Mizanin", "Brian Pillman", "Randy Hennig"] },
  { category: "Real Names", question: "What is Stone Cold Steve Austin's real name?", answers: ["Steve Williams / Steve Anderson", "Steve Borden", "Scott Hall", "Kevin Nash"] },
  { category: "Real Names", question: "What is Triple H's real name?", answers: ["Paul Levesque", "Dwayne Johnson", "Michael Hickenbottom", "Glen Jacobs"] },
  { category: "Real Names", question: "What is The Undertaker's real name?", answers: ["Mark Calaway", "Glen Jacobs", "Paul Levesque", "Terry Bollea"] },
  { category: "Real Names", question: "What is Kane's real name?", answers: ["Glen Jacobs", "Mark Calaway", "Sean Waltman", "Batista Bautista"] },
  { category: "Real Names", question: "What is John Cena's real name?", answers: ["John Felix Anthony Cena", "Randy Orton", "Phil Brooks", "Colby Lopez"] },
  { category: "Real Names", question: "What is CM Punk's real name?", answers: ["Phil Brooks", "Colby Lopez", "Jon Good", "Adam Scherr"] },
  { category: "Real Names", question: "What is Seth Rollins' real name?", answers: ["Colby Lopez", "Phil Brooks", "Jon Good", "Ryan Reeves"] },
  { category: "Real Names", question: "What is Hulk Hogan's real name?", answers: ["Terry Bollea", "Mark Callous", "Dale Moran", "Jimmy Hart"] },
  { category: "Real Names", question: "What is Sting's real name?", answers: ["Steve Borden", "Scott Hall", "Mark Calaway", "Terry Bollea"] },

  // ── Championships ─────────────────────────────────────────────────
  { category: "Championships", question: "Who holds the record for most WWE/World Championship reigns?", answers: ["John Cena / Ric Flair (16 times)", "The Rock", "Triple H", "Brock Lesnar"] },
  { category: "Championships", question: "Who won the first ever Royal Rumble match?", answers: ["Hacksaw Jim Duggan (1988)", "Hulk Hogan", "Stone Cold Steve Austin", "Bret Hart"] },
  { category: "Championships", question: "Who was the first ever Women's Champion in the WWF/WWE?", answers: ["Moolah (The Fabulous Moolah)", "Trish Stratus", "Lita", "Sasha Banks"] },
  { category: "Championships", question: "How many times did Stone Cold Steve Austin win the WWE Championship?", answers: ["6 times", "3 times", "8 times", "4 times"] },
  { category: "Championships", question: "Who was the youngest WWE Champion in history?", answers: ["Randy Orton (24 years old)", "John Cena", "Seth Rollins", "Brock Lesnar"] },
  { category: "Championships", question: "Who beat The Undertaker's WrestleMania undefeated streak?", answers: ["Brock Lesnar (at WrestleMania 30)", "Roman Reigns", "Triple H", "John Cena"] },
  { category: "Championships", question: "Who was the first Grand Slam Champion in WWE history?", answers: ["Shawn Michaels", "Stone Cold Steve Austin", "Triple H", "The Rock"] },
  { category: "Championships", question: "Ric Flair is famous for being a how-many-time World Champion?", answers: ["16-time World Champion", "10-time", "8-time", "12-time"] },

  // ── Origins ────────────────────────────────────────────────────────
  { category: "Origins", question: "Where is Sheamus from?", answers: ["Dublin, Ireland", "Glasgow, Scotland", "London, England", "Toronto, Canada"] },
  { category: "Origins", question: "Where is Sami Zayn from?", answers: ["Montreal, Canada", "Lebanon", "London, England", "Boston, USA"] },
  { category: "Origins", question: "Drew McIntyre is from which country?", answers: ["Scotland", "Ireland", "England", "Wales"] },
  { category: "Origins", question: "Where is Kofi Kingston originally from?", answers: ["Ghana, West Africa", "Jamaica", "Nigeria", "Trinidad"] },
  { category: "Origins", question: "Batista was born in which US city?", answers: ["Washington D.C.", "New York", "Los Angeles", "Miami"] },
  { category: "Origins", question: "Where is Rey Mysterio from?", answers: ["San Diego, California, USA", "Mexico City, Mexico", "Tijuana, Mexico", "Puerto Rico"] },
  { category: "Origins", question: "Yokozuna represented which country despite being born in the USA?", answers: ["Japan", "Samoa", "Tonga", "China"] },
];

export function getRandomQuestions(count = 10): Question[] {
  const shuffled = [...QUESTIONS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export function shuffleAnswers(q: Question): { text: string; correct: boolean }[] {
  return [
    { text: q.answers[0], correct: true },
    { text: q.answers[1], correct: false },
    { text: q.answers[2], correct: false },
    { text: q.answers[3], correct: false },
  ].sort(() => Math.random() - 0.5);
}
