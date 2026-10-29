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
const fmtLongDate = (s) => parseISO(s).toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" }); // per Telegram: sempre italiano
const LOC = () => (window.YUGO_I18N && window.YUGO_I18N.locale) || "it-IT";
const fmtData = (s) => parseISO(s).toLocaleDateString(LOC(), { weekday: "long", day: "numeric", month: "long" }); // per il cliente, nella sua lingua
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
    async cancel(id) { const b = mem.bookings.find((x) => x.id === id); if (b) { b.stato = "annullata"; store.set("yugo-demo-bookings", mem.bookings); } },
    async remove(id) { mem.bookings = mem.bookings.filter((x) => x.id !== id); store.set("yugo-demo-bookings", mem.bookings); },
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
  auth.languageCode = (window.YUGO_I18N && window.YUGO_I18N.lang) || "it";
  const db = F.getFirestore(app);
  const map = (u) => u && { uid: u.uid, email: u.email, nome: u.displayName || "", verified: u.emailVerified };
  const actionSettings = { url: location.origin + location.pathname + "#prenota" };
  return {
    onUser(cb) { A.onAuthStateChanged(auth, (u) => cb(map(u))); },
    async register(nome, email, pw) {
      const c = await A.createUserWithEmailAndPassword(auth, email, pw);
      await A.updateProfile(c.user, { displayName: nome });
      return map(c.user); // il codice o il link di conferma partono subito dopo (inviaVerifica)
    },
    async login(email, pw) { const c = await A.signInWithEmailAndPassword(auth, email, pw); return map(c.user); },
    logout: () => A.signOut(auth),
    reset: (email) => A.sendPasswordResetEmail(auth, email, { url: location.origin + location.pathname + "#account" }).catch(() => A.sendPasswordResetEmail(auth, email)),
    resend: () => A.sendEmailVerification(auth.currentUser, actionSettings).catch(() => A.sendEmailVerification(auth.currentUser)),
    token: () => auth.currentUser.getIdToken(),
    async reload() { await auth.currentUser.reload(); await auth.currentUser.getIdToken(true); return map(auth.currentUser); },
    async save(b) { const r = await F.addDoc(F.collection(db, "prenotazioni"), { ...b, creataIlServer: F.serverTimestamp() }); return r.id; },
    async cancel(id) { await F.updateDoc(F.doc(db, "prenotazioni", id), { stato: "annullata", annullataIl: F.serverTimestamp() }); },
    async remove(id) { await F.deleteDoc(F.doc(db, "prenotazioni", id)); },
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
const ZH_DAYS = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
const zhDate = (s) => { const d = parseISO(s); return `${d.getMonth() + 1}月${d.getDate()}日 ${ZH_DAYS[d.getDay()]}`; };
const zhStamp = (iso) => { const d = iso ? new Date(iso) : new Date(); return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const bookingMs = (b) => { const [y, m, d] = b.data.split("-").map(Number); const [h, mi] = b.ora.split(":").map(Number); return new Date(y, m - 1, d, h, mi).getTime(); };
const ORA_LIMITE = 60 * 60 * 1000; // si può annullare online solo se manca PIÙ di un'ora

/* Messaggio Telegram in italiano e in cinese semplificato */
function messageText(b, tipo = "nuova") {
  const no = tipo === "annullata";
  const nome = R.nome || "Yugo";
  const it = [
    no ? `❌ PRENOTAZIONE ANNULLATA – ${nome}` : `🍣 NUOVA PRENOTAZIONE – ${nome}`,
    ``,
    `👤 ${b.nome}`,
    `👥 ${b.persone} ${b.persone === 1 ? "persona" : "persone"}`,
    `📅 ${cap(fmtLongDate(b.data))}`,
    `🕗 Arrivo previsto: ${b.ora}`,
    b.telefono ? `📞 ${b.telefono}` : null,
    `✉️ ${b.email}`,
    b.note ? `📝 ${b.note}` : null,
    ``,
    no ? `⏱ Annullata il ${nowStamp()}` : `⏱ Richiesta fatta il ${b.creataIl}`
  ];
  const zh = [
    no ? `❌ 预订已取消 – ${nome}` : `🍣 新预订 – ${nome}`,
    ``,
    `👤 姓名：${b.nome}`,
    `👥 人数：${b.persone}人`,
    `📅 日期：${zhDate(b.data)}`,
    `🕗 预计到达：${b.ora}`,
    b.telefono ? `📞 电话：${b.telefono}` : null,
    `✉️ 邮箱：${b.email}`,
    b.note ? `📝 备注：${b.note}` : null,
    ``,
    no ? `⏱ 取消时间：${zhStamp()}` : `⏱ 提交时间：${zhStamp(b.creataIlISO)}`
  ];
  return [...it, ``, `— — — — — — —`, ``, ...zh].filter((l) => l !== null).join("\n");
}
async function notifyTelegram(b, tipo = "nuova") {
  const tg = CFG.telegram || {};
  try {
    // Collegamento tramite Cloudflare (consigliato: il token resta segreto)
    if (tg.worker && !DEMO) {
      const idToken = await backend.token();
      const r = await fetch(tg.worker, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken, tipo, id: b.id, nome: b.nome, persone: b.persone, data: b.data, ora: b.ora, telefono: b.telefono, note: b.note })
      });
      return r.ok;
    }
    // Collegamento diretto al bot
    if (tg.botToken && tg.chatId) {
      const body = new URLSearchParams({ chat_id: tg.chatId, text: messageText(b, tipo), disable_web_page_preview: "true" });
      await fetch(`https://api.telegram.org/bot${tg.botToken}/sendMessage`, { method: "POST", mode: "no-cors", body });
      return true;
    }
    return !!DEMO;
  } catch (e) { console.error(e); return false; }
}

/* Annullamento: chiede conferma nella pagina, poi annulla e avvisa su Telegram */
function askCancel(btn, b) {
  const box = btn.closest(".bactions");
  box.innerHTML = `<p class="hint">Vuoi davvero annullare questo tavolo?</p>
    <div class="row-actions"><button class="btn btn-sm btn-danger" data-yes>Sì, annulla</button><button class="btn btn-ghost btn-sm" data-no>No, tienilo</button></div>`;
  box.querySelector("[data-no]").onclick = () => renderAccount();
  box.querySelector("[data-yes]").onclick = async (e) => {
    if ((b.quandoMs || bookingMs(b)) - Date.now() <= ORA_LIMITE) {
      toast("Manca meno di un'ora: per annullare chiama il ristorante.");
      return renderAccount();
    }
    e.target.disabled = true; e.target.textContent = "Annullo…";
    try {
      await backend.cancel(b.id);
      await notifyTelegram(b, "annullata");
      toast("Prenotazione annullata. Il ristorante è stato avvisato.");
    } catch (ex) {
      toast(ex?.code === "permission-denied" ? "Non si può più annullare online: chiama il ristorante." : "Non sono riuscito ad annullare. Riprova.");
    }
    renderAccount();
  };
}

/* Promozioni e social */
const ICONS = {
  tiktok: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 3v11.5a3.5 3.5 0 1 1-3.5-3.5"/><path d="M14 3c.4 2.6 2.2 4.4 5 4.6"/></svg>`,
  instagram: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r=".9" class="fill"/></svg>`,
  facebook: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 21v-7.5h2.6l.4-3h-3V8.6c0-.9.3-1.5 1.6-1.5h1.5V4.4a20 20 0 0 0-2.3-.1c-2.3 0-3.8 1.4-3.8 3.9v2.3H9v3h2.5V21"/></svg>`
};
function socialLinks() {
  const S = R.social || {};
  const items = [
    S.tiktok && { nome: "TikTok", handle: S.tiktok, url: `https://www.tiktok.com/@${S.tiktok}`, icon: ICONS.tiktok },
    S.instagram && { nome: "Instagram", handle: S.instagram, url: `https://www.instagram.com/${S.instagram}/`, icon: ICONS.instagram },
    S.facebook && { nome: "Facebook", handle: S.facebook, url: `https://www.facebook.com/${S.facebook}`, icon: ICONS.facebook }
  ].filter(Boolean);
  return `<div class="social">${items.map((s) => `<a class="social-btn" href="${s.url}" target="_blank" rel="noopener">${s.icon}<span><b>${s.nome}</b><small>@${esc(s.handle)}</small></span></a>`).join("")}</div>`;
}
function promoAttive() {
  const oggi = isoDate(new Date());
  return (R.promozioni || []).filter((p) => (!p.dal || p.dal <= oggi) && (!p.al || p.al >= oggi));
}
function renderPromo() {
  const list = promoAttive();
  $("#promo-list").innerHTML = list.length ? list.map((p) => `<article class="block promo">
      <span class="promo-tag">${esc(p.etichetta || "Promo")}</span>
      <h2>${esc(p.titolo)}</h2>
      <p>${esc(p.descrizione || "")}</p>
      ${p.quando ? `<p class="hint">${esc(p.quando)}</p>` : ""}
      ${p.al ? `<p class="hint">Valida fino a ${esc(fmtData(p.al))}</p>` : ""}
    </article>`).join("")
    : `<p class="muted">In questo momento non ci sono promozioni attive. Seguici sui social per non perdere le prossime.</p>`;
  $("#promo-social").innerHTML = socialLinks();
  $("#home-social").innerHTML = socialLinks();
  const hp = $("#home-promo");
  hp.hidden = !list.length;
  if (list.length) $("#home-promo-text").textContent = list.length > 1 ? `${list[0].titolo} e altre ${list.length - 1}` : list[0].titolo;
}

