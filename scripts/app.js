/* =========================================================
   NexusAI — App core (theme, router, palette, toasts, anims)
   ========================================================= */
import { VIEWS, TITLES, renderMarket, renderWeather, renderRates } from "./views.js";
import { fetchCrypto, fetchRates, fetchWeather, weatherLabel } from "./api.js";
import { initChat, openChat, setNavigator, setContextProvider } from "./chat.js";
import { initKanban, resetKanban } from "./kanban.js";
import { LiveChart } from "./livechart.js";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

/* ---------- Theme ---------- */
const html = document.documentElement;
function setTheme(t) {
  html.setAttribute("data-theme", t);
  try { localStorage.setItem("nexus-theme", t); } catch {}
  $("meta[name=theme-color]")?.setAttribute("content", t === "dark" ? "#070a12" : "#eef1f8");
  const chk = $("#themeSetting");
  if (chk) chk.checked = t === "dark";
}
function initTheme() {
  let t;
  try { t = localStorage.getItem("nexus-theme"); } catch {}
  if (!t) t = matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  setTheme(t);
}
function toggleTheme() {
  const next = html.getAttribute("data-theme") === "dark" ? "light" : "dark";
  setTheme(next);
  toast("info", "Tema promijenjena", `Aktivna: ${next === "dark" ? "tamna" : "svijetla"}`);
}

