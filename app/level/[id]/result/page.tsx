// The Result route (ticket #6): the finished run's stats, stars, and next
// steps for one Level. Without a finished run in the store (a direct
// visit), the screen shows the way back instead of stale numbers.

import Link from "next/link";

import { ResultScreen } from "@/components/game/result-screen";
import { getLevel } from "@/lib/game/levels";

export default async function LevelResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const level = getLevel(id);

  if (!level) {
    return (
      <main className="game-shell">
        <section className="menu-frame" aria-label="Level not found">
          <div className="pause-card">
            <span className="card-kicker">NO SUCH LEVEL</span>
            <h1>Level not found</h1>
            <p>The curriculum runs from Level 1-1 to Level 5-4.</p>
            <Link className="secondary-button" href="/levels">
              Back to Level Select
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return <ResultScreen level={level} />;
}
