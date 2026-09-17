/* =========================================================
   AI Chat panel — lokalni engine + opcionalni OpenAI-kompatibilni API
   ========================================================= */
import { fetchCrypto, fetchRates, fetchWeather, weatherLabel } from "./api.js";

const $ = (s, r = document) => r.querySelector(s);
const LS_KEY = "nexus-ai-config";

/* getContext: dobavlja live snapshot podataka za "znanje" asistenta */
let getContext = async () => ({});
export function setContextProvider(fn) { getContext = fn; }

let navigate = () => {};
export function setNavigator(fn) { navigate = fn; }

/* ---------- Konfiguracija (localStorage) ---------- */
function loadConfig() {
  try { return JSON.parse(localStorage.getItem(LS_KEY)) || {}; } catch { return {}; }
}
function saveConfig(cfg) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(cfg)); } catch {}
}
let config = loadConfig();

/* ---------- Povijest razgovora (localStorage) ---------- */
const CHAT_KEY = "nexus-ai-chat";
let transcript = loadTranscript();       // [{role, html}]
function loadTranscript() {
  try { return JSON.parse(localStorage.getItem(CHAT_KEY)) || []; } catch { return []; }
}
function saveTranscript() {
  try { localStorage.setItem(CHAT_KEY, JSON.stringify(transcript.slice(-50))); } catch {}
}
function clearTranscript() {
  transcript = [];
  try { localStorage.removeItem(CHAT_KEY); } catch {}
  history.length = 0;
}

/* ---------- Panel open/close ---------- */
const panel = $("#aiPanel"), scrim = $("#aiScrim"), fab = $("#aiFab");
export function openChat() {
  panel.hidden = false; scrim.hidden = false;
  setTimeout(() => $("#aiInput")?.focus(), 60);
  if (!$("#aiMessages").children.length) {
    if (transcript.length) restoreHistory();
    else greet();
  }
}

/* Ponovno iscrtaj spremljene poruke pri otvaranju */
function restoreHistory() {
  const box = $("#aiMessages");
  box.innerHTML = "";
  transcript.forEach((m) => {
    const el = document.createElement("div");
    el.className = `msg ${m.role}`;
    el.innerHTML = `<div class="m-ic">${m.role === "user" ? "🧑" : "🧙"}</div><div class="bubble">${m.html}</div>`;
    box.appendChild(el);
  });
  box.scrollTop = box.scrollHeight;
  renderSuggestions(DEFAULT_SUGGESTIONS);
}
export function closeChat() { panel.hidden = true; scrim.hidden = true; }
export function toggleChat() { panel.hidden ? openChat() : closeChat(); }

/* ---------- Poruke ---------- */
function addMessage(role, html, persist = true) {
  const box = $("#aiMessages");
  const el = document.createElement("div");
  el.className = `msg ${role}`;
  el.innerHTML = `<div class="m-ic">${role === "user" ? "🧑" : "🧙"}</div><div class="bubble">${html}</div>`;
  box.appendChild(el);
  box.scrollTop = box.scrollHeight;
  if (persist) { transcript.push({ role, html }); saveTranscript(); }
  return el;
}
function typingIndicator() {
  const box = $("#aiMessages");
  const el = document.createElement("div");
  el.className = "msg bot";
  el.innerHTML = `<div class="m-ic">🧙</div><div class="bubble"><span class="typing"><span></span><span></span><span></span></span></div>`;
  box.appendChild(el);
  box.scrollTop = box.scrollHeight;
  return el;
}

function greet() {
  addMessage("bot",
    "Bok! 👋 Ja sam <b>Nexus asistent</b>. Mogu ti reći o <b>tržištu</b>, <b>vremenu</b> i <b>tečajevima</b> uživo, " +
    "pomoći s navigacijom ili odgovoriti na općenita pitanja. Kliknem li na ⚙, možeš spojiti i pravi AI model.",
    false);
  renderSuggestions(DEFAULT_SUGGESTIONS);
}

const DEFAULT_SUGGESTIONS = [
  "Kolika je cijena Bitcoina?",
  "Kakvo je vrijeme?",
  "Prikaži tečajeve",
  "Otvori analitiku",
];
function renderSuggestions(items) {
  const box = $("#aiSuggestions");
  box.innerHTML = items.map((s) => `<button class="chip" type="button">${s}</button>`).join("");
  box.querySelectorAll(".chip").forEach((c) =>
    c.addEventListener("click", () => submit(c.textContent)));
}

