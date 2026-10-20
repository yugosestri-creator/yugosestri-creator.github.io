/* Yugo – logica del sito. Non serve modificare questo file: si configura da config.js */

const CFG = window.YUGO_CONFIG || {};
const R = CFG.ristorante || {};
const DEMO = !(CFG.firebase && CFG.firebase.apiKey);
const FIREBASE_VERSION = "10.12.2";

const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const euro = (n) => typeof n === "number" ? n.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : esc(n);
const pad = (n) => String(n).padStart(2, "0");
const isoDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseISO = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const toMin = (hhmm) => { const [h, m] = hhmm.split(":").map(Number); return h * 60 + m; };
const fromMin = (m) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
const fmtLongDate = (s) => parseISO(s).toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" });
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const nowStamp = () => { const d = new Date(); return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} alle ${pad(d.getHours())}:${pad(d.getMinutes())}`; };

const store = {
  get(k, fallback) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fallback; } catch { return fallback; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage non disponibile */ } }
};

let backend = null;
let user = undefined; // undefined = non so ancora se è connesso
let lastBooking = null;

/* ------------------------------------------------------------------ */
/* Backend DEMO: tutto resta nel browser, niente viene inviato          */
/* ------------------------------------------------------------------ */
function demoBackend() {
  const mem = { users: store.get("yugo-demo-users", {}), session: store.get("yugo-demo-session", null), bookings: store.get("yugo-demo-bookings", []) };
  const listeners = [];
  const emit = () => { const u = mem.session && mem.users[mem.session] ? { uid: mem.session, email: mem.session, nome: mem.users[mem.session].nome, verified: true } : null; listeners.forEach((cb) => cb(u)); return u; };
  const fail = (code) => { const e = new Error(code); e.code = code; throw e; };
  return {
    onUser(cb) { listeners.push(cb); setTimeout(emit, 0); },
    async register(nome, email, pw) {
      email = email.toLowerCase();
      if (mem.users[email]) fail("auth/email-already-in-use");
      if (pw.length < 6) fail("auth/weak-password");
      mem.users[email] = { nome, pw }; mem.session = email;
      store.set("yugo-demo-users", mem.users); store.set("yugo-demo-session", email);
      return emit();
    },
    async login(email, pw) {
      email = email.toLowerCase();
      if (!mem.users[email] || mem.users[email].pw !== pw) fail("auth/invalid-credential");
      mem.session = email; store.set("yugo-demo-session", email); return emit();
    },
    async logout() { mem.session = null; store.set("yugo-demo-session", null); emit(); },
    async reset() { /* in demo non parte nessuna email */ },
    async resend() {},
    async reload() { return emit(); },
    async token() { return "demo"; },
    async save(b) { const id = "demo-" + Date.now(); mem.bookings.push({ id, ...b }); store.set("yugo-demo-bookings", mem.bookings); return id; },
    async mine(uid) { return mem.bookings.filter((b) => b.uid === uid); }
  };
}

/* ------------------------------------------------------------------ */
/* Backend FIREBASE: account con email + prenotazioni su Firestore      */
/* ------------------------------------------------------------------ */
async function firebaseBackend(conf) {
  const base = `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/`;
  const { initializeApp } = await import(base + "firebase-app.js");
  const A = await import(base + "firebase-auth.js");
  const F = await import(base + "firebase-firestore.js");
  const app = initializeApp(conf);
  let auth;
  try { auth = A.initializeAuth(app, { persistence: [A.indexedDBLocalPersistence, A.browserLocalPersistence] }); }
  catch { auth = A.getAuth(app); }
  auth.languageCode = "it";
  const db = F.getFirestore(app);
  const map = (u) => u && { uid: u.uid, email: u.email, nome: u.displayName || "", verified: u.emailVerified };
  const actionSettings = { url: location.origin + location.pathname + "#prenota" };
  return {
    onUser(cb) { A.onAuthStateChanged(auth, (u) => cb(map(u))); },
    async register(nome, email, pw) {
      const c = await A.createUserWithEmailAndPassword(auth, email, pw);
      await A.updateProfile(c.user, { displayName: nome });
      await A.sendEmailVerification(c.user, actionSettings).catch(() => A.sendEmailVerification(c.user));
      return map(c.user);
    },
    async login(email, pw) { const c = await A.signInWithEmailAndPassword(auth, email, pw); return map(c.user); },
    logout: () => A.signOut(auth),
    reset: (email) => A.sendPasswordResetEmail(auth, email, { url: location.origin + location.pathname + "#account" }).catch(() => A.sendPasswordResetEmail(auth, email)),
    resend: () => A.sendEmailVerification(auth.currentUser, actionSettings).catch(() => A.sendEmailVerification(auth.currentUser)),
    token: () => auth.currentUser.getIdToken(),
    async reload() { await auth.currentUser.reload(); await auth.currentUser.getIdToken(true); return map(auth.currentUser); },
    async save(b) { const r = await F.addDoc(F.collection(db, "prenotazioni"), { ...b, creataIlServer: F.serverTimestamp() }); return r.id; },
    async mine(uid) {
      const q = F.query(F.collection(db, "prenotazioni"), F.where("uid", "==", uid));
      const s = await F.getDocs(q);
      return s.docs.map((d) => ({ id: d.id, ...d.data() }));
    }
  };
}

const AUTH_ERRORS = {
  "auth/email-already-in-use": "Questa email ha già un account. Accedi invece di registrarti.",
  "auth/invalid-email": "L'indirizzo email non è valido.",
  "auth/weak-password": "La password deve avere almeno 6 caratteri.",
  "auth/invalid-credential": "Email o password sbagliate.",
  "auth/wrong-password": "Email o password sbagliate.",
  "auth/user-not-found": "Non esiste un account con questa email.",
  "auth/too-many-requests": "Troppi tentativi. Riprova tra qualche minuto.",
  "auth/network-request-failed": "Connessione assente. Controlla internet e riprova.",
  "permission-denied": "Prima conferma la tua email, poi riprova."
};
const errMsg = (e) => AUTH_ERRORS[e?.code] || "Qualcosa non ha funzionato. Riprova.";

/* ------------------------------------------------------------------ */
/* Telegram: la prenotazione passa dal "postino" su Cloudflare         */
/* ------------------------------------------------------------------ */
function messageText(b) {
  const lines = [
    `🍣 NUOVA PRENOTAZIONE – ${R.nome || "Yugo"}`,
    ``,
    `👤 ${b.nome}`,
    `👥 ${b.persone} ${b.persone === 1 ? "persona" : "persone"}`,
    `📅 ${cap(fmtLongDate(b.data))}`,
    `🕗 Arrivo previsto: ${b.ora}`,
    b.telefono ? `📞 ${b.telefono}` : null,
    `✉️ ${b.email}`,
    b.note ? `📝 ${b.note}` : null,
    ``,
    `⏱ Richiesta fatta il ${b.creataIl}`
  ];
  return lines.filter((l) => l !== null).join("\n");
}
async function notifyTelegram(b) {
  const tg = CFG.telegram || {};
  try {
    // Collegamento tramite Cloudflare (consigliato: il token resta segreto)
    if (tg.worker && !DEMO) {
      const idToken = await backend.token();
      const r = await fetch(tg.worker, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken, nome: b.nome, persone: b.persone, data: b.data, ora: b.ora, telefono: b.telefono, note: b.note })
      });
      return r.ok;
    }
    // Collegamento diretto al bot
    if (tg.botToken && tg.chatId) {
      const body = new URLSearchParams({ chat_id: tg.chatId, text: b.messaggio, disable_web_page_preview: "true" });
      await fetch(`https://api.telegram.org/bot${tg.botToken}/sendMessage`, { method: "POST", mode: "no-cors", body });
      return true;
    }
    return !!DEMO;
  } catch (e) { console.error(e); return false; }
}

