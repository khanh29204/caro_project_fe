const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export type User = { id: string; name: string };
export async function createUser(name: string): Promise<User> {
  const res = await fetch(`${API_URL}/api/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error("Tạo user thất bại");
  return res.json();
}

export async function createRoom(): Promise<{ roomId: string }> {
  const res = await fetch(`${API_URL}/api/rooms`, { method: "POST" });
  if (!res.ok) throw new Error("Tạo phòng thất bại");
  return res.json();
}

export async function getHistory(userId: string, opponentId: string) {
  const url = new URL(`${API_URL}/api/history`);
  url.searchParams.set("userId", userId);
  url.searchParams.set("opponentId", opponentId);
  const res = await fetch(url);
  if (!res.ok) throw new Error("Lấy lịch sử thất bại");
  return res.json() as Promise<{
    me: string;
    opponent: string;
    wins: number;
    losses: number;
    draws: number;
    total: number;
  }>;
}

export { API_URL };
