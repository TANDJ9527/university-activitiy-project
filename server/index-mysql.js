import express from "express";
import cors from "cors";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";
import { query, testConnection, initDatabase } from "./mysql.js";

const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";
const SALT_ROUNDS = 10;

const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: "1mb" }));

async function userPublicFields(userId, email, displayName, role) {
  const admins = await query("SELECT user_id FROM platform_admins WHERE user_id = ?", [userId]);
  return {
    id: userId,
    email,
    displayName,
    role,
    isPlatformAdmin: admins.length > 0,
  };
}

async function isPlatformAdmin(userId) {
  const admins = await query("SELECT user_id FROM platform_admins WHERE user_id = ?", [userId]);
  return admins.length > 0;
}

function signUserToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function authMiddleware(required) {
  return (req, res, next) => {
    const raw = req.headers.authorization?.replace(/^Bearer\s+/i, "");
    if (!raw) {
      req.user = null;
      if (required) return res.status(401).json({ error: "请先登录" });
      return next();
    }
    try {
      const payload = jwt.verify(raw, JWT_SECRET);
      req.user = {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
      };
      next();
    } catch {
      req.user = null;
      if (required) return res.status(401).json({ error: "登录已过期，请重新登录" });
      next();
    }
  };
}

// 健康检查
app.get("/api/health", async (_req, res) => {
  try {
    await query("SELECT 1");
    res.json({ ok: true, db: true });
  } catch {
    res.json({ ok: true, db: false });
  }
});

// 用户注册
app.post("/api/auth/register", async (req, res) => {
  const body = req.body || {};
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  const displayName = String(body.displayName || "").trim();
  const roleRaw = String(body.role || "student").toLowerCase();
  const role = roleRaw === "school" ? "school" : "student";

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "请填写有效邮箱" });
  }
  if (password.length < 6) return res.status(400).json({ error: "密码至少 6 位" });
  if (!displayName || displayName.length > 100) {
    return res.status(400).json({ error: "请填写昵称（不超过 100 字）" });
  }

  try {
    const existingUsers = await query("SELECT id FROM users WHERE email = ?", [email]);
    if (existingUsers.length > 0) {
      return res.status(409).json({ error: "该邮箱已注册" });
    }

    const id = randomUUID();
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const now = new Date().toISOString();

    await query(
      "INSERT INTO users (id, email, password_hash, display_name, role, created_at) VALUES (?, ?, ?, ?, ?, ?)",
      [id, email, passwordHash, displayName, role, now]
    );

    const user = await userPublicFields(id, email, displayName, role);
    const token = signUserToken(user);
    res.status(201).json({ token, user });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "注册失败" });
  }
});

// 用户登录
app.post("/api/auth/login", async (req, res) => {
  const body = req.body || {};
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");

  if (!email || !password) {
    return res.status(400).json({ error: "请填写邮箱和密码" });
  }

  try {
    const users = await query("SELECT id, email, password_hash, display_name, role FROM users WHERE email = ?", [email]);
    if (users.length === 0) {
      return res.status(401).json({ error: "邮箱或密码错误" });
    }

    const user = users[0];
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: "邮箱或密码错误" });
    }

    const publicUser = await userPublicFields(user.id, user.email, user.display_name, user.role);
    const token = signUserToken(publicUser);
    res.json({ token, user: publicUser });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "登录失败" });
  }
});

// 获取当前用户信息
app.get("/api/auth/me", authMiddleware(true), async (req, res) => {
  try {
    const users = await query("SELECT id, email, display_name, role FROM users WHERE id = ?", [req.user.id]);
    if (users.length === 0) {
      return res.status(404).json({ error: "用户不存在" });
    }

    const user = users[0];
    const publicUser = await userPublicFields(user.id, user.email, user.display_name, user.role);
    res.json({ user: publicUser });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "获取用户信息失败" });
  }
});

