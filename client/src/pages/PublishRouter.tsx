import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { needsActivityModeration } from '../types'
import { CreateActivity } from './CreateActivity'
import { RequirePublisherAccess } from '../components/RouteGuards'

/** 校方/管理员：直接发布后台 */
export function PublishRouter() {
  return (
    <RequirePublisherAccess>
      <CreateActivity />
    </RequirePublisherAccess>
  )
}

/** 学生：仅提交审核申请 */
export function ApplyRouter() {
  const { user, ready } = useAuth()
  if (!ready) return <p className="text-slate-500">加载中…</p>
  if (!user) return <Navigate to="/login" replace state={{ from: '/apply' }} />
  if (!needsActivityModeration(user)) {
    return <Navigate to="/publish" replace />
  }
  return <CreateActivity />
}
