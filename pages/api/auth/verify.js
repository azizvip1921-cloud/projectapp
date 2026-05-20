import data from "@/lib/data";

export default async function handler(req, res) {
  const token = req.cookies?.hr_session;
  if (!token) return res.status(401).json({ error: "no_session" });

  try {
    const [rows] = await data.query(
      "SELECT id FROM sessions WHERE token = ? AND expires_at > NOW() LIMIT 1",
      [token]
    );
    if (!rows || rows.length === 0) {
      res.setHeader("Set-Cookie", "hr_session=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax");
      return res.status(401).json({ error: "invalid_session" });
    }
    return res.status(200).json({ ok: true });
  } catch {
    return res.status(500).json({ error: "server_error" });
  }
}
