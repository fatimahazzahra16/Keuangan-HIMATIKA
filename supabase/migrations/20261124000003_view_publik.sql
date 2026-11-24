-- View publik: satu-satunya yang bisa dibaca anon.
-- Tidak menyertakan created_by, updated_at, maupun path/jumlah bukti.
-- View dimiliki postgres (pemilik tabel) sehingga membaca melewati RLS
-- tabel dasar, tapi hanya kolom yang dipilih di sini yang terlihat.

create view public.v_kas_publik as
select
  k.id,
  k.buku,
  k.nama,
  k.jenis,
  k.aktif,
  k.urutan,
  k.saldo_awal,
  k.saldo_awal
    + coalesce(sum(t.jumlah) filter (where t.jenis = 'masuk' and t.kas_id = k.id), 0)
    - coalesce(sum(t.jumlah) filter (where t.jenis = 'keluar' and t.kas_id = k.id), 0)
    - coalesce(sum(t.jumlah) filter (where t.jenis = 'pindah' and t.kas_id = k.id), 0)
    + coalesce(sum(t.jumlah) filter (where t.jenis = 'pindah' and t.kas_tujuan_id = k.id), 0)
    as saldo
from public.kas k
left join public.transaksi t on t.kas_id = k.id or t.kas_tujuan_id = k.id
group by k.id;

create view public.v_transaksi_publik as
select
  t.id,
  t.jenis,
  t.tanggal,
  t.jumlah,
  k.buku,
  t.kas_id,
  k.nama as kas_nama,
  t.kas_tujuan_id,
  kt.nama as kas_tujuan_nama,
  t.kategori_id,
  c.nama as kategori_nama,
  t.proker_id,
  p.nama as proker_nama,
  t.keterangan,
  t.created_at
from public.transaksi t
join public.kas k on k.id = t.kas_id
left join public.kas kt on kt.id = t.kas_tujuan_id
left join public.kategori c on c.id = t.kategori_id
left join public.proker p on p.id = t.proker_id;

create view public.v_kategori_publik as
select id, buku, nama, berlaku, aktif, urutan from public.kategori;

create view public.v_proker_publik as
select id, buku, nama, tanggal_mulai, tanggal_selesai, status from public.proker;

revoke all on public.v_kas_publik, public.v_transaksi_publik, public.v_kategori_publik, public.v_proker_publik from public, anon, authenticated;
grant select on public.v_kas_publik, public.v_transaksi_publik, public.v_kategori_publik, public.v_proker_publik to anon, authenticated;
