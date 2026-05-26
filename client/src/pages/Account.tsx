import { type FormEvent, useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { roleLabel } from '../types'

export function Account() {
  const { user, ready, updateDisplayName } = useAuth()
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [ok, setOk] = useState(false)

  useEffect(() => {
    if (user) setName(user.displayName)
  }, [user])

  if (!ready) return <p className="text-slate-500">加载中…</p>
  if (!user) return <Navigate to="/login" replace state={{ from: '/account' }} />

  return (
    <div className="mx-auto max-w-2xl">
      <p className="mb-2">
        <Link
          to="/"
          className="text-sm font-semibold text-indigo-700 underline decoration-indigo-300 underline-offset-4"
        >
          ← 返回活动广场
        </Link>
      </p>
      <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900">账户资料</h1>
      <p className="mt-2 text-sm text-slate-600">
        邮箱 <span className="font-medium text-slate-800">{user.email}</span> 不可修改。可更新展示昵称（活动作者名将随之更新）。
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Link
          to="/account/favorites"
          className="flex flex-col rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50/90 to-white p-4 no-underline shadow-sm ring-1 ring-amber-100/80 transition hover:border-amber-300 hover:shadow-md"
        >
          <span className="text-sm font-bold text-amber-950">收藏的活动</span>
          <span className="mt-1 text-xs text-amber-900/80">按收藏时间查看与管理</span>
        </Link>
        <Link
          to="/account/registrations"
          className="flex flex-col rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/90 to-white p-4 no-underline shadow-sm ring-1 ring-emerald-100/80 transition hover:border-emerald-300 hover:shadow-md"
        >
          <span className="text-sm font-bold text-emerald-950">报名的活动</span>
          <span className="mt-1 text-xs text-emerald-900/80">查看或取消报名</span>
        </Link>
        {user.isPlatformAdmin ? (
          <Link
            to="/admin/moderation"
            className="flex flex-col rounded-2xl border border-indigo-200/80 bg-gradient-to-br from-indigo-50/90 to-white p-4 no-underline shadow-sm ring-1 ring-indigo-100/80 transition hover:border-indigo-300 hover:shadow-md sm:col-span-2"
          >
            <span className="text-sm font-bold text-indigo-950">管理后台 · 待审核</span>
            <span className="mt-1 text-xs text-indigo-900/80">活动申请与评论审核</span>
          </Link>
        ) : (
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 text-xs text-slate-500">
            学生发布或修改、删除自己活动时需管理员审核；校方账号可直接生效。
          </div>
        )}
      </div>

      <form
        className="mt-8 space-y-5 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm"
        onSubmit={async (e: FormEvent) => {
          e.preventDefault()
          setErr(null)
          setOk(false)
          const trimmed = name.trim()
          if (!trimmed || trimmed.length > 100) {
            setErr('昵称须为 1–100 字')
            return
          }
          setSaving(true)
          try {
            await updateDisplayName(trimmed)
            setOk(true)
          } catch (er) {
            setErr(er instanceof Error ? er.message : '保存失败')
          } finally {
            setSaving(false)
          }
        }}
      >
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-indigo-50 px-2.5 py-1 font-semibold text-indigo-800 ring-1 ring-indigo-100">
            {roleLabel(user.role)}
          </span>
          {user.isPlatformAdmin ? (
            <span className="rounded-full bg-amber-50 px-2.5 py-1 font-semibold text-amber-900 ring-1 ring-amber-200/80">
              平台管理员
            </span>
          ) : null}
        </div>

        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-slate-700">昵称 / 组织名称</span>
          <input
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none ring-indigo-500/20 transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2"
            maxLength={100}
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={saving}
          />
        </label>

        {err ? (
          <p className="text-sm text-red-700" role="alert">
            {err}
          </p>
        ) : null}
        {ok ? <p className="text-sm text-emerald-700">已保存。</p> : null}

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-sky-600 py-3 text-sm font-semibold text-white shadow-md shadow-indigo-500/25 transition hover:to-indigo-600 disabled:opacity-60"
        >
          {saving ? '保存中…' : '保存'}
        </button>
      </form>
    </div>
  )
}
