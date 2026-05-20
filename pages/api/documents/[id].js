import data from "@/lib/data";

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method === "PUT") {
    try {
      const { name, employee, dept, type, size, date } = req.body;
      await data.query(
        "UPDATE documents SET name=?, employee=?, dept=?, type=?, size=?, date=? WHERE id=?",
        [name, employee, dept || null, type || "PDF", size || null, date, id]
      );
      res.status(200).json({ success: true });
    } catch (error) {
      console.error("database error:", error);
      res.status(500).json({ success: false, message: "error updating document", error: error.message });
    }
  } else if (req.method === "DELETE") {
    try {
      await data.query("DELETE FROM documents WHERE id=?", [id]);
      res.status(200).json({ success: true });
    } catch (error) {
      console.error("database error:", error);
      res.status(500).json({ success: false, message: "error deleting document", error: error.message });
    }
  } else {
    res.status(405).json({ message: "method not allowed" });
  }
}
