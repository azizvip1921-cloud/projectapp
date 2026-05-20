import data from "@/lib/data";

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method === "PUT") {
    try {
      const { name, target, started } = req.body;
      await data.query(
        "UPDATE safe SET name=?, target=?, started=? WHERE id=?",
        [name, Number(target), started || null, id]
      );
      res.status(200).json({ success: true });
    } catch (error) {
      console.error("database error:", error);
      res.status(500).json({ success: false, message: "error updating safe goal", error: error.message });
    }
  } else if (req.method === "DELETE") {
    try {
      await data.query("DELETE FROM safe WHERE id=?", [id]);
      res.status(200).json({ success: true });
    } catch (error) {
      console.error("database error:", error);
      res.status(500).json({ success: false, message: "error deleting safe goal", error: error.message });
    }
  } else {
    res.status(405).json({ message: "method not allowed" });
  }
}
