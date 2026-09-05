// The Level Select route (ticket #6): World 1's five Levels as cards, with
// lock state, best accuracy, and stars read from storage on the client.

import { LevelSelectScreen } from "@/components/game/level-select-screen";
import { WORLD_ONE } from "@/lib/game/levels";

export default function LevelsPage() {
  return <LevelSelectScreen levels={WORLD_ONE} />;
}
