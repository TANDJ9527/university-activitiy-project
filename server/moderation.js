import { randomUUID } from "crypto";
import { query } from "./mysql.js";

function mysqlDateTime3(d = new Date()) {
  const x = d instanceof Date ? d : new Date(d);
  const pad = (n) => String(n).padStart(2, "0");
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())} ${pad(x.getHours())}:${pad(x.getMinutes())}:${pad(x.getSeconds())}.${String(x.getMilliseconds()).padStart(3, "0")}`;
}

export async function applyModerationRequest(requestId, reviewerId) {
  const rows = await query("SELECT * FROM moderation_requests WHERE id = ?", [requestId]);
  if (rows.length === 0) return { error: "申请不存在", status: 404 };
  const req = rows[0];
  if (req.status !== "pending") return { error: "该申请已处理", status: 400 };

  const now = mysqlDateTime3();
  const payload = req.payload ? JSON.parse(req.payload) : null;

  if (payload) {
    if (!payload.title || payload.title.length > 50) {
      return { error: "标题必填且不超过 50 字", status: 400 };
    }
    if (!payload.description || payload.description.length > 1000) {
      return { error: "活动说明必填且不超过 1000 字", status: 400 };
    }
    if (!payload.location || payload.location.length > 50) {
      return { error: "地点必填且不超过 50 字", status: 400 };
    }
    if (!payload.organizer || payload.organizer.length > 50) {
      return { error: "主办方必填且不超过 50 字", status: 400 };
    }
    if (!payload.contact || payload.contact.length > 50) {
      return { error: "联系方式必填且不超过 50 字", status: 400 };
    }
    if (!payload.category) {
      return { error: "请选择类别", status: 400 };
    }
  }

  if (payload && payload.startAt) {
    const start = new Date(payload.startAt);
    if (Number.isNaN(start.getTime())) {
      return { error: "开始时间格式无效", status: 400 };
    }
    if (payload.endAt) {
      const end = new Date(payload.endAt);
      if (Number.isNaN(end.getTime())) {
        return { error: "结束时间格式无效", status: 400 };
      }
      if (end <= start) {
        return { error: "结束时间必须晚于开始时间", status: 400 };
      }
    }
  }

  if (req.type === "create" && payload) {
    const id = randomUUID();
    await query(
      `INSERT INTO activities (id, user_id, publisher_role, title, description, location, organizer, contact, category, start_at, end_at, created_at, updated_at)
       VALUES (?, ?, 'student', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        req.requester_id,
        payload.title,
        payload.description,
        payload.location || "",
        payload.organizer || "",
        payload.contact || "",
        payload.category || "其他",
        mysqlDateTime3(payload.startAt),
        payload.endAt ? mysqlDateTime3(payload.endAt) : null,
        now,
        now,
      ]
    );
    await query(
      `UPDATE moderation_requests SET status = 'approved', reviewer_id = ?, reviewed_at = ?, activity_id = ? WHERE id = ?`,
      [reviewerId, now, id, requestId]
    );
    return { ok: true };
  }

  if (req.type === "update" && req.activity_id && payload) {
    await query(
      `UPDATE activities SET title = ?, description = ?, location = ?, organizer = ?, contact = ?, category = ?, start_at = ?, end_at = ?, updated_at = ? WHERE id = ?`,
      [
        payload.title,
        payload.description,
        payload.location || "",
        payload.organizer || "",
        payload.contact || "",
        payload.category || "其他",
        mysqlDateTime3(payload.startAt),
        payload.endAt ? mysqlDateTime3(payload.endAt) : null,
        now,
        req.activity_id,
      ]
    );
    await query(
      `UPDATE moderation_requests SET status = 'approved', reviewer_id = ?, reviewed_at = ? WHERE id = ?`,
      [reviewerId, now, requestId]
    );
    return { ok: true };
  }

  if (req.type === "delete" && req.activity_id) {
    await query("DELETE FROM activities WHERE id = ?", [req.activity_id]);
    await query(
      `UPDATE moderation_requests SET status = 'approved', reviewer_id = ?, reviewed_at = ? WHERE id = ?`,
      [reviewerId, now, requestId]
    );
    return { ok: true };
  }

  return { error: "无法处理该申请", status: 400 };
}

export function mapModerationRow(row) {
  let payload = null;
  if (row.payload) {
    try {
      payload = typeof row.payload === "string" ? JSON.parse(row.payload) : row.payload;
    } catch {
      payload = null;
    }
  }
  return {
    id: row.id,
    type: row.type,
    status: row.status,
    activityId: row.activity_id,
    payload,
    requesterId: row.requester_id,
    requesterName: row.requester_name,
    requesterEmail: row.requester_email,
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at,
    reviewerId: row.reviewer_id,
    rejectReason: row.reject_reason,
  };
}
