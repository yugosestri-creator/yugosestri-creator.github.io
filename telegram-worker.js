/* =====================================================================
   YUGO – "Postino" Telegram per Cloudflare Workers
   Riceve la prenotazione dal sito e la scrive nel gruppo Telegram.
   Gira sui server di Cloudflare 24 ore su 24: il tuo Mac può stare spento.

   Variabili da impostare su Cloudflare (Settings → Variables and Secrets):
     TELEGRAM_TOKEN    il token del bot che ti dà @BotFather   (tipo: Secret)
     TELEGRAM_CHAT_ID  l'ID del gruppo, es. -1001234567890      (tipo: Text)
     FIREBASE_API_KEY  la apiKey di Firebase (quella in config.js) (tipo: Text)
     ALLOWED_ORIGIN    https://yugosestri-creator.github.io       (tipo: Text)

   Per trovare l'ID del gruppo: aggiungi il bot al gruppo, scrivi /start
   nel gruppo, poi apri  https://<indirizzo-del-worker>/chat-id
   ===================================================================== */

const GIORNI = ["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"];
const MESI = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];

export default {
  async fetch(request, env) {
    const cors = {
      "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN || "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Vary": "Origin"
    };
    const json = (obj, status = 200) =>
      new Response(JSON.stringify(obj), { status, headers: { ...cors, "Content-Type": "application/json; charset=utf-8" } });

    if (request.method === "OPTIONS") return new Response(null, { headers: cors });

    const url = new URL(request.url);

    // Pagina di aiuto: mostra gli ID delle chat in cui il bot ha ricevuto messaggi
    if (request.method === "GET" && url.pathname === "/chat-id") {
      if (!env.TELEGRAM_TOKEN) return json({ errore: "Manca TELEGRAM_TOKEN nelle variabili del worker." }, 500);
      const r = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_TOKEN}/getUpdates`);
      const d = await r.json();
      const chats = {};
      (d.result || []).forEach((u) => {
        const c = (u.message || u.my_chat_member || u.channel_post || {}).chat;
        if (c) chats[c.id] = { id: c.id, nome: c.title || c.first_name || "", tipo: c.type };
      });
      const list = Object.values(chats);
      return json(list.length ? { chat: list, aiuto: "Copia l'id del gruppo (numero negativo) in TELEGRAM_CHAT_ID." }
                              : { chat: [], aiuto: "Nessun messaggio trovato. Scrivi /start nel gruppo dove hai aggiunto il bot e ricarica questa pagina." });
    }

    if (request.method === "GET") return json({ ok: true, servizio: "Yugo – notifiche prenotazioni" });
    if (request.method !== "POST") return json({ errore: "Metodo non permesso" }, 405);

    let b;
    try { b = await request.json(); } catch { return json({ errore: "Dati non validi" }, 400); }

    // 1. Controlla che la richiesta arrivi da un cliente registrato con email confermata
    const lookup = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${env.FIREBASE_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken: String(b.idToken || "") })
    });
    const who = await lookup.json().catch(() => ({}));
    const utente = who.users && who.users[0];
    if (!utente || !utente.emailVerified) return json({ errore: "Utente non autorizzato" }, 401);

    // 2. Pulisce i dati
    const testo = (s, max) => String(s ?? "").replace(/[\u0000-\u001f]/g, " ").trim().slice(0, max);
    const nome = testo(b.nome, 80);
    const persone = Math.max(1, Math.min(60, parseInt(b.persone, 10) || 0));
    const data = /^\d{4}-\d{2}-\d{2}$/.test(b.data) ? b.data : null;
    const ora = /^\d{2}:\d{2}$/.test(b.ora) ? b.ora : null;
    if (!nome || !data || !ora) return json({ errore: "Mancano nome, giorno o ora" }, 400);
    const telefono = testo(b.telefono, 30);
    const note = testo(b.note, 300);

    const [y, m, d] = data.split("-").map(Number);
    const giorno = new Date(Date.UTC(y, m - 1, d));
    const quando = `${GIORNI[giorno.getUTCDay()]} ${d} ${MESI[m - 1]}`;
    const adesso = new Intl.DateTimeFormat("it-IT", {
      timeZone: "Europe/Rome", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit"
    }).format(new Date()).replace(",", " alle");

    const righe = [
      "🍣 NUOVA PRENOTAZIONE – Yugo",
      "",
      `👤 ${nome}`,
      `👥 ${persone} ${persone === 1 ? "persona" : "persone"}`,
      `📅 ${quando}`,
      `🕗 Arrivo previsto: ${ora}`,
      telefono ? `📞 ${telefono}` : null,
      `✉️ ${utente.email}`,
      note ? `📝 ${note}` : null,
      "",
      `⏱ Richiesta fatta il ${adesso}`
    ].filter((r) => r !== null);

    // 3. Scrive nel gruppo Telegram
    const tg = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text: righe.join("\n"), disable_web_page_preview: true })
    });
    const res = await tg.json().catch(() => ({}));
    if (!res.ok) return json({ errore: "Telegram non ha accettato il messaggio", dettaglio: res.description || "" }, 502);
    return json({ ok: true });
  }
};
