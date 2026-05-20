import data from "@/lib/data";

export default async function handler(req, res) {
  if (req.method === "GET") {
    try {
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
      const [result] = await data.query(
        "INSERT INTO contracts (employee_name, department, contract_type, start_date, end_date, salary, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [employee_name, department || null, contract_type || "Permanent", start_date, end_date || null, Number(salary || 0), status || "Active"]
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
