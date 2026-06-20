import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const host = process.env.MYSQL_HOST || 'localhost';
const port = Number(process.env.MYSQL_PORT) || 3306;
const user = process.env.MYSQL_USER || 'root';
const password = process.env.MYSQL_PASSWORD || '';
const database = process.env.MYSQL_DATABASE || 'program';

async function init() {
  // 1. 连接 MySQL（不指定数据库），创建 database
  const rootConn = await mysql.createConnection({ host, port, user, password });
  await rootConn.execute(`CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  console.log(`✅ 数据库 "${database}" 已就绪`);
  await rootConn.end();

  // 2. 连接到指定数据库并创建表
  const conn = await mysql.createConnection({ host, port, user, password, database });

  await conn.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id CHAR(36) NOT NULL PRIMARY KEY,
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      display_name VARCHAR(100) NOT NULL,
      student_id VARCHAR(50) NULL,
      real_name VARCHAR(100) NULL,
      role ENUM('student','school','admin') NOT NULL DEFAULT 'student',
      school_approved TINYINT(1) NOT NULL DEFAULT 1,
      created_at DATETIME(3) NOT NULL,
      updated_at DATETIME(3) NOT NULL,
      KEY idx_users_email (email),
      KEY idx_users_role (role)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await conn.execute(`
    CREATE TABLE IF NOT EXISTS platform_admins (
      id CHAR(36) NOT NULL PRIMARY KEY,
      user_id CHAR(36) NOT NULL,
      note VARCHAR(255) NULL,
      created_at DATETIME(3) NOT NULL,
      UNIQUE KEY uk_admins_user (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await conn.execute(`
    CREATE TABLE IF NOT EXISTS activities (
      id CHAR(36) NOT NULL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT NOT NULL,
      location VARCHAR(255) NULL,
      organizer VARCHAR(255) NULL,
      contact VARCHAR(255) NULL,
      category VARCHAR(50) NOT NULL,
      start_at DATETIME(3) NOT NULL,
      end_at DATETIME(3) NULL,
      max_participants INT NULL,
      image_url VARCHAR(500) NULL,
      status ENUM('draft','published','cancelled') NOT NULL DEFAULT 'draft',
      creator_id CHAR(36) NOT NULL,
      created_at DATETIME(3) NOT NULL,
      updated_at DATETIME(3) NOT NULL,
      KEY idx_activities_status_start (status, start_at),
      KEY idx_activities_creator (creator_id),
      KEY idx_activities_category (category)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await conn.execute(`
    CREATE TABLE IF NOT EXISTS comments (
      id CHAR(36) NOT NULL PRIMARY KEY,
      activity_id CHAR(36) NOT NULL,
      user_id CHAR(36) NOT NULL,
      content TEXT NOT NULL,
      status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'approved',
      created_at DATETIME(3) NOT NULL,
      KEY idx_comments_activity (activity_id),
      KEY idx_comments_user (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await conn.execute(`
    CREATE TABLE IF NOT EXISTS favorites (
      id CHAR(36) NOT NULL PRIMARY KEY,
      user_id CHAR(36) NOT NULL,
      activity_id CHAR(36) NOT NULL,
      created_at DATETIME(3) NOT NULL,
      UNIQUE KEY uk_fav_user_activity (user_id, activity_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await conn.execute(`
    CREATE TABLE IF NOT EXISTS activity_registrations (
      id CHAR(36) NOT NULL PRIMARY KEY,
      user_id CHAR(36) NOT NULL,
      activity_id CHAR(36) NOT NULL,
      created_at DATETIME(3) NOT NULL,
      UNIQUE KEY uk_reg_user_activity (user_id, activity_id),
      KEY idx_reg_user_created (user_id, created_at),
      KEY idx_reg_activity (activity_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await conn.execute(`
    CREATE TABLE IF NOT EXISTS email_verification_codes (
      id CHAR(36) NOT NULL PRIMARY KEY,
      email VARCHAR(255) NOT NULL,
      purpose ENUM('register', 'reset_password') NOT NULL,
      code VARCHAR(6) NOT NULL,
      expires_at DATETIME(3) NOT NULL,
      created_at DATETIME(3) NOT NULL,
      KEY idx_email_codes_email_purpose (email, purpose)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await conn.execute(`
    CREATE TABLE IF NOT EXISTS moderation_requests (
      id CHAR(36) NOT NULL PRIMARY KEY,
      type ENUM('create','update','delete') NOT NULL,
      requester_id CHAR(36) NOT NULL,
      activity_id CHAR(36) NULL,
      payload JSON NULL,
      status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
      reviewer_id CHAR(36) NULL,
      reviewed_at DATETIME(3) NULL,
      reject_reason VARCHAR(500) NULL,
      created_at DATETIME(3) NOT NULL,
      KEY idx_mod_status_created (status, created_at),
      KEY idx_mod_requester (requester_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  console.log('✅ 所有数据表创建完成');
  await conn.end();
}

init().catch((err) => {
  console.error('❌ 初始化失败:', err.message);
  process.exit(1);
});
