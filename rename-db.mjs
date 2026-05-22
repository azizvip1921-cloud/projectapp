import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';

const conn = await mysql.createConnection({
  host: 'blvehbvuyh2tqryjbaet-mysql.services.clever-cloud.com',
  port: 3306,
  user: 'uarcisrgdnoh41j7',
  password: 'XQoJDyAe9w0A8eGMpUkG',
  database: 'blvehbvuyh2tqryjbaet',
});

// Try to create project-app database
try {
  await conn.query('CREATE DATABASE IF NOT EXISTS `project-app`');
  console.log('✓ Database project-app created');
} catch (e) {
  console.log('✗ Cannot create database:', e.message);
  await conn.end();
  process.exit(1);
}

await conn.query('USE `project-app`');

// Create all tables in project-app
const tables = [
  `CREATE TABLE IF NOT EXISTS \`employee\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`employee_name\` VARCHAR(255) NOT NULL,
    \`number\` VARCHAR(50) DEFAULT NULL,
    \`email\` VARCHAR(255) DEFAULT NULL,
    \`type_of_job\` VARCHAR(100) DEFAULT NULL,
    \`department\` VARCHAR(100) DEFAULT NULL,
    \`gender\` ENUM('Male','Female','Other') DEFAULT NULL,
    \`image\` LONGTEXT DEFAULT NULL,
    \`city\` VARCHAR(100) DEFAULT NULL,
    \`hire_date\` DATE DEFAULT NULL,
    \`date_of_birth\` DATE DEFAULT NULL,
    \`salary\` DECIMAL(15,2) DEFAULT 0,
    \`status\` ENUM('Active','On Leave','Suspended','Inactive') NOT NULL DEFAULT 'Active',
    \`contract_type\` ENUM('Permanent','Temporary','Part-time','Freelance') DEFAULT 'Permanent',
    \`bio\` TEXT DEFAULT NULL,
    \`work_start\` TIME DEFAULT NULL,
    \`work_end\` TIME DEFAULT NULL,
    \`password\` VARCHAR(255) DEFAULT NULL,
    \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS \`contracts\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`employee_name\` VARCHAR(255) NOT NULL,
    \`department\` VARCHAR(100) DEFAULT NULL,
    \`contract_type\` ENUM('Permanent','Temporary','Part-time','Freelance') NOT NULL DEFAULT 'Permanent',
    \`start_date\` DATE NOT NULL,
    \`end_date\` DATE DEFAULT NULL,
    \`salary\` DECIMAL(15,2) NOT NULL DEFAULT 0,
    \`status\` ENUM('Active','Inactive','Expired') NOT NULL DEFAULT 'Active',
    \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS \`expenses\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`employee_name\` VARCHAR(255) NOT NULL,
    \`category\` ENUM('Travel','Equipment','Meals','Training','Other') NOT NULL DEFAULT 'Travel',
    \`amount\` DECIMAL(15,2) NOT NULL DEFAULT 0,
    \`date\` DATE NOT NULL,
    \`description\` TEXT DEFAULT NULL,
    \`status\` ENUM('Pending','Approved','Rejected') NOT NULL DEFAULT 'Pending',
    \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS \`attendance\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`employee_name\` VARCHAR(255) NOT NULL,
    \`date\` DATE NOT NULL,
    \`check_in\` TIME DEFAULT NULL,
    \`check_out\` TIME DEFAULT NULL,
    \`status\` ENUM('Present','Absent','Late','On Leave','Half Day') NOT NULL DEFAULT 'Present',
    \`notes\` TEXT DEFAULT NULL,
    \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS \`payroll\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`employee_name\` VARCHAR(255) NOT NULL,
    \`month\` VARCHAR(50) NOT NULL,
    \`payment_date\` DATE DEFAULT NULL,
    \`base_salary\` DECIMAL(15,2) NOT NULL DEFAULT 0,
    \`bonus\` DECIMAL(15,2) NOT NULL DEFAULT 0,
    \`deductions\` DECIMAL(15,2) NOT NULL DEFAULT 0,
    \`net\` DECIMAL(15,2) NOT NULL DEFAULT 0,
    \`status\` ENUM('Pending','Paid','Failed') NOT NULL DEFAULT 'Pending',
    \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS \`leaves\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`employee_name\` VARCHAR(255) NOT NULL,
    \`leave_type\` ENUM('Annual','Sick','Unpaid','Maternity','Paternity','Emergency','Other') NOT NULL DEFAULT 'Annual',
    \`start_date\` DATE NOT NULL,
    \`end_date\` DATE NOT NULL,
    \`days\` INT NOT NULL DEFAULT 0,
    \`status\` ENUM('Pending','Approved','Rejected') NOT NULL DEFAULT 'Pending',
    \`notes\` TEXT DEFAULT NULL,
    \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS \`safe\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`name\` VARCHAR(255) NOT NULL,
    \`target\` DECIMAL(15,2) NOT NULL DEFAULT 0,
    \`saved\` DECIMAL(15,2) NOT NULL DEFAULT 0,
    \`started\` DATE DEFAULT NULL,
    \`ends\` DATE DEFAULT NULL,
    \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS \`requests\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`employee_name\` VARCHAR(255) NOT NULL,
    \`request_type\` VARCHAR(100) NOT NULL DEFAULT 'Transfer Request',
    \`subject\` VARCHAR(255) NOT NULL,
    \`submitted_date\` DATE DEFAULT NULL,
    \`status\` ENUM('Pending','Approved','Rejected') NOT NULL DEFAULT 'Pending',
    \`notes\` TEXT DEFAULT NULL,
    \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS \`revenue\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`source\` VARCHAR(255) NOT NULL,
    \`category\` ENUM('Sales','Services','Projects','Other') NOT NULL DEFAULT 'Sales',
    \`amount\` DECIMAL(15,2) NOT NULL DEFAULT 0,
    \`date\` DATE NOT NULL,
    \`notes\` TEXT DEFAULT NULL,
    \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS \`documents\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`name\` VARCHAR(255) NOT NULL,
    \`employee\` VARCHAR(255) NOT NULL,
    \`dept\` VARCHAR(100) DEFAULT NULL,
    \`type\` VARCHAR(50) NOT NULL DEFAULT 'PDF',
    \`size\` VARCHAR(50) DEFAULT NULL,
    \`date\` DATE NOT NULL,
    \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS \`face_descriptors\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`employee_name\` VARCHAR(255) NOT NULL UNIQUE,
    \`descriptor\` LONGTEXT NOT NULL,
    \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS \`working_days\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`day_name\` VARCHAR(20) NOT NULL UNIQUE,
    \`is_working\` TINYINT(1) NOT NULL DEFAULT 1
  )`,
  `CREATE TABLE IF NOT EXISTS \`holidays\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`date\` DATE NOT NULL UNIQUE,
    \`name\` VARCHAR(255) NOT NULL,
    \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS \`users\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`name\` VARCHAR(255) NOT NULL,
    \`email\` VARCHAR(255) NOT NULL UNIQUE,
    \`role\` ENUM('Admin','HR Manager','Employee','Viewer') NOT NULL DEFAULT 'Employee',
    \`password\` VARCHAR(255) NOT NULL,
    \`employee_id\` INT DEFAULT NULL,
    \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS \`sessions\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`token\` VARCHAR(64) NOT NULL UNIQUE,
    \`user_id\` INT NOT NULL,
    \`user_source\` VARCHAR(20) NOT NULL DEFAULT 'system',
    \`expires_at\` DATETIME NOT NULL,
    \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
];

for (const q of tables) await conn.query(q);

// Copy existing data from old database
await conn.query('USE blvehbvuyh2tqryjbaet');
const tableNames = ['employee','contracts','expenses','attendance','payroll','leaves','safe','requests','revenue','documents','face_descriptors','working_days','holidays','users','sessions'];

for (const table of tableNames) {
  const [rows] = await conn.query(`SELECT COUNT(*) as cnt FROM \`${table}\``);
  if (rows[0].cnt > 0) {
    await conn.query(`INSERT INTO \`project-app\`.\`${table}\` SELECT * FROM \`blvehbvuyh2tqryjbaet\`.\`${table}\` ON DUPLICATE KEY UPDATE id=id`);
    console.log(`✓ Copied ${rows[0].cnt} rows from ${table}`);
  }
}

// Working days if empty
await conn.query('USE `project-app`');
const [wd] = await conn.query("SELECT COUNT(*) AS cnt FROM working_days");
if (wd[0].cnt === 0) {
  for (const day of ["Saturday","Sunday","Monday","Tuesday","Wednesday","Thursday","Friday"]) {
    await conn.query("INSERT INTO working_days (day_name, is_working) VALUES (?, ?)", [day, day === "Friday" ? 0 : 1]);
  }
}

const hashed = await bcrypt.hash('admin123', 10);
await conn.query("INSERT INTO users (name, email, role, password) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE password=VALUES(password)",
  ['Admin', 'admin@admin.com', 'Admin', hashed]);

console.log('✓ All done — project-app database ready on Clever Cloud');
await conn.end();
