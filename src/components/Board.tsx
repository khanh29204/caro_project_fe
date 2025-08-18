import React, { useEffect, useMemo, useRef, useState } from "react";

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

  const [selected, setSelected] = useState<{ x: number; y: number } | null>(
    null
  );
  const wrapperRef = useRef<HTMLDivElement>(null);

  const isEmpty = (x: number, y: number) => board?.[y]?.[x] === 0;

  // Huỷ chọn khi:
  // - Không đến lượt
  // - Có winner
  // - Ô được chọn không còn trống (đối thủ vừa đi vào)
  useEffect(() => {
    if (!canPlay) return setSelected(null);
    if (!selected) return;
    if (!isEmpty(selected.x, selected.y)) setSelected(null);
  }, [board, canPlay, selected]);

  // Hỗ trợ Enter để đánh, Escape để huỷ
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!selected) return;
      if (e.key === "Enter") {
        if (canPlay && isEmpty(selected.x, selected.y)) {
          onMove(selected.x, selected.y);
          setSelected(null);
        }
      } else if (e.key === "Escape") {
        setSelected(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, canPlay, onMove]);

  const handleCellClick = (x: number, y: number, cell: Cell) => {
    if (!canPlay) return;
    if (cell !== 0) return; // không cho chọn ô đã đi
    if (!selected || selected.x !== x || selected.y !== y) {
      setSelected({ x, y }); // lần 1: chọn
      return;
    }
    // lần 2: xác nhận
    onMove(x, y);
    setSelected(null);
  };

  const ghostClass = useMemo(
    () => (mySymbol === "X" ? "text-rose-300/50" : "text-cyan-300/50"),
    [mySymbol]
  );

  return (
    <div className="my-3">
      {/* Legend */}
      <div className="flex items-center justify-center gap-2">
        <span className="rounded-full border border-slate-700 bg-slate-900/70 px-3 py-1 text-xs text-slate-300">
          Bạn: <b className="text-slate-100">{mySymbol ?? "Khán giả"}</b>
        </span>
        {canPlay ? (
          <span className="rounded-full border border-emerald-700 bg-emerald-900/30 px-3 py-1 text-xs text-emerald-400">
            Tới lượt bạn — chạm 2 lần để đánh
          </span>
        ) : (
          <span className="rounded-full border border-slate-700 bg-slate-900/70 px-3 py-1 text-xs text-slate-300">
            Chờ đối thủ
          </span>
        )}
      </div>

      {/* Board */}
      <div className="mt-2 flex justify-center">
        <div
          ref={wrapperRef}
          role="grid"
          aria-label="Caro board"
          className="grid aspect-square rounded-2xl border border-slate-800 bg-slate-800/60 p-1 shadow-lg"
          style={{
            width: "min(92vw, 92vh)", // mobile first
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gridTemplateRows: `repeat(${rows}, 1fr)`,
            gap: "2px",
          }}
        >
          {board.map((row, y) =>
            row.map((cell, x) => {
              const isLast = !!lastMove && lastMove.x === x && lastMove.y === y;
              const isSelected =
                !!selected && selected.x === x && selected.y === y;
              const clickable = canPlay && cell === 0;

              return (
                <button
                  key={`${x}-${y}`}
                  role="gridcell"
                  aria-label={`cell-${x}-${y}`}
                  aria-selected={isSelected}
                  onClick={() => handleCellClick(x, y, cell)}
                  className={[
                    "relative grid place-items-center rounded-md border transition-colors duration-100",
                    "bg-slate-900/95 border-slate-700",
                    "text-[clamp(14px,5.2vw,28px)] font-extrabold leading-none select-none",
                    clickable
                      ? "cursor-pointer hover:border-slate-500"
                      : "cursor-default",
                    isLast
                      ? "ring-2 ring-blue-500 ring-offset-2 ring-offset-slate-800 z-9"
                      : "",
                    isSelected
                      ? "ring-2 ring-amber-400 ring-offset-2 ring-offset-slate-800 z-10"
                      : "",
                    // nhẹ nhàng khi disabled
                    !clickable ? "opacity-100" : "",
                  ].join(" ")}
                >
                  {/* Mark chính thức */}
                  {cell === 1 ? (
                    <span className="text-rose-400 drop-shadow">X</span>
                  ) : cell === -1 ? (
                    <span className="text-cyan-300 drop-shadow">O</span>
                  ) : null}

                  {/* Ghost mark khi chọn (ô trống) */}
                  {cell === 0 && isSelected && mySymbol && (
                    <span
                      className={[
                        "absolute inset-0 grid place-items-center pointer-events-none",
                        "animate-[fadeIn_80ms_ease-out]",
                        ghostClass,
                      ].join(" ")}
                    >
                      {mySymbol}
                    </span>
                  )}

                  {/* Hover outline cho ô trống (desktop) */}
                  {cell === 0 && clickable && !isSelected && (
                    <span className="pointer-events-none absolute inset-0 rounded-md ring-0 hover:ring-1 hover:ring-slate-500/50" />
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Hint nhỏ */}
      {selected && canPlay && (
        <div className="mt-2 text-center text-xs text-slate-400">
          Đã chọn ô ({selected.x + 1}, {selected.y + 1}). Ấn{" "}
          <kbd className="rounded bg-slate-800 px-1 py-0.5">Nhấn lần nữa</kbd> để đánh
        </div>
      )}
    </div>
  );
}
