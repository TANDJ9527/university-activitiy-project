import type { Activity, AuthUser, Comment, ModerationRequest } from './types'
import { getToken } from './authStorage'

function authHeaders(): HeadersInit {
  const t = getToken()
  return t ? { Authorization: `Bearer ${t}` } : {}
}

async function parseError(res: Response): Promise<string> {
  try {
    const j = (await res.json()) as { error?: string }
    return j.error || res.statusText
  } catch {
    return res.statusText
  }
}

export async function sendEmailCode(
  email: string,
  purpose: 'register' | 'reset_password'
): Promise<{ ok: boolean; message?: string; devCode?: string }> {
  const res = await fetch('/api/auth/send-code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.trim().toLowerCase(), purpose }),
  })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json() as Promise<{ ok: boolean; message?: string; devCode?: string }>
}

export async function resetPassword(body: {
  email: string
  code: string
  password: string
}): Promise<{ ok: boolean; message?: string }> {
  const res = await fetch('/api/auth/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json() as Promise<{ ok: boolean; message?: string }>
}

export async function register(body: {
  email: string
  password: string
  displayName: string
  role: 'student' | 'school'
  code: string
  studentId?: string
  realName?: string
}): Promise<{ token: string; user: AuthUser } | { ok: true; message: string }> {
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, email: body.email.trim().toLowerCase() }),
  })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json() as Promise<{ token: string; user: AuthUser } | { ok: true; message: string }>
}

export async function login(body: { email: string; password: string }): Promise<{ token: string; user: AuthUser }> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json() as Promise<{ token: string; user: AuthUser }>
}

export async function fetchMe(): Promise<AuthUser> {
  const res = await fetch('/api/auth/me', { headers: { ...authHeaders() } })
  if (!res.ok) throw new Error(await parseError(res))
  const data = (await res.json()) as { user: AuthUser }
  return data.user
}

export async function updateMe(body: { displayName: string; studentId?: string }): Promise<AuthUser> {
  const res = await fetch('/api/auth/me', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await parseError(res))
  const data = (await res.json()) as { user: AuthUser }
  return data.user
}

export async function listActivities(params: {
  q?: string
  category?: string
  publisher?: 'all' | 'student' | 'school'
  sort?: 'new' | 'startAsc' | 'startDesc'
}): Promise<Activity[]> {
  const sp = new URLSearchParams()
  if (params.q) sp.set('q', params.q)
  if (params.category && params.category !== 'all') sp.set('category', params.category)
  if (params.publisher && params.publisher !== 'all') sp.set('publisher', params.publisher)
  const sort =
    params.sort === 'startAsc'
      ? 'startAsc'
      : params.sort === 'startDesc'
        ? 'startDesc'
        : params.sort === 'new'
          ? 'new'
          : undefined
  if (sort) sp.set('sort', sort)

  const res = await fetch(`/api/activities?${sp.toString()}`, {
    headers: { ...authHeaders() },
  })
  if (!res.ok) throw new Error(await parseError(res))
  const data = (await res.json()) as Activity[] | { activities?: Activity[] }
  if (Array.isArray(data)) return data
  return Array.isArray(data.activities) ? data.activities : []
}

export async function getActivity(id: string): Promise<Activity> {
  const res = await fetch(`/api/activities/${encodeURIComponent(id)}`, {
    headers: { ...authHeaders() },
  })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json() as Promise<Activity>
}

export async function createActivity(body: {
  title: string
  description: string
  location: string
  organizer: string
  contact: string
  category: string
  startAt: string
  endAt: string | null
}): Promise<{ activity: Activity }> {
  const res = await fetch('/api/activities', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json() as Promise<{ activity: Activity }>
}

export async function updateActivity(
  id: string,
  body: {
    title: string
    description: string
    location: string
    organizer: string
    contact: string
    category: string
    startAt: string
    endAt: string | null
  }
): Promise<{ activity: Activity }> {
  const res = await fetch(`/api/activities/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json() as Promise<{ activity: Activity }>
}

export async function deleteActivity(id: string): Promise<void> {
  const res = await fetch(`/api/activities/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { ...authHeaders() },
  })
  if (!res.ok) throw new Error(await parseError(res))
}

export async function getActivityComments(activityId: string): Promise<Comment[]> {
  const res = await fetch(`/api/activities/${encodeURIComponent(activityId)}/comments`)
  if (!res.ok) throw new Error(await parseError(res))
  const data = (await res.json()) as Comment[] | { comments?: Comment[] }
  if (Array.isArray(data)) return data
  return Array.isArray(data.comments) ? data.comments : []
}

