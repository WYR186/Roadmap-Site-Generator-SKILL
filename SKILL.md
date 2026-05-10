---
name: class-material-to-website
description: Turn a folder of course materials (syllabus, slides, HW/MP, textbooks, notes) into a static study website AND keep that site evolving across the semester. Core deliverable is a clean node-based study roadmap on the homepage with one cell per topic, an SVG connector spine with arrowheads (typed edges — solid for prerequisites, dotted for inferred), click-anchored popups carrying tutorial blurbs / code-template links / paraphrased homework problems, a three-mode language slider (EN / EN+中 / 中), an Atlas-vs-Mermaid view switcher, optional progress persistence via a tiny Python server, and a GitHub Actions deploy workflow. Topics carry an evidence-aware source_status (planned / inferred / confirmed / expanded / reviewed) so the site is honest about what's grounded vs. guessed; supports a progressive workflow (syllabus-only bootstrap → weekly material upgrades → final review consolidation) without destructive regeneration. Use when the user asks to "make a study site / review website / roadmap" out of a course folder, shows a directory of lecture / HW / textbook PDFs and asks for a tree visualization, or returns later with new slides / HW / notes to fold into an existing site.
---

# class-material-to-website

A skill for turning **any** course folder into a study site built around a clean node-based study roadmap (root + grouped topic cards + SVG bezier connectors). Tree visualization is the core; everything else (cheatsheet, resources page, popups, persistence, deploy) hangs off the homepage.

This skill is opinionated about **structure** but content-agnostic — it works for ML, OS, networking, signals, optimization, anything you'd cram for in finals.

A polished reference implementation lives at `git@github.com:WYR186/ML_Atlas.git`. Don't re-clone its content; copy the patterns here and generate fresh content from the user's actual materials.

---

## When to invoke

Trigger when the user says any of:

- "make a study site / review site / roadmap from this folder"
- "build a node-based study roadmap for [course]"
- "turn this course material into a tree visualization"
- references a folder with lectures + HW + textbooks and asks for visualization

If the user only wants a single static page (no tree, no per-topic pages), this skill is overkill — just write the page directly.

---

## Inputs to elicit (ask the user if missing)

1. **Course root folder** — directory containing slides, HW, textbooks, notes. The site folder will be created inside it.
2. **Course name + code** (e.g. "Operating Systems · CS 423") for the page title and topbar.
3. **Languages** — single language, or bilingual with the EN / EN+中 / 中 slider. Default to single-language English unless the user is writing in Chinese or has bilingual notes.
4. **Output folder name** — default `<Course> Review/` next to existing `slides/`, `HW/`, etc.
5. **Git remote** — if the user wants the site pushed. If yes, also ask whether they want auto-deploy via GitHub Pages (almost always yes).
6. **Topic list source**:
   - If the user has consolidated notes (`*.rtf`, `*.md`, study guide PDF) — extract topics from there.
   - If they have a syllabus PDF — parse it for week-by-week topics.
   - If neither — propose a topic list from slide titles and **ask for confirmation before generating 30+ pages**.

---

## Hard rules (non-negotiable)

1. **Quoting source material is allowed, but the default value-add is plain-language explanation.** You may quote key sentences, definitions, formulas, or short passages from homework, solutions, slides, or textbooks when the original phrasing is load-bearing (a precise definition, an exact theorem statement, the wording of an HW prompt). When you do, mark it as a quote (blockquote, italics, or `> source: …`) so it's clear what's verbatim and what's yours. **In most places — especially the detailed topic pages reached from each cell — go further than the source: rewrite in clearer, more beginner-friendly language, expand terse steps, add intuition, worked micro-examples, and "why does this work" notes.** A page that just mirrors the slide deck has failed; a page that makes the slide deck understandable has succeeded. Always link to the original PDF for the canonical full text.
2. **Never commit course PDFs** (homework, slides, textbooks). Add them to `.gitignore`. Use symlinks (gitignored) if the site needs to render PDF chips locally.
3. **One topic per cell, one page per topic.** Don't merge two algorithms onto one card with a slash. If the user later says "split this into two", do it.
4. **Solo-author git commits.** No `Co-Authored-By:`, no "Generated with..." footer, no Claude / Anthropic / AI mentions in commits, README, or code. Use the existing global `git config` for `user.name` and `user.email` unless the user overrides.
5. **Commit messages read like a tired human.** Lowercase, plain, no emoji, no scope prefixes (`feat:` / `fix:`) unless natural. Multi-line bodies fine. **No trailing attribution lines.**
6. **No build step.** Plain HTML / CSS / vanilla JS. MathJax via CDN if formulas are needed. No `package.json`, no bundlers, no JS framework.
7. **English defaults to first** when the site is bilingual. The static `<html lang="en" data-lang="en">` markup must reflect this so CSS applies the right visibility rules before JS runs (no Chinese flash on first paint).
8. **EN mode shows zero Chinese.** Run the HTML-parser leak audit (below) after content changes; target is 0 leaks across every page. Wrap stragglers in `<span class="en-only">EN</span><span class="cn-only">CN</span>`.
9. **Be evidence-aware. Don't fabricate course-confirmed knowledge.** Every topic carries a `source_status` (see below). Don't mark a topic `confirmed` unless it actually appears in the syllabus, slides, HW, notes, or user-supplied material; don't invent course-specific formulas / examples / homework patterns / exam emphasis for `planned` or `inferred` topics. Skeleton pages are fine; faked specifics are not.
10. **Never regenerate destructively across runs.** This skill is invoked multiple times across a semester (syllabus → weekly slides → review). Preserve slugs, IDs, URLs, and any human-edited content on topic pages. If you must rewrite a page that has been touched, write to `<slug>.html.new` and tell the user — don't overwrite.

---

## Source-status model (evidence-aware roadmap)

Every topic carries a status that says how grounded that claim is in the materials. The site UI surfaces this so the student knows what's real vs. predicted.

| Status | Meaning | Allowed page content |
| --- | --- | --- |
| `planned` | Explicitly named in the syllabus / topic list, but no slides / HW / notes yet. | Skeleton: status block, expected-subtopics list, "to be expanded after slides arrive" placeholder. |
| `inferred` | Likely subtopic guessed from a lecture title or prerequisite chain — not yet confirmed. | Skeleton + "Likely" badge. Don't claim exam focus or course-specific formulas. |
| `confirmed` | Appears in slides, HW, notes, syllabus details, or user-supplied material. | Real explanations grounded in those materials. |
| `expanded` | `confirmed` and the topic page has been written with original explanations (intuition, formulas, traps, example). | Full topic page. |
| `reviewed` | A human passed over the page before exam / final release. | Same as `expanded` + green-check badge. |

