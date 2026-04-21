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

app.get("/api/health", async (_req, res) => {
  try {
    await db.read();
    res.json({ ok: true, db: true });
  } catch {
    res.json({ ok: true, db: false });
  }
});

app.post("/api/auth/register", async (req, res) => {
  await db.read();
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

  // 检查邮箱是否已存在
  const existingUser = db.data.users.find((user) => user.email === email);
  if (existingUser) {
    return res.status(409).json({ error: "该邮箱已注册" });
  }

  const id = randomUUID();
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const now = new Date().toISOString();

  try {
    db.data.users.push({
      id,
      email,
      password_hash: passwordHash,
      display_name: displayName,
      role,
      created_at: now,
    });
    await db.write();
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "注册失败" });
  }

  const user = await userPublicFields(id, email, displayName, role);
  const token = signUserToken(user);
  res.status(201).json({ token, user });
});

app.post("/api/auth/login", async (req, res) => {
  await db.read();
  const email = String(req.body?.email || "").trim().toLowerCase();
  const password = String(req.body?.password || "");
  if (!email || !password) {
    return res.status(400).json({ error: "请填写邮箱和密码" });
  }

  const user = db.data.users.find((user) => user.email === email);
  if (!user) return res.status(401).json({ error: "邮箱或密码错误" });

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: "邮箱或密码错误" });

  const userPublic = await userPublicFields(user.id, user.email, user.display_name, user.role);
  res.json({ token: signUserToken(userPublic), user: userPublic });
});

app.get("/api/auth/me", authMiddleware(true), async (req, res) => {
  await db.read();
  const user = db.data.users.find((user) => user.id === req.user.id);
  if (!user) return res.status(404).json({ error: "用户不存在" });
  const userPublic = await userPublicFields(user.id, user.email, user.display_name, user.role);
  res.json({ user: userPublic });
});

app.get("/api/activities", async (req, res) => {
  await db.read();
  const { q, category, sort, publisher } = req.query;

  let activities = db.data.activities.map((activity) => {
    const author = db.data.users.find((user) => user.id === activity.user_id);
    return {
      ...activity,
      author_display_name: author?.display_name,
      author_role: author?.role,
    };
  });

  // 过滤
  if (typeof q === "string" && q.trim()) {
    const searchTerm = q.trim().toLowerCase();
    activities = activities.filter((activity) => {
      return (
        activity.title.toLowerCase().includes(searchTerm) ||
        activity.description.toLowerCase().includes(searchTerm) ||
        activity.location.toLowerCase().includes(searchTerm) ||
        activity.organizer.toLowerCase().includes(searchTerm)
      );
    });
  }
  if (typeof category === "string" && category && category !== "all") {
    activities = activities.filter((activity) => activity.category === category);
  }
  if (publisher === "student" || publisher === "school") {
    activities = activities.filter((activity) => activity.publisher_role === publisher);
  }

  // 排序
  if (sort === "startAsc") {
    activities.sort((a, b) => new Date(a.start_at) - new Date(b.start_at));
  } else if (sort === "startDesc") {
    activities.sort((a, b) => new Date(b.start_at) - new Date(a.start_at));
  } else {
    activities.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  const mappedActivities = activities.map(mapActivityRow);
  res.json({ activities: mappedActivities });
});

app.get("/api/activities/:id", async (req, res) => {
  await db.read();
  const activity = db.data.activities.find((activity) => activity.id === req.params.id);
  if (!activity) return res.status(404).json({ error: "未找到活动" });

  const author = db.data.users.find((user) => user.id === activity.user_id);
  const activityWithAuthor = {
    ...activity,
    author_display_name: author?.display_name,
    author_role: author?.role,
  };

  const mappedActivity = mapActivityRow(activityWithAuthor);
  res.json(mappedActivity);
});

app.post("/api/activities", authMiddleware(true), async (req, res) => {
  await db.read();
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
  const now = new Date().toISOString();

  try {
    const newActivity = {
      id,
      user_id: uid,
      publisher_role: publisherRole,
      title,
      description,
      location,
      organizer,
      contact,
      category,
      start_at: start.toISOString(),
      end_at: end ? end.toISOString() : null,
      created_at: now,
      updated_at: now,
    };

    db.data.activities.push(newActivity);
    await db.write();

    const author = db.data.users.find((user) => user.id === uid);
    const activityWithAuthor = {
      ...newActivity,
      author_display_name: author?.display_name,
      author_role: author?.role,
    };

    const mappedActivity = mapActivityRow(activityWithAuthor);
    res.status(201).json({ activity: mappedActivity });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "发布失败" });
  }
});

