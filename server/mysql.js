import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const mysqlPort = Number(process.env.MYSQL_PORT);
const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'localhost',
  port: Number.isFinite(mysqlPort) && mysqlPort > 0 ? mysqlPort : 3306,
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'program',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// 测试数据库连接
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ MySQL数据库连接成功');
    connection.release();
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('❌ MySQL数据库连接失败:', msg);
    if (/Unknown database/i.test(msg)) {
      console.error('   提示: 先在 server 目录执行 npm run setup 创建库表，或手动 CREATE DATABASE。');
    }
    return false;
  }
}

// 执行查询的辅助函数
async function query(sql, params = []) {
  try {
    const [rows] = await pool.execute(sql, params);
    return rows;
  } catch (error) {
    console.error('数据库查询错误:', error);
    throw error;
  }
}

// 初始化数据库表结构
async function initDatabase() {
  try {
    // 创建用户表
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id CHAR(36) NOT NULL PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        display_name VARCHAR(100) NOT NULL,
        role ENUM('student', 'school') NOT NULL,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // 创建活动表
    await query(`
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // 创建评论表
    await query(`
      CREATE TABLE IF NOT EXISTS comments (
        id CHAR(36) NOT NULL PRIMARY KEY,
        activity_id CHAR(36) NOT NULL,
        user_id CHAR(36) NOT NULL,
        content TEXT NOT NULL,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        KEY idx_comments_activity (activity_id),
        KEY idx_comments_user (user_id),
        CONSTRAINT fk_comments_activity FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE,
        CONSTRAINT fk_comments_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // 创建平台管理员表
    await query(`
      CREATE TABLE IF NOT EXISTS platform_admins (
        user_id CHAR(36) NOT NULL PRIMARY KEY,
        note VARCHAR(200) NULL,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        CONSTRAINT fk_platform_admins_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS activity_favorites (
        id CHAR(36) NOT NULL PRIMARY KEY,
        user_id CHAR(36) NOT NULL,
        activity_id CHAR(36) NOT NULL,
        created_at DATETIME(3) NOT NULL,
        UNIQUE KEY uk_fav_user_activity (user_id, activity_id),
        KEY idx_fav_user_created (user_id, created_at),
        KEY idx_fav_activity (activity_id),
        CONSTRAINT fk_fav_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_fav_activity FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS activity_registrations (
        id CHAR(36) NOT NULL PRIMARY KEY,
        user_id CHAR(36) NOT NULL,
        activity_id CHAR(36) NOT NULL,
        created_at DATETIME(3) NOT NULL,
        UNIQUE KEY uk_reg_user_activity (user_id, activity_id),
        KEY idx_reg_user_created (user_id, created_at),
        KEY idx_reg_activity (activity_id),
        CONSTRAINT fk_reg_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_reg_activity FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await query(`
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

    await query(`
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
        KEY idx_mod_requester (requester_id),
        CONSTRAINT fk_mod_requester FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_mod_reviewer FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    try {
      await query(`
        ALTER TABLE comments
        ADD COLUMN status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'approved'
        AFTER content
      `);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!/Duplicate column/i.test(msg)) throw e;
    }

    try {
      await query(`
        ALTER TABLE users
        ADD COLUMN school_approved TINYINT(1) NOT NULL DEFAULT 1
        AFTER role
      `);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!/Duplicate column/i.test(msg)) throw e;
    }

    try {
      await query(`
        ALTER TABLE users
        ADD COLUMN student_id VARCHAR(20) NULL
        AFTER display_name
      `);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!/Duplicate column/i.test(msg)) throw e;
    }

    try {
      await query(`
        ALTER TABLE users
        ADD COLUMN real_name VARCHAR(50) NULL
        AFTER student_id
      `);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!/Duplicate column/i.test(msg)) throw e;
    }

    try {
      await query(`
        ALTER TABLE users
        ADD COLUMN avatar_url VARCHAR(500) NULL
        AFTER real_name
      `);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!/Duplicate column/i.test(msg)) throw e;
    }

    // 创建昵称审核表
    await query(`
      CREATE TABLE IF NOT EXISTS nickname_approvals (
        id CHAR(36) NOT NULL PRIMARY KEY,
        user_id CHAR(36) NOT NULL,
        current_nickname VARCHAR(100) NOT NULL,
        requested_nickname VARCHAR(100) NOT NULL,
        student_id VARCHAR(20) NULL,
        real_name VARCHAR(50) NULL,
        status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
        reviewer_id CHAR(36) NULL,
        reviewed_at DATETIME(3) NULL,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        KEY idx_nickname_status (status),
        KEY idx_nickname_user (user_id),
        CONSTRAINT fk_nickname_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_nickname_reviewer FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    console.log('✅ 数据库表结构初始化完成');
  } catch (error) {
    console.error('❌ 数据库初始化失败:', error);
    throw error;
  }
}

export { pool, query, testConnection, initDatabase };
