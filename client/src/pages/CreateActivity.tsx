import { Navigate, useNavigate } from 'react-router-dom'
import { createActivity } from '../api'
import { useAuth } from '../context/AuthContext'
import { ActivityForm, payloadFromValues } from './ActivityForm'

export function CreateActivity() {
  const { user, ready } = useAuth()
  const navigate = useNavigate()

  if (!ready) return <p className="text-slate-500">加载中…</p>
  if (!user) return <Navigate to="/login" replace state={{ from: '/publish' }} />

  return (
    <div>
      <h1 className="font-display mb-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
        发布活动
      </h1>
      <p className="mb-8 max-w-2xl text-pretty text-slate-600">
        当前以「
        <span className="font-semibold text-slate-800">
          {user.role === 'school' ? '校方 / 组织方' : '学生'}
        </span>
        」身份发布。场次将展示你的昵称与身份标签，便于同学们辨识官方与学生自发活动。
      </p>
      <ActivityForm
        submitLabel="发布活动"
        onSubmit={async (v) => {
          const payload = payloadFromValues(v)
          const { activity } = await createActivity(payload)
          navigate(`/activity/${activity.id}`)
        }}
      />
    </div>
  )
}
