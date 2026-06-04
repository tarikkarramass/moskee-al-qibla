/* ============================================================
   MOSKEE AL QIBLA — Supabase configuratie  (centrale client)
   ------------------------------------------------------------
   ► VUL HIERONDER JE EIGEN GEGEVENS IN.
     Je vindt ze in je Supabase-dashboard onder:
        Project Settings → API
        • Project URL   →  hieronder bij SUPABASE_URL
        • anon public   →  hieronder bij SUPABASE_ANON_KEY

   ► IS HET VEILIG OM DE ANON-KEY HIER TE ZETTEN?
     Ja. De "anon public"-sleutel is bedoeld om in de browser te
     staan. Hij geeft GEEN beheerrechten. De échte beveiliging
     zit in Row Level Security (RLS) + Supabase Auth — zie
     SUPABASE_SETUP.md. Zet hier NOOIT de "service_role"-sleutel.
   ============================================================ */

const SUPABASE_URL      = "https://nlgieibpkbdauphmfrha.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5sZ2llaWJwa2JkYXVwaG1mcmhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0NjIyNDUsImV4cCI6MjA5NjAzODI0NX0.0woz6CGi7SSFe03-31qoI5bK6xfMyF9xd95foOKE0dI";

/* Het e-mailadres dat als beheerder mag inloggen. */
const ADMIN_EMAIL = "it@moskeealqibla.nl";

/* Naam van de Supabase Storage bucket voor afbeeldingen/thumbnails. */
const STORAGE_BUCKET = "media";

/* ------------------------------------------------------------
   Hieronder niets aanpassen.
   ------------------------------------------------------------ */
(function () {
  const placeholder =
    !SUPABASE_URL ||
    !SUPABASE_ANON_KEY ||
    SUPABASE_URL.includes("JOUW-PROJECT") ||
    SUPABASE_ANON_KEY.includes("JOUW-ANON");

  let client = null;
  if (!placeholder && window.supabase && window.supabase.createClient) {
    client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true },
    });
  }

  window.AlQibla = {
    sb: client,
    configured: !placeholder && !!client,
    placeholder: placeholder,
    ADMIN_EMAIL: ADMIN_EMAIL,
    BUCKET: STORAGE_BUCKET,
    URL: SUPABASE_URL,
  };
})();
