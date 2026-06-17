import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listAdminUsers, deleteAdminUser } from '../api'
import { roleLabel } from '../types'

export function AdminUsers() {
  const [users, setUsers] = useState<{
    id: string
    email: string
    displayName: string
    role: 'student' | 'school'
    createdAt: string
    isPlatformAdmin: boolean
  }[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setErr(null)
    try {
      const data = await listAdminUsers()
      setUsers(Array.isArray(data) ? data : [])
    } catch (e) {
      setErr(e instanceof Error ? e.message : '加载失败')
      setUsers([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function handleDelete(userId: string, displayName: string) {
    const ok = window.confirm(`确定要删除用户「${displayName}」吗？此操作不可恢复，该用户的所有活动、评论、收藏和报名记录也将被删除。`)
    if (!ok) return

    setBusy(userId)
    try {
      await deleteAdminUser(userId)
      setUsers((prev) => prev.filter((u) => u.id !== userId))
    } catch (e) {
      alert(e instanceof Error ? e.message : '删除失败')
    } finally {
      setBusy(null)
    }
  }

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
        <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900">管理所有用户</h1>
        <p className="mt-2 text-sm text-slate-600">查看平台所有注册用户的信息，可删除非管理员用户。</p>
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
      ) : users.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white/80 py-12 text-center text-slate-600 shadow-sm">
          当前没有用户
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700">
                  用户昵称
                </th>
                <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700">
                  邮箱
                </th>
                <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700">
                  角色
                </th>
                <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700">
                  权限
                </th>
                <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700">
                  注册时间
                </th>
                <th className="border-b border-slate-200 px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-700">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap px-4 py-4">
                    <div className="font-semibold text-slate-900">{user.displayName}</div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-4">
                    <div className="text-sm text-slate-600">{user.email}</div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-4">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        user.role === 'school'
                          ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100'
                          : 'bg-blue-50 text-blue-800 ring-1 ring-blue-100'
                      }`}
                    >
                      {roleLabel(user.role)}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-4">
                    {user.isPlatformAdmin ? (
                      <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-900 ring-1 ring-amber-200/80">
                        平台管理员
                      </span>
                    ) : (
                      <span className="text-sm text-slate-500">普通用户</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4">
                    <div className="text-xs text-slate-500">
                      {user.createdAt
                        ? new Date(user.createdAt).toLocaleString('zh-CN', { hour12: false })
                        : '—'}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-right">
                    {!user.isPlatformAdmin ? (
                      <button
                        type="button"
                        disabled={busy === user.id}
                        onClick={() => handleDelete(user.id, user.displayName)}
                        className="rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 ring-1 ring-red-100 transition hover:bg-red-100 disabled:opacity-50"
                      >
                        {busy === user.id ? '删除中…' : '删除'}
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
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