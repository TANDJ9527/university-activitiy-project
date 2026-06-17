import express from "express";
import cors from "cors";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";
import { query, testConnection, initDatabase } from "./mysql.js";
import { isQqEmail, validateCommentContent } from "./validators.js";
import { issueEmailCode, consumeEmailCode } from "./emailCodes.js";
import { applyModerationRequest, mapModerationRow } from "./moderation.js";

const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";
const SALT_ROUNDS = 10;

const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: "1mb" }));

async function userPublicFields(userId, email, displayName, studentId, realName, role, schoolApproved = true) {
  const admins = await query("SELECT user_id FROM platform_admins WHERE user_id = ?", [userId]);
  return {
    id: userId,
    email,
    displayName,
    studentId,
    realName,
    role,
    isPlatformAdmin: admins.length > 0,
    schoolApproved,
  };
}

async function isPlatformAdmin(userId) {
  const admins = await query("SELECT user_id FROM platform_admins WHERE user_id = ?", [userId]);
  return admins.length > 0;
}

async function canDirectPublishActivities(userId) {
  if (await isPlatformAdmin(userId)) return true;
  const users = await query("SELECT role FROM users WHERE id = ?", [userId]);
  return users.length > 0 && users[0].role === "school";
}

function adminOnly(req, res, next) {
  isPlatformAdmin(req.user.id)
    .then((ok) => {
      if (!ok) return res.status(403).json({ error: "仅平台管理员可访问" });
      next();
    })
    .catch(() => res.status(500).json({ error: "权限校验失败" }));
}

function mapCommentRow(row) {
  return {
    id: row.id,
    content: row.content,
    status: row.status || "approved",
    createdAt: toIso(row.created_at),
    author: {
      id: row.user_id,
      displayName: row.display_name,
      role: row.role,
    },
  };
}

function signUserToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function toIso(value) {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString();
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toISOString();
}