/* ------------------------------------------------------------------ */
/* Invita amici: link personale, barra, premi e coupon                 */
/* ------------------------------------------------------------------ */
const WORKER = ((CFG.telegram && CFG.telegram.worker) || "").replace(/\/$/, "");
const SITO = location.origin + location.pathname.replace(/[^/]*$/, "");
const linkInvito = (c) => `${SITO}invito/${c}`;
const premioDi = (liv) => { const P = (CFG.promoInviti && CFG.promoInviti.premi) || []; return P.length ? P[Math.min(liv - 1, P.length - 1)] : "un premio da Yugo"; };
async function api(path, body) {
  if (!WORKER) throw new Error("Servizio non ancora attivo.");
  let r;
  try { r = await fetch(WORKER + path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body || {}) }); }
  catch { throw new Error("Connessione assente o servizio non raggiungibile. Riprova tra poco."); }
  const d = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error(d.errore || "Qualcosa non ha funzionato. Riprova."); e.status = r.status; throw e; }
  return d;
}

/* Conferma email: codice di 6 cifre se il worker è pronto, altrimenti il link di Firebase */
let OTP = null;
const otpPronto = (WORKER ? fetch(WORKER + "/otp/stato").then((r) => r.json()).then((d) => !!d.attivo) : Promise.resolve(false))
  .catch(() => false).then((v) => (OTP = v));
async function inviaVerifica() {
  if (DEMO) return;
  await otpPronto;
  if (OTP) return api("/otp/invia", { idToken: await backend.token(), lang: (window.YUGO_I18N && window.YUGO_I18N.lang) || "it" });
  return backend.resend();
}
async function emailConfermata() {
  user = await backend.reload();
  if (!user.verified) return false;
  toast("Email confermata!");
  renderBooking(); renderAccount(); renderInvite();
  return true;
}
function verifyBox(box) {
  if (!box) return;
  if (OTP === null) { box.innerHTML = `<p class="muted">Caricamento…</p>`; otpPronto.then(() => verifyBox(box)); return; }
  if (!OTP) {
    box.innerHTML = `<div class="notice">
        <p><strong>Conferma la tua email.</strong> Ti abbiamo mandato un link a ${esc(user.email)}. Aprilo (se non lo vedi guarda in Spam), poi torna qui e tocca «Ho confermato».</p>
        <div class="row-actions"><button class="btn" data-v="ok">Ho confermato</button><button class="btn btn-ghost" data-v="again">Rinvia email</button></div>
      </div>`;
    box.querySelector('[data-v="ok"]').onclick = async () => { if (!(await emailConfermata())) toast("Email non ancora confermata. Controlla anche nello spam."); };
    box.querySelector('[data-v="again"]').onclick = async () => { try { await backend.resend(); toast("Email inviata di nuovo."); } catch (e) { toast(errMsg(e)); } };
    return;
  }
  box.innerHTML = `<div class="notice otp">
      <p><strong>Conferma la tua email.</strong> Ti abbiamo mandato un codice di 6 cifre a ${esc(user.email)} (se non lo vedi guarda in Spam).</p>
      <form class="otp-row" novalidate>
        <input class="input otp-in" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="000000" aria-label="Codice di 6 cifre">
        <button class="btn" type="submit">Conferma</button>
      </form>
      <p class="error" hidden></p>
      <button type="button" class="linkbtn" data-v="again">Mandami un nuovo codice</button>
    </div>`;
  const inp = box.querySelector(".otp-in"), err = box.querySelector(".error"), form = box.querySelector("form");
  const mostra = (m) => { err.textContent = m; err.hidden = !m; };
  inp.addEventListener("input", () => { inp.value = inp.value.replace(/\D/g, "").slice(0, 6); if (inp.value.length === 6) form.requestSubmit(); });
  form.addEventListener("submit", async (e) => {
    e.preventDefault(); mostra("");
    if (inp.value.length !== 6) return mostra("Scrivi le 6 cifre del codice.");
    const b = form.querySelector("button"); b.disabled = true;
    try { await api("/otp/verifica", { idToken: await backend.token(), codice: inp.value }); await emailConfermata(); }
    catch (ex) { mostra(ex.code ? errMsg(ex) : ex.message); inp.value = ""; inp.focus(); }
    b.disabled = false;
  });
  box.querySelector('[data-v="again"]').onclick = async () => {
    try { await inviaVerifica(); toast("Nuovo codice inviato."); } catch (ex) { mostra(ex.code ? errMsg(ex) : ex.message); }
  };
}

async function renderInvite() {
  const area = $("#invite-area"); if (!area) return;
  area.hidden = !WORKER; if (!WORKER) return;
  if (!backend || user === undefined) { area.innerHTML = `<p class="muted">Caricamento…</p>`; return; }
  const intro = `<span class="promo-tag">Invita amici</span><h2>Porta i tuoi amici, vinci premi</h2>
    <p>Ogni amico che ci segue su TikTok o Instagram riempie la tua barra. Barra piena = un coupon da usare da Yugo.</p>`;
  if (!user) { area.innerHTML = `<article class="block invite">${intro}<a href="#account" data-go="account" class="btn">Accedi o registrati per partecipare</a></article>`; return; }
  if (!user.verified) { area.innerHTML = `<article class="block invite">${intro}<div class="vbox"></div></article>`; verifyBox(area.querySelector(".vbox")); return; }
  if (!area.innerHTML.trim()) area.innerHTML = `<p class="muted">Caricamento…</p>`;
  try { drawInvite(area, await api("/promo/me", { idToken: await backend.token() })); }
  catch (e) { area.innerHTML = `<article class="block invite">${intro}<p class="error">${esc(e.message)}</p></article>`; }
}

