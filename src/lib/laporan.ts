import { pengaruhKeKas } from './saldo'
import type { Kas, Transaksi } from './types'

export interface BarisLaporan {
  no: number
  id: string
  tanggal: string
  keterangan: string
  kategori: string
  kas: string
  masuk: number
  keluar: number
  /** Saldo berjalan. Untuk laporan proker: selisih berjalan (mulai dari 0). */
  saldo: number
}

export interface RekapKategori {
  nama: string
  total: number
}

export interface Laporan {
  /** null untuk laporan proker (tanpa saldo awal/akhir). */
  saldoAwal: number | null
  baris: BarisLaporan[]
  totalMasuk: number
  totalKeluar: number
  /** Hanya terisi di laporan per kas. Tidak termasuk pemasukan/pengeluaran. */
  pindahMasuk: number
  pindahKeluar: number
  selisih: number
  saldoAkhir: number | null
  rekapMasuk: RekapKategori[]
  rekapKeluar: RekapKategori[]
}

const TANPA_KATEGORI = 'Tanpa kategori'

function urutkan(transaksi: Transaksi[]): Transaksi[] {
  return [...transaksi].sort(
    (a, b) =>
      a.tanggal.localeCompare(b.tanggal) ||
      a.created_at.localeCompare(b.created_at) ||
      a.id.localeCompare(b.id),
  )
}

function rekap(transaksi: Transaksi[], jenis: 'masuk' | 'keluar'): RekapKategori[] {
  const peta = new Map<string, number>()
  for (const t of transaksi) {
    if (t.jenis !== jenis) continue
    const nama = t.kategori_nama ?? TANPA_KATEGORI
    peta.set(nama, (peta.get(nama) ?? 0) + t.jumlah)
  }
  return [...peta.entries()]
    .map(([nama, total]) => ({ nama, total }))
    .sort((a, b) => b.total - a.total || a.nama.localeCompare(b.nama, 'id'))
}

function namaKas(t: Transaksi): string {
  if (t.jenis === 'pindah') return `${t.kas_nama ?? '-'} ke ${t.kas_tujuan_nama ?? '-'}`
  return t.kas_nama ?? '-'
}

export interface OpsiLaporanPeriode {
  /** Semua kas di buku yang dilaporkan. */
  kasList: Pick<Kas, 'id' | 'saldo_awal'>[]
  /** Semua transaksi buku ini (boleh termasuk sebelum `dari`, untuk saldo awal). */
  transaksi: Transaksi[]
  dari: string
  sampai: string
  /** Jika diisi, laporan hanya untuk satu kas dan pindah ditampilkan. */
  kasId?: string
}

/**
 * Laporan per rentang tanggal.
 * Gabungan (tanpa kasId): saldo berjalan seluruh kas di buku; pindah antar kas
 * tidak mengubah saldo gabungan sehingga tidak ditampilkan.
 * Per kas: pindah ditampilkan sebagai uang masuk/keluar kas itu, tetapi tidak
 * dihitung sebagai pemasukan atau pengeluaran.
 */
export function laporanPeriode(o: OpsiLaporanPeriode): Laporan {
  const kasDipakai = o.kasId ? o.kasList.filter((k) => k.id === o.kasId) : o.kasList
  const idSet = kasDipakai.map((k) => k.id)
  const efek = (t: Transaksi) => idSet.reduce((s, id) => s + pengaruhKeKas(t, id), 0)

  let saldoAwal = kasDipakai.reduce((s, k) => s + k.saldo_awal, 0)
  const dalamRentang: Transaksi[] = []
  for (const t of urutkan(o.transaksi)) {
    if (t.tanggal < o.dari) saldoAwal += efek(t)
    else if (t.tanggal <= o.sampai) dalamRentang.push(t)
  }

  let saldo = saldoAwal
  let pindahMasuk = 0
  let pindahKeluar = 0
  const baris: BarisLaporan[] = []
  const dihitung: Transaksi[] = []
  for (const t of dalamRentang) {
    const d = efek(t)
    if (d === 0) continue // tidak menyentuh kas ini, atau pindah internal di laporan gabungan
    saldo += d
    if (t.jenis === 'pindah') {
      if (d > 0) pindahMasuk += d
      else pindahKeluar += -d
    } else {
      dihitung.push(t)
    }
    baris.push({
      no: baris.length + 1,
      id: t.id,
      tanggal: t.tanggal,
      keterangan: t.keterangan,
      kategori: t.jenis === 'pindah' ? 'Pindah dana' : (t.kategori_nama ?? TANPA_KATEGORI),
      kas: namaKas(t),
      masuk: d > 0 ? d : 0,
      keluar: d < 0 ? -d : 0,
      saldo,
    })
  }

  const totalMasuk = dihitung.filter((t) => t.jenis === 'masuk').reduce((s, t) => s + t.jumlah, 0)
  const totalKeluar = dihitung.filter((t) => t.jenis === 'keluar').reduce((s, t) => s + t.jumlah, 0)
  return {
    saldoAwal,
    baris,
    totalMasuk,
    totalKeluar,
    pindahMasuk,
    pindahKeluar,
    selisih: totalMasuk - totalKeluar,
    saldoAkhir: saldo,
    rekapMasuk: rekap(dihitung, 'masuk'),
    rekapKeluar: rekap(dihitung, 'keluar'),
  }
}

/** Laporan per proker: total masuk, total keluar, dan selisih. Tanpa saldo awal/akhir. */
export function laporanProker(transaksi: Transaksi[], prokerId: string): Laporan {
  const milikProker = urutkan(transaksi).filter(
    (t) => t.proker_id === prokerId && t.jenis !== 'pindah',
  )
  let berjalan = 0
  const baris = milikProker.map((t, i): BarisLaporan => {
    const masuk = t.jenis === 'masuk' ? t.jumlah : 0
    const keluar = t.jenis === 'keluar' ? t.jumlah : 0
    berjalan += masuk - keluar
    return {
      no: i + 1,
      id: t.id,
      tanggal: t.tanggal,
      keterangan: t.keterangan,
      kategori: t.kategori_nama ?? TANPA_KATEGORI,
      kas: namaKas(t),
      masuk,
      keluar,
      saldo: berjalan,
    }
  })
  const totalMasuk = baris.reduce((s, b) => s + b.masuk, 0)
  const totalKeluar = baris.reduce((s, b) => s + b.keluar, 0)
  return {
    saldoAwal: null,
    baris,
    totalMasuk,
    totalKeluar,
    pindahMasuk: 0,
    pindahKeluar: 0,
    selisih: totalMasuk - totalKeluar,
    saldoAkhir: null,
    rekapMasuk: rekap(milikProker, 'masuk'),
    rekapKeluar: rekap(milikProker, 'keluar'),
  }
}
