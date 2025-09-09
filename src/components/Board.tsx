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

  const [selected, setSelected] = useState<{ x: number; y: number } | null>(null);

  // --- responsive sizing ---
  const outerRef = useRef<HTMLDivElement>(null);   // khung ngoài để lấy size vuông
  const gridRef = useRef<HTMLDivElement>(null);    // grid thật
  const [cellPx, setCellPx] = useState<number>(24);

  // Tính cell size = (cạnh board - padding - gaps)/max(rows, cols)
  useEffect(() => {
    if (!outerRef.current || !gridRef.current) return;

    const calc = () => {
      const outer = outerRef.current!;
      const grid = gridRef.current!;
      // board là một hình vuông: lấy cạnh theo width
      const boardSide = Math.min(outer.clientWidth, outer.clientHeight);
      // padding trong grid (p-1 = 0.25rem = 4px), border (1px * 2), gap (2px)
      const padding = 4 * 2; // left+right
      const border = 1 * 2;
      const gap = 2;
      const n = Math.max(rows, cols);
      const totalGap = gap * (n - 1);
      const usable = Math.max(0, boardSide - padding - border - totalGap);
      const cell = Math.floor(usable / n);
      setCellPx(Math.max(12, cell)); // đừng nhỏ hơn 12px
      // set CSS vars lên grid
      grid.style.setProperty("--cols", String(cols));
      grid.style.setProperty("--rows", String(rows));
      grid.style.setProperty("--cell", `${Math.max(12, cell)}px`);
      grid.style.setProperty("--gap", `${gap}px`);
    };

    const ro = new ResizeObserver(calc);
    ro.observe(outerRef.current);
    // calc ngay lần đầu
    calc();
    return () => ro.disconnect();
  }, [rows, cols]);

  // --- logic cũ ---
  const isEmpty = (x: number, y: number) => board?.[y]?.[x] === 0;

  useEffect(() => {
    if (!canPlay) return setSelected(null);
    if (!selected) return;
    if (!isEmpty(selected.x, selected.y)) setSelected(null);
  }, [board, canPlay, selected]);

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
    if (!canPlay || cell !== 0) return;
    if (!selected || selected.x !== x || selected.y !== y) {
      setSelected({ x, y });
      return;
    }
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

      {/* Board wrapper (vuông) */}
      <div className="mt-2 flex justify-center">
        <div
          ref={outerRef}
          className="relative"
          style={{
            width: "min(92vw, 92vh)",
            height: "min(92vw, 92vh)",
          }}
        >
          {/* Grid */}
          <div
            ref={gridRef}
            role="grid"
            aria-label="Caro board"
            className="grid rounded-2xl border border-slate-800 bg-slate-800/60 p-1 shadow-lg"
            style={{
              // dùng CSS vars tính cell vuông
              display: "grid",
              gridTemplateColumns: "repeat(var(--cols), var(--cell))",
              gridTemplateRows: "repeat(var(--rows), var(--cell))",
              gap: "var(--gap)",
              // phóng to/thu nhỏ grid để luôn fill hết cạnh vuông
              // (tuỳ chọn) center: margin auto
              margin: "0 auto",
              // fallback nếu var thiếu
              // @ts-ignore
              ["--cols" as any]: cols,
              ["--rows" as any]: rows,
              ["--cell" as any]: `${cellPx}px`,
              ["--gap" as any]: "2px",
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
                      "font-extrabold leading-none select-none",
                      clickable
                        ? "cursor-pointer hover:border-slate-500"
                        : "cursor-default",
                      isLast
                        ? "ring-2 ring-blue-500 ring-offset-2 ring-offset-slate-800 z-9"
                        : "",
                      isSelected
                        ? "ring-2 ring-amber-400 ring-offset-2 ring-offset-slate-800 z-10"
                        : "",
                    ].join(" ")}
                    style={{
                      // Font co theo kích thước ô (giới hạn min/max cho đẹp)
                      fontSize: `clamp(12px, calc(var(--cell) * 0.6), 36px)`,
                      lineHeight: 1,
                    }}
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
                        style={{ fontSize: `clamp(12px, calc(var(--cell) * 0.6), 36px)` }}
                      >
                        {mySymbol}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Hint nhỏ */}
      {selected && canPlay && (
        <div className="mt-2 text-center text-xs text-slate-400">
          Đã chọn ô ({selected.x + 1}, {selected.y + 1}). Nhấn lần nữa để đánh
        </div>
      )}
    </div>
  );
}
