import { useState, type FormEvent } from 'react'
import { CATEGORIES } from '../types'
import { MapPin, User, Mail, FileText, Tag, Clock, AlertCircle } from 'lucide-react'
import type { ActivityFormValues } from './ActivityFormTypes'
import { getEmptyValues, valuesFromActivity, payloadFromValues } from './ActivityFormTypes'

export { valuesFromActivity, payloadFromValues }

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
  const [v, setV] = useState<ActivityFormValues>({ ...getEmptyValues(), ...initial })
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

  const inputBase = "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:bg-slate-50 disabled:text-slate-400"
  const labelBase = "mb-1.5 flex items-center gap-2 text-sm font-semibold text-slate-700"
  const sectionTitle = "mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-500"

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* 错误提示 */}
      {error ? (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-5 w-5 shrink-0" />
          {error}
        </div>
      ) : null}

      {/* 基本信息区块 */}
      <div className="space-y-5">
        <div className={sectionTitle}>
          <FileText className="h-4 w-4" />
          基本信息
        </div>
        
        <div className="space-y-4">
          <label className="block">
            <span className={labelBase}>
              <FileText className="h-4 w-4 text-indigo-500" />
              活动标题 *
            </span>
            <input
              required
              maxLength={120}
              value={v.title}
              disabled={disabled || saving}
              onChange={(e) => setV((x) => ({ ...x, title: e.target.value }))}
              placeholder="给活动起个吸引人的名字"
              className={inputBase}
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className={labelBase}>
                <Tag className="h-4 w-4 text-indigo-500" />
                活动类别
              </span>
              <select
                value={v.category}
                disabled={disabled || saving}
                onChange={(e) => setV((x) => ({ ...x, category: e.target.value }))}
                className={`${inputBase} cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2364748b%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:1.5em] bg-[right_0.75rem_center] bg-no-repeat pr-10`}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </div>

      {/* 时间安排区块 */}
      <div className="space-y-5">
        <div className={sectionTitle}>
          <Clock className="h-4 w-4" />
          时间安排
        </div>
        
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className={labelBase}>
              <Clock className="h-4 w-4 text-indigo-500" />
              开始时间 *
            </span>
            <input
              type="datetime-local"
              required
              value={v.startAt}
              disabled={disabled || saving}
              onChange={(e) => setV((x) => ({ ...x, startAt: e.target.value }))}
              className={inputBase}
            />
          </label>
          <label className="block">
            <span className={labelBase}>
              <Clock className="h-4 w-4 text-slate-400" />
              结束时间 <span className="font-normal text-slate-400">（可选）</span>
            </span>
            <input
              type="datetime-local"
              value={v.endAt}
              disabled={disabled || saving}
              onChange={(e) => setV((x) => ({ ...x, endAt: e.target.value }))}
              className={inputBase}
            />
          </label>
        </div>
      </div>

      {/* 地点与联系区块 */}
      <div className="space-y-5">
        <div className={sectionTitle}>
          <MapPin className="h-4 w-4" />
          地点与联系
        </div>
        
        <div className="space-y-4">
          <label className="block">
            <span className={labelBase}>
              <MapPin className="h-4 w-4 text-indigo-500" />
              活动地点
            </span>
            <input
              value={v.location}
              disabled={disabled || saving}
              onChange={(e) => setV((x) => ({ ...x, location: e.target.value }))}
              placeholder="例如：图书馆报告厅、操场、线上等"
              className={inputBase}
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className={labelBase}>
                <User className="h-4 w-4 text-indigo-500" />
                主办方
              </span>
              <input
                value={v.organizer}
                disabled={disabled || saving}
                placeholder="组织或社团名称"
                onChange={(e) => setV((x) => ({ ...x, organizer: e.target.value }))}
                className={inputBase}
              />
            </label>
            <label className="block">
              <span className={labelBase}>
                <Mail className="h-4 w-4 text-indigo-500" />
                联系方式
              </span>
              <input
                value={v.contact}
                disabled={disabled || saving}
                onChange={(e) => setV((x) => ({ ...x, contact: e.target.value }))}
                placeholder="邮箱、微信群、电话等"
                className={inputBase}
              />
            </label>
          </div>
        </div>
      </div>

      {/* 活动详情区块 */}
      <div className="space-y-5">
        <div className={sectionTitle}>
          <FileText className="h-4 w-4" />
          活动详情
        </div>
        
        <label className="block">
          <span className={labelBase}>
            <FileText className="h-4 w-4 text-indigo-500" />
            活动说明 *
          </span>
          <textarea
            required
            rows={8}
            maxLength={8000}
            value={v.description}
            disabled={disabled || saving}
            placeholder="详细介绍活动内容、流程、注意事项等，让同学们更好地了解和参与..."
            onChange={(e) => setV((x) => ({ ...x, description: e.target.value }))}
            className={`${inputBase} min-h-[180px] resize-y leading-relaxed`}
          />
          <div className="mt-1.5 flex justify-between text-xs text-slate-400">
            <span>支持 Markdown 格式</span>
            <span>{v.description.length}/8000</span>
          </div>
        </label>
      </div>

      {/* 提交按钮 */}
      <div className="flex items-center gap-4 pt-4">
        <button
          type="submit"
          disabled={disabled || saving}
          className="relative overflow-hidden rounded-xl bg-gradient-to-r from-indigo-600 to-sky-600 px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:shadow-xl hover:shadow-indigo-500/30 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className={saving ? 'opacity-0' : 'opacity-100'}>{submitLabel}</span>
          {saving && (
            <span className="absolute inset-0 flex items-center justify-center">
              <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => window.history.back()}
          disabled={saving}
          className="rounded-xl border border-slate-200 bg-white px-6 py-3.5 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-800 disabled:opacity-60"
        >
          取消
        </button>
      </div>
    </form>
  )
}

