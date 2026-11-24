import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { Bidang, Galat, Kartu, Memuat, PilihanSegmen, kelasInput } from '../../components/ui'
import {
  ambilReferensiAdmin,
  ambilTransaksiAdmin,
  hapusBukti,
  hapusTransaksi,
  simpanTransaksi,
  unggahBukti,
  urlBukti,
  type BuktiFoto,
  type ReferensiAdmin,
  type TransaksiAdmin,
} from '../../lib/adminApi'
import { formatInputAngka, formatRupiah, hariIniJakarta, parseAngka } from '../../lib/format'
import { KETERANGAN_MAKS, MAKS_BUKTI, rapikan, validasi, type GalatForm, type IsianTransaksi } from '../../lib/formTransaksi'
import { NAMA_BUKU, type Buku, type JenisTransaksi } from '../../lib/types'
import { useMuat } from '../../lib/useMuat'

interface Data {
  ref: ReferensiAdmin
  trx: TransaksiAdmin | null
}

export default function FormTransaksi() {
  const { id } = useParams()
  const muatan = useMuat<Data>(async () => {
    const [ref, trx] = await Promise.all([ambilReferensiAdmin(), id ? ambilTransaksiAdmin(id) : Promise.resolve(null)])
    return { ref, trx }
  }, [id])

  if (muatan.memuat) return <Memuat baris={6} />
  if (muatan.galat || !muatan.data) return <Galat pesan={muatan.galat ?? 'Tidak ada data'} ulangi={muatan.ulangi} />
  if (id && !muatan.data.trx) {
    return (
      <Kartu>
        <p className="text-sm text-slate-700">Transaksi tidak ditemukan. Mungkin sudah dihapus.</p>
        <Link to="/admin" className="mt-2 inline-block text-sm font-medium text-primer hover:underline">
          Kembali ke daftar
        </Link>
      </Kartu>
    )
  }
  // key memaksa form dibuat ulang saat pindah dari "baru" ke "ubah"
  return <IsiForm key={id ?? 'baru'} ref_={muatan.data.ref} awal={muatan.data.trx} />
}

function isianAwal(ref: ReferensiAdmin, trx: TransaksiAdmin | null): IsianTransaksi {
  if (trx) {
    const buku = ref.kas.find((k) => k.id === trx.kas_id)?.buku ?? 'kas'
    return {
      buku,
      jenis: trx.jenis,
      tanggal: trx.tanggal,
      jumlah: trx.jumlah,
      kasId: trx.kas_id,
      kasTujuanId: trx.kas_tujuan_id ?? '',
      kategoriId: trx.kategori_id ?? '',
      prokerId: trx.proker_id ?? '',
      keterangan: trx.keterangan,
    }
  }
  return {
    buku: 'kas',
    jenis: 'keluar',
    tanggal: hariIniJakarta(),
    jumlah: 0,
    kasId: '',
    kasTujuanId: '',
    kategoriId: '',
    prokerId: '',
    keterangan: '',
  }
}

interface FotoBaru {
  kunci: string
  file: File
  pratinjau: string
}

