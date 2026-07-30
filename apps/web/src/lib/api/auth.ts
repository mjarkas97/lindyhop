import { request, postJson } from './client'

export interface User {
  id:       number
  username: string
  is_admin: boolean
}

export function login(username: string, password: string): Promise<{ user: User }> {
  return postJson<{ user: User }>('/api/auth/login', { username, password })
}

export function register(username: string, password: string): Promise<{ user: User }> {
  return postJson<{ user: User }>('/api/auth/register', { username, password })
}

export function logout(): Promise<{ ok: true }> {
  return postJson<{ ok: true }>('/api/auth/logout', {})
}

export async function me(): Promise<User> {
  const { user } = await request<{ user: User }>('/api/auth/me')
  return user
}

export function changePassword(currentPassword: string, newPassword: string): Promise<{ ok: true }> {
  return postJson<{ ok: true }>('/api/auth/password', { currentPassword, newPassword })
}

/** Whether signups are accepted. Readable while logged out, for /login and /register. */
export async function registrationOpen(): Promise<boolean> {
  const { open } = await request<{ open: boolean }>('/api/auth/registration')
  return open
}
