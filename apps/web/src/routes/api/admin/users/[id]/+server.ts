import { json, type RequestHandler } from '@sveltejs/kit'
import { countAdmins, deleteUser, forceLogout, getUser, setAdmin } from '$lib/server/admin'

const NOT_FOUND = { error: 'Benutzer nicht gefunden.' }

function parseId(value: string | undefined): number | null {
  const id = Number(value)
  return Number.isInteger(id) && id > 0 ? id : null
}

/** Actions on one user. The admin guard in hooks.server.ts has already run. */
export const POST: RequestHandler = async ({ params, request, locals }) => {
  const id = parseId(params.id)
  const target = id === null ? null : getUser(id)
  if (!target) return json(NOT_FOUND, { status: 404 })

  const me = locals.user!
  const { action } = await request.json()

  // Removing the last admin locks everyone out of this page permanently, and
  // nothing left in the app could undo it. Only applies when the target is
  // itself an admin — deleting an ordinary user is always fine.
  const isLastAdmin = target.is_admin && countAdmins() <= 1

  switch (action) {
    case 'promote':
      setAdmin(target.id, true)
      return json({ ok: true })

    case 'demote':
      if (isLastAdmin) {
        return json({ error: 'Der letzte Administrator kann nicht entfernt werden.' }, { status: 409 })
      }
      setAdmin(target.id, false)
      return json({ ok: true })

    case 'logout':
      forceLogout(target.id)
      return json({ ok: true })

    case 'delete':
      // Deleting yourself would destroy the session making the request.
      if (target.id === me.id) {
        return json({ error: 'Du kannst dein eigenes Konto hier nicht löschen.' }, { status: 409 })
      }
      if (isLastAdmin) {
        return json({ error: 'Der letzte Administrator kann nicht gelöscht werden.' }, { status: 409 })
      }
      deleteUser(target.id)
      return json({ ok: true })

    default:
      return json({ error: 'Unbekannte Aktion.' }, { status: 400 })
  }
}
