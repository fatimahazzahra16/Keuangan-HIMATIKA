import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Bidang, Galat, JudulBagian, Kartu, Kosong, Memuat, PilihanSegmen, kelasInput } from '../components/ui'
import { ambilKas, ambilProker, ambilTransaksiBukuSampai, ambilTransaksiProker } from '../lib/api'
import { ambilBuktiLaporan, MAKS_LAMPIRAN_PDF } from '../lib/adminApi'
import { muatGambar, namaBerkas, susunDokumen, unduhBlob, type InfoLaporan } from '../lib/ekspor'
import { formatRupiah, formatTanggal, formatTanggalPendek, hariIniJakarta, rentangBulanIni } from '../lib/format'
import { laporanPeriode, laporanProker, type Laporan as DataLaporan, type RekapKategori } from '../lib/laporan'
import { NAMA_BUKU, type Buku } from '../lib/types'
import { useMuat } from '../lib/useMuat'

type Mode = 'periode' | 'proker'

/** `admin`: versi bendahara, PDF boleh menyertakan foto bukti sebagai lampiran. */
export default function Laporan({ admin = false }: { admin?: boolean }) {
  const [params, setParams] = useSearchParams()
  const [awalBulan, akhirBulan] = rentangBulanIni()
  const mode: Mode = params.get('mode') === 'proker' ? 'proker' : 'periode'
  const buku: Buku = params.get('buku') === 'dipa' ? 'dipa' : 'kas'
  const kasId = params.get('kas') ?? ''
  const dari = params.get('dari') || awalBulan
  const sampai = params.get('sampai') || akhirBulan
  const prokerId = params.get('proker') ?? ''

  function ubah(perubahan: Record<string, string | null>) {
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

  const master = useMuat(() => Promise.all([ambilKas(), ambilProker()]), [])
  const [kasList, prokerList] = master.data ?? [[], []]
  const kasBuku = kasList.filter((k) => k.buku === buku)
  const proker = prokerList.find((p) => p.id === prokerId)
  const rentangSalah = mode === 'periode' && dari > sampai

  const hasil = useMuat<DataLaporan | null>(async () => {
    if (mode === 'proker') {
      if (!prokerId) return null
      return laporanProker(await ambilTransaksiProker(prokerId), prokerId)
    }
    if (rentangSalah) return null
    const [kas, trx] = await Promise.all([ambilKas(), ambilTransaksiBukuSampai(buku, sampai)])
    return laporanPeriode({
      kasList: kas.filter((k) => k.buku === buku),
      transaksi: trx,
      dari,
      sampai,
      kasId: kasId || undefined,
    })
  }, [mode, buku, kasId, dari, sampai, prokerId, rentangSalah])

  const info = useMemo((): Omit<InfoLaporan, 'dibuat'> => {
    if (mode === 'proker') {
      if (!proker) return { judul: '', periode: '', proker: true, perKas: false }
      const periode = proker.tanggal_selesai
        ? `${formatTanggal(proker.tanggal_mulai)} sampai ${formatTanggal(proker.tanggal_selesai)}`
        : `Mulai ${formatTanggal(proker.tanggal_mulai)}`
      return { judul: `Laporan Proker ${proker.nama} (${NAMA_BUKU[proker.buku]})`, periode, proker: true, perKas: false }
    }
    const namaKas = kasBuku.find((k) => k.id === kasId)?.nama
    return {
      judul: `Laporan ${NAMA_BUKU[buku]}${namaKas ? `, ${namaKas}` : ''}`,
      periode: `${formatTanggal(dari)} sampai ${formatTanggal(sampai)}`,
      proker: false,
      perKas: Boolean(kasId),
    }
  }, [mode, proker, kasBuku, kasId, buku, dari, sampai])
  const judul = info.judul ? `${info.judul}: ${info.periode}` : ''

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold text-navy">{admin ? 'Laporan bendahara' : 'Laporan'}</h1>

      <Kartu className="space-y-3">
        <PilihanSegmen<Mode>
          label="Jenis laporan"
          nilai={mode}
          onPilih={(v) => ubah({ mode: v === 'periode' ? null : v })}
          opsi={[
            { nilai: 'periode', label: 'Per periode' },
            { nilai: 'proker', label: 'Per proker' },
          ]}
        />
        {mode === 'periode' ? (
          <div className="grid grid-cols-2 gap-3">
            <Bidang label="Buku">
              <select className={kelasInput} value={buku} onChange={(e) => ubah({ buku: e.target.value === 'kas' ? null : e.target.value, kas: null })}>
                <option value="kas">Kas HIMA</option>
                <option value="dipa">Dana Dipa</option>
              </select>
            </Bidang>
            <Bidang label="Kas">
              <select className={kelasInput} value={kasId} onChange={(e) => ubah({ kas: e.target.value || null })}>
                <option value="">Semua kas</option>
                {kasBuku.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.nama}
                  </option>
                ))}
              </select>
            </Bidang>
            <Bidang label="Dari tanggal">
              <input type="date" className={kelasInput} value={dari} onChange={(e) => ubah({ dari: e.target.value || null })} />
            </Bidang>
            <Bidang label="Sampai tanggal">
              <input type="date" className={kelasInput} value={sampai} onChange={(e) => ubah({ sampai: e.target.value || null })} />
            </Bidang>
          </div>
        ) : (
          <Bidang label="Program kerja">
            <select className={kelasInput} value={prokerId} onChange={(e) => ubah({ proker: e.target.value || null })}>
              <option value="">Pilih proker</option>
              {(['kas', 'dipa'] as const).map((b) => {
                const isi = prokerList.filter((p) => p.buku === b)
                if (isi.length === 0) return null
                return (
                  <optgroup key={b} label={NAMA_BUKU[b]}>
                    {isi.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nama}
                        {p.status === 'arsip' ? ' (arsip)' : ''}
                      </option>
                    ))}
                  </optgroup>
                )
              })}
            </select>
          </Bidang>
        )}
      </Kartu>

      {master.galat && <Galat pesan={master.galat} ulangi={master.ulangi} />}

      {rentangSalah ? (
        <Galat pesan="Tanggal awal tidak boleh setelah tanggal akhir." />
      ) : mode === 'proker' && !prokerId ? (
        <Kosong>{prokerList.length === 0 && !master.memuat ? 'Belum ada proker.' : 'Pilih proker untuk melihat laporannya.'}</Kosong>
      ) : hasil.galat ? (
        <Galat pesan={hasil.galat} ulangi={hasil.ulangi} />
      ) : hasil.memuat || !hasil.data ? (
        <Memuat baris={5} />
      ) : (
        <>
          <Ekspor lap={hasil.data} info={info} admin={admin} />
          <IsiLaporan lap={hasil.data} judul={judul} perKas={mode === 'periode' && Boolean(kasId)} proker={mode === 'proker'} />
        </>
      )}
    </div>
  )
}

