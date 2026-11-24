import { formatTanggalPendek } from '../lib/format'
import { NAMA_BUKU, type Transaksi } from '../lib/types'
import { LabelJenis, Nominal } from './ui'

function keteranganKas(t: Transaksi): string {
  if (t.jenis === 'pindah') return `${t.kas_nama ?? '-'} ke ${t.kas_tujuan_nama ?? '-'}`
  return t.kas_nama ?? '-'
}

export function ItemTransaksi({ t, tampilTanggal = true, tampilBuku = false }: { t: Transaksi; tampilTanggal?: boolean; tampilBuku?: boolean }) {
  const judul = t.keterangan.trim() || (t.jenis === 'pindah' ? 'Pindah dana' : (t.kategori_nama ?? 'Tanpa keterangan'))
  const detail = [
    t.jenis === 'pindah' ? null : (t.kategori_nama ?? 'Tanpa kategori'),
    keteranganKas(t),
    t.proker_nama,
  ].filter(Boolean)
  return (
    <li className="flex items-start justify-between gap-3 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-slate-900">{judul}</p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-slate-500">
          <LabelJenis jenis={t.jenis} />
          {tampilTanggal && <span>{formatTanggalPendek(t.tanggal)}</span>}
          {tampilBuku && <span className="font-medium text-navy">{NAMA_BUKU[t.buku]}</span>}
          <span className="truncate">{detail.join(' · ')}</span>
        </p>
      </div>
      <Nominal jumlah={t.jumlah} jenis={t.jenis} className="text-sm" />
    </li>
  )
}
