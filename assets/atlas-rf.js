// atlas-rf.js — React Flow Atlas roadmap.
//
// Layout: hand-placed coordinates. Group nodes are React Flow parents
// (`parentId` + `extent: "parent"`); topic cards live as their children
// at relative coordinates. Each node carries 4 invisible handles so
// edges can pick the most natural exit/entry direction.
//
// Click on a topic fires window.openTopicPopup(slug, anchor) — the
// click-anchored popover defined in assets/popup.js, which already has
// viewport-aware flipping (above/below + left clamp + maxHeight cap so
// the body scrolls when the anchor is near a viewport edge).
//
// The click is wired via React Flow's onNodeClick (rather than an inner
// DOM handler) so the pan gesture handler can't swallow it.
// Cmd/Ctrl/Shift-click opens the full topic page in a new tab.
//
// Edges leading from a fully-complete group to a not-yet-complete
// group render animated + green to mark the user's current frontier.
// Reaching 100% across all topics fires canvas-confetti once.

import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { createRoot } from "react-dom/client";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Handle,
  Position,
  MarkerType,
  useReactFlow,
} from "@xyflow/react";

const h = React.createElement;

// ─────────────────── Layout constants ───────────────────
const CARD_W = 200;
const CARD_H = 100;
const CARD_GAP = 18;
const PAD_X = 24;
const PAD_TOP = 38;
const PAD_BOTTOM = 26;
const ROOT_W = 380;
const ROOT_H = 100;
const ROOT_TOP = 24;

// Logical canvas size — React Flow `fitView` scales this into whatever
// viewport the user has, so we just pick comfortable numbers.
const CANVAS_W = 1900;

const DIFF_COLOR = {
  green:  "#10b981",
  yellow: "#f59e0b",
  red:    "#ef4444",
};

// ─────────────────── Hand-placed group layout ───────────────────
// Each entry is the top-left corner of a group's bounding box plus the
// number of card columns inside. Group width / height are computed from
// the column count and the topic count. Picked so groups never overlap;
// tweak (x, y) here when groups change rather than relying on auto-flow.
const GROUP_LAYOUT = {
  // Top: course foundation, centered.
  foundations:    { x: 608,  y: 180,  cols: 3 },

  // Tier 1: supervised + unsupervised + theory side-branch off foundations.
  supervised:     { x: 80,   y: 420,  cols: 3 },
  unsupervised:   { x: 820,  y: 420,  cols: 2 },
  theory:         { x: 1340, y: 420,  cols: 2 },

  // Tier 2: trees from supervised; neural from supervised + unsupervised.
  trees:          { x: 80,   y: 780,  cols: 3 },
  neural:         { x: 820,  y: 780,  cols: 3 },

  // Tier 3: descendants of neural.
  sequential:     { x: 80,   y: 1040, cols: 2 },
  representation: { x: 580,  y: 1040, cols: 3 },
  modern:         { x: 1340, y: 1040, cols: 2 },

  // Tier 4: convergence + independent RL branch.
  generative:     { x: 770,  y: 1340, cols: 1 },
  rl:             { x: 1340, y: 1360, cols: 2 },
};

// ─────────────────── Edges (object form) ───────────────────
// `sh` / `th` pick a specific source / target Handle so smoothstep can
// route from the right side of the cluster (instead of always
// bottom→top, which collapses every fork onto the same vector).
// `dashed: true` flags an analytical / generalization link rendered
// with a dashed stroke (currently used for Theory → … context).
const CONNS = [
  { from: "root",             to: "g-foundations",    sh: "sb", th: "tt" },

  { from: "g-foundations",    to: "g-supervised",     sh: "sl", th: "tt" },
  { from: "g-foundations",    to: "g-unsupervised",   sh: "sr", th: "tt" },
  { from: "g-foundations",    to: "g-theory",         sh: "sr", th: "tt", dashed: true },
  { from: "g-foundations",    to: "g-rl",             sh: "sb", th: "tt" },

  { from: "g-supervised",     to: "g-trees",          sh: "sb", th: "tt" },
  { from: "g-supervised",     to: "g-neural",         sh: "sr", th: "tl" },

  { from: "g-unsupervised",   to: "g-representation", sh: "sb", th: "tt" },

  { from: "g-neural",         to: "g-sequential",     sh: "sl", th: "tt" },
  { from: "g-neural",         to: "g-representation", sh: "sb", th: "tt" },
  { from: "g-neural",         to: "g-modern",         sh: "sr", th: "tt" },

  { from: "g-representation", to: "g-generative",     sh: "sb", th: "tt" },
  { from: "g-modern",         to: "g-generative",     sh: "sl", th: "tr" },
];

