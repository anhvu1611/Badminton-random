import { useState } from "react";
import { useGameStore } from "../store/useGameStore";
import { ConfirmDialog } from "./ConfirmDialog";

type PendingAction = "session" | "all" | null;

export function ResetMenu() {
  const resetSession = useGameStore((s) => s.resetSession);
  const resetAll = useGameStore((s) => s.resetAll);
  const history = useGameStore((s) => s.history);
  const players = useGameStore((s) => s.players);

  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<PendingAction>(null);

  const hasAnything = history.length > 0 || players.length > 0;
  if (!hasAnything) return null;

  function handleConfirm() {
    if (pending === "session") resetSession();
    if (pending === "all") resetAll();
    setPending(null);
    setOpen(false);
  }

  return (
    <>
      <div className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          className="text-sm text-gray-400 hover:text-red-400 transition-colors px-3 py-1.5 rounded-lg"
        >
          Reset
        </button>

        {open && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-10"
              onClick={() => setOpen(false)}
            />
            {/* Dropdown */}
            <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden min-w-56">
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Reset options
                </p>
              </div>
              <button
                onClick={() => {
                  setOpen(false);
                  setPending("session");
                }}
                className="w-full text-left px-4 py-3 text-sm hover:bg-amber-50 text-gray-700 hover:text-amber-700 transition-colors"
              >
                <span className="font-medium">Reset session</span>
                <p className="text-xs text-gray-400 mt-0.5">
                  Clear điểm và lịch sử, giữ lại người chơi
                </p>
              </button>
              <button
                onClick={() => {
                  setOpen(false);
                  setPending("all");
                }}
                className="w-full text-left px-4 py-3 text-sm hover:bg-red-50 text-gray-700 hover:text-red-600 transition-colors"
              >
                <span className="font-medium">Reset everything</span>
                <p className="text-xs text-gray-400 mt-0.5">
                  Xoá hết tất cả, bao gồm cả người chơi, điểm và lịch sử
                </p>
              </button>
            </div>
          </>
        )}
      </div>

      {pending === "session" && (
        <ConfirmDialog
          title="Reset session?"
          description="Điểm và lịch sử trận đấu sẽ bị xoá. Danh sách người chơi được giữ lại."
          confirmLabel="Reset session"
          confirmClassName="bg-amber-500 hover:bg-amber-600"
          onConfirm={handleConfirm}
          onCancel={() => setPending(null)}
        />
      )}
      {pending === "all" && (
        <ConfirmDialog
          title="Reset everything?"
          description="Toàn bộ người chơi, điểm và lịch sử sẽ bị xoá vĩnh viễn."
          confirmLabel="Xoá tất cả"
          confirmClassName="bg-red-500 hover:bg-red-600"
          onConfirm={handleConfirm}
          onCancel={() => setPending(null)}
        />
      )}
    </>
  );
}
