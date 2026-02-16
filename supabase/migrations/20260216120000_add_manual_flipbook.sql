-- 1. Hapus tabel lama jika ada (untuk memastikan skema bersih)
drop table if exists public.flipbook_video_hotspots cascade;
drop table if exists public.manual_flipbook_pages cascade;

-- 2. Buat tabel manual_flipbook_pages
create table public.manual_flipbook_pages (
  id uuid default gen_random_uuid() primary key,
  album_id uuid references public.albums(id) on delete cascade not null,
  page_number integer not null,
  image_url text not null,
  width float,
  height float,
  created_at timestamptz default now()
);

-- 3. Buat tabel flipbook_video_hotspots
create table public.flipbook_video_hotspots (
  id uuid default gen_random_uuid() primary key,
  page_id uuid references public.manual_flipbook_pages(id) on delete cascade not null,
  video_url text,
  x float not null,
  y float not null,
  width float not null,
  height float not null,
  created_at timestamptz default now()
);

-- 4. Aktifkan RLS
alter table public.manual_flipbook_pages enable row level security;
alter table public.flipbook_video_hotspots enable row level security;

-- 5. Kebijakan RLS untuk manual_flipbook_pages
drop policy if exists "Public view" on public.manual_flipbook_pages;
create policy "Public view" on public.manual_flipbook_pages for select using (true);

drop policy if exists "Admins manage pages" on public.manual_flipbook_pages;
create policy "Admins manage pages"
  on public.manual_flipbook_pages for all
  using (
    exists (
      select 1 from public.albums
      where albums.id = manual_flipbook_pages.album_id
      and (albums.user_id = auth.uid() or exists (select 1 from public.album_members where album_id = albums.id and user_id = auth.uid() and role = 'admin'))
    )
  );

-- 6. Kebijakan RLS untuk flipbook_video_hotspots
drop policy if exists "Public view hotspots" on public.flipbook_video_hotspots;
create policy "Public view hotspots" on public.flipbook_video_hotspots for select using (true);

drop policy if exists "Admins manage hotspots" on public.flipbook_video_hotspots;
create policy "Admins manage hotspots"
  on public.flipbook_video_hotspots for all
  using (
    exists (
      select 1 from public.manual_flipbook_pages p
      join public.albums a on a.id = p.album_id
      where p.id = flipbook_video_hotspots.page_id
      and (a.user_id = auth.uid() or exists (select 1 from public.album_members where album_id = a.id and user_id = auth.uid() and role = 'admin'))
    )
  );

-- 7. Tambahkan kolom mode ke tabel albums jika belum ada
alter table public.albums add column if not exists flipbook_mode text default 'auto';