/* ------------------------------------------------------------------ */
/* Navigazione                                                         */
/* ------------------------------------------------------------------ */
const VIEWS = ["home", "menu", "prenota", "account"];
function go(view, push = true) {
  if (!VIEWS.includes(view)) view = "home";
  VIEWS.forEach((v) => { $("#view-" + v).hidden = v !== view; });
  document.querySelectorAll(".tab").forEach((t) => t.toggleAttribute("aria-current", false));
  const active = document.querySelector(`.tab[data-go="${view}"]`);
  if (active) active.setAttribute("aria-current", "page");
  if (view === "prenota") renderBooking();
  if (view === "account") renderAccount();
  if (view === "home") requestAnimationFrame(drawWaves);
  if (push) { try { history.replaceState(null, "", "#" + view); } catch { /* frame senza history */ } }
  window.scrollTo({ top: 0 });
}
document.addEventListener("click", (e) => {
  const a = e.target.closest("[data-go]");
  if (!a) return;
  e.preventDefault();
  go(a.dataset.go);
});

let toastTimer;
function toast(msg) {
  const t = $("#toast"); t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 3200);
}

/* ------------------------------------------------------------------ */
/* Home e Menu                                                         */
/* ------------------------------------------------------------------ */
function renderHome() {
  $("#menu-note").textContent = R.notaMenu || "";
  $("#hero-slogan").textContent = R.slogan || "";
  $("#home-formule").innerHTML = (R.formule || []).map((f) => `<div class="formula"><span class="f-name">${esc(f.nome)}</span><span class="f-when">${esc(f.quando || "")}</span><span class="f-price">€ ${euro(f.prezzo)}</span></div>`).join("");
  $("#home-formule-nota").textContent = R.notaFormule || "";
  $("#home-desc").innerHTML = (R.descrizione || []).map((p) => `<p>${esc(p)}</p>`).join("");
  const todayIdx = (new Date().getDay() + 6) % 7; // lunedì = 0
  $("#home-hours").innerHTML = (R.orari || []).map((o, i) => {
    const cls = [i === todayIdx ? "today" : "", /chius/i.test(o.ore) ? "closed" : ""].join(" ").trim();
    return `<dt class="${cls}">${esc(o.giorno)}${i === todayIdx ? " · oggi" : ""}</dt><dd class="${cls}">${o.ore.split("·").map((x) => esc(x.trim())).join("<br>")}</dd>`;
  }).join("");
  $("#home-address").textContent = R.indirizzo || "";
  $("#home-maps").href = "https://maps.apple.com/?q=" + encodeURIComponent(`${R.nome} ${R.indirizzo}`);
  const tel = (R.telefono || "").replace(/[^\d+]/g, "");
  $("#home-phone").href = "tel:" + tel;
  $("#home-phone").textContent = R.telefono ? `Chiama ${R.telefono}` : "Chiama";
  if (R.instagram) { $("#home-ig").hidden = false; $("#home-ig").href = "https://instagram.com/" + R.instagram; $("#home-ig").textContent = "@" + R.instagram; }
}

