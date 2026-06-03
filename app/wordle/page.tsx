import WordleGame from "./WordleGame";

export const metadata = {
  title: "Wordle — Jack's Games",
  description: "Guess the hidden word in 6 tries. Easy (4 letters), Medium (5), Hard (6).",
};

export default function WordlePage() {
  return <WordleGame />;
}
