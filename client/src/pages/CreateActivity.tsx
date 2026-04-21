import { Navigate, useNavigate } from 'react-router-dom'
import { createActivity } from '../api'
import { useAuth } from '../context/AuthContext'
import { ActivityForm } from './ActivityForm'
import { payloadFromValues } from './ActivityFormTypes'
import { Sparkles, ArrowLeft } from 'lucide-react'

export function CreateActivity() {
  const { user, ready } = useAuth()
  const navigate = useNavigate()

  if (!ready) return <p className="text-slate-500">加载中…</p>
  if (!user) return <Navigate to="/login" replace state={{ from: '/publish' }} />

  const roleBadge = user.role === 'school' 
    ? { text: '校方 / 组织方', color: 'bg-indigo-50 text-indigo-700 ring-indigo-200' }
    : { text: '学生', color: 'bg-sky-50 text-sky-700 ring-sky-200' }

  return (
    <div className="mx-auto max-w-4xl">
      {/* 返回按钮 */}
      <button
        onClick={() => navigate('/')}
        className="group mb-6 flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4 transition group-hover:-translate-x-0.5" />
        返回活动广场
      </button>

      {/* 页面标题卡片 */}
      <div className="mb-8 overflow-hidden rounded-2xl bg-white shadow-xl shadow-slate-900/5 ring-1 ring-slate-200">
        <div className="relative bg-gradient-to-br from-indigo-600 via-indigo-500 to-sky-500 px-6 py-8 sm:px-10 sm:py-10">
          {/* 装饰背景 */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-sky-400/20 blur-3xl" />
          </div>
          
          <div className="relative">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ${roleBadge.color}`}>
                {roleBadge.text}身份
              </span>
            </div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
              发布新活动
            </h1>
            <p className="mt-2 max-w-xl text-indigo-100">
              创建精彩活动，让更多同学参与。场次将展示你的身份标签，便于区分官方与学生自发活动。
            </p>
          </div>
        </div>

        {/* 提示信息 */}
        <div className="border-t border-slate-100 bg-slate-50/50 px-6 py-4 sm:px-10">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs text-indigo-600">
              ✓
            </div>
            <p className="text-sm text-slate-600">
              当前以 <span className="font-semibold text-slate-800">「{roleBadge.text}」</span> 身份发布。
              请确保活动信息真实有效，审核通过后将立即展示在活动广场。
            </p>
          </div>
        </div>
      </div>

      {/* 表单区域 */}
      <div className="rounded-2xl bg-white p-6 shadow-xl shadow-slate-900/5 ring-1 ring-slate-200 sm:p-10">
        <ActivityForm
          submitLabel="发布活动"
          onSubmit={async (v) => {
            const payload = payloadFromValues(v)
            const { activity } = await createActivity(payload)
            navigate(`/activity/${activity.id}`)
          }}
        />
      </div>
    </div>
  )
}
