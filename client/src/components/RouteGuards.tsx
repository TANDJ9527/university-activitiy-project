import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { needsActivityModeration } from '../types'

/** 仅校方或平台管理员可进入「直接发布」后台 */
export function RequirePublisherAccess({ children }: { children: React.ReactNode }) {
  const { user, ready } = useAuth()
  const location = useLocation()

  if (!ready) return <p className="text-slate-500">加载中…</p>
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (needsActivityModeration(user)) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-amber-200/80 bg-amber-50/90 px-6 py-8 text-amber-950 shadow-sm">
        <p className="font-display text-lg font-semibold">无权访问发布后台</p>
        <p className="mt-2 text-sm leading-relaxed opacity-90">
          学生账号不能直接发布活动。请通过「提交审核」流程，由管理员在活动审核中处理。
        </p>
      </div>
    )
  }
  return <>{children}</>
}

export function RequirePlatformAdmin({ children }: { children: React.ReactNode }) {
  const { user, ready } = useAuth()
  const location = useLocation()

  if (!ready) return <p className="text-slate-500">加载中…</p>
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (!user.isPlatformAdmin) {
    return (
      <div className="rounded-2xl border border-amber-200/80 bg-amber-50/90 px-5 py-4 text-amber-950">
        仅平台管理员可访问此页面。
      </div>
    )
  }
  return <>{children}</>
}
