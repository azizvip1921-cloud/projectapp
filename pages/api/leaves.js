import data from "@/lib/data";
import { requireAuth } from "@/lib/requireAuth";

export default async function handler(req, res) {
  const session = await requireAuth(req, res);
  if (!session) return;

  if (req.method === "GET") {
    try {
      const [rows] = await data.query("SELECT * FROM leaves ORDER BY created_at DESC");
      res.setHeader("Cache-Control", "no-store, must-revalidate");
      res.status(200).json(rows);
    } catch (error) {
      console.error("database error:", error);
      res.status(500).json({ success: false, message: "error fetching leaves", error: error.message });
    }
  } else if (req.method === "POST") {
    try {
      const { employee_name, leave_type, start_date, end_date, days, status, notes } = req.body;
      if (!employee_name || !leave_type || !start_date || !end_date) {
        return res.status(400).json({ success: false, message: "Missing required fields" });
      }
      await data.query(
        "INSERT INTO leaves (employee_name, leave_type, start_date, end_date, days, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [employee_name, leave_type, start_date, end_date, Number(days || 0), status || "Pending", notes || null]
      );
      res.status(200).json({ success: true, message: "Leave request added successfully" });
    } catch (error) {
      console.error("database error:", error);
      res.status(500).json({ success: false, message: "error adding leave", error: error.message });
    }
  } else {
    res.status(405).json({ message: "method not allowed" });
  }
}
