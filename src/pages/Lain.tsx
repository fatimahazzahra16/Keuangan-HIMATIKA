import { Link } from 'react-router-dom'
import { Kartu } from '../components/ui'

export function Admin() {
  return (
    <Kartu>
      <h1 className="text-lg font-bold text-navy">Halaman bendahara</h1>
      <p className="mt-1 text-sm text-slate-600">Login dan form pencatatan transaksi sedang disiapkan.</p>
    </Kartu>
  )
}

export function TidakDitemukan() {
  return (
    <Kartu>
      <h1 className="text-lg font-bold text-navy">Halaman tidak ditemukan</h1>
      <Link to="/" className="mt-2 inline-block text-sm font-medium text-primer hover:underline">
        Kembali ke Beranda
      </Link>
    </Kartu>
  )
}
