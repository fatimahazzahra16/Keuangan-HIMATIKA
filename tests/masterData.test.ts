import { describe, expect, it } from 'vitest'
import {
  adaGalat,
  barisKas,
  barisKategori,
  barisProker,
  pesanGalatMaster,
  rapikanNama,
  tanggalValid,
  validasiKas,
  validasiKategori,
  validasiProker,
  type BarisAda,
  type IsianKas,
  type IsianKategori,
  type IsianProker,
} from '../src/lib/masterData'

const kasDasar: IsianKas = { buku: 'kas', nama: 'Kas Tunai', jenis: 'tunai', saldoAwal: 0, urutan: 1 }
const ada: BarisAda[] = [
  { id: 'k1', buku: 'kas', nama: 'Kas Tunai' },
  { id: 'k2', buku: 'dipa', nama: 'Rekening Dipa' },
]

describe('rapikanNama', () => {
  it('membuang spasi di ujung dan spasi ganda', () => {
    expect(rapikanNama('  Kas   Tunai  ')).toBe('Kas Tunai')
  })
})

describe('tanggalValid', () => {
  it('menerima tanggal nyata dan menolak tanggal mustahil', () => {
    expect(tanggalValid('2026-02-28')).toBe(true)
    expect(tanggalValid('2026-02-30')).toBe(false)
    expect(tanggalValid('2026-2-1')).toBe(false)
    expect(tanggalValid('')).toBe(false)
  })
})

describe('validasiKas', () => {
  it('lolos untuk isian wajar', () => {
    expect(adaGalat(validasiKas({ ...kasDasar, nama: 'Kas Baru' }, ada))).toBe(false)
  })
  it('menolak nama kosong dan terlalu panjang', () => {
    expect(validasiKas({ ...kasDasar, nama: '   ' }, ada).nama).toBe('Isi nama.')
    expect(validasiKas({ ...kasDasar, nama: 'a'.repeat(61) }, ada).nama).toMatch(/maksimal/)
  })
  it('menolak nama ganda di buku yang sama tanpa peduli huruf besar dan spasi', () => {
    expect(validasiKas({ ...kasDasar, nama: ' kas   tunai ' }, ada).nama).toMatch(/sudah ada/)
  })
  it('boleh nama sama di buku lain', () => {
    expect(validasiKas({ ...kasDasar, buku: 'dipa' }, ada).nama).toBeUndefined()
  })
  it('tidak menganggap baris yang sedang diubah sebagai ganda', () => {
    expect(validasiKas(kasDasar, ada, 'k1').nama).toBeUndefined()
  })
  it('menolak saldo awal minus, pecahan, dan terlalu besar', () => {
    expect(validasiKas({ ...kasDasar, nama: 'X', saldoAwal: -1 }, ada).saldoAwal).toBeDefined()
    expect(validasiKas({ ...kasDasar, nama: 'X', saldoAwal: 1.5 }, ada).saldoAwal).toBeDefined()
    expect(validasiKas({ ...kasDasar, nama: 'X', saldoAwal: 10_000_000_001 }, ada).saldoAwal).toMatch(/terlalu besar/)
  })
  it('menolak urutan di luar 0 sampai 999', () => {
    expect(validasiKas({ ...kasDasar, nama: 'X', urutan: 1000 }, ada).urutan).toBeDefined()
    expect(validasiKas({ ...kasDasar, nama: 'X', urutan: -1 }, ada).urutan).toBeDefined()
  })
})

describe('validasiKategori', () => {
  const adaKat: BarisAda[] = [{ id: 'c1', buku: 'kas', nama: 'Iuran', berlaku: 'masuk' }]
  const isi: IsianKategori = { buku: 'kas', nama: 'Iuran', berlaku: 'masuk', urutan: 0 }
  it('menolak ganda pada arah yang sama', () => {
    expect(validasiKategori(isi, adaKat).nama).toMatch(/sudah ada/)
  })
  it('boleh nama sama untuk arah lain', () => {
    expect(validasiKategori({ ...isi, berlaku: 'keluar' }, adaKat).nama).toBeUndefined()
  })
})

describe('validasiProker', () => {
  const isi: IsianProker = { buku: 'kas', nama: 'Makrab', tanggalMulai: '2026-03-01', tanggalSelesai: '' }
  it('lolos tanpa tanggal selesai', () => {
    expect(adaGalat(validasiProker(isi, []))).toBe(false)
  })
  it('wajib tanggal mulai', () => {
    expect(validasiProker({ ...isi, tanggalMulai: '' }, []).tanggalMulai).toBeDefined()
  })
  it('menolak tanggal selesai sebelum mulai', () => {
    expect(validasiProker({ ...isi, tanggalSelesai: '2026-02-01' }, []).tanggalSelesai).toMatch(/sebelum/)
  })
})

describe('bentuk baris database', () => {
  it('menyertakan buku hanya saat membuat baru', () => {
    expect(barisKas(kasDasar, true)).toHaveProperty('buku', 'kas')
    expect(barisKas(kasDasar, false)).not.toHaveProperty('buku')
    expect(barisKategori({ buku: 'dipa', nama: ' A ', berlaku: 'keluar', urutan: 2 }, false)).toEqual({
      nama: 'A',
      berlaku: 'keluar',
      urutan: 2,
    })
  })
  it('mengubah tanggal selesai kosong jadi null', () => {
    expect(barisProker({ buku: 'kas', nama: 'P', tanggalMulai: '2026-01-01', tanggalSelesai: '' }, true).tanggal_selesai).toBeNull()
  })
})

describe('pesanGalatMaster', () => {
  it('menerjemahkan galat yang dikenal', () => {
    expect(pesanGalatMaster('duplicate key value violates unique constraint "kas_buku_nama_key"')).toMatch(/sudah dipakai/)
    expect(pesanGalatMaster('update or delete on table "kas" violates foreign key constraint')).toMatch(/Arsipkan/)
  })
  it('mengembalikan null untuk galat lain', () => {
    expect(pesanGalatMaster('network error')).toBeNull()
  })
})
