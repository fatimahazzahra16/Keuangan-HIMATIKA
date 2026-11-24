import type { Kas, Transaksi } from './types'

type TrxSaldo = Pick<Transaksi, 'jenis' | 'jumlah' | 'kas_id' | 'kas_tujuan_id'>

/**
 * Pengaruh satu transaksi terhadap saldo satu kas.
 * masuk: +, keluar: -, pindah: - di kas sumber, + di kas tujuan.
 */
export function pengaruhKeKas(t: TrxSaldo, kasId: string): number {
  switch (t.jenis) {
    case 'masuk':
      return t.kas_id === kasId ? t.jumlah : 0
    case 'keluar':
      return t.kas_id === kasId ? -t.jumlah : 0
    case 'pindah': {
      let d = 0
      if (t.kas_id === kasId) d -= t.jumlah
      if (t.kas_tujuan_id === kasId) d += t.jumlah
      return d
    }
  }
}

/** Saldo = saldo awal + masuk - keluar - pindah keluar + pindah masuk. */
export function hitungSaldoKas(kas: Pick<Kas, 'id' | 'saldo_awal'>, transaksi: TrxSaldo[]): number {
  return transaksi.reduce((s, t) => s + pengaruhKeKas(t, kas.id), kas.saldo_awal)
}

export function hitungSaldoSemuaKas(
  kasList: Pick<Kas, 'id' | 'saldo_awal'>[],
  transaksi: TrxSaldo[],
): Map<string, number> {
  const hasil = new Map<string, number>()
  for (const k of kasList) hasil.set(k.id, k.saldo_awal)
  for (const t of transaksi) {
    if (t.jenis === 'pindah') {
      if (hasil.has(t.kas_id)) hasil.set(t.kas_id, hasil.get(t.kas_id)! - t.jumlah)
      if (t.kas_tujuan_id && hasil.has(t.kas_tujuan_id))
        hasil.set(t.kas_tujuan_id, hasil.get(t.kas_tujuan_id)! + t.jumlah)
    } else if (hasil.has(t.kas_id)) {
      hasil.set(t.kas_id, hasil.get(t.kas_id)! + (t.jenis === 'masuk' ? t.jumlah : -t.jumlah))
    }
  }
  return hasil
}

/** Total masuk dan keluar. Pindah tidak dihitung sebagai pemasukan atau pengeluaran. */
export function totalMasukKeluar(transaksi: Pick<Transaksi, 'jenis' | 'jumlah'>[]): {
  masuk: number
  keluar: number
} {
  let masuk = 0
  let keluar = 0
  for (const t of transaksi) {
    if (t.jenis === 'masuk') masuk += t.jumlah
    else if (t.jenis === 'keluar') keluar += t.jumlah
  }
  return { masuk, keluar }
}
