import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

// Railway provides MYSQLHOST, MYSQLUSER, etc. by default
// Fallback to DB_HOST, DB_USER, etc. for local development
const db = mysql.createPool({
  host: process.env.MYSQLHOST || process.env.DB_HOST || "localhost",
  user: process.env.MYSQLUSER || process.env.DB_USER || "root",
  password: process.env.MYSQLPASSWORD || process.env.DB_PASS || "",
  database: process.env.MYSQLDATABASE || process.env.DB_NAME || "smart_job_tracker",
  port: process.env.MYSQLPORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  ssl: process.env.MYSQLHOST ? { rejectUnauthorized: false } : false // Often required for remote connections
});

export default db;
