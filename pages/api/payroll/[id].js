import data from "@/lib/data";
import { requireAuth } from "@/lib/requireAuth";

export default async function handler(req, res) {
  const session = await requireAuth(req, res);
  if (!session) return;

  const { id } = req.query;

  if (req.method === "PUT") {
    try {
      const { employee_name, month, payment_date, base_salary, bonus, deductions, net, status } = req.body;
      const resolvedMonth = month || (payment_date ? payment_date.slice(0, 7) : new Date().toISOString().slice(0, 7));
      await data.query(
        "UPDATE payroll SET employee_name=?, month=?, payment_date=?, base_salary=?, bonus=?, deductions=?, net=?, status=? WHERE id=?",
        [employee_name, resolvedMonth, payment_date || null, Number(base_salary), Number(bonus || 0), Number(deductions || 0), Number(net || 0), status, id]
      );
      res.status(200).json({ success: true, message: "Payroll record updated successfully" });
    } catch (error) {
      console.error("database error:", error);
      res.status(500).json({ success: false, message: "error updating payroll", error: error.message });
    }
  } else if (req.method === "DELETE") {
    try {
      // Get the net salary before deleting
      await data.query("DELETE FROM payroll WHERE id=?", [id]);
      res.status(200).json({ success: true, message: "Payroll record deleted successfully" });
    } catch (error) {
      console.error("database error:", error);
      res.status(500).json({ success: false, message: "error deleting payroll", error: error.message });
    }
  } else {
    res.status(405).json({ message: "method not allowed" });
  }
}
