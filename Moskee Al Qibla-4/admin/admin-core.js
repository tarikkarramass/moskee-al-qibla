/* ============================================================
   MOSKEE AL QIBLA — Admin core
   Gedeelde helpers: auth-guard, toast, dialog, datum/format,
   upload, en kleine DOM-utils. Laden NA supabase-config.js.
   ============================================================ */
(function () {
  const A = window.AlQibla || {};
  const sb = A.sb;

  /* ---------- DOM utils ---------- */
  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const el = (tag, props = {}, ...kids) => {
    const n = document.createElement(tag);
    Object.entries(props).forEach(([k, v]) => {
      if (k === "class") n.className = v;
      else if (k === "html") n.innerHTML = v;
      else if (k.startsWith("on") && typeof v === "function") n.addEventListener(k.slice(2), v);
      else if (v != null) n.setAttribute(k, v);
    });
    kids.flat().forEach(c => n.append(c && c.nodeType ? c : document.createTextNode(c ?? "")));
    return n;
  };
  const esc = s => String(s ?? "").replace(/[&<>"']/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));

  /* ---------- datum ---------- */
  const MON = ["jan","feb","mrt","apr","mei","jun","jul","aug","sep","okt","nov","dec"];
  const MONL = ["januari","februari","maart","april","mei","juni","juli","augustus","september","oktober","november","december"];
  function fmtDate(d, long) {
    if (!d) return "—";
    const x = new Date(d);
    if (isNaN(x)) return "—";
    return x.getDate() + " " + (long ? MONL : MON)[x.getMonth()] + " " + x.getFullYear();
  }
  function todayISO() { return new Date().toISOString().slice(0, 10); }

  /* ---------- toast ---------- */
  let toastEl, toastT;
  function toast(msg, kind = "ok") {
    if (!toastEl) {
      toastEl = el("div", { class: "adm-toast" });
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.className = "adm-toast " + kind + " show";
    clearTimeout(toastT);
    toastT = setTimeout(() => (toastEl.className = "adm-toast " + kind), 3600);
  }

  /* ---------- bevestig-dialoog ---------- */
  function confirmDialog({ title, body, confirm = "Verwijderen", danger = true }) {
    return new Promise(resolve => {
      const ov = el("div", { class: "adm-overlay open" });
      const card = el("div", { class: "adm-dialog" },
        el("h3", { class: "serif" }, title),
        el("p", {}, body),
        el("div", { class: "adm-dialog-actions" },
          el("button", { class: "adm-btn ghost", onclick: () => close(false) }, "Annuleren"),
          el("button", { class: "adm-btn " + (danger ? "danger" : "primary"), onclick: () => close(true) }, confirm)
        )
      );
      ov.appendChild(card);
      ov.addEventListener("click", e => { if (e.target === ov) close(false); });
      document.body.appendChild(ov);
      document.body.style.overflow = "hidden";
      function close(v) { ov.remove(); document.body.style.overflow = ""; resolve(v); }
    });
  }

  /* ---------- auth ---------- */
  async function requireAuth() {
    if (!A.configured) {
      // laat de pagina een "niet geconfigureerd"-melding tonen i.p.v. te crashen
      document.documentElement.dataset.unconfigured = "1";
      return null;
    }
    const { data } = await sb.auth.getSession();
    const session = data && data.session;
    if (!session || session.user.email !== A.ADMIN_EMAIL) {
      location.replace("login.html");
      return null;
    }
    return session.user;
  }
  async function signOut() {
    if (sb) await sb.auth.signOut();
    location.replace("login.html");
  }

  /* ---------- storage upload ---------- */
  async function uploadImage(file, folder = "uploads") {
    if (!file) return null;
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = folder + "/" + Date.now() + "-" + Math.random().toString(36).slice(2, 8) + "." + ext;
    const { error } = await sb.storage.from(A.BUCKET).upload(path, file, { cacheControl: "3600", upsert: false });
    if (error) throw error;
    const { data } = sb.storage.from(A.BUCKET).getPublicUrl(path);
    return { path, url: data.publicUrl };
  }
  function publicUrl(path) {
    if (!path) return "";
    if (/^https?:\/\//.test(path)) return path;
    return sb.storage.from(A.BUCKET).getPublicUrl(path).data.publicUrl;
  }

  /* ---------- sidebar / layout ---------- */
  function mountShell(active, userEmail) {
    const items = [
      ["dashboard.html", "Dashboard", "▦"],
      ["news.html", "Nieuws", "❖"],
      ["videos.html", "Video's", "▷"],
      ["activities.html", "Activiteiten", "✦"],
      ["messages.html", "Berichten", "✉"],
      ["media.html", "Media", "❏"],
    ];
    const side = $(".adm-side");
    if (side) {
      const nav = $(".adm-nav", side);
      items.forEach(([href, label, ic]) => {
        const a = el("a", { href, class: "adm-nav-link" + (href === active ? " active" : "") },
          el("span", { class: "ic" }, ic), label);
        nav.appendChild(a);
      });
      const who = $(".adm-who", side);
      if (who) who.textContent = userEmail || "";
      const out = $(".adm-signout", side);
      if (out) out.addEventListener("click", signOut);
    }
    // mobiele toggle
    const t = $(".adm-burger");
    if (t) t.addEventListener("click", () => document.body.classList.toggle("adm-side-open"));
    const sc = $(".adm-scrim");
    if (sc) sc.addEventListener("click", () => document.body.classList.remove("adm-side-open"));
  }

  window.Admin = {
    $, $$, el, esc, sb,
    fmtDate, todayISO,
    toast, confirmDialog,
    requireAuth, signOut,
    uploadImage, publicUrl,
    mountShell,
    cfg: A,
  };
})();
