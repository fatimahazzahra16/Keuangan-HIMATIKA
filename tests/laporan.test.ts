import { describe, expect, it } from 'vitest'
import { laporanPeriode, laporanProker } from '../src/lib/laporan'
import { KAS_REK, KAS_TUNAI, trx } from './fixtures'

const data = [
  trx({ jenis: 'masuk', jumlah: 50_000, kas_id: 'tunai', tanggal: '2026-02-20', kas_nama: 'Kas Tunai', kategori_nama: 'Danusan' }),
  trx({ jenis: 'masuk', jumlah: 2_000_000, kas_id: 'rek', tanggal: '2026-03-01', kas_nama: 'Rekening', kategori_nama: 'Sponsor', proker_id: 'p1' }),
  trx({ jenis: 'pindah', jumlah: 500_000, kas_id: 'rek', kas_tujuan_id: 'tunai', tanggal: '2026-03-02', kas_nama: 'Rekening', kas_tujuan_nama: 'Kas Tunai', proker_id: 'p1' }),
  trx({ jenis: 'keluar', jumlah: 300_000, kas_id: 'tunai', tanggal: '2026-03-05', kas_nama: 'Kas Tunai', kategori_nama: 'Konsumsi', proker_id: 'p1' }),
  trx({ jenis: 'keluar', jumlah: 45_000, kas_id: 'tunai', tanggal: '2026-03-05', kas_nama: 'Kas Tunai', kategori_nama: 'ATK', proker_id: 'p1' }),
  trx({ jenis: 'masuk', jumlah: 100_000, kas_id: 'tunai', tanggal: '2026-03-10', kas_nama: 'Kas Tunai', kategori_nama: 'Danusan' }),
  trx({ jenis: 'keluar', jumlah: 80_000, kas_id: 'rek', tanggal: '2026-04-01', kas_nama: 'Rekening', kategori_nama: 'Cetak', proker_id: 'p1' }),
]

describe('laporan periode gabungan', () => {
  const lap = laporanPeriode({ kasList: [KAS_TUNAI, KAS_REK], transaksi: data, dari: '2026-03-01', sampai: '2026-03-31' })

  it('saldo awal memasukkan transaksi sebelum periode', () => {
    expect(lap.saldoAwal).toBe(100_000 + 500_000 + 50_000)
  })

  it('pindah antar kas tidak tampil dan tidak dihitung', () => {
    expect(lap.baris.map((b) => b.kategori)).toEqual(['Sponsor', 'Konsumsi', 'ATK', 'Danusan'])
    expect(lap.totalMasuk).toBe(2_100_000)
    expect(lap.totalKeluar).toBe(345_000)
    expect(lap.pindahMasuk).toBe(0)
    expect(lap.pindahKeluar).toBe(0)
  })

  it('saldo berjalan dan saldo akhir konsisten', () => {
    expect(lap.baris.map((b) => b.saldo)).toEqual([2_650_000, 2_350_000, 2_305_000, 2_405_000])
    expect(lap.baris.map((b) => b.no)).toEqual([1, 2, 3, 4])
    expect(lap.saldoAkhir).toBe(lap.saldoAwal! + lap.totalMasuk - lap.totalKeluar)
    expect(lap.selisih).toBe(1_755_000)
  })

  it('transaksi setelah periode tidak ikut', () => {
    expect(lap.baris.some((b) => b.tanggal > '2026-03-31')).toBe(false)
  })

  it('rekap per kategori, terbesar dulu', () => {
    expect(lap.rekapMasuk).toEqual([
      { nama: 'Sponsor', total: 2_000_000 },
      { nama: 'Danusan', total: 100_000 },
    ])
    expect(lap.rekapKeluar).toEqual([
      { nama: 'Konsumsi', total: 300_000 },
      { nama: 'ATK', total: 45_000 },
    ])
  })
})

describe('laporan periode per kas', () => {
  it('pindah tampil sebagai uang masuk kas tujuan, tapi bukan pemasukan', () => {
    const lap = laporanPeriode({ kasList: [KAS_TUNAI, KAS_REK], transaksi: data, dari: '2026-03-01', sampai: '2026-03-31', kasId: 'tunai' })
    expect(lap.saldoAwal).toBe(150_000)
    expect(lap.baris.map((b) => [b.kategori, b.masuk, b.keluar, b.saldo])).toEqual([
      ['Pindah dana', 500_000, 0, 650_000],
      ['Konsumsi', 0, 300_000, 350_000],
      ['ATK', 0, 45_000, 305_000],
      ['Danusan', 100_000, 0, 405_000],
    ])
    expect(lap.baris[0].kas).toBe('Rekening ke Kas Tunai')
    expect(lap.totalMasuk).toBe(100_000)
    expect(lap.totalKeluar).toBe(345_000)
    expect(lap.pindahMasuk).toBe(500_000)
    expect(lap.saldoAkhir).toBe(
      lap.saldoAwal! + lap.totalMasuk - lap.totalKeluar + lap.pindahMasuk - lap.pindahKeluar,
    )
  })

  it('pindah keluar dari kas sumber', () => {
    const lap = laporanPeriode({ kasList: [KAS_TUNAI, KAS_REK], transaksi: data, dari: '2026-03-01', sampai: '2026-03-31', kasId: 'rek' })
    expect(lap.pindahKeluar).toBe(500_000)
    expect(lap.saldoAkhir).toBe(500_000 + 2_000_000 - 500_000)
  })
})

describe('laporan proker', () => {
  const lap = laporanProker(data, 'p1')

  it('hanya total masuk, keluar, dan selisih (tanpa saldo awal/akhir)', () => {
    expect(lap.saldoAwal).toBeNull()
    expect(lap.saldoAkhir).toBeNull()
    expect(lap.totalMasuk).toBe(2_000_000)
    expect(lap.totalKeluar).toBe(425_000)
    expect(lap.selisih).toBe(1_575_000)
  })

  it('pindah tidak ikut walaupun ditandai proker', () => {
    expect(lap.baris).toHaveLength(4)
    expect(lap.baris.some((b) => b.kategori === 'Pindah dana')).toBe(false)
  })

  it('kolom saldo berisi selisih berjalan, lintas periode', () => {
    expect(lap.baris.map((b) => b.saldo)).toEqual([2_000_000, 1_700_000, 1_655_000, 1_575_000])
  })

  it('proker tanpa transaksi menghasilkan nol', () => {
    const kosong = laporanProker(data, 'tidak-ada')
    expect(kosong.baris).toEqual([])
    expect(kosong.selisih).toBe(0)
  })

  it('kategori kosong masuk rekap "Tanpa kategori"', () => {
    const l = laporanProker([trx({ jenis: 'keluar', jumlah: 10_000, kas_id: 'tunai', proker_id: 'p9' })], 'p9')
    expect(l.rekapKeluar).toEqual([{ nama: 'Tanpa kategori', total: 10_000 }])
  })
})
