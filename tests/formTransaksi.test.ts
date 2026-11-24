import { describe, expect, it } from 'vitest'
import { keBaris, pathBukti, pesanGalat, rapikan, validasi, type IsianTransaksi, type Referensi } from '../src/lib/formTransaksi'

const ref: Referensi = {
  kas: [
    { id: 'k-tunai', buku: 'kas', nama: 'Tunai' },
    { id: 'k-bank', buku: 'kas', nama: 'Rekening' },
    { id: 'd-bank', buku: 'dipa', nama: 'Rekening DIPA' },
  ],
  kategori: [
    { id: 'c-iuran', buku: 'kas', nama: 'Iuran', berlaku: 'masuk' },
    { id: 'c-konsumsi', buku: 'kas', nama: 'Konsumsi', berlaku: 'keluar' },
    { id: 'c-dipa-masuk', buku: 'dipa', nama: 'Pencairan', berlaku: 'masuk' },
  ],
  proker: [
    { id: 'p-makrab', buku: 'kas', nama: 'Makrab' },
    { id: 'p-seminar', buku: 'dipa', nama: 'Seminar' },
  ],
}

const dasar: IsianTransaksi = {
  buku: 'kas',
  jenis: 'masuk',
  tanggal: '2026-11-20',
  jumlah: 50_000,
  kasId: 'k-tunai',
  kasTujuanId: '',
  kategoriId: 'c-iuran',
  prokerId: '',
  keterangan: '',
}
const HARI_INI = '2026-11-24'

describe('validasi', () => {
  it('isian lengkap lolos, keterangan boleh kosong', () => {
    expect(validasi(dasar, ref, HARI_INI)).toEqual({})
  })

  it('menolak tanggal masa depan dan tanggal mustahil', () => {
    expect(validasi({ ...dasar, tanggal: '2026-11-25' }, ref, HARI_INI).tanggal).toBeTruthy()
    expect(validasi({ ...dasar, tanggal: '2026-02-30' }, ref, HARI_INI).tanggal).toBeTruthy()
    expect(validasi({ ...dasar, tanggal: '' }, ref, HARI_INI).tanggal).toBeTruthy()
    expect(validasi({ ...dasar, tanggal: HARI_INI }, ref, HARI_INI).tanggal).toBeUndefined()
  })

  it('jumlah harus bulat, positif, dan masuk akal', () => {
    expect(validasi({ ...dasar, jumlah: 0 }, ref, HARI_INI).jumlah).toBeTruthy()
    expect(validasi({ ...dasar, jumlah: -10 }, ref, HARI_INI).jumlah).toBeTruthy()
    expect(validasi({ ...dasar, jumlah: 10.5 }, ref, HARI_INI).jumlah).toBeTruthy()
    expect(validasi({ ...dasar, jumlah: 10_000_000_001 }, ref, HARI_INI).jumlah).toBeTruthy()
  })

  it('kas dan kategori harus dari buku yang sama', () => {
    expect(validasi({ ...dasar, kasId: 'd-bank' }, ref, HARI_INI).kasId).toBeTruthy()
    expect(validasi({ ...dasar, kategoriId: 'c-dipa-masuk' }, ref, HARI_INI).kategoriId).toBeTruthy()
  })

  it('kategori harus cocok dengan jenis', () => {
    expect(validasi({ ...dasar, kategoriId: 'c-konsumsi' }, ref, HARI_INI).kategoriId).toBeTruthy()
    expect(validasi({ ...dasar, jenis: 'keluar', kategoriId: 'c-konsumsi' }, ref, HARI_INI)).toEqual({})
  })

  it('pindah dana: tujuan wajib, satu buku, dan berbeda dari asal', () => {
    const pindah = { ...dasar, jenis: 'pindah' as const, kategoriId: '' }
    expect(validasi(pindah, ref, HARI_INI).kasTujuanId).toBeTruthy()
    expect(validasi({ ...pindah, kasTujuanId: 'k-tunai' }, ref, HARI_INI).kasTujuanId).toBeTruthy()
    expect(validasi({ ...pindah, kasTujuanId: 'd-bank' }, ref, HARI_INI).kasTujuanId).toBeTruthy()
    expect(validasi({ ...pindah, kasTujuanId: 'k-bank' }, ref, HARI_INI)).toEqual({})
  })

  it('proker opsional tapi harus dari buku yang sama', () => {
    expect(validasi({ ...dasar, prokerId: 'p-makrab' }, ref, HARI_INI)).toEqual({})
    expect(validasi({ ...dasar, prokerId: 'p-seminar' }, ref, HARI_INI).prokerId).toBeTruthy()
  })

  it('membatasi panjang keterangan', () => {
    expect(validasi({ ...dasar, keterangan: 'a'.repeat(501) }, ref, HARI_INI).keterangan).toBeTruthy()
  })
})

