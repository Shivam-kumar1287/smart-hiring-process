import mysql from "mysql2";
import dotenv from "dotenv";
dotenv.config();

// Use Railway environment variables with fallbacks
const connection = mysql.createConnection({
  host: process.env.MYSQLHOST || process.env.DB_HOST || "localhost",
  user: process.env.MYSQLUSER || process.env.DB_USER || "root",
  password: process.env.MYSQLPASSWORD || process.env.DB_PASS || "",
  database: process.env.MYSQLDATABASE || process.env.DB_NAME || "smart_job_tracker",
  port: process.env.MYSQLPORT || 3306,
  ssl: process.env.MYSQLHOST ? { rejectUnauthorized: false } : false
});

export default connection.promise();
