/**
 * 向 MySQL 写入演示用户与活动。可重复执行：会先删除固定 ID 的演示活动再插入。
 * 运行：cd server && npm run seed
 */
import bcrypt from "bcrypt";
import { pool, ensureSchema } from "./db.js";

const SALT = 10;

const SEED_USERS = [
  {
    id: "seed0001-0000-4000-8000-000000000001",
    email: "guanfang@campus.demo",
    password: "demo123456",
    displayName: "校党委学工部",
    role: "school",
  },
  {
    id: "seed0002-0000-4000-8000-000000000002",
    email: "xuesheng@campus.demo",
    password: "demo123456",
    displayName: "计算机科技协会",
    role: "student",
  },
  {
    id: "seed0003-0000-4000-8000-000000000003",
    email: "zhiyuan@campus.demo",
    password: "demo123456",
    displayName: "青年志愿者协会",
    role: "student",
  },
  /** 简易测试账号（本地/联调用） */
  {
    id: "seed0099-0000-4000-8000-000000000099",
    email: "test@example.com",
    password: "test123456",
    displayName: "测试用户",
    role: "student",
  },
  /** 平台管理员：可编辑/删除任意活动（账号在 platform_admins 表登记） */
  {
    id: "seed0088-0000-4000-8000-000000000088",
    email: "admin@campus.demo",
    password: "admin123456",
    displayName: "平台管理员",
    role: "school",
  },
];

const ADMIN_USER_ID = "seed0088-0000-4000-8000-000000000088";

/** 校方、学生账号交替发布 */
const SCHOOL = SEED_USERS[0].id;
const CLUB_CS = SEED_USERS[1].id;
const CLUB_VOL = SEED_USERS[2].id;

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

function d(iso) {
  return new Date(iso);
}

const SEED_ACTIVITIES = [
  {
    id: ACTIVITY_IDS[0],
    user_id: SCHOOL,
    title: "名家讲坛：人工智能与高等教育的未来",
    description:
      "邀请知名学者探讨生成式 AI 对教学、科研与学习方式的影响，现场设问答与交流环节。欢迎各学院师生报名参加。\n\n请提前 15 分钟入场，讲座结束后可领取学时证明（以学院认定为准）。",
    location: "图书馆学术报告厅 A",
    organizer: "校党委学工部",
    contact: "lecture@campus.demo · 办公电话内线 8801",
    category: "讲座",
    start_at: d("2026-04-08T14:00:00"),
    end_at: d("2026-04-08T16:30:00"),
  },
  {
    id: ACTIVITY_IDS[1],
    user_id: SCHOOL,
    title: "第九届春季校园迷你马拉松",
    description:
      "5 km 趣味跑 + 社团嘉年华摊位，完赛可领纪念奖牌与文创礼品。参赛者需自备舒适运动装备，现场提供饮用水与医疗点。\n\n报名截止日期：活动前三天 18:00。",
    location: "主校区环形跑道（起点：体育馆南门）",
    organizer: "体育教学部、校学生会",
    contact: "marathon@campus.demo",
    category: "文体",
    start_at: d("2026-04-12T08:00:00"),
    end_at: d("2026-04-12T12:00:00"),
  },
  {
    id: ACTIVITY_IDS[2],
    user_id: CLUB_VOL,
    title: "「银龄相伴」社区敬老院志愿服务",
    description:
      "周末前往共建街道敬老院开展陪伴聊天、读报、简单文娱活动。服务时长计入志愿时数，需穿着协会统一马甲。\n\n集合地点：东门校友广场，乘校车统一前往。",
    location: "阳光社区敬老院（校车往返）",
    organizer: "青年志愿者协会",
    contact: "微信群「2026 志协活动通知」或邮箱 vol@campus.demo",
    category: "志愿服务",
    start_at: d("2026-04-19T09:00:00"),
    end_at: d("2026-04-19T16:00:00"),
  },
  {
    id: ACTIVITY_IDS[3],
    user_id: CLUB_CS,
    title: "极客代码之夜 · 48 小时 Hackathon",
    description:
      "围绕「智慧校园」主题自由组队开发原型，提供云计算抵扣券与技术导师驻场。评选最佳创意、最佳工程与最佳展示奖。\n\n需自带电脑，现场供应餐食与咖啡。",
    location: "工程实训中心 3 楼开放工场",
    organizer: "计算机科技协会",
    contact: "hackathon@campus.demo",
    category: "社团",
    start_at: d("2026-05-01T09:00:00"),
    end_at: d("2026-05-03T18:00:00"),
  },
  {
    id: ACTIVITY_IDS[4],
    user_id: SCHOOL,
    title: "全国大学生数学建模竞赛赛前集训营",
    description:
      "面向拟参赛队伍开设建模方法、论文写作与软件实现专题，含历年真题讲评与模拟题实战。\n\n限 40 支队伍，以学院盖章报名表为准。",
    location: "理学院 B203 智慧教室",
    organizer: "数学建模指导中心",
    contact: "mmc@campus.demo",
    category: "竞赛",
    start_at: d("2026-05-06T18:30:00"),
    end_at: d("2026-05-06T21:00:00"),
  },
  {
    id: ACTIVITY_IDS[5],
    user_id: SCHOOL,
    title: "职业生涯规划工作坊：简历与面试实验室",
    description:
      "企业 HR 与校友导师一对一润色简历、模拟单面与群面，适合大三、大四及研究生。\n\n请携带纸质简历 2 份，预约时段于活动当日现场签到分配。",
    location: "就业指导中心多功能厅",
    organizer: "招生就业处",
    contact: "career@campus.demo",
    category: "其他",
    start_at: d("2026-05-15T13:30:00"),
    end_at: d("2026-05-15T17:00:00"),
  },
  {
    id: ACTIVITY_IDS[6],
    user_id: CLUB_CS,
    title: "初夏草坪音乐节 · 学生乐队与街舞联演",
    description:
      "多支校园乐队、街舞社与说唱社联合演出，免票入场。备有野餐垫租借与轻食摊位（商业合作以现场为准）。\n\n如遇雨天改至学生活动中心剧场，请关注协会公众号推送。",
    location: "湖心草坪（钟楼东侧）",
    organizer: "计算机科技协会 × 流行音乐社",
    contact: "music@campus.demo",
    category: "文体",
    start_at: d("2026-05-24T16:00:00"),
    end_at: d("2026-05-24T20:30:00"),
  },
  {
    id: ACTIVITY_IDS[7],
    user_id: SCHOOL,
    title: "校园开放日校史馆与实验室参观导览",
    description:
      "面向考生与家长开放校史馆、国家级实验教学示范中心与智慧教室体验。每场导览约 45 分钟，汉语 / 英语时段分开展示。\n\n志愿者招募同步进行，服务证明由校办统一开具。",
    location: "校史馆北门集合",
    organizer: "校长办公室、校团委",
    contact: "openday@campus.demo",
    category: "志愿服务",
    start_at: d("2026-06-07T09:00:00"),
    end_at: d("2026-06-07T17:00:00"),
  },
];

