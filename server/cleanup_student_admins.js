import { query } from './mysql.js';

async function cleanup() {
  // 删除学生账号的管理员权限
  const sql = `
    DELETE pa FROM platform_admins pa
    JOIN users u ON pa.user_id = u.id
    WHERE u.role = 'student'
  `;
  const result = await query(sql);
  console.log('Deleted student admins:', result.affectedRows);

  // 确认剩余管理员
  const remaining = await query(`
    SELECT pa.user_id, u.role, u.email, u.display_name
    FROM platform_admins pa
    JOIN users u ON pa.user_id = u.id
  `);
  console.log('Remaining admins:', JSON.stringify(remaining, null, 2));
}
cleanup().catch(console.error);