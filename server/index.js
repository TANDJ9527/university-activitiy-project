import express from "express";
import cors from "cors";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";
import { pool, ensureSchema, mapActivityRow } from "./db.js";

const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";
const SALT_ROUNDS = 10;

const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: "1mb" }));

async function userPublicFields(userId, email, displayName, role) {
  const [pa] = await pool.execute(
    "SELECT 1 AS ok FROM platform_admins WHERE user_id = ? LIMIT 1",
    [userId]
  );
  return {
    id: userId,
    email,
    displayName,
    role,
    isPlatformAdmin: pa.length > 0,
  };
}

async function isPlatformAdmin(userId) {
  const [pa] = await pool.execute(
    "SELECT 1 AS ok FROM platform_admins WHERE user_id = ? LIMIT 1",
    [userId]
  );
  return pa.length > 0;
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

app.get("/api/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ ok: true, db: true });
  } catch {
    res.json({ ok: true, db: false });
  }
});

app.post("/api/auth/register", async (req, res) => {
  const body = req.body || {};
  const email = String(body.email || "")
    .trim()
    .toLowerCase();
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

  const id = randomUUID();
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  try {
    await pool.execute(
      "INSERT INTO users (id, email, password_hash, display_name, role) VALUES (?, ?, ?, ?, ?)",
      [id, email, passwordHash, displayName, role]
    );
  } catch (e) {
    if (e.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "该邮箱已注册" });
    }
    console.error(e);
    return res.status(500).json({ error: "注册失败" });
  }

  const user = await userPublicFields(id, email, displayName, role);
  const token = signUserToken(user);
  res.status(201).json({ token, user });
});

app.post("/api/auth/login", async (req, res) => {
  const email = String(req.body?.email || "")
    .trim()
    .toLowerCase();
  const password = String(req.body?.password || "");
  if (!email || !password) {
    return res.status(400).json({ error: "请填写邮箱和密码" });
  }

  const [rows] = await pool.execute(
    "SELECT id, email, password_hash AS passwordHash, display_name AS displayName, role FROM users WHERE email = ? LIMIT 1",
    [email]
  );
  const row = rows[0];
  if (!row) return res.status(401).json({ error: "邮箱或密码错误" });

  const ok = await bcrypt.compare(password, row.passwordHash);
  if (!ok) return res.status(401).json({ error: "邮箱或密码错误" });

  const user = await userPublicFields(row.id, row.email, row.displayName, row.role);
  res.json({ token: signUserToken(user), user });
});

app.get("/api/auth/me", authMiddleware(true), async (req, res) => {
  const [rows] = await pool.execute(
    "SELECT id, email, display_name AS displayName, role FROM users WHERE id = ? LIMIT 1",
    [req.user.id]
  );
  const row = rows[0];
  if (!row) return res.status(404).json({ error: "用户不存在" });
  const user = await userPublicFields(row.id, row.email, row.displayName, row.role);
  res.json({ user });
});

app.get("/api/activities", async (req, res) => {
  const { q, category, sort, publisher } = req.query;
  let sql = `
    SELECT a.id, a.user_id, a.publisher_role, a.title, a.description, a.location, a.organizer, a.contact,
           a.category, a.start_at, a.end_at, a.created_at, a.updated_at,
           u.display_name AS author_display_name, u.role AS author_role
    FROM activities a
    JOIN users u ON u.id = a.user_id
    WHERE 1=1
  `;
  const params = [];

  if (typeof q === "string" && q.trim()) {
    const s = `%${q.trim()}%`;
    sql += ` AND (
      a.title LIKE ? OR a.description LIKE ? OR a.location LIKE ? OR a.organizer LIKE ?
    )`;
    params.push(s, s, s, s);
  }
  if (typeof category === "string" && category && category !== "all") {
    sql += ` AND a.category = ?`;
    params.push(category);
  }
  if (publisher === "student" || publisher === "school") {
    sql += ` AND a.publisher_role = ?`;
    params.push(publisher);
  }

  if (sort === "startAsc") {
    sql += ` ORDER BY a.start_at ASC`;
  } else if (sort === "startDesc") {
    sql += ` ORDER BY a.start_at DESC`;
  } else {
    sql += ` ORDER BY a.created_at DESC`;
  }

  try {
    const [rows] = await pool.execute(sql, params);
    res.json({ activities: rows.map(mapActivityRow) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "读取活动列表失败" });
  }
});

