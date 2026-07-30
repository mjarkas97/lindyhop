import { writable } from 'svelte/store'
import { me, type User } from '$lib/api/auth'

/**
 * The signed-in account. The app renders on the client, so there is no server
 * load to hand this down — the layout fetches it once at startup and everything
 * else reads it from here.
 */
export const user = writable<User | null>(null)

export async function loadUser(): Promise<void> {
  user.set(await me())
}
