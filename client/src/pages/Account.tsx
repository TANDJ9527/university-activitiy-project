import { type FormEvent, useEffect, useState, useRef } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { roleLabel } from '../types'
import { uploadAvatar, getAvatarStatus } from '../api'
import { AvatarCropper } from '../components/AvatarCropper'
import { ImagePreview } from '../components/ImagePreview'

export function Account() {
  const { user, ready, updateProfile, refreshUser } = useAuth()
  const [name, setName] = useState('')
  const [studentId, setStudentId] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [ok, setOk] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [avatarStatus, setAvatarStatus] = useState<'none' | 'pending' | 'approved' | 'rejected'>('none')
  const [avatarMessage, setAvatarMessage] = useState('')
  const [showCropper, setShowCropper] = useState(false)
  const [cropImageSrc, setCropImageSrc] = useState('')
  const [showAvatarPreview, setShowAvatarPreview] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (user) {
      setName(user.displayName)
      setStudentId(user.studentId || '')
    }
  }, [user])

  useEffect(() => {
    getAvatarStatus().then(status => {
      setAvatarStatus(status.status as 'none' | 'pending' | 'approved' | 'rejected')
    }).catch(() => {
      setAvatarStatus('none')
    })
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      setAvatarMessage('图片大小不能超过 2MB')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const base64Data = event.target?.result as string
      setCropImageSrc(base64Data)
      setShowCropper(true)
    }
    reader.readAsDataURL(file)

    // 重置input以便可以再次选择同一文件
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleCropComplete = async (croppedBase64: string) => {
    setShowCropper(false)
    setCropImageSrc('')
    setUploading(true)
    setAvatarMessage('')
    try {
      const result = await uploadAvatar(croppedBase64)
      setAvatarStatus('pending')
      setAvatarMessage(result.message)
      await refreshUser()
    } catch (error) {
      setAvatarMessage(error instanceof Error ? error.message : '上传失败')
    } finally {
      setUploading(false)
    }
  }

  const handleCropCancel = () => {
    setShowCropper(false)
    setCropImageSrc('')
  }

  if (!ready) return <p className="text-slate-500">加载中…</p>
  if (!user) return <Navigate to="/login" replace state={{ from: '/account' }} />

  return (
    <div className="mx-auto max-w-2xl">
      <p className="mb-2">
        <Link
          to="/"
          className="text-sm font-semibold text-indigo-700 underline decoration-indigo-300 underline-offset-4"
        >
          ← 返回活动广场
        </Link>
      </p>
      <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900">账户资料</h1>
      <p className="mt-2 text-sm text-slate-600">
        邮箱 <span className="font-medium text-slate-800">{user.email}</span> 不可修改。可更新展示昵称（活动作者名将随之更新）。
      </p>

      <div className="mt-6 flex items-center gap-4">
        <div className="relative">
          <div
            className={`h-20 w-20 overflow-hidden rounded-full bg-slate-100 ring-2 ring-slate-200 ${user.avatarUrl ? 'cursor-pointer transition hover:ring-indigo-400' : ''}`}
            onClick={() => user.avatarUrl && setShowAvatarPreview(true)}
          >
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt="头像" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-slate-400">
                <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            )}
          </div>
          <label className="absolute -bottom-1 -right-1 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-indigo-600 text-white shadow-md transition hover:bg-indigo-700">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} disabled={uploading} />
          </label>
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-slate-700">头像</p>
          {avatarMessage && (
            <p className={`mt-1 text-xs ${avatarStatus === 'pending' ? 'text-amber-600' : avatarStatus === 'approved' ? 'text-emerald-600' : 'text-red-600'}`}>
              {avatarMessage}
            </p>
          )}
          {avatarStatus === 'pending' && (
            <p className="mt-1 text-xs text-amber-600">头像审核中，请耐心等待管理员审核</p>
          )}
          {avatarStatus === 'approved' && !avatarMessage && (
            <p className="mt-1 text-xs text-emerald-600">头像已审核通过</p>
          )}
          {avatarStatus === 'rejected' && !avatarMessage && (
            <p className="mt-1 text-xs text-red-600">头像审核未通过，请重新上传</p>
          )}
          <p className="mt-1 text-xs text-slate-500">支持 PNG、JPG、WebP 格式，不超过 2MB</p>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Link
          to="/account/favorites"
          className="flex flex-col rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50/90 to-white p-4 no-underline shadow-sm ring-1 ring-amber-100/80 transition hover:border-amber-300 hover:shadow-md"
        >
          <span className="text-sm font-bold text-amber-950">收藏的活动</span>
          <span className="mt-1 text-xs text-amber-900/80">按收藏时间查看与管理</span>
        </Link>
        <Link
          to="/account/registrations"
          className="flex flex-col rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/90 to-white p-4 no-underline shadow-sm ring-1 ring-emerald-100/80 transition hover:border-emerald-300 hover:shadow-md"
        >
          <span className="text-sm font-bold text-emerald-950">报名的活动</span>
          <span className="mt-1 text-xs text-emerald-900/80">查看或取消报名</span>
        </Link>
        {user.isPlatformAdmin ? (
          <>
            <Link
              to="/admin/moderation"
              className="flex flex-col rounded-2xl border border-indigo-200/80 bg-gradient-to-br from-indigo-50/90 to-white p-4 no-underline shadow-sm ring-1 ring-indigo-100/80 transition hover:border-indigo-300 hover:shadow-md"
            >
              <span className="text-sm font-bold text-indigo-950">管理后台</span>
              <span className="mt-1 text-xs text-indigo-900/80">审核与用户管理</span>
            </Link>
          </>
        ) : (
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 text-xs text-slate-500">
            {user.role === 'student' && !user.schoolApproved ? (
              <span className="text-red-500">您的学生账号正在审核中，审核通过后方可发布活动。</span>
            ) : (
              <span>学生发布或修改、删除自己活动时需管理员审核；校方账号可直接生效。</span>
            )}
          </div>
        )}
      </div>

      <form
        className="mt-8 space-y-5 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm"
        onSubmit={async (e: FormEvent) => {
          e.preventDefault()
          setErr(null)
          setOk(false)
          const trimmed = name.trim()
          if (!trimmed || trimmed.length > 10) {
            setErr('昵称须为 1–10 字')
            return
          }
          setSaving(true)
          try {
            await updateProfile(trimmed)
            setOk(true)
          } catch (er) {
            setErr(er instanceof Error ? er.message : '保存失败')
          } finally {
            setSaving(false)
          }
        }}
      >
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-indigo-50 px-2.5 py-1 font-semibold text-indigo-800 ring-1 ring-indigo-100">
            {roleLabel(user.role)}
          </span>
          {user.isPlatformAdmin ? (
            <span className="rounded-full bg-amber-50 px-2.5 py-1 font-semibold text-amber-900 ring-1 ring-amber-200/80">
              平台管理员
            </span>
          ) : null}
          {user.role === 'student' && !user.schoolApproved ? (
            <span className="rounded-full bg-red-50 px-2.5 py-1 font-semibold text-red-700 ring-1 ring-red-100">
              审核中
            </span>
          ) : null}
        </div>

        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-slate-700">昵称 / 组织名称</span>
          <input
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none ring-indigo-500/20 transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2"
            maxLength={10}
            placeholder="不超过10个字"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={saving}
          />
        </label>

        {user.role === 'student' && (
          <div className="block">
            <span className="mb-1.5 block text-sm font-semibold text-slate-700">学号</span>
            <div className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              {studentId || '未绑定学号'}
            </div>
            <p className="mt-1 text-xs text-slate-500">学号在注册时绑定，不可修改</p>
          </div>
        )}

        {err ? (
          <p className="text-sm text-red-700" role="alert">
            {err}
          </p>
        ) : null}
        {ok ? <p className="text-sm text-emerald-700">已保存。</p> : null}

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-sky-600 py-3 text-sm font-semibold text-white shadow-md shadow-indigo-500/25 transition hover:to-indigo-600 disabled:opacity-60"
        >
          {saving ? '保存中…' : '保存'}
        </button>
      </form>

      {showCropper && cropImageSrc && (
        <AvatarCropper
          imageSrc={cropImageSrc}
          onCrop={handleCropComplete}
          onCancel={handleCropCancel}
        />
      )}

      {showAvatarPreview && user.avatarUrl && (
        <ImagePreview
          src={user.avatarUrl}
          alt="头像预览"
          onClose={() => setShowAvatarPreview(false)}
        />
      )}
    </div>
  )
}