function Angka({ label, nilai, warna = 'text-slate-900' }: { label: string; nilai: number; warna?: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-2.5">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`mt-0.5 font-semibold tabular-nums ${warna}`}>{formatRupiah(nilai)}</p>
    </div>
  )
}

function IsiLaporan({ lap, judul, perKas, proker }: { lap: DataLaporan; judul: string; perKas: boolean; proker: boolean }) {
  return (
    <>
      <Kartu>
        <p className="mb-3 text-sm font-medium text-slate-700">{judul}</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {lap.saldoAwal !== null && <Angka label="Saldo awal" nilai={lap.saldoAwal} />}
          <Angka label="Total masuk" nilai={lap.totalMasuk} warna="text-masuk" />
          <Angka label="Total keluar" nilai={lap.totalKeluar} warna="text-keluar" />
          {lap.saldoAkhir !== null ? (
            <Angka label="Saldo akhir" nilai={lap.saldoAkhir} warna="text-navy" />
          ) : (
            <Angka label="Selisih" nilai={lap.selisih} warna={lap.selisih < 0 ? 'text-keluar' : 'text-navy'} />
          )}
          {perKas && (
            <>
              <Angka label="Pindah masuk" nilai={lap.pindahMasuk} warna="text-netral" />
              <Angka label="Pindah keluar" nilai={lap.pindahKeluar} warna="text-netral" />
            </>
          )}
        </div>
        {perKas && <p className="mt-2 text-xs text-slate-500">Pindah dana antar kas tidak dihitung sebagai pemasukan atau pengeluaran.</p>}
      </Kartu>

      <Kartu className="px-0 pb-0">
        <div className="px-4">
          <JudulBagian>Rincian transaksi</JudulBagian>
        </div>
        {lap.baris.length === 0 ? (
          <div className="px-4 pb-4">
            <Kosong>Tidak ada transaksi di laporan ini.</Kosong>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-navy-muda text-left text-xs text-navy">
                <tr>
                  <th className="px-3 py-2 font-semibold">No</th>
                  <th className="px-3 py-2 font-semibold">Tanggal</th>
                  <th className="px-3 py-2 font-semibold">Keterangan</th>
                  <th className="px-3 py-2 font-semibold">Kategori</th>
                  <th className="px-3 py-2 font-semibold">Kas</th>
                  <th className="px-3 py-2 text-right font-semibold">Masuk</th>
                  <th className="px-3 py-2 text-right font-semibold">Keluar</th>
                  <th className="px-3 py-2 text-right font-semibold">{proker ? 'Selisih berjalan' : 'Saldo berjalan'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lap.saldoAwal !== null && (
                  <tr className="text-slate-500">
                    <td className="px-3 py-2" />
                    <td className="px-3 py-2" colSpan={6}>
                      Saldo awal
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatRupiah(lap.saldoAwal)}</td>
                  </tr>
                )}
                {lap.baris.map((b) => (
                  <tr key={b.id} className="align-top">
                    <td className="px-3 py-2 text-slate-500">{b.no}</td>
                    <td className="whitespace-nowrap px-3 py-2">{formatTanggalPendek(b.tanggal)}</td>
                    <td className="px-3 py-2">{b.keterangan || '-'}</td>
                    <td className="px-3 py-2 text-slate-600">{b.kategori}</td>
                    <td className="px-3 py-2 text-slate-600">{b.kas}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-masuk">{b.masuk ? formatRupiah(b.masuk) : ''}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-keluar">{b.keluar ? formatRupiah(b.keluar) : ''}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-right font-medium tabular-nums">{formatRupiah(b.saldo)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Kartu>

      <div className="grid gap-4 md:grid-cols-2">
        <Rekap judul="Rekap pemasukan per kategori" isi={lap.rekapMasuk} warna="text-masuk" />
        <Rekap judul="Rekap pengeluaran per kategori" isi={lap.rekapKeluar} warna="text-keluar" />
      </div>
    </>
  )
}

function Rekap({ judul, isi, warna }: { judul: string; isi: RekapKategori[]; warna: string }) {
  const total = isi.reduce((s, r) => s + r.total, 0)
  return (
    <Kartu>
      <JudulBagian>{judul}</JudulBagian>
      {isi.length === 0 ? (
        <p className="text-sm text-slate-500">Tidak ada.</p>
      ) : (
        <ul className="divide-y divide-slate-100 text-sm">
          {isi.map((r) => (
            <li key={r.nama} className="flex justify-between gap-2 py-1.5">
              <span className="text-slate-700">{r.nama}</span>
              <span className={`font-medium tabular-nums ${warna}`}>{formatRupiah(r.total)}</span>
            </li>
          ))}
          <li className="flex justify-between gap-2 py-1.5 font-semibold">
            <span>Total</span>
            <span className="tabular-nums">{formatRupiah(total)}</span>
          </li>
        </ul>
      )}
    </Kartu>
  )
}

type Format = 'xlsx' | 'pdf'

function Ekspor({ lap, info, admin }: { lap: DataLaporan; info: Omit<InfoLaporan, 'dibuat'>; admin: boolean }) {
  const [proses, setProses] = useState<Format | null>(null)
  const [status, setStatus] = useState('')
  const [galat, setGalat] = useState<string | null>(null)
  const [denganFoto, setDenganFoto] = useState(false)

  async function unduh(format: Format) {
    setProses(format)
    setGalat(null)
    setStatus('')
    try {
      const lengkap: InfoLaporan = { ...info, dibuat: hariIniJakarta() }
      const dok = susunDokumen(lap, lengkap)
      let blob: Blob
      if (format === 'xlsx') {
        const { buatExcel } = await import('../lib/eksporExcel')
        blob = await buatExcel(dok)
      } else {
        const { buatPdf } = await import('../lib/eksporPdf')
        const lampiran = admin && denganFoto ? await siapkanLampiran(lap, setStatus) : []
        setStatus(lampiran.length > 0 ? `Menyusun PDF dengan ${lampiran.length} foto...` : '')
        blob = await buatPdf(dok, lampiran)
      }
      unduhBlob(blob, namaBerkas(lengkap.judul, lengkap.dibuat, format))
      setStatus('Berkas sudah diunduh.')
    } catch (e) {
      setStatus('')
      setGalat(`Gagal membuat berkas. ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setProses(null)
    }
  }

  const tombol =
    'flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold disabled:opacity-60 sm:flex-none'
  return (
    <Kartu className="space-y-2">
      <div className="flex gap-2">
        <button type="button" onClick={() => unduh('xlsx')} disabled={proses !== null} className={`${tombol} bg-navy text-white hover:bg-navy/90`}>
          {proses === 'xlsx' ? 'Menyiapkan...' : 'Unduh Excel'}
        </button>
        <button type="button" onClick={() => unduh('pdf')} disabled={proses !== null} className={`${tombol} bg-primer text-white hover:bg-primer-gelap`}>
          {proses === 'pdf' ? 'Menyiapkan...' : 'Unduh PDF'}
        </button>
      </div>
      {admin && (
        <label className="flex items-start gap-2 text-sm text-slate-700">
          <input type="checkbox" className="mt-0.5 size-4 accent-primer" checked={denganFoto} onChange={(e) => setDenganFoto(e.target.checked)} />
          <span>
            Sertakan foto bukti di PDF sebagai lampiran (untuk LPJ). Maksimal {MAKS_LAMPIRAN_PDF} foto.
          </span>
        </label>
      )}
      {!admin && <p className="text-xs text-slate-500">Berkas berisi kop, rincian transaksi, ringkasan, dan rekap per kategori. Tanpa foto bukti.</p>}
      {status && <p className="text-xs text-slate-600" role="status">{status}</p>}
      {galat && <Galat pesan={galat} />}
    </Kartu>
  )
}

/** Unduh foto bukti transaksi di laporan, urut seperti tabel. Foto yang gagal dimuat dilewati dan disebut di keterangan. */
async function siapkanLampiran(lap: DataLaporan, lapor: (s: string) => void) {
  lapor('Mengambil daftar foto bukti...')
  const bukti = await ambilBuktiLaporan(lap.baris.map((b) => b.id))
  const perId = new Map(lap.baris.map((b) => [b.id, b]))
  const hasil: { keterangan: string; data: string; lebar: number; tinggi: number }[] = []
  let gagal = 0
  for (const [i, f] of bukti.entries()) {
    lapor(`Mengunduh foto ${i + 1} dari ${bukti.length}...`)
    const b = perId.get(f.transaksi_id)
    try {
      const g = await muatGambar(f.url)
      const nominal = b ? formatRupiah(b.masuk || b.keluar) : ''
      const teks = b ? `Transaksi no. ${b.no}, ${formatTanggal(b.tanggal)}, ${b.keterangan.trim() || b.kategori}, ${nominal}. Foto ${f.urutan + 1}.` : ''
      hasil.push({ keterangan: teks, ...g })
    } catch {
      gagal += 1
    }
  }
  if (gagal > 0) lapor(`${gagal} foto gagal diunduh dan tidak dilampirkan.`)
  return hasil
}
