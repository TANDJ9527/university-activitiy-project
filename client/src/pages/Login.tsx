import { useEffect, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Card, CardContent } from '../components/ui/Card'
import { Lock, Mail, ArrowRight, Sparkles } from 'lucide-react'

export function Login() {
  const { login, user, ready } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from || '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (ready && user) navigate(from, { replace: true })
  }, [ready, user, from, navigate])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setErr(null)
    setLoading(true)
    try {
      await login(email.trim(), password)
      navigate(from, { replace: true })
    } catch (er) {
      setErr(er instanceof Error ? er.message : '登录失败')
    } finally {
      setLoading(false)
    }
  }

  if (!ready) return <p className="text-slate-500">加载中…</p>
  if (user) return <p className="text-slate-500">跳转中…</p>

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center">
      {/* 标题区域 */}
      <div className="mb-8 text-center">
        <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-sky-600 shadow-lg shadow-indigo-500/30">
          <Sparkles className="h-7 w-7 text-white" />
        </div>
        <h1 className="font-display mb-2 text-3xl font-bold tracking-tight text-slate-900">欢迎回来</h1>
        <p className="text-slate-600">登录您的账号，探索精彩校园活动</p>
      </div>

      <Card className="overflow-hidden border-slate-100 shadow-2xl shadow-slate-900/10">
        {/* 装饰背景 */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 via-transparent to-sky-50/30" />
        
        <CardContent className="relative p-8">
          {/* 错误提示 */}
          {err && (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50/80 px-4 py-3 text-sm text-red-800 backdrop-blur-sm">
              {err}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* 邮箱输入 */}
            <div className="space-y-2">
              <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Mail className="h-4 w-4 text-indigo-500" />
                邮箱
              </label>
              <Input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="请输入您的邮箱"
                className="h-12 px-4"
              />
            </div>

            {/* 密码输入 */}
            <div className="space-y-2">
              <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Lock className="h-4 w-4 text-indigo-500" />
                密码
              </label>
              <Input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入您的密码"
                className="h-12 px-4"
              />
            </div>

            {/* 登录按钮 */}
            <Button
              type="submit"
              disabled={loading}
              size="lg"
              className="w-full bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-700 hover:to-sky-700 shadow-lg shadow-indigo-500/30 transition-all duration-300 hover:shadow-xl"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24">
                    <circle className="h-full w-full animate-ping opacity-75" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  </svg>
                  登录中…
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  登录
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                </span>
              )}
            </Button>
          </form>

          {/* 注册链接 */}
          <p className="mt-6 text-center text-sm text-slate-600">
            还没有账号？{' '}
            <Link
              to="/register"
              className="font-semibold text-indigo-600 transition-colors duration-200 hover:text-indigo-700 hover:underline underline-offset-4"
              state={location.state}
            >
              立即注册
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}