/* ---------- Lokalni engine (rule-based + live podaci) ---------- */
function esc(s) { return String(s).replace(/[&<>]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[m])); }

async function localAnswer(q) {
  const t = q.toLowerCase();

  // Navigacija
  if (/(otvori|idi|prika[žz]i).*(analitik)/.test(t)) { navigate("analytics"); return "Otvorila sam <b>Analitiku</b> 📊"; }
  if (/(otvori|idi|prika[žz]i).*(projekt)/.test(t)) { navigate("projects"); return "Evo <b>Projekata</b> 📁"; }
  if (/(otvori|idi|prika[žz]i).*(postavk|settings)/.test(t)) { navigate("settings"); return "Otvorila sam <b>Postavke</b> ⚙"; }
  if (/(otvori|idi|po[čc]etna|dashboard|nadzorna)/.test(t)) { navigate("dashboard"); return "Vraćam te na <b>Dashboard</b> ◈"; }

  // Kripto
  if (/(bitcoin|btc|ethereum|eth|solana|sol|xrp|kripto|crypto|cijen)/.test(t)) {
    const c = await fetchCrypto();
    const pick = c.items.find((x) =>
      t.includes(x.id.toLowerCase()) || t.includes(x.name.toLowerCase()));
    const fmt = (p) => p >= 1 ? p.toLocaleString("hr-HR", { maximumFractionDigits: 2 }) : p.toFixed(4);
    const tag = c.live ? "" : " <i>(demo — API nedostupan)</i>";
    if (pick) {
      const dir = pick.change >= 0 ? "▲ raste" : "▼ pada";
      return `<b>${pick.name} (${pick.id})</b>: $${fmt(pick.price)} · ${dir} ${Math.abs(pick.change).toFixed(2)}%${tag}`;
    }
    return "Trenutne cijene:" + tag + "<br>" +
      c.items.map((x) => `• <b>${x.id}</b>: $${fmt(x.price)} (${x.change >= 0 ? "▲" : "▼"} ${Math.abs(x.change).toFixed(2)}%)`).join("<br>");
  }

  // Vrijeme
  if (/(vrijeme|temperatur|weather|kiša|kisa|sunc|oblak)/.test(t)) {
    const w = await fetchWeather();
    const [emoji, desc] = weatherLabel(w.code);
    const tag = w.live ? "" : " <i>(demo — API nedostupan)</i>";
    return `${emoji} U gradu <b>${w.city}</b>: <b>${Math.round(w.temp)}°C</b>, ${desc.toLowerCase()}.<br>` +
      `Vlaga ${w.humidity}% · vjetar ${w.wind} km/h${tag}`;
  }

  // Tečajevi
  if (/(te[čc]aj|tecaj|valut|dolar|euro|funt|kuna|rate|currency)/.test(t)) {
    const r = await fetchRates();
    const tag = r.live ? "" : " <i>(demo — API nedostupan)</i>";
    return `Tečajevi za <b>1 ${r.base}</b> (${r.date}):${tag}<br>` +
      Object.entries(r.rates).map(([k, v]) => `• <b>${k}</b>: ${(+v).toFixed(k === "JPY" ? 1 : 4)}`).join("<br>");
  }

  // Tema
  if (/(tema|dark|light|tamn|svijetl|mrak)/.test(t)) {
    document.getElementById("themeToggle")?.click();
    return "Promijenila sam temu 🌗";
  }

  // Pomoć / pozdrav
  if (/(pomo[čc]|help|[šs]to zna|mo[žz]e[šs]|tko si|što si)/.test(t)) {
    return "Mogu: 📈 dati <b>cijene kripta</b>, 🌦️ <b>vrijeme</b>, 💱 <b>tečajeve</b>, mijenjati <b>temu</b> i navigirati kroz aplikaciju. " +
      "Za pametnije, kontekstualne odgovore spoji pravi AI model preko ⚙.";
  }
  if (/(bok|zdravo|hej|pozdrav|hello|hi)\b/.test(t)) {
    return "Bok! 😊 Kako ti mogu pomoći — tržište, vrijeme ili tečajevi?";
  }

  // Fallback
  return `Razumjela sam: „${esc(q)}“. U <b>lokalnom načinu</b> najbolje odgovaram na pitanja o tržištu, vremenu, tečajevima i navigaciji. ` +
    `Za slobodan razgovor spoji AI model klikom na ⚙.`;
}

