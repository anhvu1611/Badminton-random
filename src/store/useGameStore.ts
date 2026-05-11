import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Player, Match, HistoryMap } from '../types';
import { pickBestMatch } from '../lib/matchmaker';
import { applyResult, revertResult } from '../lib/scoring';

type GameState = {
  players: Player[];
  currentMatch: Match | null;
  currentLineupIndex: number | null; // which of the 3 partitions is showing
  currentCourtIds: [string, string, string, string] | null; // court players for re-roll
  history: Match[]; // completed matches, newest first
  teammateHistory: HistoryMap;
  opponentHistory: HistoryMap;
};

type GameActions = {
  addPlayer: (name: string) => void;
  /** Permanently remove a player (wipes score). Use setPlayerActive for leave-early. */
  removePlayer: (id: string) => void;
  /** Mark player inactive (left early) or active again (rejoined). Score/history kept. */
  setPlayerActive: (id: string, active: boolean) => void;
  /** Toggle voluntary skip for the next round. Resets after result submitted. */
  toggleSkipRound: (id: string) => void;
  renamePlayer: (id: string, newName: string) => void;
  generateNextMatch: () => void;
  rerollMatch: () => void;
  submitResult: (winner: 1 | 2) => void;
  undoLastMatch: () => void;
  resetSession: () => void; // zero scores/history, keep players
  resetAll: () => void;     // wipe everything including players
};

const initialState: GameState = {
  players: [],
  currentMatch: null,
  currentLineupIndex: null,
  currentCourtIds: null,
  history: [],
  teammateHistory: {},
  opponentHistory: {},
};

