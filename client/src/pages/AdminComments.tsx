import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  adminDeleteComment,
  approveComment,
  listPendingComments,
} from '../api'
import type { Comment } from '../types'
import { useToast } from '../context/ToastContext'
import { roleLabel } from '../types'

export function AdminComments() {
  const { showToast } = useToast()
  const [items, setItems] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setItems(await listPendingComments())
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function approve(id: string) {
    setBusy(id)
    try {
      await approveComment(id)
      showToast('评论已通过', 'success')
      setItems((prev) => prev.filter((c) => c.id !== id))
    } catch (e) {
      showToast(e instanceof Error ? e.message : '操作失败', 'error')
    } finally {
      setBusy(null)
    }
  }

  async function remove(id: string) {
    if (!window.confirm('确定删除该评论？')) return
    setBusy(id)
    try {
      await adminDeleteComment(id)
      showToast('评论已删除', 'success')
      setItems((prev) => prev.filter((c) => c.id !== id))
    } catch (e) {
      showToast(e instanceof Error ? e.message : '删除失败', 'error')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div>
      {loading ? (
        <p className="text-slate-500">加载中…</p>
      ) : items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 py-12 text-center text-slate-600">
          暂无待审核评论
        </p>
      ) : (
        <ul className="space-y-4">
          {items.map((c) => (
            <li
              key={c.id}
              className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm"
            >
              <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="font-semibold text-slate-800">
                  {roleLabel(c.author.role)} · {c.author.displayName}
                </span>
                {c.activityTitle ? (
                  <Link
                    to={`/activity/${c.activityId}`}
                    className="text-indigo-700 underline decoration-indigo-300"
                  >
                    《{c.activityTitle}》
                  </Link>
                ) : null}
              </div>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800">{c.content}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy === c.id}
                  onClick={() => approve(c.id)}
                  className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
                >
                  通过
                </button>
                <button
                  type="button"
                  disabled={busy === c.id}
                  onClick={() => remove(c.id)}
                  className="rounded-full border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-800 disabled:opacity-50"
                >
                  删除
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
