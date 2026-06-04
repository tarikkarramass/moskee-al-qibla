# Beheeromgeving Moskee Al Qibla — Supabase instellen

Deze website heeft een beveiligde beheeromgeving (`/admin/…`) die nieuws en
video's live uit **Supabase** haalt. Volg onderstaande stappen één keer om
alles werkend te krijgen.

---

## 1. Maak een Supabase-project

1. Ga naar <https://supabase.com> → **New project**.
2. Kies een naam en een sterk database-wachtwoord. Regio: **West EU (Frankfurt)**.
3. Wacht tot het project klaar is.

## 2. Vul je sleutels in

Open in dit project het bestand **`supabase-config.js`** en vul in:

```js
const SUPABASE_URL      = "https://JOUW-PROJECT.supabase.co";  // Project Settings → API → Project URL
const SUPABASE_ANON_KEY = "JOUW-ANON-PUBLIC-KEY";              // Project Settings → API → anon public
```

> **Is dit veilig?** Ja. De *anon public*-sleutel hoort in de browser te staan en
> geeft geen beheerrechten. De beveiliging zit in de RLS-policies (stap 4) +
> Supabase Auth. Zet hier **nooit** de `service_role`-sleutel.

## 3. Maak de tabellen aan

Open in Supabase **SQL Editor** → **New query**, plak het volgende en klik **Run**:

```sql
-- ========== NIEUWSBERICHTEN ==========
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

-- ========== VIDEO'S ==========
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
```

## 4. Zet Row Level Security (RLS) aan

Dit is de échte beveiliging: het publiek mag alléén gepubliceerde items lézen,
en alléén een ingelogde beheerder mag toevoegen/wijzigen/verwijderen.

```sql
-- RLS inschakelen
alter table public.news_posts enable row level security;
alter table public.videos     enable row level security;

-- Publiek: alleen gepubliceerde items lezen
create policy "publiek leest gepubliceerd nieuws"
  on public.news_posts for select
  using (status = 'published');

create policy "publiek leest gepubliceerde videos"
  on public.videos for select
  using (status = 'published');

-- Beheerder: alles lezen (ook concepten)
create policy "beheerder leest alle nieuws"
  on public.news_posts for select to authenticated using (true);
create policy "beheerder leest alle videos"
  on public.videos for select to authenticated using (true);

-- Beheerder: toevoegen / wijzigen / verwijderen
create policy "beheerder beheert nieuws"
  on public.news_posts for all to authenticated
  using (true) with check (true);
create policy "beheerder beheert videos"
  on public.videos for all to authenticated
  using (true) with check (true);
```

> Wil je het strenger? Vervang in de laatste vier policies `authenticated` /
> `true` door een check op het e-mailadres, bv:
> `using (auth.jwt() ->> 'email' = 'it@moskeealqibla.nl')`.
> Omdat er maar één beheerdersaccount bestaat, is `authenticated` in de praktijk
> al voldoende.

## 5. Maak de Storage-bucket `media`

1. Ga naar **Storage** → **New bucket**.
2. Naam: **`media`** — zet **Public bucket** AAN (afbeeldingen moeten publiek
   zichtbaar zijn op de website).
3. Klik **Create bucket**.

Zet daarna de juiste rechten via **SQL Editor**:

```sql
-- Publiek mag afbeeldingen bekijken
create policy "publiek bekijkt media"
  on storage.objects for select
  using (bucket_id = 'media');

-- Beheerder mag uploaden / wijzigen / verwijderen
create policy "beheerder uploadt media"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'media');
create policy "beheerder wijzigt media"
  on storage.objects for update to authenticated
  using (bucket_id = 'media');
create policy "beheerder verwijdert media"
  on storage.objects for delete to authenticated
  using (bucket_id = 'media');
```

## 6. Maak het beheerdersaccount aan

1. Ga naar **Authentication** → **Users** → **Add user** → **Create new user**.
2. E-mail: **`it@moskeealqibla.nl`**
3. Wachtwoord: kies een sterk wachtwoord. Vink **Auto Confirm User** aan.
4. Klik **Create user**.

> Alleen dit e-mailadres mag inloggen op de beheeromgeving (ingesteld via
> `ADMIN_EMAIL` in `supabase-config.js`). Het wachtwoord staat **nergens** in de
> code — het wordt veilig door Supabase beheerd. Wachtwoord wijzigen of resetten
> doe je in dit zelfde Authentication-scherm.

## 6b. "Wachtwoord vergeten" laten werken (herstellinks)

De inlogpagina heeft een **Wachtwoord vergeten?**-knop. Die stuurt een
herstellink naar `it@moskeealqibla.nl`; via die link landt de beheerder op
`admin/reset.html` om een nieuw wachtwoord in te stellen. Twee instellingen
zijn nodig:

1. **Redirect-URL whitelisten.** Ga naar **Authentication → URL Configuration**.
   - Zet bij **Site URL** het adres van je website, bijv. `https://moskeealqibla.nl`.
   - Voeg bij **Redirect URLs** de herstelpagina toe, bijv.
     `https://moskeealqibla.nl/admin/reset.html`
     (en tijdens testen ook je lokale adres, bv. `http://localhost:3000/admin/reset.html`).
     Zonder deze stap weigert Supabase de link.

2. **E-mail versturen.** Standaard verstuurt Supabase herstelmails via een
   gedeelde testserver met een lage limiet (een paar per uur) — genoeg om te
   testen. Voor betrouwbare bezorging: stel onder **Project Settings → Auth →
   SMTP Settings** je eigen mailserver in (bv. die van `moskeealqibla.nl`).
   De tekst van de mail pas je aan onder **Authentication → Email Templates →
   Reset Password**.

> De herstellink is kort geldig en kan één keer worden gebruikt. Komt de mail
> niet aan? Check de spam-map en of de Redirect-URL exact klopt.

## 7. Klaar — testen

- Open **`admin/login.html`** en log in met `it@moskeealqibla.nl`.
- Voeg een nieuwsbericht of video toe, zet de status op **Gepubliceerd**.
- Open **`index.html`** → het item verschijnt onder *Laatste nieuws* / *Video's*.
- Concepten blijven onzichtbaar voor bezoekers.

---

## Bestanden in dit project

| Bestand | Doel |
|---|---|
| `index.html` | Publieke website (toont gepubliceerd nieuws + video's) |
| `supabase-config.js` | **Hier vul je je sleutels in** |
| `prayer-data.js` | Gebedstijden 2026 |
| `admin/login.html` | Beheerder inloggen + wachtwoord vergeten |
| `admin/reset.html` | Nieuw wachtwoord instellen (via herstellink) |
| `admin/dashboard.html` | Overzicht + tegels |
| `admin/news.html` | Nieuws beheren |
| `admin/videos.html` | Video's beheren |
| `admin/media.html` | Uploads beheren |
| `admin/admin-core.js` · `admin/crud.js` · `admin/admin.css` | Gedeelde adminlogica & stijl |

## Online zetten

Upload de hele projectmap naar je hosting (of een statische host zoals Netlify,
Vercel of Cloudflare Pages). Alles is statische HTML/JS — er is geen server of
build-stap nodig. Zorg dat `supabase-config.js` is ingevuld vóór je publiceert.

Voor nette URLs (`/admin/login` i.p.v. `/admin/login.html`) kun je bij Netlify/
Vercel "clean URLs" aanzetten; standaard werken de `.html`-links overal.
