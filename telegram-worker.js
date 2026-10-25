/* =====================================================================
   YUGO – "Cervello" del bot su Cloudflare Workers
   Gira 24 ore su 24 sui server di Cloudflare: il Mac può stare spento.

   Fa tre cose:
   1. Manda nel gruppo Telegram prenotazioni, annullamenti e ordini da casa (italiano + cinese).
   2. Gestisce il programma "Invita amici": iscrizioni, follower, barre, coupon.
   3. Riceve i comandi del bot: /ok /no /usato /coupon /classifica

   Su Cloudflare servono solo due cose:
     - un database D1 collegato con il nome DB   (Settings → Bindings)
     - il segreto TELEGRAM_TOKEN = token del bot  (Settings → Variables and Secrets)
   Poi apri una volta:  https://<indirizzo-del-worker>/setup
   ===================================================================== */

const CONFIG = {
  CHAT_ID: "-5444686738",                                   // gruppo "Prenotazioni Yugo"
  CHAT_ORDINI: "",                                          // gruppo per gli ordini da casa (vuoto = stesso gruppo)
  FIREBASE_API_KEY: "AIzaSyAEnC8afPxW6XJhdZnfiTTHxZ1qun_MFwc", // pubblica, è la stessa del sito
  ORIGINE: "https://yugosestri-creator.github.io",
  PREMI: ["una bibita in omaggio", "un dolce in omaggio", "−10% sul conto", "un antipasto in omaggio", "−15% sul conto", "una bottiglia di vino oppure 5 bibite", "−20% sul conto", "una cena gratis", "una cena gratis + 15% di sconto quando torni"]
};
const LIVELLI = [2, 10, 25, 30, 40, 55, 70, 90, 110];
const target = (livello) => LIVELLI[Math.min(livello, LIVELLI.length - 1)];

