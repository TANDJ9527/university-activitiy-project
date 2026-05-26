/** QQ 邮箱：数字 QQ 号 @qq.com */
export function isQqEmail(email) {
  return /^[1-9]\d{4,10}@qq\.com$/i.test(String(email || "").trim().toLowerCase());
}

/** 评论：中文、英文、数字、常用标点 */
export function validateCommentContent(raw) {
  const content = String(raw || "").trim();
  if (!content) return { ok: false, error: "评论内容不能为空" };
  if (content.length > 2000) return { ok: false, error: "评论内容不能超过 2000 字" };
  if (
    !/^[\u4e00-\u9fffA-Za-z0-9\s，。！？、；：""''（）().,!?;:'"\-…·]+$/u.test(content)
  ) {
    return { ok: false, error: "评论仅可包含中文、英文、数字及常用标点符号" };
  }
  return { ok: true, content };
}
