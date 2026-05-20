import data from "@/lib/data";

export default async function handler(req, res) {
  if (req.method === "GET") {
    try {
      // گرێبەستی تەواو بووە و هیچ گرێبەستی چالاکی نەماوە → Inactive
      await data.query(`
        UPDATE employee e
        SET e.status = 'Inactive'
        WHERE e.status NOT IN ('Inactive', 'Suspended')
          AND EXISTS (
            SELECT 1 FROM contracts c
            WHERE c.employee_name = e.employee_name
              AND c.end_date IS NOT NULL
              AND c.end_date < CURDATE()
          )
          AND NOT EXISTS (
            SELECT 1 FROM contracts c
            WHERE c.employee_name = e.employee_name
              AND (c.end_date IS NULL OR c.end_date >= CURDATE())
          )
      `);

      // کارمەندی مۆڵەتی چالاکی هەیە → On Leave
      await data.query(`
        UPDATE employee e
        JOIN leaves l ON l.employee_name = e.employee_name
        SET e.status = 'On Leave'
        WHERE l.status = 'Approved'
          AND l.start_date <= CURDATE()
          AND l.end_date   >= CURDATE()
          AND e.status NOT IN ('On Leave', 'Inactive', 'Suspended')
      `);

      // مۆڵەتی تەواو بوو + گرێبەستی چالاک هەیە → Active
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

      // مۆڵەتی تەواو بوو + هیچ گرێبەستی چالاکی نەماوە → Inactive
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

      const [rows] = await data.query("SELECT * FROM employee ORDER BY created_at ASC");
      res.setHeader("Cache-Control", "no-store, must-revalidate");
      res.status(200).json(rows);
    } catch (error) {
      console.error("database error:", error);
      res.status(500).json({ success: false, message: "error fetching employees", error: error.message });
    }
  } else if (req.method === "POST") {
    try {
      const { employee_name, number, email, type_of_job, department, salary, status, contract_type, gender, image, city, hire_date, bio, date_of_birth, work_start, work_end } = req.body;
      const [result] = await data.query(
        "INSERT INTO employee (employee_name, number, email, type_of_job, department, salary, status, contract_type, gender, image, city, hire_date, bio, date_of_birth, work_start, work_end) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [employee_name, number || null, email || null, type_of_job || null, department || null, Number(salary || 0), status || "Active", contract_type || "Permanent", gender || null, image || null, city || null, hire_date || null, bio || null, date_of_birth || null, work_start || null, work_end || null]
      );
      res.status(201).json({ success: true, id: result.insertId });
    } catch (error) {
      console.error("database error:", error);
      res.status(500).json({ success: false, message: "error adding employee", error: error.message });
    }
  } else {
    res.status(405).json({ message: "method not allowed" });
  }
}
