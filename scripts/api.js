/* =========================================================
   API sloj — realni javni podaci (bez ključa, CORS-friendly)
   Svaki poziv ima timeout i graceful fallback na demo podatke,
   pa aplikacija radi i offline / iza restriktivne mreže.
   ========================================================= */

const TIMEOUT = 8000;

async function getJSON(url, opts = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), opts.timeout || TIMEOUT);
  try {
    const res = await fetch(url, { signal: ctrl.signal, ...opts });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

const rnd = (a, b) => a + Math.random() * (b - a);

/* ---------- Kripto cijene (Coinbase spot, bez ključa) ---------- */
const CRYPTO = [
  { id: "BTC", name: "Bitcoin", demo: 64200 },
  { id: "ETH", name: "Ethereum", demo: 3350 },
  { id: "SOL", name: "Solana", demo: 148 },
  { id: "XRP", name: "XRP", demo: 0.62 },
];

export async function fetchCrypto() {
  try {
    const results = await Promise.all(
      CRYPTO.map(async (c) => {
        const j = await getJSON(`https://api.coinbase.com/v2/prices/${c.id}-USD/spot`);
        return { ...c, price: parseFloat(j.data.amount), live: true };
      })
    );
    return { live: true, items: withChange(results) };
  } catch {
    return {
      live: false,
      items: withChange(CRYPTO.map((c) => ({ ...c, price: c.demo * rnd(0.97, 1.03) }))),
    };
  }
}
function withChange(items) {
  return items.map((it) => ({ ...it, change: rnd(-6, 8) }));
}

/* ---------- Tečajevi (Frankfurter, ECB, bez ključa) ---------- */
export async function fetchRates() {
  const base = "EUR";
  const symbols = ["USD", "GBP", "HRK", "CHF", "JPY"];
  try {
    const j = await getJSON(`https://api.frankfurter.app/latest?from=${base}&to=${symbols.join(",")}`);
    return { live: true, base, date: j.date, rates: j.rates };
  } catch {
    return {
      live: false,
      base,
      date: new Date().toISOString().slice(0, 10),
      rates: { USD: 1.08, GBP: 0.85, HRK: 7.53, CHF: 0.97, JPY: 161.2 },
    };
  }
}

/* ---------- Vrijeme (Open-Meteo, bez ključa) ---------- */
export async function fetchWeather(lat = 45.815, lon = 15.982, city = "Zagreb") {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code` +
    `&hourly=temperature_2m&forecast_days=1`;
  try {
    const j = await getJSON(url);
    return {
      live: true,
      city,
      temp: j.current.temperature_2m,
      humidity: j.current.relative_humidity_2m,
      wind: j.current.wind_speed_10m,
      code: j.current.weather_code,
      series: (j.hourly?.temperature_2m || []).slice(0, 24),
    };
  } catch {
    return {
      live: false,
      city,
      temp: +rnd(14, 24).toFixed(1),
      humidity: Math.round(rnd(40, 80)),
      wind: +rnd(3, 18).toFixed(1),
      code: 2,
      series: Array.from({ length: 24 }, (_, i) => +(15 + 6 * Math.sin(i / 3)).toFixed(1)),
    };
  }
}

/* WMO weather code -> emoji + opis (hr) */
export function weatherLabel(code) {
  const map = {
    0: ["☀️", "Vedro"], 1: ["🌤️", "Pretežno vedro"], 2: ["⛅", "Djelomično oblačno"],
    3: ["☁️", "Oblačno"], 45: ["🌫️", "Magla"], 48: ["🌫️", "Ledena magla"],
    51: ["🌦️", "Rosulja"], 61: ["🌧️", "Kiša"], 63: ["🌧️", "Umjerena kiša"],
    65: ["🌧️", "Jaka kiša"], 71: ["🌨️", "Snijeg"], 80: ["🌦️", "Pljuskovi"],
    95: ["⛈️", "Grmljavina"],
  };
  return map[code] || ["🌡️", "Nepoznato"];
}
