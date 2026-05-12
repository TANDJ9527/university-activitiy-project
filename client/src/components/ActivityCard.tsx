import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Activity } from '../types'
import { formatRange } from '../lib/dates'
import { publisherChannelLabel, roleLabel } from '../types'
import { badgeClass, barClass } from '../lib/categoryStyles'
import { Card, CardContent } from './ui/Card'
import { Button } from './ui/Button'
import { Calendar, MapPin, Users, ArrowRight, Sparkles, Star } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { toggleFavorite } from '../api'

export function ActivityCard({ a }: { a: Activity }) {
  const { user } = useAuth()
  const bar = barClass(a.category)
  const badge = badgeClass(a.category)
  const isSchool = a.publisherRole === 'school'
  const [fav, setFav] = useState(Boolean(a.favorited))
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    setFav(Boolean(a.favorited))
  }, [a.id, a.favorited])

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(null), 1800)
    return () => window.clearTimeout(t)
  }, [toast])

  async function onStar(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!user) {
      setToast('请先登录')
      return
    }
    try {
      const { favorited } = await toggleFavorite(a.id)
      setFav(favorited)
      setToast(favorited ? '收藏成功' : '已取消收藏')
    } catch (er) {
      setToast(er instanceof Error ? er.message : '操作失败')
    }
  }

  return (
    <Card className="group relative h-[420px] flex-col overflow-hidden">
      {toast ? (
        <div className="pointer-events-none absolute bottom-14 left-1/2 z-20 -translate-x-1/2 rounded-full bg-slate-900/95 px-3 py-1.5 text-xs font-medium text-white shadow-md">
          {toast}
        </div>
      ) : null}
      <button
        type="button"
        onClick={onStar}
        className="absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full border border-amber-200/90 bg-white/95 text-amber-600 shadow-sm backdrop-blur-sm transition hover:bg-amber-50 hover:text-amber-700"
        title={fav ? '取消收藏' : '收藏'}
        aria-label={fav ? '取消收藏' : '收藏'}
      >
        <Star className={`h-[18px] w-[18px] ${fav ? 'fill-amber-500 text-amber-600' : ''}`} strokeWidth={2} />
      </button>

      <div className={`h-2.5 bg-gradient-to-r ${bar}`} aria-hidden />
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 via-transparent to-sky-50/30 opacity-0 transition-opacity duration-500 group-hover:opacity-100 pointer-events-none" />

      <CardContent className="relative flex h-[calc(100%-10px)] flex-col p-5">
        <div className="mb-3 flex flex-wrap items-center gap-2 pr-8">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ${badge}`}>
            <Sparkles className="h-3 w-3" />
            {a.category}
          </span>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ring-1 ${isSchool ? 'bg-indigo-50 text-indigo-700 ring-indigo-200' : 'bg-emerald-50 text-emerald-700 ring-emerald-200'}`}
          >
            <span className={`h-2 w-2 rounded-full ${isSchool ? 'bg-indigo-500' : 'bg-emerald-500'}`} />
            {publisherChannelLabel(a.publisherRole)}
          </span>
        </div>

        <h3 className="mb-3 text-lg font-bold leading-tight tracking-tight text-slate-900">
          <Link to={`/activity/${a.id}`} className="no-underline hover:text-indigo-600 transition-colors">
            {a.title}
          </Link>
        </h3>

        <div className="mb-3 h-[70px] overflow-hidden">
          <p className="line-clamp-3 text-sm leading-relaxed text-slate-600">{a.description}</p>
        </div>

        <div className="mb-3 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

        <div className="flex flex-col gap-2 text-sm">
          <div className="flex items-center gap-2 text-slate-700">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-indigo-50 text-indigo-600">
              <Calendar className="h-3.5 w-3.5" />
            </div>
            <span className="line-clamp-1 font-medium">{formatRange(a.startAt, a.endAt)}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-600">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-rose-50 text-rose-600">
              <MapPin className="h-3.5 w-3.5" />
            </div>
            <span className="line-clamp-1">{a.location || '-'}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-500">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-emerald-50 text-emerald-600">
              <Users className="h-3.5 w-3.5" />
            </div>
            <span className="line-clamp-1">
              {a.organizer || `${roleLabel(a.author.role)} · ${a.author.displayName}`}
            </span>
          </div>
        </div>

        <div className="mt-auto pt-3">
          <Button
            className={`w-full gap-2 ${isSchool ? 'bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-700 hover:to-sky-700 shadow-md shadow-indigo-500/25' : 'bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-800 hover:to-slate-900 shadow-md shadow-slate-900/25'}`}
            size="sm"
            asChild
          >
            <Link to={`/activity/${a.id}`} className="no-underline">
              查看详情
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
