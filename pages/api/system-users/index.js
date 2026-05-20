import data from "@/lib/data";
import bcrypt from "bcryptjs";

export default async function handler(req, res) {
  if (req.method === "GET") {
    try {
      await data.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS employee_id INT DEFAULT NULL").catch(() => {});
      const [rows] = await data.query(
        "SELECT u.id, u.name, u.email, u.role, u.employee_id, u.created_at, e.image AS employee_image FROM users u LEFT JOIN employee e ON e.id = u.employee_id ORDER BY u.created_at DESC"
      );
      return res.status(200).json(rows);
    } catch (err) {
      return res.status(500).json({ message: "Failed to fetch users", error: err.message });
    }
  }

  if (req.method === "POST") {
    try {
      await data.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS employee_id INT DEFAULT NULL").catch(() => {});
      const { name, email, role, password, employee_id } = req.body;
      if (!name || !email || !role || !password) {
        return res.status(400).json({ message: "All fields are required" });
      }
      const [existing] = await data.query("SELECT id FROM users WHERE email = ?", [email]);
      if (existing.length > 0) {
        return res.status(409).json({ message: "Email already exists" });
      }
      const hashed = await bcrypt.hash(password, 10);
      const [result] = await data.query(
        "INSERT INTO users (name, email, role, password, employee_id) VALUES (?, ?, ?, ?, ?)",
        [name, email, role, hashed, employee_id || null]
      );
      return res.status(201).json({ success: true, id: result.insertId });
    } catch (err) {
      return res.status(500).json({ message: "Failed to add user", error: err.message });
    }
  }

  res.status(405).json({ message: "Method not allowed" });
}
