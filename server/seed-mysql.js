/**
 * 在 MySQL 中写入测试用户与演示活动。
 * 运行：cd server && npm run seed:mysql
 */
import bcrypt from "bcrypt";
import { randomUUID } from "crypto";
import { pool, query } from "./mysql.js";

const SALT_ROUNDS = 10;

function mysqlDateTime3(d = new Date()) {
  const x = d instanceof Date ? d : new Date(d);
  return x.toISOString().replace("T", " ").replace("Z", "").slice(0, 23);
}

const TEST_USERS = [
  { email: "guanfang@campus.demo", password: "demo123456", displayName: "校党委学工部", role: "school" },
  { email: "xuesheng@campus.demo", password: "demo123456", displayName: "计算机科技协会", role: "student" },
  { email: "zhiyuan@campus.demo", password: "demo123456", displayName: "青年志愿者协会", role: "student" },
  { email: "test@example.com", password: "test123456", displayName: "测试用户", role: "student" },
  { email: "student@campus.demo", password: "demo123456", displayName: "学生测试账号", role: "student" },
  { email: "school@campus.demo", password: "demo123456", displayName: "校方测试账号", role: "school" },
  { email: "admin@campus.demo", password: "admin123456", displayName: "平台管理员", role: "school", isAdmin: true },
];

const ACTIVITY_IDS = [
  "act00001-0000-4000-8000-000000000001",
  "act00002-0000-4000-8000-000000000002",
  "act00003-0000-4000-8000-000000000003",
  "act00004-0000-4000-8000-000000000004",
  "act00005-0000-4000-8000-000000000005",
  "act00006-0000-4000-8000-000000000006",
  "act00007-0000-4000-8000-000000000007",
  "act00008-0000-4000-8000-000000000008",
];

function buildActivities(schoolId, studentCsId, studentVolId) {
  return [
    {
      id: ACTIVITY_IDS[0],
      user_id: schoolId,
      publisher_role: "school",
      title: "名家讲坛：人工智能与高等教育的未来",
      description:
        "邀请知名学者探讨生成式 AI 对教学、科研与学习方式的影响，现场设问答与交流环节。欢迎各学院师生报名参加。\n\n请提前 15 分钟入场，讲座结束后可领取学时证明（以学院认定为准）。",
      location: "图书馆学术报告厅 A",
      organizer: "校党委学工部",
      contact: "lecture@campus.demo · 办公电话内线 8801",
      category: "讲座",
      start_at: "2026-06-08T14:00:00",
      end_at: "2026-06-08T16:30:00",
    },
    {
      id: ACTIVITY_IDS[1],
      user_id: schoolId,
      publisher_role: "school",
      title: "第九届春季校园迷你马拉松",
      description:
        "5 km 趣味跑 + 社团嘉年华摊位，完赛可领纪念奖牌与文创礼品。参赛者需自备舒适运动装备，现场提供饮用水与医疗点。",
      location: "主校区环形跑道（起点：体育馆南门）",
      organizer: "体育教学部、校学生会",
      contact: "marathon@campus.demo",
      category: "文体",
      start_at: "2026-06-12T08:00:00",
      end_at: "2026-06-12T12:00:00",
    },
    {
      id: ACTIVITY_IDS[2],
      user_id: studentVolId,
      publisher_role: "student",
      title: "「银龄相伴」社区敬老院志愿服务",
      description: "周末前往共建街道敬老院开展陪伴聊天、读报、简单文娱活动。服务时长计入志愿时数。",
      location: "阳光社区敬老院（校车往返）",
      organizer: "青年志愿者协会",
      contact: "vol@campus.demo",
      category: "志愿服务",
      start_at: "2026-06-19T09:00:00",
      end_at: "2026-06-19T16:00:00",
    },
    {
      id: ACTIVITY_IDS[3],
      user_id: studentCsId,
      publisher_role: "student",
      title: "极客代码之夜 · 48 小时 Hackathon",
      description: "围绕「智慧校园」主题自由组队开发原型，提供技术导师驻场与评选环节。",
      location: "工程实训中心 3 楼开放工场",
      organizer: "计算机科技协会",
      contact: "hackathon@campus.demo",
      category: "社团",
      start_at: "2026-06-01T09:00:00",
      end_at: "2026-06-03T18:00:00",
    },
    {
      id: ACTIVITY_IDS[4],
      user_id: schoolId,
      publisher_role: "school",
      title: "全国大学生数学建模竞赛赛前集训营",
      description: "面向拟参赛队伍开设建模方法、论文写作与软件实现专题。",
      location: "理学院 B203 智慧教室",
      organizer: "数学建模指导中心",
      contact: "mmc@campus.demo",
      category: "竞赛",
      start_at: "2026-06-06T18:30:00",
      end_at: "2026-06-06T21:00:00",
    },
    {
      id: ACTIVITY_IDS[5],
      user_id: schoolId,
      publisher_role: "school",
      title: "职业生涯规划工作坊：简历与面试实验室",
      description: "企业 HR 与校友导师一对一润色简历、模拟面试，适合大三、大四及研究生。",
      location: "就业指导中心多功能厅",
      organizer: "招生就业处",
      contact: "career@campus.demo",
      category: "其他",
      start_at: "2026-06-15T13:30:00",
      end_at: "2026-06-15T17:00:00",
    },
    {
      id: ACTIVITY_IDS[6],
      user_id: studentCsId,
      publisher_role: "student",
      title: "初夏草坪音乐节 · 学生乐队与街舞联演",
      description: "多支校园乐队、街舞社与说唱社联合演出，免票入场。",
      location: "湖心草坪（钟楼东侧）",
      organizer: "计算机科技协会 × 流行音乐社",
      contact: "music@campus.demo",
      category: "文体",
      start_at: "2026-06-24T16:00:00",
      end_at: "2026-06-24T20:30:00",
    },
    {
      id: ACTIVITY_IDS[7],
      user_id: schoolId,
      publisher_role: "school",
      title: "校园开放日校史馆与实验室参观导览",
      description: "面向考生与家长开放校史馆、实验教学示范中心与智慧教室体验。",
      location: "校史馆北门集合",
      organizer: "校长办公室、校团委",
      contact: "openday@campus.demo",
      category: "志愿服务",
      start_at: "2026-07-07T09:00:00",
      end_at: "2026-07-07T17:00:00",
    },
  ];
}

