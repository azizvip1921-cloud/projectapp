import data from "@/lib/data";

export default async function handler(req, res) {
  if (req.method === "GET") {
    try {
      const [rows] = await data.query("SELECT * FROM working_days");
      res.status(200).json(rows);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  } else if (req.method === "PUT") {
    try {
      const { day_name, is_working } = req.body;
      await data.query(
        "UPDATE working_days SET is_working = ? WHERE day_name = ?",
        [is_working ? 1 : 0, day_name]
      );
      res.status(200).json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  } else {
    res.status(405).json({ message: "method not allowed" });
  }
}
