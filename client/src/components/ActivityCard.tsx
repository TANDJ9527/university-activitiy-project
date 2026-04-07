import { Link } from 'react-router-dom'
import type { Activity } from '../types'
import { formatRange } from '../lib/dates'
import { publisherChannelLabel, roleLabel } from '../types'
import { badgeClass, barClass } from '../lib/categoryStyles'

export function ActivityCard({ a }: { a: Activity }) {
  const bar = barClass(a.category)
  const badge = badgeClass(a.category)

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl bg-white/90 shadow-md shadow-slate-900/5 ring-1 ring-slate-200/80 backdrop-blur-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-indigo-900/8 hover:ring-indigo-200/60">
      <div
        className={`h-1.5 shrink-0 bg-gradient-to-r ${bar}`}
        aria-hidden
      />
      <div className="flex flex-1 flex-col p-5 pt-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${badge}`}
          >
            {a.category}
          </span>
          <span
            className={
              a.publisherRole === 'school'
                ? 'rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-800 ring-1 ring-indigo-200/80'
                : 'rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-semibold text-teal-900 ring-1 ring-teal-200/80'
            }
          >
            {publisherChannelLabel(a.publisherRole)}
          </span>
          <span className="rounded-full bg-slate-100/90 px-2.5 py-0.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200/80">
            {roleLabel(a.author.role)} · {a.author.displayName}
          </span>
        </div>
        <h2 className="font-display mb-2 text-lg font-semibold leading-snug tracking-tight text-slate-900 transition group-hover:text-indigo-900">
          <Link to={`/activity/${a.id}`} className="no-underline">
            {a.title}
          </Link>
        </h2>
        <p className="mb-4 line-clamp-2 flex-1 text-sm leading-relaxed text-slate-600">{a.description}</p>
        <div className="mt-auto flex flex-col gap-1.5 border-t border-slate-100 pt-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-slate-100 px-2 py-0.5 font-medium text-slate-600">
              {formatRange(a.startAt, a.endAt)}
            </span>
          </div>
          {a.location ? (
            <span className="line-clamp-1 text-slate-600">📍 {a.location}</span>
          ) : null}
          {a.organizer ? (
            <span className="line-clamp-1 text-slate-500">主办 · {a.organizer}</span>
          ) : null}
        </div>
        <div className="mt-3">
          <Link
            to={`/activity/${a.id}`}
            className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 no-underline transition group-hover:gap-2 group-hover:text-indigo-700"
          >
            查看详情
            <span aria-hidden>→</span>
          </Link>
        </div>
      </div>
    </article>
  )
}
