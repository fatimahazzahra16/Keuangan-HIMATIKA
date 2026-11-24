import { jsPDF } from 'jspdf'
import { autoTable } from 'jspdf-autotable'
import { NAMA_ORGANISASI, URL_LOGO, barisTeks, muatGambar, type DokumenEkspor } from './ekspor'
import { formatRupiah } from './format'

const NAVY: [number, number, number] = [31, 42, 90]
const NAVY_MUDA: [number, number, number] = [232, 235, 245]
const ABU: [number, number, number] = [100, 116, 139]
const TEPI = 12

/** Satu foto bukti untuk lampiran PDF versi bendahara. */
export interface LampiranFoto {
  keterangan: string
  data: string
  lebar: number
  tinggi: number
}

type DocTabel = jsPDF & { lastAutoTable?: { finalY: number } }

function yAkhir(doc: DocTabel, cadangan: number): number {
  return doc.lastAutoTable?.finalY ?? cadangan
}

function formatGambar(data: string): 'PNG' | 'JPEG' | 'WEBP' {
  if (data.startsWith('data:image/png')) return 'PNG'
  if (data.startsWith('data:image/webp')) return 'WEBP'
  return 'JPEG'
}

export async function buatPdf(dok: DokumenEkspor, lampiran: LampiranFoto[] = []): Promise<Blob> {
  const doc: DocTabel = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const lebarHal = doc.internal.pageSize.getWidth()
  const tinggiHal = doc.internal.pageSize.getHeight()

  // Kop
  let xTeks = TEPI
  try {
    const logo = await muatGambar(URL_LOGO)
    doc.addImage(logo.data, 'PNG', TEPI, 8, 20, 20)
    xTeks = TEPI + 24
  } catch {
    // tanpa logo
  }
  doc.setTextColor(...NAVY)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text(NAMA_ORGANISASI, xTeks, 14)
  doc.setFontSize(12)
  doc.text(dok.info.judul, xTeks, 20.5)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(dok.info.periode, xTeks, 26)
  doc.setDrawColor(...NAVY)
  doc.setLineWidth(0.6)
  doc.line(TEPI, 31, lebarHal - TEPI, 31)

  const kanan = { halign: 'right' as const }
  autoTable(doc, {
    startY: 35,
    margin: { left: TEPI, right: TEPI },
    head: [dok.kepala],
    body: dok.baris.map(barisTeks),
    styles: { fontSize: 8, cellPadding: 1.6, overflow: 'linebreak', textColor: [15, 23, 42] },
    headStyles: { fillColor: NAVY, textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 22 },
      2: { cellWidth: 'auto' },
      3: { cellWidth: 34 },
      4: { cellWidth: 38 },
      5: { ...kanan, cellWidth: 28 },
      6: { ...kanan, cellWidth: 28 },
      7: { ...kanan, cellWidth: 30 },
    },
    didParseCell: (d) => {
      if (d.section === 'head' && d.column.index >= 5) d.cell.styles.halign = 'right'
      if (d.section === 'body' && d.column.index === 5 && d.cell.text.join('')) d.cell.styles.textColor = [21, 128, 61]
      if (d.section === 'body' && d.column.index === 6 && d.cell.text.join('')) d.cell.styles.textColor = [185, 28, 28]
      if (d.section === 'body' && d.row.index === 0 && dok.baris[0]?.no === null) d.cell.styles.fontStyle = 'italic'
    },
  })
  if (dok.baris.length === 0) {
    doc.setFontSize(9)
    doc.setTextColor(...ABU)
    doc.text('Tidak ada transaksi di laporan ini.', TEPI, yAkhir(doc, 40) + 6)
  }

  // Ringkasan + rekap kategori, tiga tabel kecil
  const lebarKecil = (lebarHal - TEPI * 2 - 8) / 3
  let y = yAkhir(doc, 40) + 8
  if (y > tinggiHal - 50) {
    doc.addPage()
    y = 16
  }
  const tabelKecil = (judul: string, isi: [string, string][], kolom: number, tebalAkhir: boolean) => {
    autoTable(doc, {
      startY: y,
      margin: { left: TEPI + kolom * (lebarKecil + 4) },
      tableWidth: lebarKecil,
      head: [[judul, '']],
      body: isi.length > 0 ? isi : [['Tidak ada.', '']],
      styles: { fontSize: 8, cellPadding: 1.4 },
      headStyles: { fillColor: NAVY_MUDA, textColor: NAVY, fontStyle: 'bold' },
      columnStyles: { 1: { halign: 'right', cellWidth: 30 } },
      didParseCell: (d) => {
        if (tebalAkhir && d.section === 'body' && d.row.index === isi.length - 1) d.cell.styles.fontStyle = 'bold'
      },
    })
  }
  const rekap = (isi: DokumenEkspor['rekapMasuk']): [string, string][] =>
    isi.length === 0
      ? []
      : [...isi.map((k): [string, string] => [k.nama, formatRupiah(k.total)]), ['Total', formatRupiah(isi.reduce((s, k) => s + k.total, 0))]]
  tabelKecil('Ringkasan', dok.ringkasan.map((s) => [s.label, formatRupiah(s.nilai)]), 0, true)
  const yRingkasan = yAkhir(doc, y)
  tabelKecil('Rekap pemasukan per kategori', rekap(dok.rekapMasuk), 1, dok.rekapMasuk.length > 0)
  const yMasuk = yAkhir(doc, y)
  tabelKecil('Rekap pengeluaran per kategori', rekap(dok.rekapKeluar), 2, dok.rekapKeluar.length > 0)
  const yKeluar = yAkhir(doc, y)

  doc.setFontSize(8)
  doc.setTextColor(...ABU)
  let yCatatan = Math.max(yRingkasan, yMasuk, yKeluar) + 6
  for (const c of dok.catatan) {
    if (yCatatan > tinggiHal - 12) {
      doc.addPage()
      yCatatan = 16
    }
    doc.text(c, TEPI, yCatatan)
    yCatatan += 4.5
  }

  // Lampiran foto bukti (hanya versi bendahara)
  lampiran.forEach((f, i) => {
    doc.addPage()
    doc.setTextColor(...NAVY)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text(`Lampiran ${i + 1}`, TEPI, 14)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    const ket = doc.splitTextToSize(f.keterangan, lebarHal - TEPI * 2) as string[]
    doc.text(ket, TEPI, 20)
    const atas = 20 + ket.length * 4 + 3
    const maksL = lebarHal - TEPI * 2
    const maksT = tinggiHal - atas - TEPI
    const skala = Math.min(maksL / f.lebar, maksT / f.tinggi)
    const l = f.lebar * skala
    const t = f.tinggi * skala
    doc.addImage(f.data, formatGambar(f.data), (lebarHal - l) / 2, atas, l, t, undefined, 'MEDIUM')
  })

  // Nomor halaman
  const total = doc.getNumberOfPages()
  for (let h = 1; h <= total; h++) {
    doc.setPage(h)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...ABU)
    doc.text(`${dok.info.judul}  |  Halaman ${h} dari ${total}`, lebarHal - TEPI, tinggiHal - 6, { align: 'right' })
  }

  return doc.output('blob')
}
