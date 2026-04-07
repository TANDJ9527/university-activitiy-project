import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { getActivity, updateActivity } from '../api'
import { useAuth } from '../context/AuthContext'
import { ActivityForm, payloadFromValues, valuesFromActivity } from './ActivityForm'
import type { Activity } from '../types'

export function EditActivity() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, ready } = useAuth()
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [activity, setActivity] = useState<Activity | null>(null)

  useEffect(() => {
    if (!id) {
      setLoading(false)
      return
    }
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setErr(null)
      try {
        const a = await getActivity(id)
        if (!cancelled) setActivity(a)
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : '加载失败')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [id])

  if (!id) return <p className="text-red-600">无效链接</p>
  if (!ready) return <p className="text-slate-500">加载中…</p>
  if (!user)
    return <Navigate to="/login" replace state={{ from: `/activity/${id}/edit` }} />

  if (loading) return <p className="text-slate-500">加载中…</p>
  if (err || !activity) {
    return (
      <div className="rounded-2xl border border-red-200/80 bg-red-50/90 px-5 py-4 text-red-800 shadow-sm">
        {err || '未找到活动'}
        <Link to="/" className="ml-2 font-semibold text-indigo-700 underline decoration-indigo-300">
          首页
        </Link>
      </div>
    )
  }

  if (activity.author.id !== user.id && !user.isPlatformAdmin) {
    return (
      <div className="rounded-2xl border border-amber-200/80 bg-amber-50/90 px-5 py-5 text-amber-950 shadow-sm">
        <p className="font-display font-semibold">无权编辑</p>
        <p className="mt-1 text-sm opacity-90">仅活动发布者或平台管理员可以修改。</p>
        <Link
          to={`/activity/${activity.id}`}
          className="mt-4 inline-block font-semibold text-indigo-700 underline decoration-indigo-300"
        >
          返回活动详情
        </Link>
      </div>
    )
  }

  return (
    <div>
      {user.isPlatformAdmin && activity.author.id !== user.id ? (
        <p className="mb-4 rounded-2xl border border-amber-200/80 bg-amber-50/90 px-4 py-3 text-sm text-amber-950">
          你正以<strong>平台管理员</strong>身份编辑他人发布的活动。
        </p>
      ) : null}
      <h1 className="font-display mb-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">编辑活动</h1>
      <p className="mb-8">
        <Link
          to={`/activity/${activity.id}`}
          className="text-sm font-semibold text-indigo-700 underline decoration-indigo-300 underline-offset-4"
        >
          ← 返回详情
        </Link>
      </p>
      <ActivityForm
        key={activity.id}
        initial={valuesFromActivity(activity)}
        submitLabel="保存修改"
        onSubmit={async (v) => {
          const payload = payloadFromValues(v)
          await updateActivity(activity.id, payload)
          navigate(`/activity/${activity.id}`)
        }}
      />
    </div>
  )
}
