export function formatRange(startIso: string, endIso: string | null): string {
  const opt: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }
  const s = new Date(startIso)
  if (!endIso) return s.toLocaleString('zh-CN', opt)
  const e = new Date(endIso)
  if (s.toDateString() === e.toDateString()) {
    return `${s.toLocaleString('zh-CN', opt)} – ${e.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`
  }
  return `${s.toLocaleString('zh-CN', opt)} – ${e.toLocaleString('zh-CN', opt)}`
}

export function toDatetimeLocalValue(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function fromDatetimeLocalValue(v: string): string {
  const d = new Date(v)
  return d.toISOString()
}
