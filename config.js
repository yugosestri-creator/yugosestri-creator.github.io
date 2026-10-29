/* =====================================================================
   YUGO – CONFIGURAZIONE
   Questo è l'unico file che devi modificare.
   Tutto quello che c'è scritto qui compare sul sito.
   ===================================================================== */

window.YUGO_CONFIG = {

  /* ---------- 1. INFORMAZIONI SUL RISTORANTE ---------- */
  ristorante: {
    nome: "Yugo",
    slogan: "A different All You Can Eat",
    citta: "Sestri Levante",
    indirizzo: "Corso Colombo 9, 16039 Sestri Levante (GE)",
    telefono: "0185 177 1400",
    // Per la pagina privacy (privacy.html): compila quando li hai
    ragioneSociale: "",   // es. "Yugo di Mario Rossi" oppure "Yugo S.r.l."
    piva: "",             // partita IVA
    emailPrivacy: "",     // email a cui scrivere per i dati personali
    instagram: "",

    // Social: si aprono nell'app se è installata sul telefono
    social: { tiktok: "yugo.sestri", instagram: "yugosushisestri", facebook: "yugosushisestri" },

    // Promozioni: compaiono solo tra "dal" e "al" (anno-mese-giorno). Togli "al" per una promo senza scadenza.
    // Esempio: { etichetta: "Weekend", titolo: "...", descrizione: "...", quando: "...", dal: "2026-11-01", al: "2026-11-30" }
    promozioni: [
      { etichetta: "Halloween", titolo: "Halloween da Yugo: fino al 20% di sconto",
        descrizione: "Per tutti il 10% di sconto. Se ci segui su Instagram o TikTok lo sconto sale al 20%.",
        quando: "Mostra alla cassa che ci segui per avere il 20%.", dal: "2026-10-21", al: "2026-11-02" }
    ],

    descrizione: [
      "Yugo è sushi experience a Sestri Levante, in Corso Colombo 9: sushi, crudi, tartare, piatti caldi e griglia, preparati al momento.",
      "Siamo aperti a pranzo e a cena, tranne il martedì. Puoi mangiare da noi, ritirare da asporto o farti portare tutto a casa.",
      "Prenota il tavolo da qui in pochi secondi: il ristorante riceve subito la tua richiesta."
    ],

    // Riquadro sotto la foto in Home
    titoloFormule: "Asporto e consegna · Menu Family",
    formule: [
      { nome: "Family F1", quando: "4 piatti a scelta + 1 bibita in lattina · niente piatti special", prezzo: 20 },
      { nome: "Family F2", quando: "6 piatti a scelta + 1 bibita in lattina", prezzo: 30 },
      { nome: "Family F3", quando: "8 piatti a scelta + 2 bibite in lattina", prezzo: 40 },
      { nome: "Family F4", quando: "12 piatti a scelta + 3 bibite in lattina", prezzo: 60 }
    ],
    notaFormule: "Piatti special e dim sum non sono disponibili da asporto. Carpaccio e sashimi: non nel menu F1, una volta per tipo con F2, due con F3, tre con F4. I piatti 155 e 156 si ordinano una sola volta. Consegna a domicilio 12:00–14:30 e 19:00–22:00, ordine minimo € 20: Sestri Levante € 1, Riva Trigoso € 2,50, Casarza Ligure € 3,50, Moneglia € 5.",

    orari: [
      { giorno: "Lunedì",    ore: "12:00 – 15:00 · 19:00 – 23:00" },
      { giorno: "Martedì",   ore: "Chiuso" },
      { giorno: "Mercoledì", ore: "12:00 – 15:00 · 19:00 – 23:00" },
      { giorno: "Giovedì",   ore: "12:00 – 15:00 · 19:00 – 23:00" },
      { giorno: "Venerdì",   ore: "12:00 – 15:00 · 19:00 – 23:00" },
      { giorno: "Sabato",    ore: "12:00 – 15:00 · 19:00 – 23:00" },
      { giorno: "Domenica",  ore: "12:00 – 15:00 · 19:00 – 23:00" }
    ],

    // Orari prenotabili ("a" = ultimo orario di arrivo accettato)
    servizi: [
      { nome: "Pranzo", da: "12:00", a: "14:30" },
      { nome: "Cena",   da: "19:00", a: "22:30" }
    ],
    giorniChiusi: [2], // 0 = domenica … 2 = martedì
    maxPersone: 12,
    giorniPrenotabili: 60,

    notaMenuCasa: "Prezzi del menu da asporto e consegna.",
    notaMenuRistorante: "Prezzi alla carta. Coperto € 2,00.",
    // Menu da tavolo: quando c'è, mettilo qui con la stessa forma di "menu". Finché è vuoto si usa "menu".
    // Ordini da casa dal sito: arrivano su Telegram. Il cliente paga alla consegna o al ritiro.
    ordini: {
      justEat: "https://www.justeat.it/restaurants-yugo-sushi-experience-sestri-levante/menu",
      minimo: 20,              // ordine minimo per la consegna (€)
      anticipo: 30,            // minuti minimi tra ordine e consegna/ritiro
      fasce: [["12:00", "14:30"], ["19:00", "22:00"]], // dopo le 14:30 e dopo le 22:00 niente ordini
      zone: [
        { nome: "Sestri Levante", costo: 1 },
        { nome: "Riva Trigoso", costo: 2.5 },
        { nome: "Casarza Ligure", costo: 3.5 },
        { nome: "Moneglia", costo: 5 }
      ]
    },
    allYouCanEat: {
      titolo: "All You Can Eat",
      quando: "A cena · tranne il martedì",
      prezzo: 26.9,
      righe: ["Bambini sotto i 130 cm € 13,90", "Esclusi coperto (€ 2,00), bevande, dolci e caffè"]
    },
    // Pranzo e cena al ristorante: dalle 00:00 alle 16:00 il sito mostra il menu del pranzo,
    // dalle 16:01 alle 23:59 quello della cena (ora italiana).
    cambioMenu: "16:00",
    allYouCanEatPranzo: {
      titolo: "All You Can Eat",
      quando: "A pranzo · tranne il martedì",
      prezzo: 15.9,          // lunedì–venerdì
      prezzoWeekend: 16.9,   // sabato, domenica e festivi
      righe: [
        "Lunedì–venerdì € 15,90 · sabato, domenica e festivi € 16,90",
        "Bambini sotto i 130 cm € 8,00 · nel weekend € 9,00",
        "Esclusi coperto (€ 2,00), bevande, dolci e caffè",
        "Tataki e sashimi: uno a scelta tra i cinque piatti",
        "Per evitare sprechi: cibo avanzato con supplemento di € 5–10"
      ]
    },
    // Menu pranzo (foto del 29 ottobre 2026) = menu cena senza questi piatti
    nonAPranzo: [30, 37, 40, 41, 61, 62, 63, 81, 83, 84, 85, 104, 105, 106, 107, 108, 113, 114, 115, 118, 119, 120, 165, 166, 170, 177, 178, 179, 180, 301, 302, 303, 304, 305, 306, 307, 308, 309, 310, 311, 312, 313, 314, 315, 316, 317, 318, 319, 320],
    // A pranzo questi piatti si ordinano una volta a persona
    max1Pranzo: [17, 18, 19, 20, 96, 97, 98, 99, 112, 116, 117, 164],
    notaMenuPranzo: "Menu del pranzo. Dalle 16:00 trovi il menu della cena. Coperto € 2,00.",
    notaMenuCena: "Menu della cena, prezzi alla carta. Coperto € 2,00.",
    // Menu del ristorante (foto del 24 ottobre 2026): prezzi alla carta
    menuRistorante: [
      { categoria: "Antipasti", piatti: [
        { n: 1, nome: "Involtini primavera", prezzo: 2.5 },
        { n: 2, nome: "Involtini di gamberi", prezzo: 3 },
        { n: 3, nome: "Involtini con pollo vietnamita", prezzo: 3.5 },
        { n: 4, nome: "Nuvole di gamberi", prezzo: 2 },
        { n: 5, nome: "Gomma wakame", desc: "Insalata di alghe piccante", prezzo: 5 },
        { n: 6, nome: "Insalata con gamberi", desc: "Insalata mista con gamberi* e salsa sesamo", prezzo: 7 },
        { n: 7, nome: "Gamberi in salsa rosa", prezzo: 9 },
        { n: 8, nome: "Salmone marinato", prezzo: 9 },
        { n: 9, nome: "Pane cinese al vapore", desc: "Panini cinesi al vapore", prezzo: 3 },
        { n: 10, nome: "Edamame", desc: "Fagioli di soia", prezzo: 5 },
        { n: 11, nome: "Rock shrimps", desc: "Bocconcini di gamberi in tempura e salsa spicy maionese", prezzo: 8 },
        { n: 12, nome: "Pane dolce", desc: "Panino dolce al vapore", prezzo: 4 }
      ]},
      { categoria: "Dim sum · 3 pz", piatti: [
        { n: 13, nome: "Ravioli con carne e gamberi", desc: "Ravioli ripieni di carne e gamberi", prezzo: 6 },
        { n: 14, nome: "Ravioli con carne", desc: "Ravioli ripieni di carne", prezzo: 5 },
        { n: 15, nome: "Ravioli con verdure", desc: "Ravioli ripieni di verdure", prezzo: 5 },
        { n: 16, nome: "Ravioli alla griglia", desc: "Ravioli alla griglia ripieni di carne", prezzo: 5.5 },
        { n: 17, nome: "Dim sum manzo", desc: "Ravioli al vapore con sfoglia di barbabietola ripieni di manzo", prezzo: 7 },
        { n: 18, nome: "Dim sum calamaro", desc: "Ravioli al vapore con sfoglia al nero di seppia ripieni di calamaro", prezzo: 7 },
        { n: 19, nome: "Dim sum vegetariani", desc: "Ravioli al vapore con sfoglia di spinaci ripieni di verdure", prezzo: 7 },
        { n: 20, nome: "Dim sum di gamberi*", desc: "Ravioli al vapore ripieni di gamberi e merluzzo", prezzo: 7 }
      ]},
      { categoria: "Zuppe", piatti: [
        { n: 21, nome: "Zuppa di miso", desc: "Tofu, alghe, erba cipollina", prezzo: 4 },
        { n: 22, nome: "Zuppa pechinese", desc: "Tofu, alghe, funghi cinesi, pollo, bambù", prezzo: 4 },
        { n: 23, nome: "Zuppa pollo e mais*", desc: "Pollo*, mais e uova", prezzo: 4 },
        { n: 24, nome: "Zuppa con misto di mare", desc: "Zuppa di miso, misto di mare, cipollini", prezzo: 5 }
      ]},
      { categoria: "Fritti", piatti: [
        { n: 25, nome: "Chele di granchio", prezzo: 5 },
        { n: 26, nome: "Ebi tempura", prezzo: 12 },
        { n: 27, nome: "Pollo fritto", prezzo: 8 },
        { n: 28, nome: "Cotoletta di suino fritto", prezzo: 8 },
        { n: 29, nome: "Totani fritti", prezzo: 8 },
        { n: 30, nome: "Tofu fritto", prezzo: 8 },
        { n: 31, nome: "Tempura di salmone", desc: "Salmone fritto in tempura", prezzo: 10 },
        { n: 32, nome: "Verdure fritte", desc: "Zucchini, carota, cipolla, melanzane, peperoni", prezzo: 8 }
      ]},
      { categoria: "Nighiri · 2 pz", piatti: [
        { n: 33, nome: "Salmone", desc: "Bocconcino di riso con salmone", prezzo: 3 },
        { n: 34, nome: "Tonno", desc: "Bocconcino di riso con tonno", prezzo: 4 },
        { n: 35, nome: "Branzino", desc: "Bocconcino di riso con branzino", prezzo: 4 },
        { n: 36, nome: "Gambero cotto", desc: "Bocconcino di riso con gambero cotto", prezzo: 4 },
        { n: 37, nome: "Salmon flambé", desc: "Salmone scottato, crema al latte e granella di pistacchio", prezzo: 5 },
        { n: 38, nome: "Avocado", desc: "Bocconcino di riso con avocado", prezzo: 4 },
        { n: 39, nome: "Salmone scottato", desc: "Salmone scottato, philadelphia e salsa teriyaki", prezzo: 5 },
        { n: 40, nome: "Maguro special", desc: "Tonno scottato con salsa spicy cheese, salsa teriyaki e pistacchio", prezzo: 5 },
        { n: 41, nome: "Sake special", desc: "Salmone scottato con salsa spicy cheese, salsa teriyaki e pistacchio", prezzo: 5 },
        { n: 42, nome: "Nigiri misto", desc: "2 salmone, 1 tonno, 1 gambero* cotto, 1 branzino", prezzo: 10 }
      ]},
      { categoria: "Hossomaki · 6 pz", piatti: [
        { n: 43, nome: "Hosso avocado", desc: "Rotolino di riso avvolto da alga nori ripieno di avocado", prezzo: 5 },
        { n: 44, nome: "Hosso tekka", desc: "Rotolino di riso avvolto da alga nori ripieno di tonno", prezzo: 6 },
        { n: 45, nome: "Hosso sake", desc: "Rotolino di riso avvolto da alga nori ripieno di salmone", prezzo: 6 },
        { n: 46, nome: "Hosso ebi", desc: "Rotolino di riso avvolto da alga nori ripieno di gambero* cotto", prezzo: 6 },
        { n: 47, nome: "Hosso fritto", desc: "Alga nori in crosta, ripieno di salmone, guarnito con philadelphia, salsa teriyaki e pasta kataifi*", prezzo: 8 }
      ]},
      { categoria: "Hakozushi · 4 pz", piatti: [
        { n: 48, nome: "Black sake", desc: "Tortino di riso venere alla barbabietola con salmone piccante, philadelphia, pistacchio e salsa teriyaki", prezzo: 8 },
        { n: 49, nome: "Sake cotto", desc: "Tortino di riso bianco con salmone cotto, philadelphia, pasta kataifi* e salsa teriyaki", prezzo: 8 },
        { n: 50, nome: "Maguro", desc: "Tortino di riso bianco con tonno piccante, philadelphia, mandorle e salsa teriyaki", prezzo: 8 },
        { n: 51, nome: "Sake spicy", desc: "Tortino di riso bianco con salmone piccante, philadelphia, mandorle e salsa teriyaki", prezzo: 8 }
      ]},
      { categoria: "Uramaki · 4 pz", piatti: [
        { n: 52, nome: "Ebi maki", desc: "Ripieno di gambero* cotto, avocado e semi di sesamo", prezzo: 8 },
        { n: 53, nome: "California", desc: "Ripieno di granchio surimi*, avocado, maionese e semi di sesamo", prezzo: 8 },
        { n: 54, nome: "Tonno avocado", desc: "Ripieno di tonno e avocado, semi di sesamo", prezzo: 9 },
        { n: 55, nome: "Salmone avocado", desc: "Ripieno di salmone, avocado e semi di sesamo", prezzo: 8 },
        { n: 56, nome: "Vegetarian roll", desc: "Ripieno di avocado, lattuga, philadelphia e semi di sesamo", prezzo: 7 },
        { n: 57, nome: "Vegetarian plus", desc: "Avvolto con alghe nori, ripieno di zucchini grigliati, avocado, philadelphia, lattuga, salsa teriyaki, pasta kataifi* e semi di sesamo", prezzo: 8 },
        { n: 58, nome: "Spicy salmone", desc: "Ripieno di salmone tartare, salsa spicy maio e semi di sesamo", prezzo: 9 },
        { n: 59, nome: "Spicy tuna", desc: "Ripieno di tonno tartare, salsa spicy maio e semi di sesamo", prezzo: 9 },
        { n: 60, nome: "Ebiten", desc: "Ripieno di gambero* fritto, maionese, salsa teriyaki, pasta kataifi* croccante e semi di sesamo", prezzo: 9 },
        { n: 61, nome: "Crispy salmone e mango", desc: "Tempura di salmone, mango, philadelphia, salsa mango e teriyaki", prezzo: 10 },
        { n: 62, nome: "Tori e mango", desc: "Tempura di pollo, mango, philadelphia, salsa mango e teriyaki", prezzo: 10 },
        { n: 63, nome: "Ebiten e mango", desc: "Tempura di gamberi, mango, philadelphia, salsa mango e teriyaki", prezzo: 10 },
        { n: 64, nome: "Miura maki", desc: "Ripieno di salmone grigliato, lattuga, philadelphia, salsa teriyaki, pasta kataifi* e semi di sesamo", prezzo: 8 },
        { n: 65, nome: "Philadelphia salmon", desc: "Ripieno di salmone, philadelphia, avocado e semi di sesamo", prezzo: 8 },
        { n: 66, nome: "Tartare roll", desc: "Ripieno di tartare di salmone, philadelphia, semi di sesamo", prezzo: 9 },
        { n: 67, nome: "Rainbow", desc: "Ripieno di granchio* surimi, maionese, all'esterno gambero* cotto, branzino, tonno, salmone, avocado e semi di sesamo", prezzo: 10 },
        { n: 68, nome: "Tiger roll", desc: "Ripieno di gambero* fritto, all'esterno salmone, branzino, tobiko*, maionese, salsa teriyaki, pasta kataifi* e semi di sesamo", prezzo: 10 },
        { n: 69, nome: "Uramaki fritto", desc: "Ripieno di avocado, surimi, philadelphia, pasta kataifi", prezzo: 10 },
        { n: 70, nome: "Uramaki tori", desc: "Ripieno di pollo fritto, maionese, teriyaki, kataifi", prezzo: 10 },
        { n: 71, nome: "Crispy salmone roll", desc: "Ripieno di surimi, fibra di carne, maionese, avocado, sesamo", prezzo: 10 }
      ]},
      { categoria: "Black roll · 4 pz", piatti: [
        { n: 72, nome: "Black salmon", desc: "Riso venere con alghe nori, ripieno di philadelphia, salmone, avocado e semi di sesamo", prezzo: 8 },
        { n: 73, nome: "Black vegetarian", desc: "Riso venere con alghe nori, ripieno di avocado, lattuga, philadelphia e semi di sesamo", prezzo: 7 },
        { n: 74, nome: "Black rainbow", desc: "Ripieno di granchio surimi, all'esterno gambero cotto, branzino, tonno, salmone, avocado, maionese e semi di sesamo", prezzo: 10 },
        { n: 75, nome: "Black salmon plus", desc: "Ripieno di salmone, avocado, all'esterno salmone e mandorle, salsa teriyaki e semi di sesamo", prezzo: 10 },
        { n: 76, nome: "Black ebiten", desc: "Ripieno di gambero* fritto, maionese, all'esterno salmone scottato, salsa teriyaki, pasta kataifi* e semi di sesamo", prezzo: 8 }
      ]},
      { categoria: "Gunkan · 2 pz", piatti: [
        { n: 77, nome: "Spicy salmone", desc: "Bocconcino di riso avvolto da alga nori, guarnito con tartare di salmone e spicy mayo", prezzo: 5 },
        { n: 78, nome: "Spicy tuna", desc: "Bocconcino di riso avvolto da alga nori, guarnito con tartare di tonno e spicy mayo", prezzo: 5 },
        { n: 79, nome: "Zucchini ebi", desc: "Riso avvolto da zucchine cotte, guarnito con philadelphia, gambero fritto, salsa teriyaki e pasta kataifi*", prezzo: 5 },
        { n: 80, nome: "Crab", desc: "Riso avvolto da zucchine cotte, guarnito con surimi di granchio condito con maionese", prezzo: 5 },
        { n: 81, nome: "Salmon flambé", desc: "Riso avvolto da salmone scottato, guarnito con crema al latte e granella di pistacchio", prezzo: 6 },
        { n: 82, nome: "Salmone philadelphia", desc: "Bocconcino di riso avvolto da salmone, guarnito con philadelphia", prezzo: 5 },
        { n: 83, nome: "Salmone out", desc: "Bocconcino di riso avvolto da salmone, guarnito con tartare di salmone", prezzo: 5 },
        { n: 84, nome: "Sake longe salmone", desc: "Gambero* fritto avvolto con carpaccio di salmone scottato, philadelphia, pistacchio e salsa teriyaki lemon", prezzo: 6 },
        { n: 85, nome: "Ebi longe roll", desc: "Gambero* fritto e avocado avvolti da carpaccio di salmone scottato, guarniti con philadelphia, pasta kataifi* e salsa teriyaki", prezzo: 6 }
      ]},
      { categoria: "Gunkan nido · 2 pz", piatti: [
        { n: 86, nome: "Nido sake", desc: "Bocconcini di riso bianco con salmone piccante", prezzo: 5 },
        { n: 87, nome: "Nido white", desc: "Bocconcini di riso bianco con philadelphia", prezzo: 5 },
        { n: 88, nome: "Black nido sake", desc: "Bocconcini di riso venere con salmone piccante", prezzo: 5 },
        { n: 89, nome: "Nido black", desc: "Bocconcini di riso venere con philadelphia", prezzo: 5 }
      ]},
      { categoria: "Temaki · 1 pz", piatti: [
        { n: 90, nome: "Temaki California", desc: "Cornetto di alga nori ripieno di riso, avocado, surimi di granchio conditi con maionese", prezzo: 5 },
        { n: 91, nome: "Temaki spicy tuna", desc: "Cornetto di alga nori ripieno di riso, tonno, spicy maio e sesamo", prezzo: 6 },
        { n: 92, nome: "Temaki ebiten", desc: "Cornetto di alga nori ripieno di riso, gambero* fritto, maionese, salsa teriyaki, pasta kataifi", prezzo: 5 },
        { n: 93, nome: "Temaki spicy salmon", desc: "Cornetto di alga nori ripieno di riso, salmone, spicy maio e sesamo", prezzo: 6 },
        { n: 94, nome: "Temaki salmon", desc: "Cornetto di alga nori ripieno di riso, salmone, avocado", prezzo: 5 }
      ]},
      { categoria: "Tataki e sashimi", piatti: [
        { n: 95, nome: "Salmone tataki", desc: "Fette di salmone scottato guarnito con salsa teriyaki e semi di sesamo", prezzo: 13 },
        { n: 96, nome: "Tonno tataki", desc: "Fette di tonno scottato guarnito con salsa teriyaki e semi di sesamo", prezzo: 14 },
        { n: 97, nome: "Sashimi salmone", desc: "Fette di salmone crudo", prezzo: 12 },
        { n: 98, nome: "Sashimi tuna", desc: "Fette di tonno crudo", prezzo: 13 },
        { n: 99, nome: "Sashimi misto", desc: "Fette miste di salmone, tonno, branzino", prezzo: 13 }
      ]},
      { categoria: "Stuzzichini sfiziosi", piatti: [
        { n: 100, nome: "Tacos sake", desc: "Pasta sfoglia* croccante ripiena di salmone piccante, philadelphia, avocado, mandorle e salsa teriyaki", prezzo: 6 },
        { n: 101, nome: "Tacos salmone cotto", desc: "Pasta sfoglia* croccante ripiena di salmone cotto, avocado, philadelphia, mandorle e salsa teriyaki", prezzo: 6 },
        { n: 102, nome: "Takito salmon", desc: "Biscotto croccante con tartare di salmone, guarnito con guacamole, pasta kataifi* e teriyaki lemon", prezzo: 6 },
        { n: 103, nome: "Takito ebi", desc: "Biscotto croccante con gambero* fritto, guarnito con guacamole e salsa teriyaki", prezzo: 6 },
        { n: 104, nome: "Yamato miura", desc: "Tofu inari, salmone cotto, teriyaki", prezzo: 5 },
        { n: 105, nome: "Yamato ebiten", desc: "Tofu inari, riso, tempura di gamberi, teriyaki, kataifi", prezzo: 5 },
        { n: 106, nome: "Yamato maguro", desc: "Tofu inari, riso, tonno, salsa spicy", prezzo: 6 },
        { n: 107, nome: "Yamato fly", desc: "Tofu inari, riso, fibre di carne, salsa teriyaki", prezzo: 6 },
        { n: 108, nome: "Yamato sake", desc: "Tofu inari, riso, salmone, salsa spicy", prezzo: 5 },
        { n: 109, nome: "Millefoglie sake", desc: "Salmone, tofu, alghe, cipolla", prezzo: 5 },
        { n: 110, nome: "Millefoglie maguro", desc: "Tonno, tofu, alghe, cipolla", prezzo: 6 },
        { n: 111, nome: "Millefoglie philadelphia", desc: "Philadelphia, pistacchio", prezzo: 4 }
      ]},
      { categoria: "Tartare", piatti: [
        { n: 112, nome: "Salmon tartare", desc: "Tartare di salmone con salsa dello chef", prezzo: 9 },
        { n: 113, nome: "Tuna tartare", desc: "Tartare di tonno con salsa wasabi shoyu", prezzo: 10 },
        { n: 114, nome: "Mojito salmon", desc: "Cubetti di salmone con gelatina e salsa al mojito, guarnito con scorza di lime", prezzo: 11 },
        { n: 115, nome: "Pinacolada tuna", desc: "Cubetti di tonno e ananas fresco con salsa alla pinacolada", prezzo: 13 },
        { n: 116, nome: "Black crab", desc: "Riso venere, tartare di granchio* surimi, avocado, semi di sesamo, pasta kataifi*, maionese, tobiko* e salsa teriyaki", prezzo: 8 },
        { n: 117, nome: "Black tartare", desc: "Tortino di riso venere con tartare di salmone, cubetti di avocado, pasta kataifi*, tobiko* e salsa dello chef", prezzo: 10 }
      ]},
      { categoria: "Carpaccio", piatti: [
        { n: 118, nome: "Carpaccio sake", desc: "Carpaccio di salmone su salsa ponzu e semi di sesamo", prezzo: 10 },
        { n: 119, nome: "Carpaccio tonno", desc: "Carpaccio di tonno su salsa ponzu e semi di sesamo", prezzo: 11 },
        { n: 120, nome: "Carpaccio misto", desc: "Carpaccio di salmone, branzino, tonno su salsa ponzu e semi di sesamo", prezzo: 11 }
      ]},
      { categoria: "Piatti special", piatti: [
        { n: 301, nome: "Misto di mare freddo", desc: "Gamberi, calamari, polpa di granchio, peperoni, carote, polipo, prezzemolo", prezzo: 13 },
        { n: 302, nome: "Onabe con misto di mare", desc: "Gamberi, gamberoni, calamari, polpa di granchio, polipo, verdure", prezzo: 13 },
        { n: 303, nome: "Tataki royal", desc: "Tonno scottato guarnito con crema di avocado, mandorle e salsa al tartufo", prezzo: 13 },
        { n: 304, nome: "Tataki plus", desc: "Filetto di tonno servito in leggera panatura di granella di pistacchio e sesamo, con salsa sesamo", prezzo: 13 },
        { n: 305, nome: "Tartare tonno plus", desc: "Cubetti di tonno con salsa stracciatella, serviti con olio aromatizzato al basilico", prezzo: 13 },
        { n: 306, nome: "Salmon king", desc: "Carpaccio di salmone scottato con salsa mango cheese, guarnito con pistacchio e tobiko*", prezzo: 13 },
        { n: 307, nome: "Sashimi misto speciale", desc: "Salmone, tonno, branzino, gambero rosso, scampi", prezzo: 13 },
        { n: 308, nome: "Tris di tartare", desc: "Salmone con salsa dello chef, tonno con salsa wasabi shoyu, gambero* crudo con salsa al mango e semi di sesamo", prezzo: 13 },
        { n: 309, nome: "Sashimi flambé", desc: "Sashimi di salmone scottato con salsa sesamo", prezzo: 13 },
        { n: 310, nome: "Tuna royal", desc: "Cubetti di tonno guarniti con pasta kataifi, tobiko*, salsa tartufo e stracciatella", prezzo: 13 },
        { n: 311, nome: "Amaebi royal", desc: "Gambero* crudo guarnito con crema di avocado, ikura, stracciatella, servito con olio aromatizzato al basilico", prezzo: 13 },
        { n: 312, nome: "Carpaccio rainbow*", desc: "Salmone, tonno, branzino, gambero* rosso con crema stracciatella, olio aromatizzato al basilico, guarnito con gelatina al mango e tobiko*", prezzo: 13 }
      ]},
      { categoria: "Special roll · 4 pz", piatti: [
        { n: 313, nome: "Green tiger", desc: "Ripieno di gambero* fritto e maionese, all'esterno carpaccio di salmone, salsa e granella di pistacchio, semi di sesamo", prezzo: 13 },
        { n: 314, nome: "Tori fly", desc: "Ripieno di pollo fritto, salmone, philadelphia, salsa terimaki", prezzo: 13 },
        { n: 315, nome: "California special", desc: "Ripieno di surimi di granchio* e avocado, all'esterno tartare di salmone, cipolla fritta, spicy mayo e semi di sesamo", prezzo: 13 },
        { n: 316, nome: "Ebiten flambé", desc: "Ripieno di gambero* fritto, all'esterno tartare di salmone scottato, crema al latte, salsa teriyaki, pasta kataifi* e semi di sesamo", prezzo: 13 },
        { n: 317, nome: "Ebiten scottato", desc: "Ripieno di gambero* fritto e maionese, all'esterno salmone scottato, salsa teriyaki, pasta kataifi* e semi di sesamo", prezzo: 13 },
        { n: 318, nome: "Ebiten fly roll", desc: "Ripieno di gambero* fritto, salmone, formaggio flambé, salsa teriyaki", prezzo: 13 },
        { n: 319, nome: "Uramaki speciale", desc: "Ripieno di fibra di carne tritata, pesce misto, philadelphia, mela", prezzo: 13 },
        { n: 320, nome: "Crispy roll fly", desc: "Ripieno di salmone fritto, philadelphia, kataifi, salsa teriyaki, formaggio flambé", prezzo: 13 }
      ]},
      { categoria: "Primi piatti", piatti: [
        { n: 121, nome: "Riso bianco", prezzo: 3 },
        { n: 122, nome: "Riso alla cantonese", desc: "Prosciutto, piselli*, uova", prezzo: 5 },
        { n: 123, nome: "Riso saltato con gamberi e verdure", desc: "Gamberi*, verdure, uovo", prezzo: 6 },
        { n: 124, nome: "Riso saltato con verdure", desc: "Verdure, uovo", prezzo: 4.5 },
        { n: 125, nome: "Riso saltato Cao Law Fan", desc: "Pollo*, gamberi*, verdure, uova, salsa di soia", prezzo: 6 },
        { n: 126, nome: "Riso al curry", desc: "Pollo, cipolla, piselli, cipollini, uova", prezzo: 5 },
        { n: 127, nome: "Riso con mais e ananas", desc: "Mais, ananas, uova", prezzo: 6 },
        { n: 128, nome: "Riso con frutti di mare", desc: "Gamberi, calamari, polpa di granchio, cipollini, uova", prezzo: 8 },
        { n: 129, nome: "Yaki udon saltato con verdure", desc: "Verdure, uova, salsa", prezzo: 6 },
        { n: 130, nome: "Yaki udon saltato con gamberi e verdure", desc: "Verdure, gamberi*, uova, salsa", prezzo: 7 },
        { n: 131, nome: "Yaki udon con frutti di mare", desc: "Gamberi, calamari, polpa di granchio, uova, salsa", prezzo: 8 },
        { n: 132, nome: "Yaki soba saltato con verdure", desc: "Spaghetti di grano saraceno, verdure, uova", prezzo: 6 },
        { n: 133, nome: "Yaki soba saltato con gamberi e verdure", desc: "Spaghetti di grano saraceno, verdure, gamberi*, uova", prezzo: 7 },
        { n: 134, nome: "Yaki soba saltato con frutti di mare", desc: "Gamberi, calamari, polpa di granchio, cipollini, uova", prezzo: 8 },
        { n: 135, nome: "Spaghetti di soia saltati con verdure", desc: "Verdure, uovo", prezzo: 5 },
        { n: 136, nome: "Spaghetti di soia saltati con gamberi e verdure", desc: "Gamberi*, verdure", prezzo: 6 },
        { n: 137, nome: "Spaghetti di soia con frutti di mare", desc: "Gamberi, calamari, polpa di granchio, cipollini", prezzo: 7 },
        { n: 138, nome: "Spaghetti di riso saltati con verdure", desc: "Verdure, uovo", prezzo: 5 },
        { n: 139, nome: "Spaghetti di riso saltati con gamberi e verdure", desc: "Gamberi*, verdure, uovo", prezzo: 6 },
        { n: 140, nome: "Spaghetti di riso con frutti di mare", desc: "Gamberi, calamari, polpa di granchio, cipollini, uova", prezzo: 7 },
        { n: 141, nome: "Ramen con verdure e uova", desc: "Noodles in brodo, verdure miste, alghe, uova", prezzo: 8 },
        { n: 142, nome: "Ramen con ebiten e uova", desc: "Noodles in brodo, tempura di gamberi, alghe, uova", prezzo: 10 },
        { n: 143, nome: "Ramen con manzo e uova", desc: "Noodles in brodo, manzo, alghe, uova", prezzo: 10 }
      ]},
      { categoria: "Pollo", piatti: [
        { n: 144, nome: "Pollo alle mandorle", desc: "Cubetti di pollo*, carote, bambù, mandorle, saltati in wok con salsa di soia", prezzo: 6 },
        { n: 145, nome: "Pollo in agrodolce", desc: "Fettine di pollo* con ananas, pomodoro fresco e piselli saltati in wok con salsa agrodolce", prezzo: 6 },
        { n: 146, nome: "Pollo in salsa chili", desc: "Fettine di pollo* con peperoni rossi e cipolla saltati in wok con salsa piccante e cipollotto", prezzo: 6 },
        { n: 147, nome: "Pollo con bambù e funghi cinesi", desc: "Fettine di pollo* con bambù e funghi", prezzo: 6 },
        { n: 148, nome: "Pollo con patate", desc: "Pollo, patate, cipollini", prezzo: 6 },
        { n: 149, nome: "Pollo limone", desc: "Pollo, limone, cipollini", prezzo: 6 }
      ]},
      { categoria: "Manzo", piatti: [
        { n: 150, nome: "Manzo con peperoni*", desc: "Manzo con peperoni dolci", prezzo: 7 },
        { n: 151, nome: "Manzo con bambù e funghi cinesi*", desc: "Manzo con bambù e funghi cinesi", prezzo: 7 },
        { n: 152, nome: "Manzo in salsa chili*", desc: "Manzo in salsa piccante con cipollotto", prezzo: 7 },
        { n: 153, nome: "Manzo con patate", prezzo: 7 },
        { n: 154, nome: "Manzo con porro", prezzo: 7 }
      ]},
      { categoria: "Gamberi", piatti: [
        { n: 155, nome: "Gamberi al curry*", desc: "Gamberetti con bambù e cipolla, saltati in wok con salsa al curry", prezzo: 7 },
        { n: 156, nome: "Gamberi in sale e pepe*", desc: "Gamberetti con cipolla, peperoni rossi ed erba cipollina saltati al secco in wok, con sale e pepe cinese", prezzo: 7 },
        { n: 157, nome: "Gamberi con bambù e funghi*", desc: "Gamberetti con bambù e funghi cinesi, saltati in wok con salsa di soia", prezzo: 7 },
        { n: 158, nome: "Gamberi in agrodolce*", desc: "Gamberetti con ananas, pomodoro fresco e piselli saltati in wok con salsa agrodolce", prezzo: 7 },
        { n: 159, nome: "Gamberi al chili*", desc: "Gamberetti con peperoni rossi e cipolla, saltati in wok con salsa piccante e cipollotto", prezzo: 7 },
        { n: 160, nome: "Gamberi limone", desc: "Gamberi, limone, cipollini", prezzo: 7 },
        { n: 161, nome: "Gamberi con patate*", desc: "Gamberi, patate, cipollini", prezzo: 7 }
      ]},
      { categoria: "Griglia", piatti: [
        { n: 162, nome: "Salmone grigliato", desc: "Servito con salsa teriyaki", prezzo: 10 },
        { n: 163, nome: "Seppioline grigliate", desc: "Servito con salsa teriyaki", prezzo: 10 },
        { n: 164, nome: "Tonno grigliato", desc: "Servito con salsa teriyaki", prezzo: 12 },
        { n: 165, nome: "Gamberoni grigliati · 2 pz", desc: "Serviti con salsa teriyaki", prezzo: 15 },
        { n: 166, nome: "Grigliata di pesce*", desc: "Salmone, tonno, spiedini di gamberi*, gamberoni* serviti con salsa teriyaki", prezzo: 15 },
        { n: 167, nome: "Salsiccia grigliata", desc: "Servito con salsa teriyaki", prezzo: 10 },
        { n: 168, nome: "Spiedini di gamberi grigliati*", desc: "Servito con salsa teriyaki", prezzo: 8 },
        { n: 169, nome: "Spiedini di pollo grigliato*", desc: "Servito con salsa teriyaki", prezzo: 8 },
        { n: 170, nome: "Spiedini di manzo", desc: "Servito con salsa teriyaki", prezzo: 10 },
        { n: 171, nome: "Spiedini di tofu fish cake", desc: "Servito con salsa teriyaki", prezzo: 8 }
      ]},
      { categoria: "Contorni", piatti: [
        { n: 172, nome: "Insalata mista", prezzo: 5 },
        { n: 173, nome: "Patatine fritte*", prezzo: 5 },
        { n: 174, nome: "Verdure grigliate", prezzo: 5 },
        { n: 175, nome: "Verdure miste saltate", desc: "Germogli di soia, carote, zucchine, bambù e funghi cinesi", prezzo: 5 },
        { n: 176, nome: "Patate saltate", prezzo: 5 }
      ]},
      { categoria: "Onabe", piatti: [
        { n: 177, nome: "Onabe con manzo", prezzo: 12 },
        { n: 178, nome: "Onabe con gamberi e verdure", prezzo: 12 },
        { n: 179, nome: "Onabe con ciuffi di calamari e verdure", prezzo: 12 },
        { n: 180, nome: "Onabe con gamberoni e verdure", prezzo: 15 }
      ]},
      { categoria: "Dessert", extra: true, piatti: [
        { nome: "Venere nera", desc: "Nocciola e crema al cioccolato fondente su Pan di Spagna al cacao, con granella croccante di cioccolato al latte e glassa al cacao. Fatto con Nocciola Piemonte IGP", prezzo: 6.5 },
        { nome: "Cupolina croccante al cioccolato", desc: "Pan di Spagna al cacao farcito con crema alla nocciola, ricoperto di cioccolato al latte e nocciole", prezzo: 6.5 },
        { nome: "Goccia tiramisù", desc: "Pan di Spagna inzuppato al caffè e profumato agli agrumi e al cardamomo, crema al mascarpone, panna fresca e cremoso al caffè", prezzo: 6.5 },
        { nome: "Rondò cocco e cioccolato", desc: "Gelato al cioccolato amaro e gelato al cocco, decorati con cioccolato e meringa", prezzo: 6.5 },
        { nome: "Cubo ai due cioccolati", desc: "Panna fresca e cioccolato bianco su crunch alla nocciola e Pan di Spagna, con cioccolato fondente di Santo Domingo", prezzo: 6.5 },
        { nome: "Sacher", desc: "Pan di Spagna al cacao con farcitura all'albicocca, ricoperto di cioccolato", prezzo: 6.5 },
        { nome: "Soufflé al pistacchio", desc: "Soufflé al cioccolato con cuore al pistacchio liquido", prezzo: 6.5 },
        { nome: "Soufflé al cioccolato", desc: "Soufflé con cuore di cioccolato liquido", prezzo: 6.5 },
        { nome: "Limone sorbetto", desc: "Frutto ripieno con sorbetto di limone", prezzo: 6.5 },
        { nome: "Cocco ripieno", desc: "Noce di cocco ripiena con gelato al cocco", prezzo: 6.5 },
        { nome: "Mochi", desc: "Dolce giapponese: morbida pasta di riso ripiena di gelato. Gusti: cocco, pistacchio, mango e cioccolato", prezzo: 6.5 },
        { nome: "Tartufo cheesecake", desc: "Gelato cheesecake con salsa alle fragole e lamponi, ricoperto da crumble di pasta frolla al burro", prezzo: 6.5 },
        { nome: "Crema catalana in coccio", desc: "Crema catalana con zucchero caramellato", prezzo: 6.5 },
        { nome: "Tiramisù gluten free", desc: "Crema al mascarpone e Pan di Spagna con inzuppatura al caffè", prezzo: 6.5 },
        { nome: "Semifreddo al caffè", desc: "Semifreddo al caffè con cuore alla vaniglia e granella di Pan di Spagna al cacao", prezzo: 6.5 },
        { nome: "Ananas ripieno", desc: "Frutto ripieno di sorbetto di ananas", prezzo: 6.5 },
        { nome: "Ananas fresco", prezzo: 6.5 }
      ]},
      { categoria: "Cocktail", extra: true, piatti: [
        { nome: "Japanese iced tea", desc: "Vodka, gin, rum bianco, Midori, lime, zucchero, seltz soda", prezzo: 8 },
        { nome: "Cucumber iced tea", desc: "Gin Roku, lemon tea Nexus, sciroppo di cetriolo, seltz soda", prezzo: 8 },
        { nome: "Orange passion", desc: "Varadero Silver, sciroppo di passion fruit, succo di pompelmo rosa, soda rosa J. Gasco", prezzo: 8 },
        { nome: "Sake mojito", desc: "Sake Kikuisami Umeshu, menta fresca, succo di lime, seltz soda", prezzo: 8 },
        { nome: "Spritz Aperol", desc: "Aperol, prosecco, soda", prezzo: 7 },
        { nome: "Spritz Campari", desc: "Campari, prosecco, soda", prezzo: 7 },
        { nome: "Spritz Hugo", desc: "St. Germain liquore al sambuco, prosecco, soda", prezzo: 7 },
        { nome: "Negroni", desc: "Gin, Campari, Martini Rosso", prezzo: 7 }
      ]},
      { categoria: "Bevande", extra: true, piatti: [
        { nome: "Acqua minerale 75 cl", prezzo: 2.5 },
        { nome: "Acqua minerale 50 cl", prezzo: null },
        { nome: "Bibite in bottiglia 33 cl", desc: "Coca-Cola, Fanta, Sprite", prezzo: null },
        { nome: "Estathe 33 cl", desc: "Limone o pesca", prezzo: 3 },
        { nome: "Vino della casa alla spina · ¼ l", desc: "Bianco fermo, bianco frizzante o rosso. ½ l € 6,00 · 1 l € 11,00", prezzo: 3.5 },
        { nome: "Calice di vino DOC", desc: "Bianco fermo o rosso", prezzo: 4.5 },
        { nome: "Calice di prosecco", prezzo: 4.5 },
        { nome: "Birra alla spina Nastro Azzurro · piccola 20 cl", prezzo: 3.5 },
        { nome: "Birra alla spina Nastro Azzurro · media 40 cl", prezzo: 5.5 },
        { nome: "Birra cinese Tsingtao 64 cl", desc: "In bottiglia", prezzo: 6 },
        { nome: "Birra giapponese Asahi 50 cl", desc: "In bottiglia", prezzo: 6 },
        { nome: "Birra giapponese Sapporo 65 cl", desc: "In lattina", prezzo: 8 },
        { nome: "Caffè espresso", prezzo: 1.5 },
        { nome: "Caffè decaffeinato", prezzo: 1.5 },
        { nome: "Caffè doppio", prezzo: 2.5 },
        { nome: "Caffè corretto", prezzo: 2 },
        { nome: "Caffè d'orzo", prezzo: 2 },
        { nome: "Caffè ginseng", prezzo: 2 },
        { nome: "Cappuccino", prezzo: 2.5 },
        { nome: "Tè caldo", prezzo: null },
        { nome: "Grappa cinese", prezzo: 4 },
        { nome: "Sake giapponese", prezzo: 4 },
        { nome: "Amaro", prezzo: 4 },
        { nome: "Cognac", prezzo: 4 },
        { nome: "Grappa", prezzo: null },
        { nome: "Whisky", prezzo: null }
      ]},
      { categoria: "Vini · bottiglia 0,75 l", extra: true, piatti: [
        { nome: "Millesimato Extra Dry", desc: "Bianco", prezzo: 18 },
        { nome: "Pigato Riviera di Ponente", desc: "Bianco", prezzo: 20 },
        { nome: "Pinot Grigio", desc: "Bianco", prezzo: 20 },
        { nome: "Chardonnay", desc: "Bianco", prezzo: 20 },
        { nome: "Vermentino Colli di Luni", desc: "Bianco", prezzo: 25 },
        { nome: "Gewürztraminer", desc: "Bianco", prezzo: 25 },
        { nome: "Müller Thurgau", desc: "Bianco", prezzo: 25 },
        { nome: "Ribolla Gialla", desc: "Bianco", prezzo: 25 },
        { nome: "Sauvignon", desc: "Bianco", prezzo: 25 },
        { nome: "Falanghina", desc: "Bianco", prezzo: 25 },
        { nome: "Prosecco Extra Dry Treviso", desc: "Bollicine", prezzo: 20 },
        { nome: "Prosecco di Valdobbiadene Brut DOCG", desc: "Bollicine", prezzo: 25 },
        { nome: "Prosecco Millesimato", desc: "Bollicine", prezzo: 25 },
        { nome: "Prosecco Rosé", desc: "Bollicine", prezzo: 25 },
        { nome: "Franciacorta Brut", desc: "Bollicine", prezzo: 35 },
        { nome: "Bonarda", desc: "Rosso", prezzo: 20 },
        { nome: "Refosco dal Peduncolo Rosso", desc: "Rosso", prezzo: 20 },
        { nome: "Nero d'Avola DOC", desc: "Rosso", prezzo: 20 },
        { nome: "Chianti Riserva DOCG", desc: "Rosso", prezzo: 25 },
        { nome: "Barolo DOCG", desc: "Rosso", prezzo: 40 },
        { nome: "Brunello di Montalcino DOCG", desc: "Rosso", prezzo: 50 },
        { nome: "Amarone della Valpolicella", desc: "Rosso", prezzo: 60 }
      ]}
    ],
    menu: [
      { categoria: "Antipasti", piatti: [
        { n: 1, nome: "Involtini primavera", prezzo: 2.5 },
        { n: 2, nome: "Involtini di gamberi", prezzo: 3 },
        { n: 3, nome: "Involtini con pollo vietnamita", prezzo: 3.5 },
        { n: 4, nome: "Nuvole di gamberi", prezzo: 2 },
        { n: 5, nome: "Gomma wakame", prezzo: 5 },
        { n: 6, nome: "Insalata con gamberi", desc: "Insalata mista con gamberi* e salsa sesamo", prezzo: 7 },
        { n: 7, nome: "Gamberi in salsa rosa", prezzo: 9 },
        { n: 8, nome: "Salmone marinato", prezzo: 9 },
        { n: 9, nome: "Pane cinese al vapore", prezzo: 3 },
        { n: 10, nome: "Edamame", desc: "Fagioli di soia", prezzo: 5 },
        { n: 11, nome: "Rock shrimps", desc: "Bocconcini di gamberi in tempura e salsa spicy maionese", prezzo: 8 },
        { n: 12, nome: "Pane dolce", prezzo: 4 }
      ]},
      { categoria: "Dim sum · 3 pz", soloRistorante: true, piatti: [
        { n: 13, nome: "Ravioli con carne e gamberi", prezzo: 6 },
        { n: 14, nome: "Ravioli con carne", prezzo: 5 },
        { n: 15, nome: "Ravioli con verdure", prezzo: 5 },
        { n: 16, nome: "Ravioli alla griglia", prezzo: 5.5 },
        { n: 17, nome: "Dim sum manzo", desc: "Ravioli al vapore con sfoglia di barbabietola ripieni di manzo", prezzo: 7 },
        { n: 18, nome: "Dim sum calamaro", desc: "Ravioli al vapore con sfoglia al nero di seppia ripieni di calamaro", prezzo: 7 },
        { n: 19, nome: "Dim sum vegetariani", desc: "Ravioli al vapore con sfoglia di spinaci ripieni di verdure", prezzo: 7 },
        { n: 20, nome: "Dim sum di gamberi*", desc: "Ravioli al vapore ripieni di gamberi e merluzzo", prezzo: 7 }
      ]},
      { categoria: "Zuppe", piatti: [
        { n: 21, nome: "Zuppa di miso", desc: "Tofu, alghe, erba cipollina", prezzo: 4 },
        { n: 22, nome: "Zuppa pechinese", desc: "Tofu, alghe, funghi cinesi, pollo, bambù", prezzo: 4 },
        { n: 23, nome: "Zuppa pollo e mais*", desc: "Pollo*, mais e uova", prezzo: 4 },
        { n: 24, nome: "Zuppa con misto di mare", desc: "Zuppa di miso, misto di mare, cipollini", prezzo: 5 }
      ]},
      { categoria: "Fritti", piatti: [
        { n: 25, nome: "Chele di granchio", prezzo: 5 },
        { n: 26, nome: "Ebi tempura", prezzo: 12 },
        { n: 27, nome: "Pollo fritto", prezzo: 8 },
        { n: 28, nome: "Cotoletta di suino fritto", prezzo: 8 },
        { n: 29, nome: "Totani fritti", prezzo: 8 },
        { n: 30, nome: "Tofu fritto", prezzo: 8 },
        { n: 31, nome: "Tempura di pollo", prezzo: 10 },
        { n: 32, nome: "Verdure fritte", desc: "Zucchini, carota, cipolla, melanzane, peperoni", prezzo: 8 }
      ]},
      { categoria: "Nighiri · 2 pz", piatti: [
        { n: 33, nome: "Salmone", desc: "Bocconcino di riso con salmone", prezzo: 3 },
        { n: 34, nome: "Tonno", desc: "Bocconcino di riso con tonno", prezzo: 4 },
        { n: 35, nome: "Branzino", desc: "Bocconcino di riso con branzino", prezzo: 4 },
        { n: 36, nome: "Gambero cotto", desc: "Bocconcino di riso con gambero cotto", prezzo: 4 },
        { n: 37, nome: "Salmon flambé", desc: "Salmone scottato, crema al latte e granella di pistacchio", prezzo: 5 },
        { n: 38, nome: "Avocado", desc: "Bocconcino di riso con avocado", prezzo: 4 },
        { n: 39, nome: "Salmone scottato", desc: "Salmone scottato, philadelphia e salsa teriyaki", prezzo: 5 },
        { n: 40, nome: "Maguro special", desc: "Tonno scottato con salsa spicy cheese, salsa teriyaki e pistacchio", prezzo: 5 },
        { n: 41, nome: "Sake special", desc: "Salmone scottato con salsa spicy cheese, salsa teriyaki e pistacchio", prezzo: 5 },
        { n: 42, nome: "Sushi misto", desc: "2 salmone, 1 tonno, 1 gambero* cotto, 1 branzino", prezzo: 10 }
      ]},
      { categoria: "Hossomaki · 6 pz", piatti: [
        { n: 43, nome: "Hosso avocado", desc: "Rotolino di riso avvolto da alga nori ripieno di avocado", prezzo: 5 },
        { n: 44, nome: "Hosso tekka", desc: "Rotolino di riso avvolto da alga nori ripieno di tonno", prezzo: 6 },
        { n: 45, nome: "Hosso sake", desc: "Rotolino di riso avvolto da alga nori ripieno di salmone", prezzo: 6 },
        { n: 46, nome: "Hosso ebi", desc: "Rotolino di riso avvolto da alga nori ripieno di gambero* cotto", prezzo: 6 },
        { n: 47, nome: "Hosso fritto", desc: "Alga nori in crosta, ripieno di salmone, guarnito con philadelphia, salsa teriyaki e pasta kataifi*", prezzo: 8 }
      ]},
      { categoria: "Hakozushi · 4 pz", piatti: [
        { n: 48, nome: "Black sake", desc: "Tortino di riso venere alla barbabietola con salmone piccante, philadelphia, pistacchio e salsa teriyaki", prezzo: 8 },
        { n: 49, nome: "Sake cotto", desc: "Tortino di riso bianco con salmone cotto, philadelphia, pasta kataifi* e salsa teriyaki", prezzo: 8 },
        { n: 50, nome: "Maguro", desc: "Tortino di riso bianco con tonno piccante, philadelphia, mandorle e salsa teriyaki", prezzo: 8 },
        { n: 51, nome: "Sake spicy", desc: "Tortino di riso bianco con salmone piccante, philadelphia, mandorle e salsa teriyaki", prezzo: 8 }
      ]},
      { categoria: "Uramaki · 8 pz", piatti: [
        { n: 52, nome: "Ebi maki", desc: "Ripieno di gambero* cotto, avocado e semi di sesamo", prezzo: 8 },
        { n: 53, nome: "California", desc: "Ripieno di granchio surimi*, avocado, maionese e semi di sesamo", prezzo: 8 },
        { n: 54, nome: "Tonno avocado", desc: "Ripieno di tonno e avocado, semi di sesamo", prezzo: 9 },
        { n: 55, nome: "Salmone avocado", desc: "Ripieno di salmone, avocado e semi di sesamo", prezzo: 8 },
        { n: 56, nome: "Vegetarian roll", desc: "Ripieno di avocado, lattuga, philadelphia e semi di sesamo", prezzo: 7 },
        { n: 57, nome: "Vegetarian plus", desc: "Avvolto con alghe nori, ripieno di zucchini grigliati, avocado, philadelphia, lattuga, salsa teriyaki, pasta kataifi* e semi di sesamo", prezzo: 8 },
        { n: 58, nome: "Spicy salmone", desc: "Ripieno di salmone tartare, salsa spicy maio e semi di sesamo", prezzo: 9 },
        { n: 59, nome: "Spicy tuna", desc: "Ripieno di tonno tartare, salsa spicy maio e semi di sesamo", prezzo: 9 },
        { n: 60, nome: "Ebiten", desc: "Ripieno di gambero* fritto, maionese, salsa teriyaki, pasta kataifi* croccante e semi di sesamo", prezzo: 9 },
        { n: 61, nome: "Crispy salmone e mango", desc: "Tempura di salmone, mango, philadelphia, salsa mango e teriyaki", prezzo: 10 },
        { n: 62, nome: "Tori e mango", desc: "Tempura di pollo, mango, philadelphia, salsa mango e teriyaki", prezzo: 10 },
        { n: 63, nome: "Ebiten e mango", desc: "Tempura di gamberi, mango, philadelphia, salsa mango e teriyaki", prezzo: 10 },
        { n: 64, nome: "Miura maki", desc: "Ripieno di salmone grigliato, lattuga, philadelphia, salsa teriyaki, pasta kataifi* e semi di sesamo", prezzo: 8 },
        { n: 65, nome: "Philadelphia salmon", desc: "Ripieno di salmone, philadelphia, avocado e semi di sesamo", prezzo: 8 },
        { n: 66, nome: "Tartare roll", desc: "Ripieno di tartare di salmone, philadelphia, semi di sesamo", prezzo: 9 },
        { n: 67, nome: "Rainbow", desc: "Ripieno di granchio* surimi, maionese, all'esterno gambero* cotto, branzino, tonno, salmone, avocado e semi di sesamo", prezzo: 10 },
        { n: 68, nome: "Tiger roll", desc: "Ripieno di gambero* fritto, all'esterno salmone, branzino, tobiko*, maionese, salsa teriyaki, pasta kataifi* e semi di sesamo", prezzo: 10 },
        { n: 69, nome: "Uramaki fritto", desc: "Ripieno di avocado, surimi, philadelphia, pasta kataifi", prezzo: 10 },
        { n: 70, nome: "Uramaki tori", desc: "Ripieno di pollo fritto, maionese, teriyaki, kataifi", prezzo: 10 },
        { n: 71, nome: "Crispy salmone roll", desc: "Ripieno di surimi, fibra di carne, maionese, avocado, sesamo", prezzo: 10 }
      ]},
      { categoria: "Black roll · 8 pz", piatti: [
        { n: 72, nome: "Black salmon", desc: "Riso venere con alghe nori, ripieno di philadelphia, salmone, avocado e semi di sesamo", prezzo: 8 },
        { n: 73, nome: "Black vegetarian", desc: "Riso venere con alghe nori, ripieno di avocado, lattuga, philadelphia e semi di sesamo", prezzo: 7 },
        { n: 74, nome: "Black rainbow", desc: "Ripieno di granchio surimi, all'esterno gambero cotto, branzino, tonno, salmone, avocado, maionese e semi di sesamo", prezzo: 10 },
        { n: 75, nome: "Black salmon plus", desc: "Ripieno di salmone, avocado, all'esterno salmone e mandorle, salsa teriyaki e semi di sesamo", prezzo: 10 },
        { n: 76, nome: "Black ebiten", desc: "Ripieno di gambero* fritto, maionese, all'esterno salmone scottato, salsa teriyaki, pasta kataifi* e semi di sesamo", prezzo: 8 }
      ]},
      { categoria: "Gunkan · 2 pz", piatti: [
        { n: 77, nome: "Spicy salmone", desc: "Bocconcino di riso avvolto da alga nori, guarnito con tartare di salmone e spicy mayo", prezzo: 5 },
        { n: 78, nome: "Spicy tuna", desc: "Bocconcino di riso avvolto da alga nori, guarnito con tartare di tonno e spicy mayo", prezzo: 5 },
        { n: 79, nome: "Zucchini ebi", desc: "Riso avvolto da zucchine cotte, guarnito con philadelphia, gambero fritto, salsa teriyaki e pasta kataifi*", prezzo: 5 },
        { n: 80, nome: "Crab", desc: "Riso avvolto da zucchine cotte, guarnito con surimi di granchio condito con maionese", prezzo: 5 },
        { n: 81, nome: "Salmon flambé", desc: "Riso avvolto da salmone scottato, guarnito con crema al latte e granella di pistacchio", prezzo: 6 },
        { n: 82, nome: "Salmone philadelphia", desc: "Bocconcino di riso avvolto da salmone, guarnito con philadelphia", prezzo: 5 },
        { n: 83, nome: "Salmone out", desc: "Bocconcino di riso avvolto da salmone, guarnito con tartare di salmone", prezzo: 5 },
        { n: 84, nome: "Sake longe salmone", desc: "Gambero* fritto avvolto con carpaccio di salmone scottato, philadelphia, pistacchio e salsa teriyaki lemon", prezzo: 6 },
        { n: 85, nome: "Ebi longe roll", desc: "Gambero* fritto e avocado avvolti da carpaccio di salmone scottato, guarniti con philadelphia, pasta kataifi* e salsa teriyaki", prezzo: 6 }
      ]},
      { categoria: "Gunkan nido · 2 pz", piatti: [
        { n: 86, nome: "Nido sake", desc: "Bocconcini di riso bianco con salmone piccante", prezzo: 5 },
        { n: 87, nome: "Nido white", desc: "Bocconcini di riso bianco con philadelphia", prezzo: 5 },
        { n: 88, nome: "Black nido sake", desc: "Bocconcini di riso venere con salmone piccante", prezzo: 5 },
        { n: 89, nome: "Nido black", desc: "Bocconcini di riso venere con philadelphia", prezzo: 5 }
      ]},
      { categoria: "Temaki · 1 pz", piatti: [
        { n: 90, nome: "Temaki California", desc: "Cornetto di alga nori ripieno di riso, avocado, surimi di granchio conditi con maionese", prezzo: 5 },
        { n: 91, nome: "Temaki spicy tuna", desc: "Cornetto di alga nori ripieno di riso, tonno, spicy maio e sesamo", prezzo: 6 },
        { n: 92, nome: "Temaki ebiten", desc: "Cornetto di alga nori ripieno di riso, gambero* fritto, maionese, salsa teriyaki, pasta kataifi", prezzo: 5 },
        { n: 93, nome: "Temaki spicy salmon", desc: "Cornetto di alga nori ripieno di riso, salmone, spicy maio e sesamo", prezzo: 6 },
        { n: 94, nome: "Temaki salmon", desc: "Cornetto di alga nori ripieno di riso, salmone, avocado", prezzo: 5 }
      ]},
      { categoria: "Tataki e sashimi", piatti: [
        { n: 95, nome: "Salmone tataki", desc: "Fette di salmone scottato guarnito con salsa teriyaki e semi di sesamo", prezzo: 13 },
        { n: 96, nome: "Tonno tataki", desc: "Fette di tonno scottato guarnito con salsa teriyaki e semi di sesamo", prezzo: 14 },
        { n: 97, nome: "Sashimi salmone", desc: "Fette di salmone crudo", prezzo: 12 },
        { n: 98, nome: "Sashimi tuna", desc: "Fette di tonno crudo", prezzo: 13 },
        { n: 99, nome: "Sashimi misto", desc: "Fette miste di salmone, tonno, branzino", prezzo: 13 }
      ]},
      { categoria: "Stuzzichini sfiziosi", piatti: [
        { n: 100, nome: "Tacos sake", desc: "Pasta sfoglia* croccante ripiena di salmone piccante, philadelphia, avocado, mandorle e salsa teriyaki", prezzo: 6 },
        { n: 101, nome: "Tacos salmone cotto", desc: "Pasta sfoglia* croccante ripiena di salmone cotto, avocado, philadelphia, mandorle e salsa teriyaki", prezzo: 6 },
        { n: 102, nome: "Takito salmon", desc: "Biscotto croccante con tartare di salmone, guarnito con guacamole, pasta kataifi* e teriyaki lemon", prezzo: 6 },
        { n: 103, nome: "Takito ebi", desc: "Biscotto croccante con gambero* fritto, guarnito con guacamole e salsa teriyaki", prezzo: 6 },
        { n: 104, nome: "Yamato miura", desc: "Tofu inari, salmone cotto, teriyaki", prezzo: 5 },
        { n: 105, nome: "Yamato ebiten", desc: "Tofu inari, riso, tempura di gamberi, teriyaki, kataifi", prezzo: 5 },
        { n: 106, nome: "Yamato maguro", desc: "Tofu inari, riso, tonno, salsa spicy", prezzo: 6 },
        { n: 107, nome: "Yamato fly", desc: "Tofu inari, riso, fibre di carne, salsa teriyaki", prezzo: 6 },
        { n: 108, nome: "Yamato sake", desc: "Tofu inari, riso, salmone, salsa spicy", prezzo: 5 },
        { n: 109, nome: "Millefoglie sake", desc: "Salmone, tofu, alghe, cipolla", prezzo: 5 },
        { n: 110, nome: "Millefoglie maguro", desc: "Tonno, tofu, alghe, cipolla", prezzo: 6 },
        { n: 111, nome: "Millefoglie philadelphia", desc: "Philadelphia, pistacchio", prezzo: 4 }
      ]},
      { categoria: "Tartare", piatti: [
        { n: 112, nome: "Salmon tartare", desc: "Tartare di salmone con salsa dello chef", prezzo: 9 },
        { n: 113, nome: "Tuna tartare", desc: "Tartare di tonno con salsa wasabi shoyu", prezzo: 10 },
        { n: 114, nome: "Mojito salmon", desc: "Cubetti di salmone con gelatina e salsa al mojito, guarnito con scorza di lime", prezzo: 11 },
        { n: 115, nome: "Pinacolada tuna", desc: "Cubetti di tonno e ananas fresco con salsa alla pinacolada", prezzo: 13 },
        { n: 116, nome: "Black crab", desc: "Riso venere, tartare di granchio* surimi, avocado, semi di sesamo, pasta kataifi*, maionese, tobiko* e salsa teriyaki", prezzo: 8 },
        { n: 117, nome: "Black tartare", desc: "Tortino di riso venere con tartare di salmone, cubetti di avocado, pasta kataifi*, tobiko* e salsa dello chef", prezzo: 10 }
      ]},
      { categoria: "Carpaccio", piatti: [
        { n: 118, nome: "Carpaccio sake", desc: "Carpaccio di salmone su salsa ponzu e semi di sesamo", prezzo: 10 },
        { n: 119, nome: "Carpaccio tonno", desc: "Carpaccio di tonno su salsa ponzu e semi di sesamo", prezzo: 11 },
        { n: 120, nome: "Carpaccio misto", desc: "Carpaccio di salmone, branzino, tonno su salsa ponzu e semi di sesamo", prezzo: 11 }
      ]},
      { categoria: "Piatti special", soloRistorante: true, piatti: [
        { n: 301, nome: "Misto di mare freddo", desc: "Gamberi, calamari, polpa di granchio, peperoni, carote, polipo, prezzemolo", prezzo: 13 },
        { n: 302, nome: "Onabe con misto di mare", desc: "Gamberi, gamberoni, calamari, polpa di granchio, polipo, verdure", prezzo: 13 },
        { n: 303, nome: "Tataki royal", desc: "Tonno scottato guarnito con crema di avocado, mandorle e salsa al tartufo", prezzo: 13 },
        { n: 304, nome: "Tataki plus", desc: "Filetto di tonno servito in leggera panatura di granella di pistacchio e sesamo, con salsa sesamo", prezzo: 13 },
        { n: 305, nome: "Tartare tonno plus", desc: "Cubetti di tonno con salsa stracciatella, serviti con olio aromatizzato al basilico", prezzo: 13 },
        { n: 306, nome: "Salmon king", desc: "Carpaccio di salmone scottato con salsa mango cheese, guarnito con pistacchio e tobiko*", prezzo: 13 },
        { n: 307, nome: "Sashimi misto speciale", desc: "Salmone, tonno, branzino, gambero rosso, scampi", prezzo: 13 },
        { n: 308, nome: "Tris di tartare", desc: "Salmone con salsa dello chef, tonno con salsa wasabi shoyu, gambero* crudo con salsa al mango e semi di sesamo", prezzo: 13 },
        { n: 309, nome: "Sashimi flambé", desc: "Sashimi di salmone scottato con salsa sesamo", prezzo: 13 },
        { n: 310, nome: "Tuna royal", desc: "Cubetti di tonno guarniti con pasta kataifi, tobiko*, salsa tartufo e stracciatella", prezzo: 13 },
        { n: 311, nome: "Amaebi royal", desc: "Gambero* crudo guarnito con crema di avocado, ikura, stracciatella, servito con olio aromatizzato al basilico", prezzo: 13 },
        { n: 312, nome: "Carpaccio rainbow*", desc: "Salmone, tonno, branzino, gambero* rosso con crema stracciatella, olio aromatizzato al basilico, guarnito con gelatina al mango e tobiko*", prezzo: 13 }
      ]},
      { categoria: "Special roll · 8 pz", piatti: [
        { n: 313, nome: "Green tiger", desc: "Ripieno di gambero* fritto e maionese, all'esterno carpaccio di salmone, salsa e granella di pistacchio, semi di sesamo", prezzo: 13 },
        { n: 314, nome: "Tori fly", desc: "Ripieno di pollo fritto, salmone, philadelphia, salsa terimaki", prezzo: 13 },
        { n: 315, nome: "California special", desc: "Ripieno di surimi di granchio* e avocado, all'esterno tartare di salmone, cipolla fritta, spicy mayo e semi di sesamo", prezzo: 13 },
        { n: 316, nome: "Ebiten flambé", desc: "Ripieno di gambero* fritto, all'esterno tartare di salmone scottato, crema al latte, salsa teriyaki, pasta kataifi* e semi di sesamo", prezzo: 13 },
        { n: 317, nome: "Ebiten scottato", desc: "Ripieno di gambero* fritto e maionese, all'esterno salmone scottato, salsa teriyaki, pasta kataifi* e semi di sesamo", prezzo: 13 },
        { n: 318, nome: "Ebiten fly roll", desc: "Ripieno di gambero* fritto, salmone, formaggio flambé, salsa teriyaki", prezzo: 13 },
        { n: 319, nome: "Uramaki speciale", desc: "Ripieno di fibra di carne tritata, pesce misto, philadelphia, mela", prezzo: 13 },
        { n: 320, nome: "Crispy roll fly", desc: "Ripieno di salmone fritto, philadelphia, kataifi, salsa teriyaki, formaggio flambé", prezzo: 13 }
      ]},
      { categoria: "Primi piatti", piatti: [
        { n: 121, nome: "Riso bianco", prezzo: 3 },
        { n: 122, nome: "Riso alla cantonese", desc: "Prosciutto, piselli*, uova", prezzo: 5 },
        { n: 123, nome: "Riso saltato con gamberi e verdure", desc: "Gamberi*, verdure, uovo", prezzo: 6 },
        { n: 124, nome: "Riso saltato con verdure", desc: "Verdure, uovo", prezzo: 4.5 },
        { n: 125, nome: "Riso saltato Cao Law Fan", desc: "Pollo*, gamberi*, verdure, uova, salsa di soia", prezzo: 6 },
        { n: 126, nome: "Riso al curry", desc: "Pollo, cipolla, piselli, cipollini, uova", prezzo: 5 },
        { n: 127, nome: "Riso con mais e ananas", desc: "Mais, ananas, uova", prezzo: 6 },
        { n: 128, nome: "Riso con frutti di mare", desc: "Gamberi, calamari, polpa di granchio, cipollini, uova", prezzo: 8 },
        { n: 129, nome: "Yaki udon saltato con verdure", desc: "Verdure, uova, salsa", prezzo: 6 },
        { n: 130, nome: "Yaki udon saltato con gamberi e verdure", desc: "Verdure, gamberi*, uova, salsa", prezzo: 7 },
        { n: 131, nome: "Yaki udon con frutti di mare", desc: "Gamberi, calamari, polpa di granchio, uova, salsa", prezzo: 8 },
        { n: 132, nome: "Yaki soba saltato con verdure", desc: "Spaghetti di grano saraceno, verdure, uova", prezzo: 6 },
        { n: 133, nome: "Yaki soba saltato con gamberi e verdure", desc: "Spaghetti di grano saraceno, verdure, gamberi*, uova", prezzo: 7 },
        { n: 134, nome: "Yaki soba saltato con frutti di mare", desc: "Gamberi, calamari, polpa di granchio, cipollini, uova", prezzo: 8 },
        { n: 135, nome: "Spaghetti di soia saltati con verdure", desc: "Verdure, uovo", prezzo: 5 },
        { n: 136, nome: "Spaghetti di soia saltati con gamberi e verdure", desc: "Gamberi*, verdure", prezzo: 6 },
        { n: 137, nome: "Spaghetti di soia con frutti di mare", desc: "Gamberi, calamari, polpa di granchio, cipollini", prezzo: 7 },
        { n: 138, nome: "Spaghetti di riso saltati con verdure", desc: "Verdure, uovo", prezzo: 5 },
        { n: 139, nome: "Spaghetti di riso saltati con gamberi e verdure", desc: "Gamberi*, verdure, uovo", prezzo: 6 },
        { n: 140, nome: "Spaghetti di riso con frutti di mare", desc: "Gamberi, calamari, polpa di granchio, cipollini, uova", prezzo: 7 },
        { n: 141, nome: "Ramen con verdure e uova", desc: "Noodles in brodo, verdure miste, alghe, uova", prezzo: 8 },
        { n: 142, nome: "Ramen con ebiten e uova", desc: "Noodles in brodo, tempura di gamberi, alghe, uova", prezzo: 10 },
        { n: 143, nome: "Ramen con manzo e uova", desc: "Noodles in brodo, manzo, alghe, uova", prezzo: 10 }
      ]},
      { categoria: "Pollo", piatti: [
        { n: 144, nome: "Pollo alle mandorle", desc: "Cubetti di pollo*, carote, bambù, mandorle, saltati in wok con salsa di soia", prezzo: 6 },
        { n: 145, nome: "Pollo in agrodolce", desc: "Fettine di pollo* con ananas, pomodoro fresco e piselli saltati in wok con salsa agrodolce", prezzo: 6 },
        { n: 146, nome: "Pollo in salsa chili", desc: "Fettine di pollo* con peperoni rossi e cipolla saltati in wok con salsa piccante e cipollotto", prezzo: 6 },
        { n: 147, nome: "Pollo con bambù e funghi cinesi", desc: "Fettine di pollo* con bambù e funghi", prezzo: 6 },
        { n: 148, nome: "Pollo con patate", desc: "Pollo, patate, cipollini", prezzo: 6 },
        { n: 149, nome: "Pollo limone", desc: "Pollo, limone, cipollini", prezzo: 6 }
      ]},
      { categoria: "Manzo", piatti: [
        { n: 150, nome: "Manzo con peperoni*", prezzo: 7 },
        { n: 151, nome: "Manzo con bambù e funghi cinesi*", prezzo: 7 },
        { n: 152, nome: "Manzo in salsa chili*", prezzo: 7 },
        { n: 153, nome: "Manzo con patate", prezzo: 7 },
        { n: 154, nome: "Manzo con porro", prezzo: 7 }
      ]},
      { categoria: "Gamberi", piatti: [
        { n: 155, nome: "Gamberi al curry*", prezzo: 7 },
        { n: 156, nome: "Gamberi in sale e pepe*", prezzo: 7 },
        { n: 157, nome: "Gamberi con bambù e funghi*", prezzo: 7 },
        { n: 158, nome: "Gamberi in agrodolce*", prezzo: 7 },
        { n: 159, nome: "Gamberi al chili*", prezzo: 7 },
        { n: 160, nome: "Gamberi limone", prezzo: 7 },
        { n: 161, nome: "Gamberi con patate*", prezzo: 7 }
      ]},
      { categoria: "Griglia", piatti: [
        { n: 162, nome: "Salmone grigliato", prezzo: 10 },
        { n: 163, nome: "Seppioline grigliate", prezzo: 10 },
        { n: 164, nome: "Tonno grigliato", prezzo: 12 },
        { n: 165, nome: "Gamberoni grigliati*", prezzo: 15 },
        { n: 166, nome: "Grigliata di pesce*", desc: "Salmone, tonno, spiedini di gamberi*, gamberoni* serviti con salsa teriyaki", prezzo: 15 },
        { n: 167, nome: "Salsiccia grigliata", prezzo: 10 },
        { n: 168, nome: "Spiedini di gamberi grigliati*", prezzo: 8 },
        { n: 169, nome: "Spiedini di pollo grigliato*", prezzo: 8 },
        { n: 170, nome: "Spiedini di manzo", prezzo: 10 },
        { n: 171, nome: "Spiedini di tofu fish cake", prezzo: 8 }
      ]},
      { categoria: "Contorni", piatti: [
        { n: 172, nome: "Insalata mista", prezzo: 5 },
        { n: 173, nome: "Patatine fritte*", prezzo: 5 },
        { n: 174, nome: "Verdure grigliate", prezzo: 5 },
        { n: 175, nome: "Verdure miste saltate", prezzo: 5 },
        { n: 176, nome: "Patate saltate", prezzo: 5 }
      ]},
      { categoria: "Onabe", piatti: [
        { n: 177, nome: "Onabe con manzo", prezzo: 12 },
        { n: 178, nome: "Onabe con gamberi e verdure", prezzo: 12 },
        { n: 179, nome: "Onabe con ciuffi di calamari e verdure", prezzo: 12 },
        { n: 180, nome: "Onabe con gamberoni e verdure", prezzo: 15 }
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

  /* ---------- 3. TELEGRAM e PROMO (il "cervello" su Cloudflare) ----------
     Prenotazioni, annullamenti e inviti passano da qui.
     Il token del bot NON sta nel sito: è al sicuro su Cloudflare. */
  telegram: {
    worker: "https://yugo-bot.yugosestri.workers.dev"
  },

  /* ---------- 4. INVITA AMICI ----------
     Premio per ogni livello (il livello 1 si sblocca con 2 amici, poi 10, 25, 30, 40, 55, 70, 90, 110).
     ESEMPI: scrivi i premi veri. */
  promoInviti: {
    premi: [
      "una bibita in omaggio",
      "un dolce in omaggio",
      "−10% sul conto",
      "un antipasto in omaggio",
      "−15% sul conto",
      "una bottiglia di vino oppure 5 bibite",
      "−20% sul conto",
      "una cena gratis",
      "una cena gratis + 15% di sconto quando torni"
    ]
  }
};
