import { useEffect, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'

/** Penanda offline dan tawaran memuat versi baru aplikasi. */
export function StatusAplikasi() {
  const [online, setOnline] = useState(() => navigator.onLine)
  const {
    needRefresh: [perluMuatUlang, setPerluMuatUlang],
    updateServiceWorker,
  } = useRegisterSW()

  useEffect(() => {
    const naik = () => setOnline(true)
    const turun = () => setOnline(false)
    window.addEventListener('online', naik)
    window.addEventListener('offline', turun)
    return () => {
      window.removeEventListener('online', naik)
      window.removeEventListener('offline', turun)
    }
  }, [])

  return (
    <>
      {!online && (
        <p role="status" className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          Tidak ada koneksi internet. Data tidak bisa dimuat atau disimpan sampai koneksi kembali.
        </p>
      )}
      {perluMuatUlang && (
        <div role="status" className="mb-4 flex items-center gap-3 rounded-lg border border-navy/20 bg-white p-3 text-sm shadow-sm">
          <p className="flex-1 text-slate-700">Versi baru aplikasi tersedia.</p>
          <button type="button" onClick={() => setPerluMuatUlang(false)} className="px-2 py-1.5 font-medium text-slate-500">
            Nanti
          </button>
          <button
            type="button"
            onClick={() => void updateServiceWorker(true)}
            className="rounded-md bg-navy px-3 py-1.5 font-medium text-white"
          >
            Muat ulang
          </button>
        </div>
      )}
    </>
  )
}
