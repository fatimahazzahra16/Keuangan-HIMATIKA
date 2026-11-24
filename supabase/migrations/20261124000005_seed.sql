-- Data awal. Saldo awal 0; bendahara mengisinya dari halaman Kelola Kas.
insert into public.kas (buku, nama, jenis, urutan) values
  ('kas', 'Kas Tunai', 'tunai', 1),
  ('kas', 'Rekening', 'rekening', 2),
  ('dipa', 'Kas Tunai DIPA', 'tunai', 1),
  ('dipa', 'Rekening DIPA', 'rekening', 2);

insert into public.kategori (buku, nama, berlaku, urutan)
select b.buku::public.buku_t, k.nama, k.berlaku::public.arah_kategori_t, k.urutan
from (values ('kas'), ('dipa')) as b(buku)
cross join (values
  ('Dana Kampus', 'masuk', 1),
  ('Sponsor', 'masuk', 2),
  ('Danusan', 'masuk', 3),
  ('Donasi', 'masuk', 4),
  ('Lainnya', 'masuk', 9),
  ('Konsumsi', 'keluar', 1),
  ('ATK', 'keluar', 2),
  ('Perlengkapan', 'keluar', 3),
  ('Transportasi', 'keluar', 4),
  ('Cetak', 'keluar', 5),
  ('Sewa', 'keluar', 6),
  ('Lainnya', 'keluar', 9)
) as k(nama, berlaku, urutan);
