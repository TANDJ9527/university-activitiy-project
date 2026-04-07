import { Link, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { roleLabel } from '../types'

export function Layout() {
  const { user, ready, logout } = useAuth()

  return (
    <div className="relative min-h-svh font-sans">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 z-0 h-[420px] bg-[radial-gradient(ellipse_90%_60%_at_50%_-10%,rgba(129,140,248,0.25),transparent)]"
      />
      <div className="relative z-10 flex min-h-svh flex-col">
        <header className="sticky top-0 z-20 border-b border-white/40 bg-white/75 shadow-sm shadow-slate-900/5 backdrop-blur-xl">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-3.5 sm:px-8">
            <Link
              to="/"
              className="group flex items-center gap-3 text-slate-900 no-underline"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-sky-500 text-lg text-white shadow-md shadow-indigo-500/25 transition group-hover:shadow-lg group-hover:shadow-indigo-500/30">
                ✦
              </span>
              <span className="flex flex-col leading-tight">
                <span className="font-display text-lg font-semibold tracking-tight">校园活动汇</span>
                <span className="text-xs font-medium text-slate-500">学生 × 校方 · 一站式发布</span>
              </span>
            </Link>
            <nav className="flex flex-wrap items-center gap-2 sm:gap-3">
              <NavLink
                to="/"
                end
                className={({ isActive }) =>
                  [
                    'rounded-full px-4 py-2 text-sm font-medium no-underline transition',
                    isActive
                      ? 'bg-white text-indigo-800 shadow-sm ring-1 ring-indigo-200/80'
                      : 'text-slate-600 hover:bg-white/90 hover:text-slate-900 hover:shadow-sm',
                  ].join(' ')
                }
              >
                活动广场
              </NavLink>
              <NavLink
                to="/search"
                className={({ isActive }) =>
                  [
                    'rounded-full px-4 py-2 text-sm font-medium no-underline transition',
                    isActive
                      ? 'bg-white text-indigo-800 shadow-sm ring-1 ring-indigo-200/80'
                      : 'text-slate-600 hover:bg-white/90 hover:text-slate-900 hover:shadow-sm',
                  ].join(' ')
                }
              >
                搜索与筛选
              </NavLink>
              {ready && user ? (
                <>
                  <div className="hidden items-center gap-2 rounded-full border border-slate-200/80 bg-white/60 px-3 py-1.5 sm:flex">
                    <span className="line-clamp-1 max-w-[140px] text-sm font-medium text-slate-800">
                      {user.displayName}
                    </span>
                    <span className="shrink-0 rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-100">
                      {roleLabel(user.role)}
                    </span>
                    {user.isPlatformAdmin ? (
                      <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-900 ring-1 ring-amber-200/80">
                        管理员
                      </span>
                    ) : null}
                  </div>
                  <Link
                    to="/publish"
                    className="rounded-full bg-gradient-to-r from-indigo-600 to-sky-600 px-5 py-2 text-sm font-semibold text-white no-underline shadow-md shadow-indigo-500/25 transition hover:to-indigo-600 hover:shadow-lg"
                  >
                    发布活动
                  </Link>
                  <button
                    type="button"
                    onClick={logout}
                    className="rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-white hover:text-slate-900"
                  >
                    退出
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="rounded-full px-4 py-2 text-sm font-medium text-slate-600 no-underline transition hover:bg-white/90 hover:text-slate-900"
                  >
                    登录
                  </Link>
                  <Link
                    to="/register"
                    className="rounded-full border border-indigo-200 bg-white px-5 py-2 text-sm font-semibold text-indigo-700 shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50/80"
                  >
                    注册
                  </Link>
                </>
              )}
            </nav>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-12 pt-8 sm:px-8 sm:pt-10">
          <Outlet />
        </main>
        <footer className="relative z-10 border-t border-slate-200/80 bg-white/60 py-8 text-center text-xs text-slate-500 backdrop-blur-sm">
          <p>校园活动汇 · 数据存于 MySQL</p>
          <p className="mt-1 opacity-80">登录后发布与管理活动 · 演示数据可运行 <code className="rounded bg-slate-100 px-1">npm run seed</code></p>
        </footer>
      </div>
    </div>
  )
}
