import { supabaseSiap } from './lib/supabase'

export default function App() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <img src="/logo-himatika.png" alt="Logo HIMATIKA" className="h-24 w-24" />
      <div>
        <h1 className="text-xl font-bold text-navy">Keuangan HIMATIKA</h1>
        <p className="text-sm text-slate-600">UIN Siber Syekh Nurjati Cirebon</p>
      </div>
      <p className="rounded-lg border-l-4 border-emas bg-white px-4 py-3 text-left text-sm text-slate-700 shadow-sm">
        Tahap (a) selesai: skema database, keamanan, dan perhitungan saldo. Halaman publik dibuat di
        tahap (b).
      </p>
      <p className="text-xs text-slate-500">
        Koneksi Supabase: {supabaseSiap ? 'terkonfigurasi' : 'belum diisi (.env.local)'}
      </p>
      <span className="h-1 w-16 rounded bg-primer" aria-hidden="true" />
    </main>
  )
}
