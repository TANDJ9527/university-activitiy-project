import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const host = process.env.MYSQL_HOST || 'localhost';
const port = Number(process.env.MYSQL_PORT) || 3306;
const user = process.env.MYSQL_USER || 'root';
const password = process.env.MYSQL_PASSWORD || '';
const database = process.env.MYSQL_DATABASE || 'program';

async function fixDatabase() {
  const rootConn = await mysql.createConnection({ host, port, user, password });

  // 删除并重建数据库
  await rootConn.execute(`DROP DATABASE IF EXISTS \`${database}\``);
  console.log(`🗑️  已删除旧数据库 ${database}`);

  await rootConn.execute(`CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  console.log(`✅ 创建新数据库 ${database}`);

  await rootConn.end();

  const conn = await mysql.createConnection({ host, port, user, password, database });

  // 创建 users 表（代码期望的版本）
  await conn.execute(`
    CREATE TABLE users (
      id CHAR(36) NOT NULL PRIMARY KEY,
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      display_name VARCHAR(100) NOT NULL,
      role ENUM('student', 'school') NOT NULL,
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  console.log('✅ users 表创建完成');

  // 创建 activities 表（代码期望的版本）
  await conn.execute(`
    CREATE TABLE activities (
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
  console.log('✅ activities 表创建完成');

  // 创建 comments 表（代码期望的版本）
  await conn.execute(`
    CREATE TABLE comments (
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
  console.log('✅ comments 表创建完成');

  // 创建 platform_admins 表（代码期望的版本）
  await conn.execute(`
    CREATE TABLE platform_admins (
      user_id CHAR(36) NOT NULL PRIMARY KEY,
      note VARCHAR(200) NULL,
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      CONSTRAINT fk_platform_admins_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  console.log('✅ platform_admins 表创建完成');

  // 创建 activity_favorites 表
  await conn.execute(`
    CREATE TABLE activity_favorites (
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
  console.log('✅ activity_favorites 表创建完成');

  // 创建 activity_registrations 表
  await conn.execute(`
    CREATE TABLE activity_registrations (
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
  console.log('✅ activity_registrations 表创建完成');

  // 创建 email_verification_codes 表
  await conn.execute(`
    CREATE TABLE email_verification_codes (
      id CHAR(36) NOT NULL PRIMARY KEY,
      email VARCHAR(255) NOT NULL,
      purpose ENUM('register', 'reset_password') NOT NULL,
      code VARCHAR(6) NOT NULL,
      expires_at DATETIME(3) NOT NULL,
      created_at DATETIME(3) NOT NULL,
      KEY idx_email_codes_email_purpose (email, purpose)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  console.log('✅ email_verification_codes 表创建完成');

  // 创建 moderation_requests 表
  await conn.execute(`
    CREATE TABLE moderation_requests (
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
  console.log('✅ moderation_requests 表创建完成');

  await conn.end();
  console.log('\n🎉 数据库重建完成！现在与代码完全匹配');
}

fixDatabase().catch((err) => {
  console.error('❌ 失败:', err.message);
  process.exit(1);
});
