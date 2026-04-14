import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { listActivities } from '../api'
import { useAuth } from '../context/AuthContext'
import type { Activity } from '../types'

type CommentStatus = 'pending' | 'approved' | 'rejected'

interface CommentItem {
  id: string
  activityId: string
  activityTitle: string
  authorName: string
  content: string
  createdAt: string
  status: CommentStatus
}

function statusBadge(status: CommentStatus): string {
  if (status === 'approved') return 'bg-emerald-50 text-emerald-700 ring-emerald-200'
  if (status === 'rejected') return 'bg-rose-50 text-rose-700 ring-rose-200'
  return 'bg-amber-50 text-amber-700 ring-amber-200'
}

function statusLabel(status: CommentStatus): string {
  if (status === 'approved') return '已通过'
  if (status === 'rejected') return '已拒绝'
  return '待审核'
}

export function CommentsCenter() {
  const { user, ready } = useAuth()
  const [activities, setActivities] = useState<Activity[]>([])
  const [loadingActivities, setLoadingActivities] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedActivityId, setSelectedActivityId] = useState('')
  const [commentText, setCommentText] = useState('')
  const [comments, setComments] = useState<CommentItem[]>([])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoadingActivities(true)
      setError(null)
      try {
        const data = await listActivities({})
        if (!cancelled) {
          setActivities(data)
          setSelectedActivityId(data[0]?.id ?? '')
          setComments(
            data.slice(0, 3).map((activity, idx) => ({
              id: `seed-${activity.id}`,
              activityId: activity.id,
              activityTitle: activity.title,
              authorName: idx === 1 ? '系统演示用户' : '校园体验官',
              content:
                idx === 1
                  ? '活动信息清晰，建议补充现场签到说明。'
                  : '这个活动看起来很有价值，期待参与。',
              createdAt: new Date(Date.now() - idx * 3600_000).toISOString(),
              status: idx === 2 ? 'pending' : 'approved',
            }))
          )
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : '加载活动失败')
      } finally {
        if (!cancelled) setLoadingActivities(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  const selectedActivity = useMemo(
    () => activities.find((activity) => activity.id === selectedActivityId) ?? null,
    [activities, selectedActivityId]
  )

  const filteredComments = useMemo(
    () =>
      selectedActivityId
        ? comments.filter((comment) => comment.activityId === selectedActivityId)
        : comments,
    [comments, selectedActivityId]
  )

  function handleCreateComment(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!user) {
      alert('请先登录后再评论。')
      return
    }
    const content = commentText.trim()
    if (!content) return
    if (!selectedActivity) {
      alert('请先选择活动。')
      return
    }

    const next: CommentItem = {
      id: crypto.randomUUID(),
      activityId: selectedActivity.id,
      activityTitle: selectedActivity.title,
      authorName: user.displayName,
      content,
      createdAt: new Date().toISOString(),
      status: user.isPlatformAdmin ? 'approved' : 'pending',
    }
    setComments((prev) => [next, ...prev])
    setCommentText('')
  }

  function updateStatus(id: string, status: CommentStatus) {
    setComments((prev) => prev.map((comment) => (comment.id === id ? { ...comment, status } : comment)))
  }

  function removeComment(id: string) {
    setComments((prev) => prev.filter((comment) => comment.id !== id))
  }

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-white/70 bg-white/80 px-6 py-7 shadow-lg shadow-slate-900/5 ring-1 ring-slate-200/60 backdrop-blur-sm sm:px-8">
        <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900">评论中心</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          按需求文档实现评论相关能力：用户可对活动发表评论，平台管理员可审核和删除评论。当前页面先完成前端交互闭环，后续可无缝接入后端评论接口。
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_1.4fr]">
        <article className="rounded-2xl border border-slate-200/70 bg-white/90 p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">发表评论</h2>
          <p className="mt-1 text-sm text-slate-500">选择活动并提交评论内容，登录用户可发布，管理员发布后默认通过。</p>
          <form className="mt-4 space-y-3" onSubmit={handleCreateComment}>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">活动</span>
              <select
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                value={selectedActivityId}
                onChange={(e) => setSelectedActivityId(e.target.value)}
                disabled={loadingActivities || activities.length === 0}
              >
                {activities.length === 0 ? (
                  <option value="">暂无活动可评论</option>
                ) : (
                  activities.map((activity) => (
                    <option value={activity.id} key={activity.id}>
                      {activity.title}
                    </option>
                  ))
                )}
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">评论内容</span>
              <textarea
                rows={5}
                maxLength={500}
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                placeholder={ready && user ? '请输入你对活动的看法...' : '登录后可发表评论'}
                disabled={!user}
              />
            </label>

            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-500">{commentText.trim().length}/500</p>
              <button
                type="submit"
                className="rounded-full bg-gradient-to-r from-indigo-600 to-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-indigo-500/25 transition hover:to-indigo-600 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={!user || !selectedActivityId || !commentText.trim()}
              >
                发布评论
              </button>
            </div>
          </form>
          {!user ? (
            <p className="mt-3 text-xs text-amber-700">
              你当前未登录，点击
              <Link to="/login" className="mx-1 font-semibold text-indigo-700 underline">
                去登录
              </Link>
              后可使用评论功能。
            </p>
          ) : null}
          {error ? <p className="mt-3 text-xs text-rose-700">活动加载失败：{error}</p> : null}
        </article>

        <article className="rounded-2xl border border-slate-200/70 bg-white/90 p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-slate-900">评论管理</h2>
            <span className="text-xs text-slate-500">
              {selectedActivity ? `当前活动：${selectedActivity.title}` : '显示全部评论'}
            </span>
          </div>
          <div className="space-y-3">
            {filteredComments.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50/70 px-4 py-6 text-center text-sm text-slate-500">
                该活动下还没有评论，快来发布第一条吧。
              </p>
            ) : (
              filteredComments.map((comment) => (
                <article key={comment.id} className="rounded-xl border border-slate-200/80 bg-white px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900">{comment.authorName}</p>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${statusBadge(comment.status)}`}
                    >
                      {statusLabel(comment.status)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-700">{comment.content}</p>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs text-slate-500">
                      所属活动：
                      <span className="font-medium text-slate-700">{comment.activityTitle}</span>
                    </p>
                    <p className="text-xs text-slate-500">
                      发布时间：{new Date(comment.createdAt).toLocaleString('zh-CN', { hour12: false })}
                    </p>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center justify-end gap-2">
                    {user?.isPlatformAdmin ? (
                      <>
                        <button
                          type="button"
                          onClick={() => updateStatus(comment.id, 'approved')}
                          className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                        >
                          通过
                        </button>
                        <button
                          type="button"
                          onClick={() => updateStatus(comment.id, 'rejected')}
                          className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 transition hover:bg-amber-100"
                        >
                          拒绝
                        </button>
                        <button
                          type="button"
                          onClick={() => removeComment(comment.id)}
                          className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
                        >
                          删除
                        </button>
                      </>
                    ) : null}
                  </div>
                </article>
              ))
            )}
          </div>
        </article>
      </div>

      
    </section>
  )
}
