# AGENT.md — for future Claude sessions maintaining this skill

This file is a working memo for whoever (Claude or human) is editing the
`class-material-to-website` skill itself. **It's not the AGENT.md that
gets generated inside a course site** — that one is per-course and lives
under `<Course> Review/AGENT.md` (see workflow step 10 in SKILL.md).

If you're using the skill to build a study site, read SKILL.md, not this.
If you're modifying the skill (or coming back months later to bring up a
new course at the same caliber), read this first.

---

## What lives here

```
~/.claude/skills/class-material-to-website/
├── SKILL.md            ← canonical skill spec (Claude Code loads this on trigger)
├── AGENT.md            ← this file
├── serve.py            ← local-dev-server TEMPLATE (copied into every generated site)
├── assets/             ← runtime asset TEMPLATES (copied verbatim into every generated site)
└── .github/workflows/  ← Pages deploy workflow TEMPLATE for generated sites
```

`SKILL.md` is the source of truth for behavior. `assets/` is the source
of truth for the runtime. Bug fixes to either flow into every future
site built by the skill. Already-deployed sites need a manual `cp` to
pick up template changes.

### File responsibilities (every file in `assets/` — one row each)

| File                  | Role                                                                                                                  | Touches at runtime                       |
| --------------------- | --------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| `style.css`           | All visuals: topbar, lang slider, Atlas DOM cards, React-Flow `.rf-*`, popup, callouts, `.algo-*` chips, status badges | every page                               |
| `progress-sync.js`    | Patches `localStorage.setItem` / `removeItem`; debounced fan-out to `POST /api/progress`; pull on boot + tab focus    | every page (MUST be the first `<script>`) |
| `main.js`             | Per-card progress aggregation, search box, topic-page `<section id="code">` injection, `ml-progress-rerender` bus     | every page                               |
| `popup.js`            | Click-anchored popup with viewport-aware positioning. Exposes `window.openTopicPopup(slug, anchor)`                   | pages with Atlas cards                   |
| `popup-data.js`       | Per-topic tutorial blurb + code snippets + paraphrased HW problems                                                    | popup, topic-code injector, problems.html |
| `topics-data.js`      | `GROUPS / TOPICS / LECTURES / EDGES / SOURCE_MANIFEST` — the source-of-truth data file for the entire site            | every page that lists topics             |
| `i18n.js`             | EN / 中 two-mode toggle. Dictionary, slider thumb alignment via `getBoundingClientRect`. Legacy `mixed` → `en`        | bilingual sites only                     |
| `atlas-rf.js`         | Profile B React Flow Atlas (ES module). Mounts in `#rfMount` on `index.html`. Reads GROUP_LAYOUT for stable coords    | index.html (Profile B)                   |
| `algorithm-tags.js`   | `TOPIC_TAGS` (slug → 3-axis value arrays) + `TAG_DIMENSIONS` (chip groups in render order)                            | algorithms.html                          |
| `algorithm-index.js`  | Renders the algorithm-index table; chip filter logic with empty-tag carve-out                                         | algorithms.html                          |
| `equation-sheet.js`   | Per-topic formula blocks with LaTeX strings; cheatsheet.html's data source                                            | cheatsheet.html                          |
| `problems-page.js`    | Flat HW aggregator (optional)                                                                                         | problems.html                            |

### Anatomy of a generated site (what each page does)

