// Persists ml_review_progress_v1 to a local file via /api/progress when
// the page is served by serve.py.  Falls back silently when no endpoint
// exists (file://, plain `python3 -m http.server`, GitHub Pages) so the
// site keeps working as before, just per-origin.
//
// This script must load BEFORE anything else that touches localStorage,
// because it monkey-patches setItem / removeItem to fan-out writes.
(function () {
  const KEY      = "ml_review_progress_v1";
  const ENDPOINT = "/api/progress";

  let suppressSync = false;     // true while we apply server data locally
  let serverHere   = null;      // null=unknown, true=available, false=no
  let saveTimer    = 0;

  function readLocal() {
    try { return JSON.parse(localStorage.getItem(KEY) || "{}"); }
    catch { return {}; }
  }

  function writeLocal(data) {
    suppressSync = true;
    try { origSet(KEY, JSON.stringify(data)); }
    finally { suppressSync = false; }
  }

  async function loadFromServer() {
    try {
      const r = await fetch(ENDPOINT, { cache: "no-store" });
      if (!r.ok) { serverHere = false; return; }
      const remote = await r.json();
      serverHere = true;
      if (!remote || typeof remote !== "object") return;
      // Merge — local wins on conflict so a freshly checked box on this
      // tab isn't clobbered by a stale server snapshot.
      const local = readLocal();
      const merged = { ...remote, ...local };
      writeLocal(merged);
      // Tell the rest of the app to re-render.
      document.dispatchEvent(new CustomEvent("ml-progress-loaded", { detail: merged }));
    } catch {
      serverHere = false;
    }
  }

  function debouncedSave() {
    if (serverHere === false) return;          // don't keep retrying on plain http.server
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      try {
        const r = await fetch(ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(readLocal()),
        });
        serverHere = r.ok;
      } catch {
        serverHere = false;
      }
    }, 300);
  }

  // Patch localStorage so any update of our key fans out to the server.
  const origSet    = localStorage.setItem.bind(localStorage);
  const origRemove = localStorage.removeItem.bind(localStorage);
  localStorage.setItem = function (k, v) {
    origSet(k, v);
    if (k === KEY && !suppressSync) debouncedSave();
  };
  localStorage.removeItem = function (k) {
    origRemove(k);
    if (k === KEY && !suppressSync) debouncedSave();
  };

  // Sync when this tab regains focus — picks up changes made elsewhere.
  window.addEventListener("focus", loadFromServer);

  // Kick off the initial pull.  Don't block rendering on it.
  loadFromServer();

  // ── Export / Import (works regardless of the server) ──
  window.MLProgress = window.MLProgress || {};
  window.MLProgress.export = function () {
    const data = readLocal();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `ml-atlas-progress-${stamp}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  window.MLProgress.import = function () {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";
    input.onchange = async () => {
      const file = input.files && input.files[0];
      if (!file) return;
      try {
        const obj = JSON.parse(await file.text());
        if (!obj || typeof obj !== "object") throw new Error("not a json object");
        const merged = { ...readLocal(), ...obj };
        // Setting via the patched setItem also POSTs to the server.
        localStorage.setItem(KEY, JSON.stringify(merged));
        document.dispatchEvent(new CustomEvent("ml-progress-loaded", { detail: merged }));
        // Reload so every UI piece re-reads the merged state cleanly.
        location.reload();
      } catch (e) {
        alert("Couldn't import progress: " + (e && e.message || e));
      }
    };
    input.click();
  };
})();
