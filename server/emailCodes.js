import "dotenv/config";
import { randomInt, randomUUID } from "crypto";
import { query } from "./mysql.js";
import { isQqEmail } from "./validators.js";

function mysqlDateTime3(d = new Date()) {
  const x = d instanceof Date ? d : new Date(d);
  const pad = (n) => String(n).padStart(2, "0");
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())} ${pad(x.getHours())}:${pad(x.getMinutes())}:${pad(x.getSeconds())}.${String(x.getMilliseconds()).padStart(3, "0")}`;
}

const PURPOSE_LABEL = {
  register: "注册校园活动平台",
  reset_password: "重置密码",
};

async function sendMail(email, code, purpose) {
  const subject = `【校园活动】验证码：${code}`;
  const text = `您的验证码为 ${code}，用于${PURPOSE_LABEL[purpose] || "验证"}，10 分钟内有效。如非本人操作请忽略。`;

  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    const nodemailer = await import("nodemailer");
    const transporter = nodemailer.default.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 465,
      secure: process.env.SMTP_SECURE !== "0",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS || "",
      },
    });
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: email,
      subject,
      text,
    });
    return;
  }

  console.log(`[邮箱验证码] ${email} (${purpose}): ${code}`);
}

export async function issueEmailCode(email, purpose) {
  if (!isQqEmail(email)) {
    const err = new Error("请使用 QQ 邮箱（例如 123456789@qq.com）");
    err.status = 400;
    throw err;
  }
  if (purpose !== "register" && purpose !== "reset_password") {
    const err = new Error("无效的验证码用途");
    err.status = 400;
    throw err;
  }

  if (purpose === "register") {
    const existing = await query("SELECT id FROM users WHERE email = ?", [email]);
    if (existing.length > 0) {
      const err = new Error("该 QQ 邮箱已注册");
      err.status = 409;
      throw err;
    }
  } else {
    const existing = await query("SELECT id FROM users WHERE email = ?", [email]);
    if (existing.length === 0) {
      const err = new Error("该邮箱尚未注册");
      err.status = 404;
      throw err;
    }
  }

  const code = String(randomInt(100000, 999999));
  const expiresAt = mysqlDateTime3(new Date(Date.now() + 10 * 60 * 1000));
  const now = mysqlDateTime3();

  await query("DELETE FROM email_verification_codes WHERE email = ? AND purpose = ?", [
    email,
    purpose,
  ]);
  await query(
    `INSERT INTO email_verification_codes (id, email, purpose, code, expires_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [randomUUID(), email, purpose, code, expiresAt, now]
  );

  await sendMail(email, code, purpose);

  const payload = { ok: true, message: "验证码已发送，请查收 QQ 邮箱" };
  if (process.env.EMAIL_DEV_EXPOSE === "1") {
    payload.devCode = code;
  }
  return payload;
}

export async function consumeEmailCode(email, purpose, codeInput) {
  const code = String(codeInput || "").trim();
  if (!/^\d{6}$/.test(code)) {
    const err = new Error("请输入 6 位数字验证码");
    err.status = 400;
    throw err;
  }

  const rows = await query(
    `SELECT id, code, expires_at FROM email_verification_codes
     WHERE email = ? AND purpose = ? ORDER BY created_at DESC LIMIT 1`,
    [email, purpose]
  );
  if (rows.length === 0) {
    const err = new Error("请先获取验证码");
    err.status = 400;
    throw err;
  }
  const row = rows[0];
  if (row.code !== code) {
    const err = new Error("验证码错误");
    err.status = 400;
    throw err;
  }
  const exp = new Date(row.expires_at);
  if (Number.isNaN(exp.getTime()) || exp.getTime() < Date.now()) {
    const err = new Error("验证码已过期，请重新获取");
    err.status = 400;
    throw err;
  }
  await query("DELETE FROM email_verification_codes WHERE id = ?", [row.id]);
  return true;
}
