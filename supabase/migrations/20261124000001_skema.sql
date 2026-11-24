-- Skema inti Keuangan HIMATIKA
-- Dua buku terpisah: 'kas' (Kas HIMA) dan 'dipa' (Dana DIPA dari fakultas).

create type public.buku_t as enum ('kas', 'dipa');
create type public.jenis_kas_t as enum ('tunai', 'rekening');
create type public.jenis_transaksi_t as enum ('masuk', 'keluar', 'pindah');
create type public.arah_kategori_t as enum ('masuk', 'keluar');
create type public.status_proker_t as enum ('aktif', 'arsip');

-- Akun yang boleh menulis data (bendahara)
create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.kas (
  id uuid primary key default gen_random_uuid(),
  buku public.buku_t not null,
  nama text not null check (length(trim(nama)) > 0),
  jenis public.jenis_kas_t not null,
  saldo_awal bigint not null default 0 check (saldo_awal >= 0),
  aktif boolean not null default true,
  urutan int not null default 0,
  created_at timestamptz not null default now(),
  unique (buku, nama)
);

create table public.kategori (
  id uuid primary key default gen_random_uuid(),
  buku public.buku_t not null,
  nama text not null check (length(trim(nama)) > 0),
  berlaku public.arah_kategori_t not null,
  aktif boolean not null default true,
  urutan int not null default 0,
  created_at timestamptz not null default now(),
  unique (buku, nama, berlaku)
);

create table public.proker (
  id uuid primary key default gen_random_uuid(),
  buku public.buku_t not null,
  nama text not null check (length(trim(nama)) > 0),
  tanggal_mulai date not null,
  tanggal_selesai date,
  status public.status_proker_t not null default 'aktif',
  created_at timestamptz not null default now(),
  unique (buku, nama),
  check (tanggal_selesai is null or tanggal_selesai >= tanggal_mulai)
);

create table public.transaksi (
  id uuid primary key default gen_random_uuid(),
  jenis public.jenis_transaksi_t not null,
  tanggal date not null default (now() at time zone 'Asia/Jakarta')::date,
  jumlah bigint not null check (jumlah > 0),
  kas_id uuid not null references public.kas (id) on delete restrict,
  kas_tujuan_id uuid references public.kas (id) on delete restrict,
  kategori_id uuid references public.kategori (id) on delete restrict,
  proker_id uuid references public.proker (id) on delete restrict,
  keterangan text not null default '',
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pindah_valid check (
    (jenis = 'pindah' and kas_tujuan_id is not null and kas_tujuan_id <> kas_id and kategori_id is null)
    or (jenis <> 'pindah' and kas_tujuan_id is null)
  )
);

create index transaksi_tanggal_idx on public.transaksi (tanggal desc, created_at desc);
create index transaksi_kas_idx on public.transaksi (kas_id);
create index transaksi_kas_tujuan_idx on public.transaksi (kas_tujuan_id);
create index transaksi_kategori_idx on public.transaksi (kategori_id);
create index transaksi_proker_idx on public.transaksi (proker_id);

create table public.bukti (
  id uuid primary key default gen_random_uuid(),
  transaksi_id uuid not null references public.transaksi (id) on delete cascade,
  storage_path text not null unique,
  urutan int not null default 0,
  created_at timestamptz not null default now()
);
create index bukti_transaksi_idx on public.bukti (transaksi_id);

-- Validasi lintas tabel untuk transaksi: semua referensi harus satu buku,
-- dan kategori harus cocok dengan jenis transaksi.
create or replace function public.validasi_transaksi()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_buku public.buku_t;
  v_buku_lain public.buku_t;
  v_berlaku public.arah_kategori_t;
begin
  select buku into v_buku from public.kas where id = new.kas_id;

  if new.kas_tujuan_id is not null then
    select buku into v_buku_lain from public.kas where id = new.kas_tujuan_id;
    if v_buku_lain is distinct from v_buku then
      raise exception 'Pindah dana hanya boleh antar kas dalam buku yang sama';
    end if;
  end if;

  if new.kategori_id is not null then
    select buku, berlaku into v_buku_lain, v_berlaku from public.kategori where id = new.kategori_id;
    if v_buku_lain is distinct from v_buku then
      raise exception 'Kategori harus dari buku yang sama dengan kas';
    end if;
    if v_berlaku::text <> new.jenis::text then
      raise exception 'Kategori "%" tidak berlaku untuk transaksi %', new.kategori_id, new.jenis;
    end if;
  end if;

  if new.proker_id is not null then
    select buku into v_buku_lain from public.proker where id = new.proker_id;
    if v_buku_lain is distinct from v_buku then
      raise exception 'Proker harus dari buku yang sama dengan kas';
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create trigger transaksi_validasi
before insert or update on public.transaksi
for each row execute function public.validasi_transaksi();

-- Buku kas/kategori/proker tidak boleh dipindah setelah dipakai transaksi
create or replace function public.kunci_buku()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.buku is distinct from old.buku then
    raise exception 'Buku tidak bisa diubah setelah data dibuat';
  end if;
  return new;
end;
$$;

create trigger kas_kunci_buku before update on public.kas for each row execute function public.kunci_buku();
create trigger kategori_kunci_buku before update on public.kategori for each row execute function public.kunci_buku();
create trigger proker_kunci_buku before update on public.proker for each row execute function public.kunci_buku();

-- Kategori yang sudah dipakai tidak boleh diubah arahnya (masuk/keluar)
create or replace function public.kunci_arah_kategori()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.berlaku is distinct from old.berlaku
     and exists (select 1 from public.transaksi where kategori_id = new.id) then
    raise exception 'Kategori sudah dipakai transaksi, arahnya tidak bisa diubah';
  end if;
  return new;
end;
$$;

create trigger kategori_kunci_arah before update on public.kategori for each row execute function public.kunci_arah_kategori();

-- Maksimal 5 foto bukti per transaksi
create or replace function public.batas_bukti()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  perform 1 from public.transaksi where id = new.transaksi_id for update;
  if (select count(*) from public.bukti where transaksi_id = new.transaksi_id) >= 5 then
    raise exception 'Maksimal 5 foto bukti per transaksi';
  end if;
  return new;
end;
$$;

create trigger bukti_batas before insert on public.bukti for each row execute function public.batas_bukti();
