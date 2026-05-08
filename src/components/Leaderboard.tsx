import { useGameStore } from "../store/useGameStore";

export function Leaderboard() {
  const players = useGameStore((s) => s.players);
  const history = useGameStore((s) => s.history);

  if (players.length === 0) return null;

  // Count games played per player
  const gamesPlayed = new Map<string, number>();
  for (const match of history) {
    if (!match.winner) continue;
    for (const id of [...match.team1, ...match.team2]) {
      gamesPlayed.set(id, (gamesPlayed.get(id) ?? 0) + 1);
    }
  }

  const sorted = [...players].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.name.localeCompare(b.name);
  });

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
      <h2 className="text-lg font-bold text-gray-800 mb-4">Leaderboard</h2>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-gray-400 uppercase tracking-wide border-b border-gray-100">
            <th className="text-left pb-2">#</th>
            <th className="text-left pb-2">Tên</th>
            <th className="text-right pb-2">Điểm</th>
            <th className="text-right pb-2">Games</th>
            <th className="text-right pb-2">Bench</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((p, idx) => (
            <tr key={p.id} className="border-b border-gray-50 last:border-0">
              <td className="py-2 text-gray-400 font-medium pr-1">{idx + 1}</td>
              <td className="py-2 font-semibold text-gray-800 flex items-center gap-1.5">
                {p.name}
                {!p.active && (
                  <span className="text-xs text-gray-400 font-normal bg-gray-100 px-1.5 py-0.5 rounded">
                    Left
                  </span>
                )}
              </td>
              <td
                className={`py-2 text-right font-bold tabular-nums ${p.score > 0 ? "text-green-600" : p.score < 0 ? "text-red-500" : "text-gray-400"}`}
              >
                {p.score > 0 ? `+${p.score}` : p.score}
              </td>
              <td className="py-2 text-right text-gray-400 tabular-nums">
                {gamesPlayed.get(p.id) ?? 0}
              </td>
              <td className="py-2 text-right text-gray-400 tabular-nums">
                {p.benchCount}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
