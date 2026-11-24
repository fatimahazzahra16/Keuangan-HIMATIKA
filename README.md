# Keuangan HIMATIKA

Aplikasi pencatatan keuangan HIMATIKA (Himpunan Mahasiswa Matematika) UIN Siber Syekh Nurjati Cirebon.
Bendahara mencatat transaksi lewat halaman admin, dan siapa pun bisa melihat laporan publik (read-only).

Ada dua buku yang terpisah:

- **Kas HIMA**: uang kas himpunan.
- **Dana DIPA**: dana dari fakultas.

Stack: Vite + React + TypeScript + Tailwind, Supabase (Auth, Postgres, Storage), PWA, deploy di Vercel.

## Keamanan singkat

- Row Level Security aktif di semua tabel.
- Pengunjung tanpa login (role `anon`) hanya bisa membaca view publik (`v_kas_publik`, `v_transaksi_publik`,
  `v_kategori_publik`, `v_proker_publik`). View ini tidak memuat kolom internal (`created_by`) dan path foto bukti.
- Tambah, ubah, dan hapus data hanya bisa dilakukan oleh akun yang terdaftar di tabel `admins`.
  Login saja tidak cukup.
- Bucket `bukti` bersifat private. Foto ditampilkan lewat signed URL berumur pendek, hanya untuk admin.
- Frontend hanya memakai anon/publishable key. **Service role key tidak pernah dipakai di aplikasi ini
  dan jangan pernah ditaruh di repo atau di Vercel.**

## 1. Siapkan project Supabase

1. Buat project baru di https://supabase.com/dashboard (region Singapore disarankan).
2. Buka **SQL Editor**, lalu jalankan file di `supabase/migrations/` **satu per satu sesuai urutan nama**:
   1. `20261124000001_skema.sql`: tabel, enum, trigger validasi.
   2. `20261124000002_rls.sql`: RLS dan hak akses.
   3. `20261124000003_view_publik.sql`: view untuk halaman publik.
   4. `20261124000004_storage.sql`: bucket `bukti` (private) dan policy-nya.
   5. `20261124000005_seed.sql`: data awal kas dan kategori.

   Jika memakai Supabase CLI, cukup `supabase link --project-ref <ref>` lalu `supabase db push`.

3. Cek hasilnya dengan query ini. Hasil yang benar: 4 kas, 24 kategori, 0 admin.

   ```sql
   select (select count(*) from public.kas) as kas,
          (select count(*) from public.kategori) as kategori,
          (select count(*) from public.admins) as admins;
   ```

## 2. Buat akun bendahara dan jadikan admin

1. Buka **Authentication > Users > Add user > Create new user**.
2. Isi email dan password bendahara, centang **Auto Confirm User**, lalu simpan.
3. Salin **User UID** akun tersebut, lalu jalankan di SQL Editor:

   ```sql
   insert into public.admins (user_id) values ('<USER UID>');
   ```

   Atau, tanpa menyalin UID:

   ```sql
   insert into public.admins (user_id)
   select id from auth.users where email = '<email bendahara>';
   ```

4. Buka `/admin/masuk` di aplikasi (atau tautan **Bendahara** di pojok kanan atas), lalu masuk dengan email dan password tadi.

Hanya akun yang ada di tabel `admins` yang bisa menulis data. Akun yang bisa login tapi belum ada di tabel itu akan melihat pesan "Akun belum terdaftar sebagai bendahara". Untuk mencabut akses admin, hapus barisnya dari tabel itu.

Lupa password: buka **Authentication > Users**, pilih akunnya, lalu kirim reset password atau atur password baru dari dashboard. Aplikasi sengaja tidak punya halaman daftar atau reset sendiri.

### Halaman bendahara

- **Transaksi** (`/admin`): daftar semua transaksi, filter per buku, penanda "Tanpa bukti" untuk yang belum ada fotonya.
- **Catat baru** (`/admin/baru`): pilih buku (Kas HIMA atau Dana DIPA), jenis (masuk, keluar, pindah), tanggal, jumlah, kas, kategori atau kas tujuan, proker (opsional), keterangan, dan sampai 5 foto bukti.
- **Ubah** (`/admin/transaksi/<id>`): ubah isian, tambah atau hapus foto, atau hapus transaksi.
- Foto dikecilkan di browser (sisi terpanjang 1600 px, sekitar 600 KB, JPEG) lalu disimpan di bucket `bukti` yang private. Foto hanya tampil lewat signed URL yang berlaku 60 detik dan tidak pernah muncul di halaman publik.

## 3. Matikan pendaftaran publik

Supaya tidak ada orang yang bisa membuat akun sendiri:

1. Buka **Authentication > Sign In / Providers**.
2. Di bagian **User Signups**, matikan **Allow new users to sign up**.
3. Klik **Save changes**, lalu muat ulang halaman untuk memastikan tombolnya tetap mati.

Akun baru tetap bisa dibuat oleh pemilik project lewat langkah 2.

## 4. Environment variable

Salin `.env.example` menjadi `.env.local`, lalu isi dari **Project Settings > API Keys**:

```
VITE_SUPABASE_URL=https://<ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<publishable / anon key>
```

`.env.local` tidak ikut di-commit (sudah ada di `.gitignore`). Jangan commit key apa pun.

## 5. Jalankan di komputer

```bash
npm install
npm run dev        # server pengembangan
npm test           # unit test saldo dan ringkasan laporan
npm run build      # build produksi
```

### Uji keamanan dengan anon key

```bash
npm run uji:anon
```

Skrip ini memakai anon key dari `.env.local` dan membuktikan bahwa:

- view publik bisa dibaca dan tidak memuat `created_by` atau path bukti,
- tabel dasar tidak bisa dibaca,
- insert, update, dan delete transaksi (serta tabel lain) **gagal**,
- foto bukti di bucket `bukti` **tidak bisa** didaftar, diunggah, atau diunduh.

Isi `UJI_BUKTI_PATH` dengan path foto yang benar-benar ada di bucket supaya tes juga membuktikan file nyata tidak bisa diunduh.
Skrip keluar dengan kode 0 jika semua lulus, 1 jika ada yang gagal, dan 2 jika tidak bisa menghubungi Supabase.

## 6. Deploy ke Vercel

1. Import repo ini di https://vercel.com/new. Framework terdeteksi sebagai Vite.
2. Di **Settings > Environment Variables**, isi `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY`
   (hanya dua ini, jangan service role key).
3. Deploy.
4. Di Supabase, buka **Authentication > URL Configuration** dan isi **Site URL** dengan domain Vercel.