const GIORNI = ["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"];
const MESI = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];
const ZH_GIORNI = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS promoter (
     id INTEGER PRIMARY KEY AUTOINCREMENT, uid TEXT UNIQUE NOT NULL, email TEXT,
     nome TEXT NOT NULL, telefono TEXT NOT NULL, codice TEXT UNIQUE NOT NULL,
     livello INTEGER NOT NULL DEFAULT 0, consumati INTEGER NOT NULL DEFAULT 0, creato TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS follow (
     id INTEGER PRIMARY KEY AUTOINCREMENT, codice TEXT NOT NULL, username TEXT NOT NULL UNIQUE,
     piattaforma TEXT, stato TEXT NOT NULL DEFAULT 'attesa', ip TEXT, creato TEXT NOT NULL, deciso TEXT)`,
  `CREATE INDEX IF NOT EXISTS follow_codice ON follow (codice, stato)`,
  `CREATE TABLE IF NOT EXISTS ordini (
     id INTEGER PRIMARY KEY AUTOINCREMENT, uid TEXT NOT NULL, email TEXT, totale REAL, creato TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS coupon (
     codice TEXT PRIMARY KEY, promoter_id INTEGER NOT NULL, livello INTEGER NOT NULL,
     stato TEXT NOT NULL DEFAULT 'valido', creato TEXT NOT NULL, usato TEXT)`,
  `CREATE TABLE IF NOT EXISTS prenot (
     id INTEGER PRIMARY KEY AUTOINCREMENT, doc TEXT, uid TEXT NOT NULL, email TEXT, nome TEXT, telefono TEXT,
     data TEXT, ora TEXT, persone INTEGER, stato TEXT NOT NULL DEFAULT 'confermata', creato TEXT NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS prenot_uid ON prenot (uid, stato)`,
  `CREATE TABLE IF NOT EXISTS gestore_codice (id INTEGER PRIMARY KEY CHECK (id = 1), codice TEXT NOT NULL, msgId INTEGER, scade INTEGER NOT NULL, creato INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS gestore_sess (token TEXT PRIMARY KEY, scade INTEGER NOT NULL, creato INTEGER NOT NULL, ip TEXT)`,
  `CREATE TABLE IF NOT EXISTS gestore_tent (ip TEXT PRIMARY KEY, n INTEGER NOT NULL DEFAULT 0, blocco INTEGER NOT NULL DEFAULT 0, ultimo INTEGER NOT NULL)`
];
const NUOVE_COLONNE = ["ALTER TABLE ordini ADD COLUMN stato TEXT DEFAULT 'inviato'", "ALTER TABLE ordini ADD COLUMN nome TEXT",
  "ALTER TABLE ordini ADD COLUMN telefono TEXT", "ALTER TABLE ordini ADD COLUMN ora TEXT", "ALTER TABLE ordini ADD COLUMN lang TEXT"];
let schemaPronto = false;
async function init(env) {
  if (schemaPronto) return;
  await env.DB.batch(SCHEMA.map((s) => env.DB.prepare(s)));
  for (const q of NUOVE_COLONNE) await env.DB.prepare(q).run().catch(() => {}); // già presenti: ok
  schemaPronto = true;
}

/* ---------------- utilità ---------------- */
const adessoISO = () => new Date().toISOString();
function oraRoma(iso) {
  const d = iso ? new Date(iso) : new Date();
  const p = Object.fromEntries(new Intl.DateTimeFormat("it-IT", {
    timeZone: "Europe/Rome", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false
  }).formatToParts(d).map((x) => [x.type, x.value]));
  return { it: `${p.day}/${p.month}/${p.year} alle ${p.hour}:${p.minute}`, zh: `${p.year}年${+p.month}月${+p.day}日 ${p.hour}:${p.minute}` };
}
const pulisci = (s, max) => String(s ?? "").replace(/[\u0000-\u001f]/g, " ").trim().slice(0, max);

async function tg(env, text, chatId) {
  const r = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId || CONFIG.CHAT_ID, text, disable_web_page_preview: true })
  });
  return (await r.json().catch(() => ({}))).ok === true;
}

async function utente(env, idToken) {
  const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${CONFIG.FIREBASE_API_KEY}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ idToken: String(idToken || "") })
  });
  const d = await r.json().catch(() => ({}));
  const u = d.users && d.users[0];
  return u ? { uid: u.localId, email: u.email, verificato: !!u.emailVerified } : null;
}

/* Parola segreta del webhook: ricavata dal token, così non serve inserirla a mano */
async function segreto(env) {
  const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("yugo:" + env.TELEGRAM_TOKEN));
  return [...new Uint8Array(h)].slice(0, 16).map((b) => b.toString(16).padStart(2, "0")).join("");
}

class Errore extends Error { constructor(msg, status = 400) { super(msg); this.status = status; } }

/* ---------------- prenotazioni ---------------- */
function testoPrenotazione(b, email, tipo) {
  const no = tipo === "annullata";
  const [y, m, d] = b.data.split("-").map(Number);
  const g = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  const ora = oraRoma();
  const it = [
    no ? "❌ PRENOTAZIONE ANNULLATA – Yugo" : "🍣 NUOVA PRENOTAZIONE – Yugo", "",
    `👤 ${b.nome}`, `👥 ${b.persone} ${b.persone === 1 ? "persona" : "persone"}`,
    `📅 ${GIORNI[g]} ${d} ${MESI[m - 1]}`, `🕗 Arrivo previsto: ${b.ora}`,
    b.telefono ? `📞 ${b.telefono}` : null, `✉️ ${email}`, b.note ? `📝 ${b.note}` : null, "",
    no ? `⏱ Annullata il ${ora.it}` : `⏱ Richiesta fatta il ${ora.it}`
  ];
  const zh = [
    no ? "❌ 预订已取消 – Yugo" : "🍣 新预订 – Yugo", "",
    `👤 姓名：${b.nome}`, `👥 人数：${b.persone}人`,
    `📅 日期：${m}月${d}日 ${ZH_GIORNI[g]}`, `🕗 预计到达：${b.ora}`,
    b.telefono ? `📞 电话：${b.telefono}` : null, `✉️ 邮箱：${email}`, b.note ? `📝 备注：${b.note}` : null, "",
    no ? `⏱ 取消时间：${ora.zh}` : `⏱ 提交时间：${ora.zh}`
  ];
  return [...it, "", "— — — — — — —", "", ...zh].filter((r) => r !== null).join("\n");
}

async function prenotazione(env, body) {
  const u = await utente(env, body.idToken);
  if (!u || !u.verificato) throw new Errore("Utente non autorizzato", 401);
  const b = {
    nome: pulisci(body.nome, 80), persone: Math.max(1, Math.min(60, parseInt(body.persone, 10) || 0)),
    data: /^\d{4}-\d{2}-\d{2}$/.test(body.data) ? body.data : null, ora: /^\d{2}:\d{2}$/.test(body.ora) ? body.ora : null,
    telefono: pulisci(body.telefono, 30), note: pulisci(body.note, 300)
  };
  if (!b.nome || !b.data || !b.ora) throw new Errore("Mancano nome, giorno o ora");
  const annulla = body.tipo === "annullata", doc = pulisci(body.id, 60);
  await init(env);
  let numero = null;
  if (annulla) {
    if (doc) await env.DB.prepare("UPDATE prenot SET stato = 'annullata' WHERE doc = ? AND uid = ?").bind(doc, u.uid).run();
  } else {
    const [y, m, d] = b.data.split("-").map(Number);
    if (GIORNI_CHIUSI.includes(new Date(Date.UTC(y, m - 1, d)).getUTCDay())) throw new Errore("Il martedì siamo chiusi. Scegli un altro giorno.");
    const ins = await env.DB.prepare("INSERT INTO prenot (doc, uid, email, nome, telefono, data, ora, persone, creato) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .bind(doc || null, u.uid, u.email, b.nome, b.telefono, b.data, b.ora, b.persone, adessoISO()).run();
    numero = ins.meta && ins.meta.last_row_id;
  }
  let testo = testoPrenotazione(b, u.email, annulla ? "annullata" : "nuova");
  if (numero) testo += `\n\n🔁 Per annullarla / 取消：/annulla P${numero}`;
  if (!(await tg(env, testo))) throw new Errore("Telegram non ha accettato il messaggio", 502);
  return { ok: true };
}


/* ---------------- ordini da casa ---------------- */
const ZONE = { "Sestri Levante": 1, "Riva Trigoso": 2.5, "Casarza Ligure": 3.5, "Moneglia": 5 };
const GIORNI_CHIUSI = [2]; // martedì chiuso
function giornoRoma() {
  const g = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Rome", weekday: "short" }).format(new Date());
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(g);
}
const FASCE = [["12:00", "14:30"], ["19:00", "22:00"]]; // orari di consegna/ritiro; dopo le 14:30 e le 22:00 niente ordini
const MINIMO = 20;
const eur = (n) => "€ " + n.toFixed(2).replace(".", ",");
const minuti = (hhmm) => { const [h, m] = hhmm.split(":").map(Number); return h * 60 + m; };
function minutiRoma() {
  const p = Object.fromEntries(new Intl.DateTimeFormat("it-IT", { timeZone: "Europe/Rome", hour: "2-digit", minute: "2-digit", hour12: false })
    .formatToParts(new Date()).map((x) => [x.type, x.value]));
  return (+p.hour % 24) * 60 + +p.minute;
}

async function ordine(env, body) {
  const u = await utente(env, body.idToken);
  if (!u || !u.verificato) throw new Errore("Accedi con un account confermato per ordinare", 401);
  const consegna = body.modo === "consegna";
  const righe = (Array.isArray(body.righe) ? body.righe : []).slice(0, 60).map((r) => ({
    n: Number.isInteger(r.n) ? r.n : null, nome: pulisci(r.nome, 80),
    q: Math.max(0, Math.min(20, parseInt(r.q, 10) || 0)), prezzo: Math.max(0, Math.min(200, Number(r.prezzo) || 0))
  })).filter((r) => r.q > 0 && r.nome);
  if (!righe.length) throw new Errore("L'ordine è vuoto");
  const o = {
    nome: pulisci(body.nome, 80), telefono: pulisci(body.telefono, 30), note: pulisci(body.note, 400),
    indirizzo: pulisci(body.indirizzo, 160), zona: pulisci(body.zona, 40), ora: /^\d{2}:\d{2}$/.test(body.ora) ? body.ora : ""
  };
  if (!o.nome || o.telefono.replace(/\D/g, "").length < 8) throw new Errore("Servono nome e telefono");
  if (!o.ora) throw new Errore("Scegli l'orario");
  if (GIORNI_CHIUSI.includes(giornoRoma())) throw new Errore("Oggi siamo chiusi: gli ordini riaprono domani.");
  const ora = minutiRoma();
  const dentro = FASCE.some(([a, b]) => ora <= minuti(b) && minuti(o.ora) >= minuti(a) && minuti(o.ora) <= minuti(b) + 30 && minuti(o.ora) >= ora + 15);
  if (!dentro) throw new Errore("Orario non disponibile. Si ordina dalle 12:00 alle 14:30 e dalle 19:00 alle 22:00");
  const sub = Math.round(righe.reduce((a, r) => a + r.q * r.prezzo, 0) * 100) / 100;
  let costo = 0;
  if (consegna) {
    if (!(o.zona in ZONE)) throw new Errore("Zona di consegna non valida");
    if (o.indirizzo.length < 5) throw new Errore("Manca l'indirizzo");
    if (sub < MINIMO) throw new Errore(`Per la consegna l'ordine minimo è ${eur(MINIMO)}`);
    costo = ZONE[o.zona];
  }
  const recenti = await env.DB.prepare("SELECT COUNT(*) AS n FROM ordini WHERE uid = ? AND creato > ?")
    .bind(u.uid, new Date(Date.now() - 12 * 3600e3).toISOString()).first();
  if (recenti && recenti.n >= 5) throw new Errore("Hai già inviato diversi ordini oggi: per altri chiama il ristorante", 429);
  const tot = Math.round((sub + costo) * 100) / 100;
  const ins = await env.DB.prepare("INSERT INTO ordini (uid, email, totale, creato, nome, telefono, ora, lang) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
    .bind(u.uid, u.email, tot, adessoISO(), o.nome, o.telefono, o.ora, pulisci(body.lang, 5) || "it").run();
  const numero = ins.meta && ins.meta.last_row_id;

  const quando = `Alle ${o.ora}`;
  const lista = righe.map((r) => `${r.q}× ${r.n != null ? r.n + " " : ""}${r.nome} — ${eur(r.q * r.prezzo)}`);
  const t = oraRoma();
  const it = [
    consegna ? `🛵 NUOVO ORDINE n. ${numero} – CONSEGNA` : `🥡 NUOVO ORDINE n. ${numero} – RITIRO`, "",
    `👤 ${o.nome}`, `📞 ${o.telefono}`,
    consegna ? `📍 ${o.indirizzo} (${o.zona})` : "📍 Ritiro al ristorante",
    `🕗 ${quando}`, "", ...lista, "",
    consegna ? `Piatti ${eur(sub)} + consegna ${eur(costo)}` : null, `💶 TOTALE ${eur(tot)} – paga alla ${consegna ? "consegna" : "cassa"}`,
    o.note ? `📝 ${o.note}` : null, `✉️ ${u.email}`, `⏱ Inviato il ${t.it}`
  ];
  const zh = [
    consegna ? `🛵 新订单 ${numero}号 – 外送` : `🥡 新订单 ${numero}号 – 自取`, "",
    `👤 姓名：${o.nome}`, `📞 电话：${o.telefono}`,
    consegna ? `📍 地址：${o.indirizzo}（${o.zona}）` : "📍 到店自取",
    `🕗 时间：${o.ora}`, "", ...lista, "",
    consegna ? `菜品 ${eur(sub)} + 配送费 ${eur(costo)}` : null, `💶 合计 ${eur(tot)}（${consegna ? "送达时付款" : "取餐时付款"}）`,
    o.note ? `📝 备注：${o.note}` : null, `⏱ 提交时间：${t.zh}`
  ];
  const testo = [...it, "", "— — — — — — —", "", ...zh, "", `🔁 Per annullarlo / 取消：/annulla O${numero}`].filter((r) => r !== null).join("\n");
  if (!(await tg(env, testo, CONFIG.CHAT_ORDINI || CONFIG.CHAT_ID))) throw new Errore("Non siamo riusciti a inviare l'ordine. Chiama il ristorante.", 502);
  return { ok: true, numero, totale: tot };
}

/* Prenotazioni che il ristorante ha annullato da Telegram: il sito le mostra al cliente */
async function prenotAnnullate(env, body) {
  const u = await utente(env, body.idToken);
  if (!u) throw new Errore("Utente non autorizzato", 401);
  const r = await env.DB.prepare("SELECT doc FROM prenot WHERE uid = ? AND stato = 'annullata_ristorante' AND doc IS NOT NULL").bind(u.uid).all();
  return { ok: true, docs: (r.results || []).map((x) => x.doc) };
}

/* Avviso al cliente via email (solo se Brevo è configurato) */
const AVVISI = {
  it: ["Yugo: la tua {t} è stata annullata", "Ci dispiace, il ristorante ha annullato la tua {t} {q}. Per informazioni chiamaci al 0185 177 1400.", "prenotazione", "ordine"],
  en: ["Yugo: your {t} has been cancelled", "We're sorry, the restaurant has cancelled your {t} {q}. For information call us on +39 0185 177 1400.", "booking", "order"],
  fr: ["Yugo : ta {t} a été annulée", "Désolés, le restaurant a annulé ta {t} {q}. Pour toute information, appelle-nous au +39 0185 177 1400.", "réservation", "commande"],
  de: ["Yugo: deine {t} wurde storniert", "Es tut uns leid, das Restaurant hat deine {t} {q} storniert. Infos unter +39 0185 177 1400.", "Reservierung", "Bestellung"],
  es: ["Yugo: tu {t} ha sido cancelada", "Lo sentimos, el restaurante ha cancelado tu {t} {q}. Para información llámanos al +39 0185 177 1400.", "reserva", "pedido"],
  zh: ["Yugo：你的{t}已被取消", "很抱歉，餐厅已取消你的{t} {q}。如有疑问请致电 +39 0185 177 1400。", "预订", "订单"],
  ja: ["Yugo：{t}がキャンセルされました", "申し訳ありません。お店が{t} {q} をキャンセルしました。お問い合わせは +39 0185 177 1400 まで。", "ご予約", "ご注文"]
};
async function avvisaCliente(env, email, lang, ordine, quando) {
  if (!(env.BREVO_KEY && env.MITTENTE && email)) return false;
  const a = AVVISI[lang] || AVVISI.it, t = ordine ? a[3] : a[2];
  const testo = a[1].replace("{t}", t).replace("{q}", quando);
  const r = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST", headers: { "api-key": String(env.BREVO_KEY).trim(), "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify({ sender: { name: "Yugo Sushi", email: String(env.MITTENTE).trim() }, to: [{ email }], subject: a[0].replace("{t}", t), textContent: testo,
      htmlContent: `<div style="font-family:Arial,sans-serif;max-width:420px;margin:auto;padding:24px;color:#1b2333"><p style="font-size:20px;font-weight:bold;color:#a8843c;margin:0 0 16px">YUGO · Sestri Levante</p><p>${testo}</p></div>` })
  }).catch(() => null);
  return !!(r && r.ok);
}

/* ---------------- programma inviti ---------------- */
async function statoPromoter(env, p) {
  const r = await env.DB.prepare(
    `SELECT SUM(stato = 'ok') AS ok, SUM(stato = 'attesa') AS attesa FROM follow WHERE codice = ?`
  ).bind(p.codice).first();
  const ok = r?.ok || 0, attesa = r?.attesa || 0;
  const t = target(p.livello);
  const progresso = Math.max(0, ok - p.consumati);
  return { totaleOk: ok, attesa, target: t, progresso: Math.min(progresso, t), pronto: progresso >= t, livello: p.livello + 1 };
}

async function nuovoCodice(env, nome) {
  const base = (nome.split(/\s+/)[0].normalize("NFD").replace(/[^A-Za-z]/g, "").toUpperCase().slice(0, 6)) || "YUGO";
  for (let i = 0; i < 30; i++) {
    const c = base + (1 + Math.floor(Math.random() * (i < 10 ? 9 : 99)));
    if (!(await env.DB.prepare(`SELECT 1 FROM promoter WHERE codice = ?`).bind(c).first())) return c;
  }
  return base + Date.now().toString().slice(-5);
}

async function promoIscrivi(env, body) {
  const u = await utente(env, body.idToken);
  if (!u || !u.verificato) throw new Errore("Accedi e conferma la tua email per partecipare.", 401);
  const gia = await env.DB.prepare(`SELECT * FROM promoter WHERE uid = ?`).bind(u.uid).first();
  if (gia) return promoMe(env, body, u);
  const nome = pulisci(body.nome, 60), telefono = pulisci(body.telefono, 30);
  if (nome.length < 2) throw new Errore("Scrivi il tuo nome.");
  if (telefono.replace(/\D/g, "").length < 8) throw new Errore("Scrivi un numero di telefono valido.");
  const codice = await nuovoCodice(env, nome);
  await env.DB.prepare(`INSERT INTO promoter (uid, email, nome, telefono, codice, creato) VALUES (?, ?, ?, ?, ?, ?)`)
    .bind(u.uid, u.email, nome, telefono, codice, adessoISO()).run();
  await tg(env, `🙋 Nuovo iscritto alle promo: ${nome} (${telefono}) · codice ${codice}\n🙋 新会员加入推广活动：${nome}（${telefono}）· 邀请码 ${codice}`);
  return promoMe(env, body, u);
}

async function promoMe(env, body, uGia) {
  const u = uGia || await utente(env, body.idToken);
  if (!u) throw new Errore("Accedi per vedere i tuoi inviti.", 401);
  const p = await env.DB.prepare(`SELECT * FROM promoter WHERE uid = ?`).bind(u.uid).first();
  if (!p) return { iscritto: false, livelli: LIVELLI };
  const s = await statoPromoter(env, p);
  const c = await env.DB.prepare(`SELECT codice, livello, stato, creato, usato FROM coupon WHERE promoter_id = ? ORDER BY creato DESC`).bind(p.id).all();
  return { iscritto: true, nome: p.nome, codice: p.codice, livelli: LIVELLI, ...s, coupon: c.results || [] };
}

async function promoInvito(env, body) {
  const codice = pulisci(body.codice, 20).toUpperCase();
  const p = await env.DB.prepare(`SELECT nome FROM promoter WHERE codice = ?`).bind(codice).first();
  if (!p) throw new Errore("Questo invito non esiste.", 404);
  return { codice, nome: p.nome.split(/\s+/)[0] };
}

async function promoFollow(env, body, ip) {
  const codice = pulisci(body.codice, 20).toUpperCase();
  const username = pulisci(body.username, 40).replace(/^@+/, "").toLowerCase();
  const piattaforma = body.piattaforma === "tiktok" ? "TikTok" : "Instagram";
  if (!/^[a-z0-9._]{2,30}$/.test(username)) throw new Errore("Scrivi il tuo username così come appare sull'app, per esempio @giulia_23.");
  const p = await env.DB.prepare(`SELECT codice FROM promoter WHERE codice = ?`).bind(codice).first();
  if (!p) throw new Errore("Questo invito non esiste.", 404);
  const ieri = new Date(Date.now() - 864e5).toISOString();
  const n = await env.DB.prepare(`SELECT COUNT(*) AS n FROM follow WHERE ip = ? AND creato > ?`).bind(ip, ieri).first();
  if ((n?.n || 0) >= 6) throw new Errore("Troppi invii da questo telefono. Riprova domani.", 429);
  const esiste = await env.DB.prepare(`SELECT id, stato FROM follow WHERE username = ?`).bind(username).first();
  if (esiste && esiste.stato !== "no") throw new Errore("Questo username è già stato segnalato. Ogni persona conta una volta sola.", 409);
  if (esiste) await env.DB.prepare(`DELETE FROM follow WHERE id = ?`).bind(esiste.id).run();
  const r = await env.DB.prepare(`INSERT INTO follow (codice, username, piattaforma, ip, creato) VALUES (?, ?, ?, ?, ?) RETURNING id`)
    .bind(codice, username, piattaforma, ip, adessoISO()).first();
  await tg(env, [
    `🆕 @${username} dice di seguirvi su ${piattaforma}, invitata da ${codice}`,
    `🆕 @${username} 说已在 ${piattaforma} 关注你们，邀请人 ${codice}`,
    `/ok ${r.id} · /no ${r.id}`
  ].join("\n"));
  return { ok: true };
}

async function promoPremio(env, body) {
  const u = await utente(env, body.idToken);
  if (!u) throw new Errore("Accedi per richiedere il premio.", 401);
  const p = await env.DB.prepare(`SELECT * FROM promoter WHERE uid = ?`).bind(u.uid).first();
  if (!p) throw new Errore("Prima iscriviti alle promo.");
  const s = await statoPromoter(env, p);
  if (!s.pronto) throw new Errore("La barra non è ancora piena.");
  const upd = await env.DB.prepare(`UPDATE promoter SET livello = livello + 1, consumati = consumati + ? WHERE id = ? AND livello = ?`)
    .bind(s.target, p.id, p.livello).run();
  if (!upd.meta || upd.meta.changes !== 1) throw new Errore("Premio già richiesto. Ricarica la pagina.", 409);
  let codice;
  for (let i = 0; i < 20; i++) {
    codice = String(100000 + Math.floor(Math.random() * 900000));
    if (!(await env.DB.prepare(`SELECT 1 FROM coupon WHERE codice = ?`).bind(codice).first())) break;
  }
  await env.DB.prepare(`INSERT INTO coupon (codice, promoter_id, livello, creato) VALUES (?, ?, ?, ?)`).bind(codice, p.id, s.livello, adessoISO()).run();
  await tg(env, `🎟️ ${p.codice} ha sbloccato il coupon ${codice} (livello ${s.livello})\n🎟️ ${p.codice} 获得优惠券 ${codice}（第 ${s.livello} 级）`);
  return { ...(await promoMe(env, body, u)), ok: true, nuovoCoupon: codice, livelloSbloccato: s.livello };
}

/* ---------------- comandi del bot ---------------- */
async function comando(env, msg) {
  const chat = String(msg.chat && msg.chat.id);
  if (chat !== String(CONFIG.CHAT_ID) && chat !== String(CONFIG.CHAT_ORDINI || CONFIG.CHAT_ID)) return;
  const [primo, arg] = String(msg.text || "").trim().split(/\s+/);
  const cmd = primo.split("@")[0].toLowerCase();
  const rispondi = (t) => tg(env, t, chat);

  if (cmd === "/annulla" || cmd === "/cancella") {
    const m = String(arg || "").toUpperCase().match(/^([PO])(\d+)$/);
    if (!m) return rispondi("Scrivi la lettera e il numero che trovi nel messaggio, per esempio /annulla P12 (prenotazione) o /annulla O34 (ordine)\n请写消息里的编号，例如 /annulla P12（预订）或 /annulla O34（订单）");
    const id = +m[2], ordine = m[1] === "O";
    const r = await env.DB.prepare(ordine ? "SELECT * FROM ordini WHERE id = ?" : "SELECT * FROM prenot WHERE id = ?").bind(id).first();
    if (!r) return rispondi(`Non trovo ${ordine ? "l'ordine" : "la prenotazione"} ${m[1]}${id}.\n找不到 ${m[1]}${id}。`);
    if (/annullat/.test(r.stato || "")) return rispondi(`${m[1]}${id} è già annullat${ordine ? "o" : "a"}.\n${m[1]}${id} 已取消。`);
    await env.DB.prepare(`UPDATE ${ordine ? "ordini" : "prenot"} SET stato = 'annullata_ristorante' WHERE id = ?`).bind(id).run();
    const quando = ordine ? `n. ${id}${r.ora ? " (" + r.ora + ")" : ""}` : `${r.data.split("-").reverse().join("/")} ${r.ora}`;
    const email = await avvisaCliente(env, r.email, r.lang || "it", ordine, quando);
    const chi = [r.nome, r.telefono].filter(Boolean).join(" · ");
    return rispondi([
      `❌ ${ordine ? "Ordine" : "Prenotazione"} ${m[1]}${id} annullat${ordine ? "o" : "a"}${chi ? " – " + chi : ""}`,
      email ? "✉️ Il cliente è stato avvisato via email." : `📞 Avvisa il cliente${r.telefono ? " al " + r.telefono : ""}.`,
      ordine ? "" : "Sul sito la vede già come annullata dal ristorante.",
      `❌ 已取消 ${m[1]}${id}。${email ? "已发邮件通知客人。" : "请打电话通知客人。"}`
    ].filter(Boolean).join("\n"));
  }

  if (cmd === "/ok" || cmd === "/no") {
    const id = parseInt(arg, 10);
    if (!id) return rispondi(`Scrivi il numero, per esempio ${cmd} 57\n请写编号，例如 ${cmd} 57`);
    const f = await env.DB.prepare(`SELECT * FROM follow WHERE id = ?`).bind(id).first();
    if (!f) return rispondi(`Non trovo la segnalazione ${id}.\n找不到编号 ${id}。`);
    if (f.stato !== "attesa") return rispondi(`La ${id} (@${f.username}) è già stata ${f.stato === "ok" ? "confermata ✅" : "rifiutata ❌"}.\n编号 ${id} 已处理过。`);
    const nuovo = cmd === "/ok" ? "ok" : "no";
    await env.DB.prepare(`UPDATE follow SET stato = ?, deciso = ? WHERE id = ?`).bind(nuovo, adessoISO(), id).run();
    if (nuovo === "no") return rispondi(`❌ @${f.username} rifiutato (invito ${f.codice}).\n❌ 已拒绝 @${f.username}。`);
    const p = await env.DB.prepare(`SELECT * FROM promoter WHERE codice = ?`).bind(f.codice).first();
    const s = await statoPromoter(env, p);
    let t = `✅ @${f.username} confermato. ${p.codice}: ${s.progresso}/${s.target} (livello ${s.livello})\n✅ 已确认 @${f.username}。${p.codice}：${s.progresso}/${s.target}（第 ${s.livello} 级）`;
    if (s.pronto) t += `\n🎯 ${p.codice} ha riempito la barra e può richiedere il premio!\n🎯 ${p.codice} 已完成目标，可以领取奖励！`;
    return rispondi(t);
  }

  if (cmd === "/usato" || cmd === "/coupon") {
    const codice = String(arg || "").replace(/\D/g, "");
    if (!codice) return rispondi(`Scrivi il codice, per esempio ${cmd} 234543\n请写优惠券号码，例如 ${cmd} 234543`);
    const c = await env.DB.prepare(
      `SELECT c.*, p.nome, p.telefono, p.codice AS invito FROM coupon c JOIN promoter p ON p.id = c.promoter_id WHERE c.codice = ?`
    ).bind(codice).first();
    if (!c) return rispondi(`❌ Il coupon ${codice} non esiste.\n❌ 优惠券 ${codice} 不存在。`);
    const chi = `${c.nome} · ${c.telefono} · ${c.invito} · livello ${c.livello}`;
    if (c.stato === "usato") return rispondi(`⚠️ Coupon ${codice} GIÀ USATO il ${oraRoma(c.usato).it}\n${chi}\n⚠️ 优惠券 ${codice} 已于 ${oraRoma(c.usato).zh} 使用过`);
    if (cmd === "/coupon") return rispondi(`✅ Coupon ${codice} VALIDO\n${chi}\n✅ 优惠券 ${codice} 有效`);
    await env.DB.prepare(`UPDATE coupon SET stato = 'usato', usato = ? WHERE codice = ? AND stato = 'valido'`).bind(adessoISO(), codice).run();
    return rispondi(`✅ Coupon ${codice} segnato come usato.\n${chi}\n✅ 优惠券 ${codice} 已标记为已使用。`);
  }

  if (cmd === "/classifica") {
    const r = await env.DB.prepare(
      `SELECT p.codice, p.nome, COUNT(f.id) AS n FROM promoter p JOIN follow f ON f.codice = p.codice AND f.stato = 'ok'
       GROUP BY p.id ORDER BY n DESC, p.creato ASC LIMIT 10`
    ).all();
    const righe = (r.results || []).map((x, i) => `${["🥇", "🥈", "🥉"][i] || `${i + 1}.`} ${x.codice} (${x.nome}) – ${x.n}`);
    return rispondi(righe.length ? `🏆 Classifica follower portati\n🏆 邀请关注排行榜\n\n${righe.join("\n")}` : "Ancora nessun follower confermato.\n还没有已确认的关注者。");
  }

  if (cmd === "/start" || cmd === "/aiuto" || cmd === "/help") {
    return rispondi([
      "Comandi / 指令:",
      "/ok 57 – conferma follower / 确认关注",
      "/no 57 – rifiuta follower / 拒绝",
      "/usato 234543 – coupon usato / 优惠券已使用",
      "/coupon 234543 – controlla coupon / 查询优惠券",
      "/annulla P12 – annulla prenotazione / 取消预订",
      "/annulla O34 – annulla ordine / 取消订单",
      "/classifica – top 10 / 排行榜"
    ].join("\n"));
  }
}

async function setup(env, url) {
  if (!env.TELEGRAM_TOKEN) throw new Errore("Manca il segreto TELEGRAM_TOKEN nelle impostazioni del worker.", 500);
  if (!env.DB) throw new Errore("Manca il database D1 collegato con il nome DB.", 500);
  await init(env);
  const base = `https://api.telegram.org/bot${env.TELEGRAM_TOKEN}`;
  const hook = await (await fetch(`${base}/setWebhook`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: `${url.origin}/telegram`, secret_token: await segreto(env), allowed_updates: ["message"] })
  })).json();
  const cmds = await (await fetch(`${base}/setMyCommands`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ commands: [
      { command: "ok", description: "Conferma follower – /ok 57" },
      { command: "no", description: "Rifiuta follower – /no 57" },
      { command: "usato", description: "Segna coupon usato – /usato 234543" },
      { command: "coupon", description: "Controlla coupon – /coupon 234543" },
      { command: "annulla", description: "Annulla prenotazione o ordine – /annulla P12 · /annulla O34" },
      { command: "classifica", description: "Top 10 clienti" }
    ] })
  })).json();
  return { database: "pronto", webhook: hook.ok, comandi: cmds.ok, dettaglio: hook.description || "" };
}

