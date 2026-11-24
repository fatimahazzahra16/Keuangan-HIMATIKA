import { supabase } from './supabase'
import type { Buku, JenisTransaksi, Kas, Transaksi } from './types'

// Semua query di file ini hanya membaca view publik (v_*). Tabel dasar tidak bisa dibaca anon.

export interface Kategori {
  id: string
  buku: Buku
  nama: string
  berlaku: 'masuk' | 'keluar'
  aktif: boolean
  urutan: number
}

export interface Proker {
  id: string
  buku: Buku
  nama: string
  tanggal_mulai: string
  tanggal_selesai: string | null
  status: 'aktif' | 'arsip'
}

const KOLOM_TRX =
  'id,jenis,tanggal,jumlah,buku,kas_id,kas_nama,kas_tujuan_id,kas_tujuan_nama,kategori_id,kategori_nama,proker_id,proker_nama,keterangan,created_at'

/** Batas baris per permintaan PostgREST (default Supabase 1000). */
const HALAMAN = 1000

function pastikan<T>(hasil: { data: T | null; error: { message: string } | null }): T {
  if (hasil.error) throw new Error(hasil.error.message)
  return hasil.data as T
}

export async function ambilKas(): Promise<Kas[]> {
  const res = await supabase()
    .from('v_kas_publik')
    .select('id,buku,nama,jenis,aktif,urutan,saldo_awal,saldo')
    .order('buku')
    .order('urutan')
    .order('nama')
  return pastikan(res) as Kas[]
}

export async function ambilKategori(): Promise<Kategori[]> {
  const res = await supabase()
    .from('v_kategori_publik')
    .select('id,buku,nama,berlaku,aktif,urutan')
    .order('urutan')
    .order('nama')
  return pastikan(res) as Kategori[]
}

export async function ambilProker(): Promise<Proker[]> {
  const res = await supabase()
    .from('v_proker_publik')
    .select('id,buku,nama,tanggal_mulai,tanggal_selesai,status')
    .order('tanggal_mulai', { ascending: false })
    .order('nama')
  return pastikan(res) as Proker[]
}

export async function ambilTransaksiTerbaru(jumlah: number): Promise<Transaksi[]> {
  const res = await supabase()
    .from('v_transaksi_publik')
    .select(KOLOM_TRX)
    .order('tanggal', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(jumlah)
  return pastikan(res) as Transaksi[]
}

export interface FilterRiwayat {
  buku?: Buku
  kasId?: string
  jenis?: JenisTransaksi
  kategoriId?: string
  prokerId?: string
  dari?: string
  sampai?: string
  cari?: string
}

/** Escape karakter wildcard agar teks pencarian dicari apa adanya. */
export function polaCari(teks: string): string {
  return `%${teks.trim().replace(/[\\%_]/g, (c) => `\\${c}`)}%`
}

/**
 * Satu halaman riwayat, terbaru dulu. Mengambil `batas + 1` baris untuk tahu
 * apakah masih ada halaman berikutnya.
 */
export async function ambilRiwayat(
  f: FilterRiwayat,
  mulai: number,
  batas: number,
): Promise<{ baris: Transaksi[]; adaLagi: boolean }> {
  let q = supabase().from('v_transaksi_publik').select(KOLOM_TRX)
  if (f.buku) q = q.eq('buku', f.buku)
  if (f.kasId) q = q.or(`kas_id.eq.${f.kasId},kas_tujuan_id.eq.${f.kasId}`)
  if (f.jenis) q = q.eq('jenis', f.jenis)
  if (f.kategoriId) q = q.eq('kategori_id', f.kategoriId)
  if (f.prokerId) q = q.eq('proker_id', f.prokerId)
  if (f.dari) q = q.gte('tanggal', f.dari)
  if (f.sampai) q = q.lte('tanggal', f.sampai)
  if (f.cari?.trim()) q = q.ilike('keterangan', polaCari(f.cari))
  const res = await q
    .order('tanggal', { ascending: false })
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .range(mulai, mulai + batas)
  const data = pastikan(res) as Transaksi[]
  return { baris: data.slice(0, batas), adaLagi: data.length > batas }
}

/** Ambil semua baris (berhalaman) untuk perhitungan laporan. */
function kueriTrx() {
  return supabase().from('v_transaksi_publik').select(KOLOM_TRX)
}
type KueriTrx = ReturnType<typeof kueriTrx>

async function ambilSemua(susun: (q: KueriTrx) => KueriTrx): Promise<Transaksi[]> {
  const hasil: Transaksi[] = []
  for (let mulai = 0; ; mulai += HALAMAN) {
    const q = susun(kueriTrx())
    const res = await q
      .order('tanggal')
      .order('created_at')
      .order('id')
      .range(mulai, mulai + HALAMAN - 1)
    const data = pastikan(res) as unknown as Transaksi[]
    hasil.push(...data)
    if (data.length < HALAMAN) return hasil
  }
}

/** Semua transaksi satu buku sampai tanggal tertentu (untuk saldo awal dan laporan). */
export function ambilTransaksiBukuSampai(buku: Buku, sampai: string): Promise<Transaksi[]> {
  return ambilSemua((q) => q.eq('buku', buku).lte('tanggal', sampai))
}

/** Semua transaksi dalam rentang tanggal, dua buku sekaligus. */
export function ambilTransaksiRentang(dari: string, sampai: string): Promise<Transaksi[]> {
  return ambilSemua((q) => q.gte('tanggal', dari).lte('tanggal', sampai))
}

export function ambilTransaksiProker(prokerId: string): Promise<Transaksi[]> {
  return ambilSemua((q) => q.eq('proker_id', prokerId))
}
