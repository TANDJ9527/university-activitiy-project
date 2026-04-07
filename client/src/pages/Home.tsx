import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listActivities } from '../api'
import { ActivityCard } from '../components/ActivityCard'
import { CardSkeleton } from '../components/CardSkeleton'
import { useAuth } from '../context/AuthContext'

/** 广场固定：展示全部活动，按开始时间升序 */
export function Home() {
  const { user, ready } = useAuth()
  const [items, setItems] = useState<Awaited<ReturnType<typeof listActivities>>>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setErr(null)
    try {
      const data = await listActivities({ category: 'all', sort: 'startAsc' })
      setItems(data)
    } catch (e) {
      setErr(e instanceof Error ? e.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div>
      <section className="relative mb-10 overflow-hidden rounded-3xl border border-white/60 bg-white/50 px-6 py-10 shadow-lg shadow-indigo-900/5 ring-1 ring-slate-200/60 backdrop-blur-md sm:px-10 sm:py-12">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-gradient-to-br from-indigo-400/30 to-sky-300/20 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-gradient-to-tr from-rose-300/20 to-amber-200/20 blur-3xl"
        />
        <div className="relative max-w-2xl">
          <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-800 ring-1 ring-indigo-100">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
            活动广场 · 学生与校方同屏发布
          </p>
          <h1 className="font-display mb-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            发现下一场
            <span className="bg-gradient-to-r from-indigo-600 to-sky-600 bg-clip-text text-transparent">
              {' '}
              校园精彩
            </span>
          </h1>
          <p className="text-pretty text-base leading-relaxed text-slate-600 sm:text-lg">
            本页按开始时间依次陈列全部活动。需要按关键词、类别或排序方式查找？请前往
            <Link
              to="/search"
              className="mx-1 font-semibold text-indigo-700 underline decoration-indigo-300 underline-offset-4"
            >
              搜索与筛选
            </Link>
            。
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              to="/search"
              className="inline-flex items-center rounded-full bg-gradient-to-r from-indigo-600 to-sky-600 px-5 py-2.5 text-sm font-semibold text-white no-underline shadow-md shadow-indigo-500/25 transition hover:to-indigo-600 hover:shadow-lg"
            >
              搜索与筛选
              <span className="ml-2" aria-hidden>
                →
              </span>
            </Link>
          </div>
        </div>
      </section>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl font-semibold text-slate-900">全部活动</h2>
        <button
          type="button"
          onClick={() => load()}
          className="rounded-full border border-slate-200/80 bg-white/80 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-indigo-200 hover:bg-white"
        >
          刷新列表
        </button>
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
          <p className="font-display text-lg font-semibold text-slate-800">广场还没有活动</p>
          <p className="mt-2 text-sm text-slate-600">成为第一个发布者，或稍后再来看看。</p>
          {ready && user ? (
            <Link
              to="/publish"
              className="mt-6 inline-flex rounded-full bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white no-underline shadow-lg shadow-indigo-500/20"
            >
              发布活动
            </Link>
          ) : (
            <p className="mt-4 text-sm text-slate-600">可在页面顶部注册或登录后发布活动。</p>
          )}
        </div>
      ) : (
        <>
          <p className="mb-4 text-sm font-medium text-slate-500">共 {items.length} 场 · 按开始时间升序</p>
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
