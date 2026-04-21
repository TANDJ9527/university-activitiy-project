import type { Activity } from '../types'
import { fromDatetimeLocalValue, toDatetimeLocalValue } from '../lib/dates'

export type ActivityFormValues = {
  title: string
  description: string
  location: string
  organizer: string
  contact: string
  category: string
  startAt: string
  endAt: string
}

const empty: ActivityFormValues = {
  title: '',
  description: '',
  location: '',
  organizer: '',
  contact: '',
  category: '其他',
  startAt: '',
  endAt: '',
}

export function valuesFromActivity(a: Activity): ActivityFormValues {
  return {
    title: a.title,
    description: a.description,
    location: a.location,
    organizer: a.organizer,
    contact: a.contact,
    category: a.category,
    startAt: toDatetimeLocalValue(a.startAt),
    endAt: a.endAt ? toDatetimeLocalValue(a.endAt) : '',
  }
}

export function payloadFromValues(v: ActivityFormValues) {
  return {
    title: v.title.trim(),
    description: v.description.trim(),
    location: v.location.trim(),
    organizer: v.organizer.trim(),
    contact: v.contact.trim(),
    category: v.category,
    startAt: fromDatetimeLocalValue(v.startAt),
    endAt: v.endAt.trim() ? fromDatetimeLocalValue(v.endAt) : null,
  }
}

export function getEmptyValues(): ActivityFormValues {
  return { ...empty }
}
