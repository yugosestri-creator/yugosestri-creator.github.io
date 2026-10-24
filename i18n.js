/* Yugo – lingue del sito.
   Il sito è scritto in italiano; questo file traduce al volo testi, segnaposto ed etichette
   usando lang/<lingua>.json (chiave = testo italiano, i numeri diventano {0} {1}…, i nomi {x} {y}).
   I messaggi che arrivano al ristorante su Telegram restano in italiano e cinese. */
(function () {
  const LINGUE = [["it", "Italiano"], ["en", "English"], ["fr", "Français"], ["de", "Deutsch"], ["es", "Español"], ["zh", "中文"], ["ja", "日本語"]];
  const LOCALI = { it: "it-IT", en: "en-GB", fr: "fr-FR", de: "de-DE", es: "es-ES", zh: "zh-CN", ja: "ja-JP" };
  const get = () => { try { return localStorage.getItem("yugo-lingua"); } catch { return null; } };
  const set = (l) => { try { localStorage.setItem("yugo-lingua", l); } catch { /* ok */ } };
  let lang = get();
  if (lang && !LOCALI[lang]) lang = null;
  const root = document.documentElement;

  const API = window.YUGO_I18N = {
    lingue: LINGUE,
    get lang() { return lang || "it"; },
    get locale() { return LOCALI[lang || "it"]; },
    scelta: !!lang,
    t: (s) => tr(s) ?? s,
    apri: () => mostraScelta(true)
  };

  /* ---------- dizionario ---------- */
  let D = null, PAT = [];
  const cache = new Map();
  const NUM = /\d+(?:[.,:]\d+)*/g;
  function prepara(dict) {
    D = dict; PAT = [];
    for (const k of Object.keys(dict)) {
      if (!/\{[xy]\}/.test(k)) continue;
      const nomi = [];
      const re = "^" + k.replace(/[.*+?^$()|[\]\\]/g, "\\$&").replace(/\{(x|y)\}|\{\d+\}/g, (m, n) => {
        if (n) { nomi.push(n); return "(.+?)"; }
        return m.replace(/[{}]/g, "\\$&");
      }) + "$";
      PAT.push({ re: new RegExp(re), nomi, out: dict[k], len: k.length });
    }
    PAT.sort((a, b) => b.len - a.len);
  }
  function tr(testo) {
    if (!D) return null;
    if (cache.has(testo)) return cache.get(testo);
    let r = null;
    if (Object.prototype.hasOwnProperty.call(D, testo)) r = D[testo];
    else {
      const nums = [];
      const k = testo.replace(NUM, (m) => `{${nums.push(m) - 1}}`);
      let t = Object.prototype.hasOwnProperty.call(D, k) ? D[k] : null;
      if (t == null) {
        for (const p of PAT) {
          const m = k.match(p.re); if (!m) continue;
          t = p.out;
          p.nomi.forEach((n, i) => {
            const g = m[i + 1].replace(/\{(\d+)\}/g, (_, j) => nums[j]);
            const v = tr(g) ?? g;
            t = t.replace(`{${n}}`, () => v.replace(NUM, (x) => `\u0000${x}\u0000`));
          });
          break;
        }
      }
      if (t != null) r = t.replace(/\{(\d+)\}/g, (_, j) => nums[j] ?? "").replace(/\u0000/g, "");
    }
    if (cache.size > 5000) cache.clear();
    cache.set(testo, r);
    return r;
  }

  /* ---------- traduzione della pagina ---------- */
  const fatti = new WeakMap();   // nodo di testo -> testo tradotto che abbiamo scritto
  const ATTR = ["placeholder", "aria-label", "title", "alt"];
  const salta = (el) => !el || el.closest("script,style,textarea,[translate='no'],.notranslate");
  function testoNodo(n) {
    if (salta(n.parentElement)) return;
    const v = n.nodeValue;
    if (fatti.get(n) === v || !/[A-Za-zÀ-ÿ]/.test(v)) return;
    const m = v.match(/^(\s*)([\s\S]*?)(\s*)$/);
    const chiave = m[2].replace(/\s+/g, " ");
    const t = tr(chiave);
    if (t != null && t !== chiave) { const nuovo = m[1] + t + m[3]; fatti.set(n, nuovo); n.nodeValue = nuovo; }
  }
  const attrFatti = new WeakMap();
  function attrEl(el) {
    if (!el || el.closest("[translate='no'],.notranslate")) return;
    let mem = attrFatti.get(el); if (!mem) { mem = {}; attrFatti.set(el, mem); }
    for (const a of ATTR) {
      if (!el.hasAttribute(a)) continue;
      const v = el.getAttribute(a);
      if (mem[a] === v) continue;
      const t = tr(v.replace(/\s+/g, " ").trim());
      if (t != null && t !== v) { mem[a] = t; el.setAttribute(a, t); }
    }
  }
  function passa(nodo) {
    if (!D || !nodo) return;
    if (nodo.nodeType === 3) return testoNodo(nodo);
    if (nodo.nodeType !== 1 && nodo.nodeType !== 9) return;
    const w = document.createTreeWalker(nodo, NodeFilter.SHOW_TEXT);
    let n; while ((n = w.nextNode())) testoNodo(n);
    if (nodo.nodeType === 1) attrEl(nodo);
    (nodo.querySelectorAll ? nodo.querySelectorAll("[placeholder],[aria-label],[title],[alt]") : []).forEach(attrEl);
  }
  const obs = new MutationObserver((list) => {
    for (const m of list) {
      if (m.type === "characterData") testoNodo(m.target);
      else if (m.type === "attributes") attrEl(m.target);
      else m.addedNodes.forEach(passa);
    }
  });
  function avvia() {
    passa(document.body);
    obs.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTR });
    root.classList.remove("i18n-wait");
  }

  async function carica(l) {
    root.lang = l;
    if (l === "it") { root.classList.remove("i18n-wait"); return; }
    root.classList.add("i18n-wait");
    const fine = setTimeout(() => root.classList.remove("i18n-wait"), 2500);
    try {
      const v = (document.querySelector('script[src*="i18n.js"]') || {}).src || "";
      const ver = (v.match(/\?v=(\w+)/) || [])[1] || "";
      const [k, t] = await Promise.all([`lang/chiavi.json?v=${ver}`, `lang/${l}.json?v=${ver}`].map((u) => fetch(u).then((r) => r.json())));
      const dict = {}; k.forEach((x, i) => { if (t[i] != null) dict[x] = t[i]; });
      prepara(dict);
    } catch { /* senza dizionario resta in italiano */ }
    clearTimeout(fine);
    const go = () => avvia();
    if (document.body) go(); else document.addEventListener("DOMContentLoaded", go, { once: true });
  }

  /* ---------- scelta della lingua ---------- */
  function mostraScelta(cambio) {
    if (document.getElementById("lang-pick")) return;
    const d = document.createElement("div");
    d.id = "lang-pick"; d.className = "lang-pick"; d.setAttribute("translate", "no");
    d.setAttribute("role", "dialog"); d.setAttribute("aria-modal", "true"); d.setAttribute("aria-label", "Lingua · Language");
    d.innerHTML = `<div class="lang-card">
        <img src="logo-word.webp" alt="Yugo" class="lang-logo" width="160" height="66">
        <p class="lang-title">Scegli la lingua · Choose your language</p>
        <div class="lang-grid">${LINGUE.map(([c, n]) => `<button type="button" data-l="${c}" class="${c === (lang || "") ? "on" : ""}"><b>${n}</b><small>${c.toUpperCase()}</small></button>`).join("")}</div>
        ${cambio ? `<button type="button" class="lang-x" data-x aria-label="Chiudi · Close">×</button>` : ""}
      </div>`;
    d.addEventListener("click", (e) => {
      if (e.target.closest("[data-x]") || e.target === d) { if (cambio) d.remove(); return; }
      const b = e.target.closest("[data-l]"); if (!b) return;
      const nuova = b.dataset.l, prima = lang;
      set(nuova); lang = nuova; API.scelta = true;
      if (prima && prima !== nuova) { location.reload(); return; }
      d.classList.add("out"); setTimeout(() => d.remove(), 350);
      etichetta(); carica(nuova);
      document.dispatchEvent(new CustomEvent("yugo-lingua", { detail: nuova }));
    });
    (document.body || root).appendChild(d);
  }
  function etichetta() {
    let b = document.getElementById("lang-btn");
    const bar = document.querySelector(".topbar");
    if (!bar) return;
    if (!b) {
      b = document.createElement("button");
      b.id = "lang-btn"; b.type = "button"; b.className = "lang-btn"; b.setAttribute("translate", "no");
      b.setAttribute("aria-label", "Lingua · Language");
      b.addEventListener("click", () => mostraScelta(true));
      const cta = bar.querySelector(".topbar-cta");
      bar.insertBefore(b, cta);
    }
    b.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3Z"/></svg>${(lang || "it").toUpperCase()}`;
  }

  carica(lang || "it");
  const pronto = () => { etichetta(); if (!lang) mostraScelta(false); };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", pronto, { once: true }); else pronto();
})();