async function ensureUser(user) {
  const rows = await query("SELECT id FROM users WHERE email = ?", [user.email]);
  if (rows.length > 0) return rows[0].id;

  const userId = randomUUID();
  const passwordHash = await bcrypt.hash(user.password, SALT_ROUNDS);
  const now = mysqlDateTime3();
  await query(
    `INSERT INTO users (id, email, password_hash, display_name, role, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [userId, user.email, passwordHash, user.displayName, user.role, now]
  );
  console.log(`✅ 已创建用户 ${user.email}`);
  return userId;
}

async function seedUsers() {
  const ids = {};
  for (const user of TEST_USERS) {
    const userId = await ensureUser(user);
    ids[user.email] = userId;

    if (user.isAdmin) {
      const admins = await query("SELECT user_id FROM platform_admins WHERE user_id = ?", [userId]);
      if (admins.length === 0) {
        await query(
          `INSERT INTO platform_admins (user_id, note, created_at) VALUES (?, ?, ?)`,
          [userId, "seed-mysql：平台管理员", mysqlDateTime3()]
        );
      }
    }
  }

  const email = "3421083220@qq.com";
  const hash = await bcrypt.hash("123456", SALT_ROUNDS);
  const superRows = await query("SELECT id FROM users WHERE email = ?", [email]);
  const now = mysqlDateTime3();
  let uid;
  if (superRows.length > 0) {
    uid = superRows[0].id;
    await query("UPDATE users SET password_hash = ?, display_name = ?, role = ? WHERE id = ?", [
      hash,
      "系统管理员",
      "school",
      uid,
    ]);
  } else {
    uid = randomUUID();
    await query(
      `INSERT INTO users (id, email, password_hash, display_name, role, created_at)
       VALUES (?, ?, ?, ?, 'school', ?)`,
      [uid, email, hash, "系统管理员", now]
    );
  }
  const admins = await query("SELECT user_id FROM platform_admins WHERE user_id = ?", [uid]);
  if (admins.length === 0) {
    await query(`INSERT INTO platform_admins (user_id, note, created_at) VALUES (?, ?, ?)`, [
      uid,
      "主管理员账号",
      now,
    ]);
  }
  ids[email] = uid;

  return ids;
}

async function seedActivities(userIds) {
  const schoolId = userIds["guanfang@campus.demo"] || userIds["school@campus.demo"];
  const studentCsId = userIds["xuesheng@campus.demo"] || userIds["student@campus.demo"];
  const studentVolId = userIds["zhiyuan@campus.demo"] || userIds["student@campus.demo"];

  if (!schoolId || !studentCsId) {
    console.error("❌ 缺少发布者用户，无法写入活动");
    return;
  }

  const activities = buildActivities(schoolId, studentCsId, studentVolId);
  const now = mysqlDateTime3();

  console.log("\n📅 写入演示活动…");
  for (const a of activities) {
    const existing = await query("SELECT id FROM activities WHERE id = ?", [a.id]);
    const start = mysqlDateTime3(new Date(a.start_at));
    const end = a.end_at ? mysqlDateTime3(new Date(a.end_at)) : null;

    if (existing.length > 0) {
      await query(
        `UPDATE activities SET user_id=?, publisher_role=?, title=?, description=?, location=?, organizer=?, contact=?, category=?, start_at=?, end_at=?, updated_at=?
         WHERE id=?`,
        [
          a.user_id,
          a.publisher_role,
          a.title,
          a.description,
          a.location,
          a.organizer,
          a.contact,
          a.category,
          start,
          end,
          now,
          a.id,
        ]
      );
      console.log(`   ↻ 已更新：${a.title}`);
    } else {
      await query(
        `INSERT INTO activities (id, user_id, publisher_role, title, description, location, organizer, contact, category, start_at, end_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          a.id,
          a.user_id,
          a.publisher_role,
          a.title,
          a.description,
          a.location,
          a.organizer,
          a.contact,
          a.category,
          start,
          end,
          now,
          now,
        ]
      );
      console.log(`   ✅ 已创建：${a.title}`);
    }
  }
}

async function main() {
  console.log("🌱 MySQL 种子数据（用户 + 活动）\n");
  try {
    const userIds = await seedUsers();
    await seedActivities(userIds);

    const countRows = await query("SELECT COUNT(*) AS c FROM activities");
    const count = countRows[0]?.c ?? 0;
    console.log(`\n🎉 完成。当前活动表共 ${count} 条记录。`);
    console.log("刷新浏览器活动广场即可看到列表。");
    console.log("\n主管理员：3421083220@qq.com / 123456");
    console.log("校方演示：guanfang@campus.demo / demo123456");
    console.log("学生演示：xuesheng@campus.demo / demo123456");
  } catch (err) {
    console.error("❌ 失败:", err instanceof Error ? err.message : err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();