/* ---------- Animated counters ---------- */
function animateCounters() {
  $$("[data-count]").forEach(el => {
    const target = parseFloat(el.dataset.count);
    const isFloat = !Number.isInteger(target);
    const dur = 1100, start = performance.now();
    function tick(now) {
      const p = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      const val = target * eased;
      el.textContent = isFloat ? val.toFixed(2) : Math.round(val).toLocaleString("hr-HR");
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  });
}
function animateProgress() {
  $$(".progress > span[data-w]").forEach((el, i) =>
    setTimeout(() => { el.style.width = el.dataset.w + "%"; }, 120 + i * 90));
}

/* ---------- Router ---------- */
const content = $("#content");
let liveChart = null;   // aktivna instanca live grafikona (samo na dashboardu)
function render(view) {
  if (!VIEWS[view]) view = "dashboard";
  content.innerHTML = VIEWS[view]();
  $("#pageTitle").textContent = TITLES[view];
  $$("#nav .nav-item").forEach(a => a.classList.toggle("is-active", a.dataset.view === view));
  animateCounters();
  animateProgress();
  bindViewControls();
  $("#sidebar")?.classList.remove("open");

  // Live grafikon: aktivan samo na dashboardu (pauzira se drugdje da štedi resurse)
  if (liveChart) { liveChart.stop(); liveChart = null; }
  if (view === "dashboard") {
    loadLiveData();
    const mount = $("#liveChart");
    if (mount) {
      liveChart = new LiveChart(mount, {
        label: "Promet", unit: "", min: 20, max: 320, interval: 1400,
        valueEl: $("#liveValue"),
      });
      liveChart.start();
    }
  }
  if (view === "projects") {
    initKanban();
    $("#kanbanReset")?.addEventListener("click", () => {
      if (confirm("Vratiti Kanban ploču na početno stanje?")) { resetKanban(); toast("info", "Kanban resetiran", "Ploča je vraćena na zadano."); }
    });
  }
}

/* ---------- Live data (realni API-ji + fallback) ---------- */
function setStatus(id, live) {
  const el = $("#" + id);
  if (!el) return;
  el.textContent = live ? "● uživo" : "demo (offline)";
  el.className = "badge " + (live ? "live-on" : "live-off");
}
async function loadLiveData() {
  const market = $("#marketBody"), weather = $("#weatherBody"), rates = $("#ratesBody");
  const [c, w, r] = await Promise.all([fetchCrypto(), fetchWeather(), fetchRates()]);
  if (market) { market.innerHTML = renderMarket(c); setStatus("marketStatus", c.live); }
  if (weather) { weather.innerHTML = renderWeather(w, weatherLabel); setStatus("weatherStatus", w.live); }
  if (rates) { rates.innerHTML = renderRates(r); setStatus("ratesStatus", r.live); }
  return { c, w, r };
}
async function refreshLiveData() {
  if (currentView() !== "dashboard") { navigate("dashboard"); return; }
  const d = await loadLiveData();
  toast(d.c.live ? "ok" : "warn",
    d.c.live ? "Podaci osvježeni" : "Offline način",
    d.c.live ? "Dohvaćeni najnoviji tržišni podaci." : "Prikazani demo podaci — API nedostupan.");
  if (d.c.live) {
    const btc = d.c.items.find((x) => x.id === "BTC");
    if (btc) pushNotification("market", "Tržište osvježeno",
      `Bitcoin: $${btc.price.toLocaleString("hr-HR", { maximumFractionDigits: 0 })} (${btc.change >= 0 ? "▲" : "▼"} ${Math.abs(btc.change).toFixed(1)}%)`);
  }
}
// auto-refresh svakih 60s dok si na dashboardu
setInterval(() => { if (currentView() === "dashboard") loadLiveData(); }, 60000);
function currentView() { return (location.hash || "#dashboard").slice(1); }
function navigate(view) {
  if (location.hash.slice(1) === view) render(view);
  else location.hash = view;
}
addEventListener("hashchange", () => render(currentView()));

function bindViewControls() {
  const themeSetting = $("#themeSetting");
  if (themeSetting) themeSetting.addEventListener("change", e => setTheme(e.target.checked ? "dark" : "light"));
  $$(".setting input[type=checkbox]").forEach(cb => {
    if (cb.id === "themeSetting") return;
    cb.addEventListener("change", () =>
      toast("ok", "Postavka spremljena", `${cb.checked ? "Uključeno" : "Isključeno"}`));
  });
}

/* ---------- Toasts ---------- */
const ICONS = { ok: "✓", info: "ℹ", warn: "!" };
export function toast(type = "info", title = "", msg = "") {
  const stack = $("#toastStack");
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.innerHTML = `<div class="t-ic">${ICONS[type] || "•"}</div>
    <div><div class="t-title">${title}</div>${msg ? `<div class="t-msg">${msg}</div>` : ""}</div>`;
  stack.appendChild(el);
  setTimeout(() => { el.classList.add("out"); setTimeout(() => el.remove(), 320); }, 3200);
}

/* ---------- Command palette ---------- */
const overlay = $("#paletteOverlay");
const input = $("#paletteInput");
const list = $("#paletteList");
let activeIdx = 0;

const COMMANDS = [
  { ic: "◈", label: "Idi na Dashboard", hint: "navigacija", run: () => navigate("dashboard") },
  { ic: "◔", label: "Idi na Analitiku", hint: "navigacija", run: () => navigate("analytics") },
  { ic: "▦", label: "Idi na Projekte", hint: "navigacija", run: () => navigate("projects") },
  { ic: "⚙", label: "Idi na Postavke", hint: "navigacija", run: () => navigate("settings") },
  { ic: "🌗", label: "Prebaci temu (tamno/svijetlo)", hint: "akcija", run: toggleTheme },
  { ic: "✨", label: "Otvori AI asistenta", hint: "akcija", run: openChat },
  { ic: "🔔", label: "Testiraj notifikaciju", hint: "akcija", run: () => toast("ok", "Radi!", "Ovo je test notifikacija.") },
  { ic: "↻", label: "Osvježi tržišne podatke", hint: "akcija", run: refreshLiveData },
];

function openPalette() {
  overlay.hidden = false;
  input.value = "";
  activeIdx = 0;
  renderCommands("");
  input.focus();
}
function closePalette() { overlay.hidden = true; }
function renderCommands(q) {
  const filtered = COMMANDS.filter(c => c.label.toLowerCase().includes(q.toLowerCase()));
  list.innerHTML = filtered.length
    ? filtered.map((c, i) => `<li data-i="${i}" class="${i === activeIdx ? "active" : ""}">
        <span class="p-ic">${c.ic}</span><span>${c.label}</span><span class="p-hint">${c.hint}</span></li>`).join("")
    : `<li style="color:var(--muted);cursor:default">Nema rezultata za “${q}”</li>`;
  list._filtered = filtered;
  $$("#paletteList li[data-i]").forEach(li => {
    li.addEventListener("click", () => runCommand(+li.dataset.i));
  });
}
function runCommand(i) {
  const cmd = (list._filtered || [])[i];
  if (cmd) { closePalette(); cmd.run(); }
}

input?.addEventListener("input", () => { activeIdx = 0; renderCommands(input.value); });
input?.addEventListener("keydown", e => {
  const items = list._filtered || [];
  if (e.key === "ArrowDown") { e.preventDefault(); activeIdx = Math.min(activeIdx + 1, items.length - 1); renderCommands(input.value); }
  else if (e.key === "ArrowUp") { e.preventDefault(); activeIdx = Math.max(activeIdx - 1, 0); renderCommands(input.value); }
  else if (e.key === "Enter") { e.preventDefault(); runCommand(activeIdx); }
  else if (e.key === "Escape") closePalette();
});
overlay?.addEventListener("click", e => { if (e.target === overlay) closePalette(); });

/* ---------- Global shortcuts & buttons ---------- */
addEventListener("keydown", e => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); overlay.hidden ? openPalette() : closePalette(); }
  else if (e.key === "Escape") {
    // Escape zatvara sve otvorene slojeve odjednom
    closePalette();
    $("#aiPanel")?.setAttribute("hidden", "");
    $("#aiScrim")?.setAttribute("hidden", "");
  }
});
$("#openPaletteBtn")?.addEventListener("click", openPalette);
$("#paletteBtn")?.addEventListener("click", openPalette);
$("#themeToggle")?.addEventListener("click", toggleTheme);
/* ---------- Notifikacijski centar ---------- */
const NOTIF_KEY = "nexus-notifs";
const NOTIF_ICONS = { info: "ℹ️", ok: "✅", warn: "⚠️", deploy: "🚀", market: "📈" };
let notifs = loadNotifs();

