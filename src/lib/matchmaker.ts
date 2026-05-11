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

/** Lexicographic compare: negative if a < b, 0 if equal, positive if a > b */
function lexCompare(a: number[], b: number[]): number {
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return 0;
}

/**
 * Stage A metric for a given court/bench split (lower = fairer).
 * Tuple: [consecutiveBench, maxPlayStreakOnCourt, benchSpreadAfter]
 *
 * - consecutiveBench: # bench players who also sat out last round → must be 0 when possible
 * - maxPlayStreakOnCourt: longest ongoing play streak among the 4 court players → avoid 3+ in a row
 * - benchSpreadAfter: max(benchCount) − min(benchCount) after this round → keep cumulative bench counts balanced
 */
function stageAMetric(
  courtPlayers: Player[],
  benchPlayers: Player[],
  allActivePlayers: Player[],
  prevBenchIds: string[],
): [number, number, number] {
  const consecutiveBench = benchPlayers.filter((p) =>
    prevBenchIds.includes(p.id),
  ).length;

  const maxPlayStreak = Math.max(0, ...courtPlayers.map((p) => p.playStreak));

  const benchIdSet = new Set(benchPlayers.map((p) => p.id));
  const countsAfter = allActivePlayers.map(
    (p) => p.benchCount + (benchIdSet.has(p.id) ? 1 : 0),
  );
  const spread = Math.max(...countsAfter) - Math.min(...countsAfter);

  return [consecutiveBench, maxPlayStreak, spread];
}

/**
 * Stage B: score a lineup by pairing history only.
 * Court selection (who plays/benches) is already decided by Stage A.
 */
function scoreLineup(
  lineup: Lineup,
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

  return repeatedTeammate * 10 + repeatedOpponent * 3;
}

/**
 * Stage A: enumerate all C(N, 4) court combos, pick those with lex-min
 * (consecutiveBench, maxPlayStreak, benchSpread). Returns the pool of
 * best court player arrays to randomly choose from.
 */
function selectCourtPool(
  players: Player[],
  prevBenchIds: string[],
): Player[][] {
  let bestMetric: [number, number, number] = [Infinity, Infinity, Infinity];
  let bestCourts: Player[][] = [];

  for (const courtIdx of combinations(players.length, 4)) {
    const court = courtIdx.map((i) => players[i]);
    const bench = players.filter((_, i) => !courtIdx.includes(i));
    const metric = stageAMetric(court, bench, players, prevBenchIds);

    const cmp = lexCompare([...metric], [...bestMetric]);
    if (cmp < 0) {
      bestMetric = metric;
      bestCourts = [court];
    } else if (cmp === 0) {
      bestCourts.push(court);
    }
  }

  return bestCourts;
}

export type GeneratedMatch = {
  match: Match;
  lineupIndex: number;
  /** The 4 player IDs on court — stored in state to support re-roll (keep same court). */
  courtIds: [string, string, string, string];
};

/**
 * Two-stage match generation:
 *
 * Stage A — pick court of 4 (hard fairness constraints, lexicographic):
 *   1. Minimize consecutive bench (no one sits 2 rounds in a row if avoidable)
 *   2. Minimize max play streak on court (no one plays 3+ in a row if avoidable)
 *   3. Minimize bench spread (keep cumulative bench counts balanced)
 *
 * Stage B — pick lineup partition (soft pairing quality):
 *   Minimize repeatedTeammate×10 + repeatedOpponent×3
 *
 * Re-roll: pass `lockedCourtIds` to skip Stage A and only rotate Stage B partitions.
 */
export function pickBestMatch(params: {
  players: Player[];
  teammateHistory: HistoryMap;
  opponentHistory: HistoryMap;
  prevBenchIds: string[];
  excludeLineupIndexes?: number[];
  /** If set, skip Stage A and use these 4 players as the court (re-roll behavior). */
  lockedCourtIds?: [string, string, string, string] | null;
}): GeneratedMatch | null {
  const {
    players: allPlayers,
    teammateHistory,
    opponentHistory,
    prevBenchIds,
    excludeLineupIndexes = [],
    lockedCourtIds = null,
  } = params;

  const players = allPlayers.filter((p) => p.active);
  if (players.length < 4) return null;

  // --- Stage A ---
  let courtPlayers: Player[];

  if (lockedCourtIds) {
    const lookup = new Map(players.map((p) => [p.id, p]));
    const resolved = lockedCourtIds
      .map((id) => lookup.get(id))
      .filter((p): p is Player => p !== undefined);
    if (resolved.length === 4) {
      courtPlayers = resolved;
    } else {
      // Locked court invalid (player went inactive) — fall through to Stage A
      const pool = selectCourtPool(players, prevBenchIds);
      courtPlayers = pool[Math.floor(Math.random() * pool.length)];
    }
  } else {
    const pool = selectCourtPool(players, prevBenchIds);
    courtPlayers = pool[Math.floor(Math.random() * pool.length)];
  }

  const courtIdSet = new Set(courtPlayers.map((p) => p.id));
  const benchPlayers = players.filter((p) => !courtIdSet.has(p.id));
  const courtIds = courtPlayers.map((p) => p.id) as [string, string, string, string];

  // --- Stage B ---
  const lineups = allLineups(courtIds);
  const candidates = lineups
    .map((l, i) => ({ l, i }))
    .filter(({ i }) => !excludeLineupIndexes.includes(i));
  // If all excluded (re-rolled through all 3), fall back to any
  const pool = candidates.length > 0 ? candidates : lineups.map((l, i) => ({ l, i }));

  const scored = pool.map(({ l, i }) => ({
    lineup: l,
    index: i,
    penalty: scoreLineup(l, teammateHistory, opponentHistory),
  }));

  const minPenalty = Math.min(...scored.map((s) => s.penalty));
  const best = scored.filter((s) => s.penalty === minPenalty);
  const chosen = best[Math.floor(Math.random() * best.length)];

  const match: Match = {
    id: crypto.randomUUID(),
    team1: chosen.lineup.team1,
    team2: chosen.lineup.team2,
    bench: benchPlayers.map((p) => p.id),
    createdAt: Date.now(),
  };

  return { match, lineupIndex: chosen.index, courtIds };
}

