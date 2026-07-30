/**
 * Every endpoint answers `{ error }` with a non-2xx status on failure, so one
 * helper covers all of them. The thrown message is already German and safe to
 * put in front of the user.
 */
export async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init)

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.error ?? `Anfrage fehlgeschlagen (${response.status}).`)
  }

  return response.json() as Promise<T>
}

export function postJson<T>(url: string, body: unknown): Promise<T> {
  return request<T>(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}
