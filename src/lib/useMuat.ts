import { useCallback, useEffect, useState } from 'react'

export interface Muatan<T> {
  data: T | undefined
  galat: string | null
  memuat: boolean
  ulangi: () => void
}

/** Jalankan fungsi async dan simpan hasilnya. Dijalankan ulang saat `kunci` berubah. */
export function useMuat<T>(fn: () => Promise<T>, kunci: unknown[]): Muatan<T> {
  const [data, setData] = useState<T>()
  const [galat, setGalat] = useState<string | null>(null)
  const [memuat, setMemuat] = useState(true)
  const [putaran, setPutaran] = useState(0)

  useEffect(() => {
    let batal = false
    setMemuat(true)
    setGalat(null)
    fn().then(
      (d) => {
        if (batal) return
        setData(d)
        setMemuat(false)
      },
      (e: unknown) => {
        if (batal) return
        setGalat(e instanceof Error ? e.message : String(e))
        setMemuat(false)
      },
    )
    return () => {
      batal = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...kunci, putaran])

  const ulangi = useCallback(() => setPutaran((p) => p + 1), [])
  return { data, galat, memuat, ulangi }
}
