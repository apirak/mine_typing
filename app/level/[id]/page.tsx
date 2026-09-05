// The Gameplay route for one Level (spec #2 step 2): /level/[id]. The
// route only resolves the id against the Level data; the screen renders
// from that data, so every Level server-renders its own name and words.

import Link from "next/link";

import { GameplayScreen } from "@/components/game/gameplay-screen";
import { getLevel } from "@/lib/game/levels";

export default async function LevelPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const level = getLevel(id);

  if (!level) {
    return (
      <main className="game-shell">
        <section className="game-frame" aria-label="Level not found">
          <div className="overlay" role="dialog" aria-modal="true">
            <div className="pause-card">
              <span className="card-kicker">NO SUCH LEVEL</span>
              <h1>Level not found</h1>
              <p>World 1 has Levels 1 through 5.</p>
              <Link className="secondary-button" href="/">
                Back to the start
              </Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return <GameplayScreen level={level} />;
}
