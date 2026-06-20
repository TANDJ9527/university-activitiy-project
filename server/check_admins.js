import { query } from './mysql.js';

async function check() {
  const sql = `
    SELECT pa.user_id, u.role, u.email, u.display_name
    FROM platform_admins pa
    JOIN users u ON pa.user_id = u.id
  `;
  const results = await query(sql);
  console.log('Platform admins:', JSON.stringify(results, null, 2));
}
check().catch(console.error);