Lectures track `source_status` separately: `syllabus_only` → `slides_available` → `homework_available` → `notes_available` → `expanded` → `reviewed`.

`page_status` (separate from `source_status`) tracks the page itself: `missing` / `skeleton` / `draft` / `expanded` / `reviewed`. `confidence`: `low` / `medium` / `high`.

When in doubt, downgrade. `inferred` is honest; pretending it's `confirmed` is not.

---

## Progressive workflow (syllabus → weekly → review)

This skill expects to be invoked **multiple times across a semester**. The first invocation may have only a syllabus; later invocations add slides, HW, notes. Detect which phase you're in by inspecting the input folder + any existing site folder.

### Phase 0 / 1 — Bootstrap from syllabus only

When the input is just a syllabus or lecture-title list:

1. Extract lecture-level structure into `window.LECTURES`.
2. Group lectures into conceptual areas → `window.GROUPS`.
3. Mark explicit syllabus topics as `planned`; mark guessed subtopics as `inferred`.
4. Generate **skeleton** topic pages: status block + "to be expanded after slides are released" placeholder + expected-subtopics list. No fake formulas / examples / exam claims.
5. Render the homepage tree with status-aware visuals (dashed border for `planned`, gray tint + "Likely" badge for `inferred`).

### Phase 2 — Weekly material update

When the user returns with a new slide deck / HW / notes / reading and an existing site folder:

1. Match the new file to its lecture / week (by week number, lecture id, or filename pattern).
2. Extract topic names + relationships from the new file.
3. Diff against the existing `window.TOPICS`. Upgrade `planned` / `inferred` → `confirmed` when supported.
4. Add new `confirmed` topics only when they don't already exist.
5. **Preserve existing slugs, IDs, URLs, and human-edited content.** If a topic page has been touched and you'd rewrite it, save the rewrite to `<slug>.html.new` and tell the user — don't overwrite.
6. Update `window.SOURCE_MANIFEST[slug]` so each topic records the materials backing it (lecture id, slide ranges, HW numbers).
7. Update only affected topic pages and re-render the homepage tree.

### Phase 3 — Topic expansion

