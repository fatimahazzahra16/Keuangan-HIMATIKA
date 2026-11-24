import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Hanya anon key yang boleh ada di frontend. Service role key tidak pernah dipakai di aplikasi ini.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabaseSiap = Boolean(url && anonKey)

let klien: SupabaseClient | null = null

export function supabase(): SupabaseClient {
  if (!url || !anonKey) {
    throw new Error('VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY belum diisi di .env.local')
  }
  klien ??= createClient(url, anonKey)
  return klien
}
