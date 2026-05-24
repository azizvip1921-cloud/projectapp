import data from "@/lib/data";
import bcrypt from "bcryptjs";
import crypto from "crypto";

async function createSession(res, userId, userSource) {
  await data.query("DELETE FROM sessions WHERE expires_at < NOW()").catch(() => {});

  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await data.query(
    "INSERT INTO sessions (token, user_id, user_source, expires_at) VALUES (?, ?, ?, ?)",
    [token, userId, userSource, expires]
  );

  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  res.setHeader(
    "Set-Cookie",
    `hr_session=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}${secure}`
  );
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "missing_fields" });
  }

  try {
    // 1. Check system users table first (by email or name)
    await data.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS employee_id INT DEFAULT NULL").catch(() => {});
    const [sysRows] = await data.query(
      "SELECT id, name, email, role, password, employee_id FROM users WHERE email = ? OR LOWER(TRIM(name)) = LOWER(TRIM(?)) LIMIT 1",
      [username.trim(), username.trim()]
    );

    if (sysRows && sysRows.length > 0) {
      const sysUser = sysRows[0];
      const match = await bcrypt.compare(password, sysUser.password);
      if (!match) return res.status(401).json({ error: "wrong_password" });
      await createSession(res, sysUser.id, "system");
      return res.status(200).json({
        success: true,
        user: { id: sysUser.id, name: sysUser.name, email: sysUser.email, role: sysUser.role, employee_id: sysUser.employee_id || null, source: "system" },
      });
    }

    // 2. Fall back to employee table (HR Manager legacy login)
    try {
      await data.query("ALTER TABLE employee ADD COLUMN password VARCHAR(255) DEFAULT NULL");
    } catch (_) {}

    const [rows] = await data.query(
      "SELECT id, employee_name, type_of_job, password, image FROM employee WHERE LOWER(TRIM(employee_name)) = LOWER(TRIM(?)) AND type_of_job = 'HR Manager' LIMIT 1",
      [username]
    );

    if (!rows || rows.length === 0) {
      return res.status(401).json({ error: "not_found" });
    }

    const emp = rows[0];

    if (!emp.password) {
      const hashed = await bcrypt.hash(password, 10);
      await data.query("UPDATE employee SET password = ? WHERE id = ?", [hashed, emp.id]);
      await createSession(res, emp.id, "employee");
      return res.status(200).json({
        success: true,
        user: { id: emp.id, name: emp.employee_name, role: "HR Manager", image: emp.image || null, source: "employee" },
      });
    }

    // پاسووەردی کۆن plaintext بوو، دووبارە هاش دەکرێت
    const isBcrypt = emp.password.startsWith("$2");
    let match = false;
    if (isBcrypt) {
      match = await bcrypt.compare(password, emp.password);
    } else {
      match = emp.password === password;
      if (match) {
        const hashed = await bcrypt.hash(password, 10);
        await data.query("UPDATE employee SET password = ? WHERE id = ?", [hashed, emp.id]);
      }
    }
    if (!match) {
      return res.status(401).json({ error: "wrong_password" });
    }

    await createSession(res, emp.id, "employee");
    return res.status(200).json({
      success: true,
      user: { id: emp.id, name: emp.employee_name, role: "HR Manager", image: emp.image || null, source: "employee" },
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ error: "server_error" });
  }
}
