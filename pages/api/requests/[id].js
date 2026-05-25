import data from "@/lib/data";

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method === "PUT") {
    try {
      const { employee_name, request_type, subject, submitted_date, status, notes } = req.body;
      const cleanDate = submitted_date ? String(submitted_date).slice(0, 10) : null;
      await data.query(
        "UPDATE requests SET employee_name=?, request_type=?, subject=?, submitted_date=?, status=?, notes=? WHERE id=?",
        [employee_name, request_type || "Transfer Request", subject, cleanDate, status || "Pending", notes || null, id]
      );
      res.status(200).json({ success: true });
    } catch (error) {
      console.error("database error:", error);
      res.status(500).json({ success: false, message: "error updating request", error: error.message });
    }
  } else if (req.method === "DELETE") {
    try {
      await data.query("DELETE FROM requests WHERE id=?", [id]);
      res.status(200).json({ success: true });
    } catch (error) {
      console.error("database error:", error);
      res.status(500).json({ success: false, message: "error deleting request", error: error.message });
    }
  } else {
    res.status(405).json({ message: "method not allowed" });
  }
}
