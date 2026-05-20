import data from "@/lib/data";

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method === "PUT") {
    try {
      const { employee_name, date, check_in, check_out, status } = req.body;
      await data.query(
        "UPDATE attendance SET employee_name=?, date=?, check_in=?, check_out=?, status=? WHERE id=?",
        [employee_name, date, check_in || null, check_out || null, status, id]
      );
      res.status(200).json({ success: true, message: "attendance updated successfully" });
    } catch (error) {
      console.error("database error:", error);
      res.status(500).json({ success: false, message: "error updating attendance", error: error.message });
    }
  } else if (req.method === "DELETE") {
    try {
      await data.query("DELETE FROM attendance WHERE id=?", [id]);
      res.status(200).json({ success: true, message: "attendance deleted successfully" });
    } catch (error) {
      console.error("database error:", error);
      res.status(500).json({ success: false, message: "error deleting attendance", error: error.message });
    }
  } else {
    res.status(405).json({ message: "method not allowed" });
  }
}
