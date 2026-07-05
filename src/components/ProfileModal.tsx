import React, { useEffect, useState } from "react";
import { getProfile } from "../api";

export default function ProfileModal({
  userId,
  userName,
  onClose,
}: {
  userId: string;
  userName?: string;
  onClose: () => void;
}) {
  const [profile, setProfile] = useState<{
    wins: number;
    losses: number;
    draws: number;
    total: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProfile(userId)
      .then((data) => {
        setProfile(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [userId]);

  const winRate = profile && profile.total > 0
    ? ((profile.wins / profile.total) * 100).toFixed(1)
    : "0.0";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-sm rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-xl font-bold text-white shadow-lg">
              {userName ? userName[0].toUpperCase() : "U"}
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-100">{userName || "Người chơi"}</h3>
              <p className="text-xs text-slate-400 font-mono">{userId.startsWith("google_") ? "Google Account" : "Guest Account"}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="py-10 text-center text-sm text-slate-400">Đang tải thông tin...</div>
        ) : profile ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-slate-800/50 p-4 border border-slate-700/50">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Tổng trận</p>
                <p className="text-2xl font-black text-white">{profile.total}</p>
              </div>
              <div className="rounded-2xl bg-slate-800/50 p-4 border border-slate-700/50">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Tỉ lệ thắng</p>
                <p className="text-2xl font-black text-blue-400">{winRate}%</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-green-500/10 p-3 text-center border border-green-500/20">
                <p className="text-[10px] font-bold text-green-500 uppercase tracking-wider mb-1">Thắng</p>
                <p className="text-lg font-bold text-green-400">{profile.wins}</p>
              </div>
              <div className="rounded-xl bg-slate-500/10 p-3 text-center border border-slate-500/20">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Hòa</p>
                <p className="text-lg font-bold text-slate-300">{profile.draws}</p>
              </div>
              <div className="rounded-xl bg-red-500/10 p-3 text-center border border-red-500/20">
                <p className="text-[10px] font-bold text-red-500 uppercase tracking-wider mb-1">Thua</p>
                <p className="text-lg font-bold text-red-400">{profile.losses}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-10 text-center text-sm text-red-400">Lỗi không thể tải hồ sơ</div>
        )}
      </div>
    </div>
  );
}