function IsiForm({ ref_: ref, awal }: { ref_: ReferensiAdmin; awal: TransaksiAdmin | null }) {
  const navigasi = useNavigate()
  const lokasi = useLocation()
  const ubah = awal !== null
  const [isi, setIsi] = useState<IsianTransaksi>(() => isianAwal(ref, awal))
  const [teksJumlah, setTeksJumlah] = useState(awal ? formatInputAngka(String(awal.jumlah)) : '')
  const [galat, setGalat] = useState<GalatForm>({})
  const [pesan, setPesan] = useState<string | null>(() => (lokasi.state as { pesan?: string } | null)?.pesan ?? null)
  const [proses, setProses] = useState<string | null>(null)
  const [bukti, setBukti] = useState<BuktiFoto[]>(awal?.bukti ?? [])
  const [fotoBaru, setFotoBaru] = useState<FotoBaru[]>([])
  const [konfirmasiHapus, setKonfirmasiHapus] = useState(false)
  const [terkirim, setTerkirim] = useState(false)
  const hariIni = hariIniJakarta()

  useEffect(() => () => fotoBaru.forEach((f) => URL.revokeObjectURL(f.pratinjau)), [fotoBaru])

  // Pilihan aktif, ditambah pilihan lama yang sedang dipakai transaksi ini (meski sudah diarsipkan).
  const kasPilihan = useMemo(
    () => ref.kas.filter((k) => k.buku === isi.buku && (k.aktif || k.id === awal?.kas_id || k.id === awal?.kas_tujuan_id)),
    [ref, isi.buku, awal],
  )
  const kategoriPilihan = useMemo(
    () => ref.kategori.filter((k) => k.buku === isi.buku && k.berlaku === isi.jenis && (k.aktif || k.id === awal?.kategori_id)),
    [ref, isi.buku, isi.jenis, awal],
  )
  const prokerPilihan = useMemo(
    () => ref.proker.filter((p) => p.buku === isi.buku && (p.status === 'aktif' || p.id === awal?.proker_id)),
    [ref, isi.buku, awal],
  )

  const atur = (perubahan: Partial<IsianTransaksi>) => {
    setIsi((lama) => {
      const baru = { ...lama, ...perubahan }
      return perubahan.buku || perubahan.jenis || perubahan.kasId !== undefined ? rapikan(baru, ref) : baru
    })
    if (terkirim) setGalat({})
  }

  const totalFoto = bukti.length + fotoBaru.length

  const pilihFoto = (daftar: FileList | null) => {
    if (!daftar) return
    const sisa = MAKS_BUKTI - totalFoto
    const file = Array.from(daftar).filter((f) => f.type.startsWith('image/'))
    if (file.length > sisa) setPesan(`Maksimal ${MAKS_BUKTI} foto per transaksi. Sebagian foto tidak ditambahkan.`)
    setFotoBaru((l) => [
      ...l,
      ...file.slice(0, Math.max(0, sisa)).map((f) => ({ kunci: crypto.randomUUID(), file: f, pratinjau: URL.createObjectURL(f) })),
    ])
  }

  const kirim = async (e: FormEvent) => {
    e.preventDefault()
    setTerkirim(true)
    setPesan(null)
    const data = { ...isi, jumlah: parseAngka(teksJumlah) }
    const g = validasi(data, ref, hariIni)
    setGalat(g)
    if (Object.keys(g).length > 0) {
      setPesan('Periksa lagi isian yang ditandai merah.')
      return
    }
    setProses('Menyimpan transaksi...')
    let idTrx: string
    try {
      idTrx = await simpanTransaksi(data, awal?.id)
    } catch (err) {
      setPesan(err instanceof Error ? err.message : String(err))
      setProses(null)
      return
    }

    // Unggah foto satu per satu setelah transaksi tersimpan.
    let urutan = bukti.reduce((m, b) => Math.max(m, b.urutan + 1), 0)
    const gagal: FotoBaru[] = []
    for (const [i, f] of fotoBaru.entries()) {
      setProses(`Mengunggah foto ${i + 1} dari ${fotoBaru.length}...`)
      try {
        const b = await unggahBukti(idTrx, data.tanggal, f.file, urutan)
        urutan += 1
        setBukti((l) => [...l, b])
      } catch (err) {
        gagal.push(f)
        setPesan(`Transaksi tersimpan, tapi foto gagal diunggah: ${err instanceof Error ? err.message : String(err)}`)
      }
    }
    setProses(null)
    if (gagal.length > 0) {
      setFotoBaru(gagal)
      if (!ubah) navigasi(`/admin/transaksi/${idTrx}`, { replace: true, state: { pesan: 'Transaksi tersimpan. Ada foto yang gagal diunggah, coba lagi di sini.' } })
      return
    }
    setFotoBaru([])
    navigasi('/admin', { replace: true })
  }

  const buangBukti = async (b: BuktiFoto) => {
    setProses('Menghapus foto...')
    setPesan(null)
    try {
      await hapusBukti(b)
      setBukti((l) => l.filter((x) => x.id !== b.id))
    } catch (err) {
      setPesan(err instanceof Error ? err.message : String(err))
    } finally {
      setProses(null)
    }
  }

  const hapus = async () => {
    if (!awal) return
    setProses('Menghapus transaksi...')
    try {
      await hapusTransaksi(awal.id)
      navigasi('/admin', { replace: true })
    } catch (err) {
      setPesan(err instanceof Error ? err.message : String(err))
      setProses(null)
      setKonfirmasiHapus(false)
    }
  }

  const labelKas = isi.jenis === 'masuk' ? 'Masuk ke kas' : isi.jenis === 'keluar' ? 'Keluar dari kas' : 'Dari kas'

  return (
    <form onSubmit={kirim} className="space-y-4" noValidate>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-lg font-bold text-navy">{ubah ? 'Ubah transaksi' : 'Catat transaksi'}</h1>
        <Link to="/admin" className="text-sm font-medium text-slate-600 hover:text-navy">
          Batal
        </Link>
      </div>

      <Kartu className="space-y-4">
        <div>
          <p className="mb-1 text-xs font-medium text-slate-600">Buku</p>
          <PilihanSegmen<Buku>
            label="Buku"
            nilai={isi.buku}
            onPilih={(buku) => atur({ buku })}
            opsi={[
              { nilai: 'kas', label: NAMA_BUKU.kas },
              { nilai: 'dipa', label: NAMA_BUKU.dipa },
            ]}
          />
        </div>
        <div>
          <p className="mb-1 text-xs font-medium text-slate-600">Jenis</p>
          <PilihanSegmen<JenisTransaksi>
            label="Jenis transaksi"
            nilai={isi.jenis}
            onPilih={(jenis) => atur({ jenis })}
            opsi={[
              { nilai: 'masuk', label: 'Masuk' },
              { nilai: 'keluar', label: 'Keluar' },
              { nilai: 'pindah', label: 'Pindah' },
            ]}
          />
          {isi.jenis === 'pindah' && (
            <p className="mt-1 text-xs text-slate-500">Pindah dana antar kas di buku yang sama, misalnya setor tunai ke rekening. Tidak dihitung sebagai pemasukan atau pengeluaran.</p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Bidang label="Tanggal">
            <input type="date" value={isi.tanggal} max={hariIni} onChange={(e) => atur({ tanggal: e.target.value })} className={kelasInput} />
            <PesanBidang teks={galat.tanggal} />
          </Bidang>
          <Bidang label="Jumlah (Rp)">
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-slate-500">Rp</span>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder="0"
                value={teksJumlah}
                onChange={(e) => setTeksJumlah(formatInputAngka(e.target.value))}
                className={`${kelasInput} pl-9 text-right tabular-nums`}
              />
            </div>
            <PesanBidang teks={galat.jumlah} />
          </Bidang>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Bidang label={labelKas}>
            <select value={isi.kasId} onChange={(e) => atur({ kasId: e.target.value })} className={kelasInput}>
              <option value="">Pilih kas</option>
              {kasPilihan.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.nama}
                  {k.aktif ? '' : ' (diarsipkan)'}
                </option>
              ))}
            </select>
            <PesanBidang teks={galat.kasId} />
          </Bidang>
          {isi.jenis === 'pindah' ? (
            <Bidang label="Ke kas">
              <select value={isi.kasTujuanId} onChange={(e) => atur({ kasTujuanId: e.target.value })} className={kelasInput}>
                <option value="">Pilih kas tujuan</option>
                {kasPilihan
                  .filter((k) => k.id !== isi.kasId)
                  .map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.nama}
                      {k.aktif ? '' : ' (diarsipkan)'}
                    </option>
                  ))}
              </select>
              <PesanBidang teks={galat.kasTujuanId} />
            </Bidang>
          ) : (
            <Bidang label="Kategori">
              <select value={isi.kategoriId} onChange={(e) => atur({ kategoriId: e.target.value })} className={kelasInput}>
                <option value="">Pilih kategori</option>
                {kategoriPilihan.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.nama}
                    {k.aktif ? '' : ' (diarsipkan)'}
                  </option>
                ))}
              </select>
              <PesanBidang teks={galat.kategoriId} />
            </Bidang>
          )}
        </div>

        <Bidang label="Proker (opsional)">
          <select value={isi.prokerId} onChange={(e) => atur({ prokerId: e.target.value })} className={kelasInput}>
            <option value="">Bukan untuk proker tertentu</option>
            {prokerPilihan.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nama}
                {p.status === 'arsip' ? ' (diarsipkan)' : ''}
              </option>
            ))}
          </select>
          <PesanBidang teks={galat.prokerId} />
        </Bidang>

        <Bidang label="Keterangan (tampil di halaman publik)">
          <textarea
            rows={2}
            maxLength={KETERANGAN_MAKS}
            value={isi.keterangan}
            onChange={(e) => atur({ keterangan: e.target.value })}
            placeholder="Contoh: Iuran anggota angkatan 2025"
            className={kelasInput}
          />
          <PesanBidang teks={galat.keterangan} />
        </Bidang>
      </Kartu>

      <Kartu>
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-navy">Foto bukti</h2>
          <span className="text-xs text-slate-500">
            {totalFoto} dari {MAKS_BUKTI}
          </span>
        </div>
        <p className="mb-3 text-xs text-slate-500">Nota, kuitansi, atau bukti transfer. Foto dikecilkan otomatis dan hanya bisa dilihat bendahara.</p>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {bukti.map((b) => (
            <FotoTersimpan key={b.id} b={b} onHapus={() => buangBukti(b)} nonaktif={proses !== null} />
          ))}
          {fotoBaru.map((f) => (
            <div key={f.kunci} className="relative aspect-square overflow-hidden rounded-lg bg-slate-100 ring-1 ring-amber-300">
              <img src={f.pratinjau} alt="Foto baru, belum diunggah" className="h-full w-full object-cover" />
              <span className="absolute left-1 top-1 rounded bg-amber-100 px-1 text-[10px] font-medium text-amber-900">Baru</span>
              <button
                type="button"
                onClick={() => setFotoBaru((l) => l.filter((x) => x.kunci !== f.kunci))}
                className="absolute right-1 top-1 rounded bg-white/90 px-1.5 text-xs font-medium text-red-700 shadow"
                aria-label="Batalkan foto ini"
              >
                Hapus
              </button>
            </div>
          ))}
          {totalFoto < MAKS_BUKTI && (
            <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-slate-300 text-center text-xs font-medium text-slate-500 hover:border-navy hover:text-navy">
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
                <path d="M12 5v14M5 12h14" strokeLinecap="round" />
              </svg>
              Tambah foto
              <input
                type="file"
                accept="image/*"
                multiple
                className="sr-only"
                onChange={(e) => {
                  pilihFoto(e.target.files)
                  e.target.value = ''
                }}
              />
            </label>
          )}
        </div>
      </Kartu>

      {pesan && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {pesan}
        </p>
      )}

      <div className="sticky bottom-20 z-10 flex gap-2 md:bottom-4">
        <button
          type="submit"
          disabled={proses !== null}
          className="flex-1 rounded-lg bg-primer px-4 py-3 text-sm font-semibold text-white shadow-lg hover:bg-primer-gelap disabled:opacity-60"
        >
          {proses ?? (ubah ? 'Simpan perubahan' : `Simpan${parseAngka(teksJumlah) > 0 ? ` ${formatRupiah(parseAngka(teksJumlah))}` : ''}`)}
        </button>
      </div>

      {ubah && (
        <Kartu>
          <h2 className="text-sm font-semibold text-red-800">Hapus transaksi</h2>
          <p className="mt-1 text-xs text-slate-600">Transaksi dan semua foto buktinya akan dihapus permanen. Saldo dan laporan ikut berubah.</p>
          {konfirmasiHapus ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={hapus} disabled={proses !== null} className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                Ya, hapus permanen
              </button>
              <button type="button" onClick={() => setKonfirmasiHapus(false)} className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700">
                Batal
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => setKonfirmasiHapus(true)} className="mt-3 rounded-lg px-4 py-2 text-sm font-medium text-red-700 ring-1 ring-red-200 hover:bg-red-50">
              Hapus transaksi ini
            </button>
          )}
        </Kartu>
      )}
    </form>
  )
}

