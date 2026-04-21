import path from "path";
import { fileURLToPath } from "url";
import { JSONFile } from "lowdb/node";
import { Low } from "lowdb";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, "database.json");

// 定义数据库结构
const defaultData = {
  users: [],
  activities: [],
  platform_admins: [],
  comments: [],
};

// 创建数据库实例
const adapter = new JSONFile(dbPath);
const db = new Low(adapter, defaultData);

// 初始化数据库
async function init() {
  await db.read();
  if (!db.data) {
    db.data = defaultData;
    await db.write();
  }
}

// 确保数据库结构
async function ensureSchema() {
  await init();
}

// 映射活动行
function mapActivityRow(row) {
  const iso = (d) => (d instanceof Date ? d.toISOString() : new Date(d).toISOString());
  const publisherRole = row.publisher_role || row.author_role;
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    location: row.location || "",
    organizer: row.organizer || "",
    contact: row.contact || "",
    category: row.category,
    startAt: iso(row.start_at),
    endAt: row.end_at ? iso(row.end_at) : null,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
    publisherRole,
    author: {
      id: row.user_id,
      displayName: row.author_display_name,
      role: row.author_role,
    },
  };
}

export { db, ensureSchema, mapActivityRow };