// 获取活动列表
app.get("/api/activities", async (req, res) => {
  try {
    let sql = `
      SELECT a.*, u.display_name as author_display_name, u.role as author_role
      FROM activities a
      LEFT JOIN users u ON a.user_id = u.id
      ORDER BY a.created_at DESC
    `;
    let params = [];

    // 搜索关键词
    const q = req.query.q?.trim();
    if (q) {
      sql += ` WHERE a.title LIKE ? OR a.description LIKE ? OR a.location LIKE ? OR a.organizer LIKE ?`;
      const searchTerm = `%${q}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    // 类别筛选
    const category = req.query.category?.trim();
    if (category && category !== "全部") {
      sql += q ? ` AND a.category = ?` : ` WHERE a.category = ?`;
      params.push(category);
    }

    // 发布者筛选
    const publisher = req.query.publisher?.trim();
    if (publisher && publisher !== "全部") {
      sql += q || category ? ` AND a.publisher_role = ?` : ` WHERE a.publisher_role = ?`;
      params.push(publisher);
    }

    // 排序
    const sort = req.query.sort?.trim();
    if (sort === "start_time_asc") {
      sql += ` ORDER BY a.start_at ASC`;
    } else if (sort === "start_time_desc") {
      sql += ` ORDER BY a.start_at DESC`;
    }

    const activities = await query(sql, params);
    
    const mappedActivities = activities.map(activity => ({
      id: activity.id,
      title: activity.title,
      description: activity.description,
      location: activity.location || "",
      organizer: activity.organizer || "",
      contact: activity.contact || "",
      category: activity.category,
      startAt: activity.start_at,
      endAt: activity.end_at,
      createdAt: activity.created_at,
      updatedAt: activity.updated_at,
      publisherRole: activity.publisher_role,
      author: {
        id: activity.user_id,
        displayName: activity.author_display_name,
        role: activity.author_role,
      },
    }));

    res.json({ activities: mappedActivities });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "获取活动列表失败" });
  }
});

// 获取单个活动详情
app.get("/api/activities/:id", async (req, res) => {
  try {
    const activities = await query(`
      SELECT a.*, u.display_name as author_display_name, u.role as author_role
      FROM activities a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE a.id = ?
    `, [req.params.id]);

    if (activities.length === 0) {
      return res.status(404).json({ error: "活动不存在" });
    }

    const activity = activities[0];
    const mappedActivity = {
      id: activity.id,
      title: activity.title,
      description: activity.description,
      location: activity.location || "",
      organizer: activity.organizer || "",
      contact: activity.contact || "",
      category: activity.category,
      startAt: activity.start_at,
      endAt: activity.end_at,
      createdAt: activity.created_at,
      updatedAt: activity.updated_at,
      publisherRole: activity.publisher_role,
      author: {
        id: activity.user_id,
        displayName: activity.author_display_name,
        role: activity.author_role,
      },
    };

    res.json(mappedActivity);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "获取活动详情失败" });
  }
});

// 创建活动
app.post("/api/activities", authMiddleware(true), async (req, res) => {
  const body = req.body || {};
  const title = String(body.title || "").trim();
  const description = String(body.description || "").trim();
  const location = String(body.location || "").trim();
  const organizer = String(body.organizer || "").trim();
  const contact = String(body.contact || "").trim();
  const category = String(body.category || "其他").trim();
  const startAt = body.startAt;
  const endAt = body.endAt || null;

  if (!title || title.length > 120) {
    return res.status(400).json({ error: "标题必填且不超过 120 字" });
  }
  if (!description || description.length > 8000) {
    return res.status(400).json({ error: "活动说明必填且不超过 8000 字" });
  }
  if (!startAt) return res.status(400).json({ error: "请填写开始时间" });
  
  const start = new Date(startAt);
  if (Number.isNaN(start.getTime())) {
    return res.status(400).json({ error: "开始时间格式无效" });
  }
  
  let end = null;
  if (endAt) {
    end = new Date(endAt);
    if (Number.isNaN(end.getTime())) {
      return res.status(400).json({ error: "结束时间格式无效" });
    }
  }

  try {
    const id = randomUUID();
    const uid = req.user.id;
    const publisherRole = req.user.role === "school" ? "school" : "student";
    const now = new Date().toISOString();

    await query(`
      INSERT INTO activities (id, user_id, publisher_role, title, description, location, organizer, contact, category, start_at, end_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [id, uid, publisherRole, title, description, location, organizer, contact, category, start.toISOString(), end ? end.toISOString() : null, now, now]);

    // 获取创建的活动信息
    const activities = await query(`
      SELECT a.*, u.display_name as author_display_name, u.role as author_role
      FROM activities a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE a.id = ?
    `, [id]);

    const activity = activities[0];
    const mappedActivity = {
      id: activity.id,
      title: activity.title,
      description: activity.description,
      location: activity.location || "",
      organizer: activity.organizer || "",
      contact: activity.contact || "",
      category: activity.category,
      startAt: activity.start_at,
      endAt: activity.end_at,
      createdAt: activity.created_at,
      updatedAt: activity.updated_at,
      publisherRole: activity.publisher_role,
      author: {
        id: activity.user_id,
        displayName: activity.author_display_name,
        role: activity.author_role,
      },
    };

    res.status(201).json({ activity: mappedActivity });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "发布失败" });
  }
});