For each `confirmed` topic, write a real topic page using the [topic page structure](#topic-page-structure) and bump `page_status` to `expanded`.

### Phase 4 — Review consolidation

Before the exam:

1. Reorder the roadmap by knowledge dependency (not lecture order) if needed.
2. Generate a missing-/weak-topic report from data (still `planned` / `inferred`? 0 problems harvested? `confidence: low`?).
3. Bump pages to `reviewed` once you've actually re-read them.
4. Generate / refresh the cheatsheet.

---

## File discovery

When pointed at a course folder, scan with these heuristics. Use `ls`, `find`, or `pathlib`. Don't shell-glob from `/`.

| What you see | How to interpret |
| --- | --- |
| `slides/Lecture_*.pdf`, `lectures/*.pdf`, `Slides Week*.pdf` | Lecture decks → one chip per lecture on each topic page |
| `HW/hw*.pdf`, `homeworks/HW*.pdf`, `MP*.pdf`, `mp*.pdf` | Homework / Machine Problems → harvest into per-topic problem lists |
| `*_sol.pdf`, `solutions/*.pdf` | Solution keys → linked next to each problem |
| `book/`, `textbooks/`, `*.pdf` at root | Reference textbooks → resources page |
| `syllabus.pdf`, `Syllabus*.pdf` | Topic list source — parse this first if available |
| `*.rtf`, `notes.md`, `cheat*.pdf` | Existing study notes — best topic-extraction source |
| `final_review.pdf`, `mt_review.pdf` | Use to validate / supplement topic list |
| `README*`, `policy*` | Skip; not topic content |

Read the syllabus / consolidated notes with `pdftotext`, `pypdf`, or `textutil -convert txt` for `.rtf` on macOS. Show the raw extracted topic outline to the user before building so they can correct it.

---

## Site layout to produce

```
<Course> Review/
├── index.html                  Atlas + Mermaid + algorithm index
├── cheatsheet.html             one-page cram sheet
├── resources.html              lecture / HW / textbook map
├── README.md                   English; deploy + run instructions
├── AGENT.md                    project notes for future Claude sessions
├── serve.py                    local dev server with /api/progress
├── .gitignore                  ignores HW/, slides/, book/, progress.json, .DS_Store…
├── .github/workflows/
│   └── deploy.yml              push-to-main → GitHub Pages
├── topics/                     one HTML page per topic
│   ├── <slug>.html
│   └── …
└── assets/
    ├── style.css               visuals + i18n visibility + popup + slider thumb
    ├── progress-sync.js        ⚠ MUST load first; patches localStorage to /api/progress
    ├── i18n.js                 EN / EN+中 / 中 + slider thumb alignment (only if bilingual)
    ├── topics-data.js          GROUPS + TOPICS metadata for cards
    ├── popup-data.js           tutorial / Python templates / HW problem entries
    ├── popup.js                click-anchored popup component
    └── main.js                 progress + search + connector lines + topic-page code injector
```

Plus symlinks `slides/`, `HW/`, `book/` pointing at the parent directory, all listed in `.gitignore`.

---

## The tree roadmap (core deliverable)

A clean node-based study roadmap: a root node at the top, two columns of grouped cards underneath, each card is a topic, connector lines drawn with SVG bezier paths, arrowheads at every join.

### Visual contract

- Single root node at top, course name + short subtitle.
- Optional "foundations" group spanning the full width below the root.
- Two columns of grouped boxes alternating with single-column rows. Each box has:
  - a label in the top-left (with a small inset background color)
  - a 1-3 column grid of topic cards inside
- Each card:
  - centered topic name (English on top; CN underneath if bilingual mixed mode)
  - a small colored **difficulty** dot in the top-right corner (green = easy, yellow = medium, red = hard)
  - a thin progress bar at the bottom (fills proportionally as the topic's HW problems get checked)
  - **status styling** keyed off `source_status` / `page_status`:
    | Status | Styling |
    | --- | --- |
    | `confirmed` / `expanded` | normal solid border, full-color title |
    | `planned` | dashed border (`border-style: dashed`), normal white fill |
    | `inferred` | light gray fill tint, small "Likely" / "推测" badge top-left |
    | `reviewed` | green check badge top-left next to title |
    | (HW backlog has stale items) | small amber dot beside the difficulty dot |
- Cards are clickable; click opens the **popup at the click position** (not a side drawer). The popup header shows the status badge + a link to the source materials backing it (`SOURCE_MANIFEST[slug]`).

### Spacing — go airy, not cramped

Use generous padding throughout — the roadmap should feel airy, not cramped. Aim for:

- card padding: `20px 26px`, min-height `70px`, font-size `15px`
- group padding: `30px 24px 26px`
- group-card gap: `18px` (inside a group)
- grid gap: `48px vertical / 36px horizontal` (between groups)
- root node: `320px` wide, padding `24px 28px`
- groupGrid `margin-top: 180px` so the root has breathing room
- roadmap container `min-height: 2000px`

If your tree feels cramped, the user will tell you immediately.

### Connector lines (SVG with arrowheads)

```js
function drawConnectors() {
  const root = document.getElementById("roadmap");
  const NS = "http://www.w3.org/2000/svg";
  let svg = document.getElementById("connectorSvg");
  if (!svg) {
    svg = document.createElementNS(NS, "svg");
    svg.id = "connectorSvg";
    Object.assign(svg.style, {
      position:"absolute", left:"0", top:"0", width:"100%", height:"100%",
      pointerEvents:"none", zIndex:"0",
    });
    const defs = document.createElementNS(NS, "defs");
    defs.innerHTML =
      '<marker id="connArrow" viewBox="0 0 10 10" refX="9" refY="5" '+
      'markerWidth="6" markerHeight="6" orient="auto-start-reverse">'+
      '<path d="M0 0 L10 5 L0 10 z" fill="#9ca3af"/></marker>';
    svg.appendChild(defs);
    root.insertBefore(svg, root.firstChild);
  }
  // Size SVG to roadmap rect; recompute every time (handles resize/lang switch).
  const r = root.getBoundingClientRect();
  svg.setAttribute("viewBox", `0 0 ${r.width} ${r.height}`);
  svg.querySelectorAll("path").forEach(p => p.remove());

  const center = (el) => {
    const b = el.getBoundingClientRect(), o = root.getBoundingClientRect();
    return { cx: b.left - o.left + b.width / 2, top: b.top - o.top, bottom: b.bottom - o.top };
  };
  // Define edges along the spine. Tuple form `[from, to]` defaults to the
  // group-spine style; object form `{from, to, type}` lets you draw
  // prerequisite / inferred / review-flow edges with different stroke
  // styling. Splits and merges happen automatically because multiple
  // edges can share an endpoint.
  const EDGE_STYLE = {
    group:        { stroke: "#9ca3af", width: 1.6, dash: null },
    prerequisite: { stroke: "#6b7280", width: 1.8, dash: null },
    concept:      { stroke: "#94a3b8", width: 1.4, dash: null },
    "review-flow":{ stroke: "#10b981", width: 1.6, dash: null },
    "weak-link":  { stroke: "#f59e0b", width: 1.4, dash: "4 3" },
    inferred:     { stroke: "#cbd5e1", width: 1.2, dash: "5 4" },
  };
  for (const e of EDGES) {
    const [from, to, type] = Array.isArray(e) ? [e[0], e[1], "group"] : [e.from, e.to, e.type || "group"];
    const a = document.getElementById(from), b = document.getElementById(to);
    if (!a || !b) continue;
    const A = center(a), B = center(b);
    const sx = A.cx, sy = A.bottom + 2, ex = B.cx, ey = B.top - 8, my = (sy + ey) / 2;
    const path = `M ${sx},${sy} C ${sx},${my} ${ex},${my} ${ex},${ey}`;
    const p = document.createElementNS(NS, "path");
    const s = EDGE_STYLE[type] || EDGE_STYLE.group;
    p.setAttribute("d", path);
    p.setAttribute("fill", "none");
    p.setAttribute("stroke", s.stroke);
    p.setAttribute("stroke-width", String(s.width));
    p.setAttribute("stroke-linecap", "round");
    if (s.dash) p.setAttribute("stroke-dasharray", s.dash);
    p.setAttribute("marker-end", "url(#connArrow)");
    svg.appendChild(p);
  }
}
window.addEventListener("resize", drawConnectors);
// Re-draw on language switch too — card widths shift when EN labels are longer.
document.addEventListener("click", e => {
  if (e.target.closest(".lang-switch button")) requestAnimationFrame(drawConnectors);
});
```

Each `.group` div needs a stable `id="g-<gid>"` so the connector function can find it. The root section node uses `id="n-root"`.

### Atlas vs Mermaid view switcher

A small two-button switch above the roadmap: `🌳 Atlas` (default) / `📊 Mermaid`. Selection persists in `localStorage` (`<repo>_view_v1`). The Mermaid view is auto-generated from `window.GROUPS` + `window.TOPICS`, uses `flowchart TD` with stadium-shaped nodes (`slug(["Name"])`), per-subgraph color tints, click handlers that link to topic pages, and a `📋 Copy Mermaid code` button + collapsible source textarea.

Per-subgraph color palettes (light fill / saturated stroke / readable text):

```js
const GROUP_COLORS = {
  foundations:    { fill: "#ecfdf5", stroke: "#10b981", text: "#065f46" },
  // … 11 groups, each unique. Match the emoji theme of the group.
};
```

Use `mermaid@10` from jsDelivr. Initialize with `startOnLoad: false`, custom `themeVariables` matching the page's CSS palette, and `flowchart: { curve: "basis", padding: 14, nodeSpacing: 36, rankSpacing: 60 }`. Render manually via `mermaid.run({ nodes: [pre] })` after building the source.

### Renderer profile (default vs. opt-in)

| Profile | When to use | Stack |
| --- | --- | --- |
| **A — Static DOM + SVG** (default) | Every course-study site. GitHub Pages. Syllabus-first projects. No build step. | Plain HTML / CSS / vanilla JS, SVG connectors, localStorage progress, optional Mermaid secondary view. |
| **B — React Flow** (opt-in only) | The user explicitly asks for an interactive node-graph canvas with pan / zoom, side detail drawer, animated recommended-path edges. | Vite or Next.js + `@xyflow/react` + Tailwind, `roadmapNode` / `groupNode` custom node types, hidden handles on all 4 sides, `smoothstep` edges with `MarkerType.ArrowClosed`. Reuses the same `GROUPS` / `TOPICS` / `EDGES` data. |

Don't reach for Profile B unsolicited — it breaks the no-build-step rule and shouldn't appear unless the user asked.

---

## The click-popup

Pops out from the clicked card (anchor element), not from the screen edge. Critical correctness traits:

- **Viewport-anchored, not document-anchored.** The `.popup-overlay` is `position: fixed; inset: 0; pointer-events: none`; the `.popup` is `position: absolute` inside it. **Do not add `window.scrollY` / `window.scrollX` to the popup's `top` / `left`** — that math is for document coordinates, but the parent overlay is already viewport-fixed.
- **Pick above or below per available space.** Read `getBoundingClientRect()` on the anchor. If the space below is ≥ 240 px or ≥ space above, place below (`top: anchor.bottom + 12`). Otherwise place above by **anchoring to `bottom`** instead of `top`, so the popup grows upward regardless of its actual height: `popup.style.bottom = (vh - anchor.top + 12) + "px"`.
- **Always set `max-height`.** Cap to whichever side you picked, so long content scrolls *inside* the `.popup-body` (which has `overflow-y: auto`) and never spills off-screen.
- **Two-pass position.** Position once synchronously, then again in `requestAnimationFrame` so the body's final layout is measured.
- **Track the anchor element** so `resize` and `scroll` listeners can reposition; bail out if the anchor scrolled fully off-screen.
- **Animation origin near the click center**: `transform-origin: ${anchor.cx - left}px ${placeBelow ? "top" : "bottom"}`.

Three sections in this order:

1. **Tutorial** — 2-4 sentence summary in the current language plus a "Full notes →" link to `topics/<slug>.html`. A checkbox marks the tutorial as read.
2. **Code template link** — single-button link to `topics/<slug>.html#code` (NOT inline code; the popup gets too tall otherwise). The actual code blocks live in a `<section id="code">` injected into the topic page at runtime by `main.js` reading `window.POPUP_DATA[slug].code`. This way code lives in one place and the popup stays compact.
3. **Problems** — list of HW / MP / practice problems for this topic. Each row: completion checkbox, a one-line title (paraphrase by default; a short literal quote is fine when the original wording matters), small `hwN §x.y` chip on the right. Clicking the row expands to reveal your own conceptual answer sketch — short quotes from the solution key are OK when a specific formula or definition is essential, but the bulk should be your own plain-language walk-through. Always include links to the original problem and solution PDFs.

Persist completion state in `localStorage` under keys `prob:<slug>:<id>` and `tut:<slug>`. Show a `done/total` chip in the popup header. **Every checkbox toggle must dispatch `document.dispatchEvent(new CustomEvent("ml-progress-rerender"))`** so the home grid + ring update without a page reload.

Close on `Escape`, click outside, or the `✕` button.

---

## Bilingual mode (when applicable)

If the user wants two languages:

### The slider switch

Three-segment **slider** in the topbar (segmented control with a sliding thumb), order **fixed**: `EN | EN+中 | 中` left to right.

```html
<div class="lang-switch" data-active="en">
  <span class="lang-thumb" aria-hidden="true"></span>
  <button data-lang="en"    type="button">EN</button>
  <button data-lang="mixed" type="button">EN+中</button>
  <button data-lang="cn"    type="button">中</button>
</div>
```

The thumb's exact position is computed in JS via `getBoundingClientRect()` of the active button (CSS percentage transforms drift sub-pixel because of paddings/borders). Bind a `resize` listener to re-align.

```js
function alignSliderThumb(sw) {
  const active = sw.querySelector(`button[data-lang="${sw.dataset.active}"]`);
  const thumb  = sw.querySelector(".lang-thumb");
  if (!active || !thumb) return;
  const swR  = sw.getBoundingClientRect();
  const btnR = active.getBoundingClientRect();
  thumb.style.width     = btnR.width + "px";
  thumb.style.transform = `translateX(${btnR.left - swR.left}px)`;
}
```

### Three-mode CSS visibility

```css
html[data-lang="en"] .cn-only { display: none !important; }
html[data-lang="cn"] .en-only { display: none !important; }
html[data-lang="mixed"] .cn-only,
html[data-lang="mixed"] .en-only {
  border-left: 2px solid var(--border);
  padding-left: 10px;
  margin: 6px 0;
}
.lbl-en, .lbl-cn { display: block; }
.lbl-cn { font-size: 0.85em; color: var(--text-soft); margin-top: 4px; font-weight: 500; }
```

Static markup uses `<html lang="en" data-lang="en">` so EN visibility kicks in on first paint (no Chinese flash before JS runs).

### Bilingual content patterns

```html
<!-- UI chrome (driven by an i18n.js dictionary) -->
<button data-i18n="home.btn.export">📤 Save to file</button>
<input  data-i18n="search.placeholder" data-i18n-attr="placeholder" placeholder="…" />

<!-- Body content with parallel siblings (CSS shows the right one) -->
<h1><span class="en-only">Probability</span><span class="cn-only">概率论</span></h1>

<!-- Inline data attribute (atlas cards / index table) -->
<span data-cn="概率论" data-en="Probability">概率论</span>

<!-- Source-note style for callouts -->
<div class="bi-text">
  <span class="en">English summary.</span>
  <span class="cn">中文摘要。</span>
</div>
```

Topics-data shape (extended for evidence-awareness):

```js
window.GROUPS = [{
  id, name_en, name_cn, sub_en, sub_cn,
  emoji,                  // optional, used in mixed-mode dedup
  layer,                  // optional, 0 = foundations row, 1 = main columns, 2 = advanced
}, …];

window.LECTURES = [{
  id,                     // "lec01"
  week,                   // 1
  title_en, title_cn,
  source_status,          // syllabus_only | slides_available | homework_available | notes_available | expanded | reviewed
  related_topics: [slug…],
  source_basis: [{ type: "syllabus"|"slides"|"hw"|"notes", ref: "Week 1: Intro to ML" }],
}, …];

window.TOPICS = [{
  slug, name_en, name_cn, sub_en, sub_cn,
  group,                  // group id
  diff,                   // "green" | "yellow" | "red"

  // evidence layer
  source_status,          // planned | inferred | confirmed | expanded | reviewed
  page_status,            // missing | skeleton | draft | expanded | reviewed
  confidence,             // low | medium | high
  expected_subtopics: [],   // bullets shown on skeleton page; not yet evidenced
  confirmed_subtopics: [],  // moved here once the slides/HW back them
  source_basis: [{ type, ref }],   // each entry says where the claim comes from
  update_policy: { preserve_slug: true, preserve_links: true, when_slides_arrive: "expand" },

  // material links
  lecture_ids: [id…],
  hw: [{ id, hwN, section, problem }, …],
}, …];

window.EDGES = [
  // tuple form still works for the simple group-spine case:
  ["g-foundations", "g-supervised"],
  // object form is preferred when you need types / inferred dotted lines:
  { from: "linear-regression", to: "logistic-regression", type: "prerequisite" },
  { from: "ml-overview", to: "regularization", type: "inferred" },
];

window.SOURCE_MANIFEST = {
  "<slug>": [
    { type: "slides", ref: "slides/Lecture_05.pdf", pages: "12-18" },
    { type: "hw",     ref: "HW/hw02.pdf", problem: "2" },
  ],
  …
};
```

Edge `type` values: `group` (spine), `prerequisite`, `concept`, `review-flow`, `weak-link`, `inferred`. `inferred` renders as a dotted / muted line (see connector code below). Every edge endpoint must reference an existing topic id, group id (`g-<gid>`), or `n-root`.

**Always `sub_en` AND `sub_cn`** — never single-language `sub`. Single-language is a leak in EN/CN mode.

**Schema migration is additive.** Old sites with bare `{slug, name, group, diff}` topics still render — missing status fields default to `confirmed` / `expanded` so existing roadmaps don't suddenly turn dashed. Add the new fields when you actually have evidence to carry.

### Mixed-mode rendering rules

When `lang === "mixed"`, applyLang(el) renders a stacked label:

- For `data-i18n` elements: replace `el.textContent` with `<span class="lbl-en">…</span><span class="lbl-cn">…</span>`.
- For `data-cn` / `data-en` elements: same pattern in the inline scripts that render homepage cards / index table.
- **Dedupe shared leading emoji.** When EN and CN both start with `📐`, only the EN line keeps it. Use `\p{Extended_Pictographic}` regex.

### Topic page parallel structure

```html
<h1><span class="en-only">Probability</span><span class="cn-only">概率论</span></h1>
<div class="subtitle">
  <span class="en-only">Bayes · Conditional · Expectation</span>
  <span class="cn-only">Bayes · 条件概率 · 期望</span>
</div>

<div class="en-only">
  <section class="topic" id="probability-en">
    <h2>🎲 Probability</h2>
    …intuition / formulas / pitfalls / exam focus / example…
  </section>
</div>
<div class="cn-only">
  <section class="topic" id="probability-cn">
    <h2>🎲 概率论</h2>
    …平行的中文版本…
  </section>
</div>
```

The TOC builder must be language-aware:

```js
// Skip headings inside the inactive language wrapper; dedupe in mixed mode.
items.forEach(el => {
  if (lang === "en" && el.closest(".cn-only")) return;
  if (lang === "cn" && el.closest(".en-only")) return;
  const sect = el.closest("section.topic");
  if (!sect || !sect.id) return;
  const baseId = sect.id.replace(/-(?:en|cn)$/, "");
  if (lang === "mixed" && seen.has(baseId)) return;
  seen.add(baseId);
  // …append link to TOC…
});
// Rebuild on lang switch via event delegation.
```

---

## Local progress persistence (the "don't reset every time" feature)

Two-layer system that survives any of: switching ports, clearing browser cache, switching browsers, switching machines (with Export/Import).

### Layer 1 — `serve.py` (local dev with file-backed state)

A tiny extension of Python's `http.server`:

```python
#!/usr/bin/env python3
"""Local dev server with persistent progress."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import json, sys, socket

ROOT = Path(__file__).resolve().parent
PROGRESS_FILE = ROOT / "progress.json"

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **k): super().__init__(*a, directory=str(ROOT), **k)
    def _read(self):
        if not PROGRESS_FILE.exists(): return {}
        try: return json.loads(PROGRESS_FILE.read_text(encoding="utf-8")) or {}
        except: return {}
    def _write(self, d):
        PROGRESS_FILE.write_text(json.dumps(d, ensure_ascii=False, indent=2), encoding="utf-8")
    def do_GET(self):
        if self.path == "/api/progress":
            body = json.dumps(self._read(), ensure_ascii=False).encode("utf-8")
            self.send_response(200); self.send_header("Content-Type", "application/json")
            self.send_header("Cache-Control", "no-store"); self.end_headers(); self.wfile.write(body); return
        super().do_GET()
    def do_POST(self):
        if self.path == "/api/progress":
            n = int(self.headers.get("Content-Length", "0") or 0)
            try: data = json.loads(self.rfile.read(n) if n else b"{}")
            except: self.send_error(400, "invalid json"); return
            if not isinstance(data, dict): self.send_error(400, "expected object"); return
            self._write(data); self.send_response(204); self.end_headers(); return
        self.send_error(404)
    def log_message(self, fmt, *a):  # quieter
        if a and "/api/progress" in a[0]: return
        return super().log_message(fmt, *a)

if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    print(f"  serving       http://localhost:{port}")
    print(f"  progress file {PROGRESS_FILE}")
    ThreadingHTTPServer(("", port), Handler).serve_forever()
```

### Layer 2 — `assets/progress-sync.js` (must load FIRST)

Patches `localStorage.setItem` / `removeItem` for the progress key, fans out writes to `POST /api/progress` with a 300 ms debounce, pulls a snapshot on boot and on tab focus. Falls back silently when no endpoint exists (plain `python3 -m http.server`, file://, GitHub Pages).

```js
(function () {
  const KEY      = "<repo>_progress_v1";
  const ENDPOINT = "/api/progress";
  let suppress = false, serverHere = null, saveTimer = 0;

  async function loadFromServer() {
    try {
      const r = await fetch(ENDPOINT, { cache: "no-store" });
      if (!r.ok) { serverHere = false; return; }
      const remote = await r.json();
      serverHere = true;
      if (!remote || typeof remote !== "object") return;
      const local = JSON.parse(localStorage.getItem(KEY) || "{}");
      const merged = { ...remote, ...local };  // local wins on conflict
      suppress = true; origSet(KEY, JSON.stringify(merged)); suppress = false;
      document.dispatchEvent(new CustomEvent("ml-progress-loaded", { detail: merged }));
    } catch { serverHere = false; }
  }
  function debouncedSave() {
    if (serverHere === false) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      try {
        const r = await fetch(ENDPOINT, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(JSON.parse(localStorage.getItem(KEY) || "{}")),
        });
        serverHere = r.ok;
      } catch { serverHere = false; }
    }, 300);
  }
  const origSet = localStorage.setItem.bind(localStorage);
  const origRem = localStorage.removeItem.bind(localStorage);
  localStorage.setItem    = (k, v) => { origSet(k, v); if (k === KEY && !suppress) debouncedSave(); };
  localStorage.removeItem = (k)    => { origRem(k);    if (k === KEY && !suppress) debouncedSave(); };
  window.addEventListener("focus", loadFromServer);
  loadFromServer();

  // Export / Import — works regardless of server presence.
  window.MLProgress = {
    export() {
      const blob = new Blob([JSON.stringify(JSON.parse(localStorage.getItem(KEY) || "{}"), null, 2)],
                            { type: "application/json" });
      const a = document.createElement("a");
      const stamp = new Date().toISOString().slice(0, 10);
      a.href = URL.createObjectURL(blob);
      a.download = `progress-${stamp}.json`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
    },
    import() {
      const inp = document.createElement("input"); inp.type = "file"; inp.accept = "application/json";
      inp.onchange = async () => {
        const f = inp.files?.[0]; if (!f) return;
        try {
          const obj = JSON.parse(await f.text());
          if (typeof obj !== "object") throw new Error("not a json object");
          const cur = JSON.parse(localStorage.getItem(KEY) || "{}");
          localStorage.setItem(KEY, JSON.stringify({ ...cur, ...obj }));
          location.reload();
        } catch (e) { alert("Couldn't import: " + e.message); }
      };
      inp.click();
    }
  };
})();
```

### Storage shape

```js
{
  "<slug>": true,                  // master flag (Mark as mastered button)
  "tut:<slug>": true,              // tutorial read in popup
  "prob:<slug>:hwN-x-y": true,     // an HW problem checked in popup
  …
}
```

### Per-card fractional progress

The home grid `markProgress()` calculates each card's completion ratio:

```js
function cardFraction(slug, p) {
  if (p[slug]) return 1;                              // master flag wins
  const data = (window.POPUP_DATA || {})[slug];
  if (!data) return 0;
  const total = (data.tutorial ? 1 : 0) + (data.problems?.length || 0);
  if (!total) return 0;
  let done = 0;
  if (data.tutorial && p[`tut:${slug}`]) done += 1;
  (data.problems || []).forEach(pr => { if (p[`prob:${slug}:${pr.id}`]) done += 1; });
  return done / total;
}
```

Drives:
- card progress-bar fill width (`fraction * 100%`)
- `.done` class at 100%
- home progress ring numerator (count of cards at 100%)

Re-runs on `ml-progress-rerender`. Every popup checkbox toggle and every Mark-as-mastered click must dispatch this event.

### Export / Import buttons

Live in the home sidebar with **clear labels** and **hover tooltips**:

- `📤 Save to file` (en) / `📤 备份到文件` (cn)
- `📥 Load from file` (en) / `📥 从文件恢复` (cn)
- Tooltip on Export: "Download all your progress as a JSON file you can save anywhere."
- Tooltip on Import: "Pick a previously-exported JSON file and merge its progress into this browser."
- Help paragraph below explaining use cases (move between machines, share with a study buddy, backup before clearing browser, automatic local saves with `serve.py`).

`progress.json` is `.gitignore`d — personal study state never lands on GitHub.

---

## GitHub Actions deploy

`.github/workflows/deploy.yml` triggered by push to `main` and manual `workflow_dispatch`:

```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
  workflow_dispatch:
concurrency:
  group: pages
  cancel-in-progress: false
permissions:
  contents: read
  pages: write
  id-token: write
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: .
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

**One-time user setup**: Settings → Pages → Source: "GitHub Actions". Tell the user clearly. The first run will fail with "Configure Pages" if they haven't done this; that's expected.

---

## Workflow when invoked

```
0. Detect the phase
   - Does an existing site folder already exist? → weekly-update mode
     (see "Weekly update mode" below); skip steps 2-3 and skip topic
     regeneration for slugs that already have human edits.
   - Only a syllabus + lecture titles? → bootstrap mode; topics start as
     `planned` / `inferred`; topic pages are skeletons.
   - Slides + HW + notes available? → full-build mode; topics start as
     `confirmed`; topic pages are expanded.

1. Inspect the course folder
   - List files; bucket as syllabus / slides / HW / sol / book / notes
   - Extract syllabus or notes outline to plain text
   - Print proposed topic list + groups + each topic's planned source_status,
     ASK USER TO CONFIRM before generating pages

2. Scaffold the site folder
   - Create output dir + assets/ + topics/ + .github/workflows/
   - Write style.css, progress-sync.js, main.js (and i18n.js if bilingual)
   - Write serve.py and deploy.yml
   - Symlink slides / HW / book from the parent; add to .gitignore alongside progress.json

3. Generate topic pages from a Python script
   - For each topic, write a single HTML page using the topic template.
   - Branch on source_status:
     • planned/inferred → SKELETON page (status block, expected_subtopics
       list, "to be expanded after slides arrive" placeholder, source_basis
       references). No fake formulas / examples / exam claims.
     • confirmed/expanded → FULL page with these sections in order:
         1. Status & sources (badge + source_basis chips)
         2. Big Picture — what it is + why it matters
         3. Core Idea — main concept in your own words
         4. Key Formulas / Definitions — quote when load-bearing, mark as
            quotes; otherwise paraphrase clearly (see hard rule #1)
         5. How to Recognize It — when this gets tested / used
         6. Common Traps — student mistakes
         7. Minimal Example — small ORIGINAL example, not from HW
         8. Exam Checklist — actionable bullets
         9. Related Topics — prerequisites + follow-ups (links)
        10. Sources Used — local file references, not copied text
   - Detail pages must be MORE detailed and EASIER to understand than the
     source — clearer wording, expanded steps, intuition, "why does this
     work" notes. A page that mirrors the slide deck has failed.
   - For bilingual sites, ship parallel .en-only / .cn-only sections per page
   - Subtitle is bilingual <span class="en-only"> / <span class="cn-only">

4. Wire the homepage tree
   - Group cards by category in two columns
   - Position groups + root in airy layout (see spacing numbers above)
   - Stable id="g-<gid>" on every group div
   - SVG connector function with arrowheads, redrawn on resize / lang switch

5. Add the Mermaid view (default off)
   - Two-button atlas/mermaid switch above the roadmap
   - Auto-generate flowchart TD from GROUPS + TOPICS with stadium nodes,
     per-subgraph color tints, click handlers, classDef difficulty palette
   - Copy-Mermaid-source button + collapsible <details> textarea

6. Harvest homework problems (paraphrase first, quote when needed)
   - Read each HW PDF; for every problem, write a one-line title in your
     own words. A short literal quote is OK when the original wording is
     load-bearing (precise definitions, exact constraints) — mark it as a
     quote.
   - Write a 2-4 sentence answer sketch in your own words. You can quote
     a key formula or definition from the solution if it's essential, but
     the bulk should be your own explanation in clearer language.
   - Map each problem to the most relevant topic slug
   - Pack into popup-data.js under problems[]
   - Each problem links out to ../HW/hwN.pdf and ../HW/hwN_sol.pdf

7. Code templates → topic pages, not popups
   - Pick the dominant language used in the course
   - Write 1-2 focused snippets per topic in popup-data.js code: []
   - Popup links to topics/<slug>.html#code (NOT inline)
   - main.js's injectTopicCodeSection() reads window.POPUP_DATA[slug].code
     at load time and inserts a <section id="code"> before the prev/next nav

8. Bilingual UI strings via i18n.js
   - Dictionary keyed by data-i18n="…" attributes
   - Cover nav links, button labels, page headers, section titles, tooltips
   - applyLang handles three modes; mixed mode stacks with emoji dedup

9. README in the user's chosen language
   - Layout, how to run locally with serve.py, what the symlinks do,
     export/import explanation, deploy URL, no AI attribution

10. AGENT.md inside the new site folder
    - Copy the user-rules and conventions from this skill
    - Record course-specific topic mapping, source-note locations, etc.
    - Future Claude sessions read this before changing anything

11. Local smoke test
    - python3 serve.py 8821 from inside the site folder
    - curl index.html, a topic page, /api/progress (200), an HW pdf via symlink (200)
    - Run the EN-leak audit (see below) — target zero leaks

12. Git
    - Inside the site folder: git init -b main, .gitignore in place
    - First commit: "init: <course> review site" with a 4-6 bullet body
    - Add remote (if user gave one) and push
    - Walk user through one-time Pages setup (Settings → Pages → Source: GitHub Actions)
```

---

## Weekly update mode

When the site folder already exists and the user adds new slides / HW / notes:

```
1. Read the existing topics-data.js to recover GROUPS / TOPICS / EDGES /
   LECTURES / SOURCE_MANIFEST. This is your source of truth — don't drop
   any of it.

2. Match the new file(s)
   - By week number in filename (e.g. Lecture_05.pdf → lec05)
   - By section heading inside the PDF
   - If unclear, ask the user before guessing

3. Diff topics
   - For each topic mentioned in the new file:
       • If slug exists with status planned/inferred → upgrade to confirmed,
         move expected_subtopics that are now backed into confirmed_subtopics,
         append a new source_basis entry, append to SOURCE_MANIFEST[slug].
       • If slug exists with status confirmed/expanded → just append
         source_basis + SOURCE_MANIFEST entry; do NOT rewrite the page.
       • If slug doesn't exist and the topic is genuinely new →
         add as confirmed, ask user where it belongs in the group layout.

4. Preserve human edits
   - For any topic page whose mtime is newer than the topics-data.js mtime,
     OR whose file contains a `<!-- human-edited -->` marker (insert this
     marker on first user edit), do NOT overwrite. Write rewrites to
     <slug>.html.new and surface the diff to the user.

5. Update lecture status
   - Bump LECTURES[i].source_status (syllabus_only → slides_available, etc.)
     once each material category appears.

6. Re-render only what changed
   - Regenerate index.html (cheap; status badges may have shifted)
   - Regenerate only the topic pages whose status / source_basis changed
     AND that aren't human-edited.
   - Re-run the EN-leak audit on touched pages.

7. Commit
   - One focused commit per week's update, e.g.
     "week 5: confirm logistic regression + cross-entropy from slides"
```

Never re-generate the whole site from scratch on a weekly update. The student has built up progress + may have edited pages.

---

## EN-leak audit (mandatory after content changes)

Save and run from the repo root:

```python
import re
from html.parser import HTMLParser
from pathlib import Path

class S(HTMLParser):
    def __init__(self): super().__init__(); self.lang=0; self.i18n=0; self.skip=0; self.st=[]; self.leaks=[]
    def handle_starttag(self, t, attrs):
        a = dict(attrs); cls = (a.get("class") or "").split()
        if t in ("script","style"): self.skip += 1
        in_lang = "en-only" in cls or "cn-only" in cls
        if in_lang: self.lang += 1
        if "data-i18n" in a: self.i18n += 1
        self.st.append((in_lang, "data-i18n" in a))
    def handle_endtag(self, t):
        if t in ("script","style"): self.skip = max(0, self.skip-1); return
        if not self.st: return
        il, hi = self.st.pop()
        if il: self.lang -= 1
        if hi: self.i18n -= 1
    def handle_data(self, d):
        if self.skip or self.lang or self.i18n: return
        if re.search(r"[一-鿿]", d):
            s = d.strip()
            if s: self.leaks.append((self.getpos(), s[:80]))

for p in [*Path(".").glob("*.html"), *Path("topics").glob("*.html")]:
    s = S(); s.feed(p.read_text(encoding="utf-8"))
    if s.leaks:
        print(f"{p}: {len(s.leaks)}")
        for pos, t in s.leaks[:3]: print(f"  {pos}: {t}")
```

`<element>` is a leak iff it contains CJK and has **no** `.en-only` / `.cn-only` / `data-i18n` ancestor (and isn't inside `<script>` / `<style>`). Wrap any leak with `<span class="en-only">EN</span><span class="cn-only">CN</span>`.

---

## Storage keys reference

Pick a stable prefix per-site (e.g. `ml_review_*`, `os_review_*`):

| Key | Type | Purpose |
| --- | --- | --- |
| `<prefix>_progress_v1` | object | Mastered slugs + checked problems + read tutorials |
| `<prefix>_lang_v1`     | `"en" \| "cn" \| "mixed"` | Active language mode |
| `<prefix>_view_v1`     | `"atlas" \| "mermaid"` | Roadmap view selection |

Bump the suffix (`_v2`) only if the schema changes incompatibly.

---

## Templates

Reference implementations live next to this SKILL.md in `assets/`:

```
~/.claude/skills/class-material-to-website/assets/
├── style.css       polished bilingual CSS + popup + slider thumb + airy roadmap
├── i18n.js         EN / EN+中 / 中 + slider thumb alignment
├── popup.js        click-anchored popup with viewport-aware positioning
└── main.js         progress + search + connector + topic-code injector
```

Copy verbatim into the new site, then customize colors / dictionary entries / connector edges. Don't rewrite from scratch.

---

## Failure modes to watch for

- **Topic list extracted from slide titles is noisy.** Always show the candidate list to the user before generating 30+ pages.
- **Symlinks break on Windows.** If the user is on Windows or the site will be served from CI without local PDFs, copy the PDFs into the site folder instead — but then add the new copies to `.gitignore` (still don't commit them).
- **Bilingual content drifts out of sync.** Keep EN and CN bodies side by side in the same HTML so a future editor can see both at once. Don't split into two parallel folders.
- **`progress-sync.js` not loaded first.** Other scripts that read localStorage will see the un-synced state on first load. Always put it as the first `<script>` tag.
- **Adding `data-i18n="key"` without an entry in `i18n.js`** — element keeps placeholder text in all modes. Always add the dictionary entry.
- **Forgetting `sub_en` on a new topic / group** — index table shows empty cells in EN mode. Always add both `sub_en` and `sub_cn`.
- **Forgetting to dispatch `ml-progress-rerender`** after a localStorage progress change — UI stays stale until reload.
- **The connector SVG goes stale on resize / lang switch.** Always bind both listeners.
- **Click-popup steals link clicks.** The popup must `e.preventDefault()` on `.node[data-slug]` clicks — but allow `Cmd/Ctrl-click` to open the topic page in a new tab (`if (e.metaKey || e.ctrlKey) return`).
- **Popup positioned with `window.scrollY`.** That math is for `position: absolute` inside a document-flow parent — but our parent overlay is `position: fixed`. Adding scroll offsets pushes the popup off-screen on scrolled pages. Use viewport-relative coordinates only.
- **Reading TOC from `h2.textContent` without filtering** — picks up both EN and CN headings. Filter by `closest('.en-only' / '.cn-only')` ancestor.
- **Slider thumb misaligned** — CSS percentage transforms drift. Use `getBoundingClientRect()` of the active button.
- **Pasting a whole HW problem or solution wall-of-text.** Stop. The default is paraphrase + a clearer explanation; reserve quotes for specific load-bearing phrasing (precise definitions, exact prompts, key formulas) and mark them as quotes. Always link to the source PDF for the full text.
- **Detail page that just mirrors the slide deck or textbook section.** Not enough. The value of a detail page is making the source easier to understand — expand terse steps, add intuition, walked-through examples, and "why does this work" notes. If your page reads identical to the slide, rewrite it.
- **Marking a topic `confirmed` without evidence.** If the slides / HW / notes haven't actually mentioned it, it must stay `planned` or `inferred`. Faking confirmation poisons the source-status UI.
- **Inventing course-specific formulas / examples / exam-focus on a `planned` page.** Skeleton pages must read as skeletons; the user can tell when you've made up specifics that aren't in any source they have.
- **Overwriting a human-edited topic page on a weekly update.** Check mtime vs. topics-data.js (or the `<!-- human-edited -->` marker). When in doubt, write `<slug>.html.new` and surface the diff instead of clobbering.
- **Edge endpoint refers to a topic / group that doesn't exist.** Connector silently no-ops. Validate that every `from` / `to` matches an existing `id` (topic slug, `g-<gid>`, or `n-root`) before render.
- **First Pages deploy fails with `Configure Pages` error** — that means the user hasn't toggled Settings → Pages → Source: GitHub Actions yet. Tell them once.

---

## Quick checklist before declaring "done"

- [ ] Homepage tree renders with all topics; cards are clickable; SVG connectors with arrowheads connect groups along the spine.
- [ ] Atlas + Mermaid views both render; copy-Mermaid-code button works; node clicks navigate.
- [ ] Popup pops out from the click position, not from the edge; long content scrolls inside.
- [ ] Three sections in popup: tutorial, code-template link (not inline), problems.
- [ ] Topic page has a `<section id="code">` injected from popup-data.js code field.
- [ ] HW problem titles are paraphrased (literal quotes only when load-bearing, marked as quotes); answers are mostly your own clearer explanation, with quotes reserved for essential definitions/formulas.
- [ ] Detail topic pages go beyond the source — clearer wording, expanded steps, intuition, worked micro-examples — not a verbatim mirror of the slides/textbook.
- [ ] Topic pages have parallel EN / CN bodies (if bilingual); subtitle is bilingual.
- [ ] Default language is English (or the user's chosen default); static `<html data-lang="en">` matches.
- [ ] Slider switch shows three segments with a sliding thumb; thumb aligned with `getBoundingClientRect`.
- [ ] EN-leak audit reports 0 across all pages.
- [ ] Per-card progress bars fill proportionally; home ring counts 100%-done cards; all checkboxes dispatch `ml-progress-rerender`.
- [ ] `serve.py` runs and `GET /api/progress` returns 200 with valid JSON; `POST /api/progress` writes `progress.json`.
- [ ] Export / Import buttons have clear labels and tooltips spelling out their purpose.
- [ ] No `Co-Authored-By` or AI attribution anywhere.
- [ ] PDFs are not committed; symlinks + `progress.json` are git-ignored.
- [ ] First commit message is lowercase, plain, human; subsequent pushes are auto-deployed via Pages.
- [ ] AGENT.md inside the new site folder records course-specific preferences.
- [ ] **Data validation passes**: every topic has `id` / `slug` / `title` / `group` / `diff` / `source_status` / `page_status`; slugs are unique; every topic's `group` references an existing group; every `EDGES` endpoint references an existing topic / group / `n-root`.
- [ ] **Status discipline**: no topic is `confirmed` without a `source_basis` entry pointing at the syllabus / slides / HW / notes that back it; `planned` and `inferred` topics ship as skeleton pages, not fake-detail pages.
- [ ] **Status visuals**: cards render dashed border for `planned`, gray tint + "Likely" badge for `inferred`, green check badge for `reviewed`; inferred edges are dotted.
- [ ] **Weekly update preserves user state**: existing slugs / IDs / URLs / human-edited pages are intact; new evidence only upgraded statuses, didn't clobber content.
