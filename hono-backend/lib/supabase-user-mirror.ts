import { getAdminSupabaseClient } from './supabase'

type UserMirrorFields = {
  credits?: number
  role?: 'admin' | 'user'
  is_suspended?: boolean
}

export async function mirrorUserFieldsToSupabase(
  env: Record<string, string> | undefined,
  userId: string,
  fields: UserMirrorFields
): Promise<void> {
  if (!userId) return
  if (Object.keys(fields).length === 0) return

  const admin = getAdminSupabaseClient(env)
  // Keep boundary cast in one place so route handlers stay strongly typed.
  await (admin as unknown as {
    from: (table: string) => {
      update: (payload: Record<string, unknown>) => {
        eq: (column: string, value: string) => Promise<unknown>
      }
    }
  })
    .from('users')
    .update(fields as unknown as Record<string, unknown>)
    .eq('id', userId)
}

export async function mirrorUserCreditsToSupabase(
  env: Record<string, string> | undefined,
  userId: string,
  credits: number
): Promise<void> {
  await mirrorUserFieldsToSupabase(env, userId, { credits })
}
