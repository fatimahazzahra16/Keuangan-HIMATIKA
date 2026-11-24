-- Row Level Security: hanya admin (bendahara) yang bisa membaca/menulis tabel dasar.
-- Publik (anon) membaca lewat view di migration berikutnya.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins where user_id = (select auth.uid()));
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

alter table public.admins enable row level security;
alter table public.kas enable row level security;
alter table public.kategori enable row level security;
alter table public.proker enable row level security;
alter table public.transaksi enable row level security;
alter table public.bukti enable row level security;

-- anon tidak punya hak apa pun di tabel dasar
revoke all on public.admins, public.kas, public.kategori, public.proker, public.transaksi, public.bukti from anon;
-- Hak eksplisit untuk user login. Jangan bergantung pada grant otomatis Supabase
-- (project baru bisa mematikannya). Baris tetap dibatasi oleh policy is_admin() di bawah.
revoke all on public.admins, public.kas, public.kategori, public.proker, public.transaksi, public.bukti from authenticated;
grant select, insert, update, delete on public.kas, public.kategori, public.proker, public.transaksi, public.bukti to authenticated;
-- tabel admins hanya bisa dibaca (untuk cek "apakah saya admin"); diisi lewat SQL editor
grant select on public.admins to authenticated;

create policy admins_baca_diri on public.admins
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy kas_admin on public.kas
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy kategori_admin on public.kategori
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy proker_admin on public.proker
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy transaksi_admin on public.transaksi
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy bukti_admin on public.bukti
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- fungsi trigger tidak perlu dipanggil langsung oleh klien
revoke all on function public.validasi_transaksi() from public, anon, authenticated;
revoke all on function public.kunci_buku() from public, anon, authenticated;
revoke all on function public.kunci_arah_kategori() from public, anon, authenticated;
revoke all on function public.batas_bukti() from public, anon, authenticated;
