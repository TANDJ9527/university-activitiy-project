import { Link, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { roleLabel } from '../types'

export function Layout() {
  const { user, ready, logout } = useAuth()

  return (
    <div className="relative min-h-screen font-sans">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 z-0 h-[420px] bg-[radial-gradient(ellipse_90%_60%_at_50%_-10%,rgba(129,140,248,0.25),transparent)]"
      />
      <div className="relative z-10 flex min-h-screen flex-col">
        <header className="sticky top-0 z-20 border-b border-white/50 bg-white/70 shadow-sm shadow-slate-900/[0.04] backdrop-blur-2xl">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-3.5 sm:px-8">
            <Link
              to="/"
              className="group flex items-center gap-3 text-slate-900 no-underline"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-sky-500 text-lg text-white shadow-lg shadow-indigo-500/30 transition duration-300 group-hover:scale-[1.02] group-hover:shadow-xl">
                ✦
              </span>
              <span className="flex flex-col leading-tight">
                <span className="font-display text-lg font-semibold tracking-tight">校园活动汇</span>
                <span className="text-xs font-medium text-slate-500">发现 · 发布 · 参与校园精彩</span>
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
              {ready && user?.isPlatformAdmin ? (
                <NavLink
                  to="/admin/moderation"
                  className={({ isActive }) =>
                    [
                      'rounded-full px-4 py-2 text-sm font-medium no-underline transition',
                      isActive
                        ? 'bg-amber-50 text-amber-950 shadow-sm ring-1 ring-amber-200/90'
                        : 'text-amber-900/90 hover:bg-amber-50/80 hover:shadow-sm',
                    ].join(' ')
                  }
                >
                  待审核
                </NavLink>
              ) : null}
              {ready && user ? (
                <>
                  <Link
                    to="/account"
                    className="hidden max-w-[200px] items-center gap-2 rounded-full border border-slate-200/80 bg-white/60 px-3 py-1.5 no-underline transition hover:border-indigo-200 hover:bg-indigo-50/40 sm:flex"
                  >
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
                  </Link>
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
        <main className="page-enter mx-auto w-full max-w-6xl flex-1 px-4 pb-14 pt-8 sm:px-8 sm:pt-10">
          <Outlet />
        </main>
        <footer className="relative z-10 border-t border-slate-200/70 bg-white/55 py-8 text-center backdrop-blur-md">
          <p className="text-sm font-medium text-slate-600">校园活动汇</p>
          <p className="mt-1.5 text-xs text-slate-500">登录后即可发布与管理活动 · 学生与校方同屏展示</p>
        </footer>
      </div>
    </div>
  )
}
