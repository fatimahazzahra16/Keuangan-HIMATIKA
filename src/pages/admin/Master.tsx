import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Bidang, Galat, Kartu, Kosong, Memuat, PilihanSegmen, kelasInput } from '../../components/ui'
import {
  ambilMasterData,
  aturArsip,
  hapusMaster,
  simpanMaster,
  type KasMaster,
  type KategoriMaster,
  type MasterData,
  type ProkerMaster,
  type TabelMaster,
} from '../../lib/adminApi'
import { formatInputAngka, formatRupiah, formatTanggalPendek, hariIniJakarta, parseAngka } from '../../lib/format'
import {
  NAMA_MAKS,
  adaGalat,
  barisKas,
  barisKategori,
  barisProker,
  validasiKas,
  validasiKategori,
  validasiProker,
  type Galat as GalatIsian,
  type IsianKas,
  type IsianKategori,
  type IsianProker,
  type JenisKas,
} from '../../lib/masterData'
import { NAMA_BUKU, type ArahKategori, type Buku } from '../../lib/types'

type Sunting = { tabel: TabelMaster; id?: string } | null
type Pesan = { jenis: 'sukses' | 'galat'; teks: string } | null

const NAMA_TABEL: Record<TabelMaster, string> = { kas: 'kas', kategori: 'kategori', proker: 'proker' }

