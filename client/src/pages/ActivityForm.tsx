import { useState, type FormEvent } from 'react'
import { CATEGORIES } from '../types'
import { fromDatetimeLocalValue, toDatetimeLocalValue } from '../lib/dates'
import type { Activity } from '../types'

export type ActivityFormValues = {
  title: string
  description: string
  location: string
  organizer: string
  contact: string
  category: string
  startAt: string
  endAt: string
}

const empty: ActivityFormValues = {
  title: '',
  description: '',
  location: '',
  organizer: '',
  contact: '',
  category: '其他',
  startAt: '',
  endAt: '',
}

export function valuesFromActivity(a: Activity): ActivityFormValues {
  return {
    title: a.title,
    description: a.description,
    location: a.location,
    organizer: a.organizer,
    contact: a.contact,
    category: a.category,
    startAt: toDatetimeLocalValue(a.startAt),
    endAt: a.endAt ? toDatetimeLocalValue(a.endAt) : '',
  }
}

export function ActivityForm({
  initial,
  submitLabel,
  onSubmit,
  disabled,
}: {
  initial?: Partial<ActivityFormValues>
  submitLabel: string
  onSubmit: (v: ActivityFormValues) => Promise<void>
  disabled?: boolean
}) {
  const [v, setV] = useState<ActivityFormValues>({ ...empty, ...initial })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!v.title.trim()) {
      setError('请填写标题')
      return
    }
    if (!v.description.trim()) {
      setError('请填写活动说明')
      return
    }
    if (!v.startAt) {
      setError('请选择开始时间')
      return
    }
    setSaving(true)
    try {
      await onSubmit(v)
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const field =
    'w-full rounded-xl border-0 bg-white/95 px-4 py-2.5 text-slate-900 shadow-inner shadow-slate-900/5 ring-1 ring-slate-200/90 outline-none transition placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-indigo-400/40 disabled:opacity-60'

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-2xl space-y-5 rounded-3xl border border-white/70 bg-white/60 p-6 shadow-lg shadow-slate-900/5 ring-1 ring-slate-200/50 backdrop-blur-sm sm:p-8"
    >
      {error ? (
        <div className="rounded-xl border border-red-200/80 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      ) : null}

      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold text-slate-700">标题 *</span>
        <input
          required
          maxLength={120}
          value={v.title}
          disabled={disabled || saving}
          onChange={(e) => setV((x) => ({ ...x, title: e.target.value }))}
          className={field}
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold text-slate-700">类别</span>
        <select
          value={v.category}
          disabled={disabled || saving}
          onChange={(e) => setV((x) => ({ ...x, category: e.target.value }))}
          className={`${field} cursor-pointer`}
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-slate-700">开始时间 *</span>
          <input
            type="datetime-local"
            required
            value={v.startAt}
            disabled={disabled || saving}
            onChange={(e) => setV((x) => ({ ...x, startAt: e.target.value }))}
            className={field}
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-slate-700">结束时间（可选）</span>
          <input
            type="datetime-local"
            value={v.endAt}
            disabled={disabled || saving}
            onChange={(e) => setV((x) => ({ ...x, endAt: e.target.value }))}
            className={field}
          />
        </label>
      </div>

      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold text-slate-700">地点</span>
        <input
          value={v.location}
          disabled={disabled || saving}
          onChange={(e) => setV((x) => ({ ...x, location: e.target.value }))}
          placeholder="例如：图书馆报告厅"
          className={field}
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold text-slate-700">主办方</span>
        <input
          value={v.organizer}
          disabled={disabled || saving}
          onChange={(e) => setV((x) => ({ ...x, organizer: e.target.value }))}
          className={field}
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold text-slate-700">联系方式</span>
        <input
          value={v.contact}
          disabled={disabled || saving}
          onChange={(e) => setV((x) => ({ ...x, contact: e.target.value }))}
          placeholder="邮箱、微信群、电话等"
          className={field}
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold text-slate-700">活动说明 *</span>
        <textarea
          required
          rows={8}
          maxLength={8000}
          value={v.description}
          disabled={disabled || saving}
          onChange={(e) => setV((x) => ({ ...x, description: e.target.value }))}
          className={`${field} resize-y min-h-[200px]`}
        />
      </label>

      <button
        type="submit"
        disabled={disabled || saving}
        className="rounded-full bg-gradient-to-r from-indigo-600 to-sky-600 px-8 py-3 font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:to-indigo-600 disabled:opacity-50"
      >
        {saving ? '提交中…' : submitLabel}
      </button>
    </form>
  )
}

export function payloadFromValues(v: ActivityFormValues) {
  return {
    title: v.title.trim(),
    description: v.description.trim(),
    location: v.location.trim(),
    organizer: v.organizer.trim(),
    contact: v.contact.trim(),
    category: v.category,
    startAt: fromDatetimeLocalValue(v.startAt),
    endAt: v.endAt.trim() ? fromDatetimeLocalValue(v.endAt) : null,
  }
}
