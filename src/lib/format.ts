const angka = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 })

/** 1250000 -> "Rp 1.250.000", -5000 -> "-Rp 5.000" */
export function formatRupiah(n: number): string {
  const nilai = Math.round(n)
  const teks = `Rp ${angka.format(Math.abs(nilai))}`
  return nilai < 0 ? `-${teks}` : teks
}

/** Untuk input jumlah: "1250000" -> "1.250.000". Kosong tetap kosong. */
export function formatInputAngka(teks: string): string {
  const digit = teks.replace(/\D/g, '').replace(/^0+(?=\d)/, '')
  if (digit === '') return ''
  return angka.format(Number(digit))
}

/** "1.250.000" -> 1250000. Teks tanpa angka -> 0. */
export function parseAngka(teks: string): number {
  const digit = teks.replace(/\D/g, '')
  return digit === '' ? 0 : Number(digit)
}

const BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

function pecahTanggal(iso: string): [number, number, number] {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  if (!m) throw new Error(`Tanggal tidak valid: ${iso}`)
  return [Number(m[1]), Number(m[2]), Number(m[3])]
}

/** "2026-11-24" -> "24 November 2026" */
export function formatTanggal(iso: string): string {
  const [t, b, h] = pecahTanggal(iso)
  return `${h} ${BULAN[b - 1]} ${t}`
}

/** "2026-11-24" -> "24 Nov 2026" */
export function formatTanggalPendek(iso: string): string {
  const [t, b, h] = pecahTanggal(iso)
  return `${h} ${BULAN[b - 1].slice(0, 3)} ${t}`
}

/** "2026-11" -> "November 2026" */
export function formatBulan(tahun: number, bulan: number): string {
  return `${BULAN[bulan - 1]} ${tahun}`
}

/** Tanggal hari ini di Asia/Jakarta, format YYYY-MM-DD. */
export function hariIniJakarta(sekarang: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(sekarang)
}

/** Rentang bulan berjalan di Asia/Jakarta: [tanggal 1, tanggal terakhir]. */
export function rentangBulanIni(sekarang: Date = new Date()): [string, string] {
  const [t, b] = pecahTanggal(hariIniJakarta(sekarang))
  const akhir = new Date(Date.UTC(t, b, 0)).getUTCDate()
  const bb = String(b).padStart(2, '0')
  return [`${t}-${bb}-01`, `${t}-${bb}-${String(akhir).padStart(2, '0')}`]
}