function mysqlDateTime3(d = new Date()) {
  const x = d instanceof Date ? d : new Date(d);
  const pad = (n) => String(n).padStart(2, "0");
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())} ${pad(x.getHours())}:${pad(x.getMinutes())}:${pad(x.getSeconds())}.${String(x.getMilliseconds()).padStart(3, "0")}`;
}

function mapActivityFromRow(
  row,
  { favorited = false, favoritedAt = null, registered = false, registeredAt = null } = {}
) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    location: row.location || "",
    organizer: row.organizer || "",
    contact: row.contact || "",
    category: row.category,
    startAt: toIso(row.start_at),
    endAt: toIso(row.end_at),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
    publisherRole: row.publisher_role,
    favorited: !!favorited,
    favoritedAt: favoritedAt ? toIso(favoritedAt) : null,
    registered: !!registered,
    registeredAt: registeredAt ? toIso(registeredAt) : null,
    author: {
      id: row.user_id,
      displayName: row.author_display_name,
      role: row.author_role,
    },
  };
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

// 发送邮箱验证码（注册 / 找回密码）
app.post("/api/auth/send-code", async (req, res) => {
  try {
    const email = String(req.body?.email || "")
      .trim()
      .toLowerCase();
    const purpose = req.body?.purpose === "reset_password" ? "reset_password" : "register";
    const result = await issueEmailCode(email, purpose);
    res.json(result);
  } catch (e) {
    const status = e.status || 500;
    return res.status(status).json({ error: e.message || "发送验证码失败" });
  }
});

// 用户注册（须 QQ 邮箱 + 验证码）
app.post("/api/auth/register", async (req, res) => {
  const body = req.body || {};
  const email = String(body.email || "")
    .trim()
    .toLowerCase();
  const password = String(body.password || "");
  const displayName = String(body.displayName || "").trim();
  const code = String(body.code || "").trim();
  const roleRaw = String(body.role || "student").toLowerCase();
  const role = roleRaw === "school" ? "school" : "student";
  const studentId = String(body.studentId || "").trim();
  const realName = String(body.realName || "").trim();

  if (!isQqEmail(email)) {
    return res.status(400).json({ error: "请使用 QQ 邮箱注册（例如 123456789@qq.com）" });
  }
  if (password.length < 6) return res.status(400).json({ error: "密码至少 6 位" });
  if (!displayName || displayName.length > 100) {
    return res.status(400).json({ error: "请填写昵称（不超过 100 字）" });
  }

  if (role === 'student') {
    if (!studentId || studentId.length > 50) {
      return res.status(400).json({ error: "请填写学号（不超过 50 字）" });
    }
    if (!realName || realName.length > 100) {
      return res.status(400).json({ error: "请填写真实姓名（不超过 100 字）" });
    }
  }

  try {
    await consumeEmailCode(email, "register", code);

    const existingUsers = await query("SELECT id FROM users WHERE email = ?", [email]);
    if (existingUsers.length > 0) {
      return res.status(409).json({ error: "该邮箱已注册" });
    }

    const id = randomUUID();
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const now = mysqlDateTime3();
    const schoolApproved = role === 'school' ? 0 : 1;

    await query(
      "INSERT INTO users (id, email, password_hash, display_name, student_id, real_name, role, school_approved, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [id, email, passwordHash, displayName, studentId || null, realName || null, role, schoolApproved, now]
    );

    if (role === 'school') {
      return res.status(201).json({ ok: true, message: "校方注册申请已提交，等待管理员审核通过后方可登录" });
    }

    const user = await userPublicFields(id, email, displayName, studentId || null, realName || null, role, true);
    const token = signUserToken(user);
    res.status(201).json({ token, user });
  } catch (e) {
    const status = e.status || 500;
    if (!e.status) console.error(e);
    return res.status(status).json({ error: e.message || "注册失败" });
  }
});

// 忘记密码：验证码通过后重置
app.post("/api/auth/reset-password", async (req, res) => {
  const email = String(req.body?.email || "")
    .trim()
    .toLowerCase();
  const code = String(req.body?.code || "").trim();
  const password = String(req.body?.password || "");

  if (!isQqEmail(email)) {
    return res.status(400).json({ error: "请使用注册时的 QQ 邮箱" });
  }
  if (password.length < 6) return res.status(400).json({ error: "新密码至少 6 位" });

  try {
    await consumeEmailCode(email, "reset_password", code);
    const users = await query("SELECT id FROM users WHERE email = ?", [email]);
    if (users.length === 0) return res.status(404).json({ error: "该邮箱尚未注册" });

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    await query("UPDATE users SET password_hash = ? WHERE id = ?", [passwordHash, users[0].id]);
    res.json({ ok: true, message: "密码已重置，请使用新密码登录" });
  } catch (e) {
    const status = e.status || 500;
    if (!e.status) console.error(e);
    return res.status(status).json({ error: e.message || "重置失败" });
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
    const users = await query("SELECT id, email, password_hash, display_name, student_id, real_name, role, school_approved FROM users WHERE email = ?", [email]);
    if (users.length === 0) {
      return res.status(401).json({ error: "邮箱或密码错误" });
    }

    const user = users[0];
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: "邮箱或密码错误" });
    }

    if (user.role === 'school' && !user.school_approved) {
      return res.status(403).json({ error: "您的校方账号正在审核中，请耐心等待管理员审核通过" });
    }

    const publicUser = await userPublicFields(user.id, user.email, user.display_name, user.student_id, user.real_name, user.role, Boolean(user.school_approved));
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
    const users = await query("SELECT id, email, display_name, student_id, real_name, role, school_approved FROM users WHERE id = ?", [req.user.id]);
    if (users.length === 0) {
      return res.status(404).json({ error: "用户不存在" });
    }

    const user = users[0];
    const publicUser = await userPublicFields(user.id, user.email, user.display_name, user.student_id, user.real_name, user.role, Boolean(user.school_approved));
    res.json({ user: publicUser });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "获取用户信息失败" });
  }
});

app.put("/api/auth/me", authMiddleware(true), async (req, res) => {
  const displayName = String(req.body?.displayName || "").trim();
  if (!displayName || displayName.length > 100) {
    return res.status(400).json({ error: "昵称须为 1–100 字" });
  }
  try {
    await query("UPDATE users SET display_name = ? WHERE id = ?", [displayName, req.user.id]);
    const users = await query("SELECT email, student_id, real_name, role, school_approved FROM users WHERE id = ?", [req.user.id]);
    const publicUser = await userPublicFields(
      req.user.id,
      users[0].email,
      displayName,
      users[0].student_id,
      users[0].real_name,
      users[0].role,
      Boolean(users[0].school_approved)
    );
    res.json({ user: publicUser });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "更新资料失败" });
  }
});

// 获取活动列表
app.get("/api/activities", authMiddleware(false), async (req, res) => {
  try {
    const userId = req.user?.id;
    let sql = `
      SELECT a.*, u.display_name as author_display_name, u.role as author_role
    `;
    if (userId) {
      sql += `, f.id as favorite_id, f.created_at as favorited_at, r.id as registration_id, r.created_at as registered_at`;
    }
    sql += `
      FROM activities a
      LEFT JOIN users u ON a.user_id = u.id
    `;
    const params = [];
    if (userId) {
      sql += ` LEFT JOIN activity_favorites f ON f.activity_id = a.id AND f.user_id = ?`;
      sql += ` LEFT JOIN activity_registrations r ON r.activity_id = a.id AND r.user_id = ?`;
      params.push(userId, userId);
    }
    const where = [];

    const q = req.query.q?.trim();
    if (q) {
      where.push(
        "(a.title LIKE ? OR a.description LIKE ? OR a.location LIKE ? OR a.organizer LIKE ?)"
      );
      const searchTerm = `%${q}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    const category = req.query.category?.trim();
    if (category && category !== "全部" && category !== "all") {
      where.push("a.category = ?");
      params.push(category);
    }

    const publisher = req.query.publisher?.trim();
    if (publisher && publisher !== "全部" && publisher !== "all") {
      where.push("a.publisher_role = ?");
      params.push(publisher);
    }

    if (where.length > 0) {
      sql += ` WHERE ${where.join(" AND ")}`;
    }

    const sort = req.query.sort?.trim();
    if (sort === "startAsc" || sort === "start_time_asc") {
      sql += ` ORDER BY a.start_at ASC`;
    } else if (sort === "startDesc" || sort === "start_time_desc") {
      sql += ` ORDER BY a.start_at DESC`;
    } else {
      sql += ` ORDER BY a.created_at DESC`;
    }

    const activities = await query(sql, params);

    const mappedActivities = activities.map((row) =>
      mapActivityFromRow(row, {
        favorited: !!row.favorite_id,
        favoritedAt: row.favorited_at,
        registered: !!row.registration_id,
        registeredAt: row.registered_at,
      })
    );

    res.json({ activities: mappedActivities });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "获取活动列表失败" });
  }
});

