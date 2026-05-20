import data from "@/lib/data";

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method === "PUT") {
    try {
      const { employee_name, department, contract_type, start_date, end_date, salary, status } = req.body;
      await data.query(
        "UPDATE contracts SET employee_name=?, department=?, contract_type=?, start_date=?, end_date=?, salary=?, status=? WHERE id=?",
        [employee_name, department || null, contract_type || "Permanent", start_date, end_date || null, Number(salary || 0), status || "Active", id]
      );
      res.status(200).json({ success: true });
    } catch (error) {
      console.error("database error:", error);
      res.status(500).json({ success: false, message: "error updating contract", error: error.message });
    }
  } else if (req.method === "DELETE") {
    try {
      await data.query("DELETE FROM contracts WHERE id=?", [id]);
      res.status(200).json({ success: true });
    } catch (error) {
      console.error("database error:", error);
      res.status(500).json({ success: false, message: "error deleting contract", error: error.message });
    }
  } else {
    res.status(405).json({ message: "method not allowed" });
  }
}
