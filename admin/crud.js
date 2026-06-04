/* ============================================================
   MOSKEE AL QIBLA — Generieke CRUD-engine voor admin
   Wordt gebruikt door news.html en videos.html. Werkt op de
   gedeelde editor-/lijst-markup in die pagina's.
   ============================================================ */
(function () {
  const { $, el, esc, sb, toast, confirmDialog, fmtDate, todayISO, uploadImage, publicUrl } = Admin;

  const CRUD = {};
  let CFG, items = [], filter = "all";
  let pendingFile = null, currentImagePath = null, removeImage = false, editingId = null;

  CRUD.init = function (config) {
    CFG = config;
    // knoppen
    $("#newBtn").addEventListener("click", () => openEditor(null));
    $("#edClose").addEventListener("click", closeEditor);
    $("#edCancel").addEventListener("click", closeEditor);
    $("#edSave").addEventListener("click", save);
    $("#editor").addEventListener("click", e => { if (e.target.id === "editor") closeEditor(); });

    // filter
    $("#filter").addEventListener("click", e => {
      const b = e.target.closest("button"); if (!b) return;
      [...$("#filter").children].forEach(x => x.classList.remove("on"));
      b.classList.add("on"); filter = b.dataset.f; render();
    });
    // status seg in editor
    $("#ed-status").addEventListener("click", e => {
      const b = e.target.closest("button"); if (!b) return;
      [...$("#ed-status").children].forEach(x => x.classList.remove("on"));
      b.classList.add("on");
    });

    // image uploader (alleen als deze pagina afbeeldingen gebruikt)
    const drop = $("#ed-drop"), fileIn = $("#ed-file");
    if (CFG.imageField && drop && fileIn) {
      drop.addEventListener("click", () => fileIn.click());
      drop.addEventListener("dragover", e => { e.preventDefault(); drop.classList.add("over"); });
      drop.addEventListener("dragleave", () => drop.classList.remove("over"));
      drop.addEventListener("drop", e => {
        e.preventDefault(); drop.classList.remove("over");
        if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
      });
      fileIn.addEventListener("change", () => { if (fileIn.files[0]) handleFile(fileIn.files[0]); });
      $("#ed-clearimg").addEventListener("click", () => {
        pendingFile = null; removeImage = true; currentImagePath = null;
        $("#ed-preview").innerHTML = "❏"; $("#ed-clearimg").style.display = "none"; fileIn.value = "";
      });
    }

    load();
  };

  function handleFile(file) {
    if (!file.type.startsWith("image/")) { toast("Kies een afbeeldingsbestand.", "err"); return; }
    if (file.size > 5 * 1024 * 1024) { toast("Afbeelding is groter dan 5 MB.", "err"); return; }
    pendingFile = file; removeImage = false;
    const url = URL.createObjectURL(file);
    $("#ed-preview").innerHTML = `<img src="${url}" alt="">`;
    $("#ed-clearimg").style.display = "";
  }

  /* ---------- laden ---------- */
  async function load() {
    const wrap = $("#listWrap");
    wrap.innerHTML = `<div class="adm-list">${'<div class="skeleton"></div>'.repeat(3)}</div>`;
    try {
      let q = sb.from(CFG.table).select("*");
      (CFG.order || [["published_at", false], ["created_at", false]])
        .forEach(([col, asc]) => { q = q.order(col, { ascending: asc }); });
      const { data, error } = await q;
      if (error) throw error;
      items = data || [];
      render();
    } catch (e) {
      wrap.innerHTML = `<div class="state error"><div class="ic">⚠</div>
        <h3 class="serif">Kon ${esc(CFG.plural)} niet laden</h3>
        <p>${esc(e.message || "Onbekende fout")}. Controleer of de tabel <code>${esc(CFG.table)}</code> bestaat en de RLS-policies zijn ingesteld.</p>
        <button class="adm-btn ghost" onclick="location.reload()">Opnieuw proberen</button></div>`;
    }
  }

  function render() {
    const wrap = $("#listWrap");
    const list = items.filter(r => filter === "all" || r.status === filter);
    $("#countLbl").textContent = `${list.length} ${list.length === 1 ? CFG.singular : CFG.plural}`;

    if (!items.length) {
      wrap.innerHTML = `<div class="state"><div class="ic">❖</div>
        <h3 class="serif">Nog geen ${esc(CFG.plural)}</h3>
        <p>Voeg je eerste ${esc(CFG.singular)} toe. Dit verschijnt op de website zodra je het publiceert.</p>
        <button class="adm-btn primary" onclick="document.getElementById('newBtn').click()">＋ Nieuw toevoegen</button></div>`;
      return;
    }
    if (!list.length) {
      wrap.innerHTML = `<div class="state"><div class="ic">⌕</div>
        <h3 class="serif">Geen resultaten</h3><p>Er zijn geen ${esc(CFG.plural)} met dit filter.</p></div>`;
      return;
    }

    const listEl = el("div", { class: "adm-list" });
    list.forEach(r => {
      const img = r[CFG.imageField] ? publicUrl(r[CFG.imageField]) : "";
      const card = el("div", { class: "row-card" });
      card.innerHTML = `
        <div class="row-thumb">${img ? `<img src="${esc(img)}" alt="">` : (CFG.thumbIcon || "❏")}</div>
        <div class="row-main">
          <h4 class="serif">${esc(r.title) || "(zonder titel)"}</h4>
          <div class="sub">${CFG.renderSub ? CFG.renderSub(r) : ""}</div>
          <div class="row-meta">
            <span class="pill ${r.status === "published" ? "published" : "draft"}"><span class="dot"></span>${r.status === "published" ? "Gepubliceerd" : "Concept"}</span>
            <span class="date">${fmtDate(r.published_at, true)}</span>
          </div>
        </div>`;
      const actions = el("div", { class: "row-actions" },
        el("button", { class: "icon-btn", title: "Bewerken", onclick: () => openEditor(r) }, "✎"),
        el("button", { class: "icon-btn del", title: "Verwijderen", onclick: () => del(r) }, "🗑")
      );
      card.appendChild(actions);
      listEl.appendChild(card);
    });
    wrap.innerHTML = ""; wrap.appendChild(listEl);
  }

  /* ---------- editor ---------- */
  function openEditor(row) {
    editingId = row ? row.id : null;
    pendingFile = null; removeImage = false; currentImagePath = row ? row[CFG.imageField] : null;
    $("#edTitle").textContent = row ? `${cap(CFG.singular)} bewerken` : `Nieuw ${CFG.singular}`;
    $("#ed-id").value = row ? row.id : "";

    Object.values(CFG.fields).forEach(f => {
      const node = $("#" + f.input);
      node.value = row ? (f.col === "published_at" && row[f.col] ? String(row[f.col]).slice(0, 10) : (row[f.col] ?? "")) : (f.col === "published_at" ? todayISO() : "");
      $("#" + f.wrap).classList.remove("err");
    });

    // status
    const st = row ? row.status : "draft";
    [...$("#ed-status").children].forEach(b => b.classList.toggle("on", b.dataset.v === st));

    // image preview (alleen als deze pagina afbeeldingen gebruikt)
    if (CFG.imageField && $("#ed-preview")) {
      if (currentImagePath) {
        $("#ed-preview").innerHTML = `<img src="${esc(publicUrl(currentImagePath))}" alt="">`;
        $("#ed-clearimg").style.display = "";
      } else {
        $("#ed-preview").innerHTML = CFG.thumbIcon || "❏";
        $("#ed-clearimg").style.display = "none";
      }
      $("#ed-file").value = "";
    }

    $("#editor").classList.add("open");
    document.body.style.overflow = "hidden";
    setTimeout(() => $("#" + Object.values(CFG.fields)[0].input).focus(), 60);
  }
  function closeEditor() { $("#editor").classList.remove("open"); document.body.style.overflow = ""; }

  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  async function save() {
    let ok = true, firstBad = null;
    const payload = {};
    Object.values(CFG.fields).forEach(f => {
      const node = $("#" + f.input);
      const val = node.value.trim();
      let bad = false;
      if (f.required && !val) bad = true;
      if (val && f.pattern && !f.pattern.test(val)) bad = true;
      $("#" + f.wrap).classList.toggle("err", bad);
      if (bad && !firstBad) firstBad = node;
      if (bad) ok = false;
      if (f.type === "number") payload[f.col] = val === "" ? 0 : Number(val);
      else payload[f.col] = val || null;
    });
    if (!ok) { if (firstBad) firstBad.focus(); toast("Controleer de gemarkeerde velden.", "err"); return; }

    payload.status = $("#ed-status .on").dataset.v;

    const btn = $("#edSave"); const lbl = btn.querySelector(".lbl");
    btn.disabled = true; lbl.innerHTML = '<span class="spin"></span> Opslaan…';

    try {
      // afbeelding (alleen als deze pagina afbeeldingen gebruikt)
      if (CFG.imageField) {
        if (pendingFile) {
          const up = await uploadImage(pendingFile, CFG.folder);
          payload[CFG.imageField] = up.path;
        } else if (removeImage) {
          payload[CFG.imageField] = null;
        } else if (currentImagePath) {
          payload[CFG.imageField] = currentImagePath;
        }
      }

      if (editingId) {
        const { error } = await sb.from(CFG.table).update(payload).eq("id", editingId);
        if (error) throw error;
        toast(cap(CFG.singular) + " bijgewerkt.", "ok");
      } else {
        const { error } = await sb.from(CFG.table).insert(payload);
        if (error) throw error;
        toast(cap(CFG.singular) + " toegevoegd.", "ok");
      }
      closeEditor(); load();
    } catch (e) {
      toast("Opslaan mislukt: " + (e.message || "onbekende fout"), "err");
    } finally {
      btn.disabled = false; lbl.textContent = "Opslaan";
    }
  }

  async function del(row) {
    const yes = await confirmDialog({
      title: cap(CFG.singular) + " verwijderen?",
      body: `"${row.title || "(zonder titel)"}" wordt definitief verwijderd. Dit kan niet ongedaan worden gemaakt.`,
      confirm: "Verwijderen",
    });
    if (!yes) return;
    try {
      const { error } = await sb.from(CFG.table).delete().eq("id", row.id);
      if (error) throw error;
      if (row[CFG.imageField] && !/^https?:\/\//.test(row[CFG.imageField])) {
        sb.storage.from(Admin.cfg.BUCKET).remove([row[CFG.imageField]]).catch(() => {});
      }
      toast(cap(CFG.singular) + " verwijderd.", "ok");
      load();
    } catch (e) {
      toast("Verwijderen mislukt: " + (e.message || "onbekende fout"), "err");
    }
  }

  window.CRUD = CRUD;
})();
