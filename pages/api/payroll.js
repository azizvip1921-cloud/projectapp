import data from "@/lib/data";
import { requireAuth } from "@/lib/requireAuth";

export default async function handler(req, res) {
  const session = await requireAuth(req, res);
  if (!session) return;

  if (req.method === "GET") {
    try {
      const [rows] = await data.query("SELECT * FROM payroll ORDER BY created_at DESC");
      res.setHeader("Cache-Control", "no-store, must-revalidate");
      res.status(200).json(rows);
    } catch (error) {
      console.error("database error:", error);
      res.status(500).json({ success: false, message: "error fetching payroll", error: error.message });
    }
  } else if (req.method === "POST") {
    try {
      const { employee_name, month, payment_date, base_salary, bonus, deductions, net, status } = req.body;
      if (!employee_name || !base_salary) {
        return res.status(400).json({ success: false, message: "Missing required fields" });
      }
      const resolvedMonth = month || (payment_date ? payment_date.slice(0, 7) : new Date().toISOString().slice(0, 7));
      await data.query(
        "INSERT INTO payroll (employee_name, month, payment_date, base_salary, bonus, deductions, net, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [employee_name, resolvedMonth, payment_date || null, Number(base_salary), Number(bonus || 0), Number(deductions || 0), Number(net || 0), status || "Pending"]
      );
      res.status(200).json({ success: true, message: "Payroll record added successfully" });
    } catch (error) {
      console.error("database error:", error);
      res.status(500).json({ success: false, message: "error adding payroll", error: error.message });
    }
  } else {
    res.status(405).json({ message: "method not allowed" });
  }
}
