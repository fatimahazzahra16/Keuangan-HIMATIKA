import { describe, expect, it } from 'vitest'
import { hitungSaldoKas, hitungSaldoSemuaKas, totalMasukKeluar } from '../src/lib/saldo'
import { KAS_REK, KAS_TUNAI, trx } from './fixtures'

describe('saldo per kas', () => {
  it('tanpa transaksi sama dengan saldo awal', () => {
    expect(hitungSaldoKas(KAS_TUNAI, [])).toBe(100_000)
  })

  it('saldo awal + masuk - keluar', () => {
    const t = [
      trx({ jenis: 'masuk', jumlah: 250_000, kas_id: 'tunai' }),
      trx({ jenis: 'keluar', jumlah: 75_000, kas_id: 'tunai' }),
      trx({ jenis: 'masuk', jumlah: 999, kas_id: 'rek' }), // kas lain, diabaikan
    ]
    expect(hitungSaldoKas(KAS_TUNAI, t)).toBe(275_000)
  })

  it('pindah mengurangi kas sumber dan menambah kas tujuan', () => {
    const t = [trx({ jenis: 'pindah', jumlah: 200_000, kas_id: 'rek', kas_tujuan_id: 'tunai' })]
    expect(hitungSaldoKas(KAS_REK, t)).toBe(300_000)
    expect(hitungSaldoKas(KAS_TUNAI, t)).toBe(300_000)
  })

  it('pindah tidak mengubah total saldo semua kas', () => {
    const t = [
      trx({ jenis: 'masuk', jumlah: 1_000_000, kas_id: 'rek' }),
      trx({ jenis: 'pindah', jumlah: 400_000, kas_id: 'rek', kas_tujuan_id: 'tunai' }),
      trx({ jenis: 'pindah', jumlah: 50_000, kas_id: 'tunai', kas_tujuan_id: 'rek' }),
      trx({ jenis: 'keluar', jumlah: 120_000, kas_id: 'tunai' }),
    ]
    const peta = hitungSaldoSemuaKas([KAS_TUNAI, KAS_REK], t)
    expect(peta.get('tunai')).toBe(100_000 + 400_000 - 50_000 - 120_000)
    expect(peta.get('rek')).toBe(500_000 + 1_000_000 - 400_000 + 50_000)
    const total = [...peta.values()].reduce((a, b) => a + b, 0)
    expect(total).toBe(100_000 + 500_000 + 1_000_000 - 120_000)
    // konsisten dengan perhitungan per kas
    expect(peta.get('tunai')).toBe(hitungSaldoKas(KAS_TUNAI, t))
    expect(peta.get('rek')).toBe(hitungSaldoKas(KAS_REK, t))
  })

  it('saldo boleh minus (tidak disembunyikan)', () => {
    const t = [trx({ jenis: 'keluar', jumlah: 150_000, kas_id: 'tunai' })]
    expect(hitungSaldoKas(KAS_TUNAI, t)).toBe(-50_000)
  })
})

describe('total masuk dan keluar', () => {
  it('pindah tidak dihitung sebagai pemasukan atau pengeluaran', () => {
    const t = [
      trx({ jenis: 'masuk', jumlah: 300_000, kas_id: 'tunai' }),
      trx({ jenis: 'keluar', jumlah: 100_000, kas_id: 'tunai' }),
      trx({ jenis: 'pindah', jumlah: 999_999, kas_id: 'tunai', kas_tujuan_id: 'rek' }),
    ]
    expect(totalMasukKeluar(t)).toEqual({ masuk: 300_000, keluar: 100_000 })
  })
})
