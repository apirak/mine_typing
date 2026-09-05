// The default route plays World 1's first Level; Levels live at /level/[id]
// and a Level Select screen arrives with ticket #6.

import { GameplayScreen } from "@/components/game/gameplay-screen";
import { WORLD_ONE } from "@/lib/game/levels";

export default function Home() {
  return <GameplayScreen level={WORLD_ONE[0]} />;
}