export default function MasterDataAdmin() {
  const [data, setData] = useState<MasterData>()
  const [galatMuat, setGalatMuat] = useState<string | null>(null)
  const [buku, setBuku] = useState<Buku>('kas')
  const [tab, setTab] = useState<TabelMaster>('kas')
  const [lihatArsip, setLihatArsip] = useState(false)
  const [sunting, setSunting] = useState<Sunting>(null)
  const [konfirmasiHapus, setKonfirmasiHapus] = useState<string | null>(null)
  const [proses, setProses] = useState<string | null>(null)
  const [pesan, setPesan] = useState<Pesan>(null)
  const atasRef = useRef<HTMLDivElement>(null)

  const muat = async () => {
    try {
      setData(await ambilMasterData())
      setGalatMuat(null)
    } catch (e) {
      setGalatMuat(e instanceof Error ? e.message : String(e))
    }
  }

  useEffect(() => {
    void muat()
  }, [])

  // Ganti buku/tab menutup form dan konfirmasi yang terbuka.
  const pilihBuku = (b: Buku) => {
    setBuku(b)
    setSunting(null)
    setKonfirmasiHapus(null)
  }
  const pilihTab = (t: TabelMaster) => {
    setTab(t)
    setSunting(null)
    setKonfirmasiHapus(null)
  }

  const mulaiSunting = (s: Sunting) => {
    setSunting(s)
    setKonfirmasiHapus(null)
    setPesan(null)
    atasRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const jalankan = async (label: string, kerja: () => Promise<void>, sukses: string): Promise<boolean> => {
    setProses(label)
    setPesan(null)
    try {
      await kerja()
      await muat()
      setPesan({ jenis: 'sukses', teks: sukses })
      return true
    } catch (e) {
      setPesan({ jenis: 'galat', teks: e instanceof Error ? e.message : String(e) })
      return false
    } finally {
      setProses(null)
      setKonfirmasiHapus(null)
    }
  }

  const simpan = async (baris: Record<string, unknown>, nama: string) => {
    if (!sunting) return
    const { tabel, id } = sunting
    const ok = await jalankan(
      'Menyimpan...',
      () => simpanMaster(tabel, baris, id),
      id ? `Perubahan ${NAMA_TABEL[tabel]} "${nama}" tersimpan.` : `${kapital(NAMA_TABEL[tabel])} "${nama}" ditambahkan.`,
    )
    if (ok) setSunting(null)
  }

  const arsip = (tabel: TabelMaster, id: string, nama: string, jadiArsip: boolean) =>
    jalankan(
      jadiArsip ? 'Mengarsipkan...' : 'Mengaktifkan...',
      () => aturArsip(tabel, id, jadiArsip),
      jadiArsip
        ? `"${nama}" diarsipkan. Tidak muncul lagi di pilihan transaksi baru, tapi riwayat dan saldonya tetap ada.`
        : `"${nama}" aktif lagi.`,
    )

  const hapus = (tabel: TabelMaster, id: string, nama: string) =>
    jalankan('Menghapus...', () => hapusMaster(tabel, id), `"${nama}" dihapus.`)

  if (galatMuat && !data) return <Galat pesan={galatMuat} ulangi={() => void muat()} />
  if (!data) return <Memuat baris={5} />

  const kas = data.kas.filter((k) => k.buku === buku)
  const kategori = data.kategori.filter((k) => k.buku === buku)
  const proker = data.proker.filter((p) => p.buku === buku)

  const aksiBaris = (tabel: TabelMaster, id: string, nama: string, diarsip: boolean) => (
    <AksiBaris
      sibuk={proses !== null}
      diarsip={diarsip}
      konfirmasi={konfirmasiHapus === id}
      onUbah={() => mulaiSunting({ tabel, id })}
      onArsip={() => void arsip(tabel, id, nama, !diarsip)}
      onMintaHapus={() => setKonfirmasiHapus(id)}
      onBatalHapus={() => setKonfirmasiHapus(null)}
      onHapus={() => void hapus(tabel, id, nama)}
    />
  )

  return (
    <div className="space-y-4" ref={atasRef}>
      <div>
        <h1 className="text-lg font-bold text-navy">Master data</h1>
        <p className="mt-0.5 text-sm text-slate-600">Atur kas, kategori, dan proker yang muncul di form transaksi.</p>
      </div>

      <PilihanSegmen<Buku>
        label="Buku"
        nilai={buku}
        onPilih={pilihBuku}
        opsi={[
          { nilai: 'kas', label: NAMA_BUKU.kas },
          { nilai: 'dipa', label: NAMA_BUKU.dipa },
        ]}
      />
      <PilihanSegmen<TabelMaster>
        label="Jenis data"
        nilai={tab}
        onPilih={pilihTab}
        opsi={[
          { nilai: 'kas', label: 'Kas' },
          { nilai: 'kategori', label: 'Kategori' },
          { nilai: 'proker', label: 'Proker' },
        ]}
      />

      {pesan && (
        <p
          role={pesan.jenis === 'galat' ? 'alert' : 'status'}
          className={`rounded-lg border px-3 py-2 text-sm ${
            pesan.jenis === 'galat' ? 'border-red-200 bg-red-50 text-red-800' : 'border-green-200 bg-green-50 text-green-800'
          }`}
        >
          {pesan.teks}
        </p>
      )}

      {sunting?.tabel === 'kas' && (
        <FormKas
          key={sunting.id ?? 'baru'}
          buku={buku}
          awal={data.kas.find((k) => k.id === sunting.id)}
          ada={data.kas}
          proses={proses}
          onSimpan={simpan}
          onBatal={() => setSunting(null)}
        />
      )}
      {sunting?.tabel === 'kategori' && (
        <FormKategori
          key={sunting.id ?? 'baru'}
          buku={buku}
          awal={data.kategori.find((k) => k.id === sunting.id)}
          ada={data.kategori}
          proses={proses}
          onSimpan={simpan}
          onBatal={() => setSunting(null)}
        />
      )}
      {sunting?.tabel === 'proker' && (
        <FormProker
          key={sunting.id ?? 'baru'}
          buku={buku}
          awal={data.proker.find((p) => p.id === sunting.id)}
          ada={data.proker}
          proses={proses}
          onSimpan={simpan}
          onBatal={() => setSunting(null)}
        />
      )}

      {tab === 'kas' && (
        <DaftarMaster
          judul={`Kas di ${NAMA_BUKU[buku]}`}
          tombolTambah="Tambah kas"
          onTambah={() => mulaiSunting({ tabel: 'kas' })}
          sibuk={proses !== null}
          baris={kas}
          diarsip={(k) => !k.aktif}
          lihatArsip={lihatArsip}
          onLihatArsip={setLihatArsip}
          kosong="Belum ada kas di buku ini."
          render={(k) => (
            <BarisMaster
              key={k.id}
              nama={k.nama}
              diarsip={!k.aktif}
              keterangan={`${k.jenis === 'tunai' ? 'Tunai' : 'Rekening'} · saldo awal ${formatRupiah(k.saldo_awal)}`}
              kanan={<span className="whitespace-nowrap text-sm font-semibold tabular-nums text-navy">{formatRupiah(k.saldo)}</span>}
              aksi={aksiBaris('kas', k.id, k.nama, !k.aktif)}
            />
          )}
        />
      )}

      {tab === 'kategori' &&
        (['masuk', 'keluar'] as ArahKategori[]).map((arah) => (
          <DaftarMaster
            key={arah}
            judul={`Kategori ${arah === 'masuk' ? 'pemasukan' : 'pengeluaran'}`}
            tombolTambah={arah === 'masuk' ? 'Tambah kategori' : undefined}
            onTambah={() => mulaiSunting({ tabel: 'kategori' })}
            sibuk={proses !== null}
            baris={kategori.filter((k) => k.berlaku === arah)}
            diarsip={(k) => !k.aktif}
            lihatArsip={lihatArsip}
            onLihatArsip={setLihatArsip}
            kosong={`Belum ada kategori ${arah}.`}
            render={(k) => (
              <BarisMaster key={k.id} nama={k.nama} diarsip={!k.aktif} aksi={aksiBaris('kategori', k.id, k.nama, !k.aktif)} />
            )}
          />
        ))}

      {tab === 'proker' && (
        <DaftarMaster
          judul={`Proker di ${NAMA_BUKU[buku]}`}
          tombolTambah="Tambah proker"
          onTambah={() => mulaiSunting({ tabel: 'proker' })}
          sibuk={proses !== null}
          baris={proker}
          diarsip={(p) => p.status === 'arsip'}
          lihatArsip={lihatArsip}
          onLihatArsip={setLihatArsip}
          kosong="Belum ada proker. Tambahkan proker supaya pengeluaran bisa dikelompokkan per kegiatan."
          render={(p) => (
            <BarisMaster
              key={p.id}
              nama={p.nama}
              diarsip={p.status === 'arsip'}
              keterangan={rentangProker(p)}
              aksi={aksiBaris('proker', p.id, p.nama, p.status === 'arsip')}
            />
          )}
        />
      )}

      <p className="text-xs text-slate-500">
        Data yang sudah dipakai transaksi tidak bisa dihapus. Arsipkan saja: data hilang dari pilihan transaksi baru, tapi
        riwayat, saldo, dan laporan tetap utuh. Buku (Kas HIMA atau Dana Dipa) tidak bisa diganti setelah data dibuat.
      </p>
    </div>
  )
}

function kapital(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function rentangProker(p: ProkerMaster): string {
  const mulai = formatTanggalPendek(p.tanggal_mulai)
  return p.tanggal_selesai ? `${mulai} sampai ${formatTanggalPendek(p.tanggal_selesai)}` : `Mulai ${mulai}`
}

// ---------- Daftar dan baris ----------

function DaftarMaster<T extends { id: string }>({
  judul,
  tombolTambah,
  onTambah,
  sibuk,
  baris,
  diarsip,
  lihatArsip,
  onLihatArsip,
  kosong,
  render,
}: {
  judul: string
  tombolTambah?: string
  onTambah: () => void
  sibuk: boolean
  baris: T[]
  diarsip: (b: T) => boolean
  lihatArsip: boolean
  onLihatArsip: (v: boolean) => void
  kosong: string
  render: (b: T) => ReactNode
}) {
  const aktif = baris.filter((b) => !diarsip(b))
  const arsip = baris.filter(diarsip)
  return (
    <Kartu>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-navy">{judul}</h2>
        {tombolTambah && (
          <button
            type="button"
            onClick={onTambah}
            disabled={sibuk}
            className="shrink-0 rounded-lg bg-primer px-3 py-1.5 text-sm font-semibold text-white hover:bg-primer-gelap disabled:opacity-60"
          >
            {tombolTambah}
          </button>
        )}
      </div>
      {aktif.length === 0 ? <Kosong>{kosong}</Kosong> : <ul className="divide-y divide-slate-100">{aktif.map(render)}</ul>}
      {arsip.length > 0 && (
        <div className="mt-2 border-t border-slate-100 pt-2">
          <button
            type="button"
            onClick={() => onLihatArsip(!lihatArsip)}
            aria-expanded={lihatArsip}
            className="text-xs font-medium text-slate-500 hover:text-navy"
          >
            {lihatArsip ? 'Sembunyikan' : 'Tampilkan'} yang diarsipkan ({arsip.length})
          </button>
          {lihatArsip && <ul className="mt-1 divide-y divide-slate-100">{arsip.map(render)}</ul>}
        </div>
      )}
    </Kartu>
  )
}

function BarisMaster({
  nama,
  keterangan,
  kanan,
  diarsip,
  aksi,
}: {
  nama: string
  keterangan?: string
  kanan?: ReactNode
  diarsip: boolean
  aksi: ReactNode
}) {
  return (
    <li className="py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={`truncate text-sm font-medium ${diarsip ? 'text-slate-500' : 'text-slate-900'}`}>
            {nama}
            {diarsip && <span className="ml-1.5 rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-500">Diarsipkan</span>}
          </p>
          {keterangan && <p className="mt-0.5 text-xs text-slate-500">{keterangan}</p>}
        </div>
        {kanan}
      </div>
      {aksi}
    </li>
  )
}

function AksiBaris({
  sibuk,
  diarsip,
  konfirmasi,
  onUbah,
  onArsip,
  onMintaHapus,
  onBatalHapus,
  onHapus,
}: {
  sibuk: boolean
  diarsip: boolean
  konfirmasi: boolean
  onUbah: () => void
  onArsip: () => void
  onMintaHapus: () => void
  onBatalHapus: () => void
  onHapus: () => void
}) {
  const tombol = 'rounded-md px-2.5 py-1 text-xs font-medium disabled:opacity-60'
  if (konfirmasi) {
    return (
      <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg bg-red-50 p-2">
        <span className="text-xs text-red-800">Hapus permanen?</span>
        <button type="button" disabled={sibuk} onClick={onHapus} className={`${tombol} bg-red-700 text-white`}>
          Ya, hapus
        </button>
        <button type="button" disabled={sibuk} onClick={onBatalHapus} className={`${tombol} bg-white text-slate-700 ring-1 ring-slate-200`}>
          Batal
        </button>
      </div>
    )
  }
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      <button type="button" disabled={sibuk} onClick={onUbah} className={`${tombol} bg-slate-100 text-navy hover:bg-slate-200`}>
        Ubah
      </button>
      <button type="button" disabled={sibuk} onClick={onArsip} className={`${tombol} bg-slate-100 text-slate-700 hover:bg-slate-200`}>
        {diarsip ? 'Aktifkan lagi' : 'Arsipkan'}
      </button>
      <button type="button" disabled={sibuk} onClick={onMintaHapus} className={`${tombol} text-red-700 ring-1 ring-red-200 hover:bg-red-50`}>
        Hapus
      </button>
    </div>
  )
}

// ---------- Form ----------

interface PropsForm<T> {
  buku: Buku
  awal: T | undefined
  ada: { id: string; buku: Buku; nama: string; berlaku?: ArahKategori }[]
  proses: string | null
  onSimpan: (baris: Record<string, unknown>, nama: string) => void
  onBatal: () => void
}

function KerangkaForm({
  judul,
  keterangan,
  proses,
  onSubmit,
  onBatal,
  children,
}: {
  judul: string
  keterangan?: string
  proses: string | null
  onSubmit: (e: FormEvent) => void
  onBatal: () => void
  children: ReactNode
}) {
  return (
    <Kartu className="ring-2 ring-navy/20">
      <form onSubmit={onSubmit} noValidate className="space-y-3">
        <div>
          <h2 className="text-base font-semibold text-navy">{judul}</h2>
          {keterangan && <p className="mt-0.5 text-xs text-slate-500">{keterangan}</p>}
        </div>
        {children}
        <div className="flex gap-2 pt-1">
          <button
            type="submit"
            disabled={proses !== null}
            className="flex-1 rounded-lg bg-primer px-4 py-2.5 text-sm font-semibold text-white hover:bg-primer-gelap disabled:opacity-60"
          >
            {proses ?? 'Simpan'}
          </button>
          <button type="button" onClick={onBatal} className="rounded-lg bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-700">
            Batal
          </button>
        </div>
      </form>
    </Kartu>
  )
}

function PesanBidang({ teks }: { teks?: string }) {
  if (!teks) return null
  return <span className="mt-1 block text-xs text-red-700">{teks}</span>
}

function InputNama({ nilai, onUbah, galat, contoh }: { nilai: string; onUbah: (v: string) => void; galat?: string; contoh: string }) {
  return (
    <Bidang label="Nama">
      <input
        type="text"
        value={nilai}
        maxLength={NAMA_MAKS}
        placeholder={contoh}
        onChange={(e) => onUbah(e.target.value)}
        className={kelasInput}
        autoFocus
      />
      <PesanBidang teks={galat} />
    </Bidang>
  )
}

function InputUrutan({ nilai, onUbah, galat }: { nilai: string; onUbah: (v: string) => void; galat?: string }) {
  return (
    <Bidang label="Urutan tampil (kecil di atas)">
      <input
        type="text"
        inputMode="numeric"
        value={nilai}
        onChange={(e) => onUbah(e.target.value.replace(/\D/g, '').slice(0, 3))}
        className={`${kelasInput} tabular-nums`}
      />
      <PesanBidang teks={galat} />
    </Bidang>
  )
}

function FormKas({ buku, awal, ada, proses, onSimpan, onBatal }: PropsForm<KasMaster>) {
  const [nama, setNama] = useState(awal?.nama ?? '')
  const [jenis, setJenis] = useState<JenisKas>(awal?.jenis ?? 'tunai')
  const [teksSaldo, setTeksSaldo] = useState(awal ? formatInputAngka(String(awal.saldo_awal)) : '')
  const [teksUrutan, setTeksUrutan] = useState(String(awal?.urutan ?? 0))
  const [galat, setGalat] = useState<GalatIsian<IsianKas>>({})
  const bukuForm = awal?.buku ?? buku

  const kirim = (e: FormEvent) => {
    e.preventDefault()
    const isi: IsianKas = { buku: bukuForm, nama, jenis, saldoAwal: parseAngka(teksSaldo), urutan: Number(teksUrutan || 0) }
    const g = validasiKas(isi, ada, awal?.id)
    setGalat(g)
    if (!adaGalat(g)) onSimpan(barisKas(isi, !awal), isi.nama.trim())
  }

  return (
    <KerangkaForm
      judul={awal ? `Ubah kas "${awal.nama}"` : `Tambah kas di ${NAMA_BUKU[bukuForm]}`}
      keterangan="Kas adalah tempat uang disimpan, misalnya uang tunai yang dipegang bendahara atau rekening bank."
      proses={proses}
      onSubmit={kirim}
      onBatal={onBatal}
    >
      <InputNama nilai={nama} onUbah={setNama} galat={galat.nama} contoh="Contoh: Rekening BSI" />
      <PilihanSegmen<JenisKas>
        label="Jenis kas"
        nilai={jenis}
        onPilih={setJenis}
        opsi={[
          { nilai: 'tunai', label: 'Tunai' },
          { nilai: 'rekening', label: 'Rekening' },
        ]}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <Bidang label="Saldo awal">
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-slate-500">Rp</span>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              placeholder="0"
              value={teksSaldo}
              onChange={(e) => setTeksSaldo(formatInputAngka(e.target.value))}
              className={`${kelasInput} pl-9 text-right tabular-nums`}
            />
          </div>
          <span className="mt-1 block text-xs text-slate-500">Isi uang yang sudah ada saat mulai mencatat di aplikasi ini.</span>
          <PesanBidang teks={galat.saldoAwal} />
        </Bidang>
        <InputUrutan nilai={teksUrutan} onUbah={setTeksUrutan} galat={galat.urutan} />
      </div>
      {awal && parseAngka(teksSaldo) !== awal.saldo_awal && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Mengubah saldo awal ikut mengubah saldo kas ini di semua halaman, termasuk laporan.
        </p>
      )}
    </KerangkaForm>
  )
}

