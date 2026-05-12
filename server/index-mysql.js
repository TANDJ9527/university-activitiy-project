import express from "express";
import cors from "cors";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";
import { query, testConnection, initDatabase } from "./mysql.js";

const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";
const SALT_ROUNDS = 10;

/** MySQL DATETIME(3)：写入时不要用带 Z 的 ISO 字符串 */
function mysqlDateTime3(d = new Date()) {
  const x = d instanceof Date ? d : new Date(d);
  return x.toISOString().replace("T", " ").replace("Z", "").slice(0, 23);
}

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

/** 解析 JWT，不强制登录（用于列表/详情附带收藏状态） */
function optionalAuth(req, res, next) {
  const raw = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!raw) {
    req.user = null;
    return next();
  }
  try {
    const payload = jwt.verify(raw, JWT_SECRET);
    req.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  } catch {
    req.user = null;
  }
  next();
}

/** 校方或平台管理员可直接增删改活动；学生需走审核 */
async function canMutateActivityDirectly(userId) {
  if (await isPlatformAdmin(userId)) return true;
  const rows = await query("SELECT role FROM users WHERE id = ?", [userId]);
  if (!rows.length) return false;
  return rows[0].role === "school";
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
    const now = mysqlDateTime3();

    await query(
      "INSERT INTO users (id, email, password_hash, display_name, role, created_at) VALUES (?, ?, ?, ?, ?, ?)",
      [id, email, passwordHash, displayName, role, now]
    );

    const user = await userPublicFields(id, email, displayName, role);
    const token = signUserToken(user);
    res.status(201).json({ token, user });
  } catch (e) {
    console.error(e);
    const code = e && typeof e === "object" && "code" in e ? e.code : undefined;
    if (code === "ER_ACCESS_DENIED_ERROR" || code === "ECONNREFUSED" || code === "ENOTFOUND") {
      return res.status(503).json({ error: "数据库暂不可用，请检查 MySQL 是否启动及 server/.env 配置" });
    }
    if (code === "ER_BAD_DB_ERROR") {
      return res.status(503).json({ error: "数据库不存在，请在 server 目录执行 npm run setup" });
    }
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
    const code = e && typeof e === "object" && "code" in e ? e.code : undefined;
    if (code === "ER_ACCESS_DENIED_ERROR" || code === "ECONNREFUSED" || code === "ENOTFOUND") {
      return res.status(503).json({ error: "数据库暂不可用，请检查 MySQL 是否启动及 server/.env 配置" });
    }
    if (code === "ER_BAD_DB_ERROR") {
      return res.status(503).json({ error: "数据库不存在，请在 server 目录执行 npm run setup" });
    }
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

app.put("/api/auth/me", authMiddleware(true), async (req, res) => {
  const displayName = String(req.body?.displayName ?? "").trim();
  if (!displayName || displayName.length > 100) {
    return res.status(400).json({ error: "昵称须为 1–100 字" });
  }
  try {
    await query("UPDATE users SET display_name = ? WHERE id = ?", [displayName, req.user.id]);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "更新失败" });
  }
  try {
    const users = await query("SELECT id, email, display_name, role FROM users WHERE id = ?", [req.user.id]);
    if (users.length === 0) return res.status(404).json({ error: "用户不存在" });
    const user = users[0];
    const publicUser = await userPublicFields(user.id, user.email, user.display_name, user.role);
    res.json({ user: publicUser });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "获取用户信息失败" });
  }
});

