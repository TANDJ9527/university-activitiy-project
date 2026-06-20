import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { approveModeration, listPendingModeration, rejectModeration, approveAvatar, rejectAvatar, listAvatarApprovals, approveNickname, rejectNickname, listNicknameApprovals, listSchoolRegistrations, approveSchoolRegistration, rejectSchoolRegistration, listAdminUsers, deleteAdminUser } from '../api'
import { formatRange } from '../lib/dates'
import { roleLabel } from '../types'
import type { ModerationRequest } from '../types'
import type { AvatarApproval } from '../api'
import type { NicknameApproval } from '../api'
import { ImagePreview } from '../components/ImagePreview'

type AdminTab = 'overview' | 'activities' | 'comments' | 'school' | 'avatar' | 'nickname' | 'users'

export function AdminModeration() {
  const [tab, setTab] = useState<AdminTab>('overview')
  const [items, setItems] = useState<ModerationRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [avatarApprovals, setAvatarApprovals] = useState<AvatarApproval[]>([])
  const [nicknameApprovals, setNicknameApprovals] = useState<NicknameApproval[]>([])
  const [schoolRequests, setSchoolRequests] = useState<{
    id: string
    email: string
    displayName: string
    role: 'school' | 'student'
    schoolApproved: boolean
    createdAt: string
    studentId?: string | null
    realName?: string | null
  }[]>([])
  const [adminUsers, setAdminUsers] = useState<{
    id: string
    email: string
    displayName: string
    role: 'student' | 'school'
    createdAt: string
    isPlatformAdmin: boolean
  }[]>([])
  const [previewImage, setPreviewImage] = useState<{ src: string; alt: string } | null>(null)

  const loadActivities = useCallback(async () => {
    setLoading(true)
    setErr(null)
    try {
      const data = await listPendingModeration()
      setItems(Array.isArray(data) ? data : [])
    } catch (e) {
      setErr(e instanceof Error ? e.message : '加载失败')
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  const loadAvatarApprovals = useCallback(async () => {
    setLoading(true)
    try {
      const data = await listAvatarApprovals()
      setAvatarApprovals(data)
    } catch (error) {
      console.error('加载头像审核列表失败:', error)
      setAvatarApprovals([])
    } finally {
      setLoading(false)
    }
  }, [])

  const loadNicknameApprovals = useCallback(async () => {
    setLoading(true)
    try {
      const data = await listNicknameApprovals()
      setNicknameApprovals(data)
    } catch (e) {
      console.error(e)
      setNicknameApprovals([])
    } finally {
      setLoading(false)
    }
  }, [])

  const loadSchoolRegistrations = useCallback(async () => {
    setLoading(true)
    setErr(null)
    try {
      const data = await listSchoolRegistrations()
      setSchoolRequests(Array.isArray(data) ? data : [])
    } catch (e) {
      setErr(e instanceof Error ? e.message : '加载失败')
      setSchoolRequests([])
    } finally {
      setLoading(false)
    }
  }, [])

  const loadAdminUsers = useCallback(async () => {
    setLoading(true)
    setErr(null)
    try {
      const data = await listAdminUsers()
      setAdminUsers(Array.isArray(data) ? data : [])
    } catch (e) {
      setErr(e instanceof Error ? e.message : '加载失败')
      setAdminUsers([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    switch (tab) {
      case 'activities':
        loadActivities()
        break
      case 'avatar':
        loadAvatarApprovals()
        break
      case 'nickname':
        loadNicknameApprovals()
        break
      case 'school':
        loadSchoolRegistrations()
        break
      case 'users':
        loadAdminUsers()
        break
    }
  }, [tab, loadActivities, loadAvatarApprovals, loadNicknameApprovals, loadSchoolRegistrations, loadAdminUsers])

  async function approveActivity(id: string) {
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

  async function rejectActivity(id: string) {
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

  async function handleApproveAvatar(id: string) {
    setBusy(id)
    try {
      await approveAvatar(id)
      await loadAvatarApprovals()
    } catch (error) {
      console.error('审核失败:', error)
    } finally {
      setBusy(null)
    }
  }

  async function handleRejectAvatar(id: string) {
    setBusy(id)
    try {
      await rejectAvatar(id)
      await loadAvatarApprovals()
    } catch (error) {
      console.error('拒绝失败:', error)
    } finally {
      setBusy(null)
    }
  }

  const handleApproveNickname = async (id: string) => {
    setBusy(id)
    try {
      await approveNickname(id)
      setNicknameApprovals((prev) => prev.filter((a) => a.id !== id))
    } catch (e) {
      alert(e instanceof Error ? e.message : '操作失败')
    } finally {
      setBusy(null)
    }
  }

  const handleRejectNickname = async (id: string) => {
    setBusy(id)
    try {
      await rejectNickname(id)
      setNicknameApprovals((prev) => prev.filter((a) => a.id !== id))
    } catch (e) {
      alert(e instanceof Error ? e.message : '操作失败')
    } finally {
      setBusy(null)
    }
  }

  async function handleApproveSchool(userId: string, displayName: string, role: string) {
    const roleText = role === 'school' ? '校方' : '学生'
    if (role === 'school') {
      const makeAdmin = window.confirm(`确定通过「${displayName}」的${roleText}注册申请吗？\n\n注意：校方账号审核通过后可直接发布活动。\n\n是否同时授予平台管理员权限？`)
      if (!makeAdmin) {
        const justApprove = window.confirm(`确定仅通过「${displayName}」的注册申请（不授予管理员权限）？`)
        if (!justApprove) return
        setBusy(userId)
        try {
          await approveSchoolRegistration(userId, false)
          setSchoolRequests((prev) =>
            prev.map((r) => (r.id === userId ? { ...r, schoolApproved: true } : r))
          )
        } catch (e) {
          alert(e instanceof Error ? e.message : '操作失败')
        } finally {
          setBusy(null)
        }
      } else {
        setBusy(userId)
        try {
          await approveSchoolRegistration(userId, true)
          setSchoolRequests((prev) =>
            prev.map((r) => (r.id === userId ? { ...r, schoolApproved: true } : r))
          )
        } catch (e) {
          alert(e instanceof Error ? e.message : '操作失败')
        } finally {
          setBusy(null)
        }
      }
    } else {
      const ok = window.confirm(`确定通过「${displayName}」的${roleText}注册申请吗？\n\n学生账号通过审核后可正常使用平台功能。`)
      if (!ok) return
      setBusy(userId)
      try {
        await approveSchoolRegistration(userId, false)
        setSchoolRequests((prev) =>
          prev.map((r) => (r.id === userId ? { ...r, schoolApproved: true } : r))
        )
      } catch (e) {
        alert(e instanceof Error ? e.message : '操作失败')
      } finally {
        setBusy(null)
      }
    }
  }

  async function handleRejectSchool(userId: string, displayName: string, role: string) {
    if (busy) return
    const roleText = role === 'school' ? '校方' : '学生'
    const ok = window.confirm(`确定拒绝「${displayName}」的${roleText}注册申请吗？拒绝后将删除该账号，此操作不可恢复。`)
    if (!ok) return
    setBusy(userId)
    try {
      await rejectSchoolRegistration(userId)
      setSchoolRequests((prev) => prev.filter((r) => r.id !== userId))
    } catch (e) {
      alert(e instanceof Error ? e.message : '操作失败')
    } finally {
      setBusy(null)
    }
  }

  async function handleDeleteUser(userId: string, displayName: string) {
    if (busy) return
    const ok = window.confirm(`确定要删除用户「${displayName}」吗？此操作不可恢复，该用户的所有活动、评论、收藏和报名记录也将被删除。`)
    if (!ok) return
    setBusy(userId)
    try {
      await deleteAdminUser(userId)
      setAdminUsers((prev) => prev.filter((u) => u.id !== userId))
    } catch (e) {
      alert(e instanceof Error ? e.message : '删除失败')
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
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900">管理后台</h1>
          <p className="mt-2 text-sm text-slate-600">审核学生活动申请与用户评论。</p>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => setTab('overview')}
          className={`rounded-xl border px-4 py-2 text-sm font-semibold shadow-sm transition ${
            tab === 'overview'
              ? 'border-indigo-600 bg-indigo-600 text-white shadow-md shadow-indigo-500/25'
              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
          }`}
        >
          审核总览
        </button>
        <button
          type="button"
          onClick={() => setTab('activities')}
          className={`rounded-xl border px-4 py-2 text-sm font-semibold shadow-sm transition ${
            tab === 'activities'
              ? 'border-indigo-600 bg-indigo-600 text-white shadow-md shadow-indigo-500/25'
              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
          }`}
        >
          活动申请
        </button>
        <button
          type="button"
          onClick={() => setTab('comments')}
          className={`rounded-xl border px-4 py-2 text-sm font-semibold shadow-sm transition ${
            tab === 'comments'
              ? 'border-indigo-600 bg-indigo-600 text-white shadow-md shadow-indigo-500/25'
              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
          }`}
        >
          评论审核
        </button>
        <button
          type="button"
          onClick={() => setTab('school')}
          className={`rounded-xl border px-4 py-2 text-sm font-semibold shadow-sm transition ${
            tab === 'school'
              ? 'border-indigo-600 bg-indigo-600 text-white shadow-md shadow-indigo-500/25'
              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
          }`}
        >
          账号审核
        </button>
        <button
          type="button"
          onClick={() => setTab('avatar')}
          className={`rounded-xl border px-4 py-2 text-sm font-semibold shadow-sm transition ${
            tab === 'avatar'
              ? 'border-indigo-600 bg-indigo-600 text-white shadow-md shadow-indigo-500/25'
              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
          }`}
        >
          头像审核
        </button>
        <button
          type="button"
          onClick={() => setTab('nickname')}
          className={`rounded-xl border px-4 py-2 text-sm font-semibold shadow-sm transition ${
            tab === 'nickname'
              ? 'border-indigo-600 bg-indigo-600 text-white shadow-md shadow-indigo-500/25'
              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
          }`}
        >
          昵称审核
        </button>
        <button
          type="button"
          onClick={() => setTab('users')}
          className={`rounded-xl border px-4 py-2 text-sm font-semibold shadow-sm transition ${
            tab === 'users'
              ? 'border-indigo-600 bg-indigo-600 text-white shadow-md shadow-indigo-500/25'
              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
          }`}
        >
          用户管理
        </button>
      </div>

      {tab === 'overview' && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div
            onClick={() => setTab('activities')}
            className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:border-indigo-300 hover:shadow-md transition"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-500">活动申请</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">—</p>
                <p className="mt-1 text-xs text-slate-400">点击查看详情</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-indigo-100 flex items-center justify-center">
                <svg className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
          </div>

          <div
            onClick={() => setTab('comments')}
            className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:border-indigo-300 hover:shadow-md transition"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-500">评论审核</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">—</p>
                <p className="mt-1 text-xs text-slate-400">点击查看详情</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-green-100 flex items-center justify-center">
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
            </div>
          </div>

          <div
            onClick={() => setTab('school')}
            className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:border-indigo-300 hover:shadow-md transition"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-500">账号审核</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">—</p>
                <p className="mt-1 text-xs text-slate-400">点击查看详情</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center">
                <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            </div>
          </div>

          <div
            onClick={() => setTab('avatar')}
            className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:border-indigo-300 hover:shadow-md transition"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-500">头像审核</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">—</p>
                <p className="mt-1 text-xs text-slate-400">点击查看详情</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-purple-100 flex items-center justify-center">
                <svg className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
            </div>
          </div>

          <div
            onClick={() => setTab('nickname')}
            className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:border-indigo-300 hover:shadow-md transition"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-500">昵称审核</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">—</p>
                <p className="mt-1 text-xs text-slate-400">点击查看详情</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-orange-100 flex items-center justify-center">
                <svg className="h-6 w-6 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            </div>
          </div>

          <div
            onClick={() => setTab('users')}
            className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:border-indigo-300 hover:shadow-md transition"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-500">用户管理</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">—</p>
                <p className="mt-1 text-xs text-slate-400">点击查看详情</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-gray-100 flex items-center justify-center">
                <svg className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'comments' && (
        <div className="mt-6">
          <div className="mb-4 flex justify-end">
            <button
              type="button"
              onClick={() => setTab('comments')}
              className="rounded-full border border-slate-200 bg-white px-5 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
            >
              刷新
            </button>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white/80 py-12 text-center text-slate-600 shadow-sm">
            当前没有待审核项
          </div>
        </div>
      )}

      {tab === 'activities' && (
        <>
          <div className="mb-4 flex justify-end">
            <button
              type="button"
              onClick={() => loadActivities()}
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
                          onClick={() => approveActivity(r.id)}
                          className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
                        >
                          通过
                        </button>
                        <button
                          type="button"
                          disabled={busy === r.id}
                          onClick={() => rejectActivity(r.id)}
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
        </>
      )}

      {tab === 'school' && (
        <>
          <div className="mb-4 flex justify-end">
            <button
              type="button"
              onClick={() => loadSchoolRegistrations()}
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
          ) : schoolRequests.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white/80 py-12 text-center text-slate-600 shadow-sm">
              暂无注册申请
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full min-w-[800px]">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700">
                      角色
                    </th>
                    <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700">
                      申请昵称
                    </th>
                    <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700">
                      邮箱
                    </th>
                    <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700">
                      学号 / 姓名
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
                  {schoolRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-slate-50">
                      <td className="whitespace-nowrap px-4 py-4">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${
                          req.role === 'school'
                            ? 'bg-blue-50 text-blue-800 ring-blue-100'
                            : 'bg-indigo-50 text-indigo-800 ring-indigo-100'
                        }`}>
                          {roleLabel(req.role)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4">
                        <div className="font-semibold text-slate-900">{req.displayName}</div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4">
                        <div className="text-sm text-slate-600">{req.email}</div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4">
                        {req.role === 'student' ? (
                          <div className="text-sm text-slate-600">
                            {req.studentId || '—'}
                            {req.realName && <span className="ml-2 text-slate-500">({req.realName})</span>}
                          </div>
                        ) : (
                          <div className="text-sm text-slate-400">—</div>
                        )}
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
                              onClick={() => handleApproveSchool(req.id, req.displayName, req.role)}
                              className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
                            >
                              {busy === req.id ? '处理中…' : '通过'}
                            </button>
                            <button
                              type="button"
                              disabled={busy === req.id}
                              onClick={() => handleRejectSchool(req.id, req.displayName, req.role)}
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
        </>
      )}

      {tab === 'avatar' && (
        <>
          {loading ? (
            <p className="mt-6 text-slate-500">加载中…</p>
          ) : avatarApprovals.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center">
              <svg className="mx-auto h-12 w-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <p className="mt-4 text-slate-600">暂无待审核的头像申请</p>
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {avatarApprovals.map((approval) => (
                <div
                  key={approval.id}
                  className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div
                    className="h-16 w-16 overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200 cursor-pointer transition hover:ring-indigo-400"
                    onClick={() => setPreviewImage({ src: approval.filePath, alt: `${approval.user.displayName}的头像` })}
                  >
                    <img
                      src={approval.filePath}
                      alt="待审核头像"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-800">{approval.user.displayName}</p>
                    <p className="text-sm text-slate-500">{approval.user.email}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      提交于 {new Date(approval.createdAt).toLocaleString('zh-CN')}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApproveAvatar(approval.id)}
                      disabled={busy === approval.id}
                      className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-emerald-500/25 transition hover:bg-emerald-700 disabled:opacity-60"
                    >
                      {busy === approval.id ? '处理中…' : '通过'}
                    </button>
                    <button
                      onClick={() => handleRejectAvatar(approval.id)}
                      disabled={busy === approval.id}
                      className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-red-500/25 transition hover:bg-red-700 disabled:opacity-60"
                    >
                      {busy === approval.id ? '处理中…' : '拒绝'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {previewImage && (
            <ImagePreview
              src={previewImage.src}
              alt={previewImage.alt}
              onClose={() => setPreviewImage(null)}
            />
          )}
        </>
      )}

      {tab === 'nickname' && (
        <>
          <div className="mb-4 flex justify-end">
            <button
              type="button"
              onClick={() => loadNicknameApprovals()}
              className="rounded-full border border-slate-200 bg-white px-5 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
            >
              刷新
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600"></div>
            </div>
          ) : nicknameApprovals.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white py-20 shadow-sm">
              <svg className="h-16 w-16 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="mt-4 text-slate-600">暂无待审核的昵称修改申请</p>
            </div>
          ) : (
            <div className="space-y-4">
              {nicknameApprovals.map((approval) => (
                <div
                  key={approval.id}
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                          <span className="text-sm font-semibold text-indigo-600">
                            {approval.currentNickname.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800">{approval.currentNickname}</p>
                          <p className="text-sm text-slate-500">{approval.userEmail}</p>
                        </div>
                      </div>

                      {approval.studentId && approval.realName && (
                        <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm">
                          <p className="text-slate-500">学生信息：{approval.realName} ({approval.studentId})</p>
                        </div>
                      )}

                      <div className="mt-4 flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-slate-500">当前昵称：</span>
                          <span className="font-medium text-slate-700">{approval.currentNickname}</span>
                        </div>
                        <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-slate-500">申请昵称：</span>
                          <span className="font-medium text-indigo-600">{approval.requestedNickname}</span>
                        </div>
                      </div>

                      <p className="mt-3 text-xs text-slate-400">
                        申请时间：{new Date(approval.createdAt).toLocaleString('zh-CN')}
                      </p>
                    </div>

                    <div className="ml-4 flex flex-col gap-2">
                      <button
                        onClick={() => handleApproveNickname(approval.id)}
                        disabled={busy === approval.id}
                        className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-500/25 transition hover:bg-emerald-700 disabled:opacity-60"
                      >
                        {busy === approval.id ? '处理中…' : '通过'}
                      </button>
                      <button
                        onClick={() => handleRejectNickname(approval.id)}
                        disabled={busy === approval.id}
                        className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-red-500/25 transition hover:bg-red-700 disabled:opacity-60"
                      >
                        {busy === approval.id ? '处理中…' : '拒绝'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'users' && (
        <>
          <div className="mb-4 flex justify-end">
            <button
              type="button"
              onClick={() => loadAdminUsers()}
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
          ) : adminUsers.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white/80 py-12 text-center text-slate-600 shadow-sm">
              当前没有用户
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700">
                      删除
                    </th>
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
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {adminUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50">
                      <td className="whitespace-nowrap px-4 py-4">
                        <button
                          type="button"
                          disabled={busy === user.id}
                          onClick={() => handleDeleteUser(user.id, user.displayName)}
                          className="rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 ring-1 ring-red-100 transition hover:bg-red-100 disabled:opacity-50"
                        >
                          {busy === user.id ? '删除中…' : '删除'}
                        </button>
                      </td>
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
