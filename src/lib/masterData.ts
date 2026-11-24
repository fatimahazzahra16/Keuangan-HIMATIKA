import type { ArahKategori, Buku } from './types'

// Logika murni halaman master data (kas, kategori, proker): validasi isian,
// bentuk baris untuk database, dan terjemahan pesan galat. Tanpa React/Supabase supaya mudah dites.

export const NAMA_MAKS = 60
/** Batas saldo awal sama dengan batas jumlah transaksi (Rp 10 miliar). */
export const SALDO_AWAL_MAKS = 10_000_000_000

export type JenisKas = 'tunai' | 'rekening'
export type StatusProker = 'aktif' | 'arsip'

export interface IsianKas {
  buku: Buku
  nama: string
  jenis: JenisKas
  saldoAwal: number
  urutan: number
}

export interface IsianKategori {
  buku: Buku
  nama: string
  berlaku: ArahKategori
  urutan: number
}

export interface IsianProker {
  buku: Buku
  nama: string
  tanggalMulai: string // YYYY-MM-DD
  tanggalSelesai: string // '' = belum ditentukan
}

export type Galat<T> = Partial<Record<keyof T, string>>

/** Data yang sudah ada, dipakai untuk mencegah nama ganda sebelum dikirim ke database. */
export interface BarisAda {
  id: string
  buku: Buku
  nama: string
  berlaku?: ArahKategori
}

/** Rapikan nama: buang spasi di ujung dan spasi ganda di tengah. */
export function rapikanNama(nama: string): string {
  return nama.trim().replace(/\s+/g, ' ')
}

function samaNama(a: string, b: string): boolean {
  return rapikanNama(a).toLocaleLowerCase('id') === rapikanNama(b).toLocaleLowerCase('id')
}

function cekNama(nama: string): string | undefined {
  const n = rapikanNama(nama)
  if (!n) return 'Isi nama.'
  if (n.length > NAMA_MAKS) return `Nama maksimal ${NAMA_MAKS} karakter.`
  return undefined
}

function cekUrutan(urutan: number): string | undefined {
  if (!Number.isInteger(urutan) || urutan < 0 || urutan > 999) return 'Urutan harus angka 0 sampai 999.'
  return undefined
}

export function tanggalValid(iso: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!m) return false
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])))
  return d.getUTCFullYear() === Number(m[1]) && d.getUTCMonth() === Number(m[2]) - 1 && d.getUTCDate() === Number(m[3])
}

/** `id` diisi saat mengubah, supaya baris itu sendiri tidak dianggap nama ganda. */
export function validasiKas(isi: IsianKas, ada: BarisAda[], id?: string): Galat<IsianKas> {
  const g: Galat<IsianKas> = {}
  const nama = cekNama(isi.nama)
  if (nama) g.nama = nama
  else if (ada.some((k) => k.id !== id && k.buku === isi.buku && samaNama(k.nama, isi.nama)))
    g.nama = 'Nama kas ini sudah ada di buku yang sama.'
  if (!Number.isInteger(isi.saldoAwal) || isi.saldoAwal < 0) g.saldoAwal = 'Saldo awal tidak boleh minus.'
  else if (isi.saldoAwal > SALDO_AWAL_MAKS) g.saldoAwal = 'Saldo awal terlalu besar. Periksa lagi angkanya.'
  const u = cekUrutan(isi.urutan)
  if (u) g.urutan = u
  return g
}

export function validasiKategori(isi: IsianKategori, ada: BarisAda[], id?: string): Galat<IsianKategori> {
  const g: Galat<IsianKategori> = {}
  const nama = cekNama(isi.nama)
  if (nama) g.nama = nama
  else if (ada.some((k) => k.id !== id && k.buku === isi.buku && k.berlaku === isi.berlaku && samaNama(k.nama, isi.nama)))
    g.nama = `Kategori ${isi.berlaku} dengan nama ini sudah ada.`
  const u = cekUrutan(isi.urutan)
  if (u) g.urutan = u
  return g
}

export function validasiProker(isi: IsianProker, ada: BarisAda[], id?: string): Galat<IsianProker> {
  const g: Galat<IsianProker> = {}
  const nama = cekNama(isi.nama)
  if (nama) g.nama = nama
  else if (ada.some((p) => p.id !== id && p.buku === isi.buku && samaNama(p.nama, isi.nama)))
    g.nama = 'Proker dengan nama ini sudah ada di buku yang sama.'
  if (!tanggalValid(isi.tanggalMulai)) g.tanggalMulai = 'Isi tanggal mulai.'
  if (isi.tanggalSelesai) {
    if (!tanggalValid(isi.tanggalSelesai)) g.tanggalSelesai = 'Tanggal selesai tidak valid.'
    else if (!g.tanggalMulai && isi.tanggalSelesai < isi.tanggalMulai)
      g.tanggalSelesai = 'Tanggal selesai tidak boleh sebelum tanggal mulai.'
  }
  return g
}

export function adaGalat(g: object): boolean {
  return Object.keys(g).length > 0
}

/** Baris kas untuk insert/update. `buku` hanya ikut saat membuat baru (database mengunci buku setelah dibuat). */
export function barisKas(isi: IsianKas, baru: boolean) {
  return {
    ...(baru ? { buku: isi.buku } : {}),
    nama: rapikanNama(isi.nama),
    jenis: isi.jenis,
    saldo_awal: isi.saldoAwal,
    urutan: isi.urutan,
  }
}

export function barisKategori(isi: IsianKategori, baru: boolean) {
  return {
    ...(baru ? { buku: isi.buku } : {}),
    nama: rapikanNama(isi.nama),
    berlaku: isi.berlaku,
    urutan: isi.urutan,
  }
}

export function barisProker(isi: IsianProker, baru: boolean) {
  return {
    ...(baru ? { buku: isi.buku } : {}),
    nama: rapikanNama(isi.nama),
    tanggal_mulai: isi.tanggalMulai,
    tanggal_selesai: isi.tanggalSelesai || null,
  }
}

/** Pesan galat database yang khusus master data. Kembalikan null kalau tidak dikenali. */
export function pesanGalatMaster(pesan: string): string | null {
  const p = pesan.toLowerCase()
  if (p.includes('duplicate key') || p.includes('unique constraint')) return 'Nama ini sudah dipakai di buku yang sama.'
  if (p.includes('violates foreign key'))
    return 'Data ini sudah dipakai transaksi, jadi tidak bisa dihapus. Arsipkan saja supaya tidak muncul lagi di pilihan.'
  if (p.includes('saldo_awal')) return 'Saldo awal tidak boleh minus.'
  return null
}
