import { formatRupiah, formatTanggal, formatTanggalPendek } from './format'
import type { Laporan, RekapKategori } from './laporan'

// Logika murni export laporan (Excel dan PDF): isi kop, tabel, ringkasan, nama berkas.
// Library exceljs/jspdf hanya dipakai di eksporExcel.ts dan eksporPdf.ts, dimuat saat tombol ditekan.

export const NAMA_ORGANISASI = 'HIMATIKA UIN Siber Syekh Nurjati Cirebon'
export const KEPALA_TABEL = ['No', 'Tanggal', 'Keterangan', 'Kategori', 'Kas', 'Masuk', 'Keluar'] as const

export interface InfoLaporan {
  /** Misal "Laporan Kas HIMA" atau "Laporan Proker Makrab". */
  judul: string
  /** Misal "1 November 2026 sampai 30 November 2026" atau rentang proker. */
  periode: string
  /** Laporan proker: kolom terakhir "Selisih berjalan", tanpa saldo awal/akhir. */
  proker: boolean
  /** Laporan satu kas: tampilkan pindah dana di ringkasan. */
  perKas: boolean
  /** Tanggal dibuat, YYYY-MM-DD (Asia/Jakarta). */
  dibuat: string
}

export interface BarisEkspor {
  no: number | null
  tanggal: string
  keterangan: string
  kategori: string
  kas: string
  masuk: number | null
  keluar: number | null
  saldo: number
}

export interface DokumenEkspor {
  info: InfoLaporan
  kepala: string[]
  baris: BarisEkspor[]
  ringkasan: { label: string; nilai: number }[]
  rekapMasuk: RekapKategori[]
  rekapKeluar: RekapKategori[]
  catatan: string[]
}

export function susunDokumen(lap: Laporan, info: InfoLaporan): DokumenEkspor {
  const baris: BarisEkspor[] = []
  if (lap.saldoAwal !== null) {
    baris.push({ no: null, tanggal: '', keterangan: 'Saldo awal', kategori: '', kas: '', masuk: null, keluar: null, saldo: lap.saldoAwal })
  }
  for (const b of lap.baris) {
    baris.push({
      no: b.no,
      tanggal: formatTanggalPendek(b.tanggal),
      keterangan: b.keterangan.trim() || '-',
      kategori: b.kategori,
      kas: b.kas,
      masuk: b.masuk || null,
      keluar: b.keluar || null,
      saldo: b.saldo,
    })
  }

  const ringkasan: { label: string; nilai: number }[] = []
  if (lap.saldoAwal !== null) ringkasan.push({ label: 'Saldo awal', nilai: lap.saldoAwal })
  ringkasan.push({ label: 'Total masuk', nilai: lap.totalMasuk })
  ringkasan.push({ label: 'Total keluar', nilai: lap.totalKeluar })
  if (info.perKas) {
    ringkasan.push({ label: 'Pindah dana masuk', nilai: lap.pindahMasuk })
    ringkasan.push({ label: 'Pindah dana keluar', nilai: lap.pindahKeluar })
  }
  if (lap.saldoAkhir !== null) ringkasan.push({ label: 'Saldo akhir', nilai: lap.saldoAkhir })
  else ringkasan.push({ label: 'Selisih', nilai: lap.selisih })

  const catatan: string[] = []
  if (info.perKas) catatan.push('Pindah dana antar kas tidak dihitung sebagai pemasukan atau pengeluaran.')
  catatan.push(`Dibuat ${formatTanggal(info.dibuat)}.`)

  return {
    info,
    kepala: [...KEPALA_TABEL, info.proker ? 'Selisih berjalan' : 'Saldo berjalan'],
    baris,
    ringkasan,
    rekapMasuk: lap.rekapMasuk,
    rekapKeluar: lap.rekapKeluar,
    catatan,
  }
}

/** Baris tabel dalam bentuk teks (untuk PDF). */
export function barisTeks(b: BarisEkspor): string[] {
  return [
    b.no === null ? '' : String(b.no),
    b.tanggal,
    b.keterangan,
    b.kategori,
    b.kas,
    b.masuk === null ? '' : formatRupiah(b.masuk),
    b.keluar === null ? '' : formatRupiah(b.keluar),
    formatRupiah(b.saldo),
  ]
}

/** "Laporan Kas HIMA" + "2026-11-24" -> "laporan-kas-hima-2026-11-24.xlsx" */
export function namaBerkas(judul: string, dibuat: string, ext: 'xlsx' | 'pdf'): string {
  const slug = judul
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/, '')
  return `${slug || 'laporan'}-${dibuat}.${ext}`
}

/** Unduh blob sebagai berkas lewat tautan sementara. */
export function unduhBlob(blob: Blob, nama: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nama
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

/** Ambil gambar (logo/foto) sebagai data URL beserta ukurannya. */
export async function muatGambar(url: string): Promise<{ data: string; lebar: number; tinggi: number }> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Gagal memuat gambar (${res.status}).`)
  const blob = await res.blob()
  const data = await new Promise<string>((ok, gagal) => {
    const r = new FileReader()
    r.onload = () => ok(String(r.result))
    r.onerror = () => gagal(new Error('Gagal membaca gambar.'))
    r.readAsDataURL(blob)
  })
  const ukuran = await new Promise<{ lebar: number; tinggi: number }>((ok, gagal) => {
    const img = new Image()
    img.onload = () => ok({ lebar: img.naturalWidth, tinggi: img.naturalHeight })
    img.onerror = () => gagal(new Error('Gambar tidak bisa dibaca.'))
    img.src = data
  })
  return { data, ...ukuran }
}

export const URL_LOGO = '/logo-himatika.png'