describe('keBaris', () => {
  it('masuk/keluar mengosongkan kas tujuan', () => {
    expect(keBaris({ ...dasar, kasTujuanId: 'k-bank', keterangan: '  iuran Nov  ' })).toEqual({
      jenis: 'masuk',
      tanggal: '2026-11-20',
      jumlah: 50_000,
      kas_id: 'k-tunai',
      kas_tujuan_id: null,
      kategori_id: 'c-iuran',
      proker_id: null,
      keterangan: 'iuran Nov',
    })
  })

  it('pindah mengosongkan kategori', () => {
    const b = keBaris({ ...dasar, jenis: 'pindah', kasTujuanId: 'k-bank', prokerId: 'p-makrab' })
    expect(b.kategori_id).toBeNull()
    expect(b.kas_tujuan_id).toBe('k-bank')
    expect(b.proker_id).toBe('p-makrab')
  })
})

describe('rapikan', () => {
  it('ganti buku membuang pilihan dari buku lama', () => {
    const r = rapikan({ ...dasar, buku: 'dipa', prokerId: 'p-makrab' }, ref)
    expect(r.kasId).toBe('')
    expect(r.kategoriId).toBe('')
    expect(r.prokerId).toBe('')
  })

  it('ganti jenis membuang kategori yang tidak cocok', () => {
    expect(rapikan({ ...dasar, jenis: 'keluar' }, ref).kategoriId).toBe('')
    expect(rapikan({ ...dasar, jenis: 'pindah' }, ref).kategoriId).toBe('')
  })

  it('pilihan yang masih berlaku dipertahankan', () => {
    expect(rapikan({ ...dasar, prokerId: 'p-makrab' }, ref)).toEqual({ ...dasar, prokerId: 'p-makrab' })
  })
})

describe('pesanGalat', () => {
  it('menerjemahkan galat umum', () => {
    expect(pesanGalat('Invalid login credentials')).toBe('Email atau password salah.')
    expect(pesanGalat('new row violates row-level security policy for table "transaksi"')).toMatch(/izin/)
    expect(pesanGalat('TypeError: Failed to fetch')).toMatch(/koneksi/)
    expect(pesanGalat('JWT expired')).toMatch(/Sesi/)
  })

  it('pesan lain diteruskan apa adanya', () => {
    expect(pesanGalat('Kas tujuan harus di buku yang sama')).toBe('Kas tujuan harus di buku yang sama')
  })
})

describe('pathBukti', () => {
  it('memakai tahun, id transaksi, dan nama acak', () => {
    expect(pathBukti('2026-11-20', 'trx1', 'abc', 'JPG')).toBe('2026/trx1/abc.jpg')
  })

  it('membersihkan ekstensi', () => {
    expect(pathBukti('2026-11-20', 'trx1', 'abc', '../x')).toBe('2026/trx1/abc.x')
    expect(pathBukti('', 'trx1', 'abc', '')).toBe('lain/trx1/abc.jpg')
  })
})