export async function createComment(
  activityId: string,
  content: string
): Promise<{ comment: Comment; message?: string }> {
  const res = await fetch(`/api/activities/${encodeURIComponent(activityId)}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ content }),
  })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json() as Promise<{ comment: Comment; message?: string }>
}

export async function deleteComment(commentId: string): Promise<void> {
  const res = await fetch(`/api/comments/${encodeURIComponent(commentId)}`, {
    method: 'DELETE',
    headers: { ...authHeaders() },
  })
  if (!res.ok) throw new Error(await parseError(res))
}

export type ActivityPayload = {
  title: string
  description: string
  location: string
  organizer: string
  contact: string
  category: string
  startAt: string
  endAt: string | null
}

export async function createModerationRequest(body: {
  type: 'create' | 'update' | 'delete'
  activityId?: string
  payload?: ActivityPayload
}): Promise<{ request: ModerationRequest }> {
  const res = await fetch('/api/moderation/requests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json() as Promise<{ request: ModerationRequest }>
}

export async function listPendingModeration(): Promise<ModerationRequest[]> {
  const res = await fetch('/api/admin/moderation/pending', { headers: { ...authHeaders() } })
  if (!res.ok) throw new Error(await parseError(res))
  const data = (await res.json()) as { requests?: ModerationRequest[] }
  return Array.isArray(data.requests) ? data.requests : []
}

export async function approveModeration(id: string): Promise<{ request: ModerationRequest }> {
  const res = await fetch(`/api/admin/moderation/${encodeURIComponent(id)}/approve`, {
    method: 'POST',
    headers: { ...authHeaders() },
  })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json() as Promise<{ request: ModerationRequest }>
}

export async function rejectModeration(
  id: string,
  reason?: string
): Promise<{ request: ModerationRequest }> {
  const res = await fetch(`/api/admin/moderation/${encodeURIComponent(id)}/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ reason: reason ?? '' }),
  })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json() as Promise<{ request: ModerationRequest }>
}

export async function toggleFavorite(activityId: string): Promise<{ favorited: boolean }> {
  const res = await fetch(`/api/activities/${encodeURIComponent(activityId)}/favorite`, {
    method: 'POST',
    headers: { ...authHeaders() },
  })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json() as Promise<{ favorited: boolean }>
}

export async function listMyFavorites(): Promise<Activity[]> {
  const res = await fetch('/api/me/favorites', { headers: { ...authHeaders() } })
  if (!res.ok) throw new Error(await parseError(res))
  const data = (await res.json()) as { activities: Activity[] }
  return data.activities ?? []
}

export async function clearAllFavorites(): Promise<void> {
  const res = await fetch('/api/me/favorites', {
    method: 'DELETE',
    headers: { ...authHeaders() },
  })
  if (!res.ok) throw new Error(await parseError(res))
}

export async function registerForActivity(activityId: string): Promise<{ registered: boolean; message?: string }> {
  const res = await fetch(`/api/activities/${encodeURIComponent(activityId)}/register`, {
    method: 'POST',
    headers: { ...authHeaders() },
  })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json() as Promise<{ registered: boolean; message?: string }>
}

export async function cancelActivityRegistration(
  activityId: string
): Promise<{ registered: boolean; message?: string }> {
  const res = await fetch(`/api/activities/${encodeURIComponent(activityId)}/register`, {
    method: 'DELETE',
    headers: { ...authHeaders() },
  })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json() as Promise<{ registered: boolean; message?: string }>
}

export async function listMyRegistrations(): Promise<Activity[]> {
  const res = await fetch('/api/me/registrations', { headers: { ...authHeaders() } })
  if (!res.ok) throw new Error(await parseError(res))
  const data = (await res.json()) as { activities?: Activity[] }
  return data.activities ?? []
}

export async function listPendingComments(): Promise<Comment[]> {
  const res = await fetch('/api/admin/comments/pending', { headers: { ...authHeaders() } })
  if (!res.ok) throw new Error(await parseError(res))
  const data = (await res.json()) as { comments?: Comment[] }
  return data.comments ?? []
}

export async function approveComment(commentId: string): Promise<void> {
  const res = await fetch(`/api/admin/comments/${encodeURIComponent(commentId)}/approve`, {
    method: 'POST',
    headers: { ...authHeaders() },
  })
  if (!res.ok) throw new Error(await parseError(res))
}

export async function adminDeleteComment(commentId: string): Promise<void> {
  const res = await fetch(`/api/admin/comments/${encodeURIComponent(commentId)}`, {
    method: 'DELETE',
    headers: { ...authHeaders() },
  })
  if (!res.ok) throw new Error(await parseError(res))
}

