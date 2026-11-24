import type { ReactNode } from 'react'
import { formatRupiah } from '../lib/format'
import type { JenisTransaksi } from '../lib/types'

export function Kartu({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 ${className}`}>{children}</section>
}

export function JudulBagian({ children, aksi }: { children: ReactNode; aksi?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <h2 className="text-base font-semibold text-navy">{children}</h2>
      {aksi}
    </div>
  )
}

const WARNA: Record<JenisTransaksi, string> = {
  masuk: 'text-masuk',
  keluar: 'text-keluar',
  pindah: 'text-netral',
}

/** Nominal dengan warna sesuai jenis. Masuk diberi "+", keluar "-". */
export function Nominal({ jumlah, jenis, className = '' }: { jumlah: number; jenis: JenisTransaksi; className?: string }) {
  const tanda = jenis === 'masuk' ? '+' : jenis === 'keluar' ? '-' : ''
  return (
    <span className={`whitespace-nowrap font-semibold tabular-nums ${WARNA[jenis]} ${className}`}>
      {tanda}
      {formatRupiah(jumlah)}
    </span>
  )
}

export function LabelJenis({ jenis }: { jenis: JenisTransaksi }) {
  const gaya: Record<JenisTransaksi, string> = {
    masuk: 'bg-green-50 text-masuk ring-green-200',
    keluar: 'bg-red-50 text-keluar ring-red-200',
    pindah: 'bg-slate-100 text-netral ring-slate-200',
  }
  const teks: Record<JenisTransaksi, string> = { masuk: 'Masuk', keluar: 'Keluar', pindah: 'Pindah' }
  return (
    <span className={`inline-flex rounded px-1.5 py-0.5 text-[11px] font-medium ring-1 ${gaya[jenis]}`}>{teks[jenis]}</span>
  )
}

export function Memuat({ baris = 3 }: { baris?: number }) {
  return (
    <div className="space-y-3" role="status" aria-label="Memuat data">
      {Array.from({ length: baris }, (_, i) => (
        <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-200/70" />
      ))}
    </div>
  )
}

export function Galat({ pesan, ulangi }: { pesan: string; ulangi?: () => void }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">
      <p className="font-medium">Data gagal dimuat.</p>
      <p className="mt-0.5 break-words text-red-700">{pesan}</p>
      {ulangi && (
        <button type="button" onClick={ulangi} className="mt-2 rounded-md bg-white px-3 py-1.5 font-medium text-red-800 ring-1 ring-red-200 hover:bg-red-100">
          Coba lagi
        </button>
      )}
    </div>
  )
}

export function Kosong({ children }: { children: ReactNode }) {
  return <p className="rounded-lg bg-slate-50 px-3 py-6 text-center text-sm text-slate-500">{children}</p>
}

export interface Opsi<T extends string> {
  nilai: T
  label: string
}

/** Tombol pilihan bersebelahan (misalnya Semua / Kas HIMA / Dana DIPA). */
export function PilihanSegmen<T extends string>({
  opsi,
  nilai,
  onPilih,
  label,
}: {
  opsi: Opsi<T>[]
  nilai: T
  onPilih: (v: T) => void
  label: string
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex rounded-lg bg-slate-100 p-1">
      {opsi.map((o) => {
        const aktif = o.nilai === nilai
        return (
          <button
            key={o.nilai}
            type="button"
            role="radio"
            aria-checked={aktif}
            onClick={() => onPilih(o.nilai)}
            className={`flex-1 rounded-md px-2 py-1.5 text-sm font-medium transition ${
              aktif ? 'bg-white text-navy shadow-sm' : 'text-slate-600 hover:text-navy'
            }`}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

export const kelasInput =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/20'

export function Bidang({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>
      {children}
    </label>
  )
}
