import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { deleteActivity, getActivity, getActivityComments, createComment, deleteComment } from '../api'
import { useAuth } from '../context/AuthContext'
import { formatRange } from '../lib/dates'
import { badgeClass, barClass } from '../lib/categoryStyles'
import { publisherChannelLabel, roleLabel } from '../types'
import type { Comment } from '../types'
import { formField, formSubmitButton, errorMessage } from '../lib/styles'

function DetailSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-2 w-full max-w-md rounded-full bg-slate-200/90" />
      <div className="h-10 max-w-2xl rounded-xl bg-slate-200/80" />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="h-24 rounded-2xl bg-slate-100" />
        <div className="h-24 rounded-2xl bg-slate-100" />
      </div>
      <div className="h-48 rounded-2xl bg-slate-100" />
    </div>
  )
}

export function ActivityDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, ready } = useAuth()
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [activity, setActivity] = useState<Awaited<ReturnType<typeof getActivity>> | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [comments, setComments] = useState<Comment[]>([])
  const [loadingComments, setLoadingComments] = useState(false)
  const [commentContent, setCommentContent] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)
  const [commentError, setCommentError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setErr(null)
      try {
        const a = await getActivity(id)
        if (!cancelled) setActivity(a)
        
        // 加载评论
        setLoadingComments(true)
        try {
          const c = await getActivityComments(id)
          if (!cancelled) setComments(c)
        } catch (e) {
          console.error('加载评论失败:', e)
        } finally {
          if (!cancelled) setLoadingComments(false)
        }
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

  const canManage =
    ready &&
    user &&
    activity &&
    (activity.author.id === user.id || user.isPlatformAdmin)

  async function handleDelete() {
    if (!id || !canManage) return
    if (!window.confirm('确定删除该活动？此操作不可恢复。')) return
    setDeleting(true)
    try {
      await deleteActivity(id)
      navigate('/')
    } catch (e) {
      alert(e instanceof Error ? e.message : '删除失败')
    } finally {
      setDeleting(false)
    }
  }

  async function handleCommentSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!id || !user || !commentContent.trim()) return
    
    setSubmittingComment(true)
    setCommentError(null)
    try {
      const newComment = await createComment(id, commentContent.trim())
      setComments([newComment, ...comments])
      setCommentContent('')
    } catch (e) {
      setCommentError(e instanceof Error ? e.message : '发布评论失败')
    } finally {
      setSubmittingComment(false)
    }
  }

  async function handleCommentDelete(commentId: string) {
    if (!window.confirm('确定删除该评论？此操作不可恢复。')) return
    
    try {
      await deleteComment(commentId)
      setComments(comments.filter(c => c.id !== commentId))
    } catch (e) {
      alert(e instanceof Error ? e.message : '删除评论失败')
    }
  }

  if (!id) return <p className="text-red-600">无效链接</p>
  if (loading) return <DetailSkeleton />
  if (err || !activity) {
    return (
      <div className="rounded-2xl border border-red-200/80 bg-red-50/90 px-5 py-4 text-red-800 shadow-sm">
        {err || '未找到活动'}
        <div className="mt-4">
          <Link to="/" className="font-semibold text-indigo-700 underline decoration-indigo-300">
            返回首页
          </Link>
        </div>
      </div>
    )
  }

  const a = activity
  const bar = barClass(a.category)
  const badge = badgeClass(a.category)

  return (
    <article className="overflow-hidden rounded-3xl border border-white/70 bg-white/80 shadow-xl shadow-slate-900/8 ring-1 ring-slate-200/60 backdrop-blur-md">
      <div className={`h-2 bg-gradient-to-r ${bar}`} aria-hidden />
      <div className="p-6 sm:p-10">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${badge}`}>
                {a.category}
              </span>
              <span
                className={
                  a.publisherRole === 'school'
                    ? 'rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-900 ring-1 ring-indigo-200/80'
                    : 'rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-900 ring-1 ring-teal-200/80'
                }
              >
                {publisherChannelLabel(a.publisherRole)}
              </span>
              <span className="rounded-full bg-slate-100/90 px-3 py-1 text-xs font-semibold text-slate-800 ring-1 ring-slate-200/80">
                发布者 {roleLabel(a.author.role)} · {a.author.displayName}
              </span>
            </div>
            <h1 className="font-display text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-4xl">
              {a.title}
            </h1>
            {a.organizer ? (
              <p className="mt-3 text-slate-600">
                主办方：<span className="font-semibold text-slate-800">{a.organizer}</span>
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:flex-col sm:items-stretch sm:gap-2 md:flex-row md:items-center">
            <Link
              to="/"
              className="rounded-full border border-slate-200/90 bg-white px-4 py-2 text-center text-sm font-semibold text-slate-800 no-underline shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50/30"
            >
              ← 返回广场
            </Link>
            {canManage ? (
              <>
                <Link
                  to={`/activity/${id}/edit`}
                  className="rounded-full bg-gradient-to-r from-slate-800 to-slate-900 px-4 py-2 text-center text-sm font-semibold text-white no-underline shadow-md transition hover:from-slate-700 hover:to-slate-800"
                >
                  编辑
                </Link>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={handleDelete}
                  className="rounded-full border border-red-200 bg-red-50/90 px-4 py-2 text-sm font-semibold text-red-800 transition hover:bg-red-100 disabled:opacity-50"
                >
                  {deleting ? '删除中…' : '删除'}
                </button>
              </>
            ) : (
              <p className="max-w-[220px] text-xs leading-relaxed text-slate-500">
                {ready && !user
                  ? '登录后，发布者或平台管理员可编辑或删除。'
                  : !user?.isPlatformAdmin
                    ? '你不是该活动的发布者，亦非平台管理员。'
                    : null}
              </p>
            )}
          </div>
        </div>

        <dl className="mb-10 grid gap-4 rounded-2xl border border-slate-100 bg-gradient-to-br from-slate-50/90 to-white p-6 text-sm sm:grid-cols-2">
          <div>
            <dt className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">时间</dt>
            <dd className="font-medium text-slate-900">{formatRange(a.startAt, a.endAt)}</dd>
          </div>
          <div>
            <dt className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">地点</dt>
            <dd className="font-medium text-slate-900">{a.location || '—'}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">联系方式</dt>
            <dd className="font-medium text-slate-900">{a.contact || '—'}</dd>
          </div>
        </dl>

        <section>
          <h2 className="font-display mb-4 text-xl font-semibold text-slate-900">活动说明</h2>
          <div className="whitespace-pre-wrap rounded-2xl border border-slate-100 bg-white/95 px-6 py-7 text-[1.02rem] leading-[1.75] text-slate-700 shadow-inner shadow-slate-900/5 ring-1 ring-slate-100/80">
            {a.description}
          </div>
        </section>

        <section className="mt-12">
          <h2 className="font-display mb-6 text-xl font-semibold text-slate-900">评论</h2>
          
          {/* 评论表单 */}
          {ready && user ? (
            <form onSubmit={handleCommentSubmit} className="mb-8 space-y-4">
              {commentError ? (
                <div className={errorMessage}>{commentError}</div>
              ) : null}
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">发表评论</span>
                <textarea
                  value={commentContent}
                  onChange={(e) => setCommentContent(e.target.value)}
                  disabled={submittingComment}
                  maxLength={2000}
                  rows={4}
                  placeholder="分享你的想法..."
                  className={`${formField} resize-y min-h-[120px]`}
                />
                <p className="mt-1 text-xs text-slate-500">{commentContent.length}/2000</p>
              </label>
              <button
                type="submit"
                disabled={submittingComment || !commentContent.trim()}
                className={formSubmitButton}
              >
                {submittingComment ? '提交中…' : '发布评论'}
              </button>
            </form>
          ) : (
            <div className="mb-8 rounded-2xl border border-slate-100 bg-slate-50/90 p-6 text-center text-slate-600">
              <p className="mb-4">登录后才能发表评论</p>
              <Link
                to="/login"
                className="inline-block rounded-full bg-gradient-to-r from-indigo-600 to-sky-600 px-6 py-2 font-semibold text-white shadow-md transition hover:to-indigo-600"
              >
                去登录
              </Link>
            </div>
          )}

          {/* 评论列表 */}
          {loadingComments ? (
            <div className="animate-pulse space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-2xl border border-slate-100 bg-white p-4">
                  <div className="mb-2 flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-slate-200" />
                    <div className="space-y-1">
                      <div className="h-3 w-24 rounded bg-slate-200" />
                      <div className="h-2 w-40 rounded bg-slate-100" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-2 w-full rounded bg-slate-200" />
                    <div className="h-2 w-3/4 rounded bg-slate-200" />
                    <div className="h-2 w-1/2 rounded bg-slate-200" />
                  </div>
                </div>
              ))}
            </div>
          ) : comments.length > 0 ? (
            <div className="space-y-4">
              {comments.map((comment) => {
                const canDeleteComment = ready && user && (comment.author.id === user.id || user.isPlatformAdmin)
                return (
                  <div key={comment.id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-indigo-500 to-sky-500 text-white font-semibold">
                          {comment.author.displayName.charAt(0)}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-slate-900">{comment.author.displayName}</div>
                          <div className="text-xs text-slate-500">
                            {roleLabel(comment.author.role)} · {new Date(comment.createdAt).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      {canDeleteComment ? (
                        <button
                          type="button"
                          onClick={() => handleCommentDelete(comment.id)}
                          className="rounded-full bg-red-50/90 px-3 py-1 text-xs font-semibold text-red-800 transition hover:bg-red-100"
                        >
                          删除
                        </button>
                      ) : null}
                    </div>
                    <div className="text-sm leading-relaxed text-slate-700">
                      {comment.content}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-100 bg-slate-50/90 p-8 text-center text-slate-600">
              <p>暂无评论，快来发表第一条评论吧！</p>
            </div>
          )}
        </section>
      </div>
    </article>
  )
}
