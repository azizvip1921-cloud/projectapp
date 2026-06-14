import data from "@/lib/data";
import { requireAuth } from "@/lib/requireAuth";

export default async function handler(req, res) {
  const session = await requireAuth(req, res);
  if (!session) return;

  if (req.method === "GET") {
    try {
      await data.query(
        "UPDATE contracts SET status = 'Inactive' WHERE end_date IS NOT NULL AND DATE(end_date) <= CURDATE() AND status NOT IN ('Inactive', 'Expired')"
      );
      const [rows] = await data.query("SELECT * FROM contracts ORDER BY created_at DESC");
      res.setHeader("Cache-Control", "no-store, must-revalidate");
      res.status(200).json(rows);
    } catch (error) {
      console.error("database error:", error);
      res.status(500).json({ success: false, message: "error fetching contracts", error: error.message });
    }
  } else if (req.method === "POST") {
    try {
      const { employee_name, department, contract_type, start_date, end_date, salary, status } = req.body;
      const today = new Date(new Date().toDateString());
      const calculatedStatus = end_date && new Date(end_date) <= today ? "Inactive" : status || "Active";
      const [result] = await data.query(
        "INSERT INTO contracts (employee_name, department, contract_type, start_date, end_date, salary, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [employee_name, department || null, contract_type || "Permanent", start_date, end_date || null, Number(salary || 0), calculatedStatus]
      );
      res.status(201).json({ success: true, id: result.insertId });
    } catch (error) {
      console.error("database error:", error);
      res.status(500).json({ success: false, message: "error adding contract", error: error.message });
    }
  } else {
    res.status(405).json({ message: "method not allowed" });
  }
}
