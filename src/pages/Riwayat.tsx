import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ItemTransaksi } from '../components/ItemTransaksi'
import { Bidang, Galat, Kartu, Kosong, Memuat, PilihanSegmen, kelasInput } from '../components/ui'
import { ambilKas, ambilKategori, ambilProker, ambilRiwayat, type FilterRiwayat } from '../lib/api'
import { formatTanggal } from '../lib/format'
import type { Buku, Transaksi } from '../lib/types'
import { useMuat } from '../lib/useMuat'

const PER_HALAMAN = 30
const KUNCI = ['buku', 'kas', 'jenis', 'kategori', 'proker', 'dari', 'sampai', 'q'] as const

function bacaFilter(p: URLSearchParams): FilterRiwayat {
  const buku = p.get('buku')
  const jenis = p.get('jenis')
  return {
    buku: buku === 'kas' || buku === 'dipa' ? buku : undefined,
    kasId: p.get('kas') || undefined,
    jenis: jenis === 'masuk' || jenis === 'keluar' || jenis === 'pindah' ? jenis : undefined,
    kategoriId: p.get('kategori') || undefined,
    prokerId: p.get('proker') || undefined,
    dari: p.get('dari') || undefined,
    sampai: p.get('sampai') || undefined,
    cari: p.get('q') || undefined,
  }
}