function loadNotifs() {
  try {
    const raw = localStorage.getItem(NOTIF_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  // Zadane demo obavijesti (prvi put)
  const now = Date.now();
  return [
    { id: 1, type: "deploy", title: "Aurora API deployan", msg: "Verzija v2.3 je uživo u produkciji.", ts: now - 3 * 60000, read: false },
    { id: 2, type: "market", title: "BTC skočio +3%", msg: "Bitcoin je prešao dnevni prag.", ts: now - 42 * 60000, read: false },
    { id: 3, type: "ok", title: "Backup dovršen", msg: "Dnevni backup baze uspješno spremljen.", ts: now - 3 * 3600000, read: true },
  ];
}
function saveNotifs() { try { localStorage.setItem(NOTIF_KEY, JSON.stringify(notifs.slice(0, 50))); } catch {} }

function timeAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "upravo sad";
  const m = Math.floor(s / 60); if (m < 60) return `prije ${m} min`;
  const h = Math.floor(m / 60); if (h < 24) return `prije ${h} h`;
  return `prije ${Math.floor(h / 24)} d`;
}
function renderNotifs() {
  const list = $("#notifList");
  const unread = notifs.filter((n) => !n.read).length;
  const badge = $("#notifBadge");
  if (badge) { badge.textContent = unread; badge.hidden = unread === 0; }
  if (!list) return;
  list.innerHTML = notifs.length
    ? notifs.map((n) => `<li class="notif-item ${n.read ? "" : "unread"}" data-id="${n.id}">
        <div class="notif-ic">${NOTIF_ICONS[n.type] || "🔔"}</div>
        <div class="notif-body">
          <div class="notif-title">${n.title}</div>
          <div class="notif-msg">${n.msg}</div>
          <div class="notif-time">${timeAgo(n.ts)}</div>
        </div>
        <span class="notif-dot"></span>
      </li>`).join("")
    : `<div class="notif-empty">Nema novih obavijesti 🎉</div>`;
  list.querySelectorAll(".notif-item").forEach((li) =>
    li.addEventListener("click", () => {
      const n = notifs.find((x) => x.id == li.dataset.id);
      if (n && !n.read) { n.read = true; saveNotifs(); renderNotifs(); }
    }));
}
function toggleNotifPanel(force) {
  const p = $("#notifPanel");
  if (!p) return;
  const show = force !== undefined ? force : p.hidden;
  p.hidden = !show;
}
export function pushNotification(type, title, msg) {
  notifs.unshift({ id: Date.now(), type, title, msg, ts: Date.now(), read: false });
  saveNotifs();
  renderNotifs();
}

$("#notifyBtn")?.addEventListener("click", (e) => { e.stopPropagation(); toggleNotifPanel(); });
$("#notifReadAll")?.addEventListener("click", (e) => {
  e.stopPropagation();
  notifs.forEach((n) => (n.read = true)); saveNotifs(); renderNotifs();
  toast("ok", "Označeno", "Sve obavijesti su pročitane.");
});
// klik izvan panela zatvara ga
document.addEventListener("click", (e) => {
  const panel = $("#notifPanel");
  if (panel && !panel.hidden && !e.target.closest(".notif-wrap")) toggleNotifPanel(false);
});
renderNotifs();
$("#menuBtn")?.addEventListener("click", () => $("#sidebar").classList.toggle("open"));
$("#refreshBtn")?.addEventListener("click", refreshLiveData);

/* ---------- Pauziraj live grafikon kad je tab u pozadini ---------- */
document.addEventListener("visibilitychange", () => {
  if (!liveChart) return;
  if (document.hidden) liveChart.stop();
  else if (currentView() === "dashboard") liveChart.start();
});

/* ---------- PWA service worker ---------- */
if ("serviceWorker" in navigator) {
  addEventListener("load", async () => {
    try {
      const reg = await navigator.serviceWorker.register("./sw.js");
      // Provjeri ima li nova verzija; ako novi SW preuzme kontrolu, osvježi stranicu.
      reg.addEventListener("updatefound", () => {
        const nw = reg.installing;
        nw?.addEventListener("statechange", () => {
          if (nw.state === "installed" && navigator.serviceWorker.controller) {
            nw.postMessage?.("skipWaiting");
          }
        });
      });
      reg.update?.();
    } catch {}
  });
  // Kad se aktivira novi SW, jednom automatski reloadaj da se povuče svježa verzija.
  let reloaded = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloaded) return;
    reloaded = true;
    location.reload();
  });
}

/* ---------- AI chat integracija ---------- */
setNavigator(navigate);
setContextProvider(async () => {
  const [c, w, r] = await Promise.all([fetchCrypto(), fetchWeather(), fetchRates()]);
  return {
    view: currentView(),
    crypto: c.items.map((x) => ({ id: x.id, name: x.name, price: +x.price.toFixed(2), change: +x.change.toFixed(2) })),
    weather: { city: w.city, temp: w.temp, humidity: w.humidity, wind: w.wind, desc: weatherLabel(w.code)[1] },
    rates: { base: r.base, date: r.date, ...r.rates },
  };
});
initChat();

/* ---------- Boot ---------- */
// Osiguraj čist ekran na startu: zatvori palette i AI panel ako su nekako otvoreni.
closePalette();
$("#paletteOverlay")?.setAttribute("hidden", "");
["#aiPanel", "#aiScrim"].forEach((s) => $(s)?.setAttribute("hidden", ""));

initTheme();
render(currentView());
setTimeout(() => toast("ok", "Dobrodošli u NexusAI", "Pritisni ⌘K ili klikni ✨ za AI asistenta."), 700);
