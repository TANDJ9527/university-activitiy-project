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

function mapActivityRow(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    location: row.location,
    organizer: row.organizer,
    contact: row.contact,
    category: row.category,
    startAt: row.start_at ? new Date(row.start_at).toISOString() : null,
    endAt: row.end_at ? new Date(row.end_at).toISOString() : null,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null,
    publisherRole: row.publisher_role,
    author: {
      id: row.user_id,
      displayName: row.author_display_name,
      role: row.author_role,
    },
  };
}

app.get("/api/health", async (_req, res) => {
  try {
    await testConnection();
    res.json({ ok: true, db: true });
  } catch {
    res.json({ ok: true, db: false });
  }
});

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

  const existingUsers = await query("SELECT id FROM users WHERE email = ?", [email]);
  if (existingUsers.length > 0) {
    return res.status(409).json({ error: "该邮箱已注册" });
  }

  const id = randomUUID();
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  try {
    await query(
      "INSERT INTO users (id, email, password_hash, display_name, role) VALUES (?, ?, ?, ?, ?)",
      [id, email, passwordHash, displayName, role]
    );
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "注册失败" });
  }

  const user = await userPublicFields(id, email, displayName, role);
  const token = signUserToken(user);
  res.status(201).json({ token, user });
});

app.post("/api/auth/login", async (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const password = String(req.body?.password || "");
  if (!email || !password) {
    return res.status(400).json({ error: "请填写邮箱和密码" });
  }

  const users = await query("SELECT * FROM users WHERE email = ?", [email]);
  const user = users[0];
  if (!user) return res.status(401).json({ error: "邮箱或密码错误" });

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: "邮箱或密码错误" });

  const userPublic = await userPublicFields(user.id, user.email, user.display_name, user.role);
  res.json({ token: signUserToken(userPublic), user: userPublic });
});

app.get("/api/auth/me", authMiddleware(true), async (req, res) => {
  const users = await query("SELECT * FROM users WHERE id = ?", [req.user.id]);
  const user = users[0];
  if (!user) return res.status(404).json({ error: "用户不存在" });
  const userPublic = await userPublicFields(user.id, user.email, user.display_name, user.role);
  res.json({ user: userPublic });
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
  const users = await query("SELECT * FROM users WHERE id = ?", [req.user.id]);
  const user = users[0];
  if (!user) return res.status(404).json({ error: "用户不存在" });
  const userPublic = await userPublicFields(user.id, user.email, user.display_name, user.role);
  res.json({ user: userPublic });
});

app.get("/api/activities", async (req, res) => {
  const { q, category, sort, publisher } = req.query;

  let sql = `
    SELECT a.*, u.display_name as author_display_name, u.role as author_role
    FROM activities a
    JOIN users u ON a.user_id = u.id
  `;
  let params = [];
  let conditions = [];

  if (typeof q === "string" && q.trim()) {
    const searchTerm = q.trim().toLowerCase();
    conditions.push("(LOWER(a.title) LIKE ? OR LOWER(a.description) LIKE ? OR LOWER(a.location) LIKE ? OR LOWER(a.organizer) LIKE ?)");
    params.push(`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`);
  }
  if (typeof category === "string" && category && category !== "all") {
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

  try {
    const rows = await query(sql, params);
    const activities = rows.map(mapActivityRow);
    res.json({ activities });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "获取活动列表失败" });
  }
});