/* ---------------- codice di verifica email (6 cifre) ----------------
   Si attiva da solo quando su Cloudflare ci sono tre segreti:
     BREVO_KEY  = chiave API di Brevo (gratis, 300 email al giorno)
     MITTENTE   = l'email verificata su Brevo che spedisce i codici
     GOOGLE_SA  = il file JSON dell'account di servizio Firebase (serve a segnare l'email come confermata)
   Finché ne manca uno, il sito continua a usare il link di conferma di Firebase. */
const OTP_SCADENZA = 10 * 60 * 1000, OTP_TENTATIVI = 5, OTP_ATTESA = 60 * 1000, OTP_GIORNO = 6;
const otpAttivo = (env) => !!(env.BREVO_KEY && env.MITTENTE && env.GOOGLE_SA);
const OTP_TESTI = {
  it: ["Il tuo codice Yugo", "Il tuo codice per confermare l'email è", "Scade tra 10 minuti. Se non sei stato tu, ignora questa email."],
  en: ["Your Yugo code", "Your code to confirm your email is", "It expires in 10 minutes. If this wasn't you, ignore this email."],
  fr: ["Ton code Yugo", "Ton code pour confirmer ton e-mail est", "Il expire dans 10 minutes. Si ce n'était pas toi, ignore cet e-mail."],
  de: ["Dein Yugo-Code", "Dein Code zur Bestätigung deiner E-Mail lautet", "Er läuft in 10 Minuten ab. Wenn du das nicht warst, ignoriere diese E-Mail."],
  es: ["Tu código Yugo", "Tu código para confirmar el correo es", "Caduca en 10 minutos. Si no has sido tú, ignora este correo."],
  zh: ["你的 Yugo 验证码", "你的邮箱验证码是", "10 分钟内有效。如果不是你本人操作，请忽略此邮件。"],
  ja: ["Yugo 確認コード", "メール確認用のコードは", "10分間有効です。お心当たりがない場合は、このメールを無視してください。"]
};
const sha = async (s) => [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)))].map((b) => b.toString(16).padStart(2, "0")).join("");
const OTP_SCHEMA = `CREATE TABLE IF NOT EXISTS otp (uid TEXT PRIMARY KEY, hash TEXT, scade INTEGER, tentativi INTEGER NOT NULL DEFAULT 0,
  ultimo INTEGER NOT NULL DEFAULT 0, giorno TEXT, inviati INTEGER NOT NULL DEFAULT 0)`;

