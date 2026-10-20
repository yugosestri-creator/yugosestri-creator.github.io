# Yugo – sito e app per prenotare il tavolo

Il sito è già pronto. Funziona subito in **modalità demo** (si può provare tutto, ma niente viene salvato o inviato).
Per farlo funzionare davvero servono 5 passaggi, tutti gratuiti. Si fa una volta sola.

## Funziona anche con il Mac spento

Niente gira sul tuo computer. Ogni pezzo vive su un servizio online sempre acceso:

| Cosa | Dove gira | Costo |
|---|---|---|
| Il sito / l'app | GitHub Pages | gratis |
| Account con email e prenotazioni salvate | Firebase (Google) | gratis |
| Messaggio nel gruppo Telegram | Cloudflare Workers | gratis (100.000 al giorno) |

Il Mac serve solo per fare questa configurazione la prima volta (va bene anche da iPhone).

---

## 1. Metti le informazioni vere di Yugo

Apri `config.js` e cambia la parte `ristorante`:
- `indirizzo`, `telefono`, `instagram`
- `formule` (prezzi All You Can Eat di pranzo, cena, bambini)
- `orari` (quello che si legge sul sito)
- `servizi` e `giorniChiusi` (quali orari si possono prenotare)
- `menu` (numero, nome e descrizione dei piatti)

Quelli che trovi adesso sono **esempi**.

---

## 2. Firebase: registrazione con email e salvataggio delle prenotazioni

1. Vai su <https://console.firebase.google.com> e accedi con un account Google.
2. **Aggiungi progetto** → nome `yugo-sestri` → Google Analytics puoi disattivarlo.
3. Nella pagina del progetto clicca l'icona **`</>`** (app web) → nome `Yugo` → **Registra app**.
   Ti mostra un blocco `const firebaseConfig = { apiKey: ..., ... }`.
   Copia quei valori dentro `config.js` al posto di `firebase: null`:
   ```js
   firebase: {
     apiKey: "AIza...",
     authDomain: "yugo-sestri.firebaseapp.com",
     projectId: "yugo-sestri",
     storageBucket: "yugo-sestri.appspot.com",
     messagingSenderId: "...",
     appId: "..."
   },
   ```
4. Menu a sinistra → **Authentication** → **Inizia** → **Email/password** → attiva → Salva.
5. Sempre in Authentication → **Impostazioni** → **Domini autorizzati** → aggiungi `yugosestri-creator.github.io`.
6. Menu a sinistra → **Firestore Database** → **Crea database** → posizione `europe-west` → modalità produzione.
7. Nella scheda **Regole** di Firestore incolla questo e premi **Pubblica**:
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /prenotazioni/{id} {
         allow create: if request.auth != null
                       && request.auth.token.email_verified == true
                       && request.resource.data.uid == request.auth.uid;
         allow read: if request.auth != null && resource.data.uid == request.auth.uid;
       }
     }
   }
   ```
   Così ogni cliente vede solo le sue prenotazioni e può prenotare solo dopo aver confermato l'email.

Tutte le prenotazioni le trovi anche nella console Firebase → Firestore → `prenotazioni`.

---

## 3. Telegram: il bot e il gruppo

**Già fatto e già collegato** in `config.js`: bot @yugo_prenotazioni_bot, gruppo "Prenotazioni Yugo".
I passaggi qui sotto servono solo se un giorno vuoi rifarlo da capo.

1. Su Telegram cerca **@BotFather** → scrivi `/newbot` → nome `Yugo Prenotazioni` → username per esempio `yugo_prenotazioni_bot`.
   BotFather ti dà un **token** (tipo `7412345678:AAH...`). Tienilo segreto.
2. Crea un **gruppo** con te e il proprietario, poi aggiungi il bot al gruppo.
3. Nel gruppo scrivi `/start` (serve per trovare l'ID del gruppo al passo 4).

---

## 4. (Facoltativo, più sicuro) Cloudflare: il "postino" che scrive nel gruppo

Adesso il sito scrive direttamente al bot e funziona già così. Questo passo serve solo a nascondere il token:
quando hai il worker, metti il suo indirizzo in `worker` e svuota `botToken`.

Il token del bot non può stare nel sito (chiunque lo leggerebbe). Lo mettiamo su Cloudflare,
che riceve la prenotazione dal sito, controlla che il cliente sia registrato e scrive nel gruppo.

1. Registrati gratis su <https://dash.cloudflare.com/sign-up>.
2. Menu a sinistra → **Workers & Pages** → **Create** → **Create Worker** → nome `yugo-telegram` → **Deploy**.
3. Clicca **Edit code**, cancella tutto quello che c'è, incolla il contenuto del file `telegram-worker.js` → **Deploy**.
4. Torna al worker → **Settings** → **Variables and Secrets** → aggiungi:
   | Nome | Tipo | Valore |
   |---|---|---|
   | `TELEGRAM_TOKEN` | Secret | il token di BotFather |
   | `FIREBASE_API_KEY` | Text | la `apiKey` di Firebase (la stessa di `config.js`) |
   | `ALLOWED_ORIGIN` | Text | `https://yugosestri-creator.github.io` |
