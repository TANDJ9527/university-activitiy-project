import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listSchoolRegistrations, approveSchoolRegistration, rejectSchoolRegistration } from '../api'

export function AdminSchoolApprovals() {
  const [requests, setRequests] = useState<{
    id: string
    email: string
    displayName: string
    role: 'school'
    schoolApproved: boolean
    createdAt: string
  }[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setErr(null)
    try {
      const data = await listSchoolRegistrations()
      setRequests(Array.isArray(data) ? data : [])
    } catch (e) {
      setErr(e instanceof Error ? e.message : '加载失败')
      setRequests([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function handleApprove(userId: string, displayName: string) {
    const ok = window.confirm(`确定通过「${displayName}」的校方注册申请吗？`)
    if (!ok) return

    setBusy(userId)
    try {
      await approveSchoolRegistration(userId)
      setRequests((prev) =>
        prev.map((r) => (r.id === userId ? { ...r, schoolApproved: true } : r))
      )
    } catch (e) {
      alert(e instanceof Error ? e.message : '操作失败')
    } finally {
      setBusy(null)
    }
  }

  async function handleReject(userId: string, displayName: string) {
    const ok = window.confirm(`确定拒绝「${displayName}」的校方注册申请吗？拒绝后将删除该账号，此操作不可恢复。`)
    if (!ok) return

    setBusy(userId)
    try {
      await rejectSchoolRegistration(userId)
      setRequests((prev) => prev.filter((r) => r.id !== userId))
    } catch (e) {
      alert(e instanceof Error ? e.message : '操作失败')
    } finally {
      setBusy(null)
    }
  }

  const pendingCount = requests.filter((r) => !r.schoolApproved).length

  return (
    <div className="mx-auto max-w-4xl">
      <p className="mb-2">
        <Link
          to="/account"
          className="text-sm font-semibold text-indigo-700 underline decoration-indigo-300 underline-offset-4"
        >
          ← 返回账户资料
        </Link>
      </p>
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900">校方注册审核</h1>
        <p className="mt-2 text-sm text-slate-600">
          管理校方/组织方注册申请。
          {pendingCount > 0 ? (
            <span className="ml-1 font-semibold text-amber-700">待审核 {pendingCount} 条</span>
          ) : (
            <span className="ml-1 text-slate-500">暂无待审核申请</span>
          )}
        </p>
      </div>

      <div className="mb-4 flex justify-end">
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
      ) : requests.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white/80 py-12 text-center text-slate-600 shadow-sm">
          暂无校方注册申请
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700">
                  申请昵称
                </th>
                <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700">
                  邮箱
                </th>
                <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700">
                  状态
                </th>
                <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700">
                  申请时间
                </th>
                <th className="border-b border-slate-200 px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-700">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {requests.map((req) => (
                <tr key={req.id} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap px-4 py-4">
                    <div className="font-semibold text-slate-900">{req.displayName}</div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-4">
                    <div className="text-sm text-slate-600">{req.email}</div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-4">
                    {req.schoolApproved ? (
                      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-100">
                        已通过
                      </span>
                    ) : (
                      <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-900 ring-1 ring-amber-200/80">
                        待审核
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4">
                    <div className="text-xs text-slate-500">
                      {req.createdAt
                        ? new Date(req.createdAt).toLocaleString('zh-CN', { hour12: false })
                        : '—'}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-right">
                    {!req.schoolApproved ? (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          disabled={busy === req.id}
                          onClick={() => handleApprove(req.id, req.displayName)}
                          className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
                        >
                          {busy === req.id ? '处理中…' : '通过'}
                        </button>
                        <button
                          type="button"
                          disabled={busy === req.id}
                          onClick={() => handleReject(req.id, req.displayName)}
                          className="rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 ring-1 ring-red-100 transition hover:bg-red-100 disabled:opacity-50"
                        >
                          拒绝
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">已处理</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}