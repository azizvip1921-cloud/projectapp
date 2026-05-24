import data from "@/lib/data";

export default async function handler(req, res) {
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

      // دوێنێ: کارمەندی چالاک بێ ئامادەبوون و بێ مۆڵەت → Absent
      try {
        await data.query(`
          INSERT INTO attendance (employee_name, date, check_in, check_out, status)
          SELECT e.employee_name, DATE_SUB(CURDATE(), INTERVAL 1 DAY), NULL, NULL, 'Absent'
          FROM employee e
          WHERE e.status NOT IN ('Inactive', 'Suspended')
            AND EXISTS (
              SELECT 1 FROM working_days wd
              WHERE wd.day_name = DAYNAME(DATE_SUB(CURDATE(), INTERVAL 1 DAY))
                AND wd.is_working = 1
            )
            AND NOT EXISTS (
              SELECT 1 FROM holidays h
              WHERE h.date = DATE_SUB(CURDATE(), INTERVAL 1 DAY)
            )
            AND NOT EXISTS (
              SELECT 1 FROM attendance a
              WHERE a.employee_name = e.employee_name
                AND DATE(a.date) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)
            )
            AND NOT EXISTS (
              SELECT 1 FROM leaves l
              WHERE l.employee_name = e.employee_name
                AND l.status = 'Approved'
                AND DATE(l.start_date) <= DATE_SUB(CURDATE(), INTERVAL 1 DAY)
                AND DATE(l.end_date)   >= DATE_SUB(CURDATE(), INTERVAL 1 DAY)
            )
        `);
      } catch (e) { console.error("Auto-insert yesterday Absent failed:", e.message); }

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

      // دوێنێ: کارمەندی مۆڵەتی چالاکی هەیە و تۆماری ئامادەبوونی نییە → On Leave
      try {
        await data.query(`
          INSERT INTO attendance (employee_name, date, check_in, check_out, status)
          SELECT e.employee_name, DATE_SUB(CURDATE(), INTERVAL 1 DAY), NULL, NULL, 'On Leave'
          FROM employee e
          WHERE e.status NOT IN ('Inactive', 'Suspended')
            AND EXISTS (
              SELECT 1 FROM working_days wd
              WHERE wd.day_name = DAYNAME(DATE_SUB(CURDATE(), INTERVAL 1 DAY))
                AND wd.is_working = 1
            )
            AND NOT EXISTS (
              SELECT 1 FROM holidays h
              WHERE h.date = DATE_SUB(CURDATE(), INTERVAL 1 DAY)
            )
            AND NOT EXISTS (
              SELECT 1 FROM attendance a
              WHERE a.employee_name = e.employee_name
                AND DATE(a.date) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)
            )
            AND EXISTS (
              SELECT 1 FROM leaves l
              WHERE l.employee_name = e.employee_name
                AND l.status = 'Approved'
                AND DATE(l.start_date) <= DATE_SUB(CURDATE(), INTERVAL 1 DAY)
                AND DATE(l.end_date)   >= DATE_SUB(CURDATE(), INTERVAL 1 DAY)
            )
        `);
      } catch (e) { console.error("Auto-insert yesterday On Leave failed:", e.message); }

      // ئەمڕۆ: دوای کاتی 18:00 — کارمەندی مۆڵەتی چالاکی هەیە و تۆماری ئامادەبوونی نییە → On Leave
      try {
        await data.query(`
          INSERT INTO attendance (employee_name, date, check_in, check_out, status)
          SELECT e.employee_name, CURDATE(), NULL, NULL, 'On Leave'
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
            AND EXISTS (
              SELECT 1 FROM leaves l
              WHERE l.employee_name = e.employee_name
                AND l.status = 'Approved'
                AND DATE(l.start_date) <= CURDATE()
                AND DATE(l.end_date)   >= CURDATE()
            )
        `);
      } catch (e) { console.error("Auto-insert today On Leave failed:", e.message); }

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
