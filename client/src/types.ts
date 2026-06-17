export type ActivityCategory =
  | '讲座'
  | '文体'
  | '志愿服务'
  | '社团'
  | '竞赛'
  | '其他'

export type UserRole = 'student' | 'school'

export interface ActivityAuthor {
  id: string
  displayName: string
  role: UserRole
}

export interface Activity {
  id: string
  title: string
  description: string
  location: string
  organizer: string
  contact: string
  category: ActivityCategory | string
  startAt: string
  endAt: string | null
  createdAt: string | null
  updatedAt: string | null
  /** 发布渠道：学生账号发布 / 校方账号发布（与创建时账号身份一致） */
  publisherRole: UserRole
  author: ActivityAuthor
  favorited?: boolean
  favoritedAt?: string | null
  registered?: boolean
  registeredAt?: string | null
}

export type ModerationType = 'create' | 'update' | 'delete'
export type ModerationStatus = 'pending' | 'approved' | 'rejected'

export interface ModerationRequest {
  id: string
  type: ModerationType
  status: ModerationStatus
  activityId: string | null
  payload: Record<string, unknown> | null
  requesterId: string
  requesterName?: string
  requesterEmail?: string
  createdAt: string | null
  reviewedAt: string | null
  reviewerId: string | null
  rejectReason: string | null
}

export interface AuthUser {
  id: string
  email: string
  displayName: string
  studentId: string | null
  realName: string | null
  role: UserRole
  isPlatformAdmin: boolean
}

export type CommentStatus = 'pending' | 'approved' | 'rejected'

export interface Comment {
  id: string
  content: string
  createdAt: string
  status?: CommentStatus
  author: ActivityAuthor
  activityId?: string
  activityTitle?: string
}

/** 学生（非平台管理员）发布/改/删活动须走审核 */
export function needsActivityModeration(u: AuthUser | null | undefined): boolean {
  return Boolean(u && u.role === 'student' && !u.isPlatformAdmin)
}

export const CATEGORIES: ActivityCategory[] = [
  '讲座',
  '文体',
  '志愿服务',
  '社团',
  '竞赛',
  '其他',
]

export function roleLabel(role: UserRole): string {
  return role === 'school' ? '校方' : '学生'
}

/** 活动列表/详情展示的发布来源 */
export function publisherChannelLabel(publisherRole: UserRole): string {
  return publisherRole === 'school' ? '校方发布' : '学生发布'
}
