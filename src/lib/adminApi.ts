import imageCompression from 'browser-image-compression'
import { MAKS_BUKTI, keBaris, pathBukti, pesanGalat, type IsianTransaksi, type Referensi } from './formTransaksi'
import { supabase } from './supabase'
import type { Buku, JenisTransaksi } from './types'

// Query untuk halaman bendahara. Semua ini membaca/menulis tabel dasar dan bucket "bukti",
// yang oleh RLS hanya diizinkan untuk user yang terdaftar di tabel admins.

const BUCKET = 'bukti'
/** Umur signed URL foto bukti (detik). Sengaja pendek. */
export const UMUR_URL_BUKTI = 60

function pastikan<T>(hasil: { data: T | null; error: { message: string } | null }): T {
  if (hasil.error) throw new Error(pesanGalat(hasil.error.message))
  return hasil.data as T
}

export interface ReferensiAdmin extends Referensi {
  kas: { id: string; buku: Buku; nama: string; aktif: boolean }[]
  kategori: { id: string; buku: Buku; nama: string; berlaku: 'masuk' | 'keluar'; aktif: boolean }[]
  proker: { id: string; buku: Buku; nama: string; status: 'aktif' | 'arsip' }[]
}

export async function ambilReferensiAdmin(): Promise<ReferensiAdmin> {
  const db = supabase()
  const [kas, kategori, proker] = await Promise.all([
    db.from('kas').select('id,buku,nama,aktif').order('urutan').order('nama'),
    db.from('kategori').select('id,buku,nama,berlaku,aktif').order('urutan').order('nama'),
    db.from('proker').select('id,buku,nama,status').order('tanggal_mulai', { ascending: false }).order('nama'),
  ])
  return {
    kas: pastikan(kas) as ReferensiAdmin['kas'],
    kategori: pastikan(kategori) as ReferensiAdmin['kategori'],
    proker: pastikan(proker) as ReferensiAdmin['proker'],
  }
}

export interface BuktiFoto {
  id: string
  storage_path: string
  urutan: number
}

export interface TransaksiAdmin {
  id: string
  jenis: JenisTransaksi
  tanggal: string
  jumlah: number
  kas_id: string
  kas_tujuan_id: string | null
  kategori_id: string | null
  proker_id: string | null
  keterangan: string
  bukti: BuktiFoto[]
}

export async function ambilTransaksiAdmin(id: string): Promise<TransaksiAdmin | null> {
  const res = await supabase()
    .from('transaksi')
    .select('id,jenis,tanggal,jumlah,kas_id,kas_tujuan_id,kategori_id,proker_id,keterangan,bukti(id,storage_path,urutan)')
    .eq('id', id)
    .maybeSingle()
  const data = pastikan(res) as TransaksiAdmin | null
  data?.bukti.sort((a, b) => a.urutan - b.urutan)
  return data
}

/** Jumlah foto bukti per transaksi, untuk ikon di daftar. */
export async function hitungBukti(ids: string[]): Promise<Record<string, number>> {
  if (ids.length === 0) return {}
  const res = await supabase().from('bukti').select('transaksi_id').in('transaksi_id', ids)
  const hasil: Record<string, number> = {}
  for (const b of pastikan(res) as { transaksi_id: string }[]) hasil[b.transaksi_id] = (hasil[b.transaksi_id] ?? 0) + 1
  return hasil
}

export async function simpanTransaksi(isi: IsianTransaksi, id?: string): Promise<string> {
  const db = supabase()
  const baris = keBaris(isi)
  if (id) {
    const res = await db.from('transaksi').update(baris).eq('id', id).select('id').single()
    return (pastikan(res) as { id: string }).id
  }
  const res = await db.from('transaksi').insert(baris).select('id').single()
  return (pastikan(res) as { id: string }).id
}

/** Hapus transaksi beserta semua foto buktinya. */
export async function hapusTransaksi(id: string): Promise<void> {
  const db = supabase()
  const bukti = pastikan(await db.from('bukti').select('storage_path').eq('transaksi_id', id)) as { storage_path: string }[]
  // Hapus baris dulu (bukti ikut terhapus lewat cascade), baru file-nya.
  // Kalau penghapusan file gagal, yang tersisa hanya file yatim di bucket private, bukan data rusak.
  pastikan(await db.from('transaksi').delete().eq('id', id).select('id'))
  if (bukti.length > 0) await db.storage.from(BUCKET).remove(bukti.map((b) => b.storage_path))
}

/** Kompres foto di browser sebelum diunggah: sisi terpanjang 1600 px, sekitar 600 KB, format JPEG. */
export async function kompresFoto(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) throw new Error('File harus berupa foto.')
  return imageCompression(file, {
    maxSizeMB: 0.6,
    maxWidthOrHeight: 1600,
    useWebWorker: true,
    fileType: 'image/jpeg',
    initialQuality: 0.8,
  })
}

/** Unggah satu foto bukti untuk transaksi. File storage dihapus lagi kalau baris bukti gagal dibuat. */
export async function unggahBukti(transaksiId: string, tanggal: string, file: File, urutan: number): Promise<BuktiFoto> {
  if (urutan >= MAKS_BUKTI) throw new Error(`Maksimal ${MAKS_BUKTI} foto bukti per transaksi.`)
  const db = supabase()
  const kecil = await kompresFoto(file)
  const path = pathBukti(tanggal, transaksiId, crypto.randomUUID(), 'jpg')
  const up = await db.storage.from(BUCKET).upload(path, kecil, { contentType: 'image/jpeg', upsert: false })
  if (up.error) throw new Error(pesanGalat(up.error.message))
  const res = await db.from('bukti').insert({ transaksi_id: transaksiId, storage_path: path, urutan }).select('id,storage_path,urutan').single()
  if (res.error) {
    await db.storage.from(BUCKET).remove([path])
    throw new Error(pesanGalat(res.error.message))
  }
  return res.data as BuktiFoto
}

export async function hapusBukti(b: BuktiFoto): Promise<void> {
  const db = supabase()
  pastikan(await db.from('bukti').delete().eq('id', b.id).select('id'))
  await db.storage.from(BUCKET).remove([b.storage_path])
}

/** Signed URL berumur pendek untuk menampilkan foto dari bucket private. */
export async function urlBukti(path: string): Promise<string> {
  const { data, error } = await supabase().storage.from(BUCKET).createSignedUrl(path, UMUR_URL_BUKTI)
  if (error) throw new Error(pesanGalat(error.message))
  return data.signedUrl
}

export async function masuk(email: string, password: string): Promise<void> {
  const { error } = await supabase().auth.signInWithPassword({ email: email.trim(), password })
  if (error) throw new Error(pesanGalat(error.message))
}
