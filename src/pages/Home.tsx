import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { createRoom, createUser } from "../api";

type User = { id: string; name: string };

export default function Home({
  user,
  setUserPersist,
}: {
  user: User | null;
  setUserPersist: (u: User) => void;
}) {
  const nav = useNavigate();
  const location = useLocation();
  const [name, setName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [loading, setLoading] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const codeRef = useRef<HTMLInputElement>(null);

  // Lấy "đích cũ" nếu bị chặn từ /room/:id
  const redirectFrom = useMemo(() => {
    const s = (location.state as any)?.from as string | undefined;
    // cũng cho phép ?room=ZBAV6O để deeplink
    const qs = new URLSearchParams(location.search);
    const roomFromQuery = qs.get("room");
    if (roomFromQuery) return `/room/${roomFromQuery.toUpperCase()}`;
    return s;
  }, [location.state, location.search]);

  // Prefill + focus
  useEffect(() => {
    if (!user) nameRef.current?.focus();
    else {
      // Nếu đã có user và có đích cũ là phòng → nhảy thẳng vào phòng
      if (redirectFrom?.startsWith("/room/")) {
        nav(redirectFrom, { replace: true });
      } else {
        codeRef.current?.focus();
      }
    }
  }, [user, redirectFrom, nav]);

  // Nếu vào Home qua ?room=... thì prefill
  useEffect(() => {
    const qs = new URLSearchParams(location.search);
    const r = qs.get("room");
    if (r) setRoomCode(r.toUpperCase());
  }, [location.search]);

  const ensureUser = async () => {
    if (user) return user;
    if (!name.trim()) throw new Error("Nhập tên cái đã");
    const u = await createUser(name.trim());
    setUserPersist(u);
    return u;
  };

  // Nếu được redirect từ phòng, sau khi tạo user → quay lại phòng luôn
  const ensureUserThenMaybeGoBack = async () => {
    const u = await ensureUser();
    if (redirectFrom?.startsWith("/room/")) {
      nav(redirectFrom, { replace: true });
      return true;
    }
    return false;
  };

  const onCreateRoom = async () => {
    try {
      setLoading(true);
      const jumped = await ensureUserThenMaybeGoBack();
      if (jumped) return; // đã điều hướng về phòng cũ
      const { roomId } = await createRoom();
      nav(`/room/${roomId}`);
    } catch (e: any) {
      alert(e.message || "Lỗi tạo phòng");
    } finally {
      setLoading(false);
    }
  };

  const onJoinRoom = async () => {
    try {
      setLoading(true);
      const jumped = await ensureUserThenMaybeGoBack();
      if (jumped) return;
      const code = roomCode.trim().toUpperCase();
      if (!code) throw new Error("Nhập mã phòng");
      nav(`/room/${code}`);
    } catch (e: any) {
      alert(e.message || "Lỗi join phòng");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6">
      <h1 className="mb-5 text-2xl font-extrabold tracking-tight text-slate-100">
        Cờ Caro
      </h1>

      {!user && (
        <div className="mb-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <label className="mb-2 block text-sm font-medium text-slate-300">
            Tên của bạn
          </label>
          <input
            ref={nameRef}
            className="block w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-slate-100 outline-none
                       placeholder:text-slate-500 focus:border-blue-500"
            placeholder="Nhập tên để chơi"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onCreateRoom()}
          />
          <p className="mt-2 text-xs text-slate-400">
            Bạn sẽ được tạo ID ngẫu nhiên và lưu ở LocalStorage.
          </p>
        </div>
      )}

      <div className="mb-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
        <button
          className="inline-flex w-full items-center justify-center rounded-xl bg-blue-500 px-4 py-2 text-sm font-semibold text-white
                     hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={loading}
          onClick={onCreateRoom}
        >
          {loading ? "Đang xử lý..." : redirectFrom?.startsWith("/room/") ? "Vào phòng đã yêu cầu" : "Tạo phòng mới"}
        </button>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
        <label className="mb-2 block text-sm font-medium text-slate-300">
          Mã phòng
        </label>
        <input
          ref={codeRef}
          className="mb-3 block w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-slate-100 outline-none
                     placeholder:text-slate-500 focus:border-blue-500"
          placeholder="Ví dụ: ABC123"
          value={roomCode}
          onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === "Enter" && onJoinRoom()}
        />
        <button
          className="inline-flex w-full items-center justify-center rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200
                     hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={loading}
          onClick={onJoinRoom}
        >
          {loading ? "Đang vào..." : "Vào phòng"}
        </button>
      </div>
    </div>
  );
}
