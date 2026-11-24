import { describe, expect, it } from 'vitest'
import { polaCari } from '../src/lib/api'
import { ringkasBeranda } from '../src/lib/beranda'
import type { Kas } from '../src/lib/types'

const kas = (p: Partial<Kas> & Pick<Kas, 'id' | 'buku' | 'saldo'>): Kas => ({
  nama: p.id,
  jenis: 'tunai',
  saldo_awal: 0,
  aktif: true,
  urutan: 0,
  ...p,
})

describe('ringkasan beranda', () => {
  const kasList = [
    kas({ id: 'Rekening', buku: 'kas', saldo: 1_000_000, urutan: 2 }),
    kas({ id: 'Kas Tunai', buku: 'kas', saldo: 250_000, urutan: 1 }),
    kas({ id: 'Lama', buku: 'kas', saldo: 0, aktif: false }),
    kas({ id: 'Lama bersaldo', buku: 'kas', saldo: 5_000, aktif: false, urutan: 3 }),
    kas({ id: 'Tunai DIPA', buku: 'dipa', saldo: 3_000_000 }),
  ]
  const bulanIni = [
    { buku: 'kas' as const, jenis: 'masuk' as const, jumlah: 200_000 },
    { buku: 'kas' as const, jenis: 'keluar' as const, jumlah: 50_000 },
    { buku: 'kas' as const, jenis: 'pindah' as const, jumlah: 999_999 },
    { buku: 'dipa' as const, jenis: 'keluar' as const, jumlah: 700_000 },
  ]
  const [hima, dipa] = ringkasBeranda(kasList, bulanIni)

  it('memisahkan dua buku dan mengurutkan kas', () => {
    expect(hima.nama).toBe('Kas HIMA')
    expect(hima.kas.map((k) => k.nama)).toEqual(['Kas Tunai', 'Rekening', 'Lama bersaldo'])
    expect(dipa.kas.map((k) => k.nama)).toEqual(['Tunai DIPA'])
  })

  it('saldo buku adalah jumlah saldo kasnya, kas nonaktif kosong disembunyikan', () => {
    expect(hima.saldo).toBe(1_255_000)
    expect(dipa.saldo).toBe(3_000_000)
  })

  it('pindah tidak dihitung sebagai masuk atau keluar bulan ini', () => {
    expect([hima.masukBulanIni, hima.keluarBulanIni]).toEqual([200_000, 50_000])
    expect([dipa.masukBulanIni, dipa.keluarBulanIni]).toEqual([0, 700_000])
  })
})

describe('pola pencarian', () => {
  it('membungkus dengan wildcard dan meng-escape % serta _', () => {
    expect(polaCari('  konsumsi ')).toBe('%konsumsi%')
    expect(polaCari('50%_x')).toBe('%50\\%\\_x%')
  })
})
