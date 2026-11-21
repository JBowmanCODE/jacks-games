import type { Metadata } from "next";
import RivalBoysGame from "./RivalBoysGame";

export const metadata: Metadata = {
  title: "Rival Boys — Jack's Games",
  description:
    "Hang out with JackB, JackY, Harrison, Ryan & Emma! Play Roblox Rivals, football, YouTube & popcorn, watergun battles, scream a lot & survive the living room sleepover!",
};

export default function RivalBoysPage() {
  return <RivalBoysGame />;
}
