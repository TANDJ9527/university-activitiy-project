export function isQqEmail(email: string): boolean {
  return /^[1-9]\d{4,10}@qq\.com$/i.test(email.trim().toLowerCase())
}

export const COMMENT_PATTERN =
  /^[\u4e00-\u9fffA-Za-z0-9\s，。！？、；：""''（）().,!?;:'"\-…·]+$/u

export function validateCommentText(content: string): string | null {
  const t = content.trim()
  if (!t) return '评论内容不能为空'
  if (t.length > 2000) return '评论不能超过 2000 字'
  if (!COMMENT_PATTERN.test(t)) return '评论仅可包含中文、英文、数字及常用标点符号'
  return null
}