function renderMenu() {
  const cats = R.menu || [];
  const chips = $("#menu-chips");
  chips.innerHTML = `<button class="chip" role="tab" aria-selected="true" data-cat="all" id="chip-all">Tutto</button>` +
    cats.map((c, i) => `<button class="chip" role="tab" aria-selected="false" data-cat="${i}" id="chip-${i}">${esc(c.categoria)}</button>`).join("");
  const draw = (sel) => {
    $("#menu-list").innerHTML = cats.map((c, i) => (sel === "all" || String(i) === sel) ? `
      <section class="menu-cat"><h2>${esc(c.categoria)}</h2>
        ${c.piatti.map((p) => `<div class="dish">${p.n != null ? `<span class="dish-n">${esc(p.n)}</span>` : `<span></span>`}<span class="dish-name">${esc(p.nome)}</span><span class="dish-price">${p.prezzo != null ? "€ " + euro(p.prezzo) : ""}</span>${p.desc ? `<span class="dish-desc">${esc(p.desc)}</span>` : ""}</div>`).join("")}
      </section>` : "").join("");
  };
  chips.addEventListener("click", (e) => {
    const b = e.target.closest(".chip"); if (!b) return;
    chips.querySelectorAll(".chip").forEach((x) => x.setAttribute("aria-selected", String(x === b)));
    draw(b.dataset.cat);
  });
  draw("all");
}