app.get("/api/activities/:id", async (req, res) => {
  const [rows] = await pool.execute(
    `SELECT a.id, a.user_id, a.publisher_role, a.title, a.description, a.location, a.organizer, a.contact,
            a.category, a.start_at, a.end_at, a.created_at, a.updated_at,
            u.display_name AS author_display_name, u.role AS author_role
     FROM activities a
     JOIN users u ON u.id = a.user_id
     WHERE a.id = ? LIMIT 1`,
    [req.params.id]
  );
  const row = rows[0];
  if (!row) return res.status(404).json({ error: "未找到活动" });
  res.json(mapActivityRow(row));
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
    await pool.execute(
      `INSERT INTO activities
        (id, user_id, publisher_role, title, description, location, organizer, contact, category, start_at, end_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        start,
        end,
      ]
    );
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "发布失败" });
  }

  const [rows] = await pool.execute(
    `SELECT a.id, a.user_id, a.publisher_role, a.title, a.description, a.location, a.organizer, a.contact,
            a.category, a.start_at, a.end_at, a.created_at, a.updated_at,
            u.display_name AS author_display_name, u.role AS author_role
     FROM activities a
     JOIN users u ON u.id = a.user_id
     WHERE a.id = ? LIMIT 1`,
    [id]
  );
  res.status(201).json({ activity: mapActivityRow(rows[0]) });
});

app.put("/api/activities/:id", authMiddleware(true), async (req, res) => {
  const [existingRows] = await pool.execute(
    "SELECT id, user_id FROM activities WHERE id = ? LIMIT 1",
    [req.params.id]
  );
  const existing = existingRows[0];
  if (!existing) return res.status(404).json({ error: "未找到活动" });

  const admin = await isPlatformAdmin(req.user.id);
  if (existing.user_id !== req.user.id && !admin) {
    return res.status(403).json({ error: "只有发布者或平台管理员可以修改该活动" });
  }

  const body = req.body || {};
  const [curRows] = await pool.execute(
    `SELECT title, description, location, organizer, contact, category, start_at, end_at
     FROM activities WHERE id = ? LIMIT 1`,
    [req.params.id]
  );
  const cur = curRows[0];
  const title = body.title !== undefined ? String(body.title).trim() : cur.title;
  const description =
    body.description !== undefined ? String(body.description).trim() : cur.description;
  const location = body.location !== undefined ? String(body.location).trim() : cur.location;
  const organizer = body.organizer !== undefined ? String(body.organizer).trim() : cur.organizer;
  const contact = body.contact !== undefined ? String(body.contact).trim() : cur.contact;
  const category = body.category !== undefined ? String(body.category).trim() : cur.category;
  const startAt = body.startAt !== undefined ? body.startAt : cur.start_at;
  const endAt = body.endAt !== undefined ? body.endAt : cur.end_at;

  if (!title || title.length > 120) {
    return res.status(400).json({ error: "标题必填且不超过 120 字" });
  }
  if (!description || description.length > 8000) {
    return res.status(400).json({ error: "活动说明必填且不超过 8000 字" });
  }
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

  await pool.execute(
    `UPDATE activities SET
      title = ?, description = ?, location = ?, organizer = ?, contact = ?, category = ?,
      start_at = ?, end_at = ?
     WHERE id = ?`,
    [title, description, location, organizer, contact, category, start, end, req.params.id]
  );

  const [rows] = await pool.execute(
    `SELECT a.id, a.user_id, a.publisher_role, a.title, a.description, a.location, a.organizer, a.contact,
            a.category, a.start_at, a.end_at, a.created_at, a.updated_at,
            u.display_name AS author_display_name, u.role AS author_role
     FROM activities a
     JOIN users u ON u.id = a.user_id
     WHERE a.id = ? LIMIT 1`,
    [req.params.id]
  );
  res.json({ activity: mapActivityRow(rows[0]) });
});

app.delete("/api/activities/:id", authMiddleware(true), async (req, res) => {
  const [existingRows] = await pool.execute(
    "SELECT user_id FROM activities WHERE id = ? LIMIT 1",
    [req.params.id]
  );
  const existing = existingRows[0];
  if (!existing) return res.status(404).json({ error: "未找到活动" });

  const admin = await isPlatformAdmin(req.user.id);
  if (existing.user_id !== req.user.id && !admin) {
    return res.status(403).json({ error: "只有发布者或平台管理员可以删除该活动" });
  }

  await pool.execute("DELETE FROM activities WHERE id = ?", [req.params.id]);
  res.status(204).send();
});

async function start() {
  await ensureSchema();
  app.listen(PORT, () => {
    console.log(`Campus events API http://localhost:${PORT}`);
  });
}

start().catch((e) => {
  console.error(e);
  process.exit(1);
});
