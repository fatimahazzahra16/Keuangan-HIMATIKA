import ExcelJS from 'exceljs'
import { NAMA_ORGANISASI, URL_LOGO, muatGambar, type DokumenEkspor } from './ekspor'

const FORMAT_RP = '"Rp" #,##0;-"Rp" #,##0'
const NAVY = 'FF1F2A5A'
const NAVY_MUDA = 'FFE8EBF5'

/** Buat berkas .xlsx dari dokumen laporan. Logo opsional: kalau gagal dimuat, kop tetap jalan tanpa logo. */
export async function buatExcel(dok: DokumenEkspor): Promise<Blob> {
  const wb = new ExcelJS.Workbook()
  wb.creator = NAMA_ORGANISASI
  wb.created = new Date()
  const ws = wb.addWorksheet('Laporan', {
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  })
  ws.columns = [
    { width: 6 },
    { width: 14 },
    { width: 40 },
    { width: 22 },
    { width: 24 },
    { width: 16 },
    { width: 16 },
    { width: 18 },
  ]

  try {
    const logo = await muatGambar(URL_LOGO)
    const id = wb.addImage({ base64: logo.data, extension: 'png' })
    ws.addImage(id, { tl: { col: 0, row: 0 }, ext: { width: 64, height: 64 } })
  } catch {
    // tanpa logo
  }

  const kop = (teks: string, ukuran: number, tebal: boolean) => {
    const r = ws.addRow(['', '', teks])
    r.getCell(3).font = { size: ukuran, bold: tebal, color: { argb: NAVY } }
    r.height = ukuran + 8
  }
  kop(NAMA_ORGANISASI, 14, true)
  kop(dok.info.judul, 12, true)
  kop(dok.info.periode, 11, false)
  ws.addRow([])

  const kepala = ws.addRow(dok.kepala)
  kepala.eachCell((c, i) => {
    c.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } }
    c.alignment = { vertical: 'middle', horizontal: i >= 6 ? 'right' : 'left' }
  })
  const barisKepala = kepala.number
  for (const b of dok.baris) {
    const r = ws.addRow([b.no ?? '', b.tanggal, b.keterangan, b.kategori, b.kas, b.masuk ?? '', b.keluar ?? '', b.saldo])
    for (const k of [6, 7, 8]) r.getCell(k).numFmt = FORMAT_RP
    r.getCell(3).alignment = { wrapText: true, vertical: 'top' }
    if (b.no === null) r.font = { italic: true, color: { argb: 'FF64748B' } }
  }
  ws.views = [{ state: 'frozen', ySplit: barisKepala }]
  ws.autoFilter = { from: { row: barisKepala, column: 1 }, to: { row: barisKepala, column: 8 } }

  ws.addRow([])
  const judulBagian = (teks: string) => {
    const r = ws.addRow(['', '', teks])
    r.getCell(3).font = { bold: true, color: { argb: NAVY } }
    r.getCell(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY_MUDA } }
  }
  judulBagian('Ringkasan')
  for (const s of dok.ringkasan) {
    const r = ws.addRow(['', '', s.label, '', '', '', '', s.nilai])
    r.getCell(8).numFmt = FORMAT_RP
    r.getCell(8).font = { bold: true }
  }
  for (const [judul, isi] of [
    ['Rekap pemasukan per kategori', dok.rekapMasuk],
    ['Rekap pengeluaran per kategori', dok.rekapKeluar],
  ] as const) {
    ws.addRow([])
    judulBagian(judul)
    if (isi.length === 0) ws.addRow(['', '', 'Tidak ada.'])
    for (const k of isi) {
      const r = ws.addRow(['', '', k.nama, '', '', '', '', k.total])
      r.getCell(8).numFmt = FORMAT_RP
    }
    if (isi.length > 0) {
      const r = ws.addRow(['', '', 'Total', '', '', '', '', isi.reduce((s, k) => s + k.total, 0)])
      r.getCell(8).numFmt = FORMAT_RP
      r.font = { bold: true }
    }
  }
  ws.addRow([])
  for (const c of dok.catatan) ws.addRow(['', '', c]).getCell(3).font = { size: 9, color: { argb: 'FF64748B' } }

  const buf = await wb.xlsx.writeBuffer()
  return new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}
