import type { Buku, JenisTransaksi } from './types'

// Logika murni form transaksi (tanpa React, tanpa Supabase) supaya mudah dites.

export interface IsianTransaksi {
  buku: Buku
  jenis: JenisTransaksi
  tanggal: string // YYYY-MM-DD
  jumlah: number
  kasId: string
  kasTujuanId: string
  kategoriId: string
  prokerId: string
  keterangan: string
}

export interface PilihanKas {
  id: string
  buku: Buku
  nama: string
}
export interface PilihanKategori {
  id: string
  buku: Buku
  nama: string
  berlaku: 'masuk' | 'keluar'
}
export interface PilihanProker {
  id: string
  buku: Buku
  nama: string
}

export interface Referensi {
  kas: PilihanKas[]
  kategori: PilihanKategori[]
  proker: PilihanProker[]
}

export type GalatForm = Partial<Record<keyof IsianTransaksi, string>>

/** Batas atas jumlah supaya tidak salah ketik nol berlebih (Rp 10 miliar). */
export const JUMLAH_MAKS = 10_000_000_000
export const KETERANGAN_MAKS = 500

function tanggalValid(iso: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!m) return false
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])))
  return d.getUTCFullYear() === Number(m[1]) && d.getUTCMonth() === Number(m[2]) - 1 && d.getUTCDate() === Number(m[3])
}

/** Validasi isian. Mengembalikan objek kosong kalau semua benar. `hariIni` dipakai untuk menolak tanggal masa depan. */
export function validasi(isi: IsianTransaksi, ref: Referensi, hariIni: string): GalatForm {
  const g: GalatForm = {}
  if (!tanggalValid(isi.tanggal)) g.tanggal = 'Tanggal tidak valid.'
  else if (isi.tanggal > hariIni) g.tanggal = 'Tanggal tidak boleh setelah hari ini.'

  if (!Number.isInteger(isi.jumlah) || isi.jumlah <= 0) g.jumlah = 'Isi jumlah lebih dari 0.'
  else if (isi.jumlah > JUMLAH_MAKS) g.jumlah = 'Jumlah terlalu besar. Periksa lagi angkanya.'

  const kas = ref.kas.find((k) => k.id === isi.kasId)
  if (!kas) g.kasId = 'Pilih kas.'
  else if (kas.buku !== isi.buku) g.kasId = 'Kas tidak ada di buku ini.'

  if (isi.jenis === 'pindah') {
    const tujuan = ref.kas.find((k) => k.id === isi.kasTujuanId)
    if (!tujuan) g.kasTujuanId = 'Pilih kas tujuan.'
    else if (tujuan.buku !== isi.buku) g.kasTujuanId = 'Kas tujuan harus di buku yang sama.'
    else if (tujuan.id === isi.kasId) g.kasTujuanId = 'Kas tujuan harus berbeda dari kas asal.'
  } else {
    const kat = ref.kategori.find((k) => k.id === isi.kategoriId)
    if (!kat) g.kategoriId = 'Pilih kategori.'
    else if (kat.buku !== isi.buku || kat.berlaku !== isi.jenis) g.kategoriId = 'Kategori tidak cocok dengan jenis transaksi.'
  }

  if (isi.prokerId) {
    const p = ref.proker.find((x) => x.id === isi.prokerId)
    if (!p || p.buku !== isi.buku) g.prokerId = 'Proker tidak ada di buku ini.'
  }

  if (isi.keterangan.trim().length > KETERANGAN_MAKS) g.keterangan = `Keterangan maksimal ${KETERANGAN_MAKS} karakter.`
  return g
}

/** Baris untuk insert/update tabel transaksi. Kolom yang tidak berlaku dikosongkan. */
export function keBaris(isi: IsianTransaksi) {
  const pindah = isi.jenis === 'pindah'
  return {
    jenis: isi.jenis,
    tanggal: isi.tanggal,
    jumlah: isi.jumlah,
    kas_id: isi.kasId,
    kas_tujuan_id: pindah ? isi.kasTujuanId : null,
    kategori_id: pindah ? null : isi.kategoriId,
    proker_id: isi.prokerId || null,
    keterangan: isi.keterangan.trim(),
  }
}

/** Saat buku atau jenis berganti, kosongkan pilihan yang tidak lagi berlaku. */
export function rapikan(isi: IsianTransaksi, ref: Referensi): IsianTransaksi {
  const hasil = { ...isi }
  const kasOk = (id: string) => ref.kas.some((k) => k.id === id && k.buku === isi.buku)
  if (!kasOk(hasil.kasId)) hasil.kasId = ''
  if (hasil.jenis !== 'pindah' || !kasOk(hasil.kasTujuanId) || hasil.kasTujuanId === hasil.kasId) hasil.kasTujuanId = ''
  if (
    hasil.jenis === 'pindah' ||
    !ref.kategori.some((k) => k.id === hasil.kategoriId && k.buku === isi.buku && k.berlaku === hasil.jenis)
  )
    hasil.kategoriId = ''
  if (!ref.proker.some((p) => p.id === hasil.prokerId && p.buku === isi.buku)) hasil.prokerId = ''
  return hasil
}

/** Terjemahkan pesan galat dari Supabase/Postgres ke Bahasa Indonesia yang bisa dipahami bendahara. */
export function pesanGalat(pesan: string): string {
  const p = pesan.toLowerCase()
  if (p.includes('invalid login credentials')) return 'Email atau password salah.'
  if (p.includes('email not confirmed')) return 'Email belum dikonfirmasi. Konfirmasi lewat dashboard Supabase.'
  if (p.includes('rate limit') || p.includes('too many')) return 'Terlalu banyak percobaan. Tunggu beberapa menit lalu coba lagi.'
  if (p.includes('failed to fetch') || p.includes('networkerror') || p.includes('network request failed'))
    return 'Tidak bisa terhubung ke server. Periksa koneksi internet.'
  if (p.includes('row-level security') || p.includes('permission denied'))
    return 'Akun ini tidak punya izin menulis data. Pastikan akun sudah didaftarkan sebagai admin.'
  if (p.includes('jwt expired')) return 'Sesi login habis. Silakan masuk lagi.'
  if (p.includes('violates foreign key') && p.includes('delete')) return 'Data masih dipakai transaksi lain.'
  if (p.includes('payload too large') || p.includes('exceeded the maximum allowed size')) return 'Ukuran foto terlalu besar (maksimal 5 MB).'
  if (p.includes('mime type') || p.includes('invalid_mime_type')) return 'Format foto tidak didukung. Pakai JPG, PNG, atau WEBP.'
  return pesan
}

/** Path objek di bucket bukti: <tahun>/<id transaksi>/<acak>.<ekstensi>. Tidak memuat nama file asli. */
export function pathBukti(tanggal: string, transaksiId: string, acak: string, ekstensi: string): string {
  const tahun = /^\d{4}/.exec(tanggal)?.[0] ?? 'lain'
  const ext = ekstensi.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'jpg'
  return `${tahun}/${transaksiId}/${acak}.${ext}`
}

export const MAKS_BUKTI = 5
