import { Link } from 'react-router-dom'
import type { Activity } from '../types'
import { formatRange } from '../lib/dates'
import { publisherChannelLabel, roleLabel } from '../types'
import { badgeClass, barClass } from '../lib/categoryStyles'
import { Calendar, MapPin, Users, ArrowRight } from 'lucide-react'

export function ActivityCard({ a }: { a: Activity }) {
  const bar = barClass(a.category)
  const badge = badgeClass(a.category)
  const isSchool = a.publisherRole === 'school'

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl bg-white shadow-md shadow-slate-900/5 ring-1 ring-slate-200/60 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-indigo-500/10 hover:ring-indigo-200/50">
      {/* 顶部色带 - 类别标识 */}
      <div className={`h-2 shrink-0 bg-gradient-to-r ${bar}`} aria-hidden />
      
      {/* 卡片内容 */}
      <div className="flex flex-1 flex-col p-6">
        {/* 标签行 */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {/* 类别标签 */}
          <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ${badge}`}>
            {a.category}
          </span>
          
          {/* 发布者身份标签 */}
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${isSchool ? 'bg-indigo-50 text-indigo-700 ring-indigo-200' : 'bg-emerald-50 text-emerald-700 ring-emerald-200'}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${isSchool ? 'bg-indigo-500' : 'bg-emerald-500'}`} />
            {publisherChannelLabel(a.publisherRole)}
          </span>
        </div>

        {/* 标题 */}
        <h3 className="font-display mb-3 text-xl font-bold leading-tight tracking-tight text-slate-900 transition-colors group-hover:text-indigo-600">
          <Link to={`/activity/${a.id}`} className="no-underline">
            {a.title}
          </Link>
        </h3>

        {/* 描述 */}
        <p className="mb-4 line-clamp-2 flex-1 text-sm leading-relaxed text-slate-600">
          {a.description}
        </p>

        {/* 分隔线 */}
        <div className="mb-4 border-t border-slate-100" />

        {/* 信息行 */}
        <div className="space-y-2.5 text-sm">
          {/* 时间 */}
          <div className="flex items-center gap-2 text-slate-700">
            <Calendar className="h-4 w-4 shrink-0 text-slate-400" />
            <span className="font-medium">{formatRange(a.startAt, a.endAt)}</span>
          </div>

          {/* 地点 */}
          {a.location && (
            <div className="flex items-center gap-2 text-slate-600">
              <MapPin className="h-4 w-4 shrink-0 text-slate-400" />
              <span className="line-clamp-1">{a.location}</span>
            </div>
          )}

          {/* 主办方/作者 */}
          <div className="flex items-center gap-2 text-slate-500">
            <Users className="h-4 w-4 shrink-0 text-slate-400" />
            <span className="line-clamp-1">
              {a.organizer || `${roleLabel(a.author.role)} · ${a.author.displayName}`}
            </span>
          </div>
        </div>

        {/* 查看详情按钮 */}
        <div className="mt-5 pt-2">
          <Link
            to={`/activity/${a.id}`}
            className={`group/btn inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold no-underline transition-all ${isSchool ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-700 hover:shadow-lg' : 'bg-slate-800 text-white shadow-md shadow-slate-900/15 hover:bg-slate-900 hover:shadow-lg'}`}
          >
            查看详情
            <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </article>
  )
}