5. Apri nel browser l'indirizzo del worker con `/chat-id` alla fine, per esempio
   `https://yugo-telegram.tuonome.workers.dev/chat-id`.
   Vedi il tuo gruppo con un **id** negativo (tipo `-1001234567890`).
6. Aggiungi la variabile `TELEGRAM_CHAT_ID` (Text) con quell'id → **Deploy**.
7. In `config.js` scrivi l'indirizzo del worker:
   ```js
   telegram: {
     worker: "https://yugo-telegram.tuonome.workers.dev"
   }
   ```

Ad ogni prenotazione arriva nel gruppo un messaggio così:

```
🍣 NUOVA PRENOTAZIONE – Yugo

👤 Mario Rossi
👥 4 persone
📅 Sabato 24 ottobre
🕗 Arrivo previsto: 20:30
📞 +39 333 1234567
✉️ mario@email.it
📝 Un seggiolone

⏱ Richiesta fatta il 20/10/2026 alle 14:12
```

L'ora della richiesta la mette Cloudflare (ora italiana), quindi è sempre giusta anche se il telefono del cliente ha l'ora sbagliata.

---

## 5. Pubblicare su GitHub (gratis)

1. Accedi a GitHub come `yugosestri-creator`.
2. In alto a destra **+** → **New repository** → nome esattamente: `yugosestri-creator.github.io` → Public → **Create repository**.
3. Clicca **uploading an existing file** e trascina **tutti** i file di questa cartella  → **Commit changes**.
   (Il file `telegram-worker.js` su GitHub non fa niente: puoi caricarlo o no, non contiene segreti.)
4. Vai in **Settings** → **Pages** → Source: *Deploy from a branch* → Branch: `main` / `(root)` → **Save**.
5. Dopo 1-2 minuti il sito è online su **https://yugosestri-creator.github.io**

Per modificare qualcosa in futuro: apri `config.js` su GitHub, clicca la matita, cambia e salva. In un minuto è online.

---

## Mettere Yugo sull'iPhone come un'app

1. Apri **https://yugosestri-creator.github.io** con **Safari**.
2. Tocca **Condividi** (quadrato con la freccia in su).
3. **Aggiungi alla schermata Home** → Aggiungi.

Compare l'icona di Yugo e si apre a schermo intero, senza la barra di Safari.
Su Android: Chrome → tre puntini → **Installa app**.

---

## File

| File | A cosa serve |
|---|---|
| `config.js` | **L'unico da modificare**: info, prezzi, menu, Firebase, Telegram |
| `telegram-worker.js` | Il codice da incollare su Cloudflare |
| `index.html`, `style.css`, `app.js` | Il sito |
| `manifest.json`, `sw.js`, `` | Servono per installarlo come app, con il logo |
