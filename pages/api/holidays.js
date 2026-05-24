import data from "@/lib/data";

export default async function handler(req, res) {
  if (req.method === "GET") {
    try {
      const [rows] = await data.query("SELECT * FROM holidays ORDER BY date ASC");
      res.status(200).json(rows);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  } else if (req.method === "POST") {
    try {
      const { date, name } = req.body;
      if (!date || !name) {
        return res.status(400).json({ success: false, message: "date and name are required" });
      }
      await data.query("INSERT INTO holidays (date, name) VALUES (?, ?)", [date, name]);
      const [rows] = await data.query("SELECT * FROM holidays WHERE date = ?", [date]);
      res.status(200).json({ success: true, holiday: rows[0] });
    } catch (error) {
      if (error.code === "ER_DUP_ENTRY") {
        return res.status(409).json({ success: false, duplicate: true, message: "Holiday already exists for this date" });
      }
      res.status(500).json({ success: false, message: error.message });
    }
  } else if (req.method === "DELETE") {
    try {
      const { id } = req.query;
      await data.query("DELETE FROM holidays WHERE id = ?", [id]);
      res.status(200).json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  } else {
    res.status(405).json({ message: "method not allowed" });
  }
}
