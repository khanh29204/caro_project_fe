import React, { useEffect, useState } from "react";
import {
  Routes,
  Route,
  useNavigate,
  Navigate,
  useLocation,
} from "react-router-dom";
import Home from "./pages/Home";
import Room from "./pages/Room";

type User = { id: string; name: string };

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const nav = useNavigate();

  useEffect(() => {
    const raw = localStorage.getItem("caro_user");
    if (raw) {
      try {
        setUser(JSON.parse(raw));
      } catch {
        localStorage.removeItem("caro_user");
      }
    }
    setLoading(false);
  }, []);

  function setUserPersist(u: User) {
    localStorage.setItem("caro_user", JSON.stringify(u));
    setUser(u);
  }

  if (loading) {
    return (
      <div className="grid h-screen place-items-center text-slate-400">
        Đang tải…
      </div>
    );
  }

  return (
    <div className="app">
      <Routes>
        <Route
          path="/"
          element={<Home user={user} setUserPersist={setUserPersist} />}
        />
        <Route
          path="/room/:roomId"
          element={
            <RequireUser user={user}>
              <Room user={user} />
            </RequireUser>
          }
        />
        <Route path="*" element={<NotFound onBack={() => nav("/")} />} />
      </Routes>
    </div>
  );
}

function RequireUser({
  user,
  children,
}: {
  user: User | null;
  children: React.ReactNode;
}) {
  const location = useLocation();
  if (!user) {
    return (
      <Navigate
        to="/"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }
  return <>{children}</>;
}

function NotFound({ onBack }: { onBack: () => void }) {
  return (
    <div className="container text-center py-10">
      <h1 className="text-2xl font-bold mb-4">Không tìm thấy trang</h1>
      <button
        className="px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600"
        onClick={onBack}
      >
        Về trang chủ
      </button>
    </div>
  );
}
