import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Galat, Kartu, Kosong, LabelJenis, Memuat, Nominal, PilihanSegmen } from '../../components/ui'
import { hitungBukti } from '../../lib/adminApi'
import { ambilRiwayat } from '../../lib/api'
import { formatTanggalPendek } from '../../lib/format'
import type { Buku, Transaksi } from '../../lib/types'

const PER_HALAMAN = 20
type PilihBuku = 'semua' | Buku

export default function DaftarAdmin() {
  const [buku, setBuku] = useState<PilihBuku>('semua')
  const [baris, setBaris] = useState<Transaksi[]>([])
  const [jmlBukti, setJmlBukti] = useState<Record<string, number>>({})
  const [adaLagi, setAdaLagi] = useState(false)
  const [memuat, setMemuat] = useState(true)
  const [galat, setGalat] = useState<string | null>(null)
  const [putaran, setPutaran] = useState(0)

  const muat = async (mulai: number) => {
    const h = await ambilRiwayat({ buku: buku === 'semua' ? undefined : buku }, mulai, PER_HALAMAN)
    const b = await hitungBukti(h.baris.map((t) => t.id))
    return { ...h, bukti: b }
  }

  useEffect(() => {
    let batal = false
    setMemuat(true)
    setGalat(null)
    muat(0).then(
      (h) => {
        if (batal) return
        setBaris(h.baris)
        setJmlBukti(h.bukti)
        setAdaLagi(h.adaLagi)
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
  }, [buku, putaran])

  const lagi = async () => {
    setMemuat(true)
    try {
      const h = await muat(baris.length)
      setBaris((b) => [...b, ...h.baris])
      setJmlBukti((j) => ({ ...j, ...h.bukti }))
      setAdaLagi(h.adaLagi)
    } catch (e) {
      setGalat(e instanceof Error ? e.message : String(e))
    } finally {
      setMemuat(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-lg font-bold text-navy">Transaksi</h1>
        <Link to="/admin/baru" className="rounded-lg bg-primer px-4 py-2 text-sm font-semibold text-white hover:bg-primer-gelap">
          Catat transaksi
        </Link>
      </div>

      <PilihanSegmen<PilihBuku>
        label="Buku"
        nilai={buku}
        onPilih={setBuku}
        opsi={[
          { nilai: 'semua', label: 'Semua' },
          { nilai: 'kas', label: 'Kas HIMA' },
          { nilai: 'dipa', label: 'Dana DIPA' },
        ]}
      />

      <Kartu>
        {galat && <Galat pesan={galat} ulangi={() => setPutaran((p) => p + 1)} />}
        {!galat && memuat && baris.length === 0 && <Memuat baris={5} />}
        {!galat && !memuat && baris.length === 0 && <Kosong>Belum ada transaksi. Mulai dengan tombol Catat transaksi.</Kosong>}
        {baris.length > 0 && (
          <ul className="divide-y divide-slate-100">
            {baris.map((t) => (
              <li key={t.id}>
                <Link to={`/admin/transaksi/${t.id}`} className="-mx-2 flex items-start justify-between gap-3 rounded-lg px-2 py-3 hover:bg-slate-50">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {t.keterangan.trim() || (t.jenis === 'pindah' ? 'Pindah dana' : (t.kategori_nama ?? 'Tanpa keterangan'))}
                    </p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-slate-500">
                      <LabelJenis jenis={t.jenis} />
                      <span>{formatTanggalPendek(t.tanggal)}</span>
                      <span className="truncate">
                        {t.jenis === 'pindah' ? `${t.kas_nama} ke ${t.kas_tujuan_nama}` : t.kas_nama}
                      </span>
                      {jmlBukti[t.id] ? (
                        <span className="text-navy">{jmlBukti[t.id]} foto</span>
                      ) : (
                        <span className="text-amber-700">Tanpa bukti</span>
                      )}
                    </p>
                  </div>
                  <Nominal jumlah={t.jumlah} jenis={t.jenis} className="text-sm" />
                </Link>
              </li>
            ))}
          </ul>
        )}
        {adaLagi && !galat && (
          <button
            type="button"
            onClick={lagi}
            disabled={memuat}
            className="mt-3 w-full rounded-lg bg-slate-100 py-2 text-sm font-medium text-navy hover:bg-slate-200 disabled:opacity-60"
          >
            {memuat ? 'Memuat...' : 'Muat lagi'}
          </button>
        )}
      </Kartu>
    </div>
  )
}
