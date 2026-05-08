import { useGameStore } from "../store/useGameStore";

export function CurrentMatch() {
  const players = useGameStore((s) => s.players);
  const currentMatch = useGameStore((s) => s.currentMatch);
  const generateNextMatch = useGameStore((s) => s.generateNextMatch);
  const rerollMatch = useGameStore((s) => s.rerollMatch);
  const submitResult = useGameStore((s) => s.submitResult);

  const playerMap = new Map(players.map((p) => [p.id, p.name]));
  const name = (id: string) => playerMap.get(id) ?? id;

  const canGenerate = players.filter((p) => p.active).length >= 4;

  if (!currentMatch) {
    return (
      <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <h2 className="text-lg font-bold text-gray-800 mb-4">
          Trận đấu hiện tại
        </h2>
        {!canGenerate ? (
          <p className="text-amber-600 text-sm text-center py-4">
            Need at least 4 players to generate a match.
          </p>
        ) : (
          <div className="text-center py-4">
            <p className="text-gray-400 text-sm mb-4">Chưa random</p>
            <button
              onClick={generateNextMatch}
              className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-xl text-base font-semibold transition-colors shadow-sm"
            >
              Random teams
            </button>
          </div>
        )}
      </section>
    );
  }

  const { team1, team2, bench } = currentMatch;

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-800">Trận đấu hiện tại</h2>
        <button
          onClick={rerollMatch}
          className="text-sm text-gray-400 hover:text-blue-500 underline transition-colors"
        >
          Random lại
        </button>
      </div>

      {/* Teams */}
      <div className="flex items-stretch gap-3 mb-5">
        {/* Team A */}
        <div className="flex-1 bg-blue-50 border border-blue-100 rounded-xl p-4 text-center">
          <p className="text-xs font-semibold text-blue-400 uppercase tracking-wide mb-2">
            Team A
          </p>
          {team1.map((id) => (
            <p key={id} className="text-base font-bold text-blue-700">
              {name(id)}
            </p>
          ))}
        </div>

        {/* VS divider */}
        <div className="flex items-center justify-center">
          <span className="text-gray-300 font-bold text-lg">VS</span>
        </div>

        {/* Team B */}
        <div className="flex-1 bg-orange-50 border border-orange-100 rounded-xl p-4 text-center">
          <p className="text-xs font-semibold text-orange-400 uppercase tracking-wide mb-2">
            Team B
          </p>
          {team2.map((id) => (
            <p key={id} className="text-base font-bold text-orange-700">
              {name(id)}
            </p>
          ))}
        </div>
      </div>

      {/* Bench */}
      {bench.length > 0 && (
        <div className="bg-gray-50 rounded-xl p-3 mb-5 text-center">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
            Bench
          </p>
          <p className="text-sm text-gray-600">
            {bench.map((id) => name(id)).join(", ")}
          </p>
        </div>
      )}

      {/* Result buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => submitResult(1)}
          className="bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white py-4 rounded-xl text-sm font-bold transition-colors shadow-sm"
        >
          Team A Wins
        </button>
        <button
          onClick={() => submitResult(2)}
          className="bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white py-4 rounded-xl text-sm font-bold transition-colors shadow-sm"
        >
          Team B Wins
        </button>
      </div>
    </section>
  );
}