// ─────────────────── Layout helpers ───────────────────
function groupSize(itemCount, cols) {
  const c = Math.max(1, cols);
  const rows = Math.ceil(itemCount / c);
  const innerW = c * CARD_W + (c - 1) * CARD_GAP;
  const innerH = rows * CARD_H + (rows - 1) * CARD_GAP;
  return {
    cols: c, rows,
    width:  innerW + 2 * PAD_X,
    height: innerH + PAD_TOP + PAD_BOTTOM,
  };
}

// ─────────────────── Progress (mirrors popup.js wire format) ───────────
function readProgress() {
  try { return JSON.parse(localStorage.getItem("ml_review_progress_v1") || "{}"); }
  catch { return {}; }
}
function cardFraction(slug, p, popupData) {
  if (p[slug]) return 1;
  const data = (popupData || {})[slug];
  if (!data) return 0;
  const tutN  = data.tutorial ? 1 : 0;
  const probN = (data.problems || []).length;
  const total = tutN + probN;
  if (!total) return 0;
  let done = 0;
  if (data.tutorial && p[`tut:${slug}`]) done += 1;
  (data.problems || []).forEach(pr => { if (p[`prob:${slug}:${pr.id}`]) done += 1; });
  return done / total;
}
function groupComplete(gid, topics, p, popupData) {
  const items = topics.filter(t => t.group === gid);
  if (!items.length) return false;
  return items.every(t => cardFraction(t.slug, p, popupData) >= 1);
}

// ─────────────────── Bilingual label ───────────────────
const EMOJI_RE = /^(\p{Extended_Pictographic}+)\s*/u;
function stripEmoji(s) {
  const str = String(s || "");
  const m = str.match(EMOJI_RE);
  return m ? { emoji: m[1], rest: str.slice(m[0].length) } : { emoji: "", rest: str };
}
function MixedLabel({ en, cn }) {
  if (!en || !cn || en === cn) return en || cn;
  const e = stripEmoji(en), c = stripEmoji(cn);
  const shared = e.emoji && e.emoji === c.emoji;
  const enLine = shared ? `${e.emoji} ${e.rest}` : en;
  const cnLine = shared ? c.rest : cn;
  return h(React.Fragment, null,
    h("span", { className: "lbl-en" }, enLine),
    h("span", { className: "lbl-cn" }, cnLine),
  );
}
function pickLabel(en, cn, lang) {
  if (lang === "cn") return cn || en;
  return en || cn;
}

// ─────────────────── Custom node components ───────────────────
const HiddenHandles = (kind) => [
  h(Handle, { type: kind, position: Position.Top,    id: kind === "source" ? "st" : "tt", className: "rf-handle", isConnectable: false, key: kind + "t" }),
  h(Handle, { type: kind, position: Position.Bottom, id: kind === "source" ? "sb" : "tb", className: "rf-handle", isConnectable: false, key: kind + "b" }),
  h(Handle, { type: kind, position: Position.Left,   id: kind === "source" ? "sl" : "tl", className: "rf-handle", isConnectable: false, key: kind + "l" }),
  h(Handle, { type: kind, position: Position.Right,  id: kind === "source" ? "sr" : "tr", className: "rf-handle", isConnectable: false, key: kind + "r" }),
];