function drawInvite(area, me, nuovo) {
  if (!me.iscritto) {
    area.innerHTML = `<article class="block invite">
      <span class="promo-tag">Invita amici</span>
      <h2>Porta i tuoi amici, vinci premi</h2>
      <p>Iscriviti e ricevi il tuo link personale. Ogni amico che ci segue riempie la tua barra: barra piena = coupon.</p>
      <ol class="steps-path">${me.livelli.map((t) => `<li>${t}</li>`).join("")}</ol>
      <form class="form" id="inv-join" novalidate>
        <div class="field"><label for="ij-nome">Nome</label><input class="input" id="ij-nome" autocomplete="given-name" value="${esc((user.nome || "").split(" ")[0])}"></div>
        <div class="field"><label for="ij-tel">Telefono</label><input class="input" id="ij-tel" type="tel" inputmode="tel" autocomplete="tel" placeholder="+39 333 123 4567" value="${esc(store.get("yugo-draft", {}).telefono || "")}"></div>
        <p class="error" id="ij-err" hidden></p>
        <button class="btn btn-gold btn-block" type="submit" id="ij-go">Iscriviti e ricevi il link</button>
      </form>
    </article>`;
    $("#inv-join").addEventListener("submit", async (e) => {
      e.preventDefault();
      const err = $("#ij-err"), btn = $("#ij-go"); err.hidden = true; btn.disabled = true;
      try { drawInvite(area, await api("/promo/iscrivi", { idToken: await backend.token(), nome: $("#ij-nome").value, telefono: $("#ij-tel").value })); toast("Fatto! Ecco il tuo link personale."); }
      catch (ex) { err.textContent = ex.message; err.hidden = false; btn.disabled = false; }
    });
    return;
  }
  const pct = Math.round((me.progresso / me.target) * 100);
  const link = linkInvito(me.codice);
  const liv = me.livello, tot = me.livelli.length;
  area.innerHTML = `<article class="block invite">
      <span class="promo-tag">Invita amici</span>
      <h2>Il tuo codice <span class="inv-code">${esc(me.codice)}</span></h2>
      <div class="inv-link"><input class="input" id="inv-link" readonly value="${esc(link)}"><button class="btn btn-ghost btn-sm" id="inv-copy" type="button">Copia</button></div>
      ${navigator.share ? `<button class="btn btn-block" id="inv-share" type="button">Condividi il tuo link</button>` : ""}
      <div class="lvl-head"><span>Livello ${Math.min(liv, tot)}${liv > tot ? "+" : ""} di ${tot}</span><span class="lvl-num">${me.progresso}/${me.target}</span></div>
      <div class="bar${me.pronto ? " full" : ""}" role="progressbar" aria-valuemin="0" aria-valuemax="${me.target}" aria-valuenow="${me.progresso}"><span style="--w:${pct}%"></span></div>
      <p class="hint">${me.pronto ? "Barra piena! Richiedi il tuo premio." : `Ancora <b>${me.target - me.progresso}</b> ${me.target - me.progresso === 1 ? "amico" : "amici"} per sbloccare: <b>${esc(premioDi(liv))}</b>`}</p>
      ${me.attesa ? `<p class="hint">⏳ ${me.attesa} ${me.attesa === 1 ? "amico in attesa" : "amici in attesa"} di conferma dal ristorante</p>` : ""}
      ${me.pronto ? `<button class="btn btn-gold btn-block fx-pulse" id="inv-claim" type="button">🎁 Richiedi premio</button>` : ""}
      <ol class="steps-path">${me.livelli.map((t, i) => `<li class="${i < liv - 1 ? "done" : i === liv - 1 ? "now" : ""}">${t}</li>`).join("")}</ol>
    </article>
    <article class="block">
      <h2>I tuoi coupon</h2>
      ${me.coupon.length ? `<div class="coupons">${me.coupon.map((c) => `<div class="coupon ${c.stato === "usato" ? "used" : ""} ${c.codice === nuovo ? "fx-stamp" : ""}">
          <span class="c-code">${esc(c.codice)}</span>
          <span class="c-info">Livello ${c.livello} · ${esc(premioDi(c.livello))}</span>
          <span class="c-state">${c.stato === "usato" ? "Usato ✅" : "Valido · mostralo alla cassa"}</span>
        </div>`).join("")}</div>` : `<p class="muted">Ancora nessuno. Riempi la barra per il primo coupon.</p>`}
    </article>
    <article class="block">
      <h2>Come funziona</h2>
      <ol class="how">
        <li>Manda il tuo link agli amici.</li>
        <li>Loro ci seguono su TikTok e Instagram e scrivono il loro username.</li>
        <li>Il ristorante controlla e conferma: ogni amico conta una volta sola.</li>
        <li>Barra piena: tocca «Richiedi premio» e mostra il codice alla cassa.</li>
      </ol>
    </article>`;
  $("#inv-copy").onclick = async () => {
    try { await navigator.clipboard.writeText(link); toast("Link copiato."); }
    catch { const i = $("#inv-link"); i.select(); toast("Tieni premuto sul link per copiarlo."); }
  };
  if ($("#inv-share")) $("#inv-share").onclick = () => navigator.share({ title: "Yugo Sestri Levante", text: "Seguimi su Yugo e aiutami a vincere un premio! 🍣", url: link }).catch(() => {});
  if ($("#inv-claim")) $("#inv-claim").onclick = async (e) => {
    e.target.disabled = true; e.target.textContent = "Genero il coupon…";
    try {
      const r = await api("/promo/premio", { idToken: await backend.token() });
      drawInvite(area, r, r.nuovoCoupon);
      toast(`Coupon ${r.nuovoCoupon} sbloccato! Mostralo alla cassa.`);
      area.querySelector(".coupons")?.scrollIntoView({ behavior: "smooth", block: "center" });
    } catch (ex) { toast(ex.message); renderInvite(); }
  };
}