/* ------------------------------------------------------------------ */
/* Prenotazione                                                        */
/* ------------------------------------------------------------------ */
function slotsFor(dateStr) {
  const d = parseISO(dateStr);
  const dow = d.getDay();
  if ((R.giorniChiusi || []).includes(dow)) return null;
  const now = new Date();
  const isToday = isoDate(now) === dateStr;
  const minNow = now.getHours() * 60 + now.getMinutes() + 30;
  return (R.servizi || []).filter((s) => !s.soloGiorni || s.soloGiorni.includes(dow)).map((s) => {
    const times = [];
    for (let m = toMin(s.da); m <= toMin(s.a); m += 15) if (!isToday || m >= minNow) times.push(fromMin(m));
    return { nome: s.nome, times };
  }).filter((g) => g.times.length);
}

function firstOpenDate() {
  const d = new Date();
  for (let i = 0; i < 14; i++) { const s = isoDate(d); const sl = slotsFor(s); if (sl && sl.length) return s; d.setDate(d.getDate() + 1); }
  return isoDate(new Date());
}

function needLogin(area, msg) {
  area.innerHTML = `<div class="card">
      <h2>${msg}</h2>
      <p class="muted">Per prenotare serve un account con la tua email. Ci vuole un minuto e la prossima volta sei già dentro.</p>
      <a href="#account" data-go="account" class="btn btn-block">Registrati o accedi</a>
    </div>`;
}

