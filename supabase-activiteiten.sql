-- ============================================================
-- MOSKEE AL QIBLA — Activiteiten beheerbaar maken
-- Draai dit ÉÉN keer: Supabase → SQL Editor → New query →
-- alles plakken → RUN. Veilig om te herhalen.
-- ============================================================

-- ========== TABEL: ACTIVITEITEN ==========
create table if not exists public.activities (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,        -- bijv. "Jumu'ah-gebed"
  when_label    text,                 -- bijv. "Elke vrijdag" of "Zaterdag 6 juni 2026"
  description   text,                 -- korte omschrijving
  tag           text,                 -- klein labeltje, bijv. "Wekelijks"
  sort_order    int  not null default 0,  -- volgorde op de website (laag = bovenaan)
  published_at  date not null default current_date,
  status        text not null default 'draft' check (status in ('draft','published')),
  created_at    timestamptz not null default now()
);

-- ========== ROW LEVEL SECURITY ==========
alter table public.activities enable row level security;

-- Publiek: alleen GEPUBLICEERDE activiteiten lezen
drop policy if exists "publiek leest gepubliceerde activiteiten" on public.activities;
create policy "publiek leest gepubliceerde activiteiten"
  on public.activities for select
  using (status = 'published');

-- Beheerder: alles lezen (ook concepten)
drop policy if exists "beheerder leest alle activiteiten" on public.activities;
create policy "beheerder leest alle activiteiten"
  on public.activities for select to authenticated using (true);

-- Beheerder: toevoegen / wijzigen / verwijderen
drop policy if exists "beheerder beheert activiteiten" on public.activities;
create policy "beheerder beheert activiteiten"
  on public.activities for all to authenticated
  using (true) with check (true);

-- ========== STARTGEGEVENS (de 4 activiteiten die nu op de site staan) ==========
-- Dit vult de tabel alleen als hij nog leeg is, zodat je niet met een
-- lege activiteitensectie begint. Verwijder/bewerk ze daarna gewoon in het beheer.
insert into public.activities (title, when_label, description, tag, sort_order, status)
select * from (values
  ('Jumu''ah-gebed',          'Elke vrijdag',          'Wekelijkse vrijdagpreek. Iedereen is welkom om te luisteren en mee te bidden.',                 'Wekelijks', 1, 'published'),
  ('Arabisch — open dag',     'Zaterdag 6 juni 2026',  'Kom kennismaken met ons onderwijsaanbod. Inschrijven voor het nieuwe seizoen is open.',         'Onderwijs', 2, 'published'),
  ('Koranles voor beginners', 'Elke donderdag',        'Wekelijkse les voor volwassenen die willen beginnen met Koran lezen. Geen voorkennis nodig.',   'Wekelijks', 3, 'published'),
  ('Uitvaartdiensten',        'Op aanvraag · 24/7',    'Professionele islamitische begrafeniszorg, dag en nacht bereikbaar voor de gemeenschap.',       'Dienst',    4, 'published')
) as v(title, when_label, description, tag, sort_order, status)
where not exists (select 1 from public.activities);

-- Klaar! De activiteiten zijn nu te beheren via het beheer → "Activiteiten".