function TopicNode({ data }) {
  const { topic, lang, progress } = data;
  // Click is handled at ReactFlow level via onNodeClick; the wrapper here
  // is just visual + accessibility. role/tabIndex make it keyboard-reachable.
  return h("div", {
    className: "rf-topic" + (progress >= 1 ? " done" : ""),
    role: "button",
    tabIndex: 0,
    "data-slug": topic.slug,
    title: topic.name_en,
  },
    ...HiddenHandles("target"),
    ...HiddenHandles("source"),
    h("span", { className: "rf-difficulty", style: { background: DIFF_COLOR[topic.diff] || "#9ca3af" } }),
    h("span", { className: "rf-topic-label" },
      pickLabel(topic.name_en, topic.name_cn, lang)),
    h("span", { className: "rf-progress" },
      h("span", { className: "rf-fill", style: { width: `${Math.round(progress * 100)}%` } })),
  );
}

function GroupBoxNode({ data }) {
  const { group, lang, complete } = data;
  return h("div", { className: "rf-group" + (complete ? " done" : "") },
    ...HiddenHandles("target"),
    ...HiddenHandles("source"),
    h("span", { className: "rf-group-label" },
      pickLabel(group.name_en, group.name_cn, lang)),
  );
}

function RootNode({ data }) {
  const { lang } = data;
  const titleEn = "ECE 449 / CS 446";
  const subEn = "Machine Learning · Final Review";
  const subCn = "机器学习 · 期末复习";
  return h("div", { className: "rf-root" },
    ...HiddenHandles("source"),
    h("strong", null, titleEn),
    h("span", { className: "rf-root-sub" }, pickLabel(subEn, subCn, lang)),
  );
}

const NODE_TYPES = {
  topic:    TopicNode,
  groupBox: GroupBoxNode,
  root:     RootNode,
};

// ─────────────────── Layout builder ───────────────────
function buildLayout({ groups, topics, lang, progress, popupData }) {
  const nodes = [];
  const edges = [];

  // Pre-compute group completion so the "frontier" edges (source group
  // fully done, target group not) render animated + green.
  const groupDone = {};
  for (const g of groups) groupDone[g.id] = groupComplete(g.id, topics, progress, popupData);

  // Root node — centered horizontally above foundations.
  nodes.push({
    id: "root",
    type: "root",
    position: { x: (CANVAS_W - ROOT_W) / 2, y: ROOT_TOP },
    data: { lang },
    draggable: false, selectable: false, focusable: false,
    style: { width: ROOT_W, height: ROOT_H },
  });

  // Each group is hand-placed via GROUP_LAYOUT. Topic cards live as
  // React Flow children of the group (parentId + extent: "parent")
  // so they move with their parent and stay clipped inside.
  let canvasH = 0;
  for (const gid of Object.keys(GROUP_LAYOUT)) {
    const g = groups.find(x => x.id === gid);
    if (!g) continue;
    const layout = GROUP_LAYOUT[gid];
    const items = topics.filter(t => t.group === gid);
    const dim = groupSize(items.length, layout.cols);
    const gFullId = `g-${gid}`;

    nodes.push({
      id: gFullId,
      type: "groupBox",
      position: { x: layout.x, y: layout.y },
      data: { group: g, lang, complete: groupDone[gid] },
      draggable: false, selectable: false, focusable: false,
      style: { width: dim.width, height: dim.height },
    });

    items.forEach((t, k) => {
      const c = k % dim.cols;
      const r = Math.floor(k / dim.cols);
      nodes.push({
        id: t.slug,
        type: "topic",
        parentId: gFullId,
        extent: "parent",
        position: {
          x: PAD_X + c * (CARD_W + CARD_GAP),
          y: PAD_TOP + r * (CARD_H + CARD_GAP),
        },
        data: {
          topic: t,
          lang,
          progress: cardFraction(t.slug, progress, popupData),
        },
        draggable: false, selectable: false, focusable: false,
        style: { width: CARD_W, height: CARD_H },
      });
    });

    const bottom = layout.y + dim.height;
    if (bottom > canvasH) canvasH = bottom;
  }

  // Inter-group edges — beefier than default React Flow strokes so they
  // read at small zoom levels; dashed for analytical (theory) links;
  // animated + green for the user's current learning frontier.
  for (const conn of CONNS) {
    const { from, to, sh, th, dashed } = conn;
    let animated = false;
    if (from === "root") {
      animated = !groupDone["foundations"];
    } else if (from.startsWith("g-") && to.startsWith("g-")) {
      animated = groupDone[from.slice(2)] && !groupDone[to.slice(2)];
    }
    const stroke = animated ? "#10b981" : "#aeb4c0";
    const strokeWidth = animated ? 3.0 : 2.6;
    const style = { stroke, strokeWidth };
    if (dashed) style.strokeDasharray = "7 6";
    edges.push({
      id: `${from}->${to}`,
      source: from,
      target: to,
      sourceHandle: sh || "sb",
      targetHandle: th || "tt",
      type: "smoothstep",
      animated,
      pathOptions: { borderRadius: 24, offset: 24 },
      style,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: stroke,
        width: 20, height: 20,
      },
    });
  }

  return { nodes, edges, width: CANVAS_W, height: canvasH + 60 };
}