function renderBooking() {
  const area = $("#book-area");
  if (!backend) { area.innerHTML = `<p class="muted">Caricamento…</p>`; return; }
  if (lastBooking) return renderConfirmation(area, lastBooking);
  if (user === undefined) { area.innerHTML = `<p class="muted">Caricamento…</p>`; return; }
  if (!user) return needLogin(area, "Accedi per prenotare");
  if (!user.verified) {
    area.innerHTML = `<div class="notice">
        <p><strong>Conferma la tua email.</strong> Ti abbiamo mandato un link a ${esc(user.email)}. Aprilo (se non lo vedi guarda in Spam), poi torna qui e tocca «Ho confermato».</p>
        <div class="row-actions"><button class="btn" id="btn-verified">Ho confermato</button><button class="btn btn-ghost" id="btn-resend">Rinvia email</button></div>
      </div>`;
    $("#btn-verified").onclick = async () => { user = await backend.reload(); if (!user.verified) toast("Email non ancora confermata. Controlla anche nello spam."); renderBooking(); };
    $("#btn-resend").onclick = async () => { try { await backend.resend(); toast("Email inviata di nuovo."); } catch (e) { toast(errMsg(e)); } };
    return;
  }

  const draft = store.get("yugo-draft", {});
  const today = new Date();
  const maxD = new Date(); maxD.setDate(maxD.getDate() + (R.giorniPrenotabili || 60));
  const max = R.maxPersone || 12;
  let persone = Math.min(draft.persone || 2, max);

  area.innerHTML = `<form class="form card" id="book-form" novalidate>
      <div class="field">
        <label for="b-nome">Nome</label>
        <input class="input" id="b-nome" autocomplete="name" required value="${esc(user.nome)}">
      </div>
      <div class="field">
        <span class="label" id="b-persone-label">Quante persone</span>
        <div class="stepper" role="group" aria-labelledby="b-persone-label">
          <button type="button" id="b-minus" aria-label="Una persona in meno">−</button>
          <output id="b-persone" aria-live="polite"></output>
          <button type="button" id="b-plus" aria-label="Una persona in più">+</button>
        </div>
        <p class="hint" id="b-big" hidden>Per gruppi di più di ${max} persone chiama il ristorante: ${esc(R.telefono || "")}</p>
      </div>
      <div class="two">
        <div class="field">
          <label for="b-data">Giorno</label>
          <input class="input" type="date" id="b-data" required min="${isoDate(today)}" max="${isoDate(maxD)}" value="${esc(draft.data && draft.data >= isoDate(today) ? draft.data : firstOpenDate())}">
        </div>
        <div class="field">
          <label for="b-ora">Ora di arrivo</label>
          <select class="input" id="b-ora" required></select>
        </div>
      </div>
      <p class="error" id="b-closed" hidden></p>
      <div class="field">
        <label for="b-tel">Telefono</label>
        <input class="input" type="tel" id="b-tel" autocomplete="tel" inputmode="tel" placeholder="+39 333 123 4567" value="${esc(draft.telefono || "")}">
        <p class="hint">Serve solo se il ristorante deve contattarti.</p>
      </div>
      <div class="field">
        <label for="b-note">Note (facoltativo)</label>
        <textarea class="input" id="b-note" placeholder="Allergie, seggiolone, tavolo fuori…">${esc(draft.note || "")}</textarea>
      </div>
      <p class="error" id="b-err" hidden></p>
      <button class="btn btn-block" id="b-submit" type="submit">Invia prenotazione</button>
      <p class="hint">Prenoti come ${esc(user.email)}</p>
    </form>`;

  const out = $("#b-persone"), minus = $("#b-minus"), plus = $("#b-plus");
  const drawPersone = () => { out.textContent = persone; minus.disabled = persone <= 1; plus.disabled = persone > max; $("#b-big").hidden = persone <= max; $("#b-submit").disabled = persone > max || !$("#b-ora").value; };
  minus.onclick = () => { persone = Math.max(1, persone - 1); drawPersone(); saveDraft(); };
  plus.onclick = () => { persone = Math.min(max + 1, persone + 1); drawPersone(); saveDraft(); };

  const fillTimes = () => {
    const sel = $("#b-ora"); const val = $("#b-data").value; const prev = sel.value || draft.ora;
    const groups = val ? slotsFor(val) : [];
    const closed = $("#b-closed");
    if (groups === null) { sel.innerHTML = ""; closed.textContent = `Il ${fmtLongDate(val)} siamo chiusi. Scegli un altro giorno.`; closed.hidden = false; }
    else if (!groups.length) { sel.innerHTML = ""; closed.textContent = "Per questo giorno non ci sono più orari disponibili."; closed.hidden = false; }
    else {
      closed.hidden = true;
      sel.innerHTML = groups.map((g) => `<optgroup label="${esc(g.nome)}">${g.times.map((t) => `<option ${t === prev ? "selected" : ""}>${t}</option>`).join("")}</optgroup>`).join("");
      if (!groups.some((g) => g.times.includes(prev))) {
        const dinner = groups.find((g) => /cena/i.test(g.nome)) || groups[0];
        const pick = dinner.times.includes("20:00") ? "20:00" : dinner.times[0];
        sel.value = pick;
      }
    }
    drawPersone();
  };
  const saveDraft = () => store.set("yugo-draft", { persone, data: $("#b-data").value, ora: $("#b-ora").value, telefono: $("#b-tel").value, note: $("#b-note").value });
  $("#b-data").addEventListener("change", () => { fillTimes(); saveDraft(); });
  ["#b-ora", "#b-tel", "#b-note"].forEach((s) => $(s).addEventListener("change", saveDraft));
  fillTimes();

  $("#book-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const err = $("#b-err"); err.hidden = true;
    const nome = $("#b-nome").value.trim();
    const data = $("#b-data").value, ora = $("#b-ora").value;
    if (!nome) { err.textContent = "Scrivi il nome a cui intestare il tavolo."; err.hidden = false; return; }
    if (!data || !ora) { err.textContent = "Scegli giorno e ora di arrivo."; err.hidden = false; return; }
    const btn = $("#b-submit"); btn.disabled = true; btn.textContent = "Invio in corso…";
    const b = {
      uid: user.uid, nome, email: user.email, persone, data, ora,
      telefono: $("#b-tel").value.trim(), note: $("#b-note").value.trim(),
      creataIl: nowStamp(), creataIlISO: new Date().toISOString()
    };
    try {
      b.id = await backend.save(b);
      b.messaggio = messageText(b);
      b.notificato = await notifyTelegram(b);
      lastBooking = b;
      store.set("yugo-draft", { telefono: b.telefono });
      renderBooking();
      window.scrollTo({ top: 0 });
    } catch (ex) {
      err.textContent = errMsg(ex); err.hidden = false;
      btn.disabled = false; btn.textContent = "Invia prenotazione";
    }
  });
}