// 获取单个活动详情
app.get("/api/activities/:id", authMiddleware(false), async (req, res) => {
  try {
    const userId = req.user?.id;
    let sql = `
      SELECT a.*, u.display_name as author_display_name, u.role as author_role
    `;
    const params = [req.params.id];
    if (userId) {
      sql += `, f.id as favorite_id, f.created_at as favorited_at, r.id as registration_id, r.created_at as registered_at`;
    }
    sql += `
      FROM activities a
      LEFT JOIN users u ON a.user_id = u.id
    `;
    if (userId) {
      sql += ` LEFT JOIN activity_favorites f ON f.activity_id = a.id AND f.user_id = ?`;
      sql += ` LEFT JOIN activity_registrations r ON r.activity_id = a.id AND r.user_id = ?`;
      params.unshift(userId, userId);
    }
    sql += ` WHERE a.id = ?`;

    const activities = await query(sql, params);

    if (activities.length === 0) {
      return res.status(404).json({ error: "活动不存在" });
    }

    const row = activities[0];
    res.json(
      mapActivityFromRow(row, {
        favorited: !!row.favorite_id,
        favoritedAt: row.favorited_at,
        registered: !!row.registration_id,
        registeredAt: row.registered_at,
      })
    );
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "获取活动详情失败" });
  }
});

