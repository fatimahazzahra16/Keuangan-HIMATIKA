import type { Transaksi } from '../src/lib/types'

let n = 0
export function trx(p: Partial<Transaksi> & Pick<Transaksi, 'jenis' | 'jumlah' | 'kas_id'>): Transaksi {
  n += 1
  return {
    id: `t${String(n).padStart(3, '0')}`,
    tanggal: '2026-01-01',
    buku: 'kas',
    kas_tujuan_id: null,
    kategori_id: null,
    kategori_nama: null,
    proker_id: null,
    proker_nama: null,
    keterangan: '',
    created_at: `2026-01-01T00:00:${String(n % 60).padStart(2, '0')}Z`,
    ...p,
  }
}

export const KAS_TUNAI = { id: 'tunai', saldo_awal: 100_000 }
export const KAS_REK = { id: 'rek', saldo_awal: 500_000 }