function renderConfirmation(area, b) {
  area.innerHTML = `<div class="ticket">
      <div class="ticket-top">
        <span class="ok">Richiesta inviata</span>
        <h2>${esc(cap(fmtLongDate(b.data)))}, ore ${esc(b.ora)}</h2>
        <p class="muted">Tavolo per ${b.persone} a nome ${esc(b.nome)}. Se c'è un problema ti contattiamo${b.telefono ? " al " + esc(b.telefono) : " via email"}.</p>
      </div>
      <dl>
        <dt>Persone</dt><dd>${b.persone}</dd>
        <dt>Arrivo</dt><dd>${esc(b.ora)}</dd>
        <dt>Richiesta fatta</dt><dd>${esc(b.creataIl)}</dd>
        <dt>Email</dt><dd>${esc(b.email)}</dd>
      </dl>
      ${!b.notificato ? `<p class="error" style="padding:0 18px 16px">La prenotazione è salvata, ma l'avviso al ristorante potrebbe non essere arrivato. Per sicurezza chiama ${esc(R.telefono || "")}.</p>` : ""}
    </div>
    <div class="row-actions" style="margin-top:14px">
      <button class="btn" id="btn-new">Nuova prenotazione</button>
      <a class="btn btn-ghost" href="#account" data-go="account">Le mie prenotazioni</a>
    </div>`;
  $("#btn-new").onclick = () => { lastBooking = null; renderBooking(); };
}

/* ------------------------------------------------------------------ */
/* Account                                                             */
/* ------------------------------------------------------------------ */
let authMode = "register";
function renderAccount() {
  const area = $("#account-area");
  if (!backend) { area.innerHTML = `<p class="muted">Caricamento…</p>`; return; }
  if (user === undefined) { area.innerHTML = `<p class="muted">Caricamento…</p>`; return; }
  if (!user) return renderAuth(area);

  area.innerHTML = `
    <div class="view-head"><h1>Ciao ${esc(user.nome || "")}</h1><p class="muted">${esc(user.email)}</p></div>
    ${!user.verified ? `<div class="notice" style="margin-bottom:14px"><p>Email non ancora confermata: apri il link che ti abbiamo mandato per poter prenotare.</p></div>` : ""}
    <div class="stack" style="margin-top:0">
      <article class="block"><h2>Le mie prenotazioni</h2><div id="my-list" class="blist"><p class="muted">Caricamento…</p></div></article>
      ${installBlock()}
      <button class="btn btn-ghost" id="btn-logout">Esci dall'account</button>
    </div>`;
  $("#btn-logout").onclick = async () => { await backend.logout(); lastBooking = null; toast("Sei uscito."); };
  backend.mine(user.uid).then((list) => {
    const el = $("#my-list"); if (!el) return;
    if (!list.length) { el.innerHTML = `<p class="muted">Nessuna prenotazione per ora.</p><a href="#prenota" data-go="prenota" class="btn">Prenota un tavolo</a>`; return; }
    const todayS = isoDate(new Date());
    list.sort((a, b) => (b.data + b.ora).localeCompare(a.data + a.ora));
    el.innerHTML = list.map((b) => {
      const d = parseISO(b.data);
      return `<div class="bitem ${b.data < todayS ? "past" : ""}">
        <div class="bdate"><b>${d.getDate()}</b><span>${d.toLocaleDateString("it-IT", { month: "short" })}</span></div>
        <div><strong>${esc(cap(d.toLocaleDateString("it-IT", { weekday: "long" })))} · ore ${esc(b.ora)}</strong><br><span class="muted">${b.persone} ${b.persone === 1 ? "persona" : "persone"} · a nome ${esc(b.nome)}</span></div>
      </div>`;
    }).join("");
  }).catch(() => { const el = $("#my-list"); if (el) el.innerHTML = `<p class="muted">Non riesco a caricare le prenotazioni. Riprova più tardi.</p>`; });
}

function installBlock() {
  const standalone = window.navigator.standalone || window.matchMedia("(display-mode: standalone)").matches;
  if (standalone) return "";
  return `<article class="block install"><h2>Yugo come app</h2>
    <p class="muted">Aggiungi Yugo alla schermata Home: si apre a schermo intero, come un'app.</p>
    <ol>
      <li><strong>iPhone:</strong> apri il sito in Safari, tocca il tasto Condividi (il quadrato con la freccia) e scegli <strong>Aggiungi alla schermata Home</strong>.</li>
      <li><strong>Android:</strong> in Chrome tocca i tre puntini e scegli <strong>Installa app</strong> o <strong>Aggiungi a schermata Home</strong>.</li>
    </ol></article>`;
}

function renderAuth(area) {
  const reg = authMode === "register";
  area.innerHTML = `
    <div class="view-head"><h1>${reg ? "Crea il tuo account" : "Accedi"}</h1>
      <p class="muted">${reg ? "Ti registri una volta sola con la tua email, poi prenoti in pochi tocchi." : "Bentornato da Yugo."}</p></div>
    <div class="card">
      <div class="tabs2" role="tablist">
        <button role="tab" id="t-reg" aria-selected="${reg}">Registrati</button>
        <button role="tab" id="t-log" aria-selected="${!reg}">Accedi</button>
      </div>
      <form class="form" id="auth-form" novalidate>
        ${reg ? `<div class="field"><label for="a-nome">Nome e cognome</label><input class="input" id="a-nome" autocomplete="name" required></div>` : ""}
        <div class="field"><label for="a-email">Email</label><input class="input" type="email" id="a-email" autocomplete="email" inputmode="email" required></div>
        <div class="field"><label for="a-pw">Password</label><input class="input" type="password" id="a-pw" autocomplete="${reg ? "new-password" : "current-password"}" minlength="6" required>
          ${reg ? `<p class="hint">Almeno 6 caratteri.</p>` : ""}</div>
        <p class="error" id="a-err" hidden></p>
        <button class="btn btn-block" type="submit" id="a-submit">${reg ? "Crea account" : "Accedi"}</button>
        ${reg ? `<p class="hint">Ti mandiamo un'email per confermare l'indirizzo.</p>` : `<button type="button" class="linkbtn" id="a-forgot">Password dimenticata?</button>`}
      </form>
    </div>
    <div style="margin-top:14px">${installBlock()}</div>`;
  $("#t-reg").onclick = () => { authMode = "register"; renderAccount(); };
  $("#t-log").onclick = () => { authMode = "login"; renderAccount(); };
  const showErr = (m) => { const e = $("#a-err"); e.className = "error"; e.textContent = m; e.hidden = false; };
  if (!reg) $("#a-forgot").onclick = async () => {
    const email = $("#a-email").value.trim();
    if (!email) return showErr("Scrivi la tua email qui sopra, poi tocca di nuovo «Password dimenticata?».");
    try {
      await backend.reset(email);
      const ok = $("#a-err"); ok.classList.remove("error"); ok.classList.add("hint");
      ok.innerHTML = `Ti abbiamo mandato un'email a <strong>${esc(email)}</strong> per cambiare password. Arriva in 1-2 minuti da <em>noreply@yugo-sestri.firebaseapp.com</em>: se non la vedi, guarda in <strong>Spam</strong> o <strong>Promozioni</strong>.`;
      ok.hidden = false;
    } catch (e) { showErr(errMsg(e)); }
  };
  $("#auth-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    $("#a-err").hidden = true;
    const email = $("#a-email").value.trim(), pw = $("#a-pw").value;
    const nome = reg ? $("#a-nome").value.trim() : "";
    if (reg && !nome) return showErr("Scrivi nome e cognome.");
    if (!/^\S+@\S+\.\S+$/.test(email)) return showErr("L'indirizzo email non è valido.");
    if (pw.length < 6) return showErr("La password deve avere almeno 6 caratteri.");
    const btn = $("#a-submit"); btn.disabled = true;
    try {
      user = reg ? await backend.register(nome, email, pw) : await backend.login(email, pw);
      toast(reg ? (DEMO ? "Account creato." : "Account creato. Controlla la tua email per confermarla.") : `Ciao ${user.nome || ""}!`);
      go("prenota");
    } catch (ex) { showErr(errMsg(ex)); btn.disabled = false; }
  });
}

