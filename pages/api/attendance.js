import data from "@/lib/data";
import { requireAuth } from "@/lib/requireAuth";

export default async function handler(req, res) {
  const session = await requireAuth(req, res);
  if (!session) return;

  if (req.method === "GET") {
    try {

      // کارمەندی مۆڵەتی چالاکی هەیە → On Leave
      try {
        await data.query(`
          UPDATE employee e
          JOIN leaves l ON l.employee_name = e.employee_name
          SET e.status = 'On Leave'
          WHERE l.status = 'Approved'
            AND l.start_date <= CURDATE()
            AND l.end_date   >= CURDATE()
            AND e.status NOT IN ('On Leave', 'Inactive', 'Suspended')
        `);
      } catch (e) { console.error("Auto-update On Leave failed:", e.message); }

      // مۆڵەتی تەواو بوو + گرێبەستی چالاک هەیە → Active
      try {
        await data.query(`
          UPDATE employee e
          SET e.status = 'Active'
          WHERE e.status = 'On Leave'
            AND NOT EXISTS (
              SELECT 1 FROM leaves l
              WHERE l.employee_name = e.employee_name
                AND l.status = 'Approved'
                AND l.start_date <= CURDATE()
                AND l.end_date   >= CURDATE()
            )
            AND EXISTS (
              SELECT 1 FROM contracts c
              WHERE c.employee_name = e.employee_name
                AND (c.end_date IS NULL OR c.end_date >= CURDATE())
            )
        `);
      } catch (e) { console.error("Auto-update Active failed:", e.message); }

      // مۆڵەتی تەواو بوو + هیچ گرێبەستی چالاکی نەماوە → Inactive
      try {
        await data.query(`
          UPDATE employee e
          SET e.status = 'Inactive'
          WHERE e.status = 'On Leave'
            AND NOT EXISTS (
              SELECT 1 FROM leaves l
              WHERE l.employee_name = e.employee_name
                AND l.status = 'Approved'
                AND l.start_date <= CURDATE()
                AND l.end_date   >= CURDATE()
            )
            AND NOT EXISTS (
              SELECT 1 FROM contracts c
              WHERE c.employee_name = e.employee_name
                AND (c.end_date IS NULL OR c.end_date >= CURDATE())
            )
        `);
      } catch (e) { console.error("Auto-update Inactive failed:", e.message); }

      // ٣٠ ڕۆژی ڕابردوو: هەر ڕۆژێک بەسەربەخۆیی check دەکرێت — ئەگەر working-day بوو و تۆمارێکی نەبوو → Absent
      try {
        await data.query(`
          INSERT INTO attendance (employee_name, date, check_in, check_out, status)
          SELECT e.employee_name, d.d, NULL, NULL, 'Absent'
          FROM (
            SELECT CURDATE() - INTERVAL n DAY AS d
            FROM (
              SELECT 1  AS n UNION ALL SELECT 2  UNION ALL SELECT 3  UNION ALL SELECT 4
              UNION ALL SELECT 5  UNION ALL SELECT 6  UNION ALL SELECT 7  UNION ALL SELECT 8
              UNION ALL SELECT 9  UNION ALL SELECT 10 UNION ALL SELECT 11 UNION ALL SELECT 12
              UNION ALL SELECT 13 UNION ALL SELECT 14 UNION ALL SELECT 15 UNION ALL SELECT 16
              UNION ALL SELECT 17 UNION ALL SELECT 18 UNION ALL SELECT 19 UNION ALL SELECT 20
              UNION ALL SELECT 21 UNION ALL SELECT 22 UNION ALL SELECT 23 UNION ALL SELECT 24
              UNION ALL SELECT 25 UNION ALL SELECT 26 UNION ALL SELECT 27 UNION ALL SELECT 28
              UNION ALL SELECT 29 UNION ALL SELECT 30
            ) n_tbl
          ) d
          CROSS JOIN employee e
          WHERE e.status NOT IN ('Inactive', 'Suspended')
            AND (
              EXISTS (
                SELECT 1 FROM working_day_history wdh
                WHERE wdh.day_name = DAYNAME(d.d)
                  AND wdh.is_working = 1
                  AND wdh.start_date <= d.d
                  AND (wdh.end_date IS NULL OR wdh.end_date > d.d)
              )
              OR (
                NOT EXISTS (
                  SELECT 1 FROM working_day_history wdh2
                  WHERE wdh2.day_name = DAYNAME(d.d)
                    AND wdh2.start_date <= d.d
                    AND (wdh2.end_date IS NULL OR wdh2.end_date > d.d)
                )
                AND EXISTS (
                  SELECT 1 FROM working_days wd
                  WHERE wd.day_name = DAYNAME(d.d)
                    AND wd.is_working = 1
                )
              )
            )
            AND NOT EXISTS (
              SELECT 1 FROM holidays h
              WHERE h.date = d.d
            )
            AND NOT EXISTS (
              SELECT 1 FROM attendance a
              WHERE a.employee_name = e.employee_name
                AND DATE(a.date) = d.d
            )
            AND NOT EXISTS (
              SELECT 1 FROM leaves l
              WHERE l.employee_name = e.employee_name
                AND l.status = 'Approved'
                AND DATE(l.start_date) <= d.d
                AND DATE(l.end_date)   >= d.d
            )
        `);
      } catch (e) { console.error("Auto-insert past Absent failed:", e.message); }

      // ئەمڕۆ: دوای کاتی 18:00 — کارمەندی چالاک بێ ئامادەبوون و بێ مۆڵەت → Absent
      try {
        await data.query(`
          INSERT INTO attendance (employee_name, date, check_in, check_out, status)
          SELECT e.employee_name, CURDATE(), NULL, NULL, 'Absent'
          FROM employee e
          WHERE e.status NOT IN ('Inactive', 'Suspended')
            AND TIME(NOW()) > '18:00:00'
            AND EXISTS (
              SELECT 1 FROM working_days wd
              WHERE wd.day_name = DAYNAME(CURDATE())
                AND wd.is_working = 1
            )
            AND NOT EXISTS (
              SELECT 1 FROM holidays h
              WHERE h.date = CURDATE()
            )
            AND NOT EXISTS (
              SELECT 1 FROM attendance a
              WHERE a.employee_name = e.employee_name
                AND DATE(a.date) = CURDATE()
            )
            AND NOT EXISTS (
              SELECT 1 FROM leaves l
              WHERE l.employee_name = e.employee_name
                AND l.status = 'Approved'
                AND DATE(l.start_date) <= CURDATE()
                AND DATE(l.end_date)   >= CURDATE()
            )
        `);
      } catch (e) { console.error("Auto-insert today Absent failed:", e.message); }

      // هەموو رۆژەکانی مۆڵەت → On Leave (رۆژی تێپەڕ بێ مەرج، ئەمڕۆ دوای 18:00)
      try {
        await data.query(`
          INSERT INTO attendance (employee_name, date, check_in, check_out, status)
          SELECT DISTINCT l.employee_name, d.d, NULL, NULL, 'On Leave'
          FROM (
            SELECT CURDATE() - INTERVAL n DAY AS d
            FROM (
              SELECT 0 AS n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3
              UNION ALL SELECT 4  UNION ALL SELECT 5  UNION ALL SELECT 6  UNION ALL SELECT 7
              UNION ALL SELECT 8  UNION ALL SELECT 9  UNION ALL SELECT 10 UNION ALL SELECT 11
              UNION ALL SELECT 12 UNION ALL SELECT 13 UNION ALL SELECT 14 UNION ALL SELECT 15
              UNION ALL SELECT 16 UNION ALL SELECT 17 UNION ALL SELECT 18 UNION ALL SELECT 19
              UNION ALL SELECT 20 UNION ALL SELECT 21 UNION ALL SELECT 22 UNION ALL SELECT 23
              UNION ALL SELECT 24 UNION ALL SELECT 25 UNION ALL SELECT 26 UNION ALL SELECT 27
              UNION ALL SELECT 28 UNION ALL SELECT 29 UNION ALL SELECT 30 UNION ALL SELECT 31
              UNION ALL SELECT 32 UNION ALL SELECT 33 UNION ALL SELECT 34 UNION ALL SELECT 35
              UNION ALL SELECT 36 UNION ALL SELECT 37 UNION ALL SELECT 38 UNION ALL SELECT 39
              UNION ALL SELECT 40 UNION ALL SELECT 41 UNION ALL SELECT 42 UNION ALL SELECT 43
              UNION ALL SELECT 44 UNION ALL SELECT 45 UNION ALL SELECT 46 UNION ALL SELECT 47
              UNION ALL SELECT 48 UNION ALL SELECT 49 UNION ALL SELECT 50 UNION ALL SELECT 51
              UNION ALL SELECT 52 UNION ALL SELECT 53 UNION ALL SELECT 54 UNION ALL SELECT 55
              UNION ALL SELECT 56 UNION ALL SELECT 57 UNION ALL SELECT 58 UNION ALL SELECT 59
            ) n_tbl
          ) d
          JOIN leaves l
            ON d.d >= DATE(l.start_date)
           AND d.d <= DATE(l.end_date)
          WHERE l.status = 'Approved'
            AND d.d <= CURDATE()
            AND (d.d < CURDATE() OR TIME(NOW()) > '18:00:00')
            AND EXISTS (
              SELECT 1 FROM employee e
              WHERE e.employee_name = l.employee_name
                AND e.status NOT IN ('Inactive', 'Suspended')
            )
            AND (
              EXISTS (
                SELECT 1 FROM working_day_history wdh
                WHERE wdh.day_name = DAYNAME(d.d)
                  AND wdh.is_working = 1
                  AND wdh.start_date <= d.d
                  AND (wdh.end_date IS NULL OR wdh.end_date > d.d)
              )
              OR (
                NOT EXISTS (
                  SELECT 1 FROM working_day_history wdh2
                  WHERE wdh2.day_name = DAYNAME(d.d)
                    AND wdh2.start_date <= d.d
                    AND (wdh2.end_date IS NULL OR wdh2.end_date > d.d)
                )
                AND EXISTS (
                  SELECT 1 FROM working_days wd
                  WHERE wd.day_name = DAYNAME(d.d) AND wd.is_working = 1
                )
              )
            )
            AND NOT EXISTS (
              SELECT 1 FROM holidays h WHERE h.date = d.d
            )
            AND NOT EXISTS (
              SELECT 1 FROM attendance a
              WHERE a.employee_name = l.employee_name AND DATE(a.date) = d.d
            )
        `);
      } catch (e) { console.error("Auto-insert On Leave failed:", e.message); }

      const [rows] = await data.query("SELECT * FROM attendance ORDER BY date DESC");
      res.setHeader("Cache-Control", "no-store, must-revalidate");
      res.status(200).json(rows);
    } catch (error) {
      console.error("database error:", error);
      res.status(500).json({ success: false, message: "error fetching attendance", error: error.message });
    }
  } else if (req.method === "POST") {
    try {
      const { employee_name, date, check_in, check_out, status } = req.body;

      const checkDate = date || new Date().toISOString().split("T")[0];

      // چێک بکە ئەو رۆژە رۆژی کارە یان نا
      const DAY_NAMES = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
      const [_y, _m, _d] = checkDate.split("-").map(Number);
      const dayName = DAY_NAMES[new Date(_y, _m - 1, _d).getDay()];
      try {
        const [[wdRow]] = await data.query(
          "SELECT is_working FROM working_days WHERE day_name = ? LIMIT 1",
          [dayName]
        );
        if (wdRow && !wdRow.is_working) {
          return res.status(409).json({
            success: false,
            day_off: true,
            message: `${dayName} is set as a day off`,
          });
        }
      } catch (e) { console.error("working_days check failed:", e.message); }

      // چێک بکە ئەو رۆژە جەژنە یان نا
      try {
        const [holidayRows] = await data.query(
          "SELECT * FROM holidays WHERE date = ? LIMIT 1",
          [checkDate]
        );
        if (holidayRows.length > 0) {
          return res.status(409).json({
            success: false,
            holiday: true,
            message: `${holidayRows[0].name} is a public holiday`,
            holiday_name: holidayRows[0].name,
          });
        }
      } catch (e) { console.error("holidays check failed:", e.message); }

      // چێک بکە کارمەند مۆڵەتی چالاکی هەیە یان نا بۆ ئەو رۆژە
      const [leaveRows] = await data.query(
        `SELECT * FROM leaves
         WHERE employee_name = ? AND status = 'Approved'
           AND DATE(start_date) <= ? AND DATE(end_date) >= ?
         LIMIT 1`,
        [employee_name, checkDate, checkDate]
      );
      if (leaveRows.length > 0) {
        return res.status(409).json({
          success: false,
          on_leave: true,
          message: "Employee is on approved leave",
          leave: leaveRows[0],
        });
      }

      // چێک بکە تۆماری ئامادەبوونی ئەمڕۆ بۆ ئەم کارمەندە بوونی نەبێت
      const [dupRows] = await data.query(
        "SELECT id FROM attendance WHERE employee_name = ? AND DATE(date) = ? LIMIT 1",
        [employee_name, checkDate]
      );
      if (dupRows.length > 0) {
        return res.status(409).json({
          success: false,
          duplicate: true,
          message: "Attendance already recorded for this employee today",
        });
      }

      await data.query(
        "INSERT INTO attendance (employee_name, date, check_in, check_out, status) VALUES (?, ?, ?, ?, ?)",
        [employee_name, checkDate, check_in || null, check_out || null, status]
      );
      res.status(200).json({ success: true, message: "attendance added successfully" });
    } catch (error) {
      console.error("database error:", error);
      res.status(500).json({ success: false, message: "error adding attendance", error: error.message });
    }
  } else {
    res.status(405).json({ message: "method not allowed" });
  }
}
