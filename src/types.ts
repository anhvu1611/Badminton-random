export type Player = {
  id: string;
  name: string;
  score: number;
  benchCount: number;
  /** Total matches played (excludes bench). Displayed in leaderboard. */
  gamesPlayed: number;
  /** Consecutive rounds played without a bench. Reset to 0 when benched. */
  playStreak: number;
  lastBenched: boolean;
  /** false = player left early; kept for score/history but excluded from match generation */
  active: boolean;
  /** true = player voluntarily sits out the next round; reset after result submitted */
  skippingRound: boolean;
};

export type Match = {
  id: string;
  team1: [string, string];
  team2: [string, string];
  bench: string[];
  winner?: 1 | 2;
  createdAt: number;
};

export type HistoryMap = Record<string, number>;