/* ------------------------------------------------------------------ */
/* Avvio                                                               */
/* ------------------------------------------------------------------ */
/* Onde di puntini dorati, come nel logo */
function drawWaves() {
  if (window.YugoFX) return window.YugoFX.resize();
  const c = $("#waves"); if (!c) return;
  const r = c.getBoundingClientRect(); const dpr = Math.min(2, window.devicePixelRatio || 1);
  if (!r.width) return;
  c.width = r.width * dpr; c.height = r.height * dpr;
  const g = c.getContext("2d"); g.scale(dpr, dpr); g.clearRect(0, 0, r.width, r.height);
  const gold = getComputedStyle(document.documentElement).getPropertyValue("--gold").trim() || "#C9A55A";
  g.fillStyle = gold;
  const lines = 16;
  for (let k = 0; k < lines; k++) {
    const t = k / (lines - 1);
    g.globalAlpha = 0.18 + 0.5 * (1 - Math.abs(t - 0.5) * 2) * 0.6;
    for (let x = -10; x < r.width + 10; x += 7) {
      const u = x / r.width;
      const y = r.height * (0.62 + 0.28 * t) + Math.sin(u * 5.2 + t * 2.4) * (18 + 26 * t) - u * r.height * 0.18;
      g.beginPath(); g.arc(x, y, 1.1, 0, Math.PI * 2); g.fill();
    }
  }
}
window.addEventListener("resize", () => { clearTimeout(drawWaves.t); drawWaves.t = setTimeout(drawWaves, 150); });

async function start() {
  renderHome();
  renderMenu();
  requestAnimationFrame(drawWaves);
  const initial = (location.hash || "").replace("#", "");
  go(VIEWS.includes(initial) ? initial : "home", false);
  try {
    backend = DEMO ? demoBackend() : await firebaseBackend(CFG.firebase);
  } catch (e) {
    console.error(e);
    backend = null;
    toast("Connessione assente: prenotazioni non disponibili.");
    return;
  }
  backend.onUser((u) => {
    user = u;
    const current = VIEWS.find((v) => !$("#view-" + v).hidden);
    if (current === "prenota") renderBooking();
    if (current === "account") renderAccount();
  });
  if ("serviceWorker" in navigator && location.protocol === "https:" && !document.body.classList.contains("embed")) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
}
start();
