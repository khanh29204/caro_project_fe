import React from "react";

type Cell = 0 | 1 | -1;
type BoardType = Cell[][];
type SymbolXO = "X" | "O";

export default function Board({
  board,
  lastMove,
  mySymbol,
  canPlay,
  onMove,
}: {
  board: BoardType;
  lastMove: { x: number; y: number } | null;
  mySymbol: SymbolXO | null;
  canPlay: boolean;
  onMove: (x: number, y: number) => void;
}) {
  const rows = board.length || 15;
  const cols = board[0]?.length || 15;

  return (
    <div className="my-3">
      {/* Legend */}
      <div className="flex items-center justify-center gap-2">
        <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-300">
          Bạn: <b className="text-slate-100">{mySymbol ?? "Khán giả"}</b>
        </span>
        {canPlay ? (
          <span className="rounded-full border border-green-800 bg-green-900/30 px-3 py-1 text-xs text-green-400">
            Tới lượt bạn
          </span>
        ) : (
          <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-300">
            Chờ đối thủ
          </span>
        )}
      </div>
      {/* Bàn cờ */}
      <div className="flex justify-center mt-2">
        <div
          className="grid aspect-square rounded-2xl border border-slate-800 bg-slate-800/60 p-1
                     shadow-lg"
          style={{
            // rộng vừa màn hình theo chiều nhỏ hơn
            width: "min(92vw, 92vh)",
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gridTemplateRows: `repeat(${rows}, 1fr)`,
            gap: "2px",
          }}
        >
          {board.map((row, y) =>
            row.map((cell, x) => {
              const isLast = lastMove && lastMove.x === x && lastMove.y === y;

              return (
                <button
                  key={`${x}-${y}`}
                  aria-label={`cell-${x}-${y}`}
                  onClick={() => canPlay && cell === 0 && onMove(x, y)}
                  className={[
                    "grid place-items-center rounded-md border",
                    "bg-slate-900/95 border-slate-700",
                    "text-[clamp(14px,5.2vw,28px)] font-extrabold leading-none select-none",
                    "hover:border-slate-500 focus:outline-none",
                    cell === 0 ? "cursor-pointer" : "cursor-default",
                    isLast ? "ring-2 ring-blue-500" : "",
                  ].join(" ")}
                >
                  {cell === 1 ? (
                    <span className="text-rose-400 drop-shadow">X</span>
                  ) : cell === -1 ? (
                    <span className="text-cyan-300 drop-shadow">O</span>
                  ) : null}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
