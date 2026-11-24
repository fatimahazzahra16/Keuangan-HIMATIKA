import { Link } from 'react-router-dom'
import { ItemTransaksi } from '../components/ItemTransaksi'
import { Galat, JudulBagian, Kartu, Kosong, Memuat } from '../components/ui'
import { ambilKas, ambilTransaksiRentang, ambilTransaksiTerbaru } from '../lib/api'
import { ringkasBeranda } from '../lib/beranda'
import { formatBulan, formatRupiah, rentangBulanIni } from '../lib/format'
import { useMuat } from '../lib/useMuat'

export default function Beranda() {
  const [dari, sampai] = rentangBulanIni()
  const [tahun, bulan] = dari.split('-').map(Number)
  const { data, galat, memuat, ulangi } = useMuat(async () => {
    const [kas, bulanIni, terbaru] = await Promise.all([
      ambilKas(),
      ambilTransaksiRentang(dari, sampai),
      ambilTransaksiTerbaru(5),
    ])
    return { ringkasan: ringkasBeranda(kas, bulanIni), terbaru }
  }, [dari, sampai])

  if (memuat && !data) return <Memuat baris={4} />
  if (galat) return <Galat pesan={galat} ulangi={ulangi} />
  if (!data) return null

  const total = data.ringkasan.reduce((s, b) => s + b.saldo, 0)

  return (
    <div className="space-y-4">
      <section className="rounded-xl bg-primer p-4 text-white shadow-sm">
        <p className="text-sm text-white/80">Total saldo semua buku</p>
        <p className="mt-1 text-3xl font-bold tabular-nums">{formatRupiah(total)}</p>
        <p className="mt-1 text-xs text-white/70">Kas HIMA dan Dana DIPA dicatat terpisah. Rinciannya ada di bawah.</p>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        {data.ringkasan.map((b) => (
          <Kartu key={b.buku}>
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="text-base font-semibold text-navy">{b.nama}</h2>
              <p className="text-lg font-bold tabular-nums text-slate-900">{formatRupiah(b.saldo)}</p>
            </div>
            {b.kas.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">Belum ada kas.</p>
            ) : (
              <ul className="mt-2 divide-y divide-slate-100 text-sm">
                {b.kas.map((k) => (
                  <li key={k.id} className="flex justify-between gap-2 py-1.5">
                    <span className="text-slate-600">{k.nama}</span>
                    <span className="font-medium tabular-nums">{formatRupiah(k.saldo)}</span>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg bg-slate-50 p-2 text-sm">
              <p className="col-span-2 text-xs font-medium text-slate-500">{formatBulan(tahun, bulan)}</p>
              <div>
                <p className="text-xs text-slate-500">Masuk</p>
                <p className="font-semibold tabular-nums text-masuk">{formatRupiah(b.masukBulanIni)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Keluar</p>
                <p className="font-semibold tabular-nums text-keluar">{formatRupiah(b.keluarBulanIni)}</p>
              </div>
            </div>
          </Kartu>
        ))}
      </div>

      <Kartu>
        <JudulBagian
          aksi={
            <Link to="/riwayat" className="text-sm font-medium text-primer hover:underline">
              Lihat semua
            </Link>
          }
        >
          Transaksi terakhir
        </JudulBagian>
        {data.terbaru.length === 0 ? (
          <Kosong>Belum ada transaksi yang dicatat.</Kosong>
        ) : (
          <ul className="-my-3 divide-y divide-slate-100">
            {data.terbaru.map((t) => (
              <ItemTransaksi key={t.id} t={t} tampilBuku />
            ))}
          </ul>
        )}
      </Kartu>
    </div>
  )
}
