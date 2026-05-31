import data from "@/lib/data";

export default async function handler(req, res) {
  const { id } = req.query;

  // Validate id
  if (!id || isNaN(id)) {
    return res.status(400).json({ success: false, message: "Invalid contract ID" });
  }

  if (req.method === "GET") {
    try {
      const [rows] = await data.query("SELECT * FROM contracts WHERE id=?", [id]);
      if (!rows || rows.length === 0) {
        return res.status(404).json({ success: false, message: "Contract not found" });
      }
      res.status(200).json(rows[0]);
    } catch (error) {
      console.error("database error:", error);
      res.status(500).json({ success: false, message: "error fetching contract", error: error.message });
    }
  } else if (req.method === "PUT") {
    try {
      const { employee_name, department, contract_type, start_date, end_date, salary, status } = req.body;

      // Validate required fields
      if (!employee_name || !contract_type || !start_date) {
        return res.status(400).json({ success: false, message: "Missing required fields: employee_name, contract_type, start_date" });
      }

      const today = new Date(new Date().toDateString());
      const resolvedStatus = end_date && new Date(end_date) <= today ? "Inactive" : status || "Active";

      const [result] = await data.query(
        "UPDATE contracts SET employee_name=?, department=?, contract_type=?, start_date=?, end_date=?, salary=?, status=? WHERE id=?",
        [employee_name, department || null, contract_type || "Permanent", start_date, end_date || null, Number(salary || 0), resolvedStatus, id]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, message: "Contract not found" });
      }

      res.status(200).json({ success: true, message: "Contract updated successfully" });
    } catch (error) {
      console.error("database error:", error);
      res.status(500).json({ success: false, message: "error updating contract", error: error.message });
    }
  } else if (req.method === "DELETE") {
    try {
      const [result] = await data.query("DELETE FROM contracts WHERE id=?", [id]);

      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, message: "Contract not found" });
      }

      res.status(200).json({ success: true, message: "Contract deleted successfully" });
    } catch (error) {
      console.error("database error:", error);
      res.status(500).json({ success: false, message: "error deleting contract", error: error.message });
    }
  } else {
    res.status(405).json({ success: false, message: "method not allowed" });
  }
}