// 更新活动
app.put("/api/activities/:id", authMiddleware(true), async (req, res) => {
  try {
    const activities = await query("SELECT * FROM activities WHERE id = ?", [req.params.id]);
    if (activities.length === 0) {
      return res.status(404).json({ error: "未找到活动" });
    }

    const existing = activities[0];
    const admin = await isPlatformAdmin(req.user.id);
    if (existing.user_id !== req.user.id && !admin) {
      return res.status(403).json({ error: "只有发布者或平台管理员可以修改该活动" });
    }

    const body = req.body || {};
    const title = body.title !== undefined ? String(body.title).trim() : existing.title;
    const description = body.description !== undefined ? String(body.description).trim() : existing.description;
    const location = body.location !== undefined ? String(body.location).trim() : existing.location;
    const organizer = body.organizer !== undefined ? String(body.organizer).trim() : existing.organizer;
    const contact = body.contact !== undefined ? String(body.contact).trim() : existing.contact;
    const category = body.category !== undefined ? String(body.category).trim() : existing.category;
    const startAt = body.startAt !== undefined ? body.startAt : existing.start_at;
    const endAt = body.endAt !== undefined ? body.endAt : existing.end_at;

    if (!title || title.length > 120) {
      return res.status(400).json({ error: "标题必填且不超过 120 字" });
    }
    if (!description || description.length > 8000) {
      return res.status(400).json({ error: "活动说明必填且不超过 8000 字" });
    }

    await query(`
      UPDATE activities 
      SET title = ?, description = ?, location = ?, organizer = ?, contact = ?, category = ?, start_at = ?, end_at = ?, updated_at = ?
      WHERE id = ?
    `, [title, description, location, organizer, contact, category, startAt, endAt, new Date().toISOString(), req.params.id]);

    // 获取更新后的活动信息
    const updatedActivities = await query(`
      SELECT a.*, u.display_name as author_display_name, u.role as author_role
      FROM activities a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE a.id = ?
    `, [req.params.id]);

    const activity = updatedActivities[0];
    const mappedActivity = {
      id: activity.id,
      title: activity.title,
      description: activity.description,
      location: activity.location || "",
      organizer: activity.organizer || "",
      contact: activity.contact || "",
      category: activity.category,
      startAt: activity.start_at,
      endAt: activity.end_at,
      createdAt: activity.created_at,
      updatedAt: activity.updated_at,
      publisherRole: activity.publisher_role,
      author: {
        id: activity.user_id,
        displayName: activity.author_display_name,
        role: activity.author_role,
      },
    };

    res.json({ activity: mappedActivity });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "更新失败" });
  }
});

