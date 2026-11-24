/**
 * Membuktikan bahwa pengunjung tanpa login (anon key) TIDAK bisa:
 *  - insert/update/delete transaksi maupun master data,
 *  - membaca tabel dasar, tabel bukti, atau foto di bucket "bukti".
 * dan BISA membaca view publik.
 *
 * Jalankan: npm run uji:anon   (membaca .env.local)
 * Keluar dengan kode 1 bila ada satu saja pemeriksaan yang gagal.
 */
import { createClient } from '@supabase/supabase-js'

const url = process.env.VITE_SUPABASE_URL
const anonKey = process.env.VITE_SUPABASE_ANON_KEY
if (!url || !anonKey) {
  console.error('Isi VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY di .env.local terlebih dahulu.')
  process.exit(2)
}
if (anonKey.includes('service_role') || decodeRole(anonKey) === 'service_role') {
  console.error('Key yang dipakai adalah service role key. Gunakan anon key.')
  process.exit(2)
}

const db = createClient(url, anonKey, { auth: { persistSession: false } })
const UUID_ACAK = '00000000-0000-4000-8000-000000000000'
let gagal = 0

function decodeRole(jwt: string): string | undefined {
  try {
    return JSON.parse(Buffer.from(jwt.split('.')[1], 'base64url').toString()).role
  } catch {
    return undefined
  }
}

function lapor(lulus: boolean, nama: string, detail = '') {
  if (!lulus) gagal += 1
  console.log(`${lulus ? 'LULUS' : 'GAGAL'}  ${nama}${detail ? `  (${detail})` : ''}`)
}

/** Error jaringan/konfigurasi tidak boleh dianggap "aman": hentikan tes. */
function pastikanTersambung(error: unknown) {
  const msg = String((error as { message?: string })?.message ?? error ?? '')
  if (/fetch failed|ENOTFOUND|ECONNREFUSED|network/i.test(msg)) {
    console.error(`\nTidak bisa menghubungi Supabase: ${msg}`)
    process.exit(2)
  }
}

/** Penolakan yang sah: hak akses ditolak oleh GRANT/RLS, bukan error lain (FK, validasi, dsb). */
function ditolakHakAkses(error: unknown): boolean {
  const e = error as { code?: string; message?: string } | null
  if (!e) return false
  return e.code === '42501' || /permission denied|row-level security|cannot (insert into|update|delete from) view/i.test(e.message ?? '')
}

/** Operasi tulis dianggap aman bila ditolak hak aksesnya, atau tidak mengubah satu baris pun. */
async function harusDitolak(nama: string, op: () => PromiseLike<{ error: unknown; data: unknown }>) {
  const { error, data } = await op()
  pastikanTersambung(error)
  const baris = Array.isArray(data) ? data.length : data ? 1 : 0
  const lulus = error ? ditolakHakAkses(error) : baris === 0
  const pesan = error ? (error as { message?: string }).message : `${baris} baris berubah`
  lapor(lulus, nama, pesan)
}

