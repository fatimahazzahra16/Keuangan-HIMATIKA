import { describe, expect, it } from 'vitest'
import { barisTeks, namaBerkas, susunDokumen, type InfoLaporan } from '../src/lib/ekspor'
import { laporanPeriode, laporanProker } from '../src/lib/laporan'
import { KAS_REK, KAS_TUNAI, trx } from './fixtures'

const data = [
  trx({ jenis: 'masuk', jumlah: 50_000, kas_id: 'tunai', tanggal: '2026-02-20', kas_nama: 'Kas Tunai', kategori_nama: 'Danusan' }),
  trx({ jenis: 'masuk', jumlah: 2_000_000, kas_id: 'rek', tanggal: '2026-03-01', kas_nama: 'Rekening', kategori_nama: 'Sponsor', proker_id: 'p1' }),
  trx({ jenis: 'pindah', jumlah: 500_000, kas_id: 'rek', kas_tujuan_id: 'tunai', tanggal: '2026-03-02', kas_nama: 'Rekening', kas_tujuan_nama: 'Kas Tunai', proker_id: 'p1' }),
  trx({ jenis: 'keluar', jumlah: 300_000, kas_id: 'tunai', tanggal: '2026-03-05', kas_nama: 'Kas Tunai', kategori_nama: 'Konsumsi', proker_id: 'p1', keterangan: '  ' }),
]

const infoDasar: InfoLaporan = {
  judul: 'Laporan Kas HIMA',
  periode: '1 Maret 2026 sampai 31 Maret 2026',
  proker: false,
  perKas: false,
  dibuat: '2026-11-24',
}

describe('susunDokumen laporan periode', () => {
  const lap = laporanPeriode({ kasList: [KAS_TUNAI, KAS_REK], transaksi: data, dari: '2026-03-01', sampai: '2026-03-31' })
  const dok = susunDokumen(lap, infoDasar)

  it('baris pertama adalah saldo awal tanpa nomor', () => {
    expect(dok.baris[0]).toMatchObject({ no: null, keterangan: 'Saldo awal', saldo: lap.saldoAwal })
    expect(dok.baris).toHaveLength(lap.baris.length + 1)
  })

  it('kolom terakhir saldo berjalan', () => {
    expect(dok.kepala).toEqual(['No', 'Tanggal', 'Keterangan', 'Kategori', 'Kas', 'Masuk', 'Keluar', 'Saldo berjalan'])
  })

  it('keterangan kosong jadi tanda strip dan tanggal format pendek', () => {
    const keluar = dok.baris.find((b) => b.keluar === 300_000)
    expect(keluar?.keterangan).toBe('-')
    expect(keluar?.tanggal).toBe('5 Mar 2026')
  })

  it('ringkasan berisi saldo awal, total, dan saldo akhir', () => {
    expect(dok.ringkasan.map((r) => r.label)).toEqual(['Saldo awal', 'Total masuk', 'Total keluar', 'Saldo akhir'])
    expect(dok.ringkasan.at(-1)?.nilai).toBe(lap.saldoAkhir)
  })

  it('catatan tanggal dibuat', () => {
    expect(dok.catatan).toEqual(['Dibuat 24 November 2026.'])
  })
})

describe('susunDokumen laporan per kas', () => {
  const lap = laporanPeriode({ kasList: [KAS_TUNAI, KAS_REK], transaksi: data, dari: '2026-03-01', sampai: '2026-03-31', kasId: 'tunai' })
  const dok = susunDokumen(lap, { ...infoDasar, perKas: true })

  it('menampilkan pindah dana dan catatannya', () => {
    expect(dok.ringkasan.map((r) => r.label)).toContain('Pindah dana masuk')
    expect(dok.ringkasan.find((r) => r.label === 'Pindah dana masuk')?.nilai).toBe(500_000)
    expect(dok.catatan[0]).toMatch(/Pindah dana/)
  })
})

describe('susunDokumen laporan proker', () => {
  const lap = laporanProker(data, 'p1')
  const dok = susunDokumen(lap, { ...infoDasar, judul: 'Laporan Proker Makrab', proker: true })

  it('tanpa saldo awal, kolom selisih berjalan, ringkasan selisih', () => {
    expect(dok.baris[0].no).not.toBeNull()
    expect(dok.kepala.at(-1)).toBe('Selisih berjalan')
    expect(dok.ringkasan.at(-1)).toEqual({ label: 'Selisih', nilai: lap.selisih })
  })
})

describe('barisTeks', () => {
  it('memformat rupiah dan mengosongkan sel kosong', () => {
    expect(
      barisTeks({ no: 3, tanggal: '5 Mar 2026', keterangan: 'Konsumsi', kategori: 'Konsumsi', kas: 'Kas Tunai', masuk: null, keluar: 1_250_000, saldo: -50_000 }),
    ).toEqual(['3', '5 Mar 2026', 'Konsumsi', 'Konsumsi', 'Kas Tunai', '', 'Rp 1.250.000', '-Rp 50.000'])
  })
})

describe('namaBerkas', () => {
  it('membuat slug dari judul', () => {
    expect(namaBerkas('Laporan Kas HIMA', '2026-11-24', 'xlsx')).toBe('laporan-kas-hima-2026-11-24.xlsx')
    expect(namaBerkas('Laporan Proker Makrab (Dana Dipa)', '2026-11-24', 'pdf')).toBe('laporan-proker-makrab-dana-dipa-2026-11-24.pdf')
  })

  it('cadangan nama kalau judul kosong', () => {
    expect(namaBerkas('!!!', '2026-11-24', 'pdf')).toBe('laporan-2026-11-24.pdf')
  })
})
