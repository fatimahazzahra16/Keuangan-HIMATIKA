import { describe, expect, it } from 'vitest'
import {
  formatInputAngka,
  formatRupiah,
  formatTanggal,
  formatTanggalPendek,
  hariIniJakarta,
  parseAngka,
  rentangBulanIni,
} from '../src/lib/format'

describe('format', () => {
  it('rupiah id-ID', () => {
    expect(formatRupiah(1_250_000)).toBe('Rp 1.250.000')
    expect(formatRupiah(0)).toBe('Rp 0')
    expect(formatRupiah(-5_000)).toBe('-Rp 5.000')
  })

  it('input angka dengan pemisah ribuan', () => {
    expect(formatInputAngka('1250000')).toBe('1.250.000')
    expect(formatInputAngka('1.250.0005')).toBe('12.500.005')
    expect(formatInputAngka('00012')).toBe('12')
    expect(formatInputAngka('abc')).toBe('')
    expect(parseAngka('Rp 1.250.000')).toBe(1_250_000)
    expect(parseAngka('')).toBe(0)
  })

  it('tanggal Indonesia', () => {
    expect(formatTanggal('2026-11-24')).toBe('24 November 2026')
    expect(formatTanggalPendek('2026-08-05')).toBe('5 Agu 2026')
  })

  it('hari ini mengikuti Asia/Jakarta', () => {
    // 23 Nov 2026 18:30 UTC = 24 Nov 2026 01:30 WIB
    expect(hariIniJakarta(new Date('2026-11-23T18:30:00Z'))).toBe('2026-11-24')
    expect(rentangBulanIni(new Date('2026-02-10T05:00:00Z'))).toEqual(['2026-02-01', '2026-02-28'])
  })
})
