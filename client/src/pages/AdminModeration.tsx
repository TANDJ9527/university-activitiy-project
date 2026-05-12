import { useCallback, useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { approveModeration, listPendingModeration, rejectModeration } from '../api'
import { useAuth } from '../context/AuthContext'
import { formatRange } from '../lib/dates'
import type { ModerationRequest } from '../types'

export function AdminModeration() {
  const { user, ready } = useAuth()
  const [items, setItems] = useState<ModerationRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setErr(null)
    try {
      const data = await listPendingModeration()
      setItems(data)
    } catch (e) {
      setErr(e instanceof Error ? e.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (ready && user?.isPlatformAdmin) load()
  }, [ready, user, load])

  if (!ready) return <p className="text-slate-500">加载中…</p>
  if (!user) return <Navigate to="/login" replace state={{ from: '/admin/moderation' }} />
  if (!user.isPlatformAdmin) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-amber-950">
        仅平台管理员可访问待审核。
        <Link to="/" className="ml-2 font-semibold text-indigo-700 underline">
          首页
        </Link>
      </div>
    )
  }

  async function approve(id: string) {
    setBusy(id)
    try {
      await approveModeration(id)
      setItems((prev) => prev.filter((x) => x.id !== id))
    } catch (e) {
      alert(e instanceof Error ? e.message : '操作失败')
    } finally {
      setBusy(null)
    }
  }

  async function reject(id: string) {
    const reason = window.prompt('拒绝原因（可选）', '') ?? ''
    setBusy(id)
    try {
      await rejectModeration(id, reason)
      setItems((prev) => prev.filter((x) => x.id !== id))
    } catch (e) {
      alert(e instanceof Error ? e.message : '操作失败')
    } finally {
      setBusy(null)
    }
  }

  function typeLabel(t: ModerationRequest['type']) {
    if (t === 'create') return '新建活动'
    if (t === 'update') return '修改活动'
    return '删除活动'
  }

  function payloadSummary(r: ModerationRequest) {
    if (r.type === 'delete') return `活动 ID：${r.activityId}`
    const p = r.payload as Record<string, unknown> | null
    if (!p) return '—'
    return String(p.title ?? '—')
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
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900">待审核</h1>
          <p className="mt-2 text-sm text-slate-600">
            学生发布、修改、删除活动的申请。通过后同步至活动广场与详情；拒绝后申请人需重新提交。
          </p>
        </div>
        <button
          type="button"
          onClick={() => load()}
          className="rounded-full border border-slate-200 bg-white px-5 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
        >
          刷新
        </button>
      </div>

      {err ? (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{err}</div>
      ) : null}

      {loading ? (
        <p className="text-slate-500">加载中…</p>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white/80 py-12 text-center text-slate-600 shadow-sm">
          当前没有待审核项
        </div>
      ) : (
        <ul className="space-y-4">
          {items.map((r) => {
            const p = r.payload as Record<string, string | null | undefined> | null
            return (
              <li
                key={r.id}
                className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm ring-1 ring-slate-100"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <span className="inline-block rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-bold text-indigo-800 ring-1 ring-indigo-100">
                      {typeLabel(r.type)}
                    </span>
                    <p className="mt-2 font-semibold text-slate-900">{payloadSummary(r)}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      申请人：{r.requesterName ?? '—'}（{r.requesterEmail ?? r.requesterId}）
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      提交时间：{r.createdAt ? new Date(r.createdAt).toLocaleString('zh-CN', { hour12: false }) : '—'}
                    </p>
                    {r.type !== 'delete' && p?.startAt ? (
                      <p className="mt-2 text-sm text-slate-700">
                        时间：{formatRange(String(p.startAt), p.endAt ? String(p.endAt) : null)}
                      </p>
                    ) : null}
                    {r.activityId ? (
                      <p className="mt-1 text-xs">
                        <Link className="font-semibold text-indigo-700 underline" to={`/activity/${r.activityId}`}>
                          查看当前活动页
                        </Link>
                      </p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busy === r.id}
                      onClick={() => approve(r.id)}
                      className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
                    >
                      通过
                    </button>
                    <button
                      type="button"
                      disabled={busy === r.id}
                      onClick={() => reject(r.id)}
                      className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
                    >
                      拒绝
                    </button>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