function FormKategori({ buku, awal, ada, proses, onSimpan, onBatal }: PropsForm<KategoriMaster>) {
  const [nama, setNama] = useState(awal?.nama ?? '')
  const [berlaku, setBerlaku] = useState<ArahKategori>(awal?.berlaku ?? 'keluar')
  const [teksUrutan, setTeksUrutan] = useState(String(awal?.urutan ?? 0))
  const [galat, setGalat] = useState<GalatIsian<IsianKategori>>({})
  const bukuForm = awal?.buku ?? buku

  const kirim = (e: FormEvent) => {
    e.preventDefault()
    const isi: IsianKategori = { buku: bukuForm, nama, berlaku, urutan: Number(teksUrutan || 0) }
    const g = validasiKategori(isi, ada, awal?.id)
    setGalat(g)
    if (!adaGalat(g)) onSimpan(barisKategori(isi, !awal), isi.nama.trim())
  }

  return (
    <KerangkaForm
      judul={awal ? `Ubah kategori "${awal.nama}"` : `Tambah kategori di ${NAMA_BUKU[bukuForm]}`}
      keterangan={awal ? 'Kalau kategori sudah dipakai transaksi, jenisnya (pemasukan/pengeluaran) tidak bisa diganti.' : undefined}
      proses={proses}
      onSubmit={kirim}
      onBatal={onBatal}
    >
      <InputNama nilai={nama} onUbah={setNama} galat={galat.nama} contoh="Contoh: Konsumsi rapat" />
      <PilihanSegmen<ArahKategori>
        label="Berlaku untuk"
        nilai={berlaku}
        onPilih={setBerlaku}
        opsi={[
          { nilai: 'masuk', label: 'Pemasukan' },
          { nilai: 'keluar', label: 'Pengeluaran' },
        ]}
      />
      <InputUrutan nilai={teksUrutan} onUbah={setTeksUrutan} galat={galat.urutan} />
    </KerangkaForm>
  )
}

