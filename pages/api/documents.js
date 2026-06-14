import data from "@/lib/data";
import fs from "fs";
import path from "path";
import { requireAuth } from "@/lib/requireAuth";

export const config = { api: { bodyParser: { sizeLimit: "25mb" } } };

export default async function handler(req, res) {
  const session = await requireAuth(req, res);
  if (!session) return;

  if (req.method === "GET") {
    try {
      const [rows] = await data.query("SELECT * FROM documents ORDER BY date DESC");
      res.setHeader("Cache-Control", "no-store, must-revalidate");
      res.status(200).json(rows);
    } catch (error) {
      console.error("database error:", error);
      res.status(500).json({ success: false, message: "error fetching documents", error: error.message });
    }
  } else if (req.method === "POST") {
    try {
      const { name, employee, dept, type, size, date, fileData, fileExt } = req.body;
      const [result] = await data.query(
        "INSERT INTO documents (name, employee, dept, type, size, date) VALUES (?, ?, ?, ?, ?, ?)",
        [name, employee, dept || null, type || "PDF", size || null, date]
      );
      if (fileData && fileExt) {
        const uploadsDir = path.join(process.cwd(), "public", "uploads", "docs");
        if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
        const buffer = Buffer.from(fileData, "base64");
        fs.writeFileSync(path.join(uploadsDir, `${result.insertId}.${fileExt}`), buffer);
      }
      res.status(200).json({ success: true, id: result.insertId });
    } catch (error) {
      console.error("database error:", error);
      res.status(500).json({ success: false, message: "error adding document", error: error.message });
    }
  } else if (req.method === "DELETE") {
    try {
      const { id } = req.query;
      await data.query("DELETE FROM documents WHERE id = ?", [id]);
      res.status(200).json({ success: true });
    } catch (error) {
      console.error("database error:", error);
      res.status(500).json({ success: false, message: "error deleting document", error: error.message });
    }
  } else {
    res.status(405).json({ message: "method not allowed" });
  }
}
