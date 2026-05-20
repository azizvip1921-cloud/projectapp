import data from "@/lib/data";
import bcrypt from "bcryptjs";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { id, source, current, next } = req.body;
  if (!id || !current || !next) return res.status(400).json({ error: "missing_fields" });

  try {
    if (source === "system") {
      // System user — bcrypt password in users table
      const [rows] = await data.query("SELECT password FROM users WHERE id = ? LIMIT 1", [id]);
      if (!rows || rows.length === 0) return res.status(404).json({ error: "not_found" });
      const match = await bcrypt.compare(current, rows[0].password);
      if (!match) return res.status(401).json({ error: "wrong_password" });
      const hashed = await bcrypt.hash(next, 10);
      await data.query("UPDATE users SET password = ? WHERE id = ?", [hashed, id]);
      return res.status(200).json({ success: true });
    }

    // Legacy employee HR Manager
    const [rows] = await data.query(
      "SELECT password FROM employee WHERE id = ? AND type_of_job = 'HR Manager' LIMIT 1",
      [id]
    );
    if (!rows || rows.length === 0) return res.status(404).json({ error: "not_found" });

    const stored = rows[0].password;
    const isBcrypt = stored && stored.startsWith("$2");
    let match = false;
    if (isBcrypt) {
      match = await bcrypt.compare(current, stored);
    } else {
      match = stored === current;
    }
    if (!match) return res.status(401).json({ error: "wrong_password" });

    const hashed = await bcrypt.hash(next, 10);
    await data.query("UPDATE employee SET password = ? WHERE id = ?", [hashed, id]);
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("Change password error:", err);
    return res.status(500).json({ error: "server_error" });
  }
}
