/* Yugo – animazioni ed effetti. Si spengono da sole se il telefono ha "Riduci movimento" attivo. */
(() => {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const root = document.documentElement;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const GOLD = "#C9A55A", GOLD_HI = "#E2C27C";

  root.classList.add("fx");
  if (reduce) root.classList.add("fx-still");

  /* ---------- 1. Intro: il logo si accende in oro ---------- */
  function intro() {
    let seen = false;
    try { seen = sessionStorage.getItem("yugo-intro") === "1"; sessionStorage.setItem("yugo-intro", "1"); } catch { /* ok */ }
    const logo = $(".hero-logo img");
    if (seen || reduce || !logo) return;
    const el = document.createElement("div");
    el.className = "fx-intro";
    el.innerHTML = `<div class="fx-intro-logo"><img src="${logo.src}" alt=""><span class="fx-intro-line"></span></div>`;
    document.body.appendChild(el);
    setTimeout(() => el.classList.add("out"), 1500);
    setTimeout(() => el.remove(), 2300);
  }

  /* ---------- 2. Onde di puntini dorati che si muovono + scintille ---------- */
  const waves = { c: null, g: null, w: 0, h: 0, t: 0, sparks: [], raf: 0, visible: true, mx: 0, my: 0 };
  function wavesResize() {
    const c = $("#waves"); if (!c) return;
    const r = c.getBoundingClientRect(); if (!r.width) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = r.width * dpr; c.height = r.height * dpr;
    waves.c = c; waves.g = c.getContext("2d"); waves.g.setTransform(dpr, 0, 0, dpr, 0, 0);
    waves.w = r.width; waves.h = r.height;
    if (!waves.sparks.length) for (let i = 0; i < 26; i++) waves.sparks.push(newSpark(true));
    if (reduce) drawWaves(0);
  }
  function newSpark(anywhere) {
    return { x: Math.random() * (waves.w || 360), y: anywhere ? Math.random() * (waves.h || 400) : (waves.h || 400) + 10,
      r: 0.6 + Math.random() * 1.6, v: 0.15 + Math.random() * 0.45, ph: Math.random() * 6.28, a: 0.25 + Math.random() * 0.6 };
  }
  function drawWaves(t) {
    const { g, w, h } = waves; if (!g) return;
    g.clearRect(0, 0, w, h);
    const lines = 18;
    for (let k = 0; k < lines; k++) {
      const p = k / (lines - 1);
      for (let x = -10; x < w + 10; x += 7) {
        const u = x / w;
        const y = h * (0.6 + 0.3 * p)
          + Math.sin(u * 5.2 + p * 2.4 + t * 0.0009) * (16 + 24 * p)
          + Math.sin(u * 11 - t * 0.0013 + k) * 3
          - u * h * 0.18 + waves.my * 10 * (p - 0.5);
        const wave = 0.5 + 0.5 * Math.sin(u * 9 - t * 0.002 + p * 4);
        g.globalAlpha = (0.12 + 0.45 * wave) * (0.5 + 0.5 * (1 - Math.abs(p - 0.5) * 2));
        g.fillStyle = wave > 0.85 ? GOLD_HI : GOLD;
        g.beginPath(); g.arc(x + waves.mx * 8 * p, y, 1 + wave * 0.6, 0, 6.283); g.fill();
      }
    }
    waves.sparks.forEach((s, i) => {
      s.y -= s.v; s.x += Math.sin(t * 0.001 + s.ph) * 0.2;
      if (s.y < -10) waves.sparks[i] = newSpark(false);
      const tw = 0.5 + 0.5 * Math.sin(t * 0.004 + s.ph);
      g.globalAlpha = s.a * tw; g.fillStyle = GOLD_HI;
      g.beginPath(); g.arc(s.x, s.y, s.r, 0, 6.283); g.fill();
      if (s.r > 1.6 && tw > 0.8) { g.globalAlpha = s.a * 0.25; g.beginPath(); g.arc(s.x, s.y, s.r * 3.5, 0, 6.283); g.fill(); }
    });
    g.globalAlpha = 1;
  }
  function loop(t) {
    if (waves.visible && !document.hidden && waves.c && !waves.c.closest("[hidden]")) drawWaves(t);
    waves.raf = requestAnimationFrame(loop);
  }

  /* ---------- 3. Movimento del logo col dito / mouse e col telefono ---------- */
  function tilt() {
    const hero = $(".hero"); if (!hero || reduce) return;
    const set = (x, y) => { waves.mx = x; waves.my = y; hero.style.setProperty("--tx", x.toFixed(3)); hero.style.setProperty("--ty", y.toFixed(3)); };
    hero.addEventListener("pointermove", (e) => { const r = hero.getBoundingClientRect(); set((e.clientX - r.left) / r.width - 0.5, (e.clientY - r.top) / r.height - 0.5); });
    hero.addEventListener("pointerleave", () => set(0, 0));
    window.addEventListener("deviceorientation", (e) => { if (e.gamma == null) return; set(Math.max(-0.5, Math.min(0.5, e.gamma / 40)), Math.max(-0.5, Math.min(0.5, (e.beta - 45) / 60))); });
  }

  /* ---------- 4. Comparsa degli elementi mentre scorri ---------- */
  const REVEAL = ".block, .formula, .dish, .menu-cat h2, .card, .ticket, .bitem, .view-head, .notice, .hours dt, .hours dd, .chip";
  let io = null;
  function reveal(scope = document) {
    const els = $$(REVEAL, scope).filter((el) => !el.classList.contains("fx-r"));
    if (reduce || !("IntersectionObserver" in window)) { els.forEach((el) => el.classList.add("fx-r", "fx-in")); return; }
    if (!io) io = new IntersectionObserver((entries) => entries.forEach((en) => {
      if (en.isIntersecting) { en.target.classList.add("fx-in"); io.unobserve(en.target); }
    }), { rootMargin: "0px 0px -6% 0px", threshold: 0.05 });
    const groups = new Map();
    els.forEach((el) => {
      const parent = el.parentElement; const n = groups.get(parent) || 0; groups.set(parent, n + 1);
      el.style.setProperty("--d", Math.min(n, 10) * 55 + "ms");
      el.classList.add("fx-r"); io.observe(el);
    });
    // sicurezza: dopo 1,5 s tutto è comunque visibile
    setTimeout(() => els.forEach((el) => el.classList.add("fx-in")), 1500);
  }

  /* ---------- 5. Prezzi che contano fino al valore ---------- */
  function countUp(scope = document) {
    $$(".f-price", scope).forEach((el) => {
      if (el.dataset.fx || reduce) return; el.dataset.fx = "1";
      const m = el.textContent.match(/([\d.]+),(\d{2})/); if (!m) return;
      const target = parseFloat(m[1].replace(/\./g, "") + "." + m[2]);
      const run = () => {
        const t0 = performance.now(), dur = 1100;
        const step = (t) => {
          const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
          el.textContent = "€ " + (target * e).toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      };
      if ("IntersectionObserver" in window) {
        const o = new IntersectionObserver((en) => { if (en[0].isIntersecting) { run(); o.disconnect(); } }, { threshold: 0.6 });
        o.observe(el);
      } else run();
    });
  }

  /* ---------- 6. Onda al tocco su pulsanti e chip ---------- */
  document.addEventListener("pointerdown", (e) => {
    const b = e.target.closest(".btn, .chip, .tab, .tabs2 button, .stepper button, .topbar-cta");
    if (!b || reduce) return;
    const r = b.getBoundingClientRect();
    const s = document.createElement("span");
    s.className = "fx-ripple";
    const size = Math.max(r.width, r.height) * 2.2;
    s.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - r.left - size / 2}px;top:${e.clientY - r.top - size / 2}px`;
    b.appendChild(s);
    setTimeout(() => s.remove(), 650);
    if (navigator.vibrate) try { navigator.vibrate(8); } catch { /* ok */ }
  });

  /* ---------- 7. Luce dorata che segue il dito sulle schede ---------- */
  document.addEventListener("pointermove", (e) => {
    const card = e.target.closest(".block, .card, .ticket, .bitem"); if (!card) return;
    const r = card.getBoundingClientRect();
    card.style.setProperty("--gx", e.clientX - r.left + "px");
    card.style.setProperty("--gy", e.clientY - r.top + "px");
  }, { passive: true });

  /* ---------- 8. Barra in alto che si rimpicciolisce + filo d'oro di avanzamento ---------- */
  function scrollFx() {
    const bar = document.createElement("div"); bar.className = "fx-progress"; $(".topbar")?.appendChild(bar);
    let ticking = false;
    const on = () => {
      const y = window.scrollY, max = document.documentElement.scrollHeight - innerHeight;
      root.classList.toggle("fx-scrolled", y > 24);
      bar.style.transform = `scaleX(${max > 0 ? Math.min(1, y / max) : 0})`;
      const photo = $(".block-photo .photo");
      if (photo && !reduce) { const r = photo.getBoundingClientRect(); photo.style.setProperty("--py", ((r.top + r.height / 2 - innerHeight / 2) * -0.06).toFixed(1) + "px"); }
      const hero = $(".hero"); if (hero && !reduce) hero.style.setProperty("--sy", Math.min(1, y / 400).toFixed(3));
      ticking = false;
    };
    window.addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(on); } }, { passive: true });
    on();
  }

  /* ---------- 9. Cambio pagina animato + indicatore della scheda ---------- */
  function views() {
    const tabbar = $(".tabbar");
    const ind = document.createElement("span"); ind.className = "fx-tab-ind"; tabbar?.appendChild(ind);
    const placeInd = () => {
      const a = $('.tab[aria-current="page"]'); if (!a || !tabbar) return;
      const r = a.getBoundingClientRect(), tr = tabbar.getBoundingClientRect();
      ind.style.transform = `translateX(${r.left - tr.left + r.width / 2 - 3}px)`; ind.style.opacity = 1;
    };
    $$(".view").forEach((v) => new MutationObserver(() => {
      if (!v.hidden) {
        v.classList.remove("fx-enter"); void v.offsetWidth; v.classList.add("fx-enter");
        reveal(v); countUp(v); placeInd();
        if (v.id === "view-home") { wavesResize(); }
      }
    }).observe(v, { attributes: true, attributeFilter: ["hidden"] }));
    new MutationObserver(placeInd).observe(tabbar, { subtree: true, attributes: true, attributeFilter: ["aria-current"] });
    window.addEventListener("resize", placeInd);
    setTimeout(placeInd, 50);
  }

  /* ---------- 10. Contenuti nuovi (menu, prenotazione, account) ---------- */
  function watchContent() {
    ["#menu-list", "#book-area", "#account-area", "#home-formule", "#menu-chips"].forEach((sel) => {
      const el = $(sel); if (!el) return;
      new MutationObserver(() => { reveal(el); countUp(el); if (sel === "#book-area" && $(".ticket", el)) celebrate($(".ticket", el)); })
        .observe(el, { childList: true, subtree: true });
    });
    // numero di persone che "salta" quando cambia
    document.addEventListener("click", (e) => {
      if (!e.target.closest("#b-plus, #b-minus")) return;
      const o = $("#b-persone"); if (!o) return;
      o.classList.remove("fx-bump"); void o.offsetWidth; o.classList.add("fx-bump");
    });
  }

  /* ---------- 11. Festa dorata quando la prenotazione è inviata ---------- */
  function celebrate(ticket) {
    if (ticket.dataset.fx) return; ticket.dataset.fx = "1";
    ticket.classList.add("fx-stamp");
    if (reduce) return;
    const c = document.createElement("canvas"); c.className = "fx-confetti"; document.body.appendChild(c);
    const dpr = Math.min(2, devicePixelRatio || 1); c.width = innerWidth * dpr; c.height = innerHeight * dpr;
    const g = c.getContext("2d"); g.scale(dpr, dpr);
    const r = ticket.getBoundingClientRect(); const ox = r.left + r.width / 2, oy = r.top + 40;
    const colors = [GOLD, GOLD_HI, "#F5E3B5", "#FFFFFF", "#8C6E2F"];
    const parts = Array.from({ length: 140 }, () => {
      const a = Math.random() * Math.PI * 2, sp = 3 + Math.random() * 8;
      return { x: ox, y: oy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 5, s: 3 + Math.random() * 5, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4, c: colors[(Math.random() * colors.length) | 0], round: Math.random() > 0.6 };
    });
    const t0 = performance.now();
    const step = (t) => {
      const el = t - t0; g.clearRect(0, 0, innerWidth, innerHeight);
      parts.forEach((p) => {
        p.vy += 0.22; p.vx *= 0.985; p.x += p.vx; p.y += p.vy; p.rot += p.vr;
        g.save(); g.globalAlpha = Math.max(0, 1 - el / 2400); g.translate(p.x, p.y); g.rotate(p.rot); g.fillStyle = p.c;
        if (p.round) { g.beginPath(); g.arc(0, 0, p.s / 2, 0, 6.283); g.fill(); } else g.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
        g.restore();
      });
      if (el < 2400) requestAnimationFrame(step); else c.remove();
    };
    requestAnimationFrame(step);
    if (navigator.vibrate) try { navigator.vibrate([20, 40, 30]); } catch { /* ok */ }
  }

  /* ---------- 12. Riflesso dorato che passa sul logo ---------- */
  function sheen() {
    const img = $(".hero-logo img"); if (!img) return;
    const wrap = img.parentElement;
    wrap.style.setProperty("--logo", `url("${img.src}")`);
    wrap.classList.add("fx-sheen");
  }

  function start() {
    intro(); sheen(); tilt(); scrollFx(); views(); watchContent();
    wavesResize(); reveal(); countUp();
    window.addEventListener("resize", () => { clearTimeout(start.t); start.t = setTimeout(wavesResize, 150); });
    const hero = $(".hero");
    if (hero && "IntersectionObserver" in window) new IntersectionObserver((en) => { waves.visible = en[0].isIntersecting; }).observe(hero);
    if (!reduce) waves.raf = requestAnimationFrame(loop);
    window.YugoFX = { resize: wavesResize };
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
