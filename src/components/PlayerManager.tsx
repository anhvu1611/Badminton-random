import { useState, useRef } from "react";
import { useGameStore } from "../store/useGameStore";

export function PlayerManager() {
  const players = useGameStore((s) => s.players);
  const addPlayer = useGameStore((s) => s.addPlayer);
  const removePlayer = useGameStore((s) => s.removePlayer);
  const setPlayerActive = useGameStore((s) => s.setPlayerActive);
  const renamePlayer = useGameStore((s) => s.renamePlayer);
  const currentMatch = useGameStore((s) => s.currentMatch);

  const [input, setInput] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function handleAdd() {
    const trimmed = input.trim();
    if (!trimmed) return;
    addPlayer(trimmed);
    setInput("");
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") handleAdd();
  }

  function startEdit(id: string, name: string) {
    setEditingId(id);
    setEditValue(name);
  }

  function commitEdit(id: string) {
    renamePlayer(id, editValue);
    setEditingId(null);
  }

  function handleEditKeyDown(
    e: React.KeyboardEvent<HTMLInputElement>,
    id: string,
  ) {
    if (e.key === "Enter") commitEdit(id);
    if (e.key === "Escape") setEditingId(null);
  }

  const inMatchIds = currentMatch
    ? new Set([
        ...currentMatch.team1,
        ...currentMatch.team2,
        ...currentMatch.bench,
      ])
    : new Set<string>();

  const activePlayers = players.filter((p) => p.active);
  const inactivePlayers = players.filter((p) => !p.active);

  const renderPlayer = (p: (typeof players)[number]) => {
    const inCurrent = inMatchIds.has(p.id);
    return (
      <li
        key={p.id}
        className={`flex items-center gap-2 rounded-lg px-3 py-2 ${
          p.active ? "bg-gray-50" : "bg-gray-50/60 opacity-60"
        }`}
      >
        {editingId === p.id ? (
          <input
            autoFocus
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={(e) => handleEditKeyDown(e, p.id)}
            onBlur={() => commitEdit(p.id)}
            className="flex-1 border border-blue-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        ) : (
          <span
            className={`flex-1 text-sm font-medium truncate ${
              p.active ? "text-gray-800" : "text-gray-400 line-through"
            }`}
          >
            {p.name}
          </span>
        )}

        <span className="text-xs text-gray-400 shrink-0">
          {p.score > 0 ? `+${p.score}` : p.score}
        </span>

        {p.active ? (
          <>
            <button
              onClick={() => startEdit(p.id, p.name)}
              className="text-gray-400 hover:text-blue-500 p-1 rounded transition-colors"
              title="Rename"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15.232 5.232l3.536 3.536M9 13l6.293-6.293a1 1 0 011.414 0l1.586 1.586a1 1 0 010 1.414L12 16H9v-3z"
                />
              </svg>
            </button>
            {/* Leave early — keeps score, excludes from future matches */}
            <button
              onClick={() => {
                const msg = inCurrent
                  ? `${p.name} về sớm? Trận hiện tại sẽ bị huỷ.`
                  : `${p.name} về sớm? Điểm và lịch sử sẽ được giữ lại.`;
                if (!confirm(msg)) return;
                setPlayerActive(p.id, false);
              }}
              className="text-gray-400 hover:text-orange-500 p-1 rounded transition-colors"
              title="Về sớm (giữ điểm)"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
            </button>
            {/* Permanent remove */}
            <button
              onClick={() => {
                if (!confirm(`Xoá hẳn ${p.name}? Điểm và lịch sử sẽ bị mất.`))
                  return;
                removePlayer(p.id);
              }}
              className="text-gray-400 hover:text-red-500 p-1 rounded transition-colors"
              title="Xoá hẳn"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </>
        ) : (
          /* Rejoin button */
          <button
            onClick={() => setPlayerActive(p.id, true)}
            className="text-xs text-blue-500 hover:text-blue-700 font-medium px-2 py-0.5 rounded border border-blue-200 hover:border-blue-400 transition-colors"
          >
            Rejoin
          </button>
        )}
      </li>
    );
  };

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
      <h2 className="text-lg font-bold text-gray-800 mb-4">Người chơi</h2>

      {/* Add player input */}
      <div className="flex gap-2 mb-4">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Tên người chơi..."
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <button
          onClick={handleAdd}
          disabled={!input.trim()}
          className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-200 disabled:text-gray-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          Thêm
        </button>
      </div>

      {/* Active count warning */}
      {activePlayers.length < 4 && activePlayers.length > 0 && (
        <p className="text-amber-600 text-sm mb-3">
          Cần ít nhất 4 người chơi ({4 - activePlayers.length} more)
        </p>
      )}

      {players.length === 0 && (
        <p className="text-gray-400 text-sm text-center py-4">
          No players yet. Add some above!
        </p>
      )}

      {/* Active players */}
      {activePlayers.length > 0 && (
        <ul className="space-y-2">{activePlayers.map(renderPlayer)}</ul>
      )}

      {/* Left early */}
      {inactivePlayers.length > 0 && (
        <>
          <p className="text-xs text-gray-400 uppercase tracking-wide mt-4 mb-2">
            Về sớm
          </p>
          <ul className="space-y-2">{inactivePlayers.map(renderPlayer)}</ul>
        </>
      )}
    </section>
  );
}
