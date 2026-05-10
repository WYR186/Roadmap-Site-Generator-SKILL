// Standalone Algorithm Index page — renders 37 cards grouped by Block,
// with a multi-axis filter panel above (paradigm / task / family / group / difficulty).
//
// State shape: filters[dimId] = Set(value). A topic is visible iff for every
// dim, at least one of its tag values is in the selected set. Default is
// "all selected" so opening the page shows everything.
(function () {
  const indexBody  = document.getElementById("algoIndexBody");
  const filterBody = document.getElementById("algoFilterBody");
  const filterRoot = document.getElementById("algoFilter");
  const emptyMsg   = document.getElementById("algoEmpty");
  const visibleEn  = document.getElementById("algoVisibleCount");
  const visibleCn  = document.getElementById("algoVisibleCountCn");
  const totalEn    = document.getElementById("algoTotalCount");
  const totalCn    = document.getElementById("algoTotalCountCn");
  const toggleBtn  = document.getElementById("algoFilterToggle");
  const selectAll  = document.getElementById("algoSelectAll");
  const clearAll   = document.getElementById("algoClearAll");
  const resetBtn   = document.getElementById("algoResetFilters");

  if (!indexBody || !filterBody || !window.TOPICS || !window.GROUPS) return;

  const TOPICS = window.TOPICS;
  const GROUPS = window.GROUPS;
  const DIMS   = window.TAG_DIMENSIONS || [];
  const TAGS   = window.TOPIC_TAGS || {};

  function getLangSafe() {
    if (typeof getLang === "function") return getLang();
    return localStorage.getItem("ml_review_lang_v1") || "en";
  }
  function pick(o, lang) {
    if (lang === "cn") return o.cn || o.en;
    return o.en || o.cn;
  }

  // Pull the tag values for a topic on a given dimension.
  function topicValues(topic, dim) {
    const t = TAGS[topic.slug];
    if (!t) return [];
    return t[dim.id] || [];
  }

  // ── Filter state — Sets keep order-independent membership ─────────────
  const state = {};
  DIMS.forEach(dim => {
    state[dim.id] = new Set(dim.values);
  });

  function isVisible(topic) {
    for (const dim of DIMS) {
      const vals = topicValues(topic, dim);
      // Topics with no values for this dim aren't classified along this axis,
      // so the dim doesn't filter them out (foundations / theory edge cases).
      if (vals.length === 0) continue;
      const sel = state[dim.id];
      if (!vals.some(v => sel.has(v))) return false;
    }
    return true;
  }

  // Count topics that *would* match if this single chip were the only
  // change — i.e. how many topics carry this value, ignoring filters on
  // the same dimension (so toggling one chip in a dim shows additive count).
  // We use the simple "how many topics carry this value" count, which is
  // what users intuitively expect next to a chip label.
  function countForValue(dim, value) {
    let n = 0;
    for (const t of TOPICS) {
      if (topicValues(t, dim).includes(value)) n++;
    }
    return n;
  }

  // ── Build filter panel ────────────────────────────────────────────────
  function buildFilterPanel() {
    const lang = getLangSafe();
    const html = DIMS.map(dim => {
      const chips = dim.values.map(v => {
        const labels = dim.valueLabels[v] || { en: v, cn: v };
        const count = countForValue(dim, v);
        if (count === 0) return ""; // skip values with zero topics
        const checked = state[dim.id].has(v) ? "checked" : "";
        return `
          <label class="algo-chip ${checked ? 'on' : ''}" data-dim="${dim.id}" data-val="${v}">
            <input type="checkbox" ${checked} data-dim="${dim.id}" data-val="${v}" />
            <span class="algo-chip-label">${pick(labels, lang)}</span>
            <span class="algo-chip-count">(${count})</span>
          </label>
        `;
      }).join("");
      return `
        <div class="algo-filter-section">
          <div class="algo-filter-section-head">
            <span class="algo-filter-section-title">${pick(dim.label, lang)}</span>
            <span class="algo-filter-section-actions">
              <button type="button" class="algo-mini-btn" data-dim-action="all" data-dim="${dim.id}">
                <span class="en-only">all</span><span class="cn-only">全选</span>
              </button>
              <button type="button" class="algo-mini-btn" data-dim-action="none" data-dim="${dim.id}">
                <span class="en-only">none</span><span class="cn-only">全不选</span>
              </button>
            </span>
          </div>
          <div class="algo-chips">${chips}</div>
        </div>
      `;
    }).join("");
    filterBody.innerHTML = html;
  }

  // Refresh chip "on" classes from state (no rebuild)
  function syncChipsFromState() {
    filterBody.querySelectorAll(".algo-chip").forEach(label => {
      const d = label.dataset.dim, v = label.dataset.val;
      const on = state[d].has(v);
      label.classList.toggle("on", on);
      const cb = label.querySelector("input[type=checkbox]");
      if (cb) cb.checked = on;
    });
  }

  // ── Render index body ─────────────────────────────────────────────────
  function renderIndex() {
    const lang = getLangSafe();
    let visible = 0;
    const sections = GROUPS.map(g => {
      const items = TOPICS.filter(t => t.group === g.id && isVisible(t));
      if (!items.length) return "";
      visible += items.length;
      const groupName = pick({ en: g.name_en, cn: g.name_cn }, lang);
      const groupSub  = pick({ en: g.sub_en || "", cn: g.sub_cn || "" }, lang);
      return `
        <div class="algo-group">
          <h3 class="algo-group-head">
            <span>${groupName}</span>
            <span class="algo-group-sub">${groupSub}</span>
            <span class="algo-group-count">${items.length}</span>
          </h3>
          <div class="algo-group-grid">
            ${items.map(t => {
              const name = pick({ en: t.name_en, cn: t.name_cn }, lang);
              const sub  = pick({ en: t.sub_en || "", cn: t.sub_cn || "" }, lang);
              const dotColor = ({ green: "var(--accent)", yellow: "var(--warn)", red: "var(--danger)" })[t.diff] || "var(--warn)";
              return `
                <a class="algo-row" href="topics/${t.slug}.html" data-slug="${t.slug}">
                  <span class="algo-dot" style="background:${dotColor};"></span>
                  <span class="algo-name">${name}</span>
                  <span class="algo-sub">${sub}</span>
                </a>
              `;
            }).join("")}
          </div>
        </div>
      `;
    }).join("");

    indexBody.innerHTML = sections;
    if (visibleEn) visibleEn.textContent = String(visible);
    if (visibleCn) visibleCn.textContent = String(visible);
    if (totalEn)   totalEn.textContent   = String(TOPICS.length);
    if (totalCn)   totalCn.textContent   = String(TOPICS.length);
    if (emptyMsg)  emptyMsg.hidden = visible !== 0;
  }

  // ── Filter panel show / hide + button gating ──────────────────────────
  function setFilterOpen(open) {
    filterBody.hidden = !open;
    toggleBtn.setAttribute("aria-expanded", open ? "true" : "false");
    filterRoot.classList.toggle("open", open);
    [selectAll, clearAll, resetBtn].forEach(b => { if (b) b.hidden = !open; });
  }

  // Initial paint
  buildFilterPanel();
  renderIndex();
  setFilterOpen(false);

  // ── Wire interactions ────────────────────────────────────────────────
  toggleBtn?.addEventListener("click", () => {
    const open = filterBody.hidden;
    setFilterOpen(open);
  });

  selectAll?.addEventListener("click", () => {
    DIMS.forEach(dim => { state[dim.id] = new Set(dim.values); });
    syncChipsFromState();
    renderIndex();
  });

  clearAll?.addEventListener("click", () => {
    DIMS.forEach(dim => { state[dim.id] = new Set(); });
    syncChipsFromState();
    renderIndex();
  });

  resetBtn?.addEventListener("click", () => {
    DIMS.forEach(dim => { state[dim.id] = new Set(dim.values); });
    syncChipsFromState();
    renderIndex();
  });

  // Per-dimension all / none buttons
  filterBody.addEventListener("click", (e) => {
    const miniBtn = e.target.closest(".algo-mini-btn");
    if (miniBtn) {
      const d = miniBtn.dataset.dim;
      const dim = DIMS.find(x => x.id === d);
      if (!dim) return;
      if (miniBtn.dataset.dimAction === "all")  state[d] = new Set(dim.values);
      if (miniBtn.dataset.dimAction === "none") state[d] = new Set();
      syncChipsFromState();
      renderIndex();
      e.preventDefault();
      return;
    }
  });

  // Chip toggle (checkbox)
  filterBody.addEventListener("change", (e) => {
    const cb = e.target.closest("input[type=checkbox][data-dim]");
    if (!cb) return;
    const d = cb.dataset.dim, v = cb.dataset.val;
    if (cb.checked) state[d].add(v);
    else            state[d].delete(v);
    cb.closest(".algo-chip")?.classList.toggle("on", cb.checked);
    renderIndex();
  });

  // Re-render on language switch (chip labels + group names switch)
  document.addEventListener("click", (e) => {
    if (e.target.closest(".lang-switch button")) {
      setTimeout(() => {
        buildFilterPanel();
        syncChipsFromState();
        renderIndex();
      }, 0);
    }
  });

  // Search box on topbar — filter visible cards by name/sub haystack.
  // Plays nicely with main.js search (which targets .node / .rf-topic).
  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    searchInput.addEventListener("input", () => {
      const q = searchInput.value.trim().toLowerCase();
      indexBody.querySelectorAll(".algo-row").forEach(row => {
        if (!q) { row.style.display = ""; return; }
        const slug = row.dataset.slug;
        const meta = TOPICS.find(t => t.slug === slug);
        const hay = [meta?.name_en, meta?.name_cn, meta?.sub_en, meta?.sub_cn, slug]
          .filter(Boolean).join(" ").toLowerCase();
        row.style.display = hay.includes(q) ? "" : "none";
      });
      // Hide groups that ended up with all rows hidden
      indexBody.querySelectorAll(".algo-group").forEach(g => {
        const anyVisible = Array.from(g.querySelectorAll(".algo-row"))
          .some(r => r.style.display !== "none");
        g.style.display = anyVisible ? "" : "none";
      });
    });
  }
})();
