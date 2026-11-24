import { Link, NavLink, Navigate, Outlet, useLocation } from 'react-router-dom'
import { Kartu, Memuat } from '../../components/ui'
import { useSesi } from '../../lib/auth'

/** Hanya admin yang bisa melihat halaman di dalamnya. Tamu diarahkan ke halaman masuk. */
export function PenjagaAdmin() {
  const { status, email, galat, keluar } = useSesi()
  const lokasi = useLocation()

  if (status === 'memuat') return <Memuat baris={4} />
  if (status === 'tamu') return <Navigate to="/admin/masuk" replace state={{ dari: lokasi.pathname }} />
  if (status === 'bukan_admin') {
    return (
      <Kartu>
        <h1 className="text-lg font-bold text-navy">Akun belum terdaftar sebagai bendahara</h1>
        <p className="mt-1 text-sm text-slate-600">
          Kamu masuk sebagai <span className="font-medium">{email}</span>, tapi akun ini belum ada di daftar admin. Minta
          pengelola menambahkan akun ini (lihat README, bagian akun bendahara).
        </p>
        {galat && <p className="mt-2 text-xs text-red-700">Detail: {galat}</p>}
        <button type="button" onClick={keluar} className="mt-3 rounded-lg bg-navy px-4 py-2 text-sm font-medium text-white">
          Keluar
        </button>
      </Kartu>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-navy-muda px-3 py-2">
        <nav className="flex gap-1" aria-label="Menu bendahara">
          <NavLink
            to="/admin"
            end
            className={({ isActive }) =>
              `rounded-md px-3 py-1.5 text-sm font-medium ${isActive ? 'bg-white text-navy shadow-sm' : 'text-slate-600 hover:text-navy'}`
            }
          >
            Transaksi
          </NavLink>
          <NavLink
            to="/admin/baru"
            className={({ isActive }) =>
              `rounded-md px-3 py-1.5 text-sm font-medium ${isActive ? 'bg-white text-navy shadow-sm' : 'text-slate-600 hover:text-navy'}`
            }
          >
            Catat baru
          </NavLink>
          <NavLink
            to="/admin/master"
            className={({ isActive }) =>
              `rounded-md px-3 py-1.5 text-sm font-medium ${isActive ? 'bg-white text-navy shadow-sm' : 'text-slate-600 hover:text-navy'}`
            }
          >
            Master data
          </NavLink>
        </nav>
        <div className="flex min-w-0 items-center gap-2 text-xs text-slate-600">
          <span className="truncate" title={email ?? ''}>
            {email}
          </span>
          <button type="button" onClick={keluar} className="shrink-0 rounded-md px-2 py-1 font-medium text-primer hover:bg-white">
            Keluar
          </button>
        </div>
      </div>
      <Outlet />
    </div>
  )
}

export function AdminTidakDitemukan() {
  return (
    <Kartu>
      <h1 className="text-lg font-bold text-navy">Halaman tidak ditemukan</h1>
      <Link to="/admin" className="mt-2 inline-block text-sm font-medium text-primer hover:underline">
        Kembali ke daftar transaksi
      </Link>
    </Kartu>
  )
}
