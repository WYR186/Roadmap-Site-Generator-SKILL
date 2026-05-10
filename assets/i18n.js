// === i18n: EN / 中 switch ===
// Two language modes:
//   "en"  — English only (default for first-time visitors)
//   "cn"  — Chinese-dominant; technical English keywords (Hessian, PSD,
//           softmax, Transformer, prior/posterior, …) stay inline in the
//           authored content. No stacked-bilingual "mixed" mode.
// HTML elements use data-i18n="key" (textContent) or
// data-i18n-attr="placeholder" data-i18n="key" (attribute).
// Block content uses .cn-only / .en-only wrappers; one side is hidden
// purely via CSS based on html[data-lang].
//
// Legacy: an earlier version of the skill had a third "mixed" mode that
// stacked .lbl-en + .lbl-cn spans. It was removed because the duplicated
// walls of text just cluttered the page. getLang() normalizes any
// "mixed" value still sitting in localStorage to "en". Do NOT reintroduce
// the mixed branch or .lbl-en / .lbl-cn stacking.

const I18N_KEY = "ml_review_lang_v1";

const I18N = {
  // ── chrome ──
  "brand.title":            { cn: "ECE 449 / CS 446 · 期末复习路线图", en: "ECE 449 / CS 446 · Final Review Roadmap" },
  "brand.short":            { cn: "ECE 449 / CS 446", en: "ECE 449 / CS 446" },
  "nav.roadmap":            { cn: "🗺️ 路线图", en: "🗺️ Roadmap" },
  "nav.notes":              { cn: "📘 速查", en: "📘 Notes" },
  "nav.cheatsheet":         { cn: "⚡ 速记", en: "⚡ Cheatsheet" },
  "nav.resources":          { cn: "📂 资料", en: "📂 Resources" },
  "search.placeholder":     { cn: "搜索算法…", en: "Search algorithms…" },
  "search.formula":         { cn: "搜索公式…", en: "Search formulas…" },

  // ── home page ──
  "home.progress":          { cn: "📊 复习进度", en: "📊 Progress" },
  "home.legend.found":      { cn: "简单", en: "Easy" },
  "home.legend.dl":         { cn: "中等", en: "Medium" },
  "home.legend.theory":     { cn: "困难", en: "Hard" },
  "home.btn.cheatsheet":    { cn: "⚡ 1 小时速记", en: "⚡ 1-hour Cheatsheet" },
  "home.btn.start":         { cn: "📖 从头开始", en: "📖 Start from Block 1" },
  "home.btn.resources":     { cn: "📂 课件 & 作业", en: "📂 Slides & Homework" },
  "home.btn.reset":         { cn: "🔄 重置进度", en: "🔄 Reset progress" },
  "home.btn.export":        { cn: "📤 备份到文件", en: "📤 Save to file" },
  "home.btn.import":        { cn: "📥 从文件恢复", en: "📥 Load from file" },
  "home.confirm.reset":     { cn: "重置全部学习进度？", en: "Reset all learning progress?" },
  "home.indexTitle":        { cn: "📚 完整核心算法表 · Course Algorithm Index", en: "📚 Complete Algorithm Index" },
  "home.indexSub":          { cn: "按模块整理；每行可点击跳转到对应章节。", en: "Grouped by module — click any row to jump to the section." },
  "home.col.topic":         { cn: "算法 / Topic", en: "Algorithm / Topic" },
  "home.col.goal":          { cn: "核心目标", en: "Core Goal" },
  "home.col.exam":          { cn: "考点 / Exam focus", en: "Exam Focus" },
  "home.subtitle.subtitle": { cn: "机器学习 · 期末复习", en: "Machine Learning · Final Review" },

  // root + foundation node titles
  "node.b1":                { cn: "📐 Block 1 · Foundations", en: "📐 Block 1 · Foundations" },
  "node.b1.sub":            { cn: "概率 · 线代 · 优化", en: "Probability · Linear Algebra · Optimization" },
  "group.classical":        { cn: "🧮 Classical Machine Learning · 经典机器学习", en: "🧮 Classical Machine Learning" },
  "group.dlcore":           { cn: "🧠 Deep Learning Core · 深度学习核心", en: "🧠 Deep Learning Core" },
  "group.repr":             { cn: "🎭 Representation & Generative · 表示与生成", en: "🎭 Representation & Generative" },
  "group.modern":           { cn: "🔮 Modern Models · 现代序列模型", en: "🔮 Modern Sequence Models" },
  "group.diff":             { cn: "🌊 Diffusion · 扩散模型", en: "🌊 Diffusion" },
  "group.theory":           { cn: "🎓 Learning Theory · 学习理论", en: "🎓 Learning Theory" },
  "group.rl":               { cn: "🎮 Reinforcement Learning · 强化学习", en: "🎮 Reinforcement Learning" },
  "node.practice":          { cn: "⚡ 速记 + 练习", en: "⚡ Cheatsheet + Practice" },
  "node.practice.sub":      { cn: "10 min · 闭卷自测", en: "10 min · Closed-book self-test" },

  // ── block page chrome ──
  "page.toc":               { cn: "本章导航 · TOC", en: "Table of Contents" },
  "btn.markRead.todo":      { cn: "📌 标记为已掌握", en: "📌 Mark as mastered" },
  "btn.markRead.done":      { cn: "✅ 已完成 · 点击撤销", en: "✅ Mastered · click to undo" },
  "btn.next":               { cn: "下一章 →", en: "Next →" },
  "btn.prev":               { cn: "← 上一章", en: "← Prev" },
  "btn.back":               { cn: "← 返回路线图", en: "← Back to Roadmap" },
  "btn.cheatsheetGo":       { cn: "⚡ 速记 Cheatsheet", en: "⚡ Cheatsheet" },
  "crumbs.roadmap":         { cn: "路线图", en: "Roadmap" },

  // common labels used across blocks
  "label.intuition":        { cn: "🧠 直觉 / Intuition", en: "🧠 Intuition" },
  "label.coreIntuition":    { cn: "🧠 Core intuition", en: "🧠 Core intuition" },
  "label.concepts":         { cn: "🔵 概念理解", en: "🔵 Concepts" },
  "label.formulas":         { cn: "🟣 核心公式（默写）", en: "🟣 Core Formulas (memorize)" },
  "label.pitfalls":         { cn: "⚠️ Common pitfalls", en: "⚠️ Common pitfalls" },
  "label.examFocus":        { cn: "✅ Exam focus", en: "✅ Exam focus" },
  "label.example":          { cn: "🧩 Example", en: "🧩 Example" },
  "label.checklist":        { cn: "✅ 速记 Checklist", en: "✅ Quick Checklist" },
  "label.summary":          { cn: "✅ 速记 Checklist", en: "✅ Quick Checklist" },

  // ── footer ──
  "footer.home":            { cn: "本网站由 ECE 449 / CS 446 期末笔记 (Block 1-4.rtf, Block 5-10.rtf) 与课件 / 作业生成 ·",
                              en: "Built from course notes (Block 1-4.rtf, Block 5-10.rtf), slides, and homework ·" },
  "footer.viewMap":         { cn: "查看资源映射", en: "View resource map" },
  "footer.builtFrom14":     { cn: "由 Block 1-4.rtf 整理 ·", en: "Compiled from Block 1-4.rtf ·" },
  "footer.builtFrom510":    { cn: "由 Block 5-10.rtf 整理 ·", en: "Compiled from Block 5-10.rtf ·" },
  "footer.resourceMap":     { cn: "资源映射", en: "Resource map" }
};

