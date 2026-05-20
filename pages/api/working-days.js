import data from "@/lib/data";

const DAY_ORDER = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

async function ensureTable() {
  await data.query(`
    CREATE TABLE IF NOT EXISTS \`working_days\` (
      \`id\`         INT AUTO_INCREMENT PRIMARY KEY,
      \`day_name\`   VARCHAR(20) NOT NULL UNIQUE,
      \`is_working\` TINYINT(1) NOT NULL DEFAULT 1
    )
  `);
  const [rows] = await data.query("SELECT COUNT(*) AS cnt FROM working_days");
  if (rows[0].cnt === 0) {
    for (const day of DAY_ORDER) {
      await data.query(
        "INSERT INTO working_days (day_name, is_working) VALUES (?, ?)",
        [day, day === "Friday" ? 0 : 1]
      );
    }
  }
}

export default async function handler(req, res) {
  if (req.method === "GET") {
    try {
      await ensureTable();
      const [rows] = await data.query("SELECT * FROM working_days");
      res.status(200).json(rows);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  } else if (req.method === "PUT") {
    try {
      await ensureTable();
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
