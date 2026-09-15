/* =========================================================
   Views — HTML za svaki ekran
   ========================================================= */
import { lineChart, barChart, donutChart } from "./charts.js";
import { kanbanHTML } from "./kanban.js";

const rnd = (a, b) => Math.round(a + Math.random() * (b - a));
const series = (n, a, b) => Array.from({ length: n }, () => rnd(a, b));

function statCard(icon, label, value, delta, up) {
  return `<div class="card stat">
    <div class="stat-top">
      <div class="stat-ic">${icon}</div>
      <span class="pill ${up ? "up" : "down"}">${up ? "▲" : "▼"} ${delta}</span>
    </div>
    <div class="value" data-count="${value}">0</div>
    <div class="label">${label}</div>
  </div>`;
}

export function dashboard() {
  const bars = series(7, 20, 100);
  return `<section class="view">
    <div class="grid stats">
      ${statCard("💰", "Prihod (mjesec)", 84250, "12.4%", true)}
      ${statCard("👥", "Aktivni korisnici", 12894, "8.1%", true)}
      ${statCard("⚡", "API pozivi", 1_842_301, "23.7%", true)}
      ${statCard("⏱", "Prosj. odziv (ms)", 128, "4.2%", false)}
    </div>

    <div class="grid split">
      <div class="card">
        <div class="card-head">
          <div class="card-title">Promet u stvarnom vremenu</div>
          <span class="badge live-on">● uživo</span>
        </div>
        <div class="live-head">
          <span class="live-value" id="liveValue">—</span>
          <span class="live-value-label">zahtjeva / s</span>
        </div>
        <div id="liveChart"></div>
      </div>
      <div class="card">
        <div class="card-head"><div class="card-title">Izvori prometa</div></div>
        ${donutChart([
          { label: "Organsko", value: 4200, color: "#7c5cff" },
          { label: "Direktno", value: 2600, color: "#22d3ee" },
          { label: "Društvene", value: 1800, color: "#f472b6" },
          { label: "Referral", value: 900,  color: "#f59e0b" },
        ])}
      </div>
    </div>

    <div class="grid split">
      <div class="card" id="marketCard">
        <div class="card-head">
          <div class="card-title">Live tržište · kripto</div>
          <span class="badge info" id="marketStatus">učitavam…</span>
        </div>
        <div id="marketBody">${marketSkeleton(4)}</div>
      </div>
      <div class="card" id="weatherCard">
        <div class="card-head">
          <div class="card-title">Vrijeme · Zagreb</div>
          <span class="badge info" id="weatherStatus">učitavam…</span>
        </div>
        <div id="weatherBody">${skeletonLines(3)}</div>
      </div>
    </div>

    <div class="grid split">
      <div class="card">
        <div class="card-head"><div class="card-title">Tjedna aktivnost</div></div>
        ${barChart(bars)}
      </div>
      <div class="card" id="ratesCard">
        <div class="card-head">
          <div class="card-title">Tečajevi · ECB (EUR)</div>
          <span class="badge info" id="ratesStatus">učitavam…</span>
        </div>
        <div id="ratesBody">${skeletonLines(5)}</div>
      </div>
    </div>
  </section>`;
}

/* ---------- Skeleton loaderi ---------- */
export function skeletonLines(n) {
  return `<div class="list">${Array.from({ length: n }, () =>
    `<div class="skeleton-row"><span class="sk sk-dot"></span><span class="sk sk-bar"></span><span class="sk sk-pill"></span></div>`
  ).join("")}</div>`;
}
function marketSkeleton(n) { return skeletonLines(n); }

/* ---------- Renderi za realne podatke (pozivaju se iz app.js) ---------- */
export function renderMarket(data) {
  const fmt = (p) => p >= 1 ? p.toLocaleString("hr-HR", { maximumFractionDigits: 2 }) : p.toFixed(4);
  return `<div class="list">${data.items.map((c) => {
    const up = c.change >= 0;
    return `<div class="row market-row">
      <div><div class="name">${c.name} <span class="sub" style="margin-left:6px">${c.id}</span></div></div>
      <div class="price">$${fmt(c.price)}</div>
      <span class="pill ${up ? "up" : "down"}">${up ? "▲" : "▼"} ${Math.abs(c.change).toFixed(2)}%</span>
    </div>`;
  }).join("")}</div>`;
}

export function renderWeather(w, weatherLabel) {
  const [emoji, desc] = weatherLabel(w.code);
  return `<div class="weather">
    <div class="weather-main">
      <div class="weather-emoji">${emoji}</div>
      <div>
        <div class="weather-temp">${Math.round(w.temp)}°C</div>
        <div class="sub">${desc}</div>
      </div>
    </div>
    <div class="weather-meta">
      <div class="wm"><div class="sub">Vlaga</div><b>${w.humidity}%</b></div>
      <div class="wm"><div class="sub">Vjetar</div><b>${w.wind} km/h</b></div>
      <div class="wm"><div class="sub">Grad</div><b>${w.city}</b></div>
    </div>
    ${lineChart(w.series.length ? w.series : [1, 2, 3], { h: 120, pad: 16 })}
  </div>`;
}

export function renderRates(r) {
  const names = { USD: "🇺🇸 Dolar", GBP: "🇬🇧 Funta", HRK: "🇭🇷 Kuna", CHF: "🇨🇭 Franak", JPY: "🇯🇵 Jen" };
  return `<div class="list">${Object.entries(r.rates).map(([sym, val]) =>
    `<div class="row"><div class="name">${names[sym] || sym}</div>
      <div class="price">${(+val).toFixed(sym === "JPY" ? 1 : 4)}</div>
      <span class="badge info">1 ${r.base}</span></div>`
  ).join("")}<div class="sub" style="margin-top:8px">Ažurirano: ${r.date}</div></div>`;
}

