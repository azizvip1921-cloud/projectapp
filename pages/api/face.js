import data from "@/lib/data";
import { requireAuth } from "@/lib/requireAuth";

// Euclidean distance between two 128-D descriptors
function euclideanDist(a, b) {
  return Math.sqrt(a.reduce((sum, v, i) => sum + (v - b[i]) ** 2, 0));
}

export default async function handler(req, res) {
  const session = await requireAuth(req, res);
  if (!session) return;

  if (req.method === "GET") {
    // Return all registered employees (names only, no descriptors for security)
    try {
      const [rows] = await data.query(
        "SELECT employee_name, updated_at FROM face_descriptors ORDER BY employee_name"
      );
      res.status(200).json(rows);
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }

  } else if (req.method === "POST") {
    const { action, employee_name, descriptor } = req.body || {};

    // ── Register: store face descriptor for an employee ──
    if (action === "register") {
      if (!employee_name || !descriptor || !Array.isArray(descriptor)) {
        return res.status(400).json({ success: false, message: "employee_name and descriptor are required" });
      }
      try {
        // Verify employee exists in the employee table
        const [empRows] = await data.query(
          "SELECT id FROM employee WHERE employee_name = ? LIMIT 1",
          [employee_name]
        );
        if (empRows.length === 0) {
          return res.status(404).json({
            success: false,
            message: `No employee found with name: ${employee_name}`,
          });
        }

        // Check if this face already belongs to a DIFFERENT employee
        const [allRows] = await data.query(
          "SELECT employee_name, descriptor FROM face_descriptors WHERE employee_name != ?",
          [employee_name]
        );
        for (const row of allRows) {
          const stored = JSON.parse(row.descriptor);
          const dist = euclideanDist(descriptor, stored);
          if (dist < 0.6) {
            return res.status(400).json({
              success: false,
              message: `This face is already registered for: ${row.employee_name}`,
              owner: row.employee_name,
            });
          }
        }

        const [existing] = await data.query(
          "SELECT id FROM face_descriptors WHERE employee_name = ?",
          [employee_name]
        );
        if (existing.length > 0) {
          await data.query(
            "UPDATE face_descriptors SET descriptor = ? WHERE employee_name = ?",
            [JSON.stringify(descriptor), employee_name]
          );
        } else {
          await data.query(
            "INSERT INTO face_descriptors (employee_name, descriptor) VALUES (?, ?)",
            [employee_name, JSON.stringify(descriptor)]
          );
        }
        res.status(200).json({ success: true, message: "Face ID registered" });
      } catch (err) {
        res.status(500).json({ success: false, message: err.message });
      }

    // ── Match: find closest employee for a captured descriptor ──
    } else if (action === "match") {
      if (!descriptor || !Array.isArray(descriptor)) {
        return res.status(400).json({ success: false, message: "descriptor is required" });
      }
      const { today } = req.body;
      try {
        const [rows] = await data.query(
          "SELECT employee_name, descriptor FROM face_descriptors"
        );

        if (!rows.length) {
          return res.status(200).json({ employee_name: null, total_days: 0, today_record: null });
        }

        // Find best matching employee
        let bestName = null;
        let bestDist = Infinity;
        for (const row of rows) {
          const stored = JSON.parse(row.descriptor);
          const dist = euclideanDist(descriptor, stored);
          if (dist < bestDist) {
            bestDist = dist;
            bestName = row.employee_name;
          }
        }

        // Threshold: 0.6 is the standard for face-api.js
        if (bestDist > 0.6) {
          return res.status(200).json({ employee_name: null, total_days: 0, today_record: null });
        }

        // Verify the matched employee still exists in the employee table
        // (handles cases where employee was deleted but face descriptor wasn't cleaned up)
        const [empCheck] = await data.query(
          "SELECT id, status FROM employee WHERE employee_name = ? LIMIT 1",
          [bestName]
        );
        if (empCheck.length === 0) {
          // Employee no longer exists — clean up the orphaned descriptor automatically
          await data.query("DELETE FROM face_descriptors WHERE employee_name = ?", [bestName]);
          return res.status(200).json({ employee_name: null, deleted: true, deleted_name: bestName, total_days: 0, today_record: null });
        }

        const employeeStatus = empCheck[0].status;
        if (employeeStatus === "Inactive" || employeeStatus === "Suspended") {
          return res.status(200).json({ employee_name: null, message: `Employee ${bestName} is inactive`, total_days: 0, today_record: null });
        }

        const [activeContracts] = await data.query(
          "SELECT id FROM contracts WHERE employee_name = ? AND (end_date IS NULL OR DATE(end_date) >= CURDATE()) AND status NOT IN ('Inactive', 'Expired') LIMIT 1",
          [bestName]
        );
        if (activeContracts.length === 0) {
          return res.status(200).json({ employee_name: null, message: `Contract completed for ${bestName}`, deleted_name: bestName, total_days: 0, today_record: null });
        }

        // Total attendance days for this employee
        const [[{ cnt }]] = await data.query(
          "SELECT COUNT(*) AS cnt FROM attendance WHERE employee_name = ?",
          [bestName]
        );

        // Today's attendance record
        const queryDate = today || new Date().toISOString().split("T")[0];
        const [todayRows] = await data.query(
          "SELECT * FROM attendance WHERE employee_name = ? AND DATE(date) = ? LIMIT 1",
          [bestName, queryDate]
        );

        res.status(200).json({
          employee_name: bestName,
          total_days: cnt,
          today_record: todayRows[0] || null,
        });
      } catch (err) {
        res.status(500).json({ success: false, message: err.message });
      }

    } else {
      res.status(400).json({ message: "Unknown action. Use 'register' or 'match'." });
    }

  } else {
    res.status(405).json({ message: "Method not allowed" });
  }
}