function getLang() {
  const v = localStorage.getItem(I18N_KEY);
  if (v === "en" || v === "cn") return v;
  // Legacy "mixed" value migrates to "en" — rewrite once so subsequent
  // reads are clean and the lang switch doesn't drift on the next paint.
  if (v === "mixed") {
    try { localStorage.setItem(I18N_KEY, "en"); } catch {}
  }
  return "en";  // default for first-time visitors
}
function setLang(lang) {
  localStorage.setItem(I18N_KEY, lang);
  applyLang(lang);
}
function alignSliderThumb(sw) {
  // Position the thumb pixel-precisely to the active button — independent
  // of paddings, borders and per-button content widths.
  const active = sw.querySelector(`button[data-lang="${sw.dataset.active}"]`)
              || sw.querySelector("button.active")
              || sw.querySelector("button");
  const thumb = sw.querySelector(".lang-thumb");
  if (!active || !thumb) return;
  const swRect = sw.getBoundingClientRect();
  const btnRect = active.getBoundingClientRect();
  thumb.style.width = btnRect.width + "px";
  thumb.style.transform = `translateX(${btnRect.left - swRect.left}px)`;
}

function applyLang(lang) {
  document.documentElement.setAttribute("data-lang", lang);

  // Update the segmented switch thumb position.
  document.querySelectorAll(".lang-switch").forEach(sw => {
    sw.setAttribute("data-active", lang);
    requestAnimationFrame(() => alignSliderThumb(sw));
  });

  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    const dict = I18N[key];
    if (!dict) return;
    const attr = el.getAttribute("data-i18n-attr");
    const value = lang === "cn" ? (dict.cn || dict.en) : (dict.en || dict.cn);
    if (attr) el.setAttribute(attr, value);
    else el.textContent = value;
  });

  // Toggle button "active" state for accessibility / focus styling.
  document.querySelectorAll(".lang-switch button").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.lang === lang);
  });
}

function injectLangSwitch() {
  // Adds a two-segment EN / 中 slider next to the search box. Order is
  // fixed: EN (left), 中 (right). The CSS thumb position is keyed off
  // [data-active] so the button order must match.
  const topbarInner = document.querySelector(".topbar-inner");
  if (!topbarInner || document.querySelector(".lang-switch")) return;
  const wrap = document.createElement("div");
  wrap.className = "lang-switch";
  wrap.setAttribute("role", "tablist");
  wrap.setAttribute("data-active", getLang());
  wrap.innerHTML = `
    <span class="lang-thumb" aria-hidden="true"></span>
    <button data-lang="en" type="button" role="tab" title="English only">EN</button>
    <button data-lang="cn" type="button" role="tab" title="Chinese only">中</button>
  `;
  const search = topbarInner.querySelector(".search-box");
  if (search) topbarInner.insertBefore(wrap, search);
  else topbarInner.appendChild(wrap);
  wrap.querySelectorAll("button").forEach(btn => {
    btn.addEventListener("click", () => setLang(btn.dataset.lang));
  });
}

// Run before DOMContentLoaded so the initial paint matches saved language.
(function bootI18n() {
  document.documentElement.setAttribute("data-lang", getLang());
})();

document.addEventListener("DOMContentLoaded", () => {
  injectLangSwitch();
  applyLang(getLang());
});

// Re-align the slider thumb on viewport changes — button widths can shift
// when the topbar wraps or the nav grows.
window.addEventListener("resize", () => {
  document.querySelectorAll(".lang-switch").forEach(alignSliderThumb);
});
