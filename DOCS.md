# Badminton Randomizer — Documentation

Web app frontend-only chia đội đánh cầu lông đôi (1 sân), tự động xoay vòng người nghỉ và tránh lặp teammate/opponent. Không có MMR, không backend, mọi state lưu ở `localStorage`.

---

## Tech Stack

- **React 19** + **Vite 8** — UI + dev server / bundler
- **TypeScript** — strict typing
- **Zustand 5** + `persist` middleware — global state, lưu key `badminton-randomizer-v1` ở `localStorage`
- **TailwindCSS v4** — styling, dùng `@tailwindcss/vite` (không cần config file)

---

## Tính năng

### 1. Quản lý người chơi (`PlayerManager`)

- Thêm người chơi bằng tên (Enter hoặc nút Add)
- Đổi tên inline
- **Về sớm** (`setPlayerActive(id, false)`): giữ điểm + lịch sử, loại khỏi vòng chia đội. Nếu đang trong `currentMatch` → match bị huỷ.
- **Quay lại** (rejoin) cho người đã về sớm
- **Xoá hẳn** (`removePlayer`): xoá vĩnh viễn, mất điểm
- **Nghỉ lượt này** (`toggleSkipRound(id)`): đánh dấu nghỉ tự nguyện cho lượt tiếp theo — bị loại khỏi pool random, tự động vào bench. Flag reset sau khi submit kết quả. Disabled khi `currentMatch` đang tồn tại.
- Cảnh báo khi < 4 người chơi active (bao gồm cả sau khi trừ người đang skip)

### 2. Tạo trận (`CurrentMatch`)

- **Generate Match** — chọn 4 người ra sân + chia đôi
- **Re-roll** — giữ nguyên 4 người, chỉ đổi cách chia đôi
- **[Team A thắng] / [Team B thắng]** — submit kết quả, cộng/trừ điểm, lưu lịch sử

### 3. Bảng xếp hạng (`Leaderboard`)

- Sort theo `score` giảm dần
- Cột: #, Tên, Score, Games, Bench
- Người về sớm hiển thị badge "Left"

### 4. Lịch sử trận (`MatchHistory`)

- Liệt kê trận đã đấu (mới nhất trước)
- **Undo last** — revert trận gần nhất (chỉ khi không có `currentMatch` đang chờ)

### 5. Reset (`ResetMenu`)

- **Reset session** — xoá điểm + lịch sử, giữ người chơi
- **Reset everything** — xoá toàn bộ
- Dùng custom `ConfirmDialog` (không phải `window.confirm`)

### 6. Persistence

- Tự động lưu vào `localStorage` qua `zustand/middleware/persist`
- Phiên bản schema hiện tại: **v5** (có migrate cumulative từ v1)

---

## Cấu trúc source

```
src/
├── main.tsx                    # Entry point
├── App.tsx                     # Shell layout: header + sections
├── index.css                   # Tailwind import
├── types.ts                    # Shared types: Player, Match, HistoryMap
│
├── lib/                        # Pure logic (no React)
│   ├── historyKey.ts           # Normalized pair keys + history map helpers
│   ├── matchmaker.ts           # Two-stage match generation
│   └── scoring.ts              # applyResult / revertResult
│
├── store/
│   └── useGameStore.ts         # Zustand store + persist + migrate
│
└── components/
    ├── PlayerManager.tsx       # Add / rename / leave-early / remove
    ├── CurrentMatch.tsx        # Generate / re-roll / submit result
    ├── Leaderboard.tsx         # Score table
    ├── MatchHistory.tsx        # History list + undo
    ├── ResetMenu.tsx           # Reset dropdown
    └── ConfirmDialog.tsx       # Modal confirm component
```

---

## Domain Types ([src/types.ts](src/types.ts))

```ts
type Player = {
  id: string;
  name: string;
  score: number; // +1 thắng, -1 thua
  benchCount: number; // tổng số lần nghỉ
  gamesPlayed: number; // tổng số trận đã chơi
  playStreak: number; // số trận chơi liên tiếp chưa nghỉ
  lastBenched: boolean; // có nghỉ ở round trước không
  active: boolean; // false = về sớm
  skippingRound: boolean; // true = tự nguyện nghỉ lượt tiếp theo
};

type Match = {
  id: string;
  team1: [string, string];
  team2: [string, string];
  bench: string[];
  winner?: 1 | 2;
  createdAt: number;
};

type HistoryMap = Record<string, number>; // key = "idA-idB" (sorted)
```

---

## Match Generation Algorithm ([src/lib/matchmaker.ts](src/lib/matchmaker.ts))

**Two-stage lexicographic selection** — đảm bảo fairness là hard constraint, pairing quality chỉ là soft preference.

### Stage A — chọn 4 người ra sân

Enumerate tất cả `C(N, 4)` tổ hợp court từ N người `active && !skippingRound`. Với mỗi tổ hợp tính tuple:

| #   | Metric                 | Mục đích                                                                    |
| --- | ---------------------- | --------------------------------------------------------------------------- |
| 1   | `consecutiveBench`     | Số người trong bench cũng đã bench round trước → tránh nghỉ 2 lần liên tiếp |
| 2   | `maxPlayStreakOnCourt` | Max playStreak trong 4 người ra sân → tránh chơi 3+ trận liên tiếp          |
| 3   | `benchSpread`          | `max(benchCount) − min(benchCount)` sau round này → giữ lượt nghỉ cân bằng  |