export interface AdminUser {
  id: string
  email: string
  displayName: string
  role: 'student' | 'school'
  createdAt: string
  isPlatformAdmin: boolean
}

export async function listAdminUsers(): Promise<AdminUser[]> {
  const res = await fetch('/api/admin/users', { headers: { ...authHeaders() } })
  if (!res.ok) throw new Error(await parseError(res))
  const data = (await res.json()) as { users?: AdminUser[] }
  return data.users ?? []
}

export async function deleteAdminUser(userId: string): Promise<void> {
  const res = await fetch(`/api/admin/users/${encodeURIComponent(userId)}`, {
    method: 'DELETE',
    headers: { ...authHeaders() },
  })
  if (!res.ok) throw new Error(await parseError(res))
}

export interface SchoolRegistration {
  id: string
  email: string
  displayName: string
  role: 'school'
  schoolApproved: boolean
  createdAt: string
}

export async function listSchoolRegistrations(): Promise<SchoolRegistration[]> {
  const res = await fetch('/api/admin/school-registrations', { headers: { ...authHeaders() } })
  if (!res.ok) throw new Error(await parseError(res))
  const data = (await res.json()) as { requests?: SchoolRegistration[] }
  return data.requests ?? []
}

export async function approveSchoolRegistration(userId: string, makeAdmin?: boolean): Promise<void> {
  const res = await fetch(`/api/admin/school-registrations/${encodeURIComponent(userId)}/approve`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ makeAdmin: makeAdmin || false }),
  })
  if (!res.ok) throw new Error(await parseError(res))
}

export async function rejectSchoolRegistration(userId: string): Promise<void> {
  const res = await fetch(`/api/admin/school-registrations/${encodeURIComponent(userId)}/reject`, {
    method: 'PUT',
    headers: { ...authHeaders() },
  })
  if (!res.ok) throw new Error(await parseError(res))
}

export async function uploadAvatar(data: string): Promise<{ id: string; status: string; message: string }> {
  const res = await fetch('/api/avatar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ data }),
  })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json() as Promise<{ id: string; status: string; message: string }>
}

export async function getAvatarStatus(): Promise<{ id?: string; status: string; createdAt?: string }> {
  const res = await fetch('/api/avatar/status', { headers: { ...authHeaders() } })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json() as Promise<{ id?: string; status: string; createdAt?: string }>
}

export interface AvatarApproval {
  id: string
  userId: string
  filePath: string
  status: 'pending' | 'approved' | 'rejected'
  createdAt: string
  user: {
    email: string
    displayName: string
  }
}

export async function listAvatarApprovals(): Promise<AvatarApproval[]> {
  const res = await fetch('/api/admin/avatar-approvals', { headers: { ...authHeaders() } })
  if (!res.ok) throw new Error(await parseError(res))
  const data = (await res.json()) as { approvals?: AvatarApproval[] }
  return data.approvals ?? []
}

export async function approveAvatar(id: string): Promise<{ success: boolean; status: string }> {
  const res = await fetch(`/api/admin/avatar-approvals/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ action: 'approve' }),
  })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json() as Promise<{ success: boolean; status: string }>
}

export async function rejectAvatar(id: string): Promise<{ success: boolean; status: string }> {
  const res = await fetch(`/api/admin/avatar-approvals/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ action: 'reject' }),
  })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json() as Promise<{ success: boolean; status: string }>
}

export interface NicknameApproval {
  id: string
  userId: string
  currentNickname: string
  requestedNickname: string
  studentId: string | null
  realName: string | null
  status: 'pending' | 'approved' | 'rejected'
  userEmail: string
  createdAt: string
}

export async function listNicknameApprovals(): Promise<NicknameApproval[]> {
  const res = await fetch('/api/admin/nickname-approvals', { headers: { ...authHeaders() } })
  if (!res.ok) throw new Error(await parseError(res))
  const data = (await res.json()) as { approvals?: NicknameApproval[] }
  return data.approvals ?? []
}

export async function approveNickname(id: string): Promise<{ success: boolean; status: string }> {
  const res = await fetch(`/api/admin/nickname-approvals/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ action: 'approve' }),
  })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json() as Promise<{ success: boolean; status: string }>
}

export async function rejectNickname(id: string): Promise<{ success: boolean; status: string }> {
  const res = await fetch(`/api/admin/nickname-approvals/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ action: 'reject' }),
  })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json() as Promise<{ success: boolean; status: string }>
}
