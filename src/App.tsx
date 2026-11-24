import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Tata } from './components/Tata'
import Beranda from './pages/Beranda'
import Laporan from './pages/Laporan'
import { Admin, TidakDitemukan } from './pages/Lain'
import Riwayat from './pages/Riwayat'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Tata />}>
          <Route index element={<Beranda />} />
          <Route path="riwayat" element={<Riwayat />} />
          <Route path="laporan" element={<Laporan />} />
          <Route path="admin/*" element={<Admin />} />
          <Route path="*" element={<TidakDitemukan />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
