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
  createdAt: string
  updatedAt: string
  /** 发布渠道：学生账号发布 / 校方账号发布（与创建时账号身份一致） */
  publisherRole: UserRole
  author: ActivityAuthor
}

export interface AuthUser {
  id: string
  email: string
  displayName: string
  role: UserRole
  isPlatformAdmin: boolean
}

export interface Comment {
  id: string
  content: string
  createdAt: string
  author: ActivityAuthor
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
