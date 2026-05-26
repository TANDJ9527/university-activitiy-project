import { useCallback, useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { cancelActivityRegistration, listMyRegistrations } from '../api'
import { ActivityCard } from '../components/ActivityCard'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

export function MyRegistrations() {
  const { user, ready } = useAuth()
  const { showToast } = useToast()
  const [items, setItems] = useState<Awaited<ReturnType<typeof listMyRegistrations>>>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await listMyRegistrations()
      setItems(Array.isArray(data) ? data : [])
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (ready && user) load()
  }, [ready, user, load])

  if (!ready) return <p className="text-slate-500">加载中…</p>
  if (!user) return <Navigate to="/login" replace state={{ from: '/account/registrations' }} />

  async function cancelOne(id: string) {
    if (!window.confirm('确定取消报名该活动？')) return
    try {
      await cancelActivityRegistration(id)
      showToast('已取消报名', 'success')
      setItems((prev) => prev.filter((a) => a.id !== id))
    } catch (e) {
      showToast(e instanceof Error ? e.message : '取消失败', 'error')
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <p className="mb-2">
        <Link to="/account" className="text-sm font-semibold text-indigo-700 underline decoration-indigo-300">
          ← 个人中心
        </Link>
      </p>
      <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900">我的报名</h1>
      <p className="mt-2 text-sm text-slate-600">按报名时间从新到旧排列。也可在活动详情页取消报名。</p>

      {loading ? (
        <p className="mt-8 text-slate-500">加载中…</p>
      ) : items.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-dashed border-slate-300 py-16 text-center">
          <p className="font-medium text-slate-800">暂无报名记录</p>
          <Link to="/" className="mt-4 inline-block text-sm font-semibold text-indigo-700 underline">
            去活动广场看看
          </Link>
        </div>
      ) : (
        <ul className="mt-8 grid items-stretch gap-6 lg:grid-cols-2">
          {items.map((a) => (
            <li key={a.id} className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                <span>
                  报名于{' '}
                  {a.registeredAt
                    ? new Date(a.registeredAt).toLocaleString('zh-CN', { hour12: false })
                    : '—'}
                </span>
                <button
                  type="button"
                  onClick={() => cancelOne(a.id)}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  取消报名
                </button>
              </div>
              <ActivityCard a={{ ...a, registered: true }} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
