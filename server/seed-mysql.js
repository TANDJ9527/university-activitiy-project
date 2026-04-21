/**
 * MySQL 数据库测试用户创建脚本
 * 运行：cd server && node seed-mysql.js
 */
import bcrypt from "bcrypt";
import { pool, query } from "./mysql.js";

const SALT_ROUNDS = 10;

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
  console.log("🌱 开始创建测试用户...\n");

  try {
    for (const user of TEST_USERS) {
      // 检查用户是否已存在
      const existing = await query("SELECT id FROM users WHERE email = ?", [
        user.email,
      ]);

      if (existing.length > 0) {
        console.log(`⚠️  ${user.email} 已存在，跳过`);
        continue;
      }

      // 加密密码
      const passwordHash = await bcrypt.hash(user.password, SALT_ROUNDS);

      // 插入用户
      const result = await query(
        `INSERT INTO users (email, password_hash, display_name, role, created_at, updated_at) 
         VALUES (?, ?, ?, ?, NOW(), NOW())`,
        [user.email, passwordHash, user.displayName, user.role]
      );

      const userId = result.insertId;

      // 如果是管理员，添加到 platform_admins 表
      if (user.isAdmin) {
        await query(
          `INSERT INTO platform_admins (user_id, granted_by, created_at) 
           VALUES (?, ?, NOW())`,
          [userId, userId]
        );
        console.log(`✅ ${user.email} (${user.displayName}) - 已设为管理员`);
      } else {
        console.log(
          `✅ ${user.email} (${user.displayName}) - ${user.role === "school" ? "校方" : "学生"}`
        );
      }
    }

    console.log("\n🎉 测试用户创建完成！");
    console.log("\n📋 登录信息：");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    TEST_USERS.forEach((u) => {
      console.log(`👤 ${u.displayName}`);
      console.log(`   邮箱: ${u.email}`);
      console.log(`   密码: ${u.password}`);
      console.log(`   身份: ${u.role === "school" ? "校方" : "学生"}${u.isAdmin ? " (管理员)" : ""}`);
      console.log("");
    });
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  } catch (err) {
    console.error("❌ 创建失败:", err.message);
    process.exit(1);
  } finally {
    pool.end();
  }
}

seedUsers();