app.put("/api/activities/:id", authMiddleware(true), async (req, res) => {
  await db.read();
  const existing = db.data.activities.find((activity) => activity.id === req.params.id);
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

  try {
    Object.assign(existing, {
      title,
      description,
      location,
      organizer,
      contact,
      category,
      start_at: start.toISOString(),
      end_at: end ? end.toISOString() : null,
      updated_at: new Date().toISOString(),
    });
    await db.write();

    const author = db.data.users.find((user) => user.id === existing.user_id);
    const activityWithAuthor = {
      ...existing,
      author_display_name: author?.display_name,
      author_role: author?.role,
    };

    const mappedActivity = mapActivityRow(activityWithAuthor);
    res.json({ activity: mappedActivity });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "修改失败" });
  }
});

app.delete("/api/activities/:id", authMiddleware(true), async (req, res) => {
  await db.read();
  const existing = db.data.activities.find((activity) => activity.id === req.params.id);
  if (!existing) return res.status(404).json({ error: "未找到活动" });

  const admin = await isPlatformAdmin(req.user.id);
  if (existing.user_id !== req.user.id && !admin) {
    return res.status(403).json({ error: "只有发布者或平台管理员可以删除该活动" });
  }

  try {
    db.data.activities = db.data.activities.filter((activity) => activity.id !== req.params.id);
    await db.write();
    res.status(204).send();
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "删除失败" });
  }
});

// Comments API endpoints
app.get("/api/activities/:id/comments", async (req, res) => {
  await db.read();
  const activity = db.data.activities.find((activity) => activity.id === req.params.id);
  if (!activity) return res.status(404).json({ error: "活动不存在" });

  const comments = db.data.comments
    .filter((comment) => comment.activity_id === req.params.id)
    .map((comment) => {
      const author = db.data.users.find((user) => user.id === comment.user_id);
      return {
        id: comment.id,
        content: comment.content,
        createdAt: comment.created_at,
        author: {
          id: author?.id,
          displayName: author?.display_name,
          role: author?.role,
        },
      };
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  res.json(comments);
});

app.post("/api/activities/:id/comments", authMiddleware(true), async (req, res) => {
  await db.read();
  const activity = db.data.activities.find((activity) => activity.id === req.params.id);
  if (!activity) return res.status(404).json({ error: "活动不存在" });

  const content = String(req.body.content || "").trim();
  if (!content) return res.status(400).json({ error: "评论内容不能为空" });
  if (content.length > 2000) return res.status(400).json({ error: "评论内容不能超过 2000 字" });

  const id = randomUUID();
  const now = new Date().toISOString();

  try {
    const newComment = {
      id,
      activity_id: req.params.id,
      user_id: req.user.id,
      content,
      created_at: now,
    };

    db.data.comments.push(newComment);
    await db.write();

    const author = db.data.users.find((user) => user.id === req.user.id);
    const responseComment = {
      id: newComment.id,
      content: newComment.content,
      createdAt: newComment.created_at,
      author: {
        id: author?.id,
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
  await db.read();
  const comment = db.data.comments.find((comment) => comment.id === req.params.id);
  if (!comment) return res.status(404).json({ error: "评论不存在" });

  const admin = await isPlatformAdmin(req.user.id);
  if (comment.user_id !== req.user.id && !admin) {
    return res.status(403).json({ error: "只有评论作者或平台管理员可以删除该评论" });
  }

  try {
    db.data.comments = db.data.comments.filter((c) => c.id !== req.params.id);
    await db.write();
    res.status(204).send();
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "删除评论失败" });
  }
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
