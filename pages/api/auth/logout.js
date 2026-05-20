import data from "@/lib/data";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const token = req.cookies?.hr_session;
  if (token) {
    await data.query("DELETE FROM sessions WHERE token = ?", [token]).catch(() => {});
  }

  res.setHeader("Set-Cookie", "hr_session=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax");
  return res.status(200).json({ ok: true });
}
