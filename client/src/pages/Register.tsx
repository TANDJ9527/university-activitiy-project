import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { sendEmailCode } from '../api'
import { useAuth } from '../context/AuthContext'
import { antiAutofillInputProps } from '../lib/antiAutofill'
import { isQqEmail } from '../lib/qqEmail'
import { useToast } from '../context/ToastContext'

export function Register() {
  const { register, user, ready } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { showToast } = useToast()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [code, setCode] = useState('')
  const [role, setRole] = useState<'student' | 'school'>('student')
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (ready && user) navigate('/', { replace: true })
  }, [ready, user, navigate])

  async function handleSendCode() {
    setErr(null)
    const e = email.trim().toLowerCase()
    if (!isQqEmail(e)) {
      setErr('请使用 QQ 邮箱注册（例如 123456789@qq.com）')
      return
    }
    setSending(true)
    try {
      const res = await sendEmailCode(e, 'register')
      showToast(res.message || '验证码已发送', 'success')
      setCooldown(60)
      const t = window.setInterval(() => {
        setCooldown((c) => {
          if (c <= 1) {
            window.clearInterval(t)
            return 0
          }
          return c - 1
        })
      }, 1000)
    } catch (er) {
      setErr(er instanceof Error ? er.message : '发送失败')
    } finally {
      setSending(false)
    }
  }

  async function handleSubmit(ev: FormEvent) {
    ev.preventDefault()
    setErr(null)
    const mail = email.trim().toLowerCase()
    if (!isQqEmail(mail)) {
      setErr('请使用 QQ 邮箱注册')
      return
    }
    if (!code.trim()) {
      setErr('请填写邮箱验证码')
      return
    }
    setLoading(true)
    try {
      await register({
        email: mail,
        password,
        displayName: displayName.trim(),
        role,
        code: code.trim(),
      })
      showToast('注册成功', 'success')
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
        须使用 QQ 邮箱并验证。已有账号？{' '}
        <Link
          to="/login"
          state={location.state}
          className="font-semibold text-indigo-700 underline decoration-indigo-300 underline-offset-4"
        >
          登录
        </Link>
      </p>

      <form
        onSubmit={handleSubmit}
        autoComplete="off"
        className="space-y-4 rounded-3xl border border-white/70 bg-white/70 p-7 shadow-xl shadow-slate-900/8 ring-1 ring-slate-200/60 backdrop-blur-md"
      >
        {err ? (
          <div className="rounded-xl border border-red-200/80 bg-red-50 px-4 py-3 text-sm text-red-800">{err}</div>
        ) : null}

        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-slate-700">身份</span>
          <select
            value={role}
            onChange={(ev) => setRole(ev.target.value as 'student' | 'school')}
            className="w-full cursor-pointer rounded-xl border-0 bg-white/95 px-4 py-2.5 text-slate-900 shadow-inner ring-1 ring-slate-200/90 outline-none focus:ring-2 focus:ring-indigo-400/40"
          >
            <option value="student">学生</option>
            <option value="school">校方 / 组织方</option>
          </select>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-slate-700">昵称 / 组织名称</span>
          <input
            required
            maxLength={100}
            name="register-display-name"
            value={displayName}
            onChange={(ev) => setDisplayName(ev.target.value)}
            {...antiAutofillInputProps}
            className="w-full rounded-xl border-0 bg-white/95 px-4 py-2.5 shadow-inner ring-1 ring-slate-200/90 outline-none focus:ring-2 focus:ring-indigo-400/40"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-slate-700">QQ 邮箱</span>
          <input
            type="email"
            name="register-email"
            required
            placeholder="123456789@qq.com"
            value={email}
            onChange={(ev) => setEmail(ev.target.value)}
            {...antiAutofillInputProps}
            className="w-full rounded-xl border-0 bg-white/95 px-4 py-2.5 shadow-inner ring-1 ring-slate-200/90 outline-none focus:ring-2 focus:ring-indigo-400/40"
          />
        </label>

        <div className="flex gap-2">
          <label className="block flex-1">
            <span className="mb-1.5 block text-sm font-semibold text-slate-700">验证码</span>
            <input
              required
              maxLength={6}
              name="register-verification-code"
              value={code}
              onChange={(ev) => setCode(ev.target.value.replace(/\D/g, ''))}
              {...antiAutofillInputProps}
              className="w-full rounded-xl border-0 bg-white/95 px-4 py-2.5 shadow-inner ring-1 ring-slate-200/90 outline-none focus:ring-2 focus:ring-indigo-400/40"
            />
          </label>
          <button
            type="button"
            disabled={sending || cooldown > 0}
            onClick={handleSendCode}
            className="mt-7 shrink-0 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2.5 text-xs font-semibold text-indigo-800 disabled:opacity-50"
          >
            {cooldown > 0 ? `${cooldown}s` : sending ? '发送中' : '获取验证码'}
          </button>
        </div>

        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-slate-700">密码（至少 6 位）</span>
          <input
            type="password"
            name="register-password"
            required
            minLength={6}
            value={password}
            onChange={(ev) => setPassword(ev.target.value)}
            {...antiAutofillInputProps}
            className="w-full rounded-xl border-0 bg-white/95 px-4 py-2.5 shadow-inner ring-1 ring-slate-200/90 outline-none focus:ring-2 focus:ring-indigo-400/40"
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-gradient-to-r from-indigo-600 to-sky-600 py-3 font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:to-indigo-600 disabled:opacity-50"
        >
          {loading ? '注册中…' : '验证并注册'}
        </button>
      </form>
    </div>
  )
}