async function otpInvia(env, body) {
  if (!otpAttivo(env)) throw new Errore("Servizio non ancora attivo.", 503);
  const u = await utente(env, body.idToken);
  if (!u) throw new Errore("Utente non autorizzato", 401);
  if (u.verificato) return { ok: true, gia: true };
  await env.DB.prepare(OTP_SCHEMA).run();
  const ora = Date.now(), oggi = new Date().toISOString().slice(0, 10);
  const r = await env.DB.prepare("SELECT * FROM otp WHERE uid = ?").bind(u.uid).first();
  if (r && ora - r.ultimo < OTP_ATTESA) throw new Errore("Aspetta un minuto prima di chiedere un altro codice.", 429);
  const inviati = r && r.giorno === oggi ? r.inviati : 0;
  if (inviati >= OTP_GIORNO) throw new Errore("Troppi codici per oggi. Riprova domani.", 429);
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 1000000;
  const codice = String(n).padStart(6, "0");
  const t = OTP_TESTI[body.lang] || OTP_TESTI.it;
  const html = `<div style="font-family:Arial,sans-serif;max-width:420px;margin:auto;padding:24px;color:#1b2333">
    <p style="font-size:20px;font-weight:bold;color:#a8843c;margin:0 0 16px">YUGO · Sestri Levante</p>
    <p style="margin:0 0 8px">${t[1]}</p>
    <p style="font-size:34px;letter-spacing:8px;font-weight:bold;margin:8px 0 16px">${codice}</p>
    <p style="color:#667;font-size:13px;margin:0">${t[2]}</p></div>`;
  const mail = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": String(env.BREVO_KEY).trim(), "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify({ sender: { name: "Yugo Sushi", email: String(env.MITTENTE).trim() }, to: [{ email: u.email }],
      subject: `${t[0]}: ${codice}`, htmlContent: html, textContent: `${t[1]} ${codice}\n${t[2]}` })
  });
  if (!mail.ok) throw new Errore("Non sono riuscito a mandare l'email. Riprova tra poco.", 502);
  await env.DB.prepare(`INSERT INTO otp (uid, hash, scade, tentativi, ultimo, giorno, inviati) VALUES (?, ?, ?, 0, ?, ?, ?)
    ON CONFLICT(uid) DO UPDATE SET hash = excluded.hash, scade = excluded.scade, tentativi = 0, ultimo = excluded.ultimo, giorno = excluded.giorno, inviati = excluded.inviati`)
    .bind(u.uid, await sha(u.uid + ":" + codice), ora + OTP_SCADENZA, ora, oggi, inviati + 1).run();
  return { ok: true };
}

