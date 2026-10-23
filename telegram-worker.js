/* =====================================================================
   YUGO – "Cervello" del bot su Cloudflare Workers
   Gira 24 ore su 24 sui server di Cloudflare: il Mac può stare spento.

   Fa tre cose:
   1. Manda nel gruppo Telegram prenotazioni e annullamenti (italiano + cinese).
   2. Gestisce il programma "Invita amici": iscrizioni, follower, barre, coupon.
   3. Riceve i comandi del bot: /ok /no /usato /coupon /classifica

   Su Cloudflare servono solo due cose:
     - un database D1 collegato con il nome DB   (Settings → Bindings)
     - il segreto TELEGRAM_TOKEN = token del bot  (Settings → Variables and Secrets)
   Poi apri una volta:  https://<indirizzo-del-worker>/setup
   ===================================================================== */

const CONFIG = {
  CHAT_ID: "-5444686738",                                   // gruppo "Prenotazioni Yugo"
  FIREBASE_API_KEY: "AIzaSyAEnC8afPxW6XJhdZnfiTTHxZ1qun_MFwc", // pubblica, è la stessa del sito
  ORIGINE: "https://yugosestri-creator.github.io"
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
  `CREATE TABLE IF NOT EXISTS coupon (
     codice TEXT PRIMARY KEY, promoter_id INTEGER NOT NULL, livello INTEGER NOT NULL,
     stato TEXT NOT NULL DEFAULT 'valido', creato TEXT NOT NULL, usato TEXT)`
];
let schemaPronto = false;
async function init(env) {
  if (schemaPronto) return;
  await env.DB.batch(SCHEMA.map((s) => env.DB.prepare(s)));
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
  if (!(await tg(env, testoPrenotazione(b, u.email, body.tipo === "annullata" ? "annullata" : "nuova")))) throw new Errore("Telegram non ha accettato il messaggio", 502);
  return { ok: true };
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
  if (chat !== String(CONFIG.CHAT_ID)) return;
  const [primo, arg] = String(msg.text || "").trim().split(/\s+/);
  const cmd = primo.split("@")[0].toLowerCase();
  const rispondi = (t) => tg(env, t, chat);

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
      { command: "classifica", description: "Top 10 clienti" }
    ] })
  })).json();
  return { database: "pronto", webhook: hook.ok, comandi: cmds.ok, dettaglio: hook.description || "" };
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
      if (request.method === "GET") return json({ ok: true, servizio: "Yugo – bot e promo" });
      if (request.method !== "POST") return json({ errore: "Metodo non permesso" }, 405);

      const body = await request.json().catch(() => ({}));
      if (url.pathname === "/" || url.pathname === "/prenotazione") return json(await prenotazione(env, body));
      await init(env);
      const ip = request.headers.get("CF-Connecting-IP") || "";
      if (url.pathname === "/promo/iscrivi") return json(await promoIscrivi(env, body));
      if (url.pathname === "/promo/me") return json(await promoMe(env, body));
      if (url.pathname === "/promo/invito") return json(await promoInvito(env, body));
      if (url.pathname === "/promo/follow") return json(await promoFollow(env, body, ip));
      if (url.pathname === "/promo/premio") return json(await promoPremio(env, body));
      return json({ errore: "Pagina non trovata" }, 404);
    } catch (e) {
      return json({ errore: e instanceof Errore ? e.message : "Errore del server. Riprova." }, e.status || 500);
    }
  }
};
