import ChessGame from "./ChessGame";

export const metadata = {
  title: "Chess vs Bot — Jack's Games",
  description: "Play chess against an AI bot at 3 difficulty levels",
};

export default function ChessPage() {
  return <ChessGame />;
}