- `index.html` — Homepage. The Atlas (React Flow in Profile B, DOM+SVG in Profile A) + Mermaid view switch + progress side-card. **Nothing else lives here** — the algorithm index, cheatsheet, and HW aggregator are deliberately split out so the Atlas gets the full viewport.
- `algorithms.html` — Standalone topic index. Sticky filter bar with chip groups (paradigm / task / family / …); a table of every topic with status badges; per-dimension and global reset buttons; row click → topic page. Course-org axes (block / week / lecture #) are deliberately excluded.
- `cheatsheet.html` — Equation sheet. Data-driven from `equation-sheet.js`. Long equations wrap or scroll inside their block; each block has a back-link to `topics/<slug>.html`. Never hand-edit inline HTML for individual formulas — that path rots.
- `problems.html` (optional) — Flat HW-problem checklist across all topics. Checkbox state is shared with the popup checklists via the same `prob:<slug>:<id>` localStorage keys.
- `resources.html` — Lecture / HW / textbook map. Each entry links to a local PDF via the gitignored symlinks; makes the per-topic `source_basis` chips navigable.
- `topics/<slug>.html` — One per topic. 9-section template (Concept Understanding → Plain-English → Core Intuition → Key Equations → Worked Examples → Problem-Solving Tips → Common Mistakes → Exam Focus → Quick Checklist) with color-coded callouts. Bilingual sites ship both `.en-only` and `.cn-only` bodies — every section appears in both, CN body is Chinese-dominant with English keywords inline.

The top-bar `.nav-links` block is shared across all pages including every `topics/*.html`. Add a new page → update the shared block in one place and re-emit; never hand-edit 41 files.

---

## Load-bearing invariants (do not undo without a good reason)

### 1. Two language modes only (EN / 中) — no stacked-bilingual third mode

A previous version of this skill shipped `EN / EN+中 / 中`. The `EN+中`
mode produced stacked `.lbl-en` + `.lbl-cn` spans that duplicated every
label; it was removed in May 2026 because the doubled walls of text
cluttered the page. **Do not reintroduce:**

- The `mixed` value as a first-class lang state
- `.lbl-en` / `.lbl-cn` span stacking inside `applyLang()` or React Flow
  custom nodes
- `.mixed-only` / `.mixed-hide` CSS visibility classes
- A third button labelled `EN+中` in the lang slider

What is still allowed and expected:

- `getLang()` returns `"en"` / `"cn"` only; if it sees a legacy `"mixed"`
  in localStorage it rewrites it to `"en"` (one-time migration). Keep
  this migration — older course sites have this value in users' browsers.
- Authored content stays side-by-side via `.en-only` / `.cn-only`
  wrappers; CSS hides one side. The CN body is Chinese-dominant with
  English keywords inline (`Hessian`, `softmax`, `PSD`, `Transformer`,
  `prior`, `posterior`, …) — not parallel English sentences.

The CSS file has a block labelled "Legacy stacked label helpers kept for
older generated markup" — **keep it**. It's dead in any site built after
May 2026 but harmless, and removing it would break already-deployed
sites that have inline `.lbl-en` spans in their generated HTML.

### 2. Evidence-aware source_status

Every topic carries `source_status` ∈ `{planned, inferred, confirmed,
expanded, reviewed}`. The roadmap UI must visually distinguish these
(dashed border for `planned`, gray tint + "Likely" badge for `inferred`,
green check badge for `reviewed`). Don't generate detail content for
`planned` / `inferred` topics — skeleton pages only.

### 3. No build step

Plain HTML / CSS / vanilla JS. MathJax via CDN, optional Mermaid via
CDN, React Flow via CDN + importmap (Profile B only). Adding
`package.json`, bundlers, or a JS framework breaks the deployment
story. Profile B's React Flow is opt-in and still ships without a build
step — just an importmap on `index.html`.

### 4. Never regenerate destructively

This skill is invoked multiple times across a semester. Preserve slugs,
IDs, URLs, and any human-edited topic page content. If you would
rewrite a page that's been touched, write to `<slug>.html.new` and
surface the diff — don't overwrite. Detection: mtime newer than
`topics-data.js`, or `<!-- human-edited -->` marker in the file.

### 5. EN-leak audit must pass after content changes

The Python `HTMLParser` audit in SKILL.md catches CJK text that escapes
the `.en-only` / `.cn-only` / `data-i18n` wrappers. Target: 0 leaks per
page. This is the only reliable check that EN mode stays fully English.
Run it on every HTML page including `algorithms.html`, `cheatsheet.html`,
`resources.html`, `problems.html`, and every `topics/*.html`.

### 6. The "Reproduction blueprint" in SKILL.md is the contract

The blueprint section near the top of SKILL.md lists every page, every
asset file, and every feature that must be present for a new-course
build to match the reference caliber. If you find a row that the skill
no longer produces, either fix the skill or update the blueprint —
don't let them silently drift.

---

## Reproducing the reference caliber on a new course

The skill's own "Workflow when invoked" section is the step-by-step.
This is the high-level frame:

```
phase 0  →  detect inputs (syllabus only?  partial materials?  full course folder?)
phase 1  →  bootstrap: skeleton roadmap, planned/inferred topics, no fake specifics
phase 2  →  weekly updates upgrade statuses, append source_basis, never clobber
phase 3  →  expand confirmed topics into 9-section pages with original explanations
phase 4  →  review consolidation: dependency-ordered roadmap + cheatsheet + missing-topic report
```

For a brand-new course where the student has the full folder upfront,
go straight from phase 0 to phase 3 — but still mark `source_status`
honestly so the next-week scenario (Phase 2) is supported.

**Minimum reproduction sequence**, working through SKILL.md "Workflow
when invoked" steps 0 → 12 in order, with the standalone-page sub-steps
(5a — algorithms.html, 5b — cheatsheet.html, 5c — optional problems.html,
5d — resources.html) NOT skipped. Every row in the blueprint asset
table should exist when you're done.

---

## Sync to GitHub

The skill is mirrored to a public repo:

```
https://github.com/WYR186/Roadmap-Site-Generator-SKILL
```

The polished course-site reference implementation (what we're trying to
let any new course reproduce):

```
https://github.com/WYR186/ML_Atlas
```

Local clone of the skill repo: `/tmp/skill-sync/repo/` (may not exist
if `/tmp` was cleared — re-clone with the URL above).

Identity setup on that clone:
- Remote: `git@github.com-wyr186:WYR186/Roadmap-Site-Generator-SKILL.git`
- Local `user.name`  = `WYR186`
- Local `user.email` = `98409180+WYR186@users.noreply.github.com`
- SSH alias `github.com-wyr186` → key `~/.ssh/id_ed25519` (verified
  bound to the WYR186 account)
- Global git config is NOT modified — only the clone's local config.

### Push procedure

```bash
cd /tmp/skill-sync/repo

# 1. Pull first — the user may have pushed from another working copy.
git fetch origin && git pull --rebase origin main

# 2. Copy current skill state over.
cp ~/.claude/skills/class-material-to-website/SKILL.md ./SKILL.md
cp ~/.claude/skills/class-material-to-website/AGENT.md ./AGENT.md
cp ~/.claude/skills/class-material-to-website/serve.py ./serve.py
cp -R ~/.claude/skills/class-material-to-website/assets/. ./assets/

# (README.md is hand-curated for the GitHub front page — update only
#  when the public-facing summary actually changed.)

# 3. Sanity-check no stale three-mode references slipped in.
grep -rn "EN+中\|EN+CN\|\.mixed-only\|MixedLabel" SKILL.md assets/

# 4. Syntax-check all JS templates.
for f in assets/*.js; do node --check "$f"; done

# 5. Commit and push.
git add -A
git commit -m "<short lowercase summary>"   # no Co-Authored-By, no AI mentions
git push
```

If the push is rejected with "remote contains work that you do not have
locally", the user pushed from another clone. **Don't blindly rebase**
if the conflict touches files you also modified (atlas-rf.js / style.css
are common collision points). Safer: `git reset --hard origin/main`,
then re-overlay the local skill folder, then commit fresh.

The `.github/workflows/deploy.yml` is intentionally NOT in
`/tmp/skill-sync/repo/.github/workflows/` — it's relocated to
`templates/github-workflows/deploy.yml` so GitHub Actions doesn't
try to run it on the skill repo itself. The skill repo isn't a Pages
site; the workflow is template content shipped to every generated
course site.

---

## Pre-flight checks before committing an edit

```bash
cd ~/.claude/skills/class-material-to-website

# Syntax check all JS templates.
for f in assets/*.js; do node --check "$f" && echo "OK  $f"; done

# Look for stale three-mode references — only "legacy" / "do not
# reintroduce" / "normalize" mentions should remain.
grep -rn "mixed\|EN+中\|EN+CN\|\.lbl-en\|\.lbl-cn\|\.mixed-only\|MixedLabel" \
  SKILL.md AGENT.md assets/

# Look for "labuladong" — the design inspiration was removed from
# public-facing text in May 2026; only neutral phrasing should remain.
grep -ni "labuladong" SKILL.md AGENT.md assets/

# Check that the SKILL.md asset table matches reality.
ls assets/
```

If either grep matches outside legacy / normalization comments, or the
`ls assets/` output disagrees with the SKILL.md blueprint table, fix
that before committing.

---

## Change log (recent material changes)

| Date       | What                                                                 |
| ---------- | -------------------------------------------------------------------- |
| 2026-05-10 | Added top-level "Reproduction blueprint" section to SKILL.md (page roster + asset roster + feature roster). Expanded Workflow step 2 to enumerate every required asset; added sub-steps 5a–5d for algorithms.html / cheatsheet.html / problems.html / resources.html. Smoke test now hits every standalone page. AGENT.md rewritten as a maintainer's reference with full file-responsibility table + anatomy of a generated site. |
| 2026-05-10 | Two-mode language model (drop `EN+中` mixed mode); dead `MixedLabel` and `stripEmoji` removed from `atlas-rf.js`; dead `stripLeadEmoji` and `escHtml` removed from `i18n.js`; `.mixed-only` CSS dropped (the legacy `.lbl-en` / `.lbl-cn` block was kept as a compatibility shim, deliberately). AGENT.md created. |
| 2026-05-09 | Folded in v2 spec: evidence-aware `source_status` model, progressive (Phase 0–4) workflow, typed edges (`prerequisite` / `inferred` / `concept` / etc.), Profile A (default static) vs Profile B (opt-in React Flow), weekly-update mode. SKILL.md `description` updated for trigger fidelity. |
| 2026-05-09 | All "labuladong" mentions replaced with neutral "node-based study roadmap" phrasing across SKILL.md and the README. |
| 2026-05-09 | Hard rule #1 relaxed: quoting source material is allowed when load-bearing; detail pages must still be more readable than the source. |

When adding a new entry, put it on top with today's date and a one-line summary of *intent*, not just *what changed*. Future-you will thank you.