function FormProker({ buku, awal, ada, proses, onSimpan, onBatal }: PropsForm<ProkerMaster>) {
  const [nama, setNama] = useState(awal?.nama ?? '')
  const [mulai, setMulai] = useState(awal?.tanggal_mulai ?? hariIniJakarta())
  const [selesai, setSelesai] = useState(awal?.tanggal_selesai ?? '')
  const [galat, setGalat] = useState<GalatIsian<IsianProker>>({})
  const bukuForm = awal?.buku ?? buku

  const kirim = (e: FormEvent) => {
    e.preventDefault()
    const isi: IsianProker = { buku: bukuForm, nama, tanggalMulai: mulai, tanggalSelesai: selesai }
    const g = validasiProker(isi, ada, awal?.id)
    setGalat(g)
    if (!adaGalat(g)) onSimpan(barisProker(isi, !awal), isi.nama.trim())
  }

  return (
    <KerangkaForm
      judul={awal ? `Ubah proker "${awal.nama}"` : `Tambah proker di ${NAMA_BUKU[bukuForm]}`}
      keterangan="Proker (program kerja) dipakai untuk mengelompokkan transaksi per kegiatan di laporan."
      proses={proses}
      onSubmit={kirim}
      onBatal={onBatal}
    >
      <InputNama nilai={nama} onUbah={setNama} galat={galat.nama} contoh="Contoh: Seminar Matematika 2026" />
      <div className="grid grid-cols-2 gap-3">
        <Bidang label="Tanggal mulai">
          <input type="date" value={mulai} onChange={(e) => setMulai(e.target.value)} className={kelasInput} />
          <PesanBidang teks={galat.tanggalMulai} />
        </Bidang>
        <Bidang label="Tanggal selesai (boleh kosong)">
          <input type="date" value={selesai} min={mulai || undefined} onChange={(e) => setSelesai(e.target.value)} className={kelasInput} />
          <PesanBidang teks={galat.tanggalSelesai} />
        </Bidang>
      </div>
    </KerangkaForm>
  )
}