/* Pagina per l'amico invitato: /invito/CODICE */
const INVITO = (new URLSearchParams(location.search).get("invito") || (location.hash.match(/^#invito-([A-Za-z0-9]+)$/) || [])[1] || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
async function renderLanding(code) {
  const area = $("#invito-area");
  area.innerHTML = `<p class="muted">Caricamento…</p>`;
  let info;
  try { info = await api("/promo/invito", { codice: code }); }
  catch (e) {
    area.innerHTML = `<div class="view-head"><h1>Invito non valido</h1><p class="muted">${esc(e.message)} Controlla il link che ti hanno mandato.</p></div>
      <a href="#home" data-go="home" class="btn">Scopri Yugo</a>`;
    return;
  }
  const S = R.social || {};
  const fatti = store.get("yugo-seguito", {});
  let piattaforma = "instagram";
  area.innerHTML = `<div class="view-head"><span class="promo-tag">Invito</span><h1>${esc(info.nome)} ti invita da Yugo</h1>
      <p class="muted">Seguici su TikTok e Instagram, poi scrivi il tuo username: aiuti ${esc(info.nome)} a vincere un premio.</p></div>
    <div class="card">
      <span class="label">1 · Seguici</span>
      <div class="social">
        <a class="social-btn follow" data-follow="tiktok" href="https://www.tiktok.com/@${esc(S.tiktok || "")}" target="_blank" rel="noopener">${ICONS.tiktok}<span><b>Segui su TikTok</b><small>@${esc(S.tiktok || "")}</small></span><i class="tick" aria-hidden="true">✓</i></a>
        <a class="social-btn follow" data-follow="instagram" href="https://www.instagram.com/${esc(S.instagram || "")}/" target="_blank" rel="noopener">${ICONS.instagram}<span><b>Segui su Instagram</b><small>@${esc(S.instagram || "")}</small></span><i class="tick" aria-hidden="true">✓</i></a>
      </div>
      <form class="form" id="inv-form" novalidate>
        <span class="label">2 · Scrivi il tuo username</span>
        <div class="tabs2" role="radiogroup" aria-label="App">
          <button type="button" role="radio" data-p="instagram" aria-selected="true">Instagram</button>
          <button type="button" role="radio" data-p="tiktok" aria-selected="false">TikTok</button>
        </div>
        <div class="field"><label for="inv-user">Username</label>
          <input class="input" id="inv-user" placeholder="@giulia_23" autocapitalize="none" autocomplete="off" autocorrect="off" spellcheck="false"></div>
        <p class="error" id="inv-err" hidden></p>
        <button class="btn btn-gold btn-block" id="inv-send" type="submit">Invia</button>
        <p class="hint" id="inv-hint"></p>
      </form>
    </div>`;
  const aggiorna = () => {
    $$("[data-follow]").forEach((a) => a.classList.toggle("done", !!fatti[a.dataset.follow]));
    const ok = fatti.tiktok && fatti.instagram;
    $("#inv-send").disabled = !ok;
    $("#inv-hint").textContent = ok ? "" : "Prima tocca i due pulsanti «Segui» qui sopra.";
  };
  $$("[data-follow]").forEach((a) => a.addEventListener("click", () => { fatti[a.dataset.follow] = true; store.set("yugo-seguito", fatti); setTimeout(aggiorna, 400); }));
  $$("#inv-form [data-p]").forEach((b) => b.onclick = () => { piattaforma = b.dataset.p; $$("#inv-form [data-p]").forEach((x) => x.setAttribute("aria-selected", String(x === b))); });
  aggiorna();
  $("#inv-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const err = $("#inv-err"), btn = $("#inv-send"); err.hidden = true;
    const username = $("#inv-user").value.trim().replace(/^@+/, "");
    if (!username) { err.textContent = "Scrivi il tuo username."; err.hidden = false; return; }
    btn.disabled = true; btn.textContent = "Invio…";
    try {
      await api("/promo/follow", { codice: code, username, piattaforma });
      area.innerHTML = `<div class="ticket fx-stamp"><div class="ticket-top">
          <span class="ok">Inviato</span><h2>Grazie @${esc(username.toLowerCase())}!</h2>
          <p class="muted">Il ristorante controlla tra poco che ci segui: quando conferma, il punto va a ${esc(info.nome)}.</p></div></div>
        <div class="row-actions" style="margin-top:14px">
          <a class="btn" href="#prenota" data-go="prenota">Prenota un tavolo</a>
          <a class="btn btn-ghost" href="#promo" data-go="promo">Invita anche tu i tuoi amici</a>
        </div>`;
    } catch (ex) { err.textContent = ex.message; err.hidden = false; btn.disabled = false; btn.textContent = "Invia"; }
  });
}

/* ------------------------------------------------------------------ */
/* Navigazione                                                         */
/* ------------------------------------------------------------------ */
const VIEWS = ["home", "menu", "prenota", "promo", "account", "invito"];
const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
function go(view, push = true) {
  if (!VIEWS.includes(view)) view = "home";
  VIEWS.forEach((v) => { $("#view-" + v).hidden = v !== view; });
  document.querySelectorAll(".tab").forEach((t) => t.toggleAttribute("aria-current", false));
  const active = document.querySelector(`.tab[data-go="${view}"]`);
  if (active) active.setAttribute("aria-current", "page");
  if (view === "prenota") renderBooking();
  if (view === "account") renderAccount();
  if (view === "promo") renderInvite();
  if (view === "home") requestAnimationFrame(drawWaves);
  if (typeof aggiornaBarra === "function") aggiornaBarra();
  if (push) { try { history.replaceState(null, "", (view === "invito" ? location.search : location.pathname) + "#" + view); } catch { /* frame senza history */ } }
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
  $("#home-formule").previousElementSibling.textContent = R.titoloFormule || "All You Can Eat";
  $("#home-formule").innerHTML = (R.formule || []).map((f, i) => `<div class="formula" role="button" tabindex="0" data-fam-home="${i}"><span class="f-name">${esc(f.nome)}</span><span class="f-when">${esc(f.quando || "")}</span><span class="f-price">€ ${euro(f.prezzo)}</span></div>`).join("");
  $("#home-formule-nota").textContent = R.notaFormule || "";
  const ay = $("#home-ayce"); if (ay) { ay.hidden = !ayceAttivo(); ay.innerHTML = ayceHTML(true); }
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

/* Toglie gli asterischi dal testo dei piatti */
const pul = (s) => String(s ?? "").replace(/\*/g, "").replace(/\s{2,}/g, " ").replace(/\s+([,.])/g, "$1").trim();

/* Dove mangi? "ristorante" o "casa". Si chiede una volta per visita. */
let MODO = (() => { try { return sessionStorage.getItem("yugo-modo"); } catch { return null; } })();
/* Pranzo o cena? Dalle 00:00 alle 16:00 (ora italiana) menu del pranzo, poi quello della cena. */
function oraRoma() {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Rome", hour: "2-digit", minute: "2-digit", weekday: "short", hour12: false })
    .formatToParts(new Date()).map((x) => [x.type, x.value]));
  return { min: (+p.hour % 24) * 60 + +p.minute, weekend: p.weekday === "Sat" || p.weekday === "Sun" };
}
const servizio = () => {
  const [h, m] = String(R.cambioMenu || "16:00").split(":").map(Number);
  return oraRoma().min <= h * 60 + m ? "pranzo" : "cena";
};
const aPranzo = () => !!R.allYouCanEatPranzo && servizio() === "pranzo";
const menuAttivo = () => {
  if (!(MODO === "ristorante" && R.menuRistorante && R.menuRistorante.length)) {
    const f = famAtt(), no = new Set(f && f.i === 0 ? R.familyNonF1 || [] : []); // con il Family F1 niente sashimi, carpaccio e special roll
    return (R.menu || []).filter((c) => !c.soloRistorante) // piatti special e dim sum non vanno da asporto
      .map((c) => no.size ? { ...c, piatti: c.piatti.filter((p) => !no.has(p.n)) } : c).filter((c) => c.piatti.length);
  }
  if (!aPranzo()) return R.menuRistorante;
  const no = new Set(R.nonAPranzo || []), max1 = new Set(R.max1Pranzo || []);
  return R.menuRistorante
    .map((c) => ({ ...c, piatti: c.piatti.filter((p) => p.n == null || !no.has(p.n)).map((p) => max1.has(p.n) ? { ...p, max1: true } : p) }))
    .filter((c) => c.piatti.length);
};
const ayceAttivo = () => {
  if (!aPranzo()) return R.allYouCanEat || null;
  const a = R.allYouCanEatPranzo;
  return { ...a, prezzo: oraRoma().weekend && a.prezzoWeekend ? a.prezzoWeekend : a.prezzo };
};
const aycePrezzo = () => (ayceAttivo() && ayceAttivo().prezzo) || null;
function ayceHTML(conBottone) {
  const a = ayceAttivo(); if (!a) return "";
  return `<div class="ayce-head"><span><small>${esc(a.quando || "")}</small><b>${esc(a.titolo)}</b></span><span class="ayce-price">€ ${euro(a.prezzo)}</span></div>
    <ul class="ayce-list">${(a.righe || []).map((r) => `<li>${esc(r)}</li>`).join("")}</ul>
    ${conBottone ? `<a href="#prenota" data-go="prenota" class="btn btn-gold btn-block">Prenota un tavolo</a>` : ""}`;
}
let menuReset = () => {};

function mostraModo() {
  $("#mode-pick").hidden = !!MODO;
  $("#menu-body").hidden = !MODO;
  if (!MODO) return;
  const casa = MODO === "casa";
  $("#mode-label").innerHTML = casa ? "Menu <b>a casa</b> · asporto e consegna" : "Menu <b>al ristorante</b>";
  $("#menu-note").textContent = (casa ? R.notaMenuCasa : (aPranzo() ? R.notaMenuPranzo : R.notaMenuCena) || R.notaMenuRistorante) || "";
  const box = $("#menu-ayce");
  if (box) { box.hidden = casa || !ayceAttivo(); box.innerHTML = casa ? "" : ayceHTML(false); }
  disegnaFamily();
}


/* ------------------------------------------------------------------ */
/* Ordine da casa: carrello, consegna o ritiro, invio su Telegram      */
/* ------------------------------------------------------------------ */
const ORD = R.ordini || null;
let carrello = store.get("yugo-carrello", {});
const chiave = (p) => String(p.n != null ? p.n : p.nome);
const righeCarrello = () => Object.values(carrello).filter((r) => r.q > 0);
const pezzi = () => righeCarrello().reduce((a, r) => a + r.q, 0);
const subtotale = () => Math.round(righeCarrello().reduce((a, r) => a + r.q * r.prezzo, 0) * 100) / 100;
const salvaCarrello = () => store.set("yugo-carrello", carrello);

/* Menu Family da casa: scelto F1…F4, i piatti costano 0 e se ne prendono al massimo quanti ne prevede il menu */
const FORMULE = (R.formule || []).map((f, i) => ({ ...f, i, piatti: parseInt(f.quando, 10) || 0, bibite: parseInt((String(f.quando).match(/\+\s*(\d+)\s*bibit/) || [])[1], 10) || 0 }));
let FAM = store.get("yugo-family", null);
if (FAM == null || !FORMULE[FAM]) FAM = null;
function famAtt() { return ORD && MODO === "casa" && FAM != null ? FORMULE[FAM] : null; }
function famBlocco(p, f) {
  const n = pezzi(), q = (carrello[chiave(p)] || {}).q || 0;
  if (n >= f.piatti) return `Hai già scelto tutti i piatti del menu (${f.piatti}).`;
  if ((R.familyUnaVolta || []).includes(p.n) && q >= 1) return "Questo piatto si ordina una volta sola.";
  for (const [tipo, nums] of Object.entries(R.familyLimite || {})) {
    if (!nums.includes(p.n)) continue;
    const gia = righeCarrello().filter((r) => nums.includes(r.n)).reduce((a, r) => a + r.q, 0);
    if (gia >= f.i) return `Con questo menu ${tipo} al massimo ${f.i}.`; // F2 = 1, F3 = 2, F4 = 3
  }
  return null;
}
function scegliFamily(i) {
  const nuovo = i === "" || i == null ? null : Number(i);
  if (nuovo === FAM) return;
  if (pezzi()) { carrello = {}; salvaCarrello(); toast("Hai cambiato menu: l'ordine è stato svuotato."); }
  FAM = nuovo; store.set("yugo-family", FAM);
  disegnaFamily(); menuReset(); aggiornaBarra();
}
function disegnaFamily() {
  let box = $("#menu-family");
  if (!box && $("#menu-ayce")) { box = document.createElement("div"); box.id = "menu-family"; box.className = "fam-bar"; $("#menu-ayce").after(box); }
  if (!box) return;
  const vedi = !!ORD && MODO === "casa" && FORMULE.length > 0;
  box.hidden = !vedi; if (!vedi) { box.innerHTML = ""; return; }
  const f = famAtt();
  box.innerHTML = `<div class="fam-chips" role="tablist" aria-label="Menu Family">
      <button type="button" class="chip" role="tab" data-fam="" aria-selected="${!f}">Alla carta</button>
      ${FORMULE.map((x) => `<button type="button" class="chip" role="tab" data-fam="${x.i}" aria-selected="${f === x}">${esc(x.nome.replace(/^Family\s*/i, ""))} · € ${euro(x.prezzo)}</button>`).join("")}
    </div>
    ${f ? `<p class="fam-info"><b>${esc(f.nome)}</b> · ${esc(f.quando)}</p><p class="fam-count"></p>`
      : `<p class="hint">Scegli un menu Family: i piatti sono inclusi nel prezzo.</p>`}`;
  aggiornaFam();
}
function aggiornaFam() {
  const f = famAtt(), n = pezzi(), full = !!f && n >= f.piatti;
  const el = $("#menu-family .fam-count");
  if (el && f) { el.textContent = `${n} di ${f.piatti} piatti scelti`; el.classList.toggle("full", full); }
  const l = $("#menu-list"); if (l) l.classList.toggle("famfull", full);
}
document.addEventListener("click", (e) => {
  const b = e.target.closest("#menu-family [data-fam]"); if (b) return scegliFamily(b.dataset.fam);
  const h = e.target.closest("[data-fam-home]"); if (!h || !ORD) return;
  MODO = "casa"; try { sessionStorage.setItem("yugo-modo", MODO); } catch { /* ok */ }
  scegliFamily(h.dataset.famHome); mostraModo(); menuReset(); aggiornaBarra(); go("menu");
});

function qtyHTML(p) {
  const k = chiave(p), q = (carrello[k] && carrello[k].q) || 0;
  return q
    ? `<span class="qty on" data-k="${esc(k)}"><button type="button" data-d="-1" aria-label="Togli un ${esc(pul(p.nome))}">−</button><output>${q}</output><button type="button" data-d="1" aria-label="Aggiungi un ${esc(pul(p.nome))}">+</button></span>`
    : `<span class="qty" data-k="${esc(k)}"><button type="button" class="qty-add" data-d="1" aria-label="Aggiungi ${esc(pul(p.nome))} all'ordine">+</button></span>`;
}
function cambiaQta(p, d) {
  const f = famAtt();
  if (f && d > 0) { const no = famBlocco(p, f); if (no) { toast(no); return false; } }
  const k = chiave(p), r = carrello[k] || { n: p.n ?? null, nome: pul(p.nome), prezzo: f ? 0 : p.prezzo, q: 0 };
  r.q = Math.max(0, Math.min(20, r.q + d));
  if (r.q) carrello[k] = r; else delete carrello[k];
  salvaCarrello(); aggiornaBarra();
}
function aggiornaBarra() {
  const bar = $("#cart-bar"); if (!bar) return;
  const n = pezzi(), vedi = ORD && MODO === "casa" && n > 0 && !$("#view-menu").hidden;
  bar.hidden = !vedi; document.body.classList.toggle("has-cart", vedi);
  const f = famAtt();
  if (vedi) $("#cart-bar-txt").innerHTML = `<b>${n} ${n === 1 ? "piatto" : "piatti"}</b> · € ${euro(f ? f.prezzo : subtotale())}`;
  aggiornaFam();
}

/* Orari in cui si può ordinare oggi */
function fasceOggi() {
  const now = new Date(), m = now.getHours() * 60 + now.getMinutes(), anticipo = ORD.anticipo || 40;
  const slots = [];
  if ((R.giorniChiusi || []).includes(now.getDay())) return { slots, chiusoOggi: true };
  for (const [da, a] of ORD.fasce || []) {
    const s = toMin(da), e = toMin(a);
    if (m > e) continue; // dopo le 14:30 e dopo le 22:00 niente ordini
    for (let t = s; t <= e + 30; t += 15) if (t >= m + anticipo) slots.push(fromMin(t));
  }
  return { slots };
}

let ordDati = store.get("yugo-ordine-dati", { modo: "consegna", zona: 0, indirizzo: "", ora: "", note: "" });
function apriCarrello() {
  const s = $("#carrello"); s.hidden = false; document.documentElement.classList.add("no-scroll");
  disegnaCarrello();
}
function chiudiCarrello() { $("#carrello").hidden = true; document.documentElement.classList.remove("no-scroll"); }
document.addEventListener("click", (e) => { if (e.target.closest("#carrello [data-close]")) chiudiCarrello(); });

function disegnaCarrello() {
  const body = $("#ord-body"), righe = righeCarrello();
  if (!righe.length) {
    body.innerHTML = `<p class="cs-kicker">Il tuo ordine</p><h2 id="ord-title">Ancora vuoto</h2>
      <p class="muted">Tocca <b>+</b> accanto ai piatti del menu per aggiungerli.</p>
      <button class="btn btn-block" type="button" data-close>Torna al menu</button>`;
    return;
  }
  const d = ordDati, consegna = d.modo === "consegna", zone = ORD.zone || [];
  const zona = zone[d.zona] || zone[0], costo = consegna && zona ? zona.costo : 0;
  const F = famAtt(), mancano = F ? Math.max(0, F.piatti - pezzi()) : 0;
  const sub = F ? F.prezzo : subtotale(), tot = Math.round((sub + costo) * 100) / 100;
  const { slots, chiusoOggi } = fasceOggi();
  if (!slots.includes(d.ora)) d.ora = slots[0] || "";
  const chiuso = !slots.length;
  const sottoMinimo = consegna && sub < (ORD.minimo || 0);
  const n = pezzi();
  const fam = F ? null : (R.formule || []).map((f) => ({ f, k: parseInt(f.quando, 10) })).find(({ f, k }) => k === n && sub > f.prezzo && !/F1/.test(f.nome));
  body.innerHTML = `<p class="cs-kicker">Il tuo ordine</p><h2 id="ord-title">${F ? `${esc(F.nome)} · € ${euro(F.prezzo)}` : `${n} ${n === 1 ? "piatto" : "piatti"}`}</h2>
    ${F ? `<p class="hint">${n} di ${F.piatti} piatti scelti</p>` : ""}
    <ul class="cs-list ord-list">${righe.map((r) => `<li data-k="${esc(String(r.n != null ? r.n : r.nome))}"><span class="dish-n">${r.n != null ? esc(r.n) : ""}</span>
      <span><b>${esc(r.nome)}</b><small>${F ? "incluso" : `€ ${euro(r.prezzo)} l'uno`}</small></span>
      <span class="qty on"><button type="button" data-d="-1" aria-label="Togli uno">−</button><output>${r.q}</output><button type="button" data-d="1" aria-label="Aggiungi uno">+</button></span></li>`).join("")}</ul>
    ${fam ? `<p class="hint">💡 Hai ${n} piatti: con il <b>${esc(fam.f.nome)}</b> li paghi <b>€ ${euro(fam.f.prezzo)}</b> e c'è la bibita. Scrivilo nelle note.</p>` : ""}
    <div class="tabs2" role="tablist" aria-label="Consegna o ritiro">
      <button role="tab" type="button" data-modo-ord="consegna" aria-selected="${consegna}">🛵 Consegna</button>
      <button role="tab" type="button" data-modo-ord="ritiro" aria-selected="${!consegna}">🥡 Ritiro</button>
    </div>
    ${consegna ? `<div class="field"><label for="o-zona">Zona</label><select class="input" id="o-zona">${zone.map((z, i) => `<option value="${i}" ${i === d.zona ? "selected" : ""}>${esc(z.nome)} · consegna € ${euro(z.costo)}</option>`).join("")}</select></div>
      <div class="field"><label for="o-ind">Indirizzo</label><input class="input" id="o-ind" autocomplete="street-address" placeholder="Via, numero civico, citofono" value="${esc(d.indirizzo || "")}"></div>`
      : `<p class="hint">Ritiri da noi in ${esc(R.indirizzo || "")}.</p>`}
    <div class="field"><label for="o-ora">${consegna ? "Quando lo vuoi" : "Quando passi"}</label>
      ${chiusoOggi ? `<p class="notice">Oggi siamo chiusi: gli ordini riaprono domani.</p>`
        : chiuso ? `<p class="notice">Per oggi gli ordini sono chiusi. Si ordina dalle ${esc((ORD.fasce || []).map(([a, b]) => a + " alle " + b).join(" e dalle "))}.</p>`
        : `<select class="input" id="o-ora">${slots.map((t) => `<option ${t === d.ora ? "selected" : ""}>${t}</option>`).join("")}</select>`}</div>
    <div class="field"><label for="o-nome">Nome</label><input class="input" id="o-nome" autocomplete="name" value="${esc(d.nome || (user && user.nome) || "")}"></div>
    <div class="field"><label for="o-tel">Telefono</label><input class="input" id="o-tel" type="tel" inputmode="tel" autocomplete="tel" placeholder="+39 333 123 4567" value="${esc(d.telefono || store.get("yugo-draft", {}).telefono || "")}"></div>
    ${F && F.bibite ? `<div class="field"><label for="o-bib">Bibite in lattina incluse (${F.bibite})</label><input class="input" id="o-bib" placeholder="Coca-Cola, Fanta, Sprite…" value="${esc(d.bibita || "")}"></div>` : ""}
    <div class="field"><label for="o-note">Note (facoltativo)</label><textarea class="input" id="o-note" placeholder="Allergie, menu Family, bacchette…">${esc(d.note || "")}</textarea></div>
    <div class="ord-sum">
      <div><span>${F ? esc(F.nome) : "Piatti"}</span><span>€ ${euro(sub)}</span></div>
      ${consegna ? `<div><span>Consegna</span><span>€ ${euro(costo)}</span></div>` : ""}
      <div class="cs-total"><span>Totale</span><b>€ ${euro(tot)}</b></div>
    </div>
    <p class="hint">Paghi alla ${consegna ? "consegna" : "cassa quando ritiri"}.${sottoMinimo ? ` <b>Per la consegna l'ordine minimo è € ${euro(ORD.minimo)}.</b>` : ""}</p>
    <p class="error" id="o-err" hidden></p>
    <div class="cs-actions">
      ${user ? (mancano ? `<button class="btn btn-gold btn-block" type="button" disabled>Scegli ancora ${mancano} ${mancano === 1 ? "piatto" : "piatti"}</button>`
        : `<button class="btn btn-gold btn-block" id="o-send" type="button" ${chiuso || sottoMinimo ? "disabled" : ""}>Invia ordine · € ${euro(tot)}</button>`)
        : `<a href="#account" data-go="account" data-close class="btn btn-gold btn-block">Accedi per inviare l'ordine</a>`}
      ${ORD.justEat ? `<button class="btn btn-ghost btn-block" id="o-je" type="button">Ordina su Just Eat</button>
      <p class="hint" style="text-align:center">Su Just Eat i piatti vanno aggiunti di nuovo: ti copiamo la lista da seguire.</p>` : ""}
    </div>`;

  const leggi = () => {
    if ($("#o-zona")) d.zona = Number($("#o-zona").value);
    if ($("#o-ind")) d.indirizzo = $("#o-ind").value;
    if ($("#o-ora")) d.ora = $("#o-ora").value;
    d.nome = $("#o-nome").value; d.telefono = $("#o-tel").value; d.note = $("#o-note").value;
    if ($("#o-bib")) d.bibita = $("#o-bib").value;
    store.set("yugo-ordine-dati", { ...d, note: "" });
  };
  body.querySelectorAll("[data-modo-ord]").forEach((b) => b.onclick = () => { leggi(); d.modo = b.dataset.modoOrd; disegnaCarrello(); });
  if ($("#o-zona")) $("#o-zona").onchange = () => { leggi(); disegnaCarrello(); };
  body.querySelector(".ord-list").onclick = (e) => {
    const btn = e.target.closest("[data-d]"); if (!btn) return;
    const li = btn.closest("li"), r = carrello[li.dataset.k]; if (!r) return;
    leggi(); cambiaQta(r, Number(btn.dataset.d)); disegnaCarrello(); ridisegnaQta();
  };
  if ($("#o-je")) $("#o-je").onclick = async () => {
    leggi();
    const lista = righeCarrello().map((r) => `${r.q}× ${r.nome}${r.n != null ? ` (n. ${r.n})` : ""}`).join("\n");
    try { await navigator.clipboard.writeText(lista); toast("Lista copiata: su Just Eat aggiungi gli stessi piatti."); } catch { toast("Su Just Eat aggiungi gli stessi piatti della lista."); }
    window.open(ORD.justEat, "_blank", "noopener");
  };
  if ($("#o-send")) $("#o-send").onclick = async () => {
    leggi();
    const err = $("#o-err"), btn = $("#o-send"); err.hidden = true;
    const fail = (m) => { err.textContent = m; err.hidden = false; };
    if (!d.nome.trim()) return fail("Scrivi il tuo nome.");
    if (d.telefono.replace(/\D/g, "").length < 8) return fail("Serve un numero di telefono: ti chiamiamo se c'è un problema.");
    if (consegna && d.indirizzo.trim().length < 5) return fail("Scrivi l'indirizzo di consegna.");
    if (F && F.bibite && !(d.bibita || "").trim()) return fail("Scrivi quale bibita vuoi.");
    btn.disabled = true; btn.textContent = "Invio…";
    try {
      const ordine = { modo: d.modo, zona: consegna ? zona.nome : "", indirizzo: consegna ? d.indirizzo : "", ora: d.ora,
        nome: d.nome, telefono: d.telefono,
        note: (F && F.bibite ? `Bibite: ${(d.bibita || "").trim()}. ` : "") + d.note,
        righe: (F ? [{ n: null, nome: F.nome, prezzo: F.prezzo, q: 1 }] : []).concat(righeCarrello().map(({ n, nome, prezzo, q }) => ({ n, nome, prezzo: F ? 0 : prezzo, q }))) };
      const res = DEMO ? { ok: true, numero: Math.floor(Math.random() * 90) + 10 } : await api("/ordine", { idToken: await backend.token(), lang: (window.YUGO_I18N && window.YUGO_I18N.lang) || "it", ...ordine });
      carrello = {}; salvaCarrello(); aggiornaBarra(); ridisegnaQta();
      if (F) { FAM = null; store.set("yugo-family", null); disegnaFamily(); menuReset(); }
      body.innerHTML = `<div class="ord-ok"><div class="ord-check" aria-hidden="true">✓</div>
        <p class="cs-kicker">Ordine n. ${esc(res.numero)} inviato</p><h2 id="ord-title">Grazie ${esc(d.nome.split(" ")[0])}!</h2>
        <p class="muted">Il ristorante l'ha ricevuto ora. ${consegna ? "Ti portiamo tutto" : "Ti aspettiamo"} per le ${esc(d.ora)}. Se c'è un problema ti chiamiamo al ${esc(d.telefono)}.</p>
        <p class="hint">Per modifiche chiama il ${esc(R.telefono || "")}.</p>
        <button class="btn btn-block" type="button" data-close>Chiudi</button></div>`;
    } catch (ex) { fail(ex.message); btn.disabled = false; btn.textContent = `Invia ordine · € ${euro(tot)}`; }
  };
}
function ridisegnaQta() {
  document.querySelectorAll("#menu-list .qty[data-k]").forEach((el) => {
    const p = el.closest(".dish") && el.closest(".dish").__p; if (p) el.outerHTML = qtyHTML(p);
  });
}

function renderMenu() {
  const chips = $("#menu-chips");
  let cats = [];
  const draw = (sel) => {
    const shop = !!ORD && MODO === "casa";
    $("#menu-list").classList.toggle("shop", shop);
    $("#menu-list").innerHTML = cats.map((c, i) => (sel === "all" || String(i) === sel) ? `
      <section class="menu-cat"><h2>${esc(c.categoria)}</h2>
        ${c.piatti.map((p, j) => c.extra ? `<div class="dish">${p.n != null ? `<span class="dish-n">${esc(p.n)}</span>` : `<span></span>`}<span class="dish-name">${esc(pul(p.nome))}</span><span class="dish-price">${p.prezzo != null ? "€ " + euro(p.prezzo) : ""}</span>${p.desc ? `<span class="dish-sub">${esc(pul(p.desc))}</span>` : ""}</div>` : `<div class="dish${p.desc ? " has-desc" : ""}">${p.n != null ? `<span class="dish-n">${esc(p.n)}</span>` : `<span></span>`}<span class="dish-name">${esc(pul(p.nome))}${p.max1 ? `<small class="dish-max">max 1 a persona</small>` : ""}</span><span class="dish-price">${p.prezzo != null ? "€ " + euro(famAtt() ? 0 : p.prezzo) : ""}</span>${shop && p.prezzo != null ? qtyHTML(p) : ""}${p.desc ? `<button type="button" class="dish-more" aria-expanded="false" aria-controls="dd-${i}-${j}"><span>Ingredienti</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button><div class="dish-desc" id="dd-${i}-${j}"><div>${esc(pul(p.desc))}</div></div>` : ""}</div>`).join("")}
      </section>` : "").join("");
    // ricorda il piatto di ogni riga, serve al carrello
    const flat = []; cats.forEach((c, i) => { if (sel === "all" || String(i) === sel) c.piatti.forEach((p) => flat.push(p)); });
    document.querySelectorAll("#menu-list .dish").forEach((el, i) => { el.__p = flat[i]; });
    aggiornaBarra();
  };
  menuReset = () => {
    cats = menuAttivo();
    chips.innerHTML = `<button class="chip" role="tab" aria-selected="true" data-cat="all" id="chip-all">Tutto</button>` +
      cats.map((c, i) => `<button class="chip" role="tab" aria-selected="false" data-cat="${i}" id="chip-${i}">${esc(c.categoria)}</button>`).join("");
    $("#cat-label").textContent = "Categorie";
    draw("all");
  };
  const toggle = $("#cat-toggle");
  const apriCat = (open) => { chips.hidden = !open; toggle.setAttribute("aria-expanded", String(open)); };
  toggle.addEventListener("click", () => apriCat(chips.hidden));
  chips.addEventListener("click", (e) => {
    const b = e.target.closest(".chip"); if (!b) return;
    chips.querySelectorAll(".chip").forEach((x) => x.setAttribute("aria-selected", String(x === b)));
    $("#cat-label").textContent = b.dataset.cat === "all" ? "Categorie" : b.textContent;
    draw(b.dataset.cat);
    apriCat(false);
    $("#menu-list").scrollIntoView({ behavior: "smooth", block: "start" });
  });
  $("#ai-open").addEventListener("click", apriConsiglio);
  // Scelta "Al ristorante" / "A casa"
  $("#mode-pick").addEventListener("click", (e) => {
    const b = e.target.closest("[data-modo]"); if (!b) return;
    MODO = b.dataset.modo;
    try { sessionStorage.setItem("yugo-modo", MODO); } catch { /* ok */ }
    mostraModo(); menuReset(); apriCat(false); aggiornaBarra();
    window.scrollTo({ top: 0 });
  });
  $("#mode-change").addEventListener("click", () => {
    MODO = null;
    try { sessionStorage.removeItem("yugo-modo"); } catch { /* ok */ }
    mostraModo(); aggiornaBarra(); window.scrollTo({ top: 0 });
  });
  $("#cart-bar").addEventListener("click", apriCarrello);
  menuReset();
  mostraModo();
  // Alle 16:00 (e a mezzanotte) il menu passa da solo da pranzo a cena e viceversa
  let ultimoServizio = servizio();
  const controllaServizio = () => {
    const s = servizio(); if (s === ultimoServizio) return;
    ultimoServizio = s; renderHome(); mostraModo(); menuReset();
  };
  setInterval(controllaServizio, 60000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) controllaServizio(); });
  // Freccetta "Ingredienti": tocca il piatto per aprire o chiudere la descrizione
  $("#menu-list").addEventListener("click", (e) => {
    const qb = e.target.closest(".qty [data-d]");
    if (qb) {
      const dish = qb.closest(".dish"), p = dish && dish.__p; if (!p) return;
      cambiaQta(p, Number(qb.dataset.d));
      const nuovo = qtyHTML(p); qb.closest(".qty").outerHTML = nuovo;
      if (Number(qb.dataset.d) > 0) { const q = dish.querySelector(".qty"); q.classList.add("pop"); }
      return;
    }
    const d = e.target.closest(".dish.has-desc"); if (!d) return;
    const b = d.querySelector(".dish-more"), open = b.getAttribute("aria-expanded") !== "true";
    b.setAttribute("aria-expanded", String(open)); d.classList.toggle("open", open);
  });
}

/* ------------------------------------------------------------------ */
/* "Non sai cosa prendere?": poche domande e una proposta di menu      */
/* ------------------------------------------------------------------ */
const RX = {
  carne: /pollo|manzo|carne|suino|salsiccia|prosciutto|\btori\b/i,
  pesce: /salmon|salmone|tonno|tuna|gamber|branzino|granchio|surimi|calamar|polip|seppi|totani|di mare|scampi|merluzzo|ikura|tobiko|\bebi\b|ebiten|\bsake\b|maguro|tekka|crab|amaebi|sashimi|fish|tartare|carpaccio/i,
  veg: /verdur|vegetar|tofu|edamame|wakame|avocado|patat|insalata|riso bianco|pane|miso|philadelphia|mais/i,
  piccante: /spicy|piccant|chili/i,
  crudoPesce: /salmon|salmone|tonno|tuna|branzino|sashimi|tartare|carpaccio|maguro|\bsake\b|tekka|amaebi|crudo/i,
  cotto: /cott|fritt|tempura|grigliat|ebiten|surimi|vapore|saltat|wok|brodo/i
};
const CAT_CRUDO = /nighiri|hosso|hakozushi|uramaki|black roll|gunkan|temaki|tataki|sashimi|tartare|carpaccio|special/i;
const CAT_INIZIO = /antipasti|dim sum|fritti|stuzzichini|zuppe/i;
const CAT_SPECIALE = /piatti special|special roll/i;

function catalogo() {
  const out = [];
  menuAttivo().forEach((c, ci) => !c.extra && c.piatti.forEach((p) => {
    if (p.prezzo == null) return;
    const t = `${p.nome} ${p.desc || ""}`;
    const carne = RX.carne.test(t), pesce = RX.pesce.test(t);
    const crudo = CAT_CRUDO.test(c.categoria) && RX.crudoPesce.test(t) && !RX.cotto.test(t);
    out.push({ ...p, cat: c.categoria, ci, carne, pesce, veg: !carne && !pesce && RX.veg.test(t), crudo,
      piccante: RX.piccante.test(t), inizio: CAT_INIZIO.test(c.categoria), speciale: CAT_SPECIALE.test(c.categoria),
      contorno: /contorni|primi/i.test(c.categoria) && p.prezzo <= 5 });
  }));
  return out;
}

const DOMANDE = [
  { k: "crudo", t: "Ti piace il pesce crudo?", s: "Sashimi, tartare, nighiri…", o: [["si", "Sì, adoro il crudo"], ["no", "No, solo cotto"], ["tutto", "Mi va bene tutto"]] },
  { k: "tipo", t: "Cosa preferisci?", o: [["pesce", "Pesce"], ["carne", "Carne"], ["veg", "Vegetariano"], ["tutto", "Un po' di tutto"]] },
  { k: "piccante", t: "E il piccante?", o: [["si", "Sì, mi piace"], ["no", "Niente piccante"], ["tutto", "Indifferente"]] },
  { k: "persone", t: "Quanti siete?", numero: true },
  { k: "budget", t: "Quanto volete spendere a testa?", o: [[10, "Circa € 10"], [15, "Circa € 15"], [20, "Circa € 20"], [30, "€ 30 o più"]] }
];
let scelte = {};

function apriConsiglio() {
  scelte = { persone: 2 };
  const s = $("#consiglio"); s.hidden = false; document.documentElement.classList.add("no-scroll");
  domanda(0);
}
function chiudiConsiglio() { $("#consiglio").hidden = true; document.documentElement.classList.remove("no-scroll"); }
document.addEventListener("click", (e) => { if (e.target.closest("#consiglio [data-close]")) chiudiConsiglio(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !$("#consiglio").hidden) chiudiConsiglio(); });

function domanda(i) {
  const d = DOMANDE[i], body = $("#cs-body");
  const passi = DOMANDE.map((_, j) => `<span class="${j < i ? "done" : j === i ? "now" : ""}"></span>`).join("");
  body.innerHTML = `<div class="cs-steps" aria-hidden="true">${passi}</div>
    <p class="cs-kicker">Domanda ${i + 1} di ${DOMANDE.length}</p>
    <h2 id="cs-title">${esc(d.t)}</h2>${d.s ? `<p class="muted">${esc(d.s)}</p>` : ""}
    ${d.numero ? `<div class="stepper cs-stepper" role="group" aria-label="Persone">
        <button type="button" id="cs-minus" aria-label="Una persona in meno">−</button><output id="cs-num">${scelte.persone}</output>
        <button type="button" id="cs-plus" aria-label="Una persona in più">+</button></div>
        <button class="btn btn-gold btn-block" id="cs-next" type="button">Avanti</button>`
      : `<div class="cs-options">${d.o.map(([v, l]) => `<button type="button" class="cs-opt" data-v="${v}">${esc(l)}</button>`).join("")}</div>`}
    ${i > 0 ? `<button type="button" class="linkbtn cs-back" id="cs-back">Indietro</button>` : ""}`;
  body.querySelector(".cs-opt, #cs-next")?.focus();
  if (d.numero) {
    const out = $("#cs-num");
    $("#cs-minus").onclick = () => { scelte.persone = Math.max(1, scelte.persone - 1); out.textContent = scelte.persone; };
    $("#cs-plus").onclick = () => { scelte.persone = Math.min(12, scelte.persone + 1); out.textContent = scelte.persone; };
    $("#cs-next").onclick = () => domanda(i + 1);
  } else {
    body.querySelectorAll(".cs-opt").forEach((b) => b.onclick = () => {
      scelte[d.k] = d.k === "budget" ? Number(b.dataset.v) : b.dataset.v;
      i + 1 < DOMANDE.length ? domanda(i + 1) : proposta();
    });
  }
  if ($("#cs-back")) $("#cs-back").onclick = () => domanda(i - 1);
}

function proposta() {
  const { crudo, tipo, piccante, persone, budget } = scelte;
  let pool = catalogo().filter((p) => {
    if (tipo === "pesce" && !((p.pesce && !p.carne) || p.veg)) return false;
    if (tipo === "carne" && !((p.carne && !p.pesce) || p.veg)) return false;
    if (tipo === "veg" && !p.veg) return false;
    if (crudo === "no" && p.crudo) return false;
    if (piccante === "no" && p.piccante) return false;
    return true;
  });
  const peso = (p) => {
    let w = 1;
    if (crudo === "si" && p.crudo) w *= 4;
    if (piccante === "si" && p.piccante) w *= 2.5;
    if (tipo === "pesce" && p.pesce) w *= 2;
    if (tipo === "carne" && p.carne) w *= 3;
    if (p.contorno && tipo !== "veg") w *= .35;
    if (budget >= 20 && p.prezzo >= 9) w *= 1.6;
    if (budget <= 10 && p.prezzo > 8) w *= .3;
    return w;
  };
  const totale = persone * budget, maxPiatti = persone * 3 + 1;
  const ordina = (arr) => arr.map((p) => ({ p, k: Math.pow(Math.random(), 1 / peso(p)) })).sort((a, b) => b.k - a.k).map((x) => x.p);
  const scelti = []; let somma = 0;
  const prova = (p) => { if (scelti.includes(p) || somma + p.prezzo > totale || scelti.length >= maxPiatti) return false; scelti.push(p); somma += p.prezzo; return true; };
  const inizi = ordina(pool.filter((p) => p.inizio));
  if (inizi.length && (persone >= 2 || budget >= 15)) prova(inizi[0]);
  if (persone >= 4 && inizi[1]) prova(inizi[1]);
  const perCat = {};
  for (const p of ordina(pool.filter((p) => !p.inizio))) {
    if ((perCat[p.ci] || 0) >= Math.max(1, Math.ceil(persone / 2))) continue;
    if (prova(p)) perCat[p.ci] = (perCat[p.ci] || 0) + 1;
  }
  for (const p of ordina(pool)) prova(p);
  scelti.sort((a, b) => a.ci - b.ci || (a.n || 0) - (b.n || 0));

  const body = $("#cs-body");
  if (!scelti.length) {
    body.innerHTML = `<h2 id="cs-title">Nessuna proposta</h2><p class="muted">Con queste scelte non troviamo piatti nel budget. Prova ad alzare la cifra o a cambiare qualche risposta.</p>
      <button class="btn btn-block" id="cs-again" type="button">Ricomincia</button>`;
    $("#cs-again").onclick = apriConsiglio; return;
  }
  const famiglie = [{ n: "F2", piatti: 6, prezzo: 30, spec: 1 }, { n: "F3", piatti: 8, prezzo: 40, spec: 2 }, { n: "F4", piatti: 12, prezzo: 60, spec: 3 }];
  const nSpec = scelti.filter((p) => p.speciale).length;
  const fam = famiglie.find((f) => scelti.length === f.piatti && nSpec <= f.spec && somma > f.prezzo);
  body.innerHTML = `<p class="cs-kicker">La nostra proposta</p>
    <h2 id="cs-title">Per ${persone} ${persone === 1 ? "persona" : "persone"}</h2>
    <ul class="cs-list">${scelti.map((p) => `<li><span class="dish-n">${p.n != null ? esc(p.n) : ""}</span><span><b>${esc(pul(p.nome))}</b><small>${esc(p.cat)}</small></span><span class="cs-price">€ ${euro(p.prezzo)}</span></li>`).join("")}</ul>
    <div class="cs-total"><span>Totale</span><b>€ ${euro(somma)}</b></div>
    <p class="hint">Circa € ${euro(somma / persone)} a testa${MODO === "ristorante"
      ? (aycePrezzo() && somma / persone >= aycePrezzo() * 0.67 ? ` · ${aPranzo() ? "A pranzo" : "A cena"} con l'<b>All You Can Eat</b> paghi <b>€ ${euro(aycePrezzo())}</b> a testa e mangi quanto vuoi` : "")
      : (fam ? ` · Con il <b>menu Family ${fam.n}</b> (${fam.piatti} piatti) lo paghi <b>€ ${fam.prezzo}</b> e c'è anche la bibita` : "")}.</p>
    <p class="hint">${MODO === "ristorante" && !(R.menuRistorante && R.menuRistorante.length) ? "Prezzi del menu da asporto: al tavolo possono cambiare. " : ""}Per allergie e intolleranze chiedi sempre al personale.</p>
    <div class="cs-actions">
      ${ORD && MODO === "casa" ? `<button class="btn btn-gold btn-block" id="cs-cart" type="button">🛒 Aggiungi tutto all'ordine</button>` : ""}
      <button class="btn ${ORD && MODO === "casa" ? "btn-ghost" : "btn-gold"} btn-block" id="cs-shuffle" type="button">Un'altra proposta</button>
      <a class="btn btn-ghost btn-block" href="#prenota" data-go="prenota" data-close>Prenota un tavolo</a>
      <button type="button" class="linkbtn" id="cs-restart">Rispondi di nuovo</button>
    </div>`;
  $("#cs-shuffle").onclick = proposta;
  if ($("#cs-cart")) $("#cs-cart").onclick = () => {
    scelti.forEach((p) => cambiaQta(p, 1));
    ridisegnaQta(); chiudiConsiglio();
    toast(`${scelti.length} piatti aggiunti all'ordine.`);
  };
  $("#cs-restart").onclick = apriConsiglio;
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
  if (!user.verified) return verifyBox(area);

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
    if (groups === null) { sel.innerHTML = ""; closed.textContent = `Il ${fmtData(val)} siamo chiusi. Scegli un altro giorno.`; closed.hidden = false; }
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
      creataIl: nowStamp(), creataIlISO: new Date().toISOString(), stato: "confermata"
    };
    try {
      b.quandoMs = bookingMs(b);
      b.id = await backend.save(b);
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
        <h2>${esc(cap(fmtData(b.data)))}, ore ${esc(b.ora)}</h2>
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
    ${!user.verified ? `<div class="vbox" id="acc-verify" style="margin-bottom:14px"></div>` : ""}
    <div class="stack" style="margin-top:0">
      <article class="block"><h2>Le mie prenotazioni</h2><div id="my-list" class="blist"><p class="muted">Caricamento…</p></div></article>
      ${installBlock()}
      <a class="btn btn-ghost" href="gestore.html">🔒 Gestore</a>
      <button class="btn btn-ghost" id="btn-logout">Esci dall'account</button>
      <p class="legal"><a href="privacy.html">Informativa privacy</a> · Per cancellare l'account chiama il ${esc(R.telefono || "")}.</p>
    </div>`;
  $("#btn-logout").onclick = async () => { await backend.logout(); lastBooking = null; toast("Sei uscito."); };
  if (!user.verified) verifyBox($("#acc-verify"));
  const annRist = WORKER && !DEMO ? backend.token().then((t) => api("/prenotazioni/annullate", { idToken: t })).then((d) => d.docs || []).catch(() => []) : Promise.resolve([]);
  Promise.all([backend.mine(user.uid), annRist]).then(([list, daRist]) => {
    list.forEach((b) => { if (daRist.includes(b.id)) { b.stato = "annullata"; b.daRistorante = true; } });
    const el = $("#my-list"); if (!el) return;
    if (!list.length) { el.innerHTML = `<p class="muted">Nessuna prenotazione per ora.</p><a href="#prenota" data-go="prenota" class="btn">Prenota un tavolo</a>`; return; }
    const todayS = isoDate(new Date());
    list.sort((a, b) => (b.data + b.ora).localeCompare(a.data + a.ora));
    const now = Date.now();
    const telLink = (R.telefono || "").replace(/[^\d+]/g, "");
    el.innerHTML = list.map((b) => {
      const d = parseISO(b.data);
      const t = b.quandoMs || bookingMs(b);
      const annullata = b.stato === "annullata";
      const passata = t < now;
      const puoi = !annullata && !passata && t - now > ORA_LIMITE;
      const tardi = !annullata && !passata && !puoi;
      return `<div class="bitem ${passata || annullata ? "past" : ""}">
        <div class="bdate"><b>${d.getDate()}</b><span>${d.toLocaleDateString(LOC(), { month: "short" })}</span></div>
        <div class="binfo"><strong>${esc(cap(d.toLocaleDateString(LOC(), { weekday: "long" })))} · ore ${esc(b.ora)}</strong>${annullata ? ` <span class="tag-off">${b.daRistorante ? "Annullata dal ristorante" : "Annullata"}</span>` : ""}<br><span class="muted">${b.persone} ${b.persone === 1 ? "persona" : "persone"} · a nome ${esc(b.nome)}</span>
          ${puoi ? `<div class="bactions"><button class="btn btn-ghost btn-sm" data-cancel="${esc(b.id)}">Annulla prenotazione</button></div>` : ""}
          ${annullata || passata ? `<div class="bactions"><button class="btn btn-ghost btn-sm" data-del="${esc(b.id)}">Elimina dalla lista</button></div>` : ""}
          ${tardi ? `<p class="hint tardi">Manca meno di un'ora: per annullare chiama il ristorante al <a href="tel:${telLink}">${esc(R.telefono || "")}</a>.</p>` : ""}
        </div>
      </div>`;
    }).join("");
    el.querySelectorAll("[data-cancel]").forEach((btn) => btn.addEventListener("click", () => askCancel(btn, list.find((x) => x.id === btn.dataset.cancel))));
    el.querySelectorAll("[data-del]").forEach((btn) => btn.addEventListener("click", async () => {
      const item = btn.closest(".bitem"); btn.disabled = true;
      try {
        const b0 = list.find((x) => x.id === btn.dataset.del);
        if (b0 && b0.daRistorante) await backend.cancel(b0.id).catch(() => {}); // prima la segno annullata anche su Firebase
        await backend.remove(btn.dataset.del);
        item.classList.add("bye"); setTimeout(() => { item.remove(); if (!el.querySelector(".bitem")) renderAccount(); }, 350);
        toast("Prenotazione eliminata dalla lista.");
      } catch { btn.disabled = false; toast("Non sono riuscito a eliminarla. Riprova."); }
    }));
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
        ${reg ? `<p class="hint">Ti mandiamo un'email per confermare l'indirizzo.</p><p class="hint">Creando l'account confermi di aver letto l'<a href="privacy.html">informativa privacy</a>.</p>` : `<button type="button" class="linkbtn" id="a-forgot">Password dimenticata?</button>`}
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
      if (reg) await inviaVerifica().catch(() => {});
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
  renderPromo();
  requestAnimationFrame(drawWaves);
  const initial = (location.hash || "").replace("#", "");
  if (INVITO) { go("invito", false); renderLanding(INVITO); }
  else go(VIEWS.includes(initial) && initial !== "invito" ? initial : "home", false);
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
    if (current === "promo") renderInvite();
  });
  if ("serviceWorker" in navigator && location.protocol === "https:" && !document.body.classList.contains("embed")) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
}
start();
