import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { resetPassword, sendEmailCode } from '../api'
import { isQqEmail } from '../lib/qqEmail'
import { useToast } from '../context/ToastContext'

export function ForgotPassword() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(0)

  async function handleSendCode() {
    setErr(null)
    const e = email.trim().toLowerCase()
    if (!isQqEmail(e)) {
      setErr('请填写 QQ 邮箱（例如 123456789@qq.com）')
      return
    }
    setSending(true)
    try {
      const res = await sendEmailCode(e, 'reset_password')
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

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setErr(null)
    setLoading(true)
    try {
      const res = await resetPassword({
        email: email.trim().toLowerCase(),
        code: code.trim(),
        password,
      })
      showToast(res.message || '密码已重置', 'success')
      navigate('/login', { replace: true })
    } catch (er) {
      setErr(er instanceof Error ? er.message : '重置失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col">
      <h1 className="font-display mb-2 text-3xl font-bold tracking-tight text-slate-900">找回密码</h1>
      <p className="mb-8 text-slate-600">
        <Link to="/login" className="font-semibold text-indigo-700 underline decoration-indigo-300 underline-offset-4">
          返回登录
        </Link>
      </p>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-3xl border border-white/70 bg-white/70 p-7 shadow-xl ring-1 ring-slate-200/60 backdrop-blur-md"
      >
        {err ? (
          <div className="rounded-xl border border-red-200/80 bg-red-50 px-4 py-3 text-sm text-red-800">{err}</div>
        ) : null}

        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-slate-700">QQ 邮箱</span>
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            placeholder="123456789@qq.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl bg-white/95 px-4 py-2.5 shadow-inner ring-1 ring-slate-200/90 outline-none focus:ring-2 focus:ring-indigo-400/40"
          />
        </label>

        <div className="flex gap-2">
          <label className="block flex-1">
            <span className="mb-1.5 block text-sm font-semibold text-slate-700">验证码</span>
            <input
              required
              maxLength={6}
              name="verificationCode"
              autoComplete="off"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              className="w-full rounded-xl bg-white/95 px-4 py-2.5 shadow-inner ring-1 ring-slate-200/90 outline-none focus:ring-2 focus:ring-indigo-400/40"
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
          <span className="mb-1.5 block text-sm font-semibold text-slate-700">新密码（至少 6 位）</span>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl bg-white/95 px-4 py-2.5 shadow-inner ring-1 ring-slate-200/90 outline-none focus:ring-2 focus:ring-indigo-400/40"
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-gradient-to-r from-indigo-600 to-sky-600 py-3 font-semibold text-white shadow-lg disabled:opacity-50"
        >
          {loading ? '提交中…' : '确认并重置密码'}
        </button>
      </form>
    </div>
  )
}
