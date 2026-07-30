import { request, postJson } from './client'

export interface AdminUser {
  id:             number
  username:       string
  is_admin:       boolean
  created_at:     number
  entries:        number
  public_entries: number
  videos:         number
  storage:        number
  last_seen:      number | null
}

export interface InstanceStats {
  users:          number
  entries:        number
  public_entries: number
  videos:         number
  storage:        number
}

export interface AdminOverview {
  users:             AdminUser[]
  stats:             InstanceStats
  registrationOpen:  boolean
}

export function getOverview(): Promise<AdminOverview> {
  return request<AdminOverview>('/api/admin')
}

export function setRegistrationOpen(open: boolean): Promise<{ open: boolean }> {
  return postJson<{ open: boolean }>('/api/admin/registration', { open })
}

export type UserAction = 'promote' | 'demote' | 'logout' | 'delete'

export function actOnUser(id: number, action: UserAction): Promise<{ ok: true }> {
  return postJson<{ ok: true }>(`/api/admin/users/${id}`, { action })
}
