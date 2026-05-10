# AGENT.md — for future Claude sessions maintaining this skill

This file is a working memo for whoever (Claude or human) is editing the
`class-material-to-website` skill itself. **It's not the AGENT.md that
gets generated inside a course site** — that one is per-course and lives
under `<Course> Review/AGENT.md` (see workflow step 10 in SKILL.md).

If you're using the skill to build a study site, read SKILL.md, not this.
If you're modifying the skill, read this first.

---

## What lives here

```
~/.claude/skills/class-material-to-website/
├── SKILL.md                          ← the canonical skill spec (loaded by Claude Code at trigger time)
├── AGENT.md                          ← this file (skill-maintenance notes)
├── serve.py                          ← local dev server TEMPLATE that gets copied into generated sites
├── assets/                           ← runtime asset TEMPLATES copied verbatim into generated sites
│   ├── style.css
│   ├── i18n.js
│   ├── popup.js
│   ├── main.js
│   ├── progress-sync.js
│   └── atlas-rf.js                   ← optional React Flow renderer (Profile B, opt-in only)
└── .github/workflows/deploy.yml      ← Pages workflow TEMPLATE for generated sites
```

The `assets/` files are **templates** — generated course sites copy them
verbatim. Bug fixes here flow to every future site built by the skill.
Existing deployed sites need a manual copy.

---

## Load-bearing invariants (don't undo without reason)

### 1. Two language modes only (EN / 中) — no stacked-bilingual third mode

A previous version of this skill had three modes: `EN / EN+中 / 中`. The
`EN+中` (mixed) mode produced stacked `.lbl-en` + `.lbl-cn` spans that
duplicated every label. It was removed in May 2026 because the doubled
walls of text cluttered the page and no one read them. **Do not
reintroduce:**

- The `mixed` value as a first-class lang state
- `.lbl-en` / `.lbl-cn` span stacking inside `applyLang()` or React Flow
  custom nodes
- `.mixed-only` / `.mixed-hide` CSS visibility classes
- A third button labelled `EN+中` in the lang slider

What is still allowed and expected:

- `getLang()` returns `"en"` / `"cn"` only; if it sees a legacy `"mixed"`
  in localStorage it rewrites it to `"en"` (one-time migration). Keep
  this migration — old course sites have this value in users' browsers.
- Authored content stays side-by-side via `.en-only` / `.cn-only`
  wrappers; CSS hides one side. The CN body is Chinese-dominant with
  English keywords inline (`Hessian`, `softmax`, `PSD`, `Transformer`,
  etc.) — not parallel English sentences.

The CSS file has a block labelled "Legacy stacked label helpers kept for
older generated markup" — keep it. It's dead in any site built after May
2026 but harmless, and removing it would break already-deployed sites
that may still have inline `.lbl-en` spans in their generated HTML.

### 2. Evidence-aware source_status

Every topic carries `source_status` ∈ `{planned, inferred, confirmed,
expanded, reviewed}`. The roadmap UI must visually distinguish these
(dashed border for `planned`, gray tint + "Likely" badge for `inferred`,
green check badge for `reviewed`). Don't generate detail content for
`planned` / `inferred` topics — skeleton pages only.

### 3. No build step

Plain HTML / CSS / vanilla JS. MathJax via CDN, optional Mermaid via
CDN. Adding `package.json`, bundlers, or a JS framework breaks the
deployment story. React Flow (`atlas-rf.js`) is opt-in Profile B and
only loads when the user explicitly asks for it; it's not part of the
default site.

### 4. Never regenerate destructively

This skill is invoked multiple times across a semester. Preserve slugs,
IDs, URLs, and any human-edited topic page content. If you would rewrite
a page that's been touched, write to `<slug>.html.new` and surface the
diff — don't overwrite. Detection: mtime newer than `topics-data.js`, or
`<!-- human-edited -->` marker in the file.

### 5. EN-leak audit must pass after content changes

The Python HTML-parser audit in SKILL.md catches CJK text that escapes
the `.en-only` / `.cn-only` / `data-i18n` wrappers. Target: 0 leaks per
page. This is the only reliable check that EN mode stays fully English.

---

## Sync to GitHub

The skill is mirrored to a public repo:

```
https://github.com/WYR186/Roadmap-Site-Generator-SKILL
```

Local clone (working copy): `/tmp/skill-sync/repo/`
(may not exist if `/tmp` was cleared — re-clone with the URL above)

Identity setup on that clone:
- Remote: `git@github.com-wyr186:WYR186/Roadmap-Site-Generator-SKILL.git`
- Local `user.name` = `WYR186`
- Local `user.email` = `98409180+WYR186@users.noreply.github.com`
- SSH alias `github.com-wyr186` → key `~/.ssh/id_ed25519` (verified bound
  to the WYR186 account)
- Global git config is NOT modified — only the clone's local config.

To push an update:

```bash
cd /tmp/skill-sync/repo
cp ~/.claude/skills/class-material-to-website/SKILL.md ./SKILL.md
cp ~/.claude/skills/class-material-to-website/AGENT.md ./AGENT.md
cp ~/.claude/skills/class-material-to-website/serve.py ./serve.py
cp -R ~/.claude/skills/class-material-to-website/assets ./
# (README.md is hand-curated for the GitHub front page — update only if
#  the public-facing summary changes, not on every internal tweak)
git add -A
git commit -m "<short lowercase summary>"   # no "Co-Authored-By", no AI mentions
git push
```

The `.github/workflows/deploy.yml` is intentionally relocated to
`templates/github-workflows/deploy.yml` in the repo (not under `.github/`)
so GitHub Actions doesn't try to run it on the skill repo itself — that
workflow is meant for generated course sites.

---

## Quick checks before declaring an edit done

```bash
# Syntax check all JS templates
for f in assets/*.js; do node --check "$f" && echo "OK  $f"; done

# Look for stale three-mode references — only "legacy" / "do not
# reintroduce" / "normalize" mentions should remain.
grep -rn "mixed\|EN+中\|EN+CN\|\.lbl-en\|\.lbl-cn\|\.mixed-only" \
  SKILL.md assets/

# Look for places that still pretend to be opinionated about
# labuladong (the design inspiration was removed from public-facing
# text in May 2026; only conceptual descriptions should remain).
grep -ni "labuladong" SKILL.md assets/ README.md 2>/dev/null
```

If either grep matches outside legacy / normalization comments, fix it.

---

## Change log (recent material changes)

| Date       | What                                                                 |
| ---------- | -------------------------------------------------------------------- |
| 2026-05-10 | Two-mode language model (drop `EN+中` mixed mode); dead `MixedLabel` and `stripEmoji` removed from `atlas-rf.js`; dead `stripLeadEmoji` and `escHtml` removed from `i18n.js`; `.mixed-only` CSS dropped (the legacy `.lbl-en` / `.lbl-cn` block was kept as a compatibility shim, deliberately). AGENT.md created. |
| 2026-05-09 | Folded in v2 spec: evidence-aware `source_status` model, progressive (Phase 0–4) workflow, typed edges (`prerequisite` / `inferred` / `concept` / etc.), Profile A (default static) vs Profile B (opt-in React Flow), weekly-update mode. SKILL.md `description` updated for trigger fidelity. |
| 2026-05-09 | All "labuladong" mentions replaced with neutral "node-based study roadmap" phrasing across SKILL.md and the README. |
| 2026-05-09 | Hard rule #1 relaxed: quoting source material is allowed when load-bearing; detail pages must still be more readable than the source. |
