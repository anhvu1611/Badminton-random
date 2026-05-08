import type { Player, Match, HistoryMap } from '../types';
import { getPairCount } from './historyKey';

/**
 * For 1 court (4 players), there are exactly 3 unique team partitions:
 *   AB vs CD  (index 0)
 *   AC vs BD  (index 1)
 *   AD vs BC  (index 2)
 */
type Lineup = {
  team1: [string, string];
  team2: [string, string];
};

function allLineups(ids: [string, string, string, string]): Lineup[] {
  const [a, b, c, d] = ids;
  return [
    { team1: [a, b], team2: [c, d] },
    { team1: [a, c], team2: [b, d] },
    { team1: [a, d], team2: [b, c] },
  ];
}

/**
 * Score a (court + bench + lineup) candidate.
 *
 * Penalty formula:
 *   repeatedTeammate  * 10   — strongly avoid same teammates
 * + repeatedOpponent  *  3   — lightly avoid same opponents
 * + consecutiveBench  * 15   — strongly avoid benching same person twice in a row
 * + gamesPlayedOnCourt * 2   — soft bias: prefer putting less-played players on court
 *
 * The gamesPlayed weight (2) is intentionally small so it nudges without
 * overriding the fairness constraints above.
 */
function scoreCandidate(
  lineup: Lineup,
  courtPlayers: Player[],
  benchIds: string[],
  prevBenchIds: string[],
  teammateHistory: HistoryMap,
  opponentHistory: HistoryMap,
): number {
  const [t1a, t1b] = lineup.team1;
  const [t2a, t2b] = lineup.team2;

  const repeatedTeammate =
    getPairCount(teammateHistory, t1a, t1b) +
    getPairCount(teammateHistory, t2a, t2b);

  const repeatedOpponent =
    getPairCount(opponentHistory, t1a, t2a) +
    getPairCount(opponentHistory, t1a, t2b) +
    getPairCount(opponentHistory, t1b, t2a) +
    getPairCount(opponentHistory, t1b, t2b);

  const consecutiveBench = benchIds.filter((id) =>
    prevBenchIds.includes(id),
  ).length;

  const gamesPlayedOnCourt = courtPlayers.reduce(
    (sum, p) => sum + p.gamesPlayed,
    0,
  );

  return (
    repeatedTeammate * 10 +
    repeatedOpponent * 3 +
    consecutiveBench * 15 +
    gamesPlayedOnCourt * 2
  );
}

/** All C(n, k) index combinations */
function combinations(n: number, k: number): number[][] {
  const result: number[][] = [];
  const combo: number[] = [];
  function recurse(start: number) {
    if (combo.length === k) { result.push([...combo]); return; }
    for (let i = start; i < n; i++) {
      combo.push(i); recurse(i + 1); combo.pop();
    }
  }
  recurse(0);
  return result;
}

export type GeneratedMatch = {
  match: Match;
  lineupIndex: number;
};

/**
 * Pick the best match by enumerating every possible (court-4, bench, lineup)
 * combination and choosing the one with the lowest penalty score.
 * For typical session sizes (5–12 players) this is fast:
 *   C(12,4) * 3 = 495 * 3 = 1485 candidates.
 */
export function pickBestMatch(params: {
  players: Player[];
  teammateHistory: HistoryMap;
  opponentHistory: HistoryMap;
  prevBenchIds: string[];
  excludeLineupIndexes?: number[];
}): GeneratedMatch | null {
  const {
    players: allPlayers,
    teammateHistory,
    opponentHistory,
    prevBenchIds,
    excludeLineupIndexes = [],
  } = params;

  const players = allPlayers.filter((p) => p.active);
  if (players.length < 4) return null;

  type Candidate = {
    lineup: Lineup;
    lineupIndex: number;
    benchIds: string[];
    courtPlayers: Player[];
    penalty: number;
  };

  let bestPenalty = Infinity;
  let best: Candidate[] = [];

  for (const courtIdx of combinations(players.length, 4)) {
    const courtPlayers = courtIdx.map((i) => players[i]);
    const courtIds = courtPlayers.map((p) => p.id) as [string, string, string, string];
    const benchIds = players
      .filter((_, i) => !courtIdx.includes(i))
      .map((p) => p.id);

    const lineups = allLineups(courtIds);
    for (let li = 0; li < lineups.length; li++) {
      const penalty = scoreCandidate(
        lineups[li],
        courtPlayers,
        benchIds,
        prevBenchIds,
        teammateHistory,
        opponentHistory,
      );
      const candidate: Candidate = {
        lineup: lineups[li],
        lineupIndex: li,
        benchIds,
        courtPlayers,
        penalty,
      };
      if (penalty < bestPenalty) {
        bestPenalty = penalty;
        best = [candidate];
      } else if (penalty === bestPenalty) {
        best.push(candidate);
      }
    }
  }

  if (best.length === 0) return null;

  // Re-roll: prefer candidates that differ in lineupIndex from excluded ones.
  // Only filter if there are alternatives; otherwise fall back to full set.
  const nonExcluded = best.filter(
    (c) => !excludeLineupIndexes.includes(c.lineupIndex),
  );
  const pool = nonExcluded.length > 0 ? nonExcluded : best;
  const chosen = pool[Math.floor(Math.random() * pool.length)];

  const match: Match = {
    id: crypto.randomUUID(),
    team1: chosen.lineup.team1,
    team2: chosen.lineup.team2,
    bench: chosen.benchIds,
    createdAt: Date.now(),
  };

  return { match, lineupIndex: chosen.lineupIndex };
}