function PesanBidang({ teks }: { teks?: string }) {
  if (!teks) return null
  return <span className="mt-1 block text-xs text-red-700">{teks}</span>
}

/** Foto dari bucket private, ditampilkan lewat signed URL berumur pendek. */
function FotoTersimpan({ b, onHapus, nonaktif }: { b: BuktiFoto; onHapus: () => void; nonaktif: boolean }) {
  const [url, setUrl] = useState<string | null>(null)
  const [gagal, setGagal] = useState(false)
  const [yakin, setYakin] = useState(false)
  const dibuka = useRef(false)

  useEffect(() => {
    let batal = false
    urlBukti(b.storage_path).then(
      (u) => !batal && setUrl(u),
      () => !batal && setGagal(true),
    )
    return () => {
      batal = true
    }
  }, [b.storage_path])

  // Signed URL cepat kedaluwarsa, jadi minta yang baru setiap kali foto dibuka.
  const buka = async () => {
    if (dibuka.current) return
    dibuka.current = true
    const jendela = window.open('', '_blank')
    try {
      const u = await urlBukti(b.storage_path)
      if (jendela) jendela.location.href = u
    } catch {
      jendela?.close()
    } finally {
      dibuka.current = false
    }
  }

  return (
    <div className="relative aspect-square overflow-hidden rounded-lg bg-slate-100 ring-1 ring-slate-200">
      {url && !gagal ? (
        <button type="button" onClick={buka} className="h-full w-full" aria-label="Buka foto bukti">
          <img src={url} alt="Foto bukti" className="h-full w-full object-cover" onError={() => setGagal(true)} />
        </button>
      ) : (
        <span className="flex h-full items-center justify-center p-1 text-center text-[11px] text-slate-500">{gagal ? 'Foto gagal dimuat' : 'Memuat...'}</span>
      )}
      {yakin ? (
        <div className="absolute inset-x-1 bottom-1 flex gap-1">
          <button type="button" disabled={nonaktif} onClick={onHapus} className="flex-1 rounded bg-red-700 py-0.5 text-[11px] font-medium text-white">
            Hapus
          </button>
          <button type="button" onClick={() => setYakin(false)} className="flex-1 rounded bg-white py-0.5 text-[11px] font-medium text-slate-700">
            Batal
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setYakin(true)}
          className="absolute right-1 top-1 rounded bg-white/90 px-1.5 text-xs font-medium text-red-700 shadow"
          aria-label="Hapus foto bukti"
        >
          Hapus
        </button>
      )}
    </div>
  )
}
