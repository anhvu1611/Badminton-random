import type { Player, Match, HistoryMap } from '../types';
import { incrementPair, decrementPair } from './historyKey';

export type ScoringState = {
  players: Player[];
  teammateHistory: HistoryMap;
  opponentHistory: HistoryMap;
};

/**
 * Apply a match result: update scores, benchCounts, lastBenched,
 * and increment teammate/opponent history.
 */
export function applyResult(
  state: ScoringState,
  match: Match,
  winner: 1 | 2,
): ScoringState {
  const winnerTeam = winner === 1 ? match.team1 : match.team2;
  const loserTeam = winner === 1 ? match.team2 : match.team1;
  const allPlayingIds = new Set([...match.team1, ...match.team2]);

  const players = state.players.map((p): Player => {
    if (winnerTeam.includes(p.id)) {
      return { ...p, score: p.score + 1, gamesPlayed: p.gamesPlayed + 1, lastBenched: false };
    }
    if (loserTeam.includes(p.id)) {
      return { ...p, score: p.score - 1, gamesPlayed: p.gamesPlayed + 1, lastBenched: false };
    }
    if (match.bench.includes(p.id)) {
      return { ...p, benchCount: p.benchCount + 1, lastBenched: true };
    }
    // Player not in this match at all (shouldn't happen in 1-court mode)
    return p;
  });

  // Teammate history: both pairs on the same team
  let tm = state.teammateHistory;
  tm = incrementPair(tm, match.team1[0], match.team1[1]);
  tm = incrementPair(tm, match.team2[0], match.team2[1]);

  // Opponent history: every cross-team pair
  let op = state.opponentHistory;
  for (const t1p of match.team1) {
    for (const t2p of match.team2) {
      op = incrementPair(op, t1p, t2p);
    }
  }

  // Reset lastBenched for players not involved (already handled above)
  void allPlayingIds;

  return { players, teammateHistory: tm, opponentHistory: op };
}

/**
 * Revert a match result: inverse of applyResult.
 * Used for single-step undo.
 */
export function revertResult(
  state: ScoringState,
  match: Match,
  winner: 1 | 2,
): ScoringState {
  const winnerTeam = winner === 1 ? match.team1 : match.team2;
  const loserTeam = winner === 1 ? match.team2 : match.team1;

  const players = state.players.map((p): Player => {
    if (winnerTeam.includes(p.id)) {
      return { ...p, score: p.score - 1, gamesPlayed: Math.max(0, p.gamesPlayed - 1) };
    }
    if (loserTeam.includes(p.id)) {
      return { ...p, score: p.score + 1, gamesPlayed: Math.max(0, p.gamesPlayed - 1) };
    }
    if (match.bench.includes(p.id)) {
      return { ...p, benchCount: Math.max(0, p.benchCount - 1) };
    }
    return p;
  });

  // Decrement teammate history
  let tm = state.teammateHistory;
  tm = decrementPair(tm, match.team1[0], match.team1[1]);
  tm = decrementPair(tm, match.team2[0], match.team2[1]);

  // Decrement opponent history
  let op = state.opponentHistory;
  for (const t1p of match.team1) {
    for (const t2p of match.team2) {
      op = decrementPair(op, t1p, t2p);
    }
  }

  return { players, teammateHistory: tm, opponentHistory: op };
}
