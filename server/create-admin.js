import bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const host = process.env.MYSQL_HOST || 'localhost';
const port = Number(process.env.MYSQL_PORT) || 3306;
const user = process.env.MYSQL_USER || 'root';
const password = process.env.MYSQL_PASSWORD || '';
const database = process.env.MYSQL_DATABASE || 'program';

async function createAdmin() {
  const conn = await mysql.createConnection({ host, port, user, password, database });

  const id = randomUUID();
  const email = '3421083220@qq.com';
  const passwordHash = await bcrypt.hash('123456', 10);
  const displayName = '管理员';
  const role = 'school';
  const now = new Date();

  // users 表结构: id, email, password_hash, display_name, role, created_at
  await conn.execute(
    `INSERT INTO users (id, email, password_hash, display_name, role, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, email, passwordHash, displayName, role, now]
  );
  console.log(`✅ 用户 ${email} 创建成功 (ID: ${id})`);

  // platform_admins 表结构: user_id PRIMARY KEY, note, created_at
  await conn.execute(
    `INSERT INTO platform_admins (user_id, note, created_at) VALUES (?, ?, ?)`,
    [id, '手动创建的管理员账号', now]
  );
  console.log(`✅ 用户 ${email} 已添加到 platform_admins`);

  await conn.end();
}

createAdmin().catch((err) => {
  console.error('❌ 创建失败:', err.message);
  process.exit(1);
});
