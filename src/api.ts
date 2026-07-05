// api.ts
const API_URL = (import.meta.env.VITE_API_URL ?? "").trim(); // "" => same-origin

export type User = { id: string; name: string };

export async function createUser(name: string): Promise<User> {
  const res = await fetch(`${API_URL}/api/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
    // credentials: "include", // bật nếu BE cần cookie
  });
  if (!res.ok) throw new Error("Tạo user thất bại");
  return res.json();
}

export async function createRoom(userId: string): Promise<{ roomId: string }> {
  const res = await fetch(`${API_URL}/api/rooms`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId }),
  });
  if (!res.ok) throw new Error("Tạo phòng thất bại");
  return res.json();
}

export async function getHistory(userId: string, opponentId: string) {
  const url = new URL(`${API_URL}/api/history`, window.location.origin);
  url.searchParams.set("userId", userId);
  url.searchParams.set("opponentId", opponentId);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error("Lấy lịch sử thất bại");
  return res.json() as Promise<{
    me: string; opponent: string; wins: number; losses: number; draws: number; total: number;
  }>;
}

export async function checkConflict(oldId: string, newId: string) {
  const url = new URL(`${API_URL}/api/history/check-conflict`, window.location.origin);
  url.searchParams.set("oldId", oldId);
  url.searchParams.set("newId", newId);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error("Check conflict failed");
  return res.json() as Promise<{ oldHasHistory: boolean; newHasHistory: boolean; hasConflict: boolean }>;
}

export async function mergeHistory(oldId: string, newId: string, resolution: "keep_old" | "keep_new" | "sum") {
  const res = await fetch(`${API_URL}/api/history/merge`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ oldId, newId, resolution }),
  });
  if (!res.ok) throw new Error("Merge history failed");
  return res.json();
}

export async function getProfile(id: string) {
  const res = await fetch(`${API_URL}/api/history/profile/${id}`);
  if (!res.ok) throw new Error("Get profile failed");
  return res.json() as Promise<{
    id: string;
    wins: number;
    losses: number;
    draws: number;
    total: number;
  }>;
}

export { API_URL };
