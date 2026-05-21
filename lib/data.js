import mysql from 'mysql2/promise';

const data = mysql.createPool({
  host: process.env.MYSQL_ADDON_HOST || process.env.MYSQL_HOST || 'localhost',
  port: parseInt(process.env.MYSQL_ADDON_PORT || process.env.MYSQL_PORT || '3306'),
  user: process.env.MYSQL_ADDON_USER || process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_ADDON_PASSWORD || process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_ADDON_DB || process.env.MYSQL_DATABASE || 'project-app',
  connectionLimit: 4,
  waitForConnections: true,
  queueLimit: 0,
});

export default data;

 



