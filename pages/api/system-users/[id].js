import data from "@/lib/data";
import bcrypt from "bcryptjs";
import { requireAuth } from "@/lib/requireAuth";

export default async function handler(req, res) {
  const session = await requireAuth(req, res);
  if (!session) return;

  // Only admin system users can modify system users
  if (session.user_source === "system") {
    const [adminCheck] = await data.query(
      "SELECT role FROM users WHERE id = ? LIMIT 1",
      [session.user_id]
    );
    if (!adminCheck.length || adminCheck[0].role !== "admin") {
      return res.status(403).json({ error: "forbidden" });
    }
  }

  const { id } = req.query;

  if (req.method === "PUT") {
    try {
      const { name, email, role, password } = req.body;

      // Password-only reset
      if (password && !name && !email && !role) {
        if (password.length < 6) {
          return res.status(400).json({ message: "Password must be at least 6 characters" });
        }
        const hashed = await bcrypt.hash(password, 10);
        await data.query("UPDATE users SET password=? WHERE id=?", [hashed, id]);
        return res.status(200).json({ success: true });
      }

      if (!name || !email || !role) {
        return res.status(400).json({ message: "Name, email and role are required" });
      }
      const [dup] = await data.query(
        "SELECT id FROM users WHERE email = ? AND id != ?", [email, id]
      );
      if (dup.length > 0) {
        return res.status(409).json({ message: "Email already used by another user" });
      }
      await data.query(
        "UPDATE users SET name=?, email=?, role=? WHERE id=?",
        [name, email, role, id]
      );
      return res.status(200).json({ success: true });
    } catch (err) {
      return res.status(500).json({ message: "Failed to update user", error: err.message });
    }
  }

  if (req.method === "DELETE") {
    try {
      await data.query("DELETE FROM users WHERE id=?", [id]);
      return res.status(200).json({ success: true });
    } catch (err) {
      return res.status(500).json({ message: "Failed to delete user", error: err.message });
    }
  }

  res.status(405).json({ message: "Method not allowed" });
}
