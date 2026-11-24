import { Link, NavLink, Outlet } from 'react-router-dom'
import { supabaseSiap } from '../lib/supabase'

const MENU = [
  { ke: '/', label: 'Beranda', ikon: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z' },
  { ke: '/riwayat', label: 'Riwayat', ikon: 'M4 6h16M4 12h16M4 18h10' },
  { ke: '/laporan', label: 'Laporan', ikon: 'M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6' },
]

function Ikon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  )
}

export function Tata() {
  return (
    <div className="min-h-dvh pb-20 md:pb-8">
      <header className="sticky top-0 z-20 bg-navy text-white shadow">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <img src="/logo-himatika.png" alt="" className="h-9 w-9 rounded-full bg-white p-0.5" />
          <div className="min-w-0 flex-1 leading-tight">
            <p className="font-semibold">Keuangan HIMATIKA</p>
            <p className="truncate text-xs text-white/70">UIN Siber Syekh Nurjati Cirebon</p>
          </div>
          <nav className="hidden gap-1 md:flex" aria-label="Menu utama">
            {MENU.map((m) => (
              <NavLink
                key={m.ke}
                to={m.ke}
                end={m.ke === '/'}
                className={({ isActive }) =>
                  `rounded-md px-3 py-1.5 text-sm font-medium ${isActive ? 'bg-white/15 text-white' : 'text-white/75 hover:text-white'}`
                }
              >
                {m.label}
              </NavLink>
            ))}
          </nav>
          <Link to="/admin" className="shrink-0 rounded-md px-2 py-1.5 text-xs font-medium text-white/75 hover:text-white">
            Bendahara
          </Link>
        </div>
        <div className="h-0.5 bg-emas" aria-hidden="true" />
      </header>

      <main className="mx-auto max-w-3xl px-4 py-4">
        {!supabaseSiap && (
          <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            Koneksi Supabase belum diatur. Isi VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY di .env.local.
          </p>
        )}
        <Outlet />
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden"
        aria-label="Menu utama"
      >
        <ul className="mx-auto flex max-w-md">
          {MENU.map((m) => (
            <li key={m.ke} className="flex-1">
              <NavLink
                to={m.ke}
                end={m.ke === '/'}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${isActive ? 'text-primer' : 'text-slate-500'}`
                }
              >
                <Ikon d={m.ikon} />
                {m.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
