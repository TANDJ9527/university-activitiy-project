/**
 * 在 MySQL 中创建/补全测试用户（与 mysql.js 表结构一致）。
 * 运行：cd server && npm run seed:mysql
 */
import bcrypt from "bcrypt";
import { randomUUID } from "crypto";
import { pool, query } from "./mysql.js";

const SALT_ROUNDS = 10;

/** MySQL DATETIME(3) 不接受带 Z 的 ISO 字符串 */
function mysqlDateTime3(d = new Date()) {
  return d.toISOString().replace("T", " ").replace("Z", "").slice(0, 23);
}

const TEST_USERS = [
  {
    email: "test@example.com",
    password: "test123456",
    displayName: "测试用户",
    role: "student",
  },
  {
    email: "student@campus.demo",
    password: "demo123456",
    displayName: "学生测试账号",
    role: "student",
  },
  {
    email: "school@campus.demo",
    password: "demo123456",
    displayName: "校方测试账号",
    role: "school",
  },
  {
    email: "admin@campus.demo",
    password: "admin123456",
    displayName: "平台管理员",
    role: "school",
    isAdmin: true,
  },
];

async function seedUsers() {
  console.log("🌱 开始在 MySQL 中写入测试用户…\n");

  try {
    for (const user of TEST_USERS) {
      const rows = await query("SELECT id FROM users WHERE email = ?", [user.email]);
      let userId;

      if (rows.length > 0) {
        userId = rows[0].id;
        console.log(`⚠️  ${user.email} 已存在，跳过创建（id: ${userId}）`);
      } else {
        userId = randomUUID();
        const passwordHash = await bcrypt.hash(user.password, SALT_ROUNDS);
        const now = mysqlDateTime3();
        await query(
          `INSERT INTO users (id, email, password_hash, display_name, role, created_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [userId, user.email, passwordHash, user.displayName, user.role, now]
        );
        console.log(`✅ 已创建用户 ${user.email}（${user.displayName}）`);
      }

      if (user.isAdmin) {
        const admins = await query("SELECT user_id FROM platform_admins WHERE user_id = ?", [userId]);
        if (admins.length === 0) {
          const now = mysqlDateTime3();
          await query(
            `INSERT INTO platform_admins (user_id, note, created_at) VALUES (?, ?, ?)`,
            [userId, "seed-mysql：平台管理员", now]
          );
          console.log(`   → 已写入 platform_admins`);
        } else {
          console.log(`   → platform_admins 中已有记录，跳过`);
        }
      }
    }

    console.log("\n🎉 完成。可用账号：");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    for (const u of TEST_USERS) {
      console.log(`👤 ${u.displayName}`);
      console.log(`   邮箱: ${u.email}`);
      console.log(`   密码: ${u.password}`);
      console.log(
        `   身份: ${u.role === "school" ? "校方" : "学生"}${u.isAdmin ? "（平台管理员）" : ""}\n`
      );
    }
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    const email = "3421083220@qq.com";
    const hash = await bcrypt.hash("123456", SALT_ROUNDS);
    const superRows = await query("SELECT id FROM users WHERE email = ?", [email]);
    const now = mysqlDateTime3();
    let uid;
    if (superRows.length > 0) {
      uid = superRows[0].id;
      await query(
        "UPDATE users SET password_hash = ?, display_name = ?, role = ? WHERE id = ?",
        [hash, "系统管理员", "school", uid]
      );
      console.log(`\n✅ 主管理员 ${email} 已更新（密码：123456）`);
    } else {
      uid = randomUUID();
      await query(
        `INSERT INTO users (id, email, password_hash, display_name, role, created_at)
         VALUES (?, ?, ?, ?, 'school', ?)`,
        [uid, email, hash, "系统管理员", now]
      );
      console.log(`\n✅ 已创建主管理员 ${email}（密码：123456）`);
    }
    const admins = await query("SELECT user_id FROM platform_admins WHERE user_id = ?", [uid]);
    if (admins.length === 0) {
      await query(
        `INSERT INTO platform_admins (user_id, note, created_at) VALUES (?, ?, ?)`,
        [uid, "主管理员账号（最高权限）", now]
      );
      console.log("   → 已写入 platform_admins");
    } else {
      console.log("   → platform_admins 中已有该账号");
    }
  } catch (err) {
    console.error("❌ 失败:", err instanceof Error ? err.message : err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

seedUsers();