async function otpVerifica(env, body) {
  if (!otpAttivo(env)) throw new Errore("Servizio non ancora attivo.", 503);
  const u = await utente(env, body.idToken);
  if (!u) throw new Errore("Utente non autorizzato", 401);
  if (u.verificato) return { ok: true };
  await env.DB.prepare(OTP_SCHEMA).run();
  const codice = String(body.codice || "").replace(/\D/g, "");
  const r = await env.DB.prepare("SELECT * FROM otp WHERE uid = ?").bind(u.uid).first();
  if (!r || !r.hash) throw new Errore("Chiedi prima un codice.");
  if (Date.now() > r.scade) throw new Errore("Il codice è scaduto. Chiedine uno nuovo.");
  if (r.tentativi >= OTP_TENTATIVI) throw new Errore("Troppi tentativi. Chiedi un nuovo codice.", 429);
  if ((await sha(u.uid + ":" + codice)) !== r.hash) {
    await env.DB.prepare("UPDATE otp SET tentativi = tentativi + 1 WHERE uid = ?").bind(u.uid).run();
    throw new Errore("Codice sbagliato. Controlla e riprova.");
  }
  await segnaVerificato(env, u.uid);
  await env.DB.prepare("UPDATE otp SET hash = NULL WHERE uid = ?").bind(u.uid).run();
  return { ok: true };
}

