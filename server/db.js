import mysql from "mysql2/promise";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, ".env") });

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || "127.0.0.1",
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER || "root",
  password: process.env.MYSQL_PASSWORD || "",
  database: process.env.MYSQL_DATABASE || "program",
  waitForConnections: true,
  connectionLimit: 10,
  dateStrings: false,
});

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) NOT NULL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  role ENUM('student', 'school') NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS activities (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  publisher_role ENUM('student', 'school') NOT NULL,
  title VARCHAR(120) NOT NULL,
  description TEXT NOT NULL,
  location VARCHAR(500) NOT NULL DEFAULT '',
  organizer VARCHAR(200) NOT NULL DEFAULT '',
  contact VARCHAR(200) NOT NULL DEFAULT '',
  category VARCHAR(50) NOT NULL DEFAULT '其他',
  start_at DATETIME(3) NOT NULL,
  end_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  KEY idx_activities_user (user_id),
  KEY idx_activities_start (start_at),
  KEY idx_activities_publisher (publisher_role),
  CONSTRAINT fk_activities_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS platform_admins (
  user_id CHAR(36) NOT NULL PRIMARY KEY,
  note VARCHAR(200) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_platform_admins_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`;

async function columnExists(conn, table, column) {
  const [rows] = await conn.query(
    `SELECT COUNT(*) AS c FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column]
  );
  return Number(rows[0].c) > 0;
}

/** 兼容旧库：activities 无 publisher_role 时补充并按发布者账号角色回填 */
async function ensurePublisherRoleColumn(conn) {
  const exists = await columnExists(conn, "activities", "publisher_role");
  if (!exists) {
    await conn.query(
      `ALTER TABLE activities ADD COLUMN publisher_role ENUM('student','school') NOT NULL DEFAULT 'student' AFTER user_id`
    );
    await conn.query(
      `UPDATE activities a INNER JOIN users u ON u.id = a.user_id SET a.publisher_role = u.role`
    );
    await conn.query(
      `ALTER TABLE activities ADD KEY idx_activities_publisher (publisher_role)`
    );
  }
}

export async function ensureSchema() {
  const statements = SCHEMA.split(";")
    .map((s) => s.trim())
    .filter(Boolean);
  const conn = await pool.getConnection();
  try {
    for (const sql of statements) {
      await conn.query(sql);
    }
    await ensurePublisherRoleColumn(conn);
  } finally {
    conn.release();
  }
}

export function mapActivityRow(row) {
  const iso = (d) => (d instanceof Date ? d.toISOString() : new Date(d).toISOString());
  const publisherRole = row.publisher_role || row.author_role;
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    location: row.location || "",
    organizer: row.organizer || "",
    contact: row.contact || "",
    category: row.category,
    startAt: iso(row.start_at),
    endAt: row.end_at ? iso(row.end_at) : null,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
    publisherRole,
    author: {
      id: row.user_id,
      displayName: row.author_display_name,
      role: row.author_role,
    },
  };
}

export { pool };
