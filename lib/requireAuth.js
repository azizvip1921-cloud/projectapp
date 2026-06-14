import data from "@/lib/data";

export async function requireAuth(req, res) {
  const token = req.cookies?.hr_session;
  if (!token) {
    res.status(401).json({ error: "unauthorized" });
    return null;
  }
  try {
    const [rows] = await data.query(
      "SELECT user_id, user_source FROM sessions WHERE token = ? AND expires_at > NOW() LIMIT 1",
      [token]
    );
    if (!rows || rows.length === 0) {
      res.setHeader("Set-Cookie", "hr_session=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax");
      res.status(401).json({ error: "invalid_session" });
      return null;
    }
    return rows[0];
  } catch {
    res.status(500).json({ error: "server_error" });
    return null;
  }
}
