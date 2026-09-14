// The Level Select route (ticket #6, five Worlds per spec #15): the
// curriculum grouped by World as cards, with lock state, best accuracy,
// and stars read from storage on the client.

import { LevelSelectScreen } from "@/components/game/level-select-screen";
import { WORLDS } from "@/lib/game/levels";

export default function LevelsPage() {
  return <LevelSelectScreen worlds={WORLDS} />;
}
