import { totalMasukKeluar } from './saldo'
import { NAMA_BUKU, type Buku, type Kas, type Transaksi } from './types'

export interface RingkasanBuku {
  buku: Buku
  nama: string
  saldo: number
  kas: { id: string; nama: string; saldo: number }[]
  masukBulanIni: number
  keluarBulanIni: number
}

const URUTAN_BUKU: Buku[] = ['kas', 'dipa']

/**
 * Ringkasan per buku untuk halaman Beranda.
 * Kas nonaktif tetap dihitung bila masih punya saldo, supaya total tidak hilang diam-diam.
 */
export function ringkasBeranda(kasList: Kas[], trxBulanIni: Pick<Transaksi, 'buku' | 'jenis' | 'jumlah'>[]): RingkasanBuku[] {
  return URUTAN_BUKU.map((buku) => {
    const kas = kasList
      .filter((k) => k.buku === buku && (k.aktif || (k.saldo ?? 0) !== 0))
      .sort((a, b) => a.urutan - b.urutan || a.nama.localeCompare(b.nama, 'id'))
      .map((k) => ({ id: k.id, nama: k.nama, saldo: k.saldo ?? k.saldo_awal }))
    const { masuk, keluar } = totalMasukKeluar(trxBulanIni.filter((t) => t.buku === buku))
    return {
      buku,
      nama: NAMA_BUKU[buku],
      saldo: kas.reduce((s, k) => s + k.saldo, 0),
      kas,
      masukBulanIni: masuk,
      keluarBulanIni: keluar,
    }
  })
}