// 创建活动
app.post("/api/activities", authMiddleware(true), async (req, res) => {
  if (!(await canDirectPublishActivities(req.user.id))) {
    return res.status(403).json({
      error: "学生发布活动请使用「发布活动」提交审核，不能直接发布",
    });
  }

  const body = req.body || {};
  const title = String(body.title || "").trim();
  const description = String(body.description || "").trim();
  const location = String(body.location || "").trim();
  const organizer = String(body.organizer || "").trim();
  const contact = String(body.contact || "").trim();
  const category = String(body.category || "其他").trim();
  const startAt = body.startAt;
  const endAt = body.endAt || null;

  if (!title || title.length > 50) {
    return res.status(400).json({ error: "标题必填且不超过 50 字" });
  }
  if (!description || description.length > 1000) {
    return res.status(400).json({ error: "活动说明必填且不超过 1000 字" });
  }
  if (!location || location.length > 50) {
    return res.status(400).json({ error: "地点必填且不超过 50 字" });
  }
  if (!organizer || organizer.length > 50) {
    return res.status(400).json({ error: "主办方必填且不超过 50 字" });
  }
  if (!contact || contact.length > 50) {
    return res.status(400).json({ error: "联系方式必填且不超过 50 字" });
  }
  if (!category) {
    return res.status(400).json({ error: "请选择类别" });
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

    if (end && end <= start) {
      return res.status(400).json({ error: "结束时间必须晚于开始时间" });
    }

  try {
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
    if (existing.user_id === req.user.id && !(await canDirectPublishActivities(req.user.id))) {
      return res.status(403).json({ error: "学生修改活动请提交审核申请" });
    }

    const body = req.body || {};
    const title = body.title !== undefined ? String(body.title).trim() : existing.title;
    const description = body.description !== undefined ? String(body.description).trim() : existing.description;
    const location = body.location !== undefined ? String(body.location).trim() : existing.location;
    const organizer = body.organizer !== undefined ? String(body.organizer).trim() : existing.organizer;
    const contact = body.contact !== undefined ? String(body.contact).trim() : existing.contact;
    const category = body.category !== undefined ? String(body.category).trim() : existing.category;
    const startAtRaw = body.startAt !== undefined ? body.startAt : existing.start_at;
    const endAtRaw = body.endAt !== undefined ? body.endAt : existing.end_at;
    const start = new Date(startAtRaw);
    if (Number.isNaN(start.getTime())) {
      return res.status(400).json({ error: "开始时间格式无效" });
    }
    let end = null;
    if (endAtRaw) {
      end = new Date(endAtRaw);
      if (Number.isNaN(end.getTime())) {
        return res.status(400).json({ error: "结束时间格式无效" });
      }
    }
    if (end && end <= start) {
      return res.status(400).json({ error: "结束时间必须晚于开始时间" });
    }
    const startAt = mysqlDateTime3(start);
    const endAt = end ? mysqlDateTime3(end) : null;

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
    `, [title, description, location, organizer, contact, category, startAt, endAt, mysqlDateTime3(), req.params.id]);

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
    if (existing.user_id === req.user.id && !(await canDirectPublishActivities(req.user.id))) {
      return res.status(403).json({ error: "学生删除活动请提交审核申请" });
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

    const comments = await query(
      `
      SELECT c.*, u.display_name, u.role
      FROM comments c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.activity_id = ? AND c.status = 'approved'
      ORDER BY c.created_at DESC
    `,
      [req.params.id]
    );

    res.json({ comments: comments.map(mapCommentRow) });
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

    const validated = validateCommentContent(req.body.content);
    if (!validated.ok) return res.status(400).json({ error: validated.error });

    const id = randomUUID();
    const now = mysqlDateTime3();

    await query(
      `INSERT INTO comments (id, activity_id, user_id, content, status, created_at)
       VALUES (?, ?, ?, ?, 'pending', ?)`,
      [id, req.params.id, req.user.id, validated.content, now]
    );

    const comments = await query(
      `
      SELECT c.*, u.display_name, u.role
      FROM comments c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.id = ?
    `,
      [id]
    );

    res.status(201).json({
      comment: mapCommentRow(comments[0]),
      message: "评论已提交，管理员审核通过后将显示在评论区",
    });
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
    if (!admin && comment.user_id !== req.user.id) {
      return res.status(403).json({ error: "只能删除自己的评论" });
    }

    await query("DELETE FROM comments WHERE id = ?", [req.params.id]);
    res.status(204).send();
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "删除评论失败" });
  }
});

// 收藏 / 取消收藏活动
app.post("/api/activities/:id/favorite", authMiddleware(true), async (req, res) => {
  try {
    const activities = await query("SELECT id FROM activities WHERE id = ?", [req.params.id]);
    if (activities.length === 0) {
      return res.status(404).json({ error: "活动不存在" });
    }

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

    await query(
      "INSERT INTO activity_favorites (id, user_id, activity_id, created_at) VALUES (?, ?, ?, ?)",
      [randomUUID(), req.user.id, req.params.id, mysqlDateTime3()]
    );
    res.json({ favorited: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "收藏操作失败" });
  }
});

// 我的收藏列表
app.get("/api/me/favorites", authMiddleware(true), async (req, res) => {
  try {
    const rows = await query(
      `
      SELECT a.*, u.display_name as author_display_name, u.role as author_role, f.created_at as favorited_at
      FROM activity_favorites f
      INNER JOIN activities a ON a.id = f.activity_id
      LEFT JOIN users u ON a.user_id = u.id
      WHERE f.user_id = ?
      ORDER BY f.created_at DESC
    `,
      [req.user.id]
    );

    const activities = rows.map((row) =>
      mapActivityFromRow(row, { favorited: true, favoritedAt: row.favorited_at })
    );
    res.json({ activities });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "获取收藏列表失败" });
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

// 报名活动
app.post("/api/activities/:id/register", authMiddleware(true), async (req, res) => {
  try {
    const activities = await query("SELECT id FROM activities WHERE id = ?", [req.params.id]);
    if (activities.length === 0) return res.status(404).json({ error: "活动不存在" });

    const existing = await query(
      "SELECT id FROM activity_registrations WHERE user_id = ? AND activity_id = ?",
      [req.user.id, req.params.id]
    );
    if (existing.length > 0) {
      return res.status(409).json({ error: "您已报名该活动", registered: true });
    }

    await query(
      "INSERT INTO activity_registrations (id, user_id, activity_id, created_at) VALUES (?, ?, ?, ?)",
      [randomUUID(), req.user.id, req.params.id, mysqlDateTime3()]
    );
    res.status(201).json({ registered: true, message: "报名成功" });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "报名失败" });
  }
});

// 取消报名
app.delete("/api/activities/:id/register", authMiddleware(true), async (req, res) => {
  try {
    const result = await query(
      "DELETE FROM activity_registrations WHERE user_id = ? AND activity_id = ?",
      [req.user.id, req.params.id]
    );
    const affected = result?.affectedRows ?? 0;
    if (affected === 0) {
      return res.status(404).json({ error: "您尚未报名该活动" });
    }
    res.json({ registered: false, message: "已取消报名" });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "取消报名失败" });
  }
});

// 我的报名列表
app.get("/api/me/registrations", authMiddleware(true), async (req, res) => {
  try {
    const rows = await query(
      `
      SELECT a.*, u.display_name as author_display_name, u.role as author_role, r.created_at as registered_at
      FROM activity_registrations r
      INNER JOIN activities a ON a.id = r.activity_id
      LEFT JOIN users u ON a.user_id = u.id
      WHERE r.user_id = ?
      ORDER BY r.created_at DESC
    `,
      [req.user.id]
    );
    const activities = rows.map((row) =>
      mapActivityFromRow(row, { registered: true, registeredAt: row.registered_at })
    );
    res.json({ activities });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "获取报名列表失败" });
  }
});

// 学生活动审核申请
app.post("/api/moderation/requests", authMiddleware(true), async (req, res) => {
  try {
    const body = req.body || {};
    const type = body.type;
    if (!["create", "update", "delete"].includes(type)) {
      return res.status(400).json({ error: "无效的申请类型" });
    }

    const admin = await isPlatformAdmin(req.user.id);
    const canSchool = await canDirectPublishActivities(req.user.id);
    if (canSchool || admin) {
      return res.status(400).json({ error: "校方或管理员请直接发布/修改活动" });
    }

    const id = randomUUID();
    const now = mysqlDateTime3();
    const payload = body.payload ? JSON.stringify(body.payload) : null;
    const activityId = body.activityId || null;

    if (type !== "create" && !activityId) {
      return res.status(400).json({ error: "请指定活动 ID" });
    }

    if (type !== "create") {
      const acts = await query("SELECT user_id FROM activities WHERE id = ?", [activityId]);
      if (acts.length === 0) return res.status(404).json({ error: "活动不存在" });
      if (acts[0].user_id !== req.user.id) {
        return res.status(403).json({ error: "只能对自己的活动提交修改或删除申请" });
      }
    }

    await query(
      `INSERT INTO moderation_requests (id, type, requester_id, activity_id, payload, status, created_at)
       VALUES (?, ?, ?, ?, ?, 'pending', ?)`,
      [id, type, req.user.id, activityId, payload, now]
    );

    const rows = await query("SELECT * FROM moderation_requests WHERE id = ?", [id]);
    res.status(201).json({ request: mapModerationRow(rows[0]) });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "提交审核失败" });
  }
});

app.get("/api/admin/moderation/pending", authMiddleware(true), adminOnly, async (req, res) => {
  try {
    const rows = await query(
      `
      SELECT m.*, u.display_name as requester_name, u.email as requester_email
      FROM moderation_requests m
      JOIN users u ON m.requester_id = u.id
      WHERE m.status = 'pending'
      ORDER BY m.created_at ASC
    `
    );
    res.json({ requests: rows.map(mapModerationRow) });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "获取待审核列表失败" });
  }
});

app.post("/api/admin/moderation/:id/approve", authMiddleware(true), adminOnly, async (req, res) => {
  try {
    const result = await applyModerationRequest(req.params.id, req.user.id);
    if (result.error) return res.status(result.status || 400).json({ error: result.error });
    const rows = await query("SELECT * FROM moderation_requests WHERE id = ?", [req.params.id]);
    res.json({ request: mapModerationRow(rows[0]) });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "审核通过失败" });
  }
});

app.post("/api/admin/moderation/:id/reject", authMiddleware(true), adminOnly, async (req, res) => {
  try {
    const rows = await query("SELECT * FROM moderation_requests WHERE id = ?", [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: "申请不存在" });
    if (rows[0].status !== "pending") return res.status(400).json({ error: "该申请已处理" });

    const reason = String(req.body?.reason || "").trim().slice(0, 500);
    await query(
      `UPDATE moderation_requests SET status = 'rejected', reviewer_id = ?, reviewed_at = ?, reject_reason = ? WHERE id = ?`,
      [req.user.id, mysqlDateTime3(), reason || null, req.params.id]
    );
    const updated = await query("SELECT * FROM moderation_requests WHERE id = ?", [req.params.id]);
    res.json({ request: mapModerationRow(updated[0]) });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "拒绝失败" });
  }
});

// 待审核评论
app.get("/api/admin/comments/pending", authMiddleware(true), adminOnly, async (req, res) => {
  try {
    const rows = await query(
      `
      SELECT c.*, u.display_name, u.role, a.title as activity_title
      FROM comments c
      JOIN users u ON c.user_id = u.id
      JOIN activities a ON c.activity_id = a.id
      WHERE c.status = 'pending'
      ORDER BY c.created_at ASC
    `
    );
    const comments = rows.map((row) => ({
      ...mapCommentRow(row),
      activityId: row.activity_id,
      activityTitle: row.activity_title,
    }));
    res.json({ comments });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "获取待审核评论失败" });
  }
});

app.post("/api/admin/comments/:id/approve", authMiddleware(true), adminOnly, async (req, res) => {
  try {
    const rows = await query("SELECT id FROM comments WHERE id = ?", [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: "评论不存在" });
    await query("UPDATE comments SET status = 'approved' WHERE id = ?", [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "通过评论失败" });
  }
});

app.delete("/api/admin/comments/:id", authMiddleware(true), adminOnly, async (req, res) => {
  try {
    await query("DELETE FROM comments WHERE id = ?", [req.params.id]);
    res.status(204).send();
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "删除评论失败" });
  }
});

app.get("/api/admin/users", authMiddleware(true), adminOnly, async (req, res) => {
  try {
    const rows = await query(`
      SELECT u.id, u.email, u.display_name, u.role, u.created_at, 
             CASE WHEN pa.user_id IS NOT NULL THEN 1 ELSE 0 END as is_platform_admin
      FROM users u
      LEFT JOIN platform_admins pa ON u.id = pa.user_id
      ORDER BY u.created_at DESC
    `);
    const users = rows.map((row) => ({
      id: row.id,
      email: row.email,
      displayName: row.display_name,
      role: row.role,
      createdAt: row.created_at,
      isPlatformAdmin: Boolean(row.is_platform_admin),
    }));
    res.json({ users });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "获取用户列表失败" });
  }
});

app.delete("/api/admin/users/:id", authMiddleware(true), adminOnly, async (req, res) => {
  try {
    const targetId = req.params.id;

    if (targetId === req.user.id) {
      return res.status(403).json({ error: "不能删除自己" });
    }

    const admins = await query("SELECT user_id FROM platform_admins WHERE user_id = ?", [targetId]);
    if (admins.length > 0) {
      return res.status(403).json({ error: "不能删除平台管理员" });
    }

    const users = await query("SELECT id FROM users WHERE id = ?", [targetId]);
    if (users.length === 0) {
      return res.status(404).json({ error: "用户不存在" });
    }

    await query("DELETE FROM users WHERE id = ?", [targetId]);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "删除用户失败" });
  }
});

app.get("/api/admin/school-registrations", authMiddleware(true), adminOnly, async (req, res) => {
  try {
    const rows = await query(`
      SELECT id, email, display_name, role, school_approved, created_at
      FROM users
      WHERE role = 'school'
      ORDER BY created_at DESC
    `);
    const requests = rows.map((row) => ({
      id: row.id,
      email: row.email,
      displayName: row.display_name,
      role: row.role,
      schoolApproved: Boolean(row.school_approved),
      createdAt: row.created_at,
    }));
    res.json({ requests });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "获取校方注册列表失败" });
  }
});

app.put("/api/admin/school-registrations/:id/approve", authMiddleware(true), adminOnly, async (req, res) => {
  try {
    const users = await query("SELECT id, role, school_approved FROM users WHERE id = ?", [req.params.id]);
    if (users.length === 0) {
      return res.status(404).json({ error: "用户不存在" });
    }
    if (users[0].role !== 'school') {
      return res.status(400).json({ error: "该用户不是校方账号" });
    }
    if (users[0].school_approved) {
      return res.status(400).json({ error: "该账号已通过审核" });
    }
    await query("UPDATE users SET school_approved = 1 WHERE id = ?", [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "审核失败" });
  }
});

app.put("/api/admin/school-registrations/:id/reject", authMiddleware(true), adminOnly, async (req, res) => {
  try {
    const users = await query("SELECT id, role, school_approved FROM users WHERE id = ?", [req.params.id]);
    if (users.length === 0) {
      return res.status(404).json({ error: "用户不存在" });
    }
    if (users[0].role !== 'school') {
      return res.status(400).json({ error: "该用户不是校方账号" });
    }
    if (users[0].school_approved) {
      return res.status(400).json({ error: "该账号已通过审核，无法拒绝" });
    }
    await query("DELETE FROM users WHERE id = ?", [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "拒绝失败" });
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