// ─────────────────── Confetti on full completion ───────────────────
function useConfettiOnComplete(progress, topics, popupData) {
  const firedRef = useRef(false);
  useEffect(() => {
    if (!topics.length) return;
    let completed = 0;
    for (const t of topics) {
      if (cardFraction(t.slug, progress, popupData) >= 1) completed++;
    }
    const isAll = completed === topics.length;
    if (isAll && !firedRef.current) {
      firedRef.current = true;
      const fire = window.confetti;
      if (typeof fire === "function") {
        fire({
          particleCount: 160, spread: 80, origin: { y: 0.6 },
          colors: ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#a855f7"],
        });
        // Second pop a beat later for a fuller effect.
        setTimeout(() => fire({
          particleCount: 120, spread: 100, origin: { y: 0.5 },
          colors: ["#10b981", "#3b82f6", "#f59e0b"],
        }), 220);
      }
    } else if (!isAll && firedRef.current) {
      firedRef.current = false; // re-arm if user uncompletes anything
    }
  }, [progress, topics, popupData]);
}

// ─────────────────── Hooks ───────────────────
function useLang() {
  const readLang = () => {
    const v = localStorage.getItem("ml_review_lang_v1");
    if (v === "cn" || v === "en") return v;
    if (v === "mixed") localStorage.setItem("ml_review_lang_v1", "en");
    return "en";
  };
  const [lang, setLang] = useState(
    readLang
  );
  useEffect(() => {
    const handler = (e) => {
      if (e.target.closest && e.target.closest(".lang-switch button")) {
        // i18n.js writes the new value first, then we re-read on next tick.
        setTimeout(() => {
          setLang(readLang());
        }, 0);
      }
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);
  return lang;
}
function useProgress() {
  const [progress, setProgress] = useState(() => readProgress());
  useEffect(() => {
    const reload = () => setProgress(readProgress());
    document.addEventListener("ml-progress-loaded", reload);
    document.addEventListener("ml-progress-rerender", reload);
    return () => {
      document.removeEventListener("ml-progress-loaded", reload);
      document.removeEventListener("ml-progress-rerender", reload);
    };
  }, []);
  return progress;
}

// ─────────────────── App ───────────────────
function AtlasInner() {
  const lang = useLang();
  const progress = useProgress();
  const popupData = window.POPUP_DATA || {};
  const groups = window.GROUPS || [];
  const topics = window.TOPICS || [];

  // Click on a topic node → fire popup.js's anchored popover. The popover
  // already does viewport-aware flipping (above/below + left clamp +
  // capped maxHeight) so it stays fully visible no matter where the
  // clicked card sits on screen. Cmd/Ctrl/Shift-click → new tab.
  const onNodeClick = useCallback((event, node) => {
    if (!node || node.type !== "topic") return;
    if (event && (event.metaKey || event.ctrlKey || event.shiftKey)) {
      window.open(`topics/${node.id}.html`, "_blank");
      return;
    }
    // Anchor the popup to the React Flow node wrapper so popup.js can
    // measure its bounding rect; popup.js handles re-positioning on
    // resize/scroll automatically.
    const anchor = (event && event.currentTarget)
      || document.querySelector(`.react-flow__node[data-id="${node.id}"]`)
      || document.querySelector(`.rf-topic[data-slug="${node.id}"]`);
    if (typeof window.openTopicPopup === "function" && anchor) {
      window.openTopicPopup(node.id, anchor);
    }
  }, []);

  useConfettiOnComplete(progress, topics, popupData);

  const { nodes, edges } = useMemo(
    () => buildLayout({ groups, topics, lang, progress, popupData }),
    [lang, progress, groups, topics, popupData]
  );

  // Side-card ring update (the ring lives outside the React tree).
  useEffect(() => {
    let completed = 0;
    for (const t of topics) {
      if (cardFraction(t.slug, progress, popupData) >= 1) completed++;
    }
    const num = document.getElementById("progressNum");
    const totalEl = document.getElementById("progressTotal");
    const circle = document.getElementById("progressCircle");
    if (num)     num.textContent = completed;
    if (totalEl) totalEl.textContent = topics.length;
    if (circle) {
      const C = 2 * Math.PI * 33;
      circle.setAttribute("stroke-dasharray", C.toFixed(2));
      circle.setAttribute(
        "stroke-dashoffset",
        (C * (1 - (topics.length ? completed / topics.length : 0))).toFixed(2)
      );
    }
  }, [progress, topics, popupData]);

  // Re-fit when the shell resizes or the Atlas tab toggles back from
  // display:none. Padding 0.16 leaves comfortable breathing room around
  // the graph at all viewport sizes.
  const rfApi = useReactFlow();
  useEffect(() => {
    const root = document.getElementById("roadmap");
    if (!root || !window.ResizeObserver) return;
    const ro = new ResizeObserver(() => {
      if (root.offsetParent === null) return;
      requestAnimationFrame(() => {
        try { rfApi.fitView({ padding: 0.16, duration: 120 }); }
        catch { /* not ready yet */ }
      });
    });
    ro.observe(root);
    return () => ro.disconnect();
  }, [rfApi]);

  return h("div",
    { className: "atlas-rf-canvas", style: { width: "100%", height: "100%" } },
    h(ReactFlow, {
      nodes, edges, nodeTypes: NODE_TYPES,
      onNodeClick,
      nodesDraggable: false, nodesConnectable: false, elementsSelectable: false,
      fitView: true,
      fitViewOptions: { padding: 0.16, minZoom: 0.25, maxZoom: 1.15 },
      zoomOnScroll: false, zoomOnPinch: true, zoomOnDoubleClick: false,
      panOnScroll: false, panOnDrag: true, preventScrolling: false,
      proOptions: { hideAttribution: true },
      minZoom: 0.2, maxZoom: 1.6,
      defaultEdgeOptions: {
        type: "smoothstep",
        style: { stroke: "#aeb4c0", strokeWidth: 2.6 },
      },
    },
      h(Background, { color: "#e2e8f0", gap: 28, size: 1 }),
    ),
  );
}

function Atlas() {
  return h(ReactFlowProvider, null, h(AtlasInner));
}

// ─────────────────── Mount ───────────────────
export function mountAtlas() {
  const target = document.getElementById("rfMount");
  if (!target) return;
  const root = createRoot(target);
  root.render(h(Atlas));
}

if (typeof window !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountAtlas);
  } else {
    mountAtlas();
  }
}
