/** 列表卡片顶部色带 */
export const categoryBar: Record<string, string> = {
  讲座: 'from-violet-500 via-purple-500 to-fuchsia-500',
  文体: 'from-emerald-400 via-teal-500 to-cyan-600',
  志愿服务: 'from-amber-400 via-orange-500 to-rose-500',
  社团: 'from-sky-400 via-blue-500 to-indigo-600',
  竞赛: 'from-rose-500 via-pink-500 to-red-600',
  其他: 'from-slate-400 via-slate-500 to-slate-600',
}

export const categoryBadge: Record<string, string> = {
  讲座: 'bg-violet-50 text-violet-800 ring-violet-200/80',
  文体: 'bg-emerald-50 text-emerald-800 ring-emerald-200/80',
  志愿服务: 'bg-amber-50 text-amber-900 ring-amber-200/80',
  社团: 'bg-sky-50 text-sky-800 ring-sky-200/80',
  竞赛: 'bg-rose-50 text-rose-800 ring-rose-200/80',
  其他: 'bg-slate-100 text-slate-700 ring-slate-200/80',
}

export function barClass(category: string): string {
  return category in categoryBar ? categoryBar[category] : categoryBar['其他']
}

export function badgeClass(category: string): string {
  return category in categoryBadge ? categoryBadge[category] : categoryBadge['其他']
}
