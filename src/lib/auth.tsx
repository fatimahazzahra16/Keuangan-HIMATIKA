import type { Session } from '@supabase/supabase-js'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase, supabaseSiap } from './supabase'

/**
 * Status login:
 * - memuat: sesi belum dibaca
 * - tamu: belum login
 * - bukan_admin: login, tapi user_id tidak ada di tabel admins
 * - admin: boleh menulis data
 */
export type StatusSesi = 'memuat' | 'tamu' | 'bukan_admin' | 'admin'

interface NilaiSesi {
  status: StatusSesi
  email: string | null
  galat: string | null
  keluar: () => Promise<void>
}

const KonteksSesi = createContext<NilaiSesi | null>(null)

/** Cek baris diri sendiri di tabel admins. RLS hanya mengizinkan membaca baris milik sendiri. */
async function cekAdmin(userId: string): Promise<boolean> {
  const { data, error } = await supabase().from('admins').select('user_id').eq('user_id', userId).maybeSingle()
  if (error) throw new Error(error.message)
  return data !== null
}

export function PenyediaSesi({ children }: { children: ReactNode }) {
  const [sesi, setSesi] = useState<Session | null | undefined>(supabaseSiap ? undefined : null)
  const [status, setStatus] = useState<StatusSesi>(supabaseSiap ? 'memuat' : 'tamu')
  const [galat, setGalat] = useState<string | null>(null)

  useEffect(() => {
    if (!supabaseSiap) return
    const klien = supabase()
    klien.auth.getSession().then(({ data }) => setSesi(data.session))
    const { data } = klien.auth.onAuthStateChange((_e, s) => setSesi(s))
    return () => data.subscription.unsubscribe()
  }, [])

  const userId = sesi?.user.id
  useEffect(() => {
    if (sesi === undefined) return
    if (!userId) {
      setStatus('tamu')
      return
    }
    let batal = false
    setStatus('memuat')
    setGalat(null)
    cekAdmin(userId).then(
      (ya) => !batal && setStatus(ya ? 'admin' : 'bukan_admin'),
      (e: unknown) => {
        if (batal) return
        setGalat(e instanceof Error ? e.message : String(e))
        setStatus('bukan_admin')
      },
    )
    return () => {
      batal = true
    }
  }, [sesi, userId])

  const keluar = async () => {
    await supabase().auth.signOut()
  }

  return (
    <KonteksSesi.Provider value={{ status, email: sesi?.user.email ?? null, galat, keluar }}>{children}</KonteksSesi.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSesi(): NilaiSesi {
  const v = useContext(KonteksSesi)
  if (!v) throw new Error('useSesi dipakai di luar PenyediaSesi')
  return v
}
