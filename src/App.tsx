import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Tata } from './components/Tata'
import { PenyediaSesi } from './lib/auth'
import Beranda from './pages/Beranda'
import Laporan from './pages/Laporan'
import { TidakDitemukan } from './pages/Lain'
import Riwayat from './pages/Riwayat'
import DaftarAdmin from './pages/admin/Daftar'
import FormTransaksi from './pages/admin/Form'
import MasterDataAdmin from './pages/admin/Master'
import Masuk from './pages/admin/Masuk'
import { AdminTidakDitemukan, PenjagaAdmin } from './pages/admin/Penjaga'

export default function App() {
  return (
    <BrowserRouter>
      <PenyediaSesi>
        <Routes>
          <Route element={<Tata />}>
            <Route index element={<Beranda />} />
            <Route path="riwayat" element={<Riwayat />} />
            <Route path="laporan" element={<Laporan />} />
            <Route path="admin/masuk" element={<Masuk />} />
            <Route path="admin" element={<PenjagaAdmin />}>
              <Route index element={<DaftarAdmin />} />
              <Route path="baru" element={<FormTransaksi />} />
              <Route path="transaksi/:id" element={<FormTransaksi />} />
              <Route path="laporan" element={<Laporan admin />} />
              <Route path="master" element={<MasterDataAdmin />} />
              <Route path="*" element={<AdminTidakDitemukan />} />
            </Route>
            <Route path="*" element={<TidakDitemukan />} />
          </Route>
        </Routes>
      </PenyediaSesi>
    </BrowserRouter>
  )
}
