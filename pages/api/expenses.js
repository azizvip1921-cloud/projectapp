import data from "@/lib/data";

export default async function handler(req, res) {
  if (req.method === "GET") {
    try {
      const [rows] = await data.query("SELECT * FROM expenses ORDER BY date DESC");
      res.setHeader("Cache-Control", "no-store, must-revalidate");
      res.status(200).json(rows);
    } catch (error) {
      console.error("database error:", error);
      res.status(500).json({ success: false, message: "error fetching expenses", error: error.message });
    }
  } else if (req.method === "POST") {
    try {
      const { employee_name, category, amount, date, description, status } = req.body;
      const [result] = await data.query(
        "INSERT INTO expenses (employee_name, category, amount, date, description, status) VALUES (?, ?, ?, ?, ?, ?)",
        [employee_name, category || "", Number(amount || 0), date, description || null, status || "Pending"]
      );
      res.status(201).json({ success: true, id: result.insertId });
    } catch (error) {
      console.error("database error:", error);
      res.status(500).json({ success: false, message: "error adding expense", error: error.message });
    }
  } else {
    res.status(405).json({ message: "method not allowed" });
  }
}
