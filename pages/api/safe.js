import data from "@/lib/data";
import { requireAuth } from "@/lib/requireAuth";

export default async function handler(req, res) {
  const session = await requireAuth(req, res);
  if (!session) return;

  if (req.method === "GET") {
    try {
      const [rows] = await data.query("SELECT * FROM safe ORDER BY created_at DESC");
      res.setHeader("Cache-Control", "no-store, must-revalidate");
      res.status(200).json(rows);
    } catch (error) {
      console.error("database error:", error);
      res.status(500).json({ success: false, message: "error fetching safe", error: error.message });
    }
  } else if (req.method === "POST") {
    try {
      const { name, target, started } = req.body;
      const [result] = await data.query(
        "INSERT INTO safe (name, target, started) VALUES (?, ?, ?)",
        [name, Number(target), started || null]
      );
      res.status(200).json({ success: true, id: result.insertId });
    } catch (error) {
      console.error("database error:", error);
      res.status(500).json({ success: false, message: "error adding safe goal", error: error.message });
    }
  } else {
    res.status(405).json({ message: "method not allowed" });
  }
}
