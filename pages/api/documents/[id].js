import data from "@/lib/data";
import fs from "fs";
import path from "path";

export const config = { api: { bodyParser: { sizeLimit: "25mb" } } };

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method === "PUT") {
    try {
      const { name, employee, dept, type, size, date, fileData, fileExt } = req.body;
      await data.query(
        "UPDATE documents SET name=?, employee=?, dept=?, type=?, size=?, date=? WHERE id=?",
        [name, employee, dept || null, type || "PDF", size || null, date, id]
      );
      if (fileData && fileExt) {
        const uploadsDir = path.join(process.cwd(), "public", "uploads", "docs");
        if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
        const allExts = ["pdf", "doc", "docx", "xls", "xlsx", "jpg", "jpeg", "png", "gif", "webp", "bin"];
        for (const ext of allExts) {
          const oldPath = path.join(uploadsDir, `${id}.${ext}`);
          if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }
        const buffer = Buffer.from(fileData, "base64");
        fs.writeFileSync(path.join(uploadsDir, `${id}.${fileExt}`), buffer);
      }
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
