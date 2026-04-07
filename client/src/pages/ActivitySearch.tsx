import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listActivities } from '../api'
import { ActivityCard } from '../components/ActivityCard'
import { CardSkeleton } from '../components/CardSkeleton'
import { CATEGORIES } from '../types'

type Sort = 'new' | 'startAsc' | 'startDesc'

export function ActivitySearch() {
  const [q, setQ] = useState('')
  const [publisher, setPublisher] = useState<'all' | 'student' | 'school'>('all')
  const [category, setCategory] = useState<string>('all')
  const [sort, setSort] = useState<Sort>('startAsc')
  const [items, setItems] = useState<Awaited<ReturnType<typeof listActivities>>>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setErr(null)
    try {
      const data = await listActivities({
        q: q.trim() || undefined,
        category,
        publisher,
        sort,
      })
      setItems(data)
    } catch (e) {
      setErr(e instanceof Error ? e.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }, [q, publisher, category, sort])

  useEffect(() => {
    load()
  }, [load])

  function resetFilters() {
    setQ('')
    setPublisher('all')
    setCategory('all')
    setSort('startAsc')
  }

  return (
    <div>
      <div className="mb-8">
        <p className="mb-2">
          <Link
            to="/"
            className="text-sm font-semibold text-indigo-700 underline decoration-indigo-300 underline-offset-4"
          >
            ← 返回活动广场
          </Link>
        </p>
        <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          搜索与筛选
        </h1>
        <p className="mt-2 max-w-2xl text-pretty text-slate-600">
          用关键词、发布来源（学生发布 / 校方发布）、活动类别与排序缩小范围。
        </p>
      </div>

      <div className="mb-8 flex flex-col gap-4 rounded-2xl border border-white/70 bg-white/70 p-4 shadow-md shadow-slate-900/5 ring-1 ring-slate-200/60 backdrop-blur-md sm:flex-row sm:flex-wrap sm:items-end">
        <label className="flex min-w-[200px] flex-1 flex-col gap-1.5 text-sm">
          <span className="font-semibold text-slate-700">关键词</span>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="标题、地点、主办方…"
            className="w-full rounded-xl border-0 bg-white/95 px-4 py-2.5 text-slate-900 shadow-inner shadow-slate-900/5 ring-1 ring-slate-200/90 outline-none transition placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-400/40"
          />
        </label>
        <label className="flex w-full flex-col gap-1.5 text-sm sm:w-40">
          <span className="font-semibold text-slate-700">发布来源</span>
          <select
            value={publisher}
            onChange={(e) => setPublisher(e.target.value as 'all' | 'student' | 'school')}
            className="w-full cursor-pointer rounded-xl border-0 bg-white/95 px-4 py-2.5 text-slate-900 shadow-inner ring-1 ring-slate-200/90 outline-none focus:ring-2 focus:ring-indigo-400/40"
          >
            <option value="all">全部</option>
            <option value="student">学生发布</option>
            <option value="school">校方发布</option>
          </select>
        </label>
        <label className="flex w-full flex-col gap-1.5 text-sm sm:w-40">
          <span className="font-semibold text-slate-700">类别</span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full cursor-pointer rounded-xl border-0 bg-white/95 px-4 py-2.5 text-slate-900 shadow-inner ring-1 ring-slate-200/90 outline-none focus:ring-2 focus:ring-indigo-400/40"
          >
            <option value="all">全部</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="flex w-full flex-col gap-1.5 text-sm sm:w-44">
          <span className="font-semibold text-slate-700">排序</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            className="w-full cursor-pointer rounded-xl border-0 bg-white/95 px-4 py-2.5 text-slate-900 shadow-inner ring-1 ring-slate-200/90 outline-none focus:ring-2 focus:ring-indigo-400/40"
          >
            <option value="new">最新发布</option>
            <option value="startAsc">开始时间 ↑</option>
            <option value="startDesc">开始时间 ↓</option>
          </select>
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => load()}
            className="rounded-xl border border-slate-200/90 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50/50 hover:text-indigo-900"
          >
            刷新结果
          </button>
          <button
            type="button"
            onClick={resetFilters}
            className="rounded-xl border border-transparent bg-slate-100 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-200/80"
          >
            重置条件
          </button>
        </div>
      </div>

      {err ? (
        <div className="mb-8 rounded-2xl border border-red-200/80 bg-red-50/90 px-5 py-4 text-sm text-red-800 shadow-sm">
          {err}（请确认根目录已 <code className="rounded bg-red-100/80 px-1">npm run dev</code>，且 MySQL 库{' '}
          <code className="rounded bg-red-100/80 px-1">program</code> 可连接）
        </div>
      ) : null}

      {loading ? (
        <ul className="grid gap-5 sm:grid-cols-1 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <li key={i}>
              <CardSkeleton />
            </li>
          ))}
        </ul>
      ) : items.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300/80 bg-white/50 py-20 text-center backdrop-blur-sm">
          <p className="font-display text-lg font-semibold text-slate-800">没有符合条件的活动</p>
          <p className="mt-2 text-sm text-slate-600">试试调整关键词或类别，或重置条件。</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={resetFilters}
              className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 shadow-sm"
            >
              重置条件
            </button>
            <Link
              to="/"
              className="inline-flex rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white no-underline shadow-lg shadow-indigo-500/20"
            >
              活动广场
            </Link>
          </div>
        </div>
      ) : (
        <>
          <p className="mb-4 text-sm font-medium text-slate-500">共 {items.length} 场活动</p>
          <ul className="grid gap-5 sm:grid-cols-1 lg:grid-cols-2">
            {items.map((a) => (
              <li key={a.id} className="flex">
                <ActivityCard a={a} />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
