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
    el.innerHTML = `<div class="fx-intro-logo"><img src="${logo.src}" alt=""><span class="fx-intro-line"></span>${SVG_BACCHETTE}</div>`;
    document.body.appendChild(el);
    setTimeout(() => el.classList.add("out"), 2000);
    setTimeout(() => el.remove(), 2800);
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

  /* ---------- 11. Festa dorata quando la prenotazione è inviata: coriandoli + il sushi che salta ---------- */
  function burst(ox, oy, opt = {}) {
    if (reduce) return;
    const n = opt.n || 140, dur = opt.dur || 2400, grav = opt.grav ?? 0.22, speed = opt.speed || 8;
    const c = document.createElement("canvas"); c.className = "fx-confetti"; document.body.appendChild(c);
    const dpr = Math.min(2, devicePixelRatio || 1); c.width = innerWidth * dpr; c.height = innerHeight * dpr;
    const g = c.getContext("2d"); g.scale(dpr, dpr);
    const colors = opt.colors || [GOLD, GOLD_HI, "#F5E3B5", "#FFFFFF", "#8C6E2F"];
    const parts = Array.from({ length: n }, () => {
      const a = Math.random() * Math.PI * 2, sp = (opt.ring ? 0.75 + Math.random() * 0.25 : 0.35 + Math.random() * 0.65) * speed;
      return { x: ox, y: oy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (opt.lift ?? 5), s: (opt.size || 5) * (0.6 + Math.random() * 0.8), rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4, c: colors[(Math.random() * colors.length) | 0], round: opt.ring || Math.random() > 0.6 };
    });
    const t0 = performance.now();
    const step = (t) => {
      const el = t - t0; g.clearRect(0, 0, innerWidth, innerHeight);
      parts.forEach((p) => {
        p.vy += grav; p.vx *= 0.985; p.vy *= opt.ring ? 0.97 : 1; p.x += p.vx; p.y += p.vy; p.rot += p.vr;
        g.save(); g.globalAlpha = Math.max(0, 1 - el / dur); g.translate(p.x, p.y); g.rotate(p.rot); g.fillStyle = p.c;
        if (p.round) { g.beginPath(); g.arc(0, 0, p.s / 2, 0, 6.283); g.fill(); } else g.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
        g.restore();
      });
      if (el < dur) requestAnimationFrame(step); else c.remove();
    };
    requestAnimationFrame(step);
  }
  function celebrate(ticket) {
    if (ticket.dataset.fx) return; ticket.dataset.fx = "1";
    ticket.classList.add("fx-stamp");
    const m = document.createElement("div"); m.className = "fx-mascot"; m.innerHTML = SVG_NIGIRI;
    ticket.prepend(m);
    if (reduce) return;
    const r = ticket.getBoundingClientRect();
    burst(r.left + r.width / 2, r.top + 40);
    if (navigator.vibrate) try { navigator.vibrate([20, 40, 30]); } catch { /* ok */ }
  }

  /* ---------- 13. Disegni usati dalle animazioni ---------- */
  const SVG_NIGIRI = `<svg viewBox="0 0 90 70" width="90" height="70" aria-hidden="true"><ellipse class="m-shadow" cx="45" cy="66" rx="26" ry="3.5" fill="#000" opacity=".25"></ellipse><g class="m-body"><rect x="14" y="28" width="62" height="34" rx="16" fill="#FBF7EE"></rect><path d="M12 32c4-14 18-20 33-20s29 6 33 20c-6 5-18 6-33 6s-27-1-33-6Z" fill="#FF8552"></path><path d="M24 20c4 4 6 10 5 16M40 14c3 5 4 13 2 22M56 15c2 6 2 14 0 21M68 21c0 5-1 10-3 14" stroke="#FFD2BC" stroke-width="2.6" fill="none" stroke-linecap="round"></path><circle cx="35" cy="46" r="3.2" fill="#1B1B2F"></circle><g class="m-wink"><circle cx="55" cy="46" r="3.2" fill="#1B1B2F"></circle></g><path d="M40 52q5 5 10 0" stroke="#1B1B2F" stroke-width="2.2" fill="none" stroke-linecap="round"></path><circle cx="27" cy="51" r="3.6" fill="#FF9AA2" opacity=".55"></circle><circle cx="63" cy="51" r="3.6" fill="#FF9AA2" opacity=".55"></circle></g></svg>`;
  const SVG_SCOOTER = `<svg class="fx-ride" viewBox="0 0 220 60" width="220" height="60" aria-hidden="true"><line x1="0" y1="55.5" x2="220" y2="55.5" stroke="currentColor" stroke-opacity=".2"></line><g class="r-dust" fill="currentColor" opacity=".35"><circle cx="18" cy="50" r="2.5"></circle><circle cx="10" cy="46" r="1.8"></circle><circle cx="4" cy="51" r="1.4"></circle></g><g class="r-moto"><circle cx="30" cy="49" r="6" fill="#1F2937"></circle><circle cx="30" cy="49" r="2.3" fill="#9CA3AF"></circle><circle cx="64" cy="49" r="6" fill="#1F2937"></circle><circle cx="64" cy="49" r="2.3" fill="#9CA3AF"></circle><path d="M26 44h30l6-12h5l-4 15H30Z" fill="#D94A38"></path><path d="M62 32l-4-10h-4" stroke="#374151" stroke-width="2.4" fill="none" stroke-linecap="round"></path><g class="r-bag"><rect x="20" y="18" width="18" height="17" rx="2.5" fill="#C9A55A"></rect><path d="M24 26h10" stroke="#03132D" stroke-width="1.8" stroke-linecap="round"></path></g><path d="M44 42l3-14" stroke="#1E3A8A" stroke-width="5" stroke-linecap="round"></path><rect x="41" y="17" width="9" height="13" rx="3.5" fill="#E2C27C"></rect><path d="M49 22l7 2" stroke="#F1C9A5" stroke-width="2.4" stroke-linecap="round"></path><circle cx="46" cy="12" r="5" fill="#F1C9A5"></circle><path d="M40.5 12a5.5 5.5 0 0 1 11 0Z" fill="#D94A38"></path></g></svg>`;
  const SVG_BACCHETTE = `<svg class="fx-chop" viewBox="0 0 120 70" width="120" height="70" aria-hidden="true"><ellipse cx="60" cy="66" rx="26" ry="3" fill="#000" opacity=".3"></ellipse><g class="c-sushi"><rect x="40" y="44" width="40" height="20" rx="9" fill="#FBF7EE"></rect><path d="M38 47c3-8 11-11 22-11s19 3 22 11c-4 3-12 4-22 4s-18-1-22-4Z" fill="#FF8552"></path><path d="M50 40c2 3 3 6 2 9M62 38c2 3 2 7 1 11M72 41c0 3-1 5-2 7" stroke="#FFD2BC" stroke-width="2" fill="none" stroke-linecap="round"></path></g><g class="c-stick c-a"><path d="M116 2 50 44" stroke="#C9A55A" stroke-width="3.6" stroke-linecap="round"></path></g><g class="c-stick c-b"><path d="M118 10 72 46" stroke="#E2C27C" stroke-width="3.6" stroke-linecap="round"></path></g></svg>`;
  const SVG_DORME = `<svg class="fx-sleep" viewBox="0 0 120 70" width="120" height="70" aria-hidden="true"><g class="s-z" fill="var(--gold-hi)" font-family="system-ui,sans-serif" font-weight="800"><text class="z1" x="70" y="26" font-size="10">z</text><text class="z2" x="78" y="18" font-size="13">z</text><text class="z3" x="88" y="10" font-size="16">Z</text></g><g class="s-man"><path d="M36 40h34a6 6 0 0 1 6 6v6H30v-6a6 6 0 0 1 6-6Z" fill="#E5E7EB"></path><ellipse cx="54" cy="38" rx="12" ry="9" fill="#F1C9A5"></ellipse><path d="M46 37q3 2 6 0M57 37q3 2 6 0" stroke="#1B1B2F" stroke-width="1.6" fill="none" stroke-linecap="round"></path><path d="M51 43q3 1.5 6 0" stroke="#1B1B2F" stroke-width="1.4" fill="none" stroke-linecap="round"></path><path d="M42 31c-3-10 6-16 12-12 6-4 15 2 12 12Z" fill="#FFFFFF"></path><rect x="42" y="29" width="24" height="4" rx="2" fill="#F3F4F6"></rect></g><rect x="10" y="52" width="100" height="8" rx="2" fill="#8C6E2F"></rect><rect x="10" y="60" width="100" height="6" fill="#5C4618"></rect><g transform="translate(90 40)"><rect x="0" y="4" width="10" height="8" rx="2" fill="#FBF7EE"></rect><path d="M-1 6c1-4 4-5 6-5s5 1 6 5Z" fill="#FF8552"></path></g></svg>`;

  /* ---------- 14. Ordine inviato: lo scooter parte con il sacchetto ---------- */
  function ordineInviato(box) {
    if (box.dataset.fx) return; box.dataset.fx = "1";
    const wrap = document.createElement("div"); wrap.className = "fx-ride-wrap"; wrap.innerHTML = SVG_SCOOTER;
    box.prepend(wrap);
    if (reduce) return;
    box.classList.add("fx-ord");
    setTimeout(() => { const ck = $(".ord-check", box); if (ck) { const r = ck.getBoundingClientRect(); burst(r.left + r.width / 2, r.top + r.height / 2, { n: 70, dur: 1600, speed: 7, lift: 3 }); } }, 2300);
  }

  /* ---------- 15. Coupon vinto: la carta si gira e piovono coriandoli ---------- */
  function couponNuovo(c) {
    if (c.dataset.fx) return; c.dataset.fx = "1";
    if (reduce) return;
    c.classList.remove("fx-stamp"); c.classList.add("fx-flip");
    setTimeout(() => {
      const r = c.getBoundingClientRect();
      burst(r.left + r.width / 2, r.top + r.height / 3, { n: 120, dur: 2600, speed: 9 });
      if (navigator.vibrate) try { navigator.vibrate([30, 50, 30]); } catch { /* ok */ }
    }, 650);
  }

  /* ---------- 16. Barra degli amici piena: fuochi d'artificio ---------- */
  function barraPiena(bar) {
    if (bar.dataset.fx) return; bar.dataset.fx = "1";
    if (reduce) return;
    const r = bar.getBoundingClientRect(); if (!r.width) return;
    const fuochi = [[0.25, 0], [0.75, 300], [0.5, 650]];
    fuochi.forEach(([x, t], i) => setTimeout(() => burst(r.left + r.width * x, Math.max(40, r.top - 60 - i * 15), {
      n: 60, dur: 1500, speed: 4.5, grav: 0.05, lift: 0, ring: true, size: 4,
      colors: i === 1 ? ["#FF8552", "#FFD2BC", GOLD_HI] : [GOLD, GOLD_HI, "#FFFFFF"] }), 1200 + t));
  }

  /* ---------- 17. Piatto che vola nel carrello quando tocchi + ---------- */
  function volaNelCarrello() {
    document.addEventListener("click", (e) => {
      const b = e.target.closest('#menu-list [data-d="1"]'); if (!b || reduce) return;
      const bar = $("#cart-bar"), txt = $("#cart-bar-txt");
      const prima = bar && !bar.hidden ? (txt && txt.textContent) : null;
      const r = b.getBoundingClientRect();
      setTimeout(() => {
        if (!bar || bar.hidden || (txt && txt.textContent === prima)) return; // non è stato aggiunto (es. menu pieno)
        const t = bar.getBoundingClientRect();
        const el = document.createElement("div"); el.className = "fx-fly"; el.innerHTML = SVG_NIGIRI;
        document.body.appendChild(el);
        const x0 = r.left + r.width / 2 - 18, y0 = r.top + r.height / 2 - 14, x1 = t.left + 28 - 18, y1 = t.top + t.height / 2 - 14;
        const a = el.animate([
          { transform: `translate(${x0}px, ${y0}px) scale(.6)`, opacity: 0 },
          { transform: `translate(${(x0 + x1) / 2}px, ${Math.min(y0, y1) - 90}px) scale(1) rotate(-12deg)`, opacity: 1, offset: 0.45 },
          { transform: `translate(${x1}px, ${y1}px) scale(.35) rotate(8deg)`, opacity: 0.9 }
        ], { duration: 750, easing: "cubic-bezier(.4,0,.2,1)" });
        a.onfinish = () => { el.remove(); bar.classList.remove("fx-cart-bump"); void bar.offsetWidth; bar.classList.add("fx-cart-bump"); };
      }, 30);
    }, true);
  }

  /* ---------- 18. Giorno di chiusura: il cuoco dorme sul bancone ---------- */
  function giornoChiuso() {
    const cfg = (window.YUGO_CONFIG || {}).ristorante || {};
    const giorni = cfg.giorniChiusi || [];
    let oggi = new Date().getDay();
    try { oggi = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Rome", weekday: "short" }).format(new Date())); } catch { /* ok */ }
    if (!giorni.includes(oggi) && !/[?&]fxchiuso\b/.test(location.search)) return;
    const hours = $("#home-hours"); if (!hours || $(".fx-closed")) return;
    const d = document.createElement("div"); d.className = "fx-closed"; d.setAttribute("role", "status");
    d.innerHTML = `${SVG_DORME}<div><b>Oggi siamo chiusi, il cuoco si riposa</b><span>Ci vediamo domani! Puoi già prenotare o ordinare per i prossimi giorni.</span></div>`;
    hours.before(d);
  }

  /* ---------- 19. Osserva la pagina per far partire le animazioni nuove ---------- */
  function watchFx() {
    let pend = false;
    const scan = () => {
      pend = false;
      $$(".ord-ok:not([data-fx])").forEach(ordineInviato);
      $$(".coupon.fx-stamp:not([data-fx])").forEach(couponNuovo);
      $$("#invite-area .bar.full:not([data-fx])").forEach(barraPiena);
    };
    new MutationObserver(() => { if (!pend) { pend = true; requestAnimationFrame(scan); } }).observe(document.body, { childList: true, subtree: true });
    scan();
  }

  /* ---------- 12. Riflesso dorato che passa sul logo ---------- */
  function sheen() {
    const img = $(".hero-logo img"); if (!img) return;
    const wrap = img.parentElement;
    wrap.style.setProperty("--logo", `url("${img.src}")`);
    wrap.classList.add("fx-sheen");
  }

  function start() {
    intro(); sheen(); tilt(); scrollFx(); views(); watchContent(); watchFx(); volaNelCarrello(); giornoChiuso();
    wavesResize(); reveal(); countUp();
    window.addEventListener("resize", () => { clearTimeout(start.t); start.t = setTimeout(wavesResize, 150); });
    const hero = $(".hero");
    if (hero && "IntersectionObserver" in window) new IntersectionObserver((en) => { waves.visible = en[0].isIntersecting; }).observe(hero);
    if (!reduce) waves.raf = requestAnimationFrame(loop);
    window.YugoFX = { resize: wavesResize };
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
