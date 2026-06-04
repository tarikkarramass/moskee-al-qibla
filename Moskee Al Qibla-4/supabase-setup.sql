-- ============================================================
-- MOSKEE AL QIBLA — volledige Supabase-setup
-- Open dit bestand, selecteer ALLES (Cmd/Ctrl + A), kopieer het,
-- plak in Supabase → SQL Editor → New query, en klik RUN.
-- Je mag dit gerust nog eens draaien; het is veilig om te herhalen.
-- ============================================================

-- ========== TABEL: NIEUWSBERICHTEN ==========
create table if not exists public.news_posts (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  summary       text,
  body          text,
  image_path    text,
  published_at  date not null default current_date,
  status        text not null default 'draft' check (status in ('draft','published')),
  created_at    timestamptz not null default now()
);

-- ========== TABEL: VIDEO'S ==========
create table if not exists public.videos (
  id             uuid primary key default gen_random_uuid(),
  title          text not null,
  description    text,
  video_url      text not null,
  thumbnail_path text,
  published_at   date not null default current_date,
  status         text not null default 'draft' check (status in ('draft','published')),
  created_at     timestamptz not null default now()
);

-- ========== ROW LEVEL SECURITY AANZETTEN ==========
alter table public.news_posts enable row level security;
alter table public.videos     enable row level security;

-- ----- Publiek: alleen GEPUBLICEERDE items lezen -----
drop policy if exists "publiek leest gepubliceerd nieuws" on public.news_posts;
create policy "publiek leest gepubliceerd nieuws"
  on public.news_posts for select
  using (status = 'published');

drop policy if exists "publiek leest gepubliceerde videos" on public.videos;
create policy "publiek leest gepubliceerde videos"
  on public.videos for select
  using (status = 'published');

-- ----- Beheerder: alles lezen (ook concepten) -----
drop policy if exists "beheerder leest alle nieuws" on public.news_posts;
create policy "beheerder leest alle nieuws"
  on public.news_posts for select to authenticated using (true);

drop policy if exists "beheerder leest alle videos" on public.videos;
create policy "beheerder leest alle videos"
  on public.videos for select to authenticated using (true);

-- ----- Beheerder: toevoegen / wijzigen / verwijderen -----
drop policy if exists "beheerder beheert nieuws" on public.news_posts;
create policy "beheerder beheert nieuws"
  on public.news_posts for all to authenticated
  using (true) with check (true);

drop policy if exists "beheerder beheert videos" on public.videos;
create policy "beheerder beheert videos"
  on public.videos for all to authenticated
  using (true) with check (true);

-- ========== STORAGE-POLICIES (bucket 'media') ==========
-- LET OP: maak eerst de bucket 'media' aan via Storage → New bucket (Public).
-- Daarna mag je dit deel draaien.

drop policy if exists "publiek bekijkt media" on storage.objects;
create policy "publiek bekijkt media"
  on storage.objects for select
  using (bucket_id = 'media');

drop policy if exists "beheerder uploadt media" on storage.objects;
create policy "beheerder uploadt media"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'media');

drop policy if exists "beheerder wijzigt media" on storage.objects;
create policy "beheerder wijzigt media"
  on storage.objects for update to authenticated
  using (bucket_id = 'media');

drop policy if exists "beheerder verwijdert media" on storage.objects;
create policy "beheerder verwijdert media"
  on storage.objects for delete to authenticated
  using (bucket_id = 'media');

-- Klaar! Volgende: maak de bucket 'media' (als je dat nog niet deed)
-- en het beheerdersaccount it@moskeealqibla.nl onder Authentication → Users.
