/* =====================================================================
   YUGO – CONFIGURAZIONE
   Questo è l'unico file che devi modificare.
   Tutto quello che c'è scritto qui compare sul sito.
   ===================================================================== */

window.YUGO_CONFIG = {

  /* ---------- 1. INFORMAZIONI SUL RISTORANTE ----------
     ATTENZIONE: indirizzo, telefono, orari, prezzi e menu qui sotto sono
     ESEMPI. Sostituiscili con quelli veri di Yugo prima di pubblicare. */
  ristorante: {
    nome: "Yugo",
    slogan: "A different All You Can Eat",
    citta: "Sestri Levante",
    indirizzo: "Via XXV Aprile 1, 16039 Sestri Levante (GE)",   // ESEMPIO
    telefono: "+39 0185 000000",                                // ESEMPIO
    instagram: "",            // (vecchio campo, non usato: i social sono qui sotto)

    // Social: si aprono nell'app se è installata sul telefono
    social: {
      tiktok: "yugo.sestri",
      instagram: "yugosushisestri",
      facebook: "yugosushisestri"
    },

    // Promozioni: compaiono solo tra "dal" e "al" (anno-mese-giorno).
    // Togli "al" per una promo senza scadenza. ESEMPI: cambiale con quelle vere.
    promozioni: [
      { etichetta: "Ogni martedì", titolo: "Martedì Sushi Night: −10% sulla cena",
        descrizione: "Il martedì sera la formula All You Can Eat cena costa il 10% in meno.",
        quando: "Valida il martedì a cena, solo su prenotazione.", dal: "2026-10-01", al: "2026-12-31" },
      { etichetta: "Weekend", titolo: "Bambini sotto i 6 anni gratis a pranzo",
        descrizione: "Venerdì, sabato e domenica a pranzo i bambini sotto i 6 anni non pagano la formula.",
        dal: "2026-10-01" }
    ],

    descrizione: [
      "Yugo è un All You Can Eat diverso: ordini quanto vuoi, ma ogni piatto è preparato al momento e curato come alla carta.",
      "Pesce crudo, tataki, uramaki, nigiri e piatti caldi, con la qualità di un ristorante giapponese e la libertà di assaggiare tutto.",
      "Prenota il tavolo da qui in pochi secondi: il ristorante riceve subito la tua richiesta."
    ],

    // Formule All You Can Eat (ESEMPIO – metti prezzi veri)
    formule: [
      { nome: "Pranzo", quando: "Venerdì, sabato e domenica", prezzo: 19.90 },
      { nome: "Cena", quando: "Tutte le sere", prezzo: 29.90 },
      { nome: "Bambini", quando: "Sotto i 10 anni", prezzo: 14.90 }
    ],
    notaFormule: "Bevande, dolci e coperto esclusi. Il cibo avanzato si paga a parte.",

    // Orari mostrati nella pagina (testo libero, "·" va a capo)
    orari: [
      { giorno: "Lunedì",    ore: "Chiuso" },
      { giorno: "Martedì",   ore: "19:00 – 23:00" },
      { giorno: "Mercoledì", ore: "19:00 – 23:00" },
      { giorno: "Giovedì",   ore: "19:00 – 23:00" },
      { giorno: "Venerdì",   ore: "12:00 – 14:30 · 19:00 – 23:30" },
      { giorno: "Sabato",    ore: "12:00 – 14:30 · 19:00 – 23:30" },
      { giorno: "Domenica",  ore: "12:00 – 14:30 · 19:00 – 23:00" }
    ],

    // Fasce prenotabili (ultimo orario di arrivo accettato = "a")
    servizi: [
      { nome: "Pranzo", da: "12:00", a: "14:00", soloGiorni: [5, 6, 0] }, // ven, sab, dom
      { nome: "Cena",   da: "19:00", a: "22:30" }
    ],
    giorniChiusi: [1],        // 0=domenica, 1=lunedì, ... 6=sabato
    maxPersone: 12,           // oltre questo numero si chiede di telefonare
    giorniPrenotabili: 60,    // quanto in là si può prenotare

    // Menu (ESEMPIO – sostituisci con il vostro).
    // "n" è il numero del piatto per ordinare; "prezzo" mettilo solo se si paga a parte.
    notaMenu: "Tutti i piatti sono compresi nella formula All You Can Eat, salvo dove c'è il prezzo.",
    menu: [
      { categoria: "Antipasti", piatti: [
        { n: 1, nome: "Edamame", desc: "Fagioli di soia al vapore e sale" },
        { n: 2, nome: "Gyoza", desc: "Ravioli alla piastra, maiale e verza" },
        { n: 3, nome: "Tataki di tonno", desc: "Tonno scottato, salsa ponzu, uova di salmone" }
      ]},
      { categoria: "Crudi", piatti: [
        { n: 10, nome: "Sashimi di salmone", desc: "6 fette" },
        { n: 11, nome: "Tartare di tonno", desc: "Avocado e sesamo tostato" },
        { n: 12, nome: "Carpaccio di branzino", desc: "Agrumi e olio al wasabi" },
        { n: 13, nome: "Gambero rosso", desc: "Crudo, 2 pezzi", prezzo: 6 }
      ]},
      { categoria: "Nigiri", piatti: [
        { n: 20, nome: "Sake", desc: "Salmone · 2 pezzi" },
        { n: 21, nome: "Maguro", desc: "Tonno · 2 pezzi" },
        { n: 22, nome: "Ebi", desc: "Gambero cotto · 2 pezzi" }
      ]},
      { categoria: "Uramaki", piatti: [
        { n: 30, nome: "Yugo roll", desc: "Gambero in tempura, avocado, tartare di salmone sopra · 8 pezzi" },
        { n: 31, nome: "California", desc: "Granchio, avocado, cetriolo · 8 pezzi" },
        { n: 32, nome: "Spicy tuna", desc: "Tonno piccante, erba cipollina · 8 pezzi" }
      ]},
      { categoria: "Piatti caldi", piatti: [
        { n: 40, nome: "Tempura mista", desc: "Gamberi e verdure" },
        { n: 41, nome: "Yaki udon", desc: "Spaghettoni saltati con verdure e pollo" },
        { n: 42, nome: "Ramen shoyu", desc: "Brodo di soia, maiale, uovo marinato" }
      ]},
      { categoria: "Dolci", piatti: [
        { n: 50, nome: "Mochi", desc: "3 pezzi, gusti del giorno", prezzo: 5 },
        { n: 51, nome: "Cheesecake al matcha", desc: "", prezzo: 6 }
      ]}
    ]
  },

  /* ---------- 2. FIREBASE (registrazione con email + salvataggio prenotazioni) ----------
     Incolla qui la configurazione che Firebase ti dà quando registri l'app web.
     Finché resta null il sito gira in MODALITÀ DEMO (niente viene salvato davvero). */
  firebase: {
    apiKey: "AIzaSyAEnC8afPxW6XJhdZnfiTTHxZ1qun_MFwc",
    authDomain: "yugo-sestri.firebaseapp.com",
    projectId: "yugo-sestri",
    storageBucket: "yugo-sestri.firebasestorage.app",
    messagingSenderId: "725676990411",
    appId: "1:725676990411:web:9328365854d644a540204e"
  },
  /* esempio:
  firebase: {
    apiKey: "AIza...",
    authDomain: "yugo-sestri.firebaseapp.com",
    projectId: "yugo-sestri",
    storageBucket: "yugo-sestri.appspot.com",
    messagingSenderId: "1234567890",
    appId: "1:1234567890:web:abc123"
  },
  */

  /* ---------- 3. TELEGRAM (notifica nel gruppo a ogni prenotazione) ----------
     Indirizzo del "postino" su Cloudflare (vedi LEGGIMI.md, passo 3).
     Il token del bot NON va scritto qui: sta al sicuro su Cloudflare. */
  telegram: {
    botToken: ["8896642131", "AAG3CTN5P6xP1F1Bb" + "Kmj8Hdvt0dsiRjeVLo"].join(":"),   // @yugo_prenotazioni_bot (spezzato apposta)
    chatId: "-5444686738",     // gruppo "Prenotazioni Yugo"
    worker: ""      // facoltativo, più sicuro: indirizzo del "postino" Cloudflare (LEGGIMI.md)
  }
};