/* Segna l'email come confermata in Firebase con l'account di servizio */
const b64url = (buf) => btoa(typeof buf === "string" ? unescape(encodeURIComponent(buf)) : String.fromCharCode(...new Uint8Array(buf)))
  .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
async function tokenGoogle(env) {
  const sa = JSON.parse(env.GOOGLE_SA);
  const now = Math.floor(Date.now() / 1000);
  const dati = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" })) + "." + b64url(JSON.stringify({
    iss: sa.client_email, scope: "https://www.googleapis.com/auth/cloud-platform https://www.googleapis.com/auth/identitytoolkit",
    aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 }));
  const pem = sa.private_key.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("pkcs8", der, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const firma = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(dati));
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: dati + "." + b64url(firma) })
  });
  const d = await r.json().catch(() => ({}));
  if (!d.access_token) throw new Errore("Account di servizio Google non valido.", 500);
  return { token: d.access_token, progetto: sa.project_id };
}
async function segnaVerificato(env, uid) {
  const g = await tokenGoogle(env);
  const r = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${g.progetto}/accounts:update`, {
    method: "POST", headers: { "Authorization": `Bearer ${g.token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ localId: uid, emailVerified: true })
  });
  if (!r.ok) throw new Errore("Non sono riuscito a confermare l'email. Riprova.", 502);
}

