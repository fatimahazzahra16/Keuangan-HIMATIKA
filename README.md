# Keuangan HIMATIKA

Aplikasi pencatatan keuangan HIMATIKA (Himpunan Mahasiswa Matematika) UIN Siber Syekh Nurjati Cirebon.
Bendahara mencatat transaksi lewat halaman admin, dan siapa pun bisa melihat laporan publik (read-only).

Ada dua buku yang terpisah:

- **Kas HIMA**: uang kas himpunan.
- **Dana Dipa**: dana pemberian kampus atau fakultas yang dipegang Dipa (bukan singkatan anggaran DIPA). Di database bukunya bernama `dipa`.

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
- **Catat baru** (`/admin/baru`): pilih buku (Kas HIMA atau Dana Dipa), jenis (masuk, keluar, pindah), tanggal, jumlah, kas, kategori atau kas tujuan, proker (opsional), keterangan, dan sampai 5 foto bukti.
- **Ubah** (`/admin/transaksi/<id>`): ubah isian, tambah atau hapus foto, atau hapus transaksi.
- **Master data** (`/admin/master`): tambah, ubah, arsipkan, atau hapus kas, kategori, dan proker per buku. Data yang sudah dipakai transaksi tidak bisa dihapus, cukup diarsipkan supaya tidak muncul lagi di pilihan form. Buku tidak bisa diganti setelah data dibuat. Mengubah saldo awal kas langsung menggeser saldo berjalan.
- **Laporan** (`/admin/laporan`): sama dengan laporan publik (per periode atau per proker), ditambah tombol **Unduh Excel** dan **Unduh PDF**. PDF versi bendahara bisa melampirkan foto bukti transaksi di laporan itu (centang "Sertakan foto bukti", maksimal 100 foto) untuk LPJ.
- Laporan publik (`/laporan`) juga punya tombol Excel dan PDF, tanpa foto bukti. Isi berkas: kop (logo, nama HIMATIKA, judul, periode atau proker), tabel No, Tanggal, Keterangan, Kategori, Kas, Masuk, Keluar, Saldo berjalan (Selisih berjalan untuk proker), ringkasan saldo dan rekap per kategori.
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

1. Masuk ke https://vercel.com dengan **Continue with GitHub** memakai akun pemilik repo, lalu buka
   https://vercel.com/new dan pilih repo `Keuangan-HIMATIKA`. Framework terdeteksi sebagai Vite;
   build command `npm run build` dan output `dist` tidak perlu diubah.
2. Sebelum klik Deploy, buka **Environment Variables** dan isi dua variabel ini saja
   (untuk Production, Preview, dan Development):
   - `VITE_SUPABASE_URL` = Project URL dari Supabase (**Project Settings > API**)
   - `VITE_SUPABASE_ANON_KEY` = anon / publishable key dari halaman yang sama

   Jangan pernah memasukkan service role key atau password database ke Vercel.
3. Klik **Deploy**. Setelah selesai, catat domainnya, misalnya `keuangan-himatika.vercel.app`.
4. Di Supabase, buka **Authentication > URL Configuration**:
   - **Site URL**: `https://<domain-vercel>`
   - **Redirect URLs**: tambahkan `https://<domain-vercel>/**`
5. Pastikan pendaftaran publik tetap mati (langkah 3). Deploy tidak mengubah pengaturan ini.
6. Setiap push ke branch `main` otomatis membuat deploy baru. Branch lain dan PR mendapat
   alamat preview sendiri.

`vercel.json` sudah mengatur: semua alamat halaman diarahkan ke `index.html` (supaya reload di
`/riwayat` atau `/admin` tidak 404), `sw.js` tidak di-cache browser supaya update cepat sampai,
file di `/assets` di-cache lama karena namanya berubah setiap build, serta header keamanan dasar
(`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`).

## 7. Pasang di HP (PWA)

Aplikasi ini bisa dipasang seperti aplikasi biasa:

- **Android (Chrome)**: buka alamat aplikasi, ketuk menu titik tiga, pilih **Instal aplikasi** atau
  **Tambahkan ke layar utama**.
- **iPhone (Safari)**: buka alamat aplikasi, ketuk tombol **Bagikan**, pilih
  **Tambah ke Layar Utama**.

Yang perlu diketahui:

- Tampilan aplikasi (menu, halaman) tersimpan di HP sehingga tetap terbuka walau sinyal hilang.
  **Data keuangan tidak disimpan di HP**: saldo, transaksi, dan foto bukti selalu diambil langsung
  dari Supabase. Saat offline muncul pesan kuning "Tidak ada koneksi internet" dan transaksi tidak
  bisa disimpan sampai koneksi kembali.
- Foto bukti dan link-nya (signed URL) tidak pernah di-cache.
- Saat ada versi baru, muncul kartu **"Versi baru aplikasi tersedia"**. Ketuk **Muat ulang** untuk
  memakai versi terbaru, atau **Nanti** untuk melanjutkan dulu.
- File untuk ekspor Excel/PDF baru diunduh saat pertama kali dipakai, lalu disimpan di HP.
