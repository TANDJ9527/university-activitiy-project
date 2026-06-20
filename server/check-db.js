import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const host = process.env.MYSQL_HOST || 'localhost';
const port = Number(process.env.MYSQL_PORT) || 3306;
const user = process.env.MYSQL_USER || 'root';
const password = process.env.MYSQL_PASSWORD || '';
const database = process.env.MYSQL_DATABASE || 'program';

async function checkAndFix() {
  const conn = await mysql.createConnection({ host, port, user, password, database });

  // 获取所有表
  const tables = await conn.execute(`SHOW TABLES`);
  console.log('📋 当前数据库中的表:', tables[0].map(t => Object.values(t)[0]));

  // 检查 users 表
  const usersCols = await conn.execute(`SHOW COLUMNS FROM users`);
  console.log('\n📋 users 表结构:');
  usersCols[0].forEach(col => console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : ''} ${col.Key === 'PRI' ? 'PRIMARY KEY' : ''} Default: ${col.Default}`));

  // 检查 activities 表
  const activitiesCols = await conn.execute(`SHOW COLUMNS FROM activities`);
  console.log('\n📋 activities 表结构:');
  activitiesCols[0].forEach(col => console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : ''} ${col.Key === 'PRI' ? 'PRIMARY KEY' : ''} Default: ${col.Default}`));

  // 检查 comments 表
  const commentsCols = await conn.execute(`SHOW COLUMNS FROM comments`);
  console.log('\n📋 comments 表结构:');
  commentsCols[0].forEach(col => console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : ''} ${col.Key === 'PRI' ? 'PRIMARY KEY' : ''} Default: ${col.Default}`));

  // 检查 platform_admins 表
  const adminsCols = await conn.execute(`SHOW COLUMNS FROM platform_admins`);
  console.log('\n📋 platform_admins 表结构:');
  adminsCols[0].forEach(col => console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : ''} ${col.Key === 'PRI' ? 'PRIMARY KEY' : ''} Default: ${col.Default}`));

  // 检查 favorites 表
  const favoritesCols = await conn.execute(`SHOW COLUMNS FROM favorites`);
  console.log('\n📋 favorites 表结构:');
  favoritesCols[0].forEach(col => console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : ''} ${col.Key === 'PRI' ? 'PRIMARY KEY' : ''} Default: ${col.Default}`));

  // 检查 activity_registrations 表
  const regsCols = await conn.execute(`SHOW COLUMNS FROM activity_registrations`);
  console.log('\n📋 activity_registrations 表结构:');
  regsCols[0].forEach(col => console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : ''} ${col.Key === 'PRI' ? 'PRIMARY KEY' : ''} Default: ${col.Default}`));

  // 检查 moderation_requests 表
  const modCols = await conn.execute(`SHOW COLUMNS FROM moderation_requests`);
  console.log('\n📋 moderation_requests 表结构:');
  modCols[0].forEach(col => console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : ''} ${col.Key === 'PRI' ? 'PRIMARY KEY' : ''} Default: ${col.Default}`));

  // 检查 email_verification_codes 表
  const emailCols = await conn.execute(`SHOW COLUMNS FROM email_verification_codes`);
  console.log('\n📋 email_verification_codes 表结构:');
  emailCols[0].forEach(col => console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : ''} ${col.Key === 'PRI' ? 'PRIMARY KEY' : ''} Default: ${col.Default}`));

  await conn.end();
}

checkAndFix().catch(console.error);
