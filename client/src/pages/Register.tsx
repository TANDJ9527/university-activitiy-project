import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function Register() {
  const { register, user, ready } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [role, setRole] = useState<'student' | 'school'>('student')
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (ready && user) navigate('/', { replace: true })
  }, [ready, user, navigate])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setErr(null)
    setLoading(true)
    try {
      await register({
        email: email.trim(),
        password,
        displayName: displayName.trim(),
        role,
      })
      navigate('/', { replace: true })
    } catch (er) {
      setErr(er instanceof Error ? er.message : '注册失败')
    } finally {
      setLoading(false)
    }
  }

  if (!ready) return <p className="text-slate-500">加载中…</p>
  if (user) return <p className="text-slate-500">跳转中…</p>

  return (
    <div className="mx-auto flex max-w-md flex-col">
      <h1 className="font-display mb-2 text-3xl font-bold tracking-tight text-slate-900">创建账号</h1>
      <p className="mb-8 text-slate-600">
        已有账号？{' '}
        <Link
          to="/login"
          className="font-semibold text-indigo-700 underline decoration-indigo-300 underline-offset-4"
        >
          登录
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
          <span className="mb-1.5 block text-sm font-semibold text-slate-700">身份</span>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as 'student' | 'school')}
            className="w-full cursor-pointer rounded-xl border-0 bg-white/95 px-4 py-2.5 text-slate-900 shadow-inner ring-1 ring-slate-200/90 outline-none focus:ring-2 focus:ring-indigo-400/40"
          >
            <option value="student">学生</option>
            <option value="school">校方 / 组织方</option>
          </select>
          <p className="mt-2 text-xs text-slate-500">校方账号适合团委、学生会、学院等发布官方活动。</p>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-slate-700">昵称 / 组织名称</span>
          <input
            required
            maxLength={100}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="例如：张三 或 校学生会"
            className="w-full rounded-xl border-0 bg-white/95 px-4 py-2.5 text-slate-900 shadow-inner ring-1 ring-slate-200/90 outline-none transition placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-400/40"
          />
        </label>

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
          <span className="mb-1.5 block text-sm font-semibold text-slate-700">密码（至少 6 位）</span>
          <input
            type="password"
            autoComplete="new-password"
            required
            minLength={6}
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
          {loading ? '注册中…' : '注册'}
        </button>
      </form>
    </div>
  )
}
