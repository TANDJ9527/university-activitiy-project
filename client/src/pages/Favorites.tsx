import { useCallback, useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { clearAllFavorites, listMyFavorites, toggleFavorite } from '../api'
import { useAuth } from '../context/AuthContext'
import { ActivityCard } from '../components/ActivityCard'
import { CardSkeleton } from '../components/CardSkeleton'
import type { Activity } from '../types'

export function Favorites() {
  const { user, ready } = useAuth()
  const [items, setItems] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setErr(null)
    try {
      const data = await listMyFavorites()
      setItems(Array.isArray(data) ? data : [])
    } catch (e) {
      setErr(e instanceof Error ? e.message : '加载失败')
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (ready && user) load()
  }, [ready, user, load])

  if (!ready) return <p className="text-slate-500">加载中…</p>
  if (!user) return <Navigate to="/login" replace state={{ from: '/account/favorites' }} />

  async function removeOne(id: string) {
    try {
      await toggleFavorite(id)
      setItems((prev) => prev.filter((a) => a.id !== id))
    } catch (e) {
      alert(e instanceof Error ? e.message : '取消收藏失败')
    }
  }

  async function clearAll() {
    if (!window.confirm('确定清空全部收藏？')) return
    try {
      await clearAllFavorites()
      setItems([])
    } catch (e) {
      alert(e instanceof Error ? e.message : '清空失败')
    }
  }

  return (
    <div>
      <p className="mb-2">
        <Link
          to="/account"
          className="text-sm font-semibold text-indigo-700 underline decoration-indigo-300 underline-offset-4"
        >
          ← 返回账户资料
        </Link>
      </p>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900">收藏的活动</h1>
          <p className="mt-2 text-sm text-slate-600">按收藏时间从新到旧排列。可在卡片上再次点击星标取消收藏。</p>
        </div>
        {items.length > 0 ? (
          <button
            type="button"
            onClick={clearAll}
            className="rounded-full border border-red-200 bg-red-50 px-5 py-2 text-sm font-semibold text-red-900 hover:bg-red-100"
          >
            一键取消全部收藏
          </button>
        ) : null}
      </div>

      {err ? (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{err}</div>
      ) : null}

      {loading ? (
        <ul className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <li key={i}>
              <CardSkeleton />
            </li>
          ))}
        </ul>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 py-16 text-center text-slate-600">
          <p className="font-medium text-slate-800">暂无收藏</p>
          <p className="mt-2 text-sm">在活动广场或详情页点击星标即可收藏。</p>
          <Link
            to="/"
            className="mt-6 inline-block rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white no-underline shadow-md"
          >
            去逛逛
          </Link>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {items.map((a) => (
            <li key={a.id} className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                <span>
                  收藏于{' '}
                  {a.favoritedAt
                    ? new Date(a.favoritedAt).toLocaleString('zh-CN', { hour12: false })
                    : '—'}
                </span>
                <button
                  type="button"
                  onClick={() => removeOne(a.id)}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  取消收藏
                </button>
              </div>
              <div className="flex">
                <ActivityCard a={{ ...a, favorited: true }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