export function analytics() {
  return `<section class="view">
    <div class="grid stats">
      ${statCard("📈", "Konverzija", 4.82, "0.6%", true)}
      ${statCard("🎯", "Bounce rate", 38, "2.1%", false)}
      ${statCard("🕐", "Prosj. sesija", 342, "5.5%", true)}
      ${statCard("🌍", "Zemlje", 74, "3", true)}
    </div>
    <div class="grid two">
      <div class="card"><div class="card-head"><div class="card-title">Posjete (30 dana)</div></div>${lineChart(series(30, 30, 100))}</div>
      <div class="card"><div class="card-head"><div class="card-title">Uređaji</div></div>
        ${donutChart([
          { label: "Desktop", value: 5400, color: "#7c5cff" },
          { label: "Mobitel", value: 4100, color: "#22d3ee" },
          { label: "Tablet", value: 800, color: "#f472b6" },
        ])}
      </div>
    </div>
    <div class="card"><div class="card-head"><div class="card-title">Događaji po satu</div></div>${barChart(series(12, 10, 100))}</div>
  </section>`;
}

function projectRows(n) {
  const names = [
    ["Aurora API", "Backend · v2.3", 82, "ok", "aktivno"],
    ["Nova UI Kit", "Design system", 64, "info", "u tijeku"],
    ["Quantum ML", "Model treniranje", 45, "warn", "pauzirano"],
    ["Helix CMS", "Migracija", 93, "ok", "aktivno"],
    ["Orbit Mobile", "iOS + Android", 30, "info", "u tijeku"],
    ["Pulse Analytics", "Data pipeline", 71, "ok", "aktivno"],
  ].slice(0, n);
  return `<div class="list">${names.map(([nm, sub, pct, badge, status]) => `
    <div class="row">
      <div><div class="name">${nm}</div><div class="sub">${sub}</div></div>
      <div class="progress" title="${pct}%"><span data-w="${pct}"></span></div>
      <span class="badge ${badge}">${status}</span>
    </div>`).join("")}</div>`;
}

export function projects() {
  return `<section class="view">
    <div class="card">
      <div class="card-head">
        <div class="card-title">Kanban ploča</div>
        <button class="btn-ghost" id="kanbanReset" type="button">↺ Resetiraj</button>
      </div>
      ${kanbanHTML()}
      <div class="sub" style="margin-top:12px">💡 Povuci kartice između kolona · sve se pamti u pregledniku</div>
    </div>

    <div class="card">
      <div class="card-head"><div class="card-title">Svi projekti</div><span class="badge ok">6 aktivnih</span></div>
      ${projectRows(6)}
    </div>
  </section>`;
}

export function settings() {
  const items = [
    ["Tamna tema", "Automatski se pamti u pregledniku", "themeSetting", true],
    ["E-mail notifikacije", "Primaj sažetke jednom dnevno", "s1", true],
    ["Push obavijesti", "Obavijesti u realnom vremenu", "s2", false],
    ["Kompaktni prikaz", "Gušći raspored kartica", "s3", false],
    ["Beta značajke", "Isprobaj eksperimentalne alate", "s4", false],
  ];
  return `<section class="view">
    <div class="grid two">
      <div class="card">
        <div class="card-head"><div class="card-title">Preferencije</div></div>
        ${items.map(([t, d, id, on]) => `
          <div class="setting">
            <div><div class="name" style="font-weight:600">${t}</div><div class="sub" style="color:var(--muted);font-size:12.5px">${d}</div></div>
            <label class="switch"><input type="checkbox" id="${id}" ${on ? "checked" : ""}/><span class="slider"></span></label>
          </div>`).join("")}
      </div>
      <div class="card">
        <div class="card-head"><div class="card-title">O aplikaciji</div></div>
        <p style="color:var(--muted);line-height:1.7;font-size:14px">
          <b style="color:var(--text)">NexusAI Dashboard</b> — potpuno samostalna (zero-dependency) web aplikacija.
          Bez okvira, bez build koraka. Sve komponente, grafikoni, tema, command palette i offline podrška
          napisani su ručno u čistom HTML/CSS/JS.
        </p>
        <div class="list" style="margin-top:14px">
          <div class="row"><div class="name">Verzija</div><span></span><span class="badge info">1.0.0</span></div>
          <div class="row"><div class="name">Dependencije</div><span></span><span class="badge ok">0</span></div>
          <div class="row"><div class="name">PWA</div><span></span><span class="badge ok">Offline</span></div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-head">
        <div class="card-title">💾 Spremljeni podaci (u pregledniku)</div>
        <span class="badge info" id="storageTotal">—</span>
      </div>
      <p style="color:var(--muted);line-height:1.6;font-size:13.5px;margin-bottom:14px">
        Aplikacija sve pohranjuje lokalno u <b style="color:var(--text)">localStorage</b> tvog preglednika — ništa se ne šalje na server.
        Podaci ostaju i nakon zatvaranja preglednika, ali su vezani samo uz ovaj uređaj i preglednik.
      </p>
      <div id="storageList" class="storage-list"></div>
      <div class="storage-actions">
        <button class="btn-ghost" id="storageRefresh" type="button">↻ Osvježi</button>
        <button class="btn-danger" id="storageClearAll" type="button">🗑 Obriši sve podatke</button>
      </div>
    </div>
  </section>`;
}

export const VIEWS = { dashboard, analytics, projects, settings };
export const TITLES = { dashboard: "Dashboard", analytics: "Analitika", projects: "Projekti", settings: "Postavke" };