So sánh **lex-min** (so sánh tuple từng phần tử) → giữ pool best → random pick.

### Stage B — chia đôi 4 người đã chốt

Với 4 người fixed, có đúng 3 cách chia đôi:

- AB vs CD (index 0)
- AC vs BD (index 1)
- AD vs BC (index 2)

Penalty cho mỗi cách: `repeatedTeammate × 10 + repeatedOpponent × 3`. Min penalty thắng (random tiebreak).

### Re-roll

Khi user nhấn Re-roll, store truyền `lockedCourtIds` vào `pickBestMatch` → bỏ qua Stage A, chỉ rotate Stage B (`excludeLineupIndexes` chứa index hiện tại).

### Số lượng candidates

Cho N người, complexity = `C(N, 4) × 3`. Với N=12: 495 × 3 = 1485 — instant.

---

## Scoring ([src/lib/scoring.ts](src/lib/scoring.ts))

### `applyResult(state, match, winner)`

- Người trong team thắng: `score+1`, `gamesPlayed+1`, `playStreak+1`, `lastBenched=false`
- Người trong team thua: `score-1`, `gamesPlayed+1`, `playStreak+1`, `lastBenched=false`
- Người bench: `benchCount+1`, `playStreak=0`, `lastBenched=true`
- Tăng `teammateHistory` cho 2 cặp trong cùng team
- Tăng `opponentHistory` cho 4 cặp đối đầu (team1 × team2)

### `revertResult(state, match, winner)`

Đảo ngược toàn bộ. Lưu ý: `playStreak` của người bench không khôi phục được chính xác (đã reset về 0), giữ nguyên giá trị hiện tại.

---

## History Key ([src/lib/historyKey.ts](src/lib/historyKey.ts))

```ts
pairKey(a, b); // "idA-idB" sắp xếp alphabet → đảm bảo idempotent
incrementPair(map, a, b);
decrementPair(map, a, b);
getPairCount(map, a, b);
```

---

## Store ([src/store/useGameStore.ts](src/store/useGameStore.ts))

### State

```ts
{
  players: Player[];
  currentMatch: Match | null;
  currentLineupIndex: number | null;          // 0|1|2 — partition đang hiển thị
  currentCourtIds: [string,string,string,string] | null;  // 4 người trên sân (cho re-roll)
  history: Match[];                            // newest first
  teammateHistory: HistoryMap;
  opponentHistory: HistoryMap;
}
```

### Actions

| Action                        | Mô tả                                                                 |
| ----------------------------- | --------------------------------------------------------------------- |
| `addPlayer(name)`             | Thêm người mới (`score=0, benchCount=0, gamesPlayed=0, playStreak=0`) |
| `removePlayer(id)`            | Xoá vĩnh viễn                                                         |
| `setPlayerActive(id, active)` | Về sớm / quay lại                                                     |
| `toggleSkipRound(id)`         | Toggle nghỉ lượt tự nguyện — reset sau `submitResult`                 |
| `renamePlayer(id, name)`      | Đổi tên                                                               |
| `generateNextMatch()`         | Stage A + Stage B đầy đủ                                              |
| `rerollMatch()`               | Giữ `currentCourtIds`, rotate Stage B                                 |
| `submitResult(1 \| 2)`        | Apply điểm, push history, clear current                               |
| `undoLastMatch()`             | Revert trận gần nhất, đưa lại làm currentMatch                        |
| `resetSession()`              | Zero điểm/history, giữ players                                        |
| `resetAll()`                  | Wipe toàn bộ                                                          |

### Persist migration

```
v1 → v2: backfill active=true
v2 → v3: backfill gamesPlayed từ history.team1/team2 counts
v3 → v4: backfill playStreak=0 + currentCourtIds=null
v4 → v5: backfill skippingRound=false
```

---

## UX Flow

1. Người dùng add 4+ người ở `PlayerManager`
2. Nhấn **Generate Match** → hiển thị Team A vs Team B + Bench
3. Đánh xong, nhấn **[Team A thắng]** hoặc **[Team B thắng]**
4. Điểm cập nhật, match vào history, sẵn sàng generate round tiếp theo
5. (Optional) Re-roll giữ 4 người, đổi cách chia / Undo last để revert

---

## Edge Cases được handle

- **< 4 active players** → nút Generate disabled + warning message
- **Người về sớm khi đang ở currentMatch** → match auto-invalidated, không crash
- **Xoá người khi đang ở currentMatch** → tương tự
- **Add người mới giữa session** → benchCount=0 → tự động ưu tiên vào sân qua benchSpread metric
- **Undo khi có currentMatch chờ** → bị block (phải resolve/cancel match hiện tại trước)
- **Người đang skip + tổng eligible < 4** → nút Generate disabled (matchmaker trả null)
- **skippingRound không reset khi undo** → hành vi chấp nhận được, flag reset sau submit

---

## Build & Run

```bash
npm install
npm run dev      # dev server http://localhost:5173
npm run build    # production build → dist/
npm run lint
```
