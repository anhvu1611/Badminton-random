export type Player = {
  id: string;
  name: string;
  score: number;
  benchCount: number;
  /** Total matches played (excludes bench). Used for soft priority for late joiners. */
  gamesPlayed: number;
  lastBenched: boolean;
  /** false = player left early; kept for score/history but excluded from match generation */
  active: boolean;
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