export const useGameStore = create<GameState & GameActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      addPlayer(name: string) {
        const trimmed = name.trim();
        if (!trimmed) return;
        const player: Player = {
          id: crypto.randomUUID(),
          name: trimmed,
          score: 0,
          benchCount: 0,
          gamesPlayed: 0,
          playStreak: 0,
          lastBenched: false,
          active: true,
          skippingRound: false,
        };
        set((s) => ({ players: [...s.players, player] }));
      },

      removePlayer(id: string) {
        set((s) => {
          const players = s.players.filter((p) => p.id !== id);
          const inMatch =
            s.currentMatch &&
            (s.currentMatch.team1.includes(id) ||
              s.currentMatch.team2.includes(id) ||
              s.currentMatch.bench.includes(id));
          return {
            players,
            currentMatch: inMatch ? null : s.currentMatch,
            currentLineupIndex: inMatch ? null : s.currentLineupIndex,
            currentCourtIds: inMatch ? null : s.currentCourtIds,
          };
        });
      },

      setPlayerActive(id: string, active: boolean) {
        set((s) => {
          // When marking inactive, invalidate currentMatch if player is in it
          const inMatch =
            !active &&
            s.currentMatch &&
            (s.currentMatch.team1.includes(id) ||
              s.currentMatch.team2.includes(id) ||
              s.currentMatch.bench.includes(id));
          return {
            players: s.players.map((p) =>
              p.id === id ? { ...p, active } : p,
            ),
            currentMatch: inMatch ? null : s.currentMatch,
            currentLineupIndex: inMatch ? null : s.currentLineupIndex,
            currentCourtIds: inMatch ? null : s.currentCourtIds,
          };
        });
      },

      toggleSkipRound(id: string) {
        set((s) => ({
          players: s.players.map((p) =>
            p.id === id ? { ...p, skippingRound: !p.skippingRound } : p,
          ),
        }));
      },

      renamePlayer(id: string, newName: string) {
        const trimmed = newName.trim();
        if (!trimmed) return;
        set((s) => ({
          players: s.players.map((p) =>
            p.id === id ? { ...p, name: trimmed } : p,
          ),
        }));
      },

      generateNextMatch() {
        const s = get();
        const prevBenchIds =
          s.history.length > 0 ? s.history[0].bench : [];

        const result = pickBestMatch({
          players: s.players,
          teammateHistory: s.teammateHistory,
          opponentHistory: s.opponentHistory,
          prevBenchIds,
        });

        if (!result) return;
        const skippingIds = s.players
          .filter((p) => p.active && p.skippingRound)
          .map((p) => p.id);
        const match = {
          ...result.match,
          bench: [...result.match.bench, ...skippingIds],
        };
        set({ currentMatch: match, currentLineupIndex: result.lineupIndex, currentCourtIds: result.courtIds });
      },

      rerollMatch() {
        const s = get();
        if (!s.currentMatch) return;
        const prevBenchIds =
          s.history.length > 0 ? s.history[0].bench : [];

        const excludeIndexes =
          s.currentLineupIndex !== null ? [s.currentLineupIndex] : [];

        const result = pickBestMatch({
          players: s.players,
          teammateHistory: s.teammateHistory,
          opponentHistory: s.opponentHistory,
          prevBenchIds,
          excludeLineupIndexes: excludeIndexes,
          lockedCourtIds: s.currentCourtIds,
        });

        if (!result) return;
        const skippingIds = s.players
          .filter((p) => p.active && p.skippingRound)
          .map((p) => p.id);
        const match = {
          ...result.match,
          bench: [...result.match.bench, ...skippingIds],
        };
        set({ currentMatch: match, currentLineupIndex: result.lineupIndex, currentCourtIds: result.courtIds });
      },

      submitResult(winner: 1 | 2) {
        const s = get();
        if (!s.currentMatch) return;

        const match: Match = { ...s.currentMatch, winner };
        const updated = applyResult(
          {
            players: s.players,
            teammateHistory: s.teammateHistory,
            opponentHistory: s.opponentHistory,
          },
          match,
          winner,
        );

        set({
          players: updated.players.map((p) => ({ ...p, skippingRound: false })),
          teammateHistory: updated.teammateHistory,
          opponentHistory: updated.opponentHistory,
          history: [match, ...s.history],
          currentMatch: null,
          currentLineupIndex: null,
          currentCourtIds: null,
        });
      },

      undoLastMatch() {
        const s = get();
        if (s.history.length === 0) return;
        if (s.currentMatch) return; // don't undo while a match is pending

        const [last, ...rest] = s.history;
        if (!last.winner) return;

        const reverted = revertResult(
          {
            players: s.players,
            teammateHistory: s.teammateHistory,
            opponentHistory: s.opponentHistory,
          },
          last,
          last.winner,
        );

        // Restore lastBenched flags from the undone match
        const players = reverted.players.map((p) => ({
          ...p,
          lastBenched: last.bench.includes(p.id),
        }));

        set({
          players,
          teammateHistory: reverted.teammateHistory,
          opponentHistory: reverted.opponentHistory,
          history: rest,
          currentMatch: { ...last, winner: undefined },
          currentLineupIndex: null,
          currentCourtIds: null,
        });
      },

      resetSession() {
        const s = get();
        set({
          players: s.players.map((p) => ({
            ...p,
            score: 0,
            benchCount: 0,
            gamesPlayed: 0,
            playStreak: 0,
            lastBenched: false,
            active: true,
            skippingRound: false,
          })),
          currentMatch: null,
          currentLineupIndex: null,
          currentCourtIds: null,
          history: [],
          teammateHistory: {},
          opponentHistory: {},
        });
      },

      resetAll() {
        set(initialState);
      },
    }),
    {
      name: 'badminton-randomizer-v1',
      version: 5,
      migrate(persisted: unknown, fromVersion: number) {
        const state = persisted as GameState & { history: Match[] };
        let players = (state.players ?? []) as (Player & { gamesPlayed?: number; playStreak?: number; active?: boolean })[];
        if (fromVersion < 2) {
          players = players.map((p) => ({ ...p, active: p.active ?? true }));
        }
        if (fromVersion < 3) {
          // Backfill gamesPlayed by counting from history
          const counts = new Map<string, number>();
          for (const m of state.history ?? []) {
            if (!m.winner) continue;
            for (const id of [...m.team1, ...m.team2]) {
              counts.set(id, (counts.get(id) ?? 0) + 1);
            }
          }
          players = players.map((p) => ({
            ...p,
            gamesPlayed: p.gamesPlayed ?? counts.get(p.id) ?? 0,
          }));
        }
        if (fromVersion < 4) {
          // Backfill playStreak: 0 (can't infer accurately from history alone)
          players = players.map((p) => ({
            ...p,
            playStreak: p.playStreak ?? 0,
          }));
        }
        if (fromVersion < 5) {
          players = players.map((p) => ({
            ...p,
            skippingRound: (p as Player & { skippingRound?: boolean }).skippingRound ?? false,
          }));
        }
        return { ...state, players, currentCourtIds: null };
      },
    },
  ),
);
