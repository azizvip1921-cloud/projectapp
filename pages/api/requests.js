import data from "@/lib/data";
import { requireAuth } from "@/lib/requireAuth";

export default async function handler(req, res) {
  const session = await requireAuth(req, res);
  if (!session) return;

  if (req.method === "GET") {
    try {
      const [rows] = await data.query("SELECT * FROM requests ORDER BY submitted_date DESC");
      res.setHeader("Cache-Control", "no-store, must-revalidate");
      res.status(200).json(rows);
    } catch (error) {
      console.error("database error:", error);
      res.status(500).json({ success: false, message: "error fetching requests", error: error.message });
    }
  } else if (req.method === "POST") {
    try {
      const { employee_name, request_type, subject, submitted_date, status, notes } = req.body;
      const [result] = await data.query(
        "INSERT INTO requests (employee_name, request_type, subject, submitted_date, status, notes) VALUES (?, ?, ?, ?, ?, ?)",
        [employee_name, request_type || "Transfer Request", subject, submitted_date || null, status || "Pending", notes || null]
      );
      res.status(200).json({ success: true, id: result.insertId });
    } catch (error) {
      console.error("database error:", error);
      res.status(500).json({ success: false, message: "error adding request", error: error.message });
    }
  } else {
    res.status(405).json({ message: "method not allowed" });
  }
}
