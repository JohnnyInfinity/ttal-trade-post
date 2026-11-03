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

  /* ---- brand logo (white wordmark; inverted automatically on light schemes) ---- */
  const LOGO = "data:image/png;base64,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";

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
        <a class="wordmark" href="/" title="Home"><img src="${LOGO}" alt="The Trading Academy"></a>
        <div class="user">Posting as <b>${esc(user.username)}</b> <button class="close" type="button" aria-label="Close" title="Close">×</button></div>
      </header>
      <nav class="crumbs"></nav>
      <main class="app"></main>
    </div></div>`;
    try {
      const bg = getComputedStyle(document.documentElement).getPropertyValue("--secondary").trim();
      const m = /^#?([0-9a-f]{6})$/i.exec(bg);
      if (m) { const n = parseInt(m[1], 16), lum = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)); if (lum > 140) overlay.classList.add("ttal-light"); }
    } catch (e) {}
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
