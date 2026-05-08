import { useGameStore } from "../store/useGameStore";

export function MatchHistory() {
  const players = useGameStore((s) => s.players);
  const history = useGameStore((s) => s.history);
  const currentMatch = useGameStore((s) => s.currentMatch);
  const undoLastMatch = useGameStore((s) => s.undoLastMatch);

  const playerMap = new Map(players.map((p) => [p.id, p.name]));
  const name = (id: string) => playerMap.get(id) ?? id;

  if (history.length === 0) return null;

  const canUndo = !currentMatch && history.length > 0;

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-800">Match History</h2>
        {canUndo && (
          <button
            onClick={undoLastMatch}
            className="text-sm text-gray-400 hover:text-red-500 underline transition-colors"
          >
            Undo last
          </button>
        )}
      </div>

      <ol className="space-y-3">
        {history.map((match, idx) => {
          const winnerTeam = match.winner === 1 ? match.team1 : match.team2;
          const loserTeam = match.winner === 1 ? match.team2 : match.team1;
          const isLatest = idx === 0;

          return (
            <li
              key={match.id}
              className={`rounded-xl p-3 text-sm ${isLatest ? "bg-gray-50 ring-1 ring-gray-200" : "bg-gray-50/50"}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-gray-400">
                  Round {history.length - idx}
                </span>
              </div>

              <div className="flex gap-3">
                {/* Winner */}
                <div className="flex-1 bg-green-50 border border-green-100 rounded-lg p-2 text-center">
                  <p className="text-xs text-green-500 font-semibold mb-1">
                    Winner ✓
                  </p>
                  {winnerTeam.map((id) => (
                    <p key={id} className="text-xs font-medium text-green-700">
                      {name(id)}
                    </p>
                  ))}
                </div>

                {/* Loser */}
                <div className="flex-1 bg-red-50 border border-red-100 rounded-lg p-2 text-center">
                  <p className="text-xs text-red-400 font-semibold mb-1">
                    Lost
                  </p>
                  {loserTeam.map((id) => (
                    <p key={id} className="text-xs font-medium text-red-600">
                      {name(id)}
                    </p>
                  ))}
                </div>

                {/* Bench */}
                {match.bench.length > 0 && (
                  <div className="flex-1 bg-gray-100 border border-gray-200 rounded-lg p-2 text-center">
                    <p className="text-xs text-gray-400 font-semibold mb-1">
                      Bench
                    </p>
                    {match.bench.map((id) => (
                      <p key={id} className="text-xs text-gray-500">
                        {name(id)}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
