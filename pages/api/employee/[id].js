import data from "@/lib/data";

export default async function handler(req, res) {
    const { id } = req.query;

    if (req.method === 'GET') {
        try {
            const [rows] = await data.query('SELECT * FROM employee WHERE id=?', [id]);

            res.setHeader('Cache-Control', 'no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
            
            if (rows && rows.length > 0) {
                res.status(200).json(rows[0]);
            } else {
                res.status(404).json({
                    success: false,
                    message: 'Employee not found'
                });
            }
        } catch (error) {
            console.error('database error:', error);
            res.status(500).json({
                success: false,
                message: 'error fetching employee',
                error: error.message
            });
        }
    }
    // PUT for UPDATE
    else if (req.method === 'PUT') {
        try {
            const { employee_name, number, email, type_of_job, department, salary, status, contract_type, gender, image, city, hire_date, bio, date_of_birth, work_start, work_end } = req.body;

            console.log('Received update data:', { employee_name, number, email, type_of_job, department, salary, status, contract_type, gender, image: image ? 'has image' : 'no image', city, hire_date, bio });

            await data.query(
                `UPDATE employee
                SET employee_name = ?,
                    number = ?,
                    email = ?,
                    type_of_job = ?,
                    department = ?,
                    salary = ?,
                    status = ?,
                    contract_type = ?,
                    gender = ?,
                    image = ?,
                    city = ?,
                    hire_date = ?,
                    bio = ?,
                    date_of_birth = ?,
                    work_start = ?,
                    work_end = ?
                WHERE id = ?`,
                [
                    employee_name,
                    number,
                    email,
                    type_of_job,
                    department || null,
                    Number(salary || 0),
                    status || "Active",
                    contract_type || null,
                    gender,
                    image || null,
                    city || null,
                    hire_date || null,
                    bio || null,
                    date_of_birth || null,
                    work_start || null,
                    work_end || null,
                    id
                ]
            );
            
            res.status(200).json({
                success: true,
                message: 'employee updated successfully'
            });
        } catch (error) {
            console.error('database error:', error);
            res.status(500).json({
                success: false,
                message: 'error updating employee',
                error: error.message
            });
        }
    }
    else if (req.method === 'PATCH') {
        try {
            const { status } = req.body;
            await data.query('UPDATE employee SET status = ? WHERE id = ?', [status, id]);
            res.status(200).json({ success: true });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }
    else if (req.method === 'DELETE') {
        try {
            // Get employee_name before deleting so we can remove their face descriptor
            const [rows] = await data.query('SELECT employee_name FROM employee WHERE id = ?', [id]);
            if (rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Employee not found' });
            }
            const { employee_name } = rows[0];

            await data.query('DELETE FROM employee WHERE id = ?', [id]);

            // Also delete their face descriptor if one exists
            await data.query('DELETE FROM face_descriptors WHERE employee_name = ?', [employee_name]);

            res.status(200).json({
                success: true,
                message: 'successful deleting employee'
            });
        } catch (error) {
            console.error('database error:', error);
            res.status(500).json({
                success: false,
                message: 'unsuccessful deleting employee',
                error: error.message
            });
        }
    } else {
        res.status(405).json({ message: 'method not allowed' });
    }
}
