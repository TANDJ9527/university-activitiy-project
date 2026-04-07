import { useEffect, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

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
    <div className="mx-auto flex max-w-md flex-col">
      <h1 className="font-display mb-2 text-3xl font-bold tracking-tight text-slate-900">欢迎回来</h1>
      <p className="mb-8 text-slate-600">
        还没有账号？{' '}
        <Link
          to="/register"
          className="font-semibold text-indigo-700 underline decoration-indigo-300 underline-offset-4"
          state={location.state}
        >
          注册
        </Link>
      </p>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-3xl border border-white/70 bg-white/70 p-7 shadow-xl shadow-slate-900/8 ring-1 ring-slate-200/60 backdrop-blur-md"
      >
        {err ? (
          <div className="rounded-xl border border-red-200/80 bg-red-50 px-4 py-3 text-sm text-red-800">{err}</div>
        ) : null}
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-slate-700">邮箱</span>
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border-0 bg-white/95 px-4 py-2.5 text-slate-900 shadow-inner ring-1 ring-slate-200/90 outline-none transition focus:ring-2 focus:ring-indigo-400/40"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-slate-700">密码</span>
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border-0 bg-white/95 px-4 py-2.5 text-slate-900 shadow-inner ring-1 ring-slate-200/90 outline-none transition focus:ring-2 focus:ring-indigo-400/40"
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-gradient-to-r from-indigo-600 to-sky-600 py-3 font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:to-indigo-600 disabled:opacity-50"
        >
          {loading ? '登录中…' : '登录'}
        </button>
      </form>
    </div>
  )
}
