export type Buku = 'kas' | 'dipa'
export type JenisTransaksi = 'masuk' | 'keluar' | 'pindah'
export type ArahKategori = 'masuk' | 'keluar'

export const NAMA_BUKU: Record<Buku, string> = {
  kas: 'Kas HIMA',
  dipa: 'Dana Dipa',
}

/** Baris dari view v_kas_publik (saldo dihitung di database). */
export interface Kas {
  id: string
  buku: Buku
  nama: string
  jenis: 'tunai' | 'rekening' | 'lainnya'
  saldo_awal: number
  aktif: boolean
  urutan: number
  saldo?: number
}

/** Baris dari view v_transaksi_publik. Tidak ada created_by dan path bukti. */
export interface Transaksi {
  id: string
  jenis: JenisTransaksi
  tanggal: string // YYYY-MM-DD
  jumlah: number
  buku: Buku
  kas_id: string
  kas_nama?: string
  kas_tujuan_id: string | null
  kas_tujuan_nama?: string | null
  kategori_id: string | null
  kategori_nama?: string | null
  proker_id: string | null
  proker_nama?: string | null
  keterangan: string
  created_at: string
}
