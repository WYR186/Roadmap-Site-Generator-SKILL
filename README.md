# Roadmap Site Generator

A Claude Code skill that turns a folder of course materials — syllabus, slides, homework, textbooks, notes — into a static study website built around a clean node-based study roadmap.

Built for real semesters: starts from a syllabus alone, grows as new slides arrive, ends in a final review site. Every topic carries a `source_status` so the site is honest about what is grounded in the materials versus what is still a guess.

> **One sentence**: structured course materials in, evidence-aware roadmap site out — no build step, no framework, no AI attribution on the student's work.

---

## What gets built

```text
<Course> Review/
├── index.html              ← tree roadmap (Atlas + Mermaid views)
├── cheatsheet.html         ← one-page cram sheet
├── resources.html          ← lecture / HW / textbook map
├── topics/<slug>.html      ← one page per topic
├── assets/                 ← style.css, i18n.js, popup.js, main.js, progress-sync.js
├── serve.py                ← local dev server with persistent progress
└── .github/workflows/      ← push → GitHub Pages
```

| Layer            | What you get                                                                                         |
| ---------------- | ---------------------------------------------------------------------------------------------------- |
| Homepage         | Root node + conceptual group boxes in two columns, one card per topic, SVG bezier connectors        |
| Card popup       | Anchored at click position; tutorial summary, code-template link, paraphrased homework list         |
| Topic page       | Big Picture · Core Idea · Key Formulas · How to Recognize It · Common Traps · Example · Checklist   |
| Bilingual mode   | `EN · 中` two-segment toggle (中 keeps technical English keywords inline); strict zero-Chinese-leak audit in EN mode |
| Progress         | Per-checkbox state, per-card progress bars, home progress ring, export / import JSON                |
| Persistence      | `serve.py` writes `progress.json`; survives browser clears, port changes, machine moves             |
| Deploy           | One push to `main` → GitHub Pages via Actions workflow                                              |

Pure HTML, CSS, and vanilla JS. MathJax via CDN if formulas are needed. No npm, no bundlers.

---

## Install

This is a Claude Code skill, not a standalone tool.

```bash
git clone https://github.com/WYR186/Roadmap_Site_Generator_SKILL.git \
  ~/.claude/skills/class-material-to-website
```

Then in any Claude Code session, point Claude at a course folder. The skill triggers on phrases like:

```text
make a study site from this folder
build a node-based study roadmap for <course>
turn this course material into a tree visualization
```

For mid-semester updates:

```text
I added Lecture 5 slides and HW 2. Update the existing site.
```

---

## The evidence model

The skill's defining idea: every topic carries a status that says how grounded the claim is.

| Status        | Meaning                                                                          | Visual                       |
| ------------- | -------------------------------------------------------------------------------- | ---------------------------- |
| `planned`     | Named in the syllabus, but no slides / HW / notes yet                            | Dashed border                |
| `inferred`    | Likely subtopic guessed from a lecture title or prerequisite chain               | Gray tint + "Likely" badge   |
| `confirmed`   | Appears in slides, HW, notes, syllabus details, or user-supplied material        | Solid border                 |
| `expanded`    | `confirmed`, and the topic page has been written with original explanations      | Solid border                 |
| `reviewed`    | A human passed over the page before exam / final release                         | Green check badge            |

When in doubt, downgrade. `inferred` is honest; pretending it's `confirmed` is not.

Edges between topics are typed too — `prerequisite`, `concept`, `review-flow`, `inferred` — and `inferred` edges render as dotted lines to keep speculation visually distinct.

---

## Progressive workflow

The skill is invoked **multiple times across a semester** and never regenerates destructively. Slugs, URLs, and human edits are preserved across runs.

```text
Phase 0/1  ─  Syllabus bootstrap      →  skeleton roadmap, planned + inferred topics
Phase 2    ─  Weekly material update  →  upgrade statuses, append source_basis, no clobbering
Phase 3    ─  Topic expansion         →  write detailed pages for confirmed topics
Phase 4    ─  Review consolidation    →  reorder by dependency, missing/weak report, cheatsheet
```

If a topic page has been hand-edited (mtime newer than `topics-data.js`, or a `<!-- human-edited -->` marker), the skill writes any rewrite to `<slug>.html.new` and surfaces the diff instead of overwriting.

---

## Hard rules

The skill enforces these non-negotiables on every site it generates:

1. **Quoting source material is allowed, but the default is plain-language explanation.** Detail pages must be clearer and more beginner-friendly than the source — not a verbatim mirror.
2. **Never commit course PDFs.** Use symlinks plus `.gitignore`.
3. **One topic = one card = one page.** No merged "Linear / Logistic Regression" cards.
4. **Solo-author git commits.** No `Co-Authored-By`, no "Generated with…" footer, no AI mentions in commits, README, code, or footers of generated sites.
5. **No build step.** Plain HTML / CSS / vanilla JS, optional Mermaid + MathJax via CDN.
6. **EN mode shows zero Chinese.** Bilingual sites pass an HTML-parser leak audit on every change.
7. **Don't fabricate course-confirmed knowledge.** Skeleton pages for `planned` / `inferred` topics are fine; faked formulas / examples / exam claims are not.
8. **Never regenerate destructively.** Preserve slugs, IDs, URLs, and human-edited content across runs.

---

## Repo layout

```text
SKILL.md                            ← full skill spec, the source of truth Claude loads at runtime
README.md                           ← this file (the GitHub front page)
serve.py                            ← local dev server template (HTTP + /api/progress)
assets/
  ├── style.css                     ← bilingual CSS, popup, slider thumb, airy roadmap
  ├── i18n.js                       ← EN / 中 two-mode toggle with slider thumb alignment
  ├── popup.js                      ← click-anchored popup with viewport-aware positioning
  ├── main.js                       ← progress + search + connector + topic-code injector
  └── progress-sync.js              ← localStorage ⇄ /api/progress, MUST load first
templates/
  └── github-workflows/deploy.yml   ← Pages workflow for generated sites (kept under templates/
                                       so GitHub Actions doesn't try to run it on THIS repo)
```

---

## Full reference

The complete spec — data schema, layout numbers, connector code, popup positioning rules, EN-leak audit, weekly-update protocol, validation checklist, every documented failure mode — lives in [SKILL.md](SKILL.md).

That file is what Claude Code reads when the skill triggers. This README is the human-facing summary.
