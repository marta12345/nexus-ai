# NexusAI Dashboard

Moderna, **potpuno samostalna (zero-dependency)** web aplikacija napisana u čistom
HTML / CSS / JavaScript-u. Bez frameworka, bez build koraka, bez `npm install`.
Otvoriš `index.html` — i radi.

## ✨ Mogućnosti

- 🌗 **Dark / Light tema** s automatskim pamćenjem (`localStorage`) i praćenjem sistemske postavke
- 🎨 **Moderan dizajn** — glassmorphism, gradijenti, animirana "aurora" pozadina
- 📊 **Custom grafikoni** (ručno crtani SVG): animirani line/area, bar i donut chart
- 🔢 **Animirani brojači** i progress barovi
- ⌘ **Command palette** (`Cmd/Ctrl + K`) s pretragom i tipkovničkom navigacijom
- 🔔 **Toast notifikacije**
- 🧭 **Hash-based routing** (Dashboard / Analitika / Projekti / Postavke)
- 📡 **Realni podaci uživo** — kripto cijene (Coinbase), vrijeme (Open-Meteo) i tečajevi (Frankfurter/ECB); bez ključa, s auto-refreshom i fallbackom na demo podatke ako je API nedostupan
- 🤖 **AI asistent** — klizni chat panel s lokalnim engine-om (zna o tržištu, vremenu, tečajevima i navigaciji), uz opciju spajanja vlastitog OpenAI-kompatibilnog API-ja (ključ se čuva lokalno)
- 📱 **Potpuno responzivno** (mobilni meni, prilagodljiv grid)
- 📦 **PWA** — `manifest` + service worker za offline rad; može se instalirati
- ♿ Poštuje `prefers-reduced-motion`

## 🚀 Pokretanje

Zbog ES modula i service workera treba se posluživati preko HTTP-a (ne `file://`):

```bash
# bilo koji statički server, npr:
python3 -m http.server 8000
# pa otvori http://localhost:8000
```

## 📁 Struktura

```
nexus-ai/
├── index.html              # skeleton (sidebar, topbar, palette, toast)
├── manifest.webmanifest    # PWA manifest
├── sw.js                   # service worker (offline cache)
├── assets/favicon.svg      # ikona
├── styles/main.css         # cijeli design sistem + teme
└── scripts/
    ├── app.js              # core: tema, router, palette, toast, animacije, live-data
    ├── views.js            # HTML za svaki ekran + renderi za live podatke
    ├── charts.js           # SVG line/bar/donut grafikoni
    ├── api.js              # dohvat realnih podataka (kripto/vrijeme/tečaj) + fallback
    └── chat.js             # AI chat panel (lokalni engine + opcionalni API)
```

## 🤖 AI asistent — spajanje pravog modela (opcionalno)

Klikni ✨ (dolje desno) pa ⚙ u panelu i unesi:
- **Endpoint** — npr. `https://api.openai.com/v1/chat/completions`
- **Ključ** — tvoj API ključ (čuva se samo u tvom pregledniku, `localStorage`)
- **Model** — npr. `gpt-4o-mini`

Radi s bilo kojim **OpenAI-kompatibilnim** API-jem. Bez unosa, asistent radi lokalno i odgovara o podacima u aplikaciji.

Bez ovisnosti · bez build koraka · 100% vanilla.