app.get("/api/activities/:id", async (req, res) => {
  const rows = await query(
    `SELECT a.*, u.display_name as author_display_name, u.role as author_role
     FROM activities a
     JOIN users u ON a.user_id = u.id
     WHERE a.id = ?`,
    [req.params.id]
  );

  const activityWithAuthor = rows[0];
  if (!activityWithAuthor) return res.status(404).json({ error: "未找到活动" });

  const mappedActivity = mapActivityRow(activityWithAuthor);
  res.json(mappedActivity);
});

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

  const id = randomUUID();
  const uid = req.user.id;
  const publisherRole = req.user.role === "school" ? "school" : "student";

  try {
    await query(
      `INSERT INTO activities (
        id, user_id, publisher_role, title, description, location, 
        organizer, contact, category, start_at, end_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        uid,
        publisherRole,
        title,
        description,
        location,
        organizer,
        contact,
        category,
        start.toISOString().replace('T', ' ').slice(0, 19),
        end ? end.toISOString().replace('T', ' ').slice(0, 19) : null,
      ]
    );

    const rows = await query(
      `SELECT a.*, u.display_name as author_display_name, u.role as author_role 
       FROM activities a 
       JOIN users u ON a.user_id = u.id 
       WHERE a.id = ?`,
      [id]
    );

    const activityWithAuthor = rows[0];
    const mappedActivity = mapActivityRow(activityWithAuthor);
    res.status(201).json({ activity: mappedActivity });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "发布失败" });
  }
});

app.put("/api/activities/:id", authMiddleware(true), async (req, res) => {
  const rows = await query("SELECT * FROM activities WHERE id = ?", [req.params.id]);
  const existing = rows[0];
  if (!existing) return res.status(404).json({ error: "未找到活动" });

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

  if (title !== undefined && (!title || title.length > 120)) {
    return res.status(400).json({ error: "标题必填且不超过 120 字" });
  }
  if (description !== undefined && (!description || description.length > 8000)) {
    return res.status(400).json({ error: "活动说明必填且不超过 8000 字" });
  }

  let start = null;
  if (startAt) {
    start = new Date(startAt);
    if (Number.isNaN(start.getTime())) {
      return res.status(400).json({ error: "开始时间格式无效" });
    }
  }
  let end = null;
  if (endAt) {
    end = new Date(endAt);
    if (Number.isNaN(end.getTime())) {
      return res.status(400).json({ error: "结束时间格式无效" });
    }
  }

  try {
    await query(
      `UPDATE activities SET 
        title = ?, description = ?, location = ?, organizer = ?, contact = ?, 
        category = ?, start_at = ?, end_at = ?
       WHERE id = ?`,
      [
        title,
        description,
        location,
        organizer,
        contact,
        category,
        start ? start.toISOString().replace('T', ' ').slice(0, 19) : existing.start_at,
        end ? end.toISOString().replace('T', ' ').slice(0, 19) : existing.end_at,
        req.params.id,
      ]
    );

    const updatedRows = await query(
      `SELECT a.*, u.display_name as author_display_name, u.role as author_role 
       FROM activities a 
       JOIN users u ON a.user_id = u.id 
       WHERE a.id = ?`,
      [req.params.id]
    );

    const activityWithAuthor = updatedRows[0];
    const mappedActivity = mapActivityRow(activityWithAuthor);
    res.json({ activity: mappedActivity });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "修改失败" });
  }
});

app.delete("/api/activities/:id", authMiddleware(true), async (req, res) => {
  const rows = await query("SELECT * FROM activities WHERE id = ?", [req.params.id]);
  const existing = rows[0];
  if (!existing) return res.status(404).json({ error: "未找到活动" });

  const admin = await isPlatformAdmin(req.user.id);
  if (existing.user_id !== req.user.id && !admin) {
    return res.status(403).json({ error: "只有发布者或平台管理员可以删除该活动" });
  }

  try {
    await query("DELETE FROM activities WHERE id = ?", [req.params.id]);
    res.status(204).send();
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "删除失败" });
  }
});

app.get("/api/activities/:id/comments", async (req, res) => {
  const rows = await query(
    `SELECT c.*, u.display_name, u.role 
     FROM comments c 
     JOIN users u ON c.user_id = u.id 
     WHERE c.activity_id = ? 
     ORDER BY c.created_at ASC`,
    [req.params.id]
  );

  const comments = rows.map((row) => ({
    id: row.id,
    content: row.content,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
    author: {
      id: row.user_id,
      displayName: row.display_name,
      role: row.role,
    },
  }));

  res.json({ comments });
});

app.post("/api/activities/:id/comments", authMiddleware(true), async (req, res) => {
  const content = String(req.body?.content || "").trim();
  if (!content) return res.status(400).json({ error: "请输入评论内容" });
  if (content.length > 2000) return res.status(400).json({ error: "评论内容不超过 2000 字" });

  const id = randomUUID();
  const now = new Date().toISOString();

  try {
    await query(
      "INSERT INTO comments (id, activity_id, user_id, content) VALUES (?, ?, ?, ?)",
      [id, req.params.id, req.user.id, content]
    );

    const rows = await query(
      "SELECT u.display_name, u.role FROM users u WHERE u.id = ?",
      [req.user.id]
    );

    const author = rows[0];
    const responseComment = {
      id,
      content,
      createdAt: now,
      author: {
        id: req.user.id,
        displayName: author?.display_name,
        role: author?.role,
      },
    };

    res.status(201).json(responseComment);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "发表评论失败" });
  }
});

app.delete("/api/comments/:id", authMiddleware(true), async (req, res) => {
  const rows = await query("SELECT * FROM comments WHERE id = ?", [req.params.id]);
  const comment = rows[0];
  if (!comment) return res.status(404).json({ error: "评论不存在" });

  const admin = await isPlatformAdmin(req.user.id);
  if (comment.user_id !== req.user.id && !admin) {
    return res.status(403).json({ error: "只有评论作者或平台管理员可以删除该评论" });
  }

  try {
    await query("DELETE FROM comments WHERE id = ?", [req.params.id]);
    res.status(204).send();
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "删除评论失败" });
  }
});

async function start() {
  await initDatabase();
  app.listen(PORT, () => {
    console.log(`🚀 校园活动API服务器运行在 http://localhost:${PORT}`);
  });
}

start().catch(console.error);