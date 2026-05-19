import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listActivities } from '../api'
import { ActivityCard } from '../components/ActivityCard'
import { CardSkeleton } from '../components/CardSkeleton'
import { useAuth } from '../context/AuthContext'
import { Button } from '../components/ui/Button'
import { RefreshCw, Search, Sparkles, Calendar } from 'lucide-react'

export function Home() {
  const { user, ready } = useAuth()
  const [items, setItems] = useState<Awaited<ReturnType<typeof listActivities>>>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setErr(null)
    try {
      const data = await listActivities({ category: 'all', sort: 'startAsc' })
      setItems(data)
    } catch (e) {
      setErr(e instanceof Error ? e.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div>
      {/* Hero 区域 */}
      <section className="relative mb-10 overflow-hidden rounded-3xl border border-white/60 bg-gradient-to-br from-white via-white/90 to-indigo-50/50 px-6 py-10 shadow-xl shadow-slate-900/5 ring-1 ring-slate-200/60 backdrop-blur-md sm:px-10 sm:py-14">
        {/* 动态背景装饰 */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-gradient-to-br from-indigo-400/30 to-sky-300/20 blur-3xl animate-pulse"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-28 -left-20 h-64 w-64 rounded-full bg-gradient-to-tr from-rose-300/20 to-amber-200/20 blur-3xl animate-pulse delay-1000"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute right-1/4 top-1/2 h-40 w-40 rounded-full bg-gradient-to-br from-violet-300/15 to-purple-300/10 blur-2xl"
        />
        
        <div className="relative max-w-3xl">
          {/* 标签 */}
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-50 to-sky-50 px-4 py-1.5 text-xs font-semibold text-indigo-800 ring-1 ring-indigo-100 transition-transform hover:scale-105">
            <Sparkles className="h-3.5 w-3.5" />
            活动广场 · 学生与校方同屏发布
          </div>
          
          {/* 标题 */}
          <h1 className="font-display mb-5 text-3xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            发现下一场
            <span className="relative bg-gradient-to-r from-indigo-600 via-sky-600 to-cyan-500 bg-clip-text text-transparent">
              {' '}校园精彩
              <span className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-sky-600 to-cyan-500 bg-[length:200%_100%] bg-clip-text text-transparent opacity-70 blur-sm" />
            </span>
          </h1>
          
          {/* 描述 */}
          <p className="text-pretty mb-8 text-base leading-relaxed text-slate-600 sm:text-lg">
            本页按开始时间依次陈列全部活动。需要按关键词、类别或排序方式查找？请前往
            <Link
              to="/search"
              className="mx-1 font-semibold text-indigo-600 transition-colors duration-200 hover:text-indigo-700 hover:underline underline-offset-4"
            >
              搜索与筛选
            </Link>
            。
          </p>
          
          {/* 按钮组 */}
          <div className="flex flex-wrap items-center gap-3">
            <Button 
              size="lg"
              className="bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-700 hover:to-sky-700 shadow-lg shadow-indigo-500/30 transition-all duration-300 hover:shadow-xl"
              asChild
            >
              <Link to="/search" className="no-underline">
                <Search className="mr-2 h-4 w-4" />
                搜索与筛选
              </Link>
            </Button>
            
            {ready && user && (
              <Button 
                variant="secondary"
                size="lg"
                className="bg-white border border-slate-200 hover:bg-slate-50 shadow-md transition-all duration-300"
                asChild
              >
                <Link to="/publish" className="no-underline">
                  发布活动
                </Link>
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* 活动列表头部 */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-100 to-sky-100">
            <Calendar className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <h2 className="font-display text-xl font-semibold text-slate-900">全部活动</h2>
            {!loading && items.length > 0 && (
              <p className="text-sm text-slate-500">共 {items.length} 场活动</p>
            )}
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => load()}
          className="gap-2 border-slate-200 hover:bg-slate-50 transition-all duration-200"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          刷新列表
        </Button>
      </div>

      {/* 错误提示 */}
      {err ? (
        <div className="mb-8 rounded-2xl border border-red-200 bg-red-50/90 px-5 py-4 text-sm text-red-800 shadow-sm">
          {err}（请确认后端服务已启动，或稍后重试）
        </div>
      ) : null}

      {/* 活动列表 */}
      {loading ? (
        <ul className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <li key={i} className="animate-pulse">
              <CardSkeleton />
            </li>
          ))}
        </ul>
      ) : items.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-gradient-to-br from-white/50 to-slate-50/50 py-20 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
            <Calendar className="h-8 w-8 text-slate-400" />
          </div>
          <p className="font-display text-xl font-semibold text-slate-800">广场还没有活动</p>
          <p className="mt-2 text-sm text-slate-600">成为第一个发布者，或稍后再来看看。</p>
          {ready && user ? (
            <Button 
              size="lg"
              className="mt-6 bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-700 hover:to-sky-700 shadow-lg shadow-indigo-500/25"
              asChild
            >
              <Link to="/publish" className="no-underline">
                <Sparkles className="mr-2 h-4 w-4" />
                发布活动
              </Link>
            </Button>
          ) : (
            <p className="mt-4 text-sm text-slate-600">可在页面顶部注册或登录后发布活动。</p>
          )}
        </div>
      ) : (
        <>
          <p className="mb-4 text-sm font-medium text-slate-500">按开始时间升序排列</p>
          <ul className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-2">
            {items.map((a, index) => (
              <li 
                key={a.id} 
                className="flex"
                style={{ 
                  animation: `fadeInUp 0.5s ease-out forwards`,
                  animationDelay: `${index * 50}ms`,
                  opacity: 0
                }}
              >
                <ActivityCard a={a} />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}