function toIso(v) {
  if (v == null) return null;
  if (v instanceof Date) return v.toISOString();
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

// 获取活动列表（与前端 listActivities 参数一致：category=all、publisher=all、sort=startAsc|startDesc|new）
app.get("/api/activities", optionalAuth, async (req, res) => {
  try {
    const { q, category, sort, publisher } = req.query;

    let sql = `
      SELECT a.*, u.display_name as author_display_name, u.role as author_role
      ${req.user ? ", (fav.id IS NOT NULL) AS user_favorited" : ", 0 AS user_favorited"}
      FROM activities a
      JOIN users u ON a.user_id = u.id
      ${req.user ? "LEFT JOIN activity_favorites fav ON fav.activity_id = a.id AND fav.user_id = ?" : ""}
    `;
    const params = [];
    if (req.user) params.push(req.user.id);
    const conditions = [];

    if (typeof q === "string" && q.trim()) {
      const searchTerm = `%${q.trim().toLowerCase()}%`;
      conditions.push(
        "(LOWER(a.title) LIKE ? OR LOWER(a.description) LIKE ? OR LOWER(a.location) LIKE ? OR LOWER(a.organizer) LIKE ?)"
      );
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }
    if (typeof category === "string" && category && category !== "all" && category !== "全部") {
      conditions.push("a.category = ?");
      params.push(category);
    }
    if (publisher === "student" || publisher === "school") {
      conditions.push("a.publisher_role = ?");
      params.push(publisher);
    }

    if (conditions.length > 0) {
      sql += " WHERE " + conditions.join(" AND ");
    }

    if (sort === "startDesc") {
      sql += " ORDER BY a.start_at DESC";
    } else if (sort === "new") {
      sql += " ORDER BY a.created_at DESC";
    } else {
      sql += " ORDER BY a.start_at ASC";
    }

    const activities = await query(sql, params);

    const mappedActivities = activities.map((activity) => ({
      id: activity.id,
      title: activity.title,
      description: activity.description,
      location: activity.location || "",
      organizer: activity.organizer || "",
      contact: activity.contact || "",
      category: activity.category,
      startAt: toIso(activity.start_at),
      endAt: toIso(activity.end_at),
      createdAt: toIso(activity.created_at),
      updatedAt: toIso(activity.updated_at),
      publisherRole: activity.publisher_role,
      favorited: Boolean(activity.user_favorited),
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
app.get("/api/activities/:id", optionalAuth, async (req, res) => {
  try {
    const activities = await query(
      `
      SELECT a.*, u.display_name as author_display_name, u.role as author_role
      ${req.user ? ", (fav.id IS NOT NULL) AS user_favorited" : ", 0 AS user_favorited"}
      FROM activities a
      LEFT JOIN users u ON a.user_id = u.id
      ${req.user ? "LEFT JOIN activity_favorites fav ON fav.activity_id = a.id AND fav.user_id = ?" : ""}
      WHERE a.id = ?
    `,
      req.user ? [req.user.id, req.params.id] : [req.params.id]
    );

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
      startAt: toIso(activity.start_at),
      endAt: toIso(activity.end_at),
      createdAt: toIso(activity.created_at),
      updatedAt: toIso(activity.updated_at),
      publisherRole: activity.publisher_role,
      favorited: Boolean(activity.user_favorited),
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
    if (!(await canMutateActivityDirectly(req.user.id))) {
      return res.status(403).json({
        error: "学生发布活动须先提交管理员审核。",
        code: "MODERATION_REQUIRED",
      });
    }

    const id = randomUUID();
    const uid = req.user.id;
    const publisherRole = req.user.role === "school" ? "school" : "student";
    const now = mysqlDateTime3();

    await query(`
      INSERT INTO activities (id, user_id, publisher_role, title, description, location, organizer, contact, category, start_at, end_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [id, uid, publisherRole, title, description, location, organizer, contact, category, mysqlDateTime3(start), end ? mysqlDateTime3(end) : null, now, now]);

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
      startAt: toIso(activity.start_at),
      endAt: toIso(activity.end_at),
      createdAt: toIso(activity.created_at),
      updatedAt: toIso(activity.updated_at),
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

    if (existing.user_id === req.user.id && !(await canMutateActivityDirectly(req.user.id))) {
      return res.status(403).json({
        error: "修改活动须提交管理员审核。",
        code: "MODERATION_REQUIRED",
      });
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

    const startSql = mysqlDateTime3(new Date(startAt));
    const endSql = endAt ? mysqlDateTime3(new Date(endAt)) : null;

    await query(`
      UPDATE activities 
      SET title = ?, description = ?, location = ?, organizer = ?, contact = ?, category = ?, start_at = ?, end_at = ?, updated_at = ?
      WHERE id = ?
    `, [title, description, location, organizer, contact, category, startSql, endSql, mysqlDateTime3(), req.params.id]);

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
      startAt: toIso(activity.start_at),
      endAt: toIso(activity.end_at),
      createdAt: toIso(activity.created_at),
      updatedAt: toIso(activity.updated_at),
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

    if (existing.user_id === req.user.id && !(await canMutateActivityDirectly(req.user.id))) {
      return res.status(403).json({
        error: "删除活动须提交管理员审核。",
        code: "MODERATION_REQUIRED",
      });
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
      ORDER BY c.created_at ASC
    `, [req.params.id]);

    const mappedComments = comments.map((comment) => ({
      id: comment.id,
      content: comment.content,
      createdAt: toIso(comment.created_at),
      author: {
        id: comment.user_id,
        displayName: comment.display_name,
        role: comment.role,
      },
    }));

    res.json({ comments: mappedComments });
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
    const now = mysqlDateTime3();

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
      createdAt: toIso(comment.created_at),
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

function parseJsonPayload(raw) {
  if (raw == null) return null;
  if (typeof raw === "object") return raw;
  try {
    return JSON.parse(String(raw));
  } catch {
    return null;
  }
}

function validateActivityPayload(body) {
  const title = String(body.title || "").trim();
  const description = String(body.description || "").trim();
  const location = String(body.location || "").trim();
  const organizer = String(body.organizer || "").trim();
  const contact = String(body.contact || "").trim();
  const category = String(body.category || "其他").trim();
  const startAt = body.startAt;
  const endAt = body.endAt || null;
  if (!title || title.length > 120) return { error: "标题必填且不超过 120 字" };
  if (!description || description.length > 8000) return { error: "活动说明必填且不超过 8000 字" };
  if (!startAt) return { error: "请填写开始时间" };
  const start = new Date(startAt);
  if (Number.isNaN(start.getTime())) return { error: "开始时间格式无效" };
  let end = null;
  if (endAt) {
    end = new Date(endAt);
    if (Number.isNaN(end.getTime())) return { error: "结束时间格式无效" };
  }
  return {
    ok: true,
    data: { title, description, location, organizer, contact, category, start, end },
  };
}

async function mapModerationRow(row) {
  const payload = parseJsonPayload(row.payload);
  const requester = await query("SELECT email, display_name FROM users WHERE id = ?", [row.requester_id]);
  const r = requester[0] || {};
  return {
    id: row.id,
    type: row.type,
    status: row.status,
    activityId: row.activity_id,
    payload,
    requesterId: row.requester_id,
    requesterName: r.display_name,
    requesterEmail: r.email,
    createdAt: toIso(row.created_at),
    reviewedAt: toIso(row.reviewed_at),
    reviewerId: row.reviewer_id,
    rejectReason: row.reject_reason,
  };
}

// 学生提交：新建 / 修改 / 删除 活动（待管理员审核）
app.post("/api/moderation/requests", authMiddleware(true), async (req, res) => {
  const type = String(req.body?.type || "").toLowerCase();
  if (!["create", "update", "delete"].includes(type)) {
    return res.status(400).json({ error: "type 须为 create、update 或 delete" });
  }

  if (await canMutateActivityDirectly(req.user.id)) {
    return res.status(400).json({ error: "当前账号无需走审核，请直接使用发布/编辑/删除功能" });
  }

  try {
    if (type === "create") {
      const rawPayload = req.body.payload;
      if (!rawPayload || typeof rawPayload !== "object") {
        return res.status(400).json({ error: "请提供 payload 对象（活动字段）" });
      }
      const v = validateActivityPayload(rawPayload);
      if (!v.ok) return res.status(400).json({ error: v.error });
      const dup = await query(
        "SELECT id FROM moderation_requests WHERE status = 'pending' AND type = 'create' AND requester_id = ? LIMIT 1",
        [req.user.id]
      );
      if (dup.length > 0) {
        return res.status(409).json({ error: "您已有待审核的发布申请，请等待处理后再提交" });
      }
      const id = randomUUID();
      const now = mysqlDateTime3();
      await query(
        `INSERT INTO moderation_requests (id, type, requester_id, activity_id, payload, status, created_at)
         VALUES (?, 'create', ?, NULL, ?, 'pending', ?)`,
        [id, req.user.id, JSON.stringify(v.data), now]
      );
      const rows = await query("SELECT * FROM moderation_requests WHERE id = ?", [id]);
      return res.status(201).json({ request: await mapModerationRow(rows[0]) });
    }

    const activityId = String(req.body?.activityId || "").trim();
    if (!activityId) return res.status(400).json({ error: "请提供 activityId" });

    const acts = await query("SELECT * FROM activities WHERE id = ?", [activityId]);
    if (!acts.length) return res.status(404).json({ error: "活动不存在" });
    const act = acts[0];
    if (act.user_id !== req.user.id) {
      return res.status(403).json({ error: "只能为自己的活动提交审核" });
    }

    if (type === "update") {
      const rawPayload = req.body.payload;
      if (!rawPayload || typeof rawPayload !== "object") {
        return res.status(400).json({ error: "请提供 payload 对象（修改后的活动字段）" });
      }
      const v = validateActivityPayload(rawPayload);
      if (!v.ok) return res.status(400).json({ error: v.error });
      const dup = await query(
        "SELECT id FROM moderation_requests WHERE status = 'pending' AND type = 'update' AND activity_id = ? LIMIT 1",
        [activityId]
      );
      if (dup.length > 0) {
        return res.status(409).json({ error: "该活动已有待审核的修改申请" });
      }
      const id = randomUUID();
      const now = mysqlDateTime3();
      await query(
        `INSERT INTO moderation_requests (id, type, requester_id, activity_id, payload, status, created_at)
         VALUES (?, 'update', ?, ?, ?, 'pending', ?)`,
        [id, req.user.id, activityId, JSON.stringify(v.data), now]
      );
      const rows = await query("SELECT * FROM moderation_requests WHERE id = ?", [id]);
      return res.status(201).json({ request: await mapModerationRow(rows[0]) });
    }

    if (type === "delete") {
      const dup = await query(
        "SELECT id FROM moderation_requests WHERE status = 'pending' AND type = 'delete' AND activity_id = ? LIMIT 1",
        [activityId]
      );
      if (dup.length > 0) {
        return res.status(409).json({ error: "该活动已有待审核的删除申请" });
      }
      const id = randomUUID();
      const now = mysqlDateTime3();
      await query(
        `INSERT INTO moderation_requests (id, type, requester_id, activity_id, payload, status, created_at)
         VALUES (?, 'delete', ?, ?, NULL, 'pending', ?)`,
        [id, req.user.id, activityId, now]
      );
      const rows = await query("SELECT * FROM moderation_requests WHERE id = ?", [id]);
      return res.status(201).json({ request: await mapModerationRow(rows[0]) });
    }
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "提交审核失败" });
  }
});

// 管理员：待审核列表
app.get("/api/admin/moderation/pending", authMiddleware(true), async (req, res) => {
  try {
    if (!(await isPlatformAdmin(req.user.id))) {
      return res.status(403).json({ error: "需要平台管理员权限" });
    }
    const rows = await query(
      `SELECT * FROM moderation_requests WHERE status = 'pending' ORDER BY created_at ASC`
    );
    const requests = [];
    for (const row of rows) {
      requests.push(await mapModerationRow(row));
    }
    res.json({ requests });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "加载待审核失败" });
  }
});

// 管理员：通过审核
app.post("/api/admin/moderation/:id/approve", authMiddleware(true), async (req, res) => {
  try {
    if (!(await isPlatformAdmin(req.user.id))) {
      return res.status(403).json({ error: "需要平台管理员权限" });
    }
    const rows = await query("SELECT * FROM moderation_requests WHERE id = ?", [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: "申请不存在" });
    const m = rows[0];
    if (m.status !== "pending") return res.status(409).json({ error: "该申请已处理" });

    const now = mysqlDateTime3();

    if (m.type === "create") {
      const p = parseJsonPayload(m.payload);
      if (!p || !p.title) return res.status(400).json({ error: "申请数据无效" });
      const startRaw = p.start ?? p.startAt;
      const endRaw = p.end ?? p.endAt;
      if (!startRaw) return res.status(400).json({ error: "申请数据无效" });
      const id = randomUUID();
      const publisherRole = "student";
      await query(
        `INSERT INTO activities (id, user_id, publisher_role, title, description, location, organizer, contact, category, start_at, end_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          m.requester_id,
          publisherRole,
          p.title,
          p.description,
          p.location || "",
          p.organizer || "",
          p.contact || "",
          p.category || "其他",
          mysqlDateTime3(new Date(startRaw)),
          endRaw ? mysqlDateTime3(new Date(endRaw)) : null,
          now,
          now,
        ]
      );
    } else if (m.type === "update") {
      const p = parseJsonPayload(m.payload);
      if (!p || !m.activity_id) return res.status(400).json({ error: "申请数据无效" });
      const startRaw = p.start ?? p.startAt;
      const endRaw = p.end ?? p.endAt;
      if (!startRaw) return res.status(400).json({ error: "申请数据无效" });
      await query(
        `UPDATE activities SET title = ?, description = ?, location = ?, organizer = ?, contact = ?, category = ?, start_at = ?, end_at = ?, updated_at = ?
         WHERE id = ?`,
        [
          p.title,
          p.description,
          p.location || "",
          p.organizer || "",
          p.contact || "",
          p.category || "其他",
          mysqlDateTime3(new Date(startRaw)),
          endRaw ? mysqlDateTime3(new Date(endRaw)) : null,
          now,
          m.activity_id,
        ]
      );
    } else if (m.type === "delete") {
      if (!m.activity_id) return res.status(400).json({ error: "申请数据无效" });
      await query("DELETE FROM activities WHERE id = ?", [m.activity_id]);
    }

    await query(
      `UPDATE moderation_requests SET status = 'approved', reviewer_id = ?, reviewed_at = ? WHERE id = ?`,
      [req.user.id, now, req.params.id]
    );

    const updated = await query("SELECT * FROM moderation_requests WHERE id = ?", [req.params.id]);
    res.json({ request: await mapModerationRow(updated[0]) });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "审核处理失败" });
  }
});

// 管理员：拒绝
app.post("/api/admin/moderation/:id/reject", authMiddleware(true), async (req, res) => {
  try {
    if (!(await isPlatformAdmin(req.user.id))) {
      return res.status(403).json({ error: "需要平台管理员权限" });
    }
    const rows = await query("SELECT * FROM moderation_requests WHERE id = ?", [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: "申请不存在" });
    const m = rows[0];
    if (m.status !== "pending") return res.status(409).json({ error: "该申请已处理" });
    const reason = String(req.body?.reason || "").trim().slice(0, 500);
    const now = mysqlDateTime3();
    await query(
      `UPDATE moderation_requests SET status = 'rejected', reviewer_id = ?, reviewed_at = ?, reject_reason = ? WHERE id = ?`,
      [req.user.id, now, reason || null, req.params.id]
    );
    const updated = await query("SELECT * FROM moderation_requests WHERE id = ?", [req.params.id]);
    res.json({ request: await mapModerationRow(updated[0]) });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "拒绝失败" });
  }
});

// 收藏 / 取消收藏（切换）
app.post("/api/activities/:id/favorite", authMiddleware(true), async (req, res) => {
  try {
    const act = await query("SELECT id FROM activities WHERE id = ?", [req.params.id]);
    if (!act.length) return res.status(404).json({ error: "活动不存在" });
    const existing = await query(
      "SELECT id FROM activity_favorites WHERE user_id = ? AND activity_id = ?",
      [req.user.id, req.params.id]
    );
    if (existing.length > 0) {
      await query("DELETE FROM activity_favorites WHERE user_id = ? AND activity_id = ?", [
        req.user.id,
        req.params.id,
      ]);
      return res.json({ favorited: false });
    }
    const fid = randomUUID();
    await query(
      `INSERT INTO activity_favorites (id, user_id, activity_id, created_at) VALUES (?, ?, ?, ?)`,
      [fid, req.user.id, req.params.id, mysqlDateTime3()]
    );
    return res.json({ favorited: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "收藏操作失败" });
  }
});

// 我的收藏列表（按收藏时间倒序）
app.get("/api/me/favorites", authMiddleware(true), async (req, res) => {
  try {
    const rows = await query(
      `SELECT a.*, u.display_name as author_display_name, u.role as author_role, fav.created_at AS favorited_at
       FROM activity_favorites fav
       JOIN activities a ON a.id = fav.activity_id
       JOIN users u ON a.user_id = u.id
       WHERE fav.user_id = ?
       ORDER BY fav.created_at DESC`,
      [req.user.id]
    );
    const activities = rows.map((activity) => ({
      id: activity.id,
      title: activity.title,
      description: activity.description,
      location: activity.location || "",
      organizer: activity.organizer || "",
      contact: activity.contact || "",
      category: activity.category,
      startAt: toIso(activity.start_at),
      endAt: toIso(activity.end_at),
      createdAt: toIso(activity.created_at),
      updatedAt: toIso(activity.updated_at),
      publisherRole: activity.publisher_role,
      favorited: true,
      favoritedAt: toIso(activity.favorited_at),
      author: {
        id: activity.user_id,
        displayName: activity.author_display_name,
        role: activity.author_role,
      },
    }));
    res.json({ activities });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "加载收藏失败" });
  }
});

// 清空收藏
app.delete("/api/me/favorites", authMiddleware(true), async (req, res) => {
  try {
    await query("DELETE FROM activity_favorites WHERE user_id = ?", [req.user.id]);
    res.status(204).send();
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "清空收藏失败" });
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
