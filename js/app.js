/* Zelda Manager — reprise web des classeurs Excel OoT / Majora / Tri Force Heroes.
   Aucune dépendance : les données sont dans data/*.js (générées par tools/extract_data.py),
   la progression est stockée dans le navigateur (localStorage). */
(function () {
  "use strict";

  const DATA = window.ZDATA;
  const GAMES = ["oot", "mm", "tfh"];
  const KEY = "zelda-manager:v1";

  // ------------------------------------------------------------------ textes de l'interface
  const UI = {
    fr: {
      home: "Accueil", tagline: "Tes trois managers Zelda réunis en un seul endroit. Coche ce que tu as, vois ce qu'il te reste, vise les 100 %.",
      open: "Ouvrir le manager →", overview: "Vue d'ensemble", next: "Prochain :", allDone: "Tout est fait !",
      search: "Rechercher…", all: "Tout", todo: "À faire", done: "Fait", details: "Détails", hide: "Masquer",
      showAnswer: "Voir la réponse", answer: "Réponse :", nq: "Normal", mq: "Master Quest",
      rewards: "Récompenses de la Maison des Skulltulas", noResult: "Rien à afficher avec ce filtre.",
      export: "⬇  Exporter ma sauvegarde", import: "⬆  Importer une sauvegarde", resetGame: "Réinitialiser ce jeu", resetAll: "Tout réinitialiser",
      confirmReset: "Effacer la progression de « {g} » ? Cette action est définitive.", confirmResetAll: "Effacer toute la progression des trois jeux ?",
      imported: "Sauvegarde importée ✔", badFile: "Ce fichier n'est pas une sauvegarde Zelda Manager.",
      saveBox: "Sauvegarde automatique", saveTxt: "Ta progression est gardée dans ce navigateur. Utilise le menu ⋯ pour l'exporter ou la transférer sur un autre appareil.",
      langBox: "Français / English", langTxt: "Comme les classeurs d'origine, tout est bilingue : bouton FR/EN en haut à droite.",
      histBox: "L'histoire", histTxt: "Nés en 2015 sous forme de classeurs Excel (OoT v7, Majora v4, Tri Force Heroes v6), ils reviennent ici en version web complète — plus de version d'essai ni de mot de passe.",
      footer: "Créé par Soaresden — classeurs Excel 2015, version web 2026. Projet de fan non officiel ; The Legend of Zelda est une marque de Nintendo.",
      levels: "défis", outfits: "tenues", owned: "Possédée", craftable: "Fabricable !", price: "{n} rubis",
      challenge: "Défi", stage: "Niveau", drops: "Récompenses possibles", have: "en stock",
      missingOutfits: "Manquantes", craftOnly: "Fabricables", needed: "Utiles", sellable: "Vendables",
      need: "Requis : {n}", enough: "Suffisant", short: "Manque {n}", canSell: "Vendable", farm: "Où farmer :",
      noDrop: "Pas de niveau connu — boutique ou zone {z}", tfhHint: "Clique sur une case pour la cocher et voir ce qu'elle rapporte.",
      matHint: "Saisis ton inventaire : le site calcule ce qu'il manque pour chaque tenue et ce que tu peux vendre sans risque.",
      zone: "Zone", den: "Crypte", world: "Monde",
    },
    en: {
      home: "Home", tagline: "Your three Zelda managers in one place. Tick what you have, see what's left, aim for 100%.",
      open: "Open the manager →", overview: "Overview", next: "Next:", allDone: "All done!",
      search: "Search…", all: "All", todo: "To do", done: "Done", details: "Details", hide: "Hide",
      showAnswer: "Show answer", answer: "Answer:", nq: "Normal", mq: "Master Quest",
      rewards: "House of Skulltula rewards", noResult: "Nothing to show with this filter.",
      export: "⬇  Export my save", import: "⬆  Import a save", resetGame: "Reset this game", resetAll: "Reset everything",
      confirmReset: "Erase your progress for “{g}”? This cannot be undone.", confirmResetAll: "Erase all progress for the three games?",
      imported: "Save imported ✔", badFile: "This file is not a Zelda Manager save.",
      saveBox: "Automatic save", saveTxt: "Your progress is kept in this browser. Use the ⋯ menu to export it or move it to another device.",
      langBox: "English / Français", langTxt: "Just like the original workbooks, everything is bilingual: FR/EN button at the top right.",
      histBox: "The story", histTxt: "Born in 2015 as Excel workbooks (OoT v7, Majora v4, Tri Force Heroes v6), they're back as a complete web version — no more trial or password.",
      footer: "Made by Soaresden — Excel workbooks 2015, web version 2026. Unofficial fan project; The Legend of Zelda is a trademark of Nintendo.",
      levels: "challenges", outfits: "outfits", owned: "Owned", craftable: "Craftable!", price: "{n} rupees",
      challenge: "Challenge", stage: "Level", drops: "Possible rewards", have: "in stock",
      missingOutfits: "Missing", craftOnly: "Craftable", needed: "Useful", sellable: "Sellable",
      need: "Needed: {n}", enough: "Enough", short: "{n} missing", canSell: "Safe to sell", farm: "Where to farm:",
      noDrop: "No known level — shop or zone {z}", tfhHint: "Click a cell to tick it and see what it rewards.",
      matHint: "Enter your inventory: the site works out what each outfit still needs and what you can safely sell.",
      zone: "Zone", den: "Den", world: "World",
    },
  };

  // ------------------------------------------------------------------ état & sauvegarde
  const blank = () => ({ lang: "fr", games: { oot: { c: {}, mq: {} }, mm: { c: {} }, tfh: { lv: {}, of: {}, st: {} } } });
  let S = load();
  const ui = { filter: "all", q: "", open: new Set(), reveal: new Set(), closed: new Set(), sel: null, ofilter: "all", mfilter: "all" };

  function load() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY));
      if (raw && raw.games) return merge(blank(), raw);
    } catch (e) { /* stockage indisponible : on repart de zéro */ }
    const s = blank();
    if (/^en\b/i.test(navigator.language || "")) s.lang = "en";
    return s;
  }
  function merge(base, src) {
    base.lang = src.lang === "en" ? "en" : "fr";
    for (const g of GAMES) Object.assign(base.games[g], src.games && src.games[g]);
    return base;
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* ignoré */ } }

  // ------------------------------------------------------------------ utilitaires
  const L = (o) => (o == null ? "" : typeof o === "string" ? o : o[S.lang] || o.fr || o.en || "");
  const T = (k, vars) => (UI[S.lang][k] || k).replace(/\{(\w+)\}/g, (_, v) => (vars && vars[v] != null ? vars[v] : ""));
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const pct = (a, b) => (b ? Math.floor((a / b) * 100) : 0);
  const $ = (sel, root) => (root || document).querySelector(sel);
  const app = $("#app");
  const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

  // ------------------------------------------------------------------ calculs de progression
  function itemView(game, group, it) {
    // Variante Master Quest pour les skulltulas d'OoT
    if (it.mq && group.mqKey && S.games[game].mq[group.mqKey]) return Object.assign({}, it, it.mq);
    return it;
  }
  function groupStats(game, g) {
    const c = S.games[game].c;
    const done = g.items.filter((i) => c[i.id]).length;
    return { done, total: g.items.length };
  }
  function sectionStats(game, sec) {
    let done = 0, total = 0;
    for (const g of sec.groups || []) { const s = groupStats(game, g); done += s.done; total += s.total; }
    return { done, total };
  }
  function tfhStats() {
    const d = DATA.tfh, st = S.games.tfh;
    const lv = d.levels.filter((l) => st.lv[l.id]).length;
    const of = d.outfits.filter((o) => st.of[o.id]).length;
    return { lv, of, done: lv + of, total: d.levels.length + d.outfits.length };
  }
  function tfhSectionStats(id) {
    const d = DATA.tfh, st = S.games.tfh, s = tfhStats();
    if (id === "levels") return { done: s.lv, total: d.levels.length };
    if (id === "outfits") return { done: s.of, total: d.outfits.length };
    const need = materialNeeds();
    const mats = d.materials.filter((m) => need[m.id] > 0);
    return { done: mats.filter((m) => (st.st[m.id] || 0) >= need[m.id]).length, total: mats.length };
  }
  function gameStats(game) {
    if (game === "tfh") return tfhStats();
    let done = 0, total = 0;
    for (const sec of DATA[game].sections) {
      if (sec.countsForTotal === false) continue;
      const s = sectionStats(game, sec); done += s.done; total += s.total;
    }
    return { done, total };
  }
  function nextItem(game, sec) {
    for (const g of sec.groups || []) {
      const it = g.items.find((i) => !S.games[game].c[i.id]);
      if (it) return { g, it };
    }
    return null;
  }

  // Tri Force Heroes : besoins en matériaux des tenues non possédées
  function materialNeeds() {
    const need = {};
    for (const o of DATA.tfh.outfits) {
      if (S.games.tfh.of[o.id]) continue;
      for (const x of o.ingredients) need[x.m] = (need[x.m] || 0) + x.q;
    }
    return need;
  }
  const matById = {};
  DATA.tfh.materials.forEach((m) => (matById[m.id] = m));
  const lvlById = {};
  DATA.tfh.levels.forEach((l) => (lvlById[l.id] = l));
  function lvlCode(l) {
    return l.world === 9 ? `${T("den")} ${l.challenge}` : `${l.world}-${l.stage} · ${l.challenge}`;
  }

  // ------------------------------------------------------------------ rendu : structure générale
  function route() {
    const [game, sec] = location.hash.replace(/^#\/?/, "").split("/");
    return { game: GAMES.includes(game) ? game : null, sec: sec || null };
  }

  function render() {
    const r = route();
    document.documentElement.lang = S.lang;
    document.body.className = r.game ? `theme-${r.game}` : "";
    $("#lang-btn").textContent = S.lang === "fr" ? "EN" : "FR";
    $("#lang-btn").title = S.lang === "fr" ? "Switch to English" : "Passer en français";
    renderNav(r);
    renderMenu(r);
    $("#foot").textContent = T("footer");
    if (!r.game) { document.title = "Zelda Manager"; app.innerHTML = homeView(); return; }
    document.title = `${L(DATA[r.game].title)} — Zelda Manager`;
    app.innerHTML = gameView(r.game, r.sec);
    if (r.game !== "tfh") syncChecklist(r.game);
  }

  function renderNav(r) {
    const links = [`<a href="#/" class="${r.game ? "" : "on"}">${T("home")}</a>`]
      .concat(GAMES.map((g) => `<a href="#/${g}" class="${r.game === g ? "on" : ""}">${esc(L(DATA[g].title))}</a>`));
    $("#topnav").innerHTML = links.join("");
  }
  function renderMenu(r) {
    const m = $("#menu");
    m.querySelector('[data-act="export"]').textContent = T("export");
    m.querySelector('[data-act="import"]').textContent = T("import");
    m.querySelector('[data-act="reset"]').textContent = r.game ? T("resetGame") : T("resetAll");
  }

  // ------------------------------------------------------------------ accueil
  function homeView() {
    const cards = GAMES.map((g) => {
      const d = DATA[g], s = gameStats(g), p = pct(s.done, s.total);
      return `<a class="game-card theme-${g}" href="#/${g}">
        <div class="cover"><img src="${d.logo}" alt="${esc(L(d.title))}"></div>
        <div class="body">
          <h2>${esc(L(d.title))}</h2>
          <p>${esc(L(d.subtitle))} · ${s.done}/${s.total}</p>
          <div class="pct-row"><div class="bar"><i style="width:${p}%"></i></div>${p}%</div>
          <span class="go">${T("open")}</span>
        </div></a>`;
    }).join("");
    return `<section class="hero"><h1>Zelda <b>Manager</b></h1><p>${T("tagline")}</p></section>
      <section class="games">${cards}</section>
      <section class="about">
        <div class="box"><h3>💾 ${T("saveBox")}</h3><p>${T("saveTxt")}</p></div>
        <div class="box"><h3>🌐 ${T("langBox")}</h3><p>${T("langTxt")}</p></div>
        <div class="box"><h3>📜 ${T("histBox")}</h3><p>${T("histTxt")}</p></div>
      </section>`;
  }

  // ------------------------------------------------------------------ page d'un jeu
  function gameView(game, secId) {
    const d = DATA[game], s = gameStats(game), p = pct(s.done, s.total);
    const statFor = (sec) => (game === "tfh" ? tfhSectionStats(sec.id) : sectionStats(game, sec));
    const tabs = [`<a class="tab ${secId ? "" : "on"}" href="#/${game}"><img src="img/ico-heart.png" alt="">${T("overview")}</a>`]
      .concat(d.sections.map((sec) => {
        const st = statFor(sec);
        return `<a class="tab ${secId === sec.id ? "on" : ""} ${st.total && st.done === st.total ? "done" : ""}" href="#/${game}/${sec.id}">
          <img src="img/${sec.icon}.png" alt="">${esc(L(sec.title))} <small data-tab="${sec.id}">${st.done}/${st.total}</small></a>`;
      }));
    const head = `<section class="game-head">
        <img class="logo" src="${d.logo}" alt="">
        <div><h1>${esc(L(d.title))}</h1><p>${esc(L(d.subtitle))} · ${esc(d.version)}</p>
          <div class="pct-row"><div class="bar gold"><i id="game-bar" style="width:${p}%"></i></div><small id="game-count">${s.done}/${s.total}</small></div></div>
        <div class="ring" id="game-ring" style="--p:${p}"><span>${p}%</span></div>
      </section>
      <nav class="tabs">${tabs.join("")}</nav>`;
    const sec = d.sections.find((x) => x.id === secId);
    if (!sec) return head + overviewView(game);
    if (sec.kind === "tfh-levels") return head + tfhLevelsView();
    if (sec.kind === "tfh-outfits") return head + tfhOutfitsView();
    if (sec.kind === "tfh-materials") return head + tfhMaterialsView();
    return head + checklistView(game, sec);
  }

  function overviewView(game) {
    const d = DATA[game];
    return `<section class="overview">${d.sections.map((sec) => {
      const st = game === "tfh" ? tfhSectionStats(sec.id) : sectionStats(game, sec);
      const p = pct(st.done, st.total);
      let next = "";
      if (game !== "tfh") {
        const n = nextItem(game, sec);
        next = n ? `${T("next")} <b>${esc(L(n.g.title))}</b> — ${esc(L(n.it.name))}` : `✔ ${T("allDone")}`;
      }
      return `<a class="ov-card" href="#/${game}/${sec.id}">
        <div class="t"><img src="img/${sec.icon}.png" alt="">${esc(L(sec.title))}</div>
        <div class="pct-row"><div class="bar"><i style="width:${p}%"></i></div>${st.done}/${st.total}</div>
        ${next ? `<div class="next">${next}</div>` : ""}</a>`;
    }).join("")}</section>`;
  }

  // ------------------------------------------------------------------ listes à cocher (OoT / Majora)
  function toolbar(extra) {
    const f = (k) => `<button type="button" data-filter="${k}" class="${ui.filter === k ? "on" : ""}">${T(k)}</button>`;
    return `<div class="toolbar"><input class="search" type="search" id="search" placeholder="${T("search")}" value="${esc(ui.q)}">
      <div class="seg">${f("all")}${f("todo")}${f("done")}</div>${extra || ""}</div>`;
  }

  function checklistView(game, sec) {
    let html = toolbar();
    if (sec.rewards) {
      const got = sectionStats(game, sec).done;
      html += `<div class="hint">${T("rewards")}</div><div class="rewards">${sec.rewards.map((r) =>
        `<div class="reward ${got >= r.at ? "got" : ""}" data-reward="${r.at}"><b>${r.at}</b>${esc(L(r.label))}</div>`).join("")}</div>`;
    }
    html += sec.groups.map((g, gi) => {
      const key = `${game}/${sec.id}/${gi}`;
      const mq = g.mqKey ? `<span class="seg mq-toggle" data-mq="${esc(g.mqKey)}">
          <button type="button" data-mqv="0" class="${S.games[game].mq[g.mqKey] ? "" : "on"}">${T("nq")}</button>
          <button type="button" data-mqv="1" class="${S.games[game].mq[g.mqKey] ? "on" : ""}">${T("mq")}</button></span>` : "";
      const icons = (g.icons || []);
      return `<section class="group ${ui.closed.has(key) ? "closed" : ""}" data-group="${key}">
        <header data-toggle="${key}"><span class="chev">▾</span><h3>${esc(L(g.title))} ${mq}</h3>
          <div class="bar"><i></i></div><span class="count"></span></header>
        <div class="items">${g.items.map((raw, ii) => itemRow(game, sec, g, raw, icons[ii])).join("")}</div></section>`;
    }).join("");
    return html + `<div class="empty" id="empty" hidden>${T("noResult")}</div>`;
  }

  function itemRow(game, sec, g, raw, icon) {
    const it = itemView(game, g, raw);
    const tags = (it.tags || []).map((t) => `<span class="chip">${esc(L(t))}</span>`).join("");
    const hasInfo = it.info && L(it.info);
    const open = ui.open.has(it.id);
    let extra = "";
    if (sec.kind === "quiz") {
      extra = `<div class="answer">${ui.reveal.has(it.id)
        ? `${T("answer")} <strong>${esc(L(it.answer))}</strong>`
        : `<button type="button" data-reveal="${it.id}">${T("showAnswer")}</button>`}</div>`;
    }
    const text = norm(`${L(g.title)} ${L(it.name)} ${L(it.info)} ${(it.tags || []).map(L).join(" ")}`);
    return `<div class="it ${open ? "open" : ""}" data-id="${it.id}" data-text="${esc(text)}" ${g.ordered ? "data-ordered" : ""}>
      <input class="check" type="checkbox" data-check="${it.id}" aria-label="${esc(L(it.name))}">
      <div class="main"><div class="name">${esc(L(it.name))}</div>${tags ? `<div class="tags">${tags}</div>` : ""}
        ${hasInfo ? `<div class="info">${esc(L(it.info))}</div>` : ""}${extra}</div>
      <span class="side">${icon ? `<img class="ico" src="img/${icon}.png" alt="">` : ""}${hasInfo ? `<button type="button" class="more" data-more="${it.id}">${open ? T("hide") : T("details")}</button>` : ""}</span>
    </div>`;
  }

  // Met à jour coches, compteurs et filtres sans reconstruire la page
  function syncChecklist(game) {
    const c = S.games[game].c;
    const q = norm(ui.q.trim());
    let visible = 0;
    app.querySelectorAll(".group").forEach((gEl) => {
      let done = 0, total = 0, shown = 0, nextSet = false;
      gEl.querySelectorAll(".it").forEach((row) => {
        const on = !!c[row.dataset.id];
        total++; if (on) done++;
        row.querySelector(".check").checked = on;
        row.classList.toggle("done", on);
        const isNext = !on && !nextSet && row.hasAttribute("data-ordered");
        if (isNext) nextSet = true;
        row.classList.toggle("next", isNext);
        const match = (!q || row.dataset.text.includes(q)) &&
          (ui.filter === "all" || (ui.filter === "done") === on);
        row.hidden = !match;
        if (match) shown++;
      });
      gEl.hidden = shown === 0;
      visible += shown;
      gEl.classList.toggle("complete", done === total);
      gEl.querySelector(".count").textContent = `${done}/${total}`;
      gEl.querySelector(".bar > i").style.width = pct(done, total) + "%";
    });
    const empty = $("#empty");
    if (empty) empty.hidden = visible > 0;
    refreshHeader(game);
  }

  function refreshHeader(game) {
    const s = gameStats(game), p = pct(s.done, s.total);
    const bar = $("#game-bar"); if (!bar) return;
    bar.style.width = p + "%";
    $("#game-count").textContent = `${s.done}/${s.total}`;
    const ring = $("#game-ring"); ring.style.setProperty("--p", p); ring.querySelector("span").textContent = p + "%";
    for (const sec of DATA[game].sections) {
      const el = app.querySelector(`[data-tab="${sec.id}"]`); if (!el) continue;
      const st = game === "tfh" ? tfhSectionStats(sec.id) : sectionStats(game, sec);
      el.textContent = `${st.done}/${st.total}`;
      el.parentElement.classList.toggle("done", st.total > 0 && st.done === st.total);
      if (sec.rewards) app.querySelectorAll("[data-reward]").forEach((r) => r.classList.toggle("got", st.done >= +r.dataset.reward));
    }
  }

  // ------------------------------------------------------------------ Tri Force Heroes : défis
  function tfhLevelsView() {
    const d = DATA.tfh, st = S.games.tfh;
    const worlds = Object.keys(d.worlds).map(Number).map((w) => {
      const lv = d.levels.filter((l) => l.world === w);
      const done = lv.filter((l) => st.lv[l.id]).length;
      const cell = (l) => `<button type="button" class="cell ${st.lv[l.id] ? "on" : ""} ${ui.sel === l.id ? "sel" : ""}" data-lvl="${l.id}" title="${esc(L(l.label))}">${l.challenge}</button>`;
      let grid;
      if (w === 9) {
        grid = `<div class="lvl-grid"><span class="stage">${T("den")} 1–4</span>${lv.slice(0, 4).map(cell).join("")}
          <span class="stage">${T("den")} 5–8</span>${lv.slice(4).map(cell).join("")}</div>`;
      } else {
        const stages = [1, 2, 3, 4].map((s) => {
          const row = lv.filter((l) => l.stage === s);
          return `<span class="stage" title="${esc(L(d.stages[w * 10 + s]))}">${w}-${s} ${esc(L(d.stages[w * 10 + s]))}</span>${row.map(cell).join("")}`;
        }).join("");
        grid = `<div class="lvl-grid">${stages}</div>`;
      }
      return `<div class="world"><h3>${w === 9 ? "" : `${T("world")} ${w} · `}${esc(L(d.worlds[w]))}<small>${done}/${lv.length}</small></h3>${grid}</div>`;
    }).join("");
    return `<p class="hint">${T("tfhHint")}</p><section class="worlds">${worlds}</section>${levelDetail()}`;
  }

  function levelDetail() {
    const l = lvlById[ui.sel];
    if (!l) return "";
    const st = S.games.tfh;
    const drops = l.drops.map((x) => {
      const m = matById[x.m];
      const name = m ? L(m.name) : L(x.label);
      const stock = m ? ` · ${st.st[m.id] || 0} ${T("have")}` : "";
      return `<span class="chip accent">${x.p}% — ${esc(name)}${stock}</span>`;
    }).join("");
    const where = l.world === 9 ? T("den") : `${l.world}-${l.stage} ${L(DATA.tfh.stages[l.world * 10 + l.stage])}`;
    return `<div class="detail"><h4>${esc(where)} — ${T("challenge")} ${l.challenge}</h4>
      <div class="row"><span class="chip ${st.lv[l.id] ? "ok" : ""}">${esc(L(l.label))}</span>${drops ? ` ${T("drops")} : ${drops}` : ""}</div></div>`;
  }

  // ------------------------------------------------------------------ Tri Force Heroes : tenues
  function outfitState(o) {
    const st = S.games.tfh;
    const parts = o.ingredients.map((x) => ({ m: matById[x.m], q: x.q, have: st.st[x.m] || 0 }));
    const ready = parts.every((p) => p.have >= p.q);
    return { parts, ready, owned: !!st.of[o.id] };
  }

  function tfhOutfitsView() {
    const f = (k) => `<button type="button" data-ofilter="${k}" class="${ui.ofilter === k ? "on" : ""}">${T(k)}</button>`;
    const list = DATA.tfh.outfits.map((o) => {
      const s = outfitState(o);
      if (ui.ofilter === "missingOutfits" && s.owned) return "";
      if (ui.ofilter === "craftOnly" && (s.owned || !s.ready || !o.ingredients.length)) return "";
      const ing = s.parts.map((p) => `<span class="chip ${s.owned ? "" : p.have >= p.q ? "ok" : "warn"}">${esc(L(p.m.name))} ${s.owned ? "×" + p.q : `${Math.min(p.have, p.q)}/${p.q}`}</span>`).join("");
      const chips = [
        s.owned ? `<span class="chip ok">✔ ${T("owned")}</span>` : s.ready && o.ingredients.length ? `<span class="chip ok">★ ${T("craftable")}</span>` : "",
        o.price ? `<span class="chip accent">${T("price", { n: o.price })}</span>` : "",
        o.note ? `<span class="chip">${esc(L(o.note))}</span>` : "",
      ].join("");
      return `<div class="outfit ${s.owned ? "owned" : ""}">
        <div class="top"><input class="check" type="checkbox" data-outfit="${o.id}" ${s.owned ? "checked" : ""} aria-label="${esc(L(o.name))}">
          <div><h4>${esc(L(o.name))}</h4><div class="desc">${esc(L(o.desc))}</div></div></div>
        ${ing ? `<div class="ing">${ing}</div>` : ""}<div class="ing">${chips}</div></div>`;
    }).join("");
    return `<div class="toolbar"><div class="seg">${f("all")}${f("missingOutfits")}${f("craftOnly")}</div></div>
      <section class="outfits">${list || `<div class="empty">${T("noResult")}</div>`}</section>`;
  }

  // ------------------------------------------------------------------ Tri Force Heroes : matériaux
  function tfhMaterialsView() {
    const d = DATA.tfh, st = S.games.tfh, need = materialNeeds();
    const f = (k) => `<button type="button" data-mfilter="${k}" class="${ui.mfilter === k ? "on" : ""}">${T(k)}</button>`;
    const q = norm(ui.q.trim());
    const zones = Object.keys(d.zones).map(Number).map((z) => {
      const mats = d.materials.filter((m) => m.zone === z).filter((m) => {
        const n = need[m.id] || 0, have = st.st[m.id] || 0;
        if (q && !norm(`${L(m.name)} ${m.name.fr} ${m.name.en}`).includes(q)) return false;
        if (ui.mfilter === "needed") return n > have;
        if (ui.mfilter === "sellable") return have > n;
        return true;
      });
      if (!mats.length) return "";
      return `<h3 class="zone-title">${T("zone")} ${z} · ${esc(L(d.zones[z]))}</h3><section class="mats">${mats.map((m) => matCard(m, need[m.id] || 0)).join("")}</section>`;
    }).join("");
    return `<p class="hint">${T("matHint")}</p>
      <div class="toolbar"><input class="search" type="search" id="search" placeholder="${T("search")}" value="${esc(ui.q)}">
      <div class="seg">${f("all")}${f("needed")}${f("sellable")}</div></div>${zones || `<div class="empty">${T("noResult")}</div>`}`;
  }

  function matCard(m, n) {
    const have = S.games.tfh.st[m.id] || 0;
    const status = n === 0 ? (have > 0 ? `<span class="chip">${T("canSell")}</span>` : "")
      : have >= n ? `<span class="chip ok">${T("need", { n })} · ${T("enough")}</span>`
        : `<span class="chip warn">${T("need", { n })} · ${T("short", { n: n - have })}</span>`;
    const users = m.usedBy.filter((id) => !S.games.tfh.of[id]).map((id) => {
      const o = DATA.tfh.outfits.find((x) => x.id === id); return L(o.name);
    });
    const best = m.drops.slice().sort((a, b) => b.p - a.p || (S.games.tfh.lv[a.lvl] ? 1 : 0) - (S.games.tfh.lv[b.lvl] ? 1 : 0)).slice(0, 4);
    const where = best.length
      ? `${T("farm")} ${best.map((x) => `${lvlCode(lvlById[x.lvl])} (${x.p}%)`).join(", ")}`
      : T("noDrop", { z: m.zone });
    return `<div class="mat" data-mat="${m.id}">
      <div class="top"><b>${esc(L(m.name))}</b>
        <span class="stepper"><button type="button" data-step="-1" aria-label="-1">−</button><input type="number" min="0" inputmode="numeric" value="${have}" data-stock="${m.id}" aria-label="${esc(L(m.name))}"><button type="button" data-step="1" aria-label="+1">+</button></span></div>
      <div class="ing">${status}${users.length ? users.map((u) => `<span class="chip">${esc(u)}</span>`).join("") : ""}</div>
      <div class="where">${esc(where)}</div></div>`;
  }

  // ------------------------------------------------------------------ événements
  app.addEventListener("change", (e) => {
    const r = route(), el = e.target;
    if (el.dataset.check) {
      const c = S.games[r.game].c;
      if (el.checked) c[el.dataset.check] = 1; else delete c[el.dataset.check];
      save(); syncChecklist(r.game);
    } else if (el.dataset.outfit) {
      const of = S.games.tfh.of;
      if (el.checked) of[el.dataset.outfit] = 1; else delete of[el.dataset.outfit];
      save(); keepScroll(render);
    } else if (el.dataset.stock) {
      setStock(el.dataset.stock, el.value);
    }
  });

  app.addEventListener("input", (e) => {
    if (e.target.id !== "search") return;
    ui.q = e.target.value;
    const r = route();
    if (r.game === "tfh") {
      const pos = e.target.selectionStart;
      keepScroll(render);
      const s = $("#search"); s.focus(); s.setSelectionRange(pos, pos);
    } else syncChecklist(r.game);
  });

  app.addEventListener("click", (e) => {
    const r = route();
    const b = e.target.closest("button, header[data-toggle]");
    if (!b) return;
    if (b.dataset.filter) { ui.filter = b.dataset.filter; b.parentElement.querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === b)); syncChecklist(r.game); }
    else if (b.dataset.more) {
      const row = b.closest(".it"), id = b.dataset.more;
      ui.open.has(id) ? ui.open.delete(id) : ui.open.add(id);
      row.classList.toggle("open"); b.textContent = row.classList.contains("open") ? T("hide") : T("details");
    } else if (b.dataset.reveal) { ui.reveal.add(b.dataset.reveal); b.parentElement.innerHTML = `${T("answer")} <strong>${esc(L(findItem(r.game, b.dataset.reveal).answer))}</strong>`; }
    else if (b.dataset.mqv) {
      const key = b.closest("[data-mq]").dataset.mq;
      S.games.oot.mq[key] = b.dataset.mqv === "1" ? 1 : 0; save(); keepScroll(render);
    } else if (b.dataset.toggle) {
      if (e.target.closest(".mq-toggle")) return;
      const key = b.dataset.toggle; ui.closed.has(key) ? ui.closed.delete(key) : ui.closed.add(key);
      b.parentElement.classList.toggle("closed");
    } else if (b.dataset.lvl) {
      const id = b.dataset.lvl, lv = S.games.tfh.lv;
      if (ui.sel === id || !lv[id]) { if (lv[id]) delete lv[id]; else lv[id] = 1; }
      ui.sel = id; save(); keepScroll(render);
    } else if (b.dataset.ofilter) { ui.ofilter = b.dataset.ofilter; keepScroll(render); }
    else if (b.dataset.mfilter) { ui.mfilter = b.dataset.mfilter; keepScroll(render); }
    else if (b.dataset.step) {
      const id = b.closest("[data-mat]").dataset.mat;
      setStock(id, (S.games.tfh.st[id] || 0) + Number(b.dataset.step));
    }
  });

  function setStock(id, v) {
    const n = Math.max(0, Math.min(999, parseInt(v, 10) || 0));
    if (n) S.games.tfh.st[id] = n; else delete S.games.tfh.st[id];
    save(); keepScroll(render);
  }
  function findItem(game, id) {
    for (const sec of DATA[game].sections) for (const g of sec.groups || []) for (const it of g.items) if (it.id === id) return it;
    return {};
  }
  function keepScroll(fn) { const y = window.scrollY; fn(); window.scrollTo(0, y); }

  // ------------------------------------------------------------------ langue, menu, sauvegarde
  $("#lang-btn").addEventListener("click", () => { S.lang = S.lang === "fr" ? "en" : "fr"; save(); keepScroll(render); });
  const menu = $("#menu");
  $("#menu-btn").addEventListener("click", (e) => { e.stopPropagation(); menu.hidden = !menu.hidden; });
  document.addEventListener("click", (e) => { if (!menu.contains(e.target)) menu.hidden = true; });
  menu.addEventListener("click", (e) => {
    const act = e.target.dataset.act; if (!act) return;
    menu.hidden = true;
    const r = route();
    if (act === "export") {
      const blob = new Blob([JSON.stringify({ app: "zelda-manager", version: 1, saved: new Date().toISOString(), ...S }, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `zelda-manager-${new Date().toISOString().slice(0, 10)}.json`;
      a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    } else if (act === "import") {
      $("#import-file").click();
    } else if (act === "reset") {
      if (r.game) {
        if (!confirm(T("confirmReset", { g: L(DATA[r.game].title) }))) return;
        S.games[r.game] = blank().games[r.game];
      } else {
        if (!confirm(T("confirmResetAll"))) return;
        const lang = S.lang; S = blank(); S.lang = lang;
      }
      save(); render();
    }
  });
  $("#import-file").addEventListener("change", (e) => {
    const file = e.target.files[0]; if (!file) return;
    file.text().then((txt) => {
      const data = JSON.parse(txt);
      if (!data || data.app !== "zelda-manager" || !data.games) throw new Error("bad");
      S = merge(blank(), data); save(); render(); alert(T("imported"));
    }).catch(() => alert(T("badFile"))).finally(() => { e.target.value = ""; });
  });

  window.addEventListener("hashchange", () => { ui.q = ""; ui.sel = null; render(); window.scrollTo(0, 0); });
  window.addEventListener("storage", (e) => { if (e.key === KEY) { S = load(); keepScroll(render); } });
  render();
})();
