require("dotenv").config();
const mysql = require("mysql2");

// Create a connection pool to MySQL
const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "banana_brain_quest",
  port: Number(process.env.DB_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Provide a promise-based wrapper for modern async/await usage
const promisePool = pool.promise();

// Verify connection on startup without crashing the application if DB is offline
pool.getConnection((err, connection) => {
  if (err) {
    console.warn("⚠️ MySQL Database connection warning:", err.message);
  } else {
    console.log(`✅ Connected to MySQL database "${process.env.DB_NAME || "banana_brain_quest"}" on port ${process.env.DB_PORT || 3306}`);
    connection.release();
  }
});

module.exports = promisePool;

