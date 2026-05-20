import data from "@/lib/data";

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method === "PUT") {
    try {
      const { source, category, amount, date, notes } = req.body;
      await data.query(
        "UPDATE revenue SET source=?, category=?, amount=?, date=?, notes=? WHERE id=?",
        [source, category || "Sales", Number(amount || 0), date, notes || null, id]
      );
      res.status(200).json({ success: true });
    } catch (error) {
      console.error("database error:", error);
      res.status(500).json({ success: false, message: "error updating revenue", error: error.message });
    }
  } else if (req.method === "DELETE") {
    try {
      await data.query("DELETE FROM revenue WHERE id=?", [id]);
      res.status(200).json({ success: true });
    } catch (error) {
      console.error("database error:", error);
      res.status(500).json({ success: false, message: "error deleting revenue", error: error.message });
    }
  } else {
    res.status(405).json({ message: "method not allowed" });
  }
}
