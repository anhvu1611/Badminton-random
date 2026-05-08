# Badminton Random Matchmaking App — Context

## Goal

Web app để chia đội đánh cầu lông đôi tự động.

### Yêu cầu

- Random đội
- Ít trùng teammate/opponent nhất có thể
- Xoay vòng người nghỉ công bằng
- Nhập kết quả thắng/thua
- Thắng +1
- Thua -1

> KHÔNG cần tính trình độ/ranking/MMR vì mọi người ngang trình.

---

# Core Rules

## Match Format

Mỗi sân:

- 4 người chơi
- Chia thành:
  - Team A: 2 người
  - Team B: 2 người

---

# Player Count Handling

## Nếu số người không chia hết cho 4

Người dư sẽ nghỉ.

| Players | Playing | Bench |
| ------- | ------- | ----- |
| 5       | 4       | 1     |
| 6       | 4       | 2     |
| 7       | 4       | 3     |
| 8       | 8       | 0     |
| 9       | 8       | 1     |

---

# Fairness Requirements

## 1. Bench Fairness

Người nghỉ nhiều phải được ưu tiên vào trận tiếp theo.

Không được để:

- Nghỉ liên tục nhiều trận
- Một người nghỉ quá nhiều so với người khác

Mỗi player có:

```ts
benchCount: number;
```

---

## 2. Minimize Repeated Teammates

Tránh:

- A team với B quá nhiều lần

Store history:

```ts
teammateHistory[playerA][playerB] = count;
```

---

## 3. Minimize Repeated Opponents

Tránh:

- A gặp C quá nhiều lần

Store history:

```ts
opponentHistory[playerA][playerB] = count;
```

---

# Scoring

Sau mỗi trận:

## Team thắng

- Mỗi người +1

## Team thua

- Mỗi người -1

Ví dụ:

```txt
(A+B) thắng (C+D)

A +1
B +1
C -1
D -1
```

---

# Match Generation Strategy

KHÔNG random hoàn toàn.

Sử dụng:

- Constrained randomization

---

# Recommended Algorithm

## Step 1 — Select Players to Play

Ưu tiên:

- Người nghỉ nhiều nhất
- Người không vừa nghỉ trận trước

---

## Step 2 — Generate Candidate Matches

Generate khoảng:

- 50–200 lineups ngẫu nhiên

---

## Step 3 — Score Each Lineup With Penalty

### Penalty Formula

```ts
penalty = repeatedTeammate * 10 + repeatedOpponent * 3 + consecutiveBench * 15;
```

---

## Choose Lineup With Lowest Penalty

Mục tiêu:

- Teammate mới
- Opponent mới
- Bench công bằng

---

# Data Structures

## Player

```ts
type Player = {
  id: string;
  name: string;

  score: number;

  benchCount: number;

  lastBenched: boolean;
};
```

---

## Match

```ts
type Match = {
  id: string;

  team1: string[];
  team2: string[];

  bench: string[];

  winner?: 1 | 2;
};
```

---

## Histories

```ts
type HistoryMap = Record<string, number>;
```

### Key Format

```txt
"A-B"
```

Always normalize:

- Alphabetical order

Ví dụ:

```txt
A-B
```

Never:

```txt
B-A
```

---

# UX Flow

## 1. Add Players

Input:

- Names

---

## 2. Generate Match

Hiển thị:

```txt
Team A
A + D

vs

Team B
B + E

Bench
C
F
```

---

## 3. Submit Result

Buttons:

```txt
[Team A thắng]
[Team B thắng]
```

---

## 4. Update Scores + Histories

Sau đó:

- Generate next round

---

# Important Constraints

## DO

- Rotate bench fairly
- Avoid repeated teammates
- Avoid repeated opponents
- Keep logic deterministic enough to feel fair

---

## DO NOT

- Pure random shuffle every round
- MMR/ranking logic
- Complex ELO system

---

# Recommended Stack

Frontend-only app là đủ.

## Suggested Stack

- React + Vite
- TypeScript
- Zustand
- TailwindCSS

Không cần backend ban đầu.

Persist bằng:

```txt
localStorage
```

---

# Nice-to-have Features

## Match History

Hiển thị các round trước đó.

---

## Leaderboard

Sort theo score giảm dần.

---

## Reset Session

Reset:

- Scores
- Histories
- Rounds

---

# Edge Cases

## < 4 Players

Không thể tạo trận doubles.

Show error:

```txt
Need at least 4 players
```

---

## Odd Player Counts

Bench rotation phải công bằng theo thời gian.

---

# Architecture Philosophy

## Prioritize

1. Fairness
2. Low repetition
3. Simple understandable logic
4. Fun/casual UX

---

## Not Focused On

- Competitive ranking
- Advanced matchmaking
- Skill balancing