/* ---------------- Gestore (pagina riservata) ----------------
   Protetta da due chiavi:
   - password fissa, salvata come segreto ADMIN_PASSWORD su Cloudflare;
   - codice di 6 cifre che il bot pubblica (e spilla) nel gruppo Telegram ogni 12 ore.
   Dopo 5 tentativi sbagliati, l'IP è bloccato per 10 minuti. */
const GEST_BLOCCO = 10 * 60 * 1000, GEST_TENT_MAX = 5;
const randomToken = () => [...crypto.getRandomValues(new Uint8Array(24))].map((b) => b.toString(16).padStart(2, "0")).join("");

async function gestNuovoCodice(env) {
  if (!env.TELEGRAM_TOKEN) return;
  await init(env);
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 1000000;
  const codice = String(n).padStart(6, "0");
  const ora = Date.now();
  const scade = ora + 12 * 3600 * 1000 + 15 * 60 * 1000; // 12 ore + 15 min di tolleranza
  // togli dal pin il vecchio
  const vecchio = await env.DB.prepare("SELECT msgId FROM gestore_codice WHERE id = 1").first();
  if (vecchio && vecchio.msgId) {
    await fetch(`https://api.telegram.org/bot${env.TELEGRAM_TOKEN}/unpinChatMessage`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: CONFIG.CHAT_ID, message_id: vecchio.msgId })
    }).catch(() => {});
  }
  const testo = `🔴🔴🔴 CODICE GESTORE 🔴🔴🔴\n\n*${codice}*\n\nValido 12 ore. Non condividere.\n下一个密码（12小时内有效）`;
  const r = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_TOKEN}/sendMessage`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: CONFIG.CHAT_ID, text: testo, parse_mode: "Markdown" })
  });
  const d = await r.json().catch(() => ({}));
  const msgId = d && d.result && d.result.message_id;
  let pinErr = null;
  if (msgId) {
    const rp = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_TOKEN}/pinChatMessage`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: CONFIG.CHAT_ID, message_id: msgId, disable_notification: true })
    }).catch(() => null);
    if (rp) { const dp = await rp.json().catch(() => ({})); if (!dp.ok) pinErr = dp; }
  }
  await env.DB.prepare("INSERT INTO gestore_codice (id, codice, msgId, scade, creato) VALUES (1, ?1, ?2, ?3, ?4) ON CONFLICT(id) DO UPDATE SET codice = ?1, msgId = ?2, scade = ?3, creato = ?4")
    .bind(codice, msgId || null, scade, ora).run();
  return { sendStatus: r.status, sendOk: !!msgId, sendErr: msgId ? null : d, pinErr, chatId: CONFIG.CHAT_ID };
}

async function gestLogin(env, body, ip) {
  if (!env.ADMIN_PASSWORD) throw new Errore("Password gestore non impostata su Cloudflare. Aggiungi il segreto ADMIN_PASSWORD.", 503);
  await init(env);
  const ora = Date.now();
  const bl = await env.DB.prepare("SELECT * FROM gestore_tent WHERE ip = ?").bind(ip).first();
  if (bl && bl.blocco > ora) throw new Errore("Troppi tentativi. Riprova tra qualche minuto.", 429);
  const pw = String(body.password || "");
  const cod = String(body.codice || "").replace(/\D/g, "");
  const codRow = await env.DB.prepare("SELECT * FROM gestore_codice WHERE id = 1").first();
  const okPw = pw && pw === env.ADMIN_PASSWORD;
  const okCod = codRow && codRow.codice === cod && codRow.scade > ora;
  if (!okPw || !okCod) {
    const n = ((bl && bl.n) || 0) + 1;
    const blocco = n >= GEST_TENT_MAX ? ora + GEST_BLOCCO : 0;
    await env.DB.prepare("INSERT INTO gestore_tent (ip, n, blocco, ultimo) VALUES (?1, ?2, ?3, ?4) ON CONFLICT(ip) DO UPDATE SET n = ?2, blocco = ?3, ultimo = ?4")
      .bind(ip, n, blocco, ora).run();
    throw new Errore(!codRow ? "Codice gestore non ancora pubblicato. Riprova tra poco." : "Password o codice sbagliati.", 401);
  }
  await env.DB.prepare("DELETE FROM gestore_tent WHERE ip = ?").bind(ip).run();
  const token = randomToken();
  await env.DB.prepare("INSERT INTO gestore_sess (token, scade, creato, ip) VALUES (?, ?, ?, ?)").bind(token, codRow.scade, ora, ip).run();
  // pulizia sessioni vecchie
  await env.DB.prepare("DELETE FROM gestore_sess WHERE scade < ?").bind(ora).run();
  return { ok: true, token, scade: codRow.scade };
}

async function gestVerifica(env, body) {
  const t = String(body.token || "");
  if (!t) throw new Errore("Accesso scaduto. Rientra.", 401);
  const r = await env.DB.prepare("SELECT * FROM gestore_sess WHERE token = ?").bind(t).first();
  if (!r || r.scade < Date.now()) throw new Errore("Accesso scaduto. Rientra.", 401);
  return r;
}

async function gestDati(env, body) {
  await gestVerifica(env, body);
  await init(env);
  const oggi = new Date().toISOString().slice(0, 10);
  const limite = Date.now() - 24 * 3600 * 1000;
  const [prenot, ordini, follower] = await Promise.all([
    env.DB.prepare("SELECT id, nome, telefono, data, ora, persone, email, stato, creato FROM prenot WHERE data >= ? AND stato IN ('confermata', 'annullata_ristorante') ORDER BY data, ora LIMIT 200").bind(oggi).all(),
    env.DB.prepare("SELECT id, nome, telefono, ora, totale, email, stato, creato FROM ordini WHERE creato > ? ORDER BY id DESC LIMIT 100").bind(new Date(limite).toISOString()).all(),
    env.DB.prepare("SELECT f.id, f.codice, f.username, f.piattaforma, f.creato, p.nome AS daChi FROM follow f LEFT JOIN promoter p ON p.codice = f.codice WHERE f.stato = 'attesa' ORDER BY f.id DESC LIMIT 100").all()
  ]);
  return { ok: true, prenot: prenot.results || [], ordini: ordini.results || [], follower: follower.results || [] };
}

