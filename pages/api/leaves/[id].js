import data from "@/lib/data";

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method === "PUT") {
    try {
      const { employee_name, leave_type, start_date, end_date, days, status, notes } = req.body;
      const cleanStart = start_date ? String(start_date).slice(0, 10) : null;
      const cleanEnd = end_date ? String(end_date).slice(0, 10) : null;
      await data.query(
        "UPDATE leaves SET employee_name=?, leave_type=?, start_date=?, end_date=?, days=?, status=?, notes=? WHERE id=?",
        [employee_name, leave_type, cleanStart, cleanEnd, Number(days || 0), status, notes || null, id]
      );
      res.status(200).json({ success: true, message: "Leave request updated successfully" });
    } catch (error) {
      console.error("database error:", error);
      res.status(500).json({ success: false, message: "error updating leave", error: error.message });
    }
  } else if (req.method === "DELETE") {
    try {
      await data.query("DELETE FROM leaves WHERE id=?", [id]);
      res.status(200).json({ success: true, message: "Leave request deleted successfully" });
    } catch (error) {
      console.error("database error:", error);
      res.status(500).json({ success: false, message: "error deleting leave", error: error.message });
    }
  } else {
    res.status(405).json({ message: "method not allowed" });
  }
}