async function main() {
  await ensureSchema();

  for (const u of SEED_USERS) {
    const hash = await bcrypt.hash(u.password, SALT);
    await pool.execute(
      `INSERT INTO users (id, email, password_hash, display_name, role)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         password_hash = VALUES(password_hash),
         display_name = VALUES(display_name),
         role = VALUES(role)`,
      [u.id, u.email, hash, u.displayName, u.role]
    );
  }

  await pool.execute(
    `INSERT INTO platform_admins (user_id, note) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE note = VALUES(note)`,
    [ADMIN_USER_ID, "演示：平台管理员，可管理全部活动"]
  );

  const placeholders = ACTIVITY_IDS.map(() => "?").join(", ");
  await pool.execute(`DELETE FROM activities WHERE id IN (${placeholders})`, ACTIVITY_IDS);

  for (const a of SEED_ACTIVITIES) {
    const publisher_role = a.user_id === SCHOOL ? "school" : "student";
    await pool.execute(
      `INSERT INTO activities
        (id, user_id, publisher_role, title, description, location, organizer, contact, category, start_at, end_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        a.id,
        a.user_id,
        publisher_role,
        a.title,
        a.description,
        a.location,
        a.organizer,
        a.contact,
        a.category,
        a.start_at,
        a.end_at,
      ]
    );
  }

  console.log("Seed 完成：已写入 %d 个演示活动。", SEED_ACTIVITIES.length);
  console.log("账号列表：");
  for (const u of SEED_USERS) {
    let pwd = "demo123456";
    if (u.email === "test@example.com") pwd = "test123456";
    if (u.email === "admin@campus.demo") pwd = "admin123456";
    const tag =
      u.id === ADMIN_USER_ID ? "校方·管理员" : u.role === "school" ? "校方" : "学生";
    console.log("  • %s  [%s] %s  密码 %s", u.email, tag, u.displayName, pwd);
  }
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
