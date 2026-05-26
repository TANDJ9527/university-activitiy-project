import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { cancelActivityRegistration, registerForActivity } from '../api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

type Props = {
  activityId: string
  registered?: boolean
  onChange?: (registered: boolean) => void
  className?: string
}

export function ActivityRegisterButton({
  activityId,
  registered: registeredProp = false,
  onChange,
  className = '',
}: Props) {
  const { user, ready } = useAuth()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [registered, setRegistered] = useState(registeredProp)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setRegistered(registeredProp)
  }, [activityId, registeredProp])

  async function handleClick() {
    if (!ready || !user) {
      showToast('请先登录后再报名', 'info')
      navigate('/login', { state: { from: window.location.pathname } })
      return
    }
    if (busy) return
    setBusy(true)
    try {
      if (registered) {
        await cancelActivityRegistration(activityId)
        setRegistered(false)
        onChange?.(false)
        showToast('已取消报名', 'success')
      } else {
        await registerForActivity(activityId)
        setRegistered(true)
        onChange?.(true)
        showToast('报名成功', 'success')
      }
    } catch (e) {
      showToast(e instanceof Error ? e.message : '操作失败', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={handleClick}
      className={`rounded-full px-5 py-2.5 text-sm font-semibold shadow-sm transition disabled:opacity-60 ${className} ${
        registered
          ? 'border border-emerald-200 bg-emerald-50 text-emerald-900 hover:bg-emerald-100'
          : 'bg-gradient-to-r from-indigo-600 to-sky-600 text-white shadow-indigo-500/20 hover:to-indigo-600'
      }`}
    >
      {busy ? '处理中…' : registered ? '已参加活动 · 取消报名' : '报名参加'}
    </button>
  )
}