export default function Riwayat() {
  const [params, setParams] = useSearchParams()
  const filter = useMemo(() => bacaFilter(params), [params])
  const kunciFilter = KUNCI.map((k) => params.get(k) ?? '').join('|')
  const [bukaFilter, setBukaFilter] = useState(false)
  const [cari, setCari] = useState(filter.cari ?? '')

  const master = useMuat(() => Promise.all([ambilKas(), ambilKategori(), ambilProker()]), [])
  const [kasList, kategoriList, prokerList] = master.data ?? [[], [], []]

  const [baris, setBaris] = useState<Transaksi[]>([])
  const [adaLagi, setAdaLagi] = useState(false)
  const [memuat, setMemuat] = useState(true)
  const [galat, setGalat] = useState<string | null>(null)
  const [putaran, setPutaran] = useState(0)

  // Muat ulang dari awal saat filter berubah.
  useEffect(() => {
    let batal = false
    setMemuat(true)
    setGalat(null)
    ambilRiwayat(filter, 0, PER_HALAMAN).then(
      (h) => {
        if (batal) return
        setBaris(h.baris)
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
  }, [kunciFilter, putaran])

  // Kotak pencarian menulis ke URL setelah berhenti mengetik.
  useEffect(() => {
    const id = setTimeout(() => ubah({ q: cari.trim() || null }), 400)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cari])

  function ubah(perubahan: Partial<Record<(typeof KUNCI)[number], string | null>>) {
    setParams(
      (lama) => {
        const baru = new URLSearchParams(lama)
        for (const [k, v] of Object.entries(perubahan)) {
          if (v) baru.set(k, v)
          else baru.delete(k)
        }
        return baru
      },
      { replace: true },
    )
  }

  async function muatLagi() {
    setMemuat(true)
    try {
      const h = await ambilRiwayat(filter, baris.length, PER_HALAMAN)
      setBaris((b) => [...b, ...h.baris])
      setAdaLagi(h.adaLagi)
    } catch (e) {
      setGalat(e instanceof Error ? e.message : String(e))
    } finally {
      setMemuat(false)
    }
  }

  const sesuaiBuku = <T extends { buku: Buku }>(x: T) => !filter.buku || x.buku === filter.buku
  const kasPilihan = kasList.filter(sesuaiBuku)
  const kategoriPilihan = kategoriList.filter(
    (k) => sesuaiBuku(k) && (!filter.jenis || filter.jenis === 'pindah' || k.berlaku === filter.jenis),
  )
  const prokerPilihan = prokerList.filter(sesuaiBuku)
  const jumlahFilter = [filter.kasId, filter.jenis, filter.kategoriId, filter.prokerId, filter.dari, filter.sampai].filter(Boolean).length

  // Kelompokkan per tanggal.
  const kelompok: { tanggal: string; isi: Transaksi[] }[] = []
  for (const t of baris) {
    const akhir = kelompok[kelompok.length - 1]
    if (akhir?.tanggal === t.tanggal) akhir.isi.push(t)
    else kelompok.push({ tanggal: t.tanggal, isi: [t] })
  }

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold text-navy">Riwayat transaksi</h1>

      <Kartu className="space-y-3">
        <PilihanSegmen<'' | Buku>
          label="Buku"
          nilai={filter.buku ?? ''}
          onPilih={(v) => ubah({ buku: v || null, kas: null, kategori: null, proker: null })}
          opsi={[
            { nilai: '', label: 'Semua' },
            { nilai: 'kas', label: 'Kas HIMA' },
            { nilai: 'dipa', label: 'Dana DIPA' },
          ]}
        />
        <div className="flex gap-2">
          <input
            type="search"
            value={cari}
            onChange={(e) => setCari(e.target.value)}
            placeholder="Cari keterangan"
            aria-label="Cari keterangan"
            className={kelasInput}
          />
          <button
            type="button"
            onClick={() => setBukaFilter((b) => !b)}
            aria-expanded={bukaFilter}
            className="shrink-0 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-navy hover:bg-slate-50"
          >
            Filter{jumlahFilter > 0 ? ` (${jumlahFilter})` : ''}
          </button>
        </div>

        {bukaFilter && (
          <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-3">
            <Bidang label="Jenis">
              <select
                className={kelasInput}
                value={filter.jenis ?? ''}
                onChange={(e) => ubah({ jenis: e.target.value || null, kategori: null })}
              >
                <option value="">Semua</option>
                <option value="masuk">Masuk</option>
                <option value="keluar">Keluar</option>
                <option value="pindah">Pindah</option>
              </select>
            </Bidang>
            <Bidang label="Kas">
              <select className={kelasInput} value={filter.kasId ?? ''} onChange={(e) => ubah({ kas: e.target.value || null })}>
                <option value="">Semua kas</option>
                {kasPilihan.map((k) => (
                  <option key={k.id} value={k.id}>
                    {filter.buku ? k.nama : `${k.nama} (${k.buku === 'kas' ? 'HIMA' : 'DIPA'})`}
                  </option>
                ))}
              </select>
            </Bidang>
            <Bidang label="Kategori">
              <select
                className={kelasInput}
                value={filter.kategoriId ?? ''}
                disabled={filter.jenis === 'pindah'}
                onChange={(e) => ubah({ kategori: e.target.value || null })}
              >
                <option value="">Semua kategori</option>
                {kategoriPilihan.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.nama} ({k.berlaku}
                    {filter.buku ? '' : `, ${k.buku === 'kas' ? 'HIMA' : 'DIPA'}`})
                  </option>
                ))}
              </select>
            </Bidang>
            <Bidang label="Proker">
              <select className={kelasInput} value={filter.prokerId ?? ''} onChange={(e) => ubah({ proker: e.target.value || null })}>
                <option value="">Semua proker</option>
                {prokerPilihan.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nama}
                  </option>
                ))}
              </select>
            </Bidang>
            <Bidang label="Dari tanggal">
              <input type="date" className={kelasInput} value={filter.dari ?? ''} onChange={(e) => ubah({ dari: e.target.value || null })} />
            </Bidang>
            <Bidang label="Sampai tanggal">
              <input type="date" className={kelasInput} value={filter.sampai ?? ''} onChange={(e) => ubah({ sampai: e.target.value || null })} />
            </Bidang>
            {jumlahFilter > 0 && (
              <button
                type="button"
                onClick={() => ubah({ kas: null, jenis: null, kategori: null, proker: null, dari: null, sampai: null })}
                className="col-span-2 text-left text-sm font-medium text-primer hover:underline"
              >
                Hapus filter
              </button>
            )}
          </div>
        )}
      </Kartu>

      {master.galat && <Galat pesan={master.galat} ulangi={master.ulangi} />}
      {galat && <Galat pesan={galat} ulangi={() => setPutaran((p) => p + 1)} />}

      {!galat && memuat && baris.length === 0 ? (
        <Memuat baris={6} />
      ) : !galat && baris.length === 0 ? (
        <Kosong>Tidak ada transaksi yang cocok dengan filter ini.</Kosong>
      ) : (
        <div className="space-y-3">
          {kelompok.map((k) => (
            <Kartu key={k.tanggal} className="py-1">
              <h2 className="pt-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{formatTanggal(k.tanggal)}</h2>
              <ul className="divide-y divide-slate-100">
                {k.isi.map((t) => (
                  <ItemTransaksi key={t.id} t={t} tampilTanggal={false} tampilBuku={!filter.buku} />
                ))}
              </ul>
            </Kartu>
          ))}
          {adaLagi && (
            <button
              type="button"
              onClick={muatLagi}
              disabled={memuat}
              className="w-full rounded-lg bg-white py-2.5 text-sm font-medium text-navy ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-60"
            >
              {memuat ? 'Memuat...' : 'Muat lebih banyak'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