/* ---------- Remote engine (OpenAI-kompatibilan) ---------- */
async function remoteAnswer(q) {
  const ctx = await safeContext();
  const sys = "Ti si Nexus asistent unutar NexusAI Dashboard aplikacije. Odgovaraj kratko, na hrvatskom. " +
    "Evo trenutnih podataka aplikacije (koristi ih ako su relevantni): " + JSON.stringify(ctx);
  const res = await fetch(config.endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.key}` },
    body: JSON.stringify({
      model: config.model || "gpt-4o-mini",
      messages: [{ role: "system", content: sys }, ...history, { role: "user", content: q }],
      temperature: 0.6,
    }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const j = await res.json();
  return j.choices?.[0]?.message?.content?.trim() || "(prazan odgovor)";
}
async function safeContext() { try { return await getContext(); } catch { return {}; } }

const history = []; // za remote kontekst

/* ---------- Submit ---------- */
let busy = false;
async function submit(text) {
  const q = (text ?? $("#aiInput").value).trim();
  if (!q || busy) return;
  busy = true;
  $("#aiInput").value = "";
  $("#aiSuggestions").innerHTML = "";
  addMessage("user", esc(q));
  history.push({ role: "user", content: q });
  const typing = typingIndicator();

  let answer, viaRemote = !!(config.endpoint && config.key);
  try {
    answer = viaRemote ? await remoteAnswer(q) : await localAnswer(q);
  } catch (e) {
    answer = viaRemote
      ? `⚠️ Ne mogu doseći AI endpoint (${esc(e.message)}). Prebacujem na lokalni odgovor:<br><br>` + await localAnswer(q)
      : "Ups, nešto je pošlo po zlu. Pokušaj ponovno.";
  }
  typing.remove();
  // remote vraća plain text -> escape; lokalni već vraća sigurni HTML
  addMessage("bot", viaRemote ? esc(answer).replace(/\n/g, "<br>") : answer);
  history.push({ role: "assistant", content: String(answer).replace(/<[^>]+>/g, "") });
  if (history.length > 12) history.splice(0, history.length - 12);
  renderSuggestions(DEFAULT_SUGGESTIONS);
  busy = false;
}

/* ---------- Settings UI ---------- */
function refreshStatus() {
  const on = !!(config.endpoint && config.key);
  $("#aiStatus").textContent = on ? `spojen · ${config.model || "gpt-4o-mini"}` : "lokalni način";
}
function bindSettings() {
  $("#aiEndpoint").value = config.endpoint || "";
  $("#aiKey").value = config.key || "";
  $("#aiModel").value = config.model || "";
  $("#aiSettingsBtn").addEventListener("click", () => {
    const s = $("#aiSettings"); s.hidden = !s.hidden;
  });
  $("#aiSaveBtn").addEventListener("click", () => {
    config = { endpoint: $("#aiEndpoint").value.trim(), key: $("#aiKey").value.trim(), model: $("#aiModel").value.trim() };
    saveConfig(config); refreshStatus(); $("#aiSettings").hidden = true;
    addMessage("bot", config.endpoint && config.key
      ? "✅ AI model spojen! Sad dajem pametnije odgovore."
      : "Postavke spremljene. Nastavljam u lokalnom načinu.");
  });
  $("#aiClearBtn").addEventListener("click", () => {
    config = {}; saveConfig(config); refreshStatus();
    $("#aiEndpoint").value = $("#aiKey").value = $("#aiModel").value = "";
    addMessage("bot", "AI postavke obrisane — vraćam se u lokalni način.");
  });
}

/* ---------- Init ---------- */
export function initChat() {
  fab.addEventListener("click", toggleChat);
  $("#aiCloseBtn").addEventListener("click", closeChat);
  scrim.addEventListener("click", closeChat);
  $("#aiForm").addEventListener("submit", (e) => { e.preventDefault(); submit(); });
  $("#aiClearChatBtn")?.addEventListener("click", () => {
    if (!transcript.length) return;
    if (confirm("Obrisati cijeli razgovor?")) {
      clearTranscript();
      $("#aiMessages").innerHTML = "";
      greet();
    }
  });
  bindSettings();
  refreshStatus();
  addEventListener("keydown", (e) => { if (e.key === "Escape" && !panel.hidden) closeChat(); });
}
