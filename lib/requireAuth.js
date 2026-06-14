import data from "@/lib/data";

export async function requireAuth(req, res) {
  const token = req.cookies?.hr_session;
  if (!token) {
    res.status(401).json({ error: "unauthorized" });
    return null;
  }
  try {
    const [rows] = await data.query(
      `SELECT s.user_id, s.user_source, u.role
       FROM sessions s
       LEFT JOIN users u ON u.id = s.user_id AND s.user_source = 'system'
       WHERE s.token = ? AND s.expires_at > NOW() LIMIT 1`,
      [token]
    );
    if (!rows || rows.length === 0) {
      res.setHeader("Set-Cookie", "hr_session=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax");
      res.status(401).json({ error: "invalid_session" });
      return null;
    }
    const session = rows[0];
    if (req.method !== 'GET'
        && !req.url?.startsWith('/api/auth/')
        && session.user_source === 'system'
        && session.role === 'Viewer') {
      res.status(403).json({ error: 'forbidden' });
      return null;
    }
    return session;
  } catch {
    res.status(500).json({ error: "server_error" });
    return null;
  }
}
