import type { Activity, AuthUser, Comment } from './types'
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

export async function register(body: {
  email: string
  password: string
  displayName: string
  role: 'student' | 'school'
}): Promise<{ token: string; user: AuthUser }> {
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json() as Promise<{ token: string; user: AuthUser }>
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
        : undefined
  if (sort) sp.set('sort', sort)

  const res = await fetch(`/api/activities?${sp.toString()}`)
  if (!res.ok) throw new Error(await parseError(res))
  const data = (await res.json()) as { activities: Activity[] }
  return data.activities
}

export async function getActivity(id: string): Promise<Activity> {
  const res = await fetch(`/api/activities/${encodeURIComponent(id)}`)
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
  return res.json() as Promise<Comment[]>
}

export async function createComment(activityId: string, content: string): Promise<Comment> {
  const res = await fetch(`/api/activities/${encodeURIComponent(activityId)}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ content }),
  })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json() as Promise<Comment>
}

export async function deleteComment(commentId: string): Promise<void> {
  const res = await fetch(`/api/comments/${encodeURIComponent(commentId)}`, {
    method: 'DELETE',
    headers: { ...authHeaders() },
  })
  if (!res.ok) throw new Error(await parseError(res))
}