async function gestAzione(env, body) {
  await gestVerifica(env, body);
  await init(env);
  const az = String(body.azione || "");
  const id = parseInt(body.id, 10);
  if (az === "prenot-annulla") {
    const r = await env.DB.prepare("SELECT * FROM prenot WHERE id = ?").bind(id).first();
    if (!r) throw new Errore("Prenotazione non trovata.", 404);
    await env.DB.prepare("UPDATE prenot SET stato = 'annullata_ristorante' WHERE id = ?").bind(id).run();
    await avvisaCliente(env, r.email, "it", false, `${r.data.split("-").reverse().join("/")} ${r.ora}`);
    return { ok: true };
  }
  if (az === "prenot-cambia") {
    const nuovaOra = String(body.ora || "").match(/^\d{2}:\d{2}$/) ? body.ora : null;
    if (!nuovaOra) throw new Errore("Orario non valido.", 400);
    await env.DB.prepare("UPDATE prenot SET ora = ? WHERE id = ?").bind(nuovaOra, id).run();
    return { ok: true };
  }
  if (az === "ordine-annulla") {
    const r = await env.DB.prepare("SELECT * FROM ordini WHERE id = ?").bind(id).first();
    if (!r) throw new Errore("Ordine non trovato.", 404);
    await env.DB.prepare("UPDATE ordini SET stato = 'annullata_ristorante' WHERE id = ?").bind(id).run();
    await avvisaCliente(env, r.email, r.lang || "it", true, `n. ${id}${r.ora ? " (" + r.ora + ")" : ""}`);
    return { ok: true };
  }
  if (az === "ordine-cambia") {
    const nuovaOra = String(body.ora || "").match(/^\d{2}:\d{2}$/) ? body.ora : null;
    if (!nuovaOra) throw new Errore("Orario non valido.", 400);
    await env.DB.prepare("UPDATE ordini SET ora = ? WHERE id = ?").bind(nuovaOra, id).run();
    return { ok: true };
  }
  if (az === "follow-ok" || az === "follow-no") {
    const f = await env.DB.prepare("SELECT * FROM follow WHERE id = ?").bind(id).first();
    if (!f) throw new Errore("Segnalazione non trovata.", 404);
    if (f.stato !== "attesa") throw new Errore(`Già ${f.stato}.`, 400);
    const nuovo = az === "follow-ok" ? "ok" : "no";
    await env.DB.prepare("UPDATE follow SET stato = ?, deciso = ? WHERE id = ?").bind(nuovo, adessoISO(), id).run();
    return { ok: true };
  }
  if (az === "coupon-cerca") {
    const codice = String(body.codice || "").replace(/\D/g, "");
    if (!codice) throw new Errore("Scrivi il codice del coupon.", 400);
    const c = await env.DB.prepare("SELECT c.*, p.nome, p.telefono, p.codice AS invito FROM coupon c JOIN promoter p ON p.id = c.promoter_id WHERE c.codice = ?").bind(codice).first();
    if (!c) return { ok: true, coupon: null };
    const premio = ((CONFIG && CONFIG.PREMI) || [])[c.livello - 1] || `livello ${c.livello}`;
    return { ok: true, coupon: { codice: c.codice, stato: c.stato, livello: c.livello, premio, nome: c.nome, telefono: c.telefono, invito: c.invito, usato: c.usato, creato: c.creato } };
  }
  if (az === "coupon-usato") {
    const codice = String(body.codice || "").replace(/\D/g, "");
    const r = await env.DB.prepare("UPDATE coupon SET stato = 'usato', usato = ? WHERE codice = ? AND stato = 'valido'").bind(adessoISO(), codice).run();
    if (!r.meta || r.meta.changes !== 1) throw new Errore("Coupon già usato o non valido.", 400);
    return { ok: true };
  }
  throw new Errore("Azione sconosciuta.", 400);
}

/* ---------------- router ---------------- */
export default {
  async fetch(request, env) {
    if (env.TELEGRAM_TOKEN) env = { ...env, TELEGRAM_TOKEN: String(env.TELEGRAM_TOKEN).replace(/\s+/g, "") };
    const cors = {
      "Access-Control-Allow-Origin": CONFIG.ORIGINE,
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Vary": "Origin"
    };
    const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { ...cors, "Content-Type": "application/json; charset=utf-8" } });
    if (request.method === "OPTIONS") return new Response(null, { headers: cors });
    const url = new URL(request.url);
    try {
      if (url.pathname === "/telegram") {
        if (request.headers.get("X-Telegram-Bot-Api-Secret-Token") !== (await segreto(env))) return new Response("no", { status: 403 });
        await init(env);
        const upd = await request.json().catch(() => ({}));
        if (upd.message && upd.message.text && upd.message.text.startsWith("/")) await comando(env, upd.message);
        return new Response("ok");
      }
      if (url.pathname === "/setup") return json(await setup(env, url));
      if (url.pathname === "/otp/stato") return json({ attivo: otpAttivo(env) });
      if (request.method === "GET") return json({ ok: true, servizio: "Yugo – bot e promo" });
      if (request.method !== "POST") return json({ errore: "Metodo non permesso" }, 405);

      const body = await request.json().catch(() => ({}));
      if (url.pathname === "/" || url.pathname === "/prenotazione") return json(await prenotazione(env, body));
      await init(env);
      const ip = request.headers.get("CF-Connecting-IP") || "";
      if (url.pathname === "/ordine") return json(await ordine(env, body));
      if (url.pathname === "/promo/iscrivi") return json(await promoIscrivi(env, body));
      if (url.pathname === "/promo/me") return json(await promoMe(env, body));
      if (url.pathname === "/promo/invito") return json(await promoInvito(env, body));
      if (url.pathname === "/promo/follow") return json(await promoFollow(env, body, ip));
      if (url.pathname === "/promo/premio") return json(await promoPremio(env, body));
      if (url.pathname === "/prenotazioni/annullate") return json(await prenotAnnullate(env, body));
      if (url.pathname === "/gestore/login") return json(await gestLogin(env, body, ip));
      if (url.pathname === "/gestore/dati") return json(await gestDati(env, body));
      if (url.pathname === "/gestore/azione") return json(await gestAzione(env, body));
      if (url.pathname === "/gestore/nuovo-codice") { if (!env.ADMIN_PASSWORD) throw new Errore("Password gestore non impostata su Cloudflare.", 503); if (String(body.password || "") !== env.ADMIN_PASSWORD) throw new Errore("Password sbagliata.", 401); const diag = await gestNuovoCodice(env); return json({ ok: !!(diag && diag.sendOk), diag }); }
      if (url.pathname === "/otp/invia") return json(await otpInvia(env, body));
      if (url.pathname === "/otp/verifica") return json(await otpVerifica(env, body));
      return json({ errore: "Pagina non trovata" }, 404);
    } catch (e) {
      return json({ errore: e instanceof Errore ? e.message : "Errore del server. Riprova." }, e.status || 500);
    }
  },
  async scheduled(event, env, ctx) { ctx.waitUntil(gestNuovoCodice(env)); }
};