// 删除活动
app.delete("/api/activities/:id", authMiddleware(true), async (req, res) => {
  try {
    const activities = await query("SELECT * FROM activities WHERE id = ?", [req.params.id]);
    if (activities.length === 0) {
      return res.status(404).json({ error: "未找到活动" });
    }

    const existing = activities[0];
    const admin = await isPlatformAdmin(req.user.id);
    if (existing.user_id !== req.user.id && !admin) {
      return res.status(403).json({ error: "只有发布者或平台管理员可以删除该活动" });
    }

    await query("DELETE FROM activities WHERE id = ?", [req.params.id]);
    res.status(204).send();
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "删除失败" });
  }
});

// 获取活动评论
app.get("/api/activities/:id/comments", async (req, res) => {
  try {
    const activities = await query("SELECT id FROM activities WHERE id = ?", [req.params.id]);
    if (activities.length === 0) {
      return res.status(404).json({ error: "活动不存在" });
    }

    const comments = await query(`
      SELECT c.*, u.display_name, u.role
      FROM comments c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.activity_id = ?
      ORDER BY c.created_at DESC
    `, [req.params.id]);

    const mappedComments = comments.map(comment => ({
      id: comment.id,
      content: comment.content,
      createdAt: comment.created_at,
      author: {
        id: comment.user_id,
        displayName: comment.display_name,
        role: comment.role,
      },
    }));

    res.json(mappedComments);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "获取评论失败" });
  }
});

// 发表评论
app.post("/api/activities/:id/comments", authMiddleware(true), async (req, res) => {
  try {
    const activities = await query("SELECT id FROM activities WHERE id = ?", [req.params.id]);
    if (activities.length === 0) {
      return res.status(404).json({ error: "活动不存在" });
    }

    const content = String(req.body.content || "").trim();
    if (!content) return res.status(400).json({ error: "评论内容不能为空" });
    if (content.length > 2000) return res.status(400).json({ error: "评论内容不能超过 2000 字" });

    const id = randomUUID();
    const now = new Date().toISOString();

    await query(`
      INSERT INTO comments (id, activity_id, user_id, content, created_at)
      VALUES (?, ?, ?, ?, ?)
    `, [id, req.params.id, req.user.id, content, now]);

    // 获取创建的评论信息
    const comments = await query(`
      SELECT c.*, u.display_name, u.role
      FROM comments c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.id = ?
    `, [id]);

    const comment = comments[0];
    const responseComment = {
      id: comment.id,
      content: comment.content,
      createdAt: comment.created_at,
      author: {
        id: comment.user_id,
        displayName: comment.display_name,
        role: comment.role,
      },
    };

    res.status(201).json(responseComment);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "发表评论失败" });
  }
});

// 删除评论
app.delete("/api/comments/:id", authMiddleware(true), async (req, res) => {
  try {
    const comments = await query("SELECT * FROM comments WHERE id = ?", [req.params.id]);
    if (comments.length === 0) {
      return res.status(404).json({ error: "评论不存在" });
    }

    const comment = comments[0];
    const admin = await isPlatformAdmin(req.user.id);
    if (comment.user_id !== req.user.id && !admin) {
      return res.status(403).json({ error: "只有评论作者或平台管理员可以删除该评论" });
    }

    await query("DELETE FROM comments WHERE id = ?", [req.params.id]);
    res.status(204).send();
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "删除评论失败" });
  }
});

// 启动服务器
async function start() {
  const connected = await testConnection();
  if (!connected) {
    console.error("❌ 数据库连接失败，请检查配置");
    process.exit(1);
  }

  await initDatabase();
  app.listen(PORT, () => {
    console.log(`🚀 校园活动API服务器运行在 http://localhost:${PORT}`);
    console.log(`📊 数据库: ${process.env.MYSQL_DATABASE || 'program'}`);
    console.log(`🔧 环境: ${process.env.NODE_ENV || 'development'}`);
  });
}

start().catch((e) => {
  console.error("❌ 服务器启动失败:", e);
  process.exit(1);
});
