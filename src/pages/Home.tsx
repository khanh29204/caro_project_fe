import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { createRoom, createUser, checkConflict, mergeHistory } from "../api";
import { useGoogleLogin } from "@react-oauth/google";
import ProfileModal from "../components/ProfileModal";

type User = { id: string; name: string };

export default function Home({
  user,
  setUserPersist,
}: {
  user: User | null;
  setUserPersist: (u: User | null) => void;
}) {
  const nav = useNavigate();
  const location = useLocation();
  const [name, setName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [loading, setLoading] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const codeRef = useRef<HTMLInputElement>(null);
  
  const [mergeModal, setMergeModal] = useState<{
    show: boolean;
    oldId: string;
    newId: string;
    newUser: User;
  } | null>(null);

  const [showProfile, setShowProfile] = useState(false);

  const onGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        setLoading(true);
        const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        });
        const userInfo = await res.json();
        
        const newId = `google_${userInfo.sub}`;
        const newUser = { id: newId, name: userInfo.name || "Google User" };

        if (user && user.id !== newId) {
          const conflictRes = await checkConflict(user.id, newId);
          if (conflictRes.hasConflict) {
            setMergeModal({ show: true, oldId: user.id, newId, newUser });
            setLoading(false);
            return;
          } else if (conflictRes.oldHasHistory) {
            await mergeHistory(user.id, newId, "sum");
          }
        }
        
        setUserPersist(newUser);
        
        if (redirectFrom?.startsWith("/room/")) {
          nav(redirectFrom, { replace: true });
        }
      } catch (e: any) {
        alert("Lỗi đăng nhập Google: " + e.message);
      } finally {
        setLoading(false);
      }
    },
    onError: () => {
      alert("Đăng nhập Google thất bại");
    }
  });

  const handleMerge = async (resolution: "keep_old" | "keep_new" | "sum") => {
    if (!mergeModal) return;
    try {
      setLoading(true);
      await mergeHistory(mergeModal.oldId, mergeModal.newId, resolution);
      setUserPersist(mergeModal.newUser);
      setMergeModal(null);
      if (redirectFrom?.startsWith("/room/")) {
        nav(redirectFrom, { replace: true });
      }
    } catch (e: any) {
      alert("Lỗi gộp lịch sử: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    if (confirm("Bạn có chắc chắn muốn đăng xuất và xóa dữ liệu cục bộ?")) {
      setUserPersist(null);
      setName("");
    }
  };

  const handleEditName = () => {
    const newName = prompt("Nhập tên mới của bạn:", user?.name);
    if (newName && newName.trim() && user) {
      setUserPersist({ ...user, name: newName.trim() });
    }
  };

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
      const userRef = await ensureUser();
      if (redirectFrom?.startsWith("/room/")) {
        nav(redirectFrom, { replace: true });
        return;
      }
      const { roomId } = await createRoom(userRef.id);
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
      await ensureUser();
      if (redirectFrom?.startsWith("/room/")) {
        nav(redirectFrom, { replace: true });
        return;
      }
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
          <div className="mt-4 flex items-center justify-between">
            <span className="h-px w-full bg-slate-800"></span>
            <span className="px-3 text-xs text-slate-500 uppercase">Hoặc</span>
            <span className="h-px w-full bg-slate-800"></span>
          </div>
          <button
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={loading}
            onClick={() => onGoogleLogin()}
          >
            <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="h-5 w-5" />
            Đăng nhập với Google
          </button>
        </div>
      )}

      {user && user.id.startsWith("google_") === false && (
        <div className="mb-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex justify-between items-center mb-3">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-slate-200">Khách ({user.name})</p>
                <button onClick={handleEditName} className="text-xs text-blue-400 hover:text-blue-300 underline">Đổi tên</button>
              </div>
              <p className="text-xs text-slate-400 mt-1">Đăng nhập Google để lưu trữ dữ liệu vĩnh viễn</p>
            </div>
            <div className="flex gap-2">
              <button
                className="flex items-center justify-center gap-2 rounded-lg bg-slate-800 border border-slate-700 px-3 py-1.5 text-sm font-medium text-slate-200 hover:bg-slate-700 transition"
                onClick={() => setShowProfile(true)}
              >
                Hồ sơ
              </button>
              <button
                className="flex items-center justify-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-1.5 text-sm font-medium text-red-400 hover:bg-red-500/20 transition"
                onClick={handleLogout}
              >
                Đăng xuất
              </button>
            </div>
          </div>
          <button
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 transition"
            disabled={loading}
            onClick={() => onGoogleLogin()}
          >
            <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="h-4 w-4" />
            Liên kết Google
          </button>
        </div>
      )}

      {user && user.id.startsWith("google_") && (
        <div className="mb-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 flex justify-between items-center">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-slate-200">Đã đăng nhập ({user.name})</p>
              <button onClick={handleEditName} className="text-xs text-blue-400 hover:text-blue-300 underline">Đổi tên</button>
            </div>
            <p className="text-xs text-green-400 mt-1">Dữ liệu đã được đồng bộ</p>
          </div>
          <div className="flex gap-2">
            <button
              className="flex items-center justify-center gap-2 rounded-lg bg-slate-800 border border-slate-700 px-3 py-1.5 text-sm font-medium text-slate-200 hover:bg-slate-700 transition"
              onClick={() => setShowProfile(true)}
            >
              Hồ sơ
            </button>
            <button
              className="flex items-center justify-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-1.5 text-sm font-medium text-red-400 hover:bg-red-500/20 transition"
              onClick={handleLogout}
            >
              Đăng xuất
            </button>
          </div>
        </div>
      )}

      <div className="mb-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
        <button
          className="inline-flex w-full items-center justify-center rounded-xl bg-blue-500 px-4 py-2 text-sm font-semibold text-white
                     hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={loading}
          onClick={onCreateRoom}
        >
          {loading
            ? "Đang xử lý..."
            : redirectFrom?.startsWith("/room/")
            ? "Vào phòng đã yêu cầu"
            : "Tạo phòng mới"}
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

      {mergeModal?.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <h3 className="mb-2 text-lg font-bold text-slate-100">Phát hiện trùng lặp dữ liệu</h3>
            <p className="mb-6 text-sm text-slate-300">
              Tài khoản khách hiện tại và tài khoản Google đều đã có lịch sử thi đấu trước đó. Bạn muốn gộp dữ liệu như thế nào?
            </p>
            
            <div className="flex flex-col gap-3">
              <button
                className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition"
                onClick={() => handleMerge("sum")}
                disabled={loading}
              >
                Gộp cả hai (Cộng dồn số trận)
              </button>
              <button
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm font-semibold text-slate-200 hover:bg-slate-700 transition"
                onClick={() => handleMerge("keep_new")}
                disabled={loading}
              >
                Chỉ giữ lịch sử của tài khoản Google
              </button>
              <button
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm font-semibold text-slate-200 hover:bg-slate-700 transition"
                onClick={() => handleMerge("keep_old")}
                disabled={loading}
              >
                Ghi đè bằng lịch sử của tài khoản Khách
              </button>
              <button
                className="mt-2 w-full text-sm font-medium text-slate-400 hover:text-slate-200"
                onClick={() => setMergeModal(null)}
                disabled={loading}
              >
                Hủy đăng nhập
              </button>
            </div>
          </div>
        </div>
      )}

      {showProfile && user && (
        <ProfileModal
          userId={user.id}
          userName={user.name}
          onClose={() => setShowProfile(false)}
        />
      )}
    </div>
  );
}
