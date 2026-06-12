import mysql from 'mysql2/promise';

const isCloud = !!(process.env.MYSQL_ADDON_HOST || process.env.MYSQL_SSL);

const data = mysql.createPool({
  host: process.env.MYSQL_ADDON_HOST || process.env.MYSQL_HOST || 'localhost',
  port: parseInt(process.env.MYSQL_ADDON_PORT || process.env.MYSQL_PORT || '3306'),
  user: process.env.MYSQL_ADDON_USER || process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_ADDON_PASSWORD || process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_ADDON_DB || process.env.MYSQL_DATABASE || 'project-app',
  connectionLimit: 4,
  waitForConnections: true,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  ssl: isCloud ? { rejectUnauthorized: false } : undefined,
  dateStrings: ['DATE'],
});

export default data;
 

/*"In XAMPP, in phpMyAdmin under the root server the name is project-app  —
 but to deploy it to the Aiven cloud server, XAMPP was used to create the tables
  so that the data gets saved there. In a database named defaultdb, 
create it so that it connects with XAMPP and Aiven Cloud."*/