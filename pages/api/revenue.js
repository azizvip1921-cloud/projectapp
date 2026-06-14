import data from "@/lib/data";
import { requireAuth } from "@/lib/requireAuth";

export default async function handler(req, res) {
  const session = await requireAuth(req, res);
  if (!session) return;

  if (req.method === "GET") {
    try {
      const [rows] = await data.query("SELECT * FROM revenue ORDER BY date DESC");
      res.setHeader("Cache-Control", "no-store, must-revalidate");
      res.status(200).json(rows);
    } catch (error) {
      console.error("database error:", error);
      res.status(500).json({ success: false, message: "error fetching revenue", error: error.message });
    }
  } else if (req.method === "POST") {
    try {
      const { source, category, amount, date, notes } = req.body;
      const [result] = await data.query(
        "INSERT INTO revenue (source, category, amount, date, notes) VALUES (?, ?, ?, ?, ?)",
        [source, category || "Sales", Number(amount), date || new Date().toISOString().split("T")[0], notes || null]
      );
      res.status(200).json({ success: true, id: result.insertId });
    } catch (error) {
      console.error("database error:", error);
      res.status(500).json({ success: false, message: "error adding revenue", error: error.message });
    }
  } else if (req.method === "DELETE") {
    try {
      const { id } = req.query;
      await data.query("DELETE FROM revenue WHERE id = ?", [id]);
      res.status(200).json({ success: true });
    } catch (error) {
      console.error("database error:", error);
      res.status(500).json({ success: false, message: "error deleting revenue", error: error.message });
    }
  } else {
    res.status(405).json({ message: "method not allowed" });
  }
}
