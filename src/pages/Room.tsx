import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { getSocket } from "../socket";
import { getHistory } from "../api";
import Board from "../components/Board";
import ProfileModal from "../components/ProfileModal";

type User = { id: string; name: string };
type SymbolXO = "X" | "O";
type Cell = 0 | 1 | -1;
type BoardType = Cell[][];
type Player = User & { symbol: SymbolXO };
type RoomState = {
  id: string;
  board: BoardType;
  players: Player[];
  nextTurn: SymbolXO;
  winner: null | SymbolXO | "draw";
  lastMove?: { x: number; y: number };
  hostId?: string;
};

export default function Room({ user }: { user: User | null }) {
  const { roomId = "" } = useParams();
  const [state, setState] = useState<RoomState | null>(null);
  const [history, setHistory] = useState<{
    wins: number;
    losses: number;
    draws: number;
    total: number;
  } | null>(null);

  // Popup
  const [showResult, setShowResult] = useState(false);
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const prevWinnerRef = useRef<RoomState["winner"]>(null);

  // Join phòng + subscribe state
  useEffect(() => {
    // Lấy user từ props hoặc LS
    const u = user || JSON.parse(localStorage.getItem("caro_user") || "null");
    if (!u) return;

    const socket = getSocket();
    const rid = (roomId || "").toUpperCase();

    // Handlers đặt tên để tháo chuẩn
    const onRoomState = (s: RoomState) => setState(s);
    const onRoomDeleted = (deletedId: string) => {
      if ((deletedId || "").toUpperCase() === rid) {
        alert(`Phòng ${deletedId} đã bị xoá!`);
        // dùng react-router thì tốt hơn:
        // nav("/");
        window.location.href = "/";
      }
    };

    // Khi socket (re)connect, join lại đúng room (fix đổi Wi-Fi/4G/VPN/reload tab)
    const join = () => socket.emit("join-room", { roomId: rid, user: u });

    // Đảm bảo không bị add trùng listener khi roomId/user đổi:
    socket.off("room-state", onRoomState);
    socket.off("room-deleted", onRoomDeleted);
    socket.off("connect", join);

    socket.on("room-state", onRoomState);
    socket.on("room-deleted", onRoomDeleted);
    socket.on("connect", join);

    // Join ngay lần đầu
    join();

    // Lưu room hiện tại để debug/khôi phục nếu cần
    sessionStorage.setItem("roomId", rid);

    return () => {
      // Tháo đúng handlers đã gắn
      socket.off("room-state", onRoomState);
      socket.off("room-deleted", onRoomDeleted);
      socket.off("connect", join);
      socket.disconnect();
      sessionStorage.removeItem("roomId");
    };
  }, [roomId, user]);

  // Me / Opponent / My symbol
  const me = useMemo(
    () => user ?? JSON.parse(localStorage.getItem("caro_user") || "null"),
    [user]
  );
  const mySymbol: SymbolXO | null = useMemo(() => {
    if (!state || !me) return null;
    return state.players.find((p) => p.id === me.id)?.symbol ?? null;
  }, [state, me]);
  const opponent = useMemo(() => {
    if (!state || !me) return null;
    return state.players.find((p) => p.id !== me.id) || null;
  }, [state, me]);

  // Lịch sử đối đầu
  useEffect(() => {
    async function fetchHistory() {
      if (me && opponent) {
        try {
          const h = await getHistory(me.id, opponent.id);
          setHistory({
            wins: h.wins,
            losses: h.losses,
            draws: h.draws,
            total: h.total,
          });
        } catch {}
      }
    }
    fetchHistory();
  }, [me, opponent, state?.winner]);

  // Bật/tắt popup khi winner đổi
  useEffect(() => {
    const cur = state?.winner ?? null;
    const prev = prevWinnerRef.current;
    if (cur && cur !== prev) setShowResult(true);
    if (!cur && prev) setShowResult(false);
    prevWinnerRef.current = cur;
  }, [state?.winner]);

  // ESC đóng popup
  useEffect(() => {
    const onKey = (e: KeyboardEvent) =>
      e.key === "Escape" && setShowResult(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Actions
  const copyInvite = async () => {
    await navigator.clipboard.writeText(window.location.href);
    alert("Đã copy link phòng 🎯");
  };
  const onMove = (x: number, y: number) => {
    if (!mySymbol || !state) return;
    if (state.winner) return;
    if (state.nextTurn !== mySymbol) return;
    getSocket().emit("make-move", { x, y });
  };
  const onRestart = () => {
    getSocket().emit("restart");
    setShowResult(false);
  };
  const isHost = useMemo(() => {
    if (!state?.hostId || !me) return false;
    return state.hostId === me.id;
  }, [state?.hostId, me]);

  // Text kết quả
  const resultText = useMemo(() => {
    if (!state?.winner) return "";
    if (state.winner === "draw") return "Hòa nhau 🫶";
    const iWon = mySymbol && state.winner === mySymbol;
    const winnerName =
      state.players.find((p) => p.symbol === state.winner)?.name ??
      "Người chơi";
    return iWon ? "Bạn thắng 🎉" : `Bạn thua 😭 — ${winnerName} thắng`;
  }, [state?.winner, state?.players, mySymbol]);
  const EMPTY = Array.from({ length: 15 }, () => Array<Cell>(15).fill(0));

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-5">
      {/* Header */}
      <div className="mb-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-700 px-3 py-1 text-sm text-slate-200">
            Phòng: <b className="font-semibold">{roomId.toUpperCase()}</b>
          </div>
          <button
            className="rounded-xl border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:border-slate-500"
            onClick={copyInvite}
          >
            Copy link mời
          </button>
        </div>

        {/* Players */}
        <div className="mb-2 flex flex-wrap items-center gap-3">
          <div
            className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${
              mySymbol === "X" ? "border-blue-500" : "border-slate-700"
            }`}
          >
            <span className="grid h-6 w-6 place-items-center rounded-full border border-rose-500 bg-rose-900/30 font-extrabold text-rose-400">
              X
            </span>
            <span 
              className="cursor-pointer hover:text-blue-400 hover:underline transition"
              onClick={() => {
                const p = state?.players.find((p) => p.symbol === "X");
                if (p) setProfileUser(p);
              }}
            >
              {state?.players.find((p) => p.symbol === "X")?.name ||
                "Đang chờ..."}
            </span>
          </div>
          <div
            className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${
              mySymbol === "O" ? "border-blue-500" : "border-slate-700"
            }`}
          >
            <span className="grid h-6 w-6 place-items-center rounded-full border border-cyan-500 bg-cyan-900/30 font-extrabold text-cyan-300">
              O
            </span>
            <span 
              className="cursor-pointer hover:text-blue-400 hover:underline transition"
              onClick={() => {
                const p = state?.players.find((p) => p.symbol === "O");
                if (p) setProfileUser(p);
              }}
            >
              {state?.players.find((p) => p.symbol === "O")?.name ||
                "Đang chờ..."}
            </span>
          </div>
        </div>

        {/* Status + Restart */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          {state?.winner ? (
            <div className="text-sm font-semibold">
              {state.winner === "draw"
                ? "Hòa nhau 🫶"
                : `Thắng: ${
                    state.players.find((p) => p.symbol === state.winner)?.name
                  }`}
            </div>
          ) : (
            <div className="text-sm">
              Lượt: <b>{state?.nextTurn}</b>
            </div>
          )}
          <button
            className={`rounded-xl ${
              isHost
                ? "rounded-xl bg-blue-500 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-600"
                : "rounded-xl px-3 py-2 text-sm font-semibold text-white bg-slate-700/60 text-slate-300 cursor-not-allowed"
            }`}
            onClick={() => isHost && onRestart()}
            disabled={!isHost}
          >
            Chơi lại
          </button>
        </div>
      </div>

      {/* Board */}
      <Board
        board={state?.board || EMPTY}
        lastMove={state?.lastMove || null}
        mySymbol={mySymbol}
        canPlay={!!mySymbol && !state?.winner && state?.nextTurn === mySymbol}
        onMove={onMove}
      />

      {/* Stats */}
      <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
        <h3 className="mb-1 text-base font-semibold">Lịch sử đối đầu</h3>
        {opponent ? (
          <p className="text-sm text-slate-300">
            {opponent.name}:{" "}
            Thắng <b className="text-slate-100">{history?.wins ?? 0}</b>
            • Thua: <b className="text-slate-100">{history?.losses ?? 0}</b> •
            Hòa: <b className="text-slate-100">{history?.draws ?? 0}</b> • Tổng:{" "}
            <b className="text-slate-100">{history?.total ?? 0}</b>
          </p>
        ) : (
          <p className="text-sm text-slate-400">Chưa có đối thủ vào phòng.</p>
        )}
      </div>

      {/* Popup kết quả (Tailwind) */}
      {state?.winner && showResult && (
        <div
          className="fixed inset-0 z-[9999] grid place-items-center bg-black/60 backdrop-blur-sm"
          onClick={() => setShowResult(false)}
          role="presentation"
        >
          <div
            className="w-[min(92vw,480px)] translate-y-2 scale-[0.98] rounded-2xl border border-slate-800 bg-slate-900 p-5 opacity-0 shadow-2xl
                       animate-[modalIn_160ms_ease-out_forwards]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="result-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id="result-title"
              className="mb-2 text-xl font-extrabold leading-snug md:text-2xl"
            >
              {resultText}
            </h2>

            {opponent && (
              <p className="mb-3 text-sm text-slate-400">
                Đối thủ:{" "}
                <span className="font-semibold text-slate-200">
                  {opponent.name}
                </span>{" "}
                • Tổng trận:{" "}
                <span className="font-semibold text-slate-200">
                  {history?.total ?? 0}
                </span>
              </p>
            )}

            <div className="mt-2 flex items-center justify-end gap-3">
              <button
                className="inline-flex items-center rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 hover:border-slate-500"
                onClick={() => setShowResult(false)}
              >
                Đóng
              </button>
              <button
                className="inline-flex items-center rounded-xl bg-blue-500 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600"
                onClick={onRestart}
              >
                Chơi lại
              </button>
            </div>
          </div>

          <style>
            {`@keyframes modalIn { to { transform: translateY(0) scale(1); opacity: 1; } }`}
          </style>
        </div>
      )}

      {/* Profile Modal */}
      {profileUser && (
        <ProfileModal
          userId={profileUser.id}
          userName={profileUser.name}
          onClose={() => setProfileUser(null)}
        />
      )}
    </div>
  );
}
