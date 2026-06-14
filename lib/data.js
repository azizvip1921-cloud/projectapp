import mysql from 'mysql2/promise';
import fs from 'fs';

const isCloud = !!(process.env.MYSQL_ADDON_HOST || process.env.MYSQL_SSL);

const data = mysql.createPool({
  host: process.env.MYSQL_ADDON_HOST || process.env.MYSQL_HOST || 'localhost',
  port: parseInt(process.env.MYSQL_ADDON_PORT || process.env.MYSQL_PORT || '3306'),
  user: process.env.MYSQL_ADDON_USER || process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_ADDON_PASSWORD || process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_ADDON_DB || process.env.MYSQL_DATABASE || 'project-app',
  connectionLimit: 10,
  waitForConnections: true,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  ssl: isCloud ? {
    rejectUnauthorized: fs.existsSync('./aiven-ca.pem'),
    ...(fs.existsSync('./aiven-ca.pem') && { ca: fs.readFileSync('./aiven-ca.pem') }),
  } : undefined,
  dateStrings: ['DATE'],
});

// Run schema migrations once at startup
Promise.all([
  data.query("ALTER TABLE employee ADD COLUMN IF NOT EXISTS password VARCHAR(255) DEFAULT NULL"),
  data.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS employee_id INT DEFAULT NULL"),
]).catch(() => {});

export default data;
 

/*"In XAMPP, in phpMyAdmin under the root server the name is project-app  —
 but to deploy it to the Aiven cloud server, XAMPP was used to create the tables
  so that the data gets saved there. In a database named defaultdb, 
create it so that it connects with XAMPP and Aiven Cloud."*/