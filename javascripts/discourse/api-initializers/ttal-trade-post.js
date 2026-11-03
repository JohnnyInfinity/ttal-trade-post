/**
 * TTAL Trade Post — Discourse theme component
 *
 * Floating "Post" button → full-screen overlay → Trade Submission / Quick Post.
 * Posts to the Apps Script FormIntake endpoint (settings.endpoint) as
 * application/x-www-form-urlencoded with one field, payload=<JSON>.
 *
 * Visibility: staff only while settings.staff_only is on; otherwise staff +
 * members of settings.allowed_groups.
 */
import { apiInitializer } from "discourse/lib/api";

export default apiInitializer("1.8", (api) => {
  const user = api.getCurrentUser();
  if (!user) return;

  // ── who may see it ────────────────────────────────────────────────────────
  // allowed_groups is a group_list setting: pipe-separated group ids (older builds may store names)
  const allowed = String(settings.allowed_groups || "")
    .split("|").map((s) => s.trim().toLowerCase()).filter(Boolean);
  const inAllowed = (user.groups || []).some((g) =>
    allowed.includes(String(g.id)) || allowed.includes((g.name || "").toLowerCase()));
  const canUse = user.staff || (!settings.staff_only && inAllowed);
  if (!canUse) return;

  /* ============================================================
     CONFIG — same shape as the prototype; edit questions here
     ============================================================ */
  const FX = (settings.fx_tickers || "").split("|").map((s) => s.trim().toUpperCase()).filter(Boolean);
  const TF_ALL = ["15m", "1h", "4h", "D", "W"];
  const GRADES = ["A+", "A", "B"];
  const YN = ["Yes", "No"];
  const HTF = ["Bullish", "Bearish", "Rangebound"];
  const DIV = ["Bullish", "Bearish", "None"];

  const CORE_CHART = [
    { id: "direction", label: "Long or short?", type: "seg", options: ["Long", "Short"] },
    { id: "timeframe", label: "Timeframe", type: "seg", options: TF_ALL },
    { id: "entry", label: "Entry", type: "num", row: "prices" },
    { id: "stop", label: "Stop", type: "num", row: "prices" },
    { id: "tp", label: "Take profit", type: "num", row: "prices" },
    { id: "risk", label: "% risk", type: "num", step: "0.1", placeholder: "1.0" },
    { id: "grade", label: "Grade", type: "seg", options: GRADES, cls: "grade" },
  ];
  const CORE_BRENT = [
    { id: "direction", label: "Buy or sell?", type: "seg", options: ["Buy", "Sell"] },
    { id: "quantity", label: "Quantity", type: "num", placeholder: "Units / contracts" },
    { id: "entry", label: "Entry price", type: "num", row: "prices" },
    { id: "stop", label: "Stop", type: "num", row: "prices" },
    { id: "target", label: "Target", type: "num", row: "prices" },
    { id: "grade", label: "Grade", type: "seg", options: GRADES, cls: "grade" },
  ];
  const RATIONALE = { id: "rationale", label: "Rationale", type: "text", placeholder: "2–8 sentences: what is the trade and why" };
  const THEME = { id: "theme", label: "Theme", type: "seg", options: ["Deep State", "FX Rates", "AI Bottlenecks", "Other"] };

  const METHODS = [
    { id: "wm", name: "W/M Patterns", ic: "〰", core: "chart", tickers: FX, tf: ["1h", "4h", "D", "W"], quickBlock: [],
      block: [
        { id: "variant", label: "Variant", type: "seg", options: ["Standard", "Extended"] },
        { id: "divergence", label: "Divergence?", type: "seg", options: DIV },
        { id: "sr25", label: "S&R in first 25%?", type: "seg", options: YN, showIf: { variant: "Extended" } },
      ] },
    { id: "hs", name: "Head & Shoulders", ic: "🏔", core: "chart", tickers: FX, quickBlock: [],
      block: [
        { id: "divergence", label: "Divergence?", type: "seg", options: DIV },
        { id: "quasimodo", label: "Quasimodo entry?", type: "seg", options: YN },
      ] },
    { id: "sd", name: "Supply & Demand", ic: "📦", core: "chart", tickers: FX, fixedTf: "1h", quickBlock: [],
      block: [
        { id: "variant", label: "Variant", type: "seg", options: ["Standard", "Flip Zone"] },
        { id: "htf", label: "HTF bias?", type: "seg", options: HTF },
        { id: "ltf", label: "LTF aligned?", type: "seg", options: YN },
        { id: "consol", label: "Consolidation + imbalance?", type: "seg", options: YN, showIf: { variant: "Standard" } },
        { id: "blast", label: "Retracement blasted through zone?", type: "seg", options: YN, showIf: { variant: "Flip Zone" } },
      ] },
    { id: "ob", name: "Order Blocks", ic: "🧱", core: "chart", tickers: FX, fixedTf: "4h", quickBlock: [],
      block: [
        { id: "htf", label: "HTF bias?", type: "seg", options: HTF },
        { id: "ltf", label: "LTF aligned?", type: "seg", options: YN },
        { id: "imbalance", label: "Imbalance / strong move?", type: "seg", options: YN },
      ] },
    { id: "bb", name: "Bollinger Bands", ic: "📈", core: "chart", tickers: FX, fixedTf: "1h", block: [],
      tradeShots: [{ key: "shot_4h", label: "4H expansion" }, { key: "shot_1h", label: "1H entry" }] },
    { id: "fib", name: "Fibonacci", ic: "📐", core: "chart", tickers: FX, block: [] },
    { id: "dxy", name: "DXY", ic: "💱", core: "chart", noTicker: true, fixedTicker: "DXY", fixedTf: "15m",
      block: [{ id: "ar", label: "Attraction or rejection?", type: "seg", options: ["Attraction", "Rejection"] }] },
    { id: "obos", name: "OBOS", ic: "📉", core: "chart", tickers: [], tickerHint: "e.g. AAPL", fixedTf: "D",
      block: [
        { id: "macd", label: "Entry: MACD cross or point?", type: "seg", options: ["Cross", "Point"], tradeOnly: true },
        { id: "redflag", label: "Higher timeframe red flag?", type: "seg", options: YN, tradeOnly: true },
      ] },
    { id: "macro", name: "Macro Trend", ic: "🌍", core: "brent", tickers: [], tickerHint: "e.g. NVDA, TLT", shotOptional: true,
      block: [RATIONALE], quickBlock: [], notesHint: "Theme or idea — what are you watching and why?" },
    { id: "asym", name: "Asymmetric Trend", ic: "⚖", core: "brent", tickers: [], tickerHint: "e.g. NVDA, TLT", shotOptional: true,
      block: [THEME, RATIONALE], quickBlock: [], notesHint: "Theme or idea — what are you watching and why?" },
  ];

  /* ---- method icons (inline SVG, brand style) ---- */
  // TTAL method icons — 100x100, stroke style matching the S&D / H&S originals.
  // B = blue price line, Z1 = lavender zone, Z2 = cyan zone, L = cyan level line.
  const B = "#5B7FE0", Z1 = "#E9D5F5", Z2 = "#D6F4F7", L = "#8FE0E6";
  const wrap = (inner) => `<svg viewBox="0 0 100 100" width="44" height="44" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
  const line = (pts, c = B, w = 5) => `<polyline points="${pts}" stroke="${c}" stroke-width="${w}"/>`;
  const rect = (x, y, w, h, c) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>`;

  const ICONS = {
    // Supply & Demand — W with supply zone above, demand zone below (original)
    sd: wrap(rect(32, 23, 40, 14, Z1) + rect(16, 63, 50, 14, Z2) +
        line("13,53 24,76 38,24 53,70 64,28 75,55 87,11")),

    // Head & Shoulders — three peaks, neckline (original)
    hs: wrap(line("11,52 89,52", L, 3) +
        line("15,76 28,31 40,53 50,23 60,53 73,31 85,76")),

    // W/M Patterns — a clean W (double bottom) with the neckline across the middle peak
    wm: wrap(line("14,44 86,44", L, 3) +
        line("16,24 32,78 50,44 68,78 84,24")),

    // Order Blocks — consolidation block, then the strong move away
    ob: wrap(rect(16, 52, 32, 16, Z1) +
        line("14,58 22,63 30,56 38,64 46,58 60,30 72,42 86,16")),

    // Bollinger Bands — upper/lower bands with the moving average through the middle, price between
    bb: wrap(`<path d="M12,28 C35,16 65,16 88,28" stroke="${L}" stroke-width="3"/>` +
        `<path d="M12,72 C35,84 65,84 88,72" stroke="${L}" stroke-width="3"/>` +
        `<path d="M12,52 C35,46 65,54 88,48" stroke="#C9A6EC" stroke-width="3"/>` +
        line("14,42 28,66 42,54 56,70 70,40 86,36")),

    // Fibonacci — retracement levels with price pulling back then continuing
    fib: wrap(line("20,30 84,30", L, 3) + line("20,46 84,46", L, 3) + line("20,58 84,58", L, 3) + line("20,74 84,74", L, 3) +
        line("14,80 44,24 60,56 86,14")),

    // DXY — prior-day range band, price rejected from it
    dxy: wrap(rect(14, 40, 72, 16, Z2) +
        line("14,72 30,54 44,44 56,52 70,40 86,76")),

    // OBOS — oscillator between overbought / oversold bands
    obos: wrap(rect(12, 20, 76, 12, Z1) + rect(12, 68, 76, 12, Z2) +
        `<path d="M12,52 C22,20 32,20 42,52 S62,84 72,52 S84,24 88,26" stroke="${B}" stroke-width="5"/>`),

    // Macro Trend — long trend inside a channel
    macro: wrap(line("10,66 90,20", L, 3) + line("10,90 90,44", L, 3) +
        line("14,80 30,62 42,70 58,46 70,52 86,28")),

    // Asymmetric Trend — small defined risk, large open reward
    asym: wrap(rect(18, 62, 44, 10, Z1) + rect(44, 14, 42, 34, Z2) +
        line("14,60 28,66 40,58 52,48 64,34 86,18")),
  };

  /* ============================================================ */
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const kindName = (k) => (k === "trade" ? "Trade Submission" : "Quick Post");
  const MAX_SHOTS = 4;
  const fresh = () => ({ data: {}, shots: {}, errors: {}, extra: 0, busy: false, result: null, token: null });

  let overlay = null, app = null, crumbs = null;
  let state = null;

  // Base slots per method/version, plus however many "Add another" extras the student opened (optional).
  function shotsFor(m, k) {
    const base = (k === "trade" && m.tradeShots)
      ? m.tradeShots.map((s) => ({ ...s, optional: !!m.shotOptional }))
      : [{ key: "shot", label: "Screenshot", optional: !!m.shotOptional }];
    const extras = [];
    for (let i = 1; i <= (state?.extra || 0) && base.length + extras.length < MAX_SHOTS; i++) {
      extras.push({ key: "extra" + i, label: "Extra " + i, optional: true });
    }
    return base.concat(extras);
  }

  function activeFields() {
    const m = state.method, k = state.kind;
    const out = [];
    if (!m.noTicker) out.push({ id: "ticker", label: m.core === "brent" ? "Symbol" : "Ticker", type: "ticker" });
    if (k === "trade") {
      let core = m.core === "brent" ? CORE_BRENT : CORE_CHART;
      if (m.core === "chart") {
        core = core.filter((f) => !(f.id === "timeframe" && m.fixedTf))
                   .map((f) => (f.id === "timeframe" && m.tf ? { ...f, options: m.tf } : f));
      }
      out.push(...core);
    }
    const block = (k === "quick" && m.quickBlock) ? m.quickBlock : m.block.filter((f) => !(k === "quick" && f.tradeOnly));
    out.push(...block);
    return out.filter((f) => !f.showIf || Object.entries(f.showIf).every(([kk, v]) => state.data[kk] === v));
  }
  const visibleCount = () => activeFields().length + shotsFor(state.method, state.kind).length + 1;

  /* ---- open / close ---- */
  function open() {
    if (overlay) return;
    state = { screen: "home", kind: null, method: null, ...fresh() };
    overlay = document.createElement("div");
    overlay.className = "ttal-overlay";
    overlay.innerHTML = `<div class="ttal-post"><div class="ttal-wrap">
      <header class="top">
        <a class="wordmark" href="/" title="Home"><span class="bars"><i></i><i></i><i></i></span><span>THE<br>TRADING<br>ACADEMY</span></a>
        <div class="user">Posting as <b>${esc(user.username)}</b> <button class="close" type="button" aria-label="Close" title="Close">×</button></div>
      </header>
      <nav class="crumbs"></nav>
      <main class="app"></main>
    </div></div>`;
    document.body.appendChild(overlay);
    document.documentElement.classList.add("ttal-open");
    document.body.style.overflow = "hidden";
    app = overlay.querySelector(".app");
    crumbs = overlay.querySelector(".crumbs");
    overlay.querySelector(".close").onclick = close;
    overlay.querySelector(".wordmark").onclick = (e) => {
      e.preventDefault();
      if (state.busy) return;
      close();
      api.container.lookup("service:router").transitionTo("/");
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("paste", onPaste);
    render();
  }
  function close() {
    if (!overlay) return;
    if (state.busy) return; // don't close mid-post
    document.removeEventListener("keydown", onKey);
    document.removeEventListener("paste", onPaste);
    overlay.remove(); overlay = null; app = null; crumbs = null;
    document.documentElement.classList.remove("ttal-open");
    document.body.style.overflow = "";
  }
  function onKey(e) { if (e.key === "Escape") close(); }

  function go(patch) { Object.assign(state, patch); render(); overlay.scrollTo({ top: 0 }); }

  function render() {
    renderCrumbs();
    if (state.screen === "home") return renderHome();
    if (state.screen === "method") return renderMethods();
    if (state.screen === "form") return renderForm();
    if (state.screen === "done") return renderDone();
  }

  function renderCrumbs() {
    const parts = [];
    if (state.screen !== "home") parts.push(`<button class="back" type="button">‹ Back</button>`);
    if (state.kind) parts.push(`<span class="${state.screen === "method" ? "here" : ""}">${kindName(state.kind)}</span>`);
    if (state.method) parts.push(`<span class="sep">›</span><span class="here">${esc(state.method.name)}</span>`);
    crumbs.innerHTML = parts.join("");
    const b = crumbs.querySelector(".back");
    if (b) b.onclick = () => {
      if (state.busy) return;
      if (state.screen === "method") go({ screen: "home", kind: null });
      else if (state.screen === "form") go({ screen: "method", method: null, ...fresh() });
      else go({ screen: "home", kind: null, method: null, ...fresh() });
    };
  }

  function renderHome() {
    app.innerHTML = `
      <h1>What are you posting?</h1>
      <p class="sub">Everything goes before the trade. Pick one.</p>
      <div class="tiles">
        <button type="button" class="tile big trade" data-k="trade"><span class="ic">📝</span><span class="t">Trade Submission</span><span class="d">${esc(settings.trade_tile_text || "Placing a trade? Use this.")}</span></button>
        <button type="button" class="tile big" data-k="quick"><span class="ic">⚡</span><span class="t">Quick Post</span><span class="d">${esc(settings.quick_tile_text || "Potential trade? Share your idea here.")}</span></button>
      </div>`;
    app.querySelectorAll("[data-k]").forEach((b) => (b.onclick = () => go({ screen: "method", kind: b.dataset.k })));
  }

  function renderMethods() {
    app.innerHTML = `
      <h1>Which method?</h1>
      ${state.kind === "quick" ? '<p class="sub">Screenshot, a couple of taps, notes.</p>' : ""}
      <div class="tiles methods">${METHODS.map((m) => `<button type="button" class="tile" data-m="${m.id}"><span class="ic">${ICONS[m.id] || m.ic}</span><span class="t">${esc(m.name)}</span></button>`).join("")}</div>`;
    app.querySelectorAll("[data-m]").forEach((b) => (b.onclick = () => {
      const m = METHODS.find((x) => x.id === b.dataset.m);
      const data = {};
      if (m.fixedTf && state.kind === "trade") data.timeframe = m.fixedTf;
      go({ screen: "form", method: m, ...fresh(), data });
    }));
  }

  function fieldHTML(f) {
    const v = state.data[f.id] ?? "";
    const err = state.errors[f.id] ? " err" : "";
    const hint = state.errors[f.id] ? state.errors[f.id] : (f.hint || "");
    const hintEl = hint ? `<span class="hint">${esc(hint)}</span>` : "";
    if (f.type === "seg") {
      return `<div class="f${err}" data-f="${f.id}"><label>${esc(f.label)}</label>
        <div class="seg ${f.cls || ""}" role="group" aria-label="${esc(f.label)}">${f.options.map((o) => `<button type="button" data-seg="${f.id}" data-v="${esc(o)}" aria-pressed="${v === o}">${esc(o)}</button>`).join("")}</div>${hintEl}</div>`;
    }
    if (f.type === "num") {
      return `<div class="f${err}" data-f="${f.id}"><label for="ttal-${f.id}">${esc(f.label)}</label>
        <input id="ttal-${f.id}" data-id="${f.id}" type="number" inputmode="decimal" step="${f.step || "any"}" placeholder="${esc(f.placeholder || "")}" value="${esc(v)}">${hintEl}</div>`;
    }
    if (f.type === "text") {
      return `<div class="f span${err}" data-f="${f.id}"><label for="ttal-${f.id}">${esc(f.label)}</label><textarea id="ttal-${f.id}" data-id="${f.id}" placeholder="${esc(f.placeholder || "")}">${esc(v)}</textarea>${hintEl}</div>`;
    }
    if (f.type === "ticker") {
      const m = state.method;
      return `<div class="f span${err}" data-f="ticker"><label for="ttal-ticker">${esc(f.label)}</label>
        <div class="tick"><input id="ttal-ticker" data-id="ticker" type="text" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="${esc(m.tickerHint || "e.g. EURUSD")}" value="${esc(v)}"><div class="sugg"></div></div>${hintEl}</div>`;
    }
    return "";
  }

  function renderForm() {
    const m = state.method, k = state.kind;
    const fields = activeFields();
    const ticker = fields.filter((f) => f.type === "ticker");
    const coreIds = new Set((m.core === "brent" ? CORE_BRENT : CORE_CHART).map((f) => f.id));
    const core = fields.filter((f) => k === "trade" && coreIds.has(f.id));
    const block = fields.filter((f) => !ticker.includes(f) && !core.includes(f));

    const coreHTML = core.length ? `<section class="sec"><div class="lab">Trade</div>
        ${ticker.map(fieldHTML).join("")}
        <div class="grid2">${core.filter((f) => !f.row && f.id !== "grade").map(fieldHTML).join("")}</div>
        <div class="grid3">${core.filter((f) => f.row === "prices").map(fieldHTML).join("")}</div>
        ${core.filter((f) => f.id === "grade").map(fieldHTML).join("")}
      </section>` : (ticker.length ? `<section class="sec"><div class="lab">Instrument</div>${ticker.map(fieldHTML).join("")}</section>` : "");

    const blockHTML = block.length ? `<section class="sec"><div class="lab">${esc(m.name)}</div>${block.map(fieldHTML).join("")}</section>` : "";

    const shots = shotsFor(m, k);
    const shotHTML = `<section class="sec"><div class="lab">${shots.length > 1 ? "Screenshots" : "Screenshot"}${m.shotOptional ? ' <small style="text-transform:none;letter-spacing:0;font-weight:500">(optional)</small>' : ""}</div>
      ${shots.map((s) => {
        const img = state.shots[s.key], err = state.errors[s.key];
        return `<div class="drop${img ? " has" : ""}${err ? " over" : ""}" data-drop="${s.key}">
          ${img ? `<img src="${img}" alt="${esc(s.label)}"><span class="swap">${shots.length > 1 ? esc(s.label) + " · " : ""}Tap or drop to replace</span>`
                : `<span class="ic">🖼</span><span class="t">${shots.length > 1 ? esc(s.label) : "Drop, paste or tap to upload"}</span>${shots.length > 1 ? '<span class="h">Drop, paste or tap</span>' : ""}`}
          <input type="file" accept="image/*" aria-label="Upload ${esc(s.label)}">
        </div>${err ? `<span class="hint" style="color:var(--err);font-size:12px">${esc(err)}</span>` : ""}`;
      }).join("")}
      ${shots.length < MAX_SHOTS ? `<button type="button" class="addshot" data-addshot>+ Add another screenshot</button>` : ""}
      ${shots.length > 1 ? '<span class="hint" style="font-size:12px;color:var(--muted)">Paste fills the first empty slot.</span>' : ""}
    </section>`;

    const notesHTML = `<section class="sec"><div class="lab">Notes${k === "trade" ? ' <small style="text-transform:none;letter-spacing:0;font-weight:500">(optional)</small>' : ""}</div>
      <div class="f"><textarea id="ttal-notes" data-id="notes" placeholder="${esc(k === "trade" ? "Anything else about this trade" : (m.notesHint || "What are you seeing?"))}">${esc(state.data.notes || "")}</textarea></div></section>`;

    app.innerHTML = `
      <h1>${esc(m.name)} <span>· ${kindName(k)}</span></h1>
      <form class="form" novalidate>
        ${coreHTML}${blockHTML}${shotHTML}${notesHTML}
        ${state.result && state.result.error ? `<div class="errbox"><b>Didn't post.</b> ${esc(state.result.error)}<br><span style="font-size:12px;color:var(--muted)">Fix and tap Post again — a retry won't double-post.</span></div>` : ""}
        <div class="actions">
          <button class="btn primary" type="submit" ${state.busy ? "disabled" : ""}>${state.busy ? "Posting…" : "Post it"}</button>
          <div class="count">${state.busy ? "Uploading and writing to your journal — this can take up to a minute. Keep this open." : "Posting can take up to a minute."}</div>
        </div>
      </form>`;
    bindForm();
  }

  function bindForm() {
    const form = app.querySelector("form");
    form.querySelectorAll("[data-seg]").forEach((b) => (b.onclick = () => {
      const id = b.dataset.seg, v = b.dataset.v;
      state.data[id] = state.data[id] === v ? undefined : v;
      delete state.errors[id];
      const y = overlay.scrollTop; renderForm(); overlay.scrollTop = y;
    }));
    form.querySelectorAll("input[type=number],textarea").forEach((el) => (el.oninput = () => {
      state.data[el.dataset.id] = el.value;
      if (state.errors[el.dataset.id]) { delete state.errors[el.dataset.id]; el.closest(".f")?.classList.remove("err"); }
    }));
    const t = form.querySelector("#ttal-ticker"), sugg = form.querySelector(".sugg");
    if (t) {
      const list = state.method.tickers || [];
      const show = () => {
        const q = t.value.trim().toUpperCase();
        const hits = list.filter((x) => x.includes(q)).slice(0, 8);
        if (!hits.length) { sugg.classList.remove("show"); sugg.innerHTML = ""; return; }
        sugg.innerHTML = hits.map((h) => `<button type="button" data-t="${h}">${h}</button>`).join("");
        sugg.classList.add("show");
        sugg.querySelectorAll("[data-t]").forEach((b) => (b.onmousedown = (e) => { e.preventDefault(); t.value = b.dataset.t; state.data.ticker = b.dataset.t; sugg.classList.remove("show"); }));
      };
      t.onfocus = show;
      t.oninput = () => { state.data.ticker = t.value.toUpperCase(); delete state.errors.ticker; t.closest(".f").classList.remove("err"); show(); };
      t.onblur = () => setTimeout(() => sugg.classList.remove("show"), 120);
    }
    const add = form.querySelector("[data-addshot]");
    if (add) add.onclick = () => { state.extra = (state.extra || 0) + 1; const y = overlay.scrollTop; renderForm(); overlay.scrollTop = y; };
    form.querySelectorAll("[data-drop]").forEach((drop) => {
      const key = drop.dataset.drop, file = drop.querySelector("input[type=file]");
      file.onchange = () => take(key, file.files[0]);
      ["dragenter", "dragover"].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add("over"); }));
      ["dragleave", "drop"].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove("over"); }));
      drop.addEventListener("drop", (e) => take(key, e.dataTransfer.files[0]));
    });
    form.onsubmit = (e) => {
      e.preventDefault();
      const errors = {};
      for (const f of activeFields()) {
        const v = state.data[f.id];
        if (v === undefined || v === "" || v === null) errors[f.id] = "Required";
      }
      for (const s of shotsFor(state.method, state.kind)) {
        if (!state.shots[s.key] && !s.optional) errors[s.key] = `Add the ${s.label === "Screenshot" ? "chart screenshot" : s.label + " screenshot"}`;
      }
      state.errors = errors;
      if (Object.keys(errors).length) { renderForm(); app.querySelector(".err,.drop.over")?.scrollIntoView({ behavior: "smooth", block: "center" }); return; }
      if (state.busy) return;
      state.busy = true; state.result = null; renderForm();
      submit().then((j) => { state.busy = false; state.result = j; state.token = null; go({ screen: "done" }); })
        .catch((err) => { state.busy = false; state.result = { ok: false, error: err.message }; const y = overlay.scrollTop; renderForm(); overlay.scrollTop = y; });
    };
  }

  function take(key, f) {
    if (!f || !f.type.startsWith("image/")) return;
    const r = new FileReader();
    r.onload = () => { const y = overlay.scrollTop; state.shots[key] = r.result; delete state.errors[key]; renderForm(); overlay.scrollTop = y; };
    r.readAsDataURL(f);
  }
  function onPaste(e) {
    if (!overlay || state.screen !== "form") return;
    const it = [...(e.clipboardData?.items || [])].find((i) => i.type.startsWith("image/"));
    if (!it) return;
    const slots = shotsFor(state.method, state.kind);
    const target = (slots.find((s) => !state.shots[s.key]) || slots[slots.length - 1]).key;
    take(target, it.getAsFile());
  }

  /* downscale so the payload stays small (max 1600px, JPEG) */
  function shrink(dataUrl) {
    return new Promise((res) => {
      const img = new Image();
      img.onload = () => {
        const MAX = 1600, r = Math.min(1, MAX / Math.max(img.width, img.height));
        if (r === 1 && dataUrl.length < 900000) return res(dataUrl);
        const c = document.createElement("canvas"); c.width = Math.round(img.width * r); c.height = Math.round(img.height * r);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        res(c.toDataURL("image/jpeg", 0.85));
      };
      img.onerror = () => res(dataUrl);
      img.src = dataUrl;
    });
  }

  async function submit() {
    if (!settings.endpoint || !settings.shared_secret) throw new Error("Form isn't connected yet — endpoint or secret missing in theme settings.");
    const m = state.method, k = state.kind, d = state.data;
    if (!state.token) state.token = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random());
    const shots = {};
    for (const s of shotsFor(m, k)) shots[s.key] = state.shots[s.key] ? await shrink(state.shots[s.key]) : null;
    const payload = {
      secret: settings.shared_secret, type: k, method: m.id, user: user.username, token: state.token,
      ticker: m.fixedTicker || (d.ticker || "").toUpperCase(),
      data: Object.fromEntries(Object.entries(d).filter(([kk, v]) => kk !== "ticker" && v !== undefined && v !== "")),
      screenshots: shots,
    };
    // form-encoded, one field — the only POST shape Google's Apps Script edge currently passes through
    const r = await fetch(settings.endpoint, { method: "POST", body: new URLSearchParams({ payload: JSON.stringify(payload) }), redirect: "follow" });
    const txt = await r.text();
    let j; try { j = JSON.parse(txt); } catch (e) { throw new Error("Unexpected reply: " + txt.slice(0, 120)); }
    if (!j.ok) throw new Error(j.error || "Unknown error");
    return j;
  }

  function renderDone() {
    const url = state.result && state.result.url;
    app.innerHTML = `<div class="done">
      <div class="check">✓</div>
      <h1>Posted</h1>
      <div class="actions">
        ${url ? `<a class="btn primary" href="${esc(url)}">View it on the board →</a>` : ""}
        <button type="button" class="btn ${url ? "ghost" : "primary"}" data-again>Post another</button>
        <button type="button" class="btn ghost" data-close>Done</button>
      </div>
      <p class="note">${state.kind === "trade" ? "Also written to your journal." : "Board only — no journal row."}</p>
    </div>`;
    app.querySelector("[data-again]").onclick = () => go({ screen: "home", kind: null, method: null, ...fresh() });
    app.querySelector("[data-close]").onclick = close;
    const a = app.querySelector("a.btn");
    if (a) a.onclick = (e) => { e.preventDefault(); close(); api.container.lookup("service:router").transitionTo(url.replace(/^https?:\/\/[^/]+/, "")); };
  }

  /* ---- sidebar link in the Community section (desktop sidebar + mobile hamburger) ---- */
  const LINK = "ttal-post";
  api.addCommunitySectionLink({
    name: LINK,
    title: settings.link_label || "Post a Trade",
    text: settings.link_label || "Post a Trade",
    icon: settings.link_icon || "bolt",
    href: "/" + LINK,          // never actually navigated — intercepted below
  });
  // Intercept the click (capture phase, before Ember's router sees it) and open the overlay instead.
  document.addEventListener("click", (e) => {
    const a = e.target.closest && e.target.closest(`a[data-link-name="${LINK}"], a.sidebar-section-link-${LINK}`);
    if (!a) return;
    e.preventDefault(); e.stopPropagation();
    open();
  }, true);

  /* ---- optional floating button ---- */
  function ensureFab() {
    if (!settings.show_floating_button) return;
    if (document.querySelector(".ttal-fab")) return;
    const b = document.createElement("button");
    b.type = "button";
    b.className = "ttal-fab";
    b.innerHTML = `<span class="ttal-fab-ic">⚡</span><span>${esc(settings.button_label || "Post")}</span>`;
    b.onclick = open;
    document.body.appendChild(b);
  }
  api.onPageChange(() => ensureFab());
  ensureFab();
});
