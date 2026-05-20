import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toggleFavorite } from '../api'
import { useAuth } from '../context/AuthContext'

type Props = {
  activityId: string
  favorited?: boolean
  onChange?: (favorited: boolean) => void
  className?: string
  size?: 'sm' | 'md'
}

export function FavoriteStarButton({
  activityId,
  favorited: favoritedProp = false,
  onChange,
  className = '',
  size = 'md',
}: Props) {
  const { user, ready } = useAuth()
  const navigate = useNavigate()
  const [favorited, setFavorited] = useState(favoritedProp)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setFavorited(favoritedProp)
  }, [activityId, favoritedProp])

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!ready || !user) {
      navigate('/login', { state: { from: window.location.pathname } })
      return
    }
    if (busy) return
    setBusy(true)
    try {
      const { favorited: next } = await toggleFavorite(activityId)
      setFavorited(next)
      onChange?.(next)
    } catch (err) {
      alert(err instanceof Error ? err.message : '收藏操作失败')
    } finally {
      setBusy(false)
    }
  }

  const dim = size === 'sm' ? 'h-9 w-9' : 'h-10 w-10'
  const icon = size === 'sm' ? 'text-lg' : 'text-xl'

  return (
    <button
      type="button"
      disabled={busy}
      onClick={handleClick}
      title={favorited ? '取消收藏' : '收藏活动'}
      aria-label={favorited ? '取消收藏' : '收藏活动'}
      aria-pressed={favorited}
      className={`inline-flex ${dim} shrink-0 items-center justify-center rounded-full border bg-white/95 shadow-sm transition hover:scale-105 disabled:opacity-60 ${className} ${
        favorited
          ? 'border-amber-200 text-amber-500 ring-1 ring-amber-100 hover:bg-amber-50'
          : 'border-slate-200/90 text-slate-400 hover:border-amber-200 hover:text-amber-500 hover:bg-amber-50/80'
      }`}
    >
      <span className={icon} aria-hidden>
        {favorited ? '★' : '☆'}
      </span>
    </button>
  )
}