async function utama() {
  console.log(`Menguji ${url} dengan anon key\n`)

  // 1. View publik bisa dibaca
  for (const v of ['v_kas_publik', 'v_transaksi_publik', 'v_kategori_publik', 'v_proker_publik']) {
    const { error } = await db.from(v).select('*').limit(1)
    pastikanTersambung(error)
    lapor(!error, `anon bisa SELECT ${v}`, error?.message)
  }

  // 2. View publik tidak membocorkan kolom internal
  const { data: kolom } = await db.from('v_transaksi_publik').select('*').limit(1)
  const bocor = kolom?.[0] && ['created_by', 'storage_path', 'bukti'].some((k) => k in kolom[0])
  lapor(!bocor, 'v_transaksi_publik tanpa created_by/path bukti')
  const { error: eCreatedBy } = await db.from('v_transaksi_publik').select('created_by').limit(1)
  lapor(Boolean(eCreatedBy), 'kolom created_by tidak ada di view publik', eCreatedBy?.message)

  // 3. Tabel dasar tidak bisa dibaca anon
  for (const t of ['transaksi', 'bukti', 'admins', 'kas', 'kategori', 'proker']) {
    const { error, data } = await db.from(t).select('*').limit(1)
    pastikanTersambung(error)
    lapor(ditolakHakAkses(error) || (!error && (data ?? []).length === 0), `anon tidak bisa SELECT tabel ${t}`, error?.message)
  }

  // 4. Tulis transaksi ditolak (pakai kas yang benar-benar ada supaya FK bukan alasan gagalnya)
  const { data: kasAda } = await db.from('v_kas_publik').select('id').limit(1)
  const kasId = kasAda?.[0]?.id ?? UUID_ACAK
  await harusDitolak('anon INSERT transaksi', () =>
    db.from('transaksi').insert({ jenis: 'masuk', jumlah: 1000, kas_id: kasId }).select(),
  )
  await harusDitolak('anon UPDATE transaksi', () =>
    db.from('transaksi').update({ jumlah: 1 }).neq('id', UUID_ACAK).select(),
  )
  await harusDitolak('anon DELETE transaksi', () => db.from('transaksi').delete().neq('id', UUID_ACAK).select())

  // 5. Tulis master data dan admins ditolak
  await harusDitolak('anon INSERT kas', () =>
    db.from('kas').insert({ buku: 'kas', nama: 'Uji anon', jenis: 'tunai' }).select(),
  )
  await harusDitolak('anon UPDATE kas', () => db.from('kas').update({ saldo_awal: 1 }).neq('id', UUID_ACAK).select())
  await harusDitolak('anon INSERT kategori', () =>
    db.from('kategori').insert({ buku: 'kas', nama: 'Uji anon', berlaku: 'masuk' }).select(),
  )
  await harusDitolak('anon INSERT proker', () =>
    db.from('proker').insert({ buku: 'kas', nama: 'Uji anon', tanggal_mulai: '2026-01-01' }).select(),
  )
  await harusDitolak('anon INSERT admins', () => db.from('admins').insert({ user_id: UUID_ACAK }).select())
  await harusDitolak('anon INSERT bukti', () =>
    db.from('bukti').insert({ transaksi_id: UUID_ACAK, storage_path: 'uji/anon.jpg' }).select(),
  )
  await harusDitolak('anon tulis lewat view publik', () =>
    db.from('v_transaksi_publik').delete().neq('id', UUID_ACAK).select(),
  )

  // 6. Fungsi is_admin tidak untuk anon
  const { data: adm, error: eAdm } = await db.rpc('is_admin')
  lapor(Boolean(eAdm) || adm === false, 'anon tidak bisa memakai is_admin()', eAdm?.message)

  // 7. Storage bukti private
  const bucket = db.storage.from('bukti')
  const { data: daftar, error: eList } = await bucket.list('', { limit: 10 })
  lapor(Boolean(eList) || (daftar ?? []).length === 0, 'anon tidak bisa melihat daftar file bukti', eList?.message)

  const { error: eUp } = await bucket.upload(`uji-anon-${Date.now()}.jpg`, new Blob(['x'], { type: 'image/jpeg' }))
  lapor(Boolean(eUp), 'anon tidak bisa upload ke bucket bukti', eUp?.message)

  const { data: pub } = bucket.getPublicUrl('apa-saja.jpg')
  const resPub = await fetch(pub.publicUrl)
  lapor(!resPub.ok, 'URL publik bucket bukti tidak bisa dibuka', `HTTP ${resPub.status}`)

  const pathNyata = process.env.UJI_BUKTI_PATH
  if (pathNyata) {
    const { error: eDl } = await bucket.download(pathNyata)
    lapor(Boolean(eDl), `anon tidak bisa unduh ${pathNyata}`, eDl?.message)
    const { error: eSign } = await bucket.createSignedUrl(pathNyata, 60)
    lapor(Boolean(eSign), `anon tidak bisa membuat signed URL ${pathNyata}`, eSign?.message)
    const resNyata = await fetch(bucket.getPublicUrl(pathNyata).data.publicUrl)
    lapor(!resNyata.ok, `URL publik ${pathNyata} tidak bisa dibuka`, `HTTP ${resNyata.status}`)
  } else {
    const { error: eSign } = await bucket.createSignedUrl('apa-saja.jpg', 60)
    lapor(Boolean(eSign), 'anon tidak bisa membuat signed URL bukti', eSign?.message)
    console.log('       (isi UJI_BUKTI_PATH untuk menguji file bukti yang benar-benar ada)')
  }

  console.log(`\n${gagal === 0 ? 'SEMUA LULUS' : `${gagal} pemeriksaan GAGAL`}`)
  process.exit(gagal === 0 ? 0 : 1)
}

utama().catch((e) => {
  console.error(e)
  process.exit(1)
})
