-- ============================================================
-- MOSKEE AL QIBLA — Contactberichten opslaan
-- Draai dit ÉÉN keer: Supabase → SQL Editor → New query →
-- alles plakken → RUN. Veilig om te herhalen.
-- ============================================================

-- ========== TABEL: CONTACTBERICHTEN ==========
create table if not exists public.contact_messages (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text not null,
  subject     text,
  message     text not null,
  is_read     boolean not null default false,   -- gelezen-markering in het beheer
  created_at  timestamptz not null default now()
);

-- ========== ROW LEVEL SECURITY ==========
alter table public.contact_messages enable row level security;

-- Bezoeker (anoniem): mag een bericht ACHTERLATEN, maar niets lezen.
drop policy if exists "bezoeker stuurt bericht" on public.contact_messages;
create policy "bezoeker stuurt bericht"
  on public.contact_messages for insert
  to anon, authenticated
  with check (true);

-- Beheerder: mag alle berichten lezen.
drop policy if exists "beheerder leest berichten" on public.contact_messages;
create policy "beheerder leest berichten"
  on public.contact_messages for select
  to authenticated using (true);

-- Beheerder: mag gelezen-status wijzigen.
drop policy if exists "beheerder wijzigt berichten" on public.contact_messages;
create policy "beheerder wijzigt berichten"
  on public.contact_messages for update
  to authenticated using (true) with check (true);

-- Beheerder: mag berichten verwijderen.
drop policy if exists "beheerder verwijdert berichten" on public.contact_messages;
create policy "beheerder verwijdert berichten"
  on public.contact_messages for delete
  to authenticated using (true);

-- Klaar! Contactberichten komen nu binnen onder Beheer → "Berichten".
