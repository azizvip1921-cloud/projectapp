import data from "@/lib/data";
import { requireAuth } from "@/lib/requireAuth";

export default async function handler(req, res) {
  const session = await requireAuth(req, res);
  if (!session) return;

  if (req.method === "GET") {
    try {
      if (req.query.history === "1") {
        const [rows] = await data.query("SELECT * FROM working_day_history ORDER BY start_date DESC");
        res.setHeader("Cache-Control", "no-store");
        return res.status(200).json(rows);
      }
      const [rows] = await data.query("SELECT * FROM working_days");
      res.setHeader("Cache-Control", "no-store");
      res.status(200).json(rows);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  } else if (req.method === "PUT") {
    try {
      const { day_name, is_working } = req.body;
      const isWorkingVal = is_working ? 1 : 0;

      // تۆماری کونەی کراوە داخستن
      await data.query(
        "UPDATE working_day_history SET end_date = CURDATE() WHERE day_name = ? AND end_date IS NULL",
        [day_name]
      );

      // تۆماری نوێ زیادکردن
      await data.query(
        "INSERT INTO working_day_history (day_name, is_working, start_date, end_date) VALUES (?, ?, CURDATE(), NULL)",
        [day_name, isWorkingVal]
      );

      // working_days جەدوەل نوێکردنەوە
      await data.query(
        "UPDATE working_days SET is_working = ? WHERE day_name = ?",
        [isWorkingVal, day_name]
      );

      res.status(200).json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  } else {
    res.status(405).json({ message: "method not allowed" });
  }
}
