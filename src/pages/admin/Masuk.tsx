import { useState, type FormEvent } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { Bidang, Kartu, Memuat, kelasInput } from '../../components/ui'
import { masuk } from '../../lib/adminApi'
import { useSesi } from '../../lib/auth'

export default function Masuk() {
  const { status } = useSesi()
  const lokasi = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [lihat, setLihat] = useState(false)
  const [proses, setProses] = useState(false)
  const [galat, setGalat] = useState<string | null>(null)

  const tujuan = (lokasi.state as { dari?: string } | null)?.dari ?? '/admin'
  if (status === 'admin' || status === 'bukan_admin') return <Navigate to={tujuan} replace />

  const kirim = async (e: FormEvent) => {
    e.preventDefault()
    setGalat(null)
    if (!email.trim() || !password) {
      setGalat('Isi email dan password.')
      return
    }
    setProses(true)
    try {
      await masuk(email, password)
      // Pengalihan terjadi otomatis setelah status sesi berubah.
    } catch (err) {
      setGalat(err instanceof Error ? err.message : String(err))
    } finally {
      setProses(false)
    }
  }

  return (
    <div className="mx-auto max-w-sm">
      <Kartu>
        <h1 className="text-lg font-bold text-navy">Masuk bendahara</h1>
        <p className="mt-1 text-sm text-slate-600">Halaman ini hanya untuk bendahara HIMATIKA. Pengunjung cukup melihat Beranda, Riwayat, dan Laporan.</p>
        {status === 'memuat' ? (
          <div className="mt-4">
            <Memuat baris={2} />
          </div>
        ) : (
          <form onSubmit={kirim} className="mt-4 space-y-3" noValidate>
            <Bidang label="Email">
              <input
                type="email"
                autoComplete="username"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={kelasInput}
                required
              />
            </Bidang>
            <Bidang label="Password">
              <div className="relative">
                <input
                  type={lihat ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`${kelasInput} pr-16`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setLihat((v) => !v)}
                  className="absolute inset-y-0 right-0 px-3 text-xs font-medium text-slate-500 hover:text-navy"
                  aria-label={lihat ? 'Sembunyikan password' : 'Tampilkan password'}
                >
                  {lihat ? 'Tutup' : 'Lihat'}
                </button>
              </div>
            </Bidang>
            {galat && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
                {galat}
              </p>
            )}
            <button
              type="submit"
              disabled={proses}
              className="w-full rounded-lg bg-primer px-4 py-2.5 text-sm font-semibold text-white hover:bg-primer-gelap disabled:opacity-60"
            >
              {proses ? 'Memeriksa...' : 'Masuk'}
            </button>
            <p className="text-xs text-slate-500">Lupa password? Minta pengelola mengatur ulang lewat dashboard Supabase.</p>
          </form>
        )}
      </Kartu>
    </div>
  )
}
