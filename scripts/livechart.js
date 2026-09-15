/* =========================================================
   Live chart — grafikon u realnom vremenu (klizeći prozor)
   Zero-dependency, čisti SVG. Nove točke pristižu i klize ulijevo.
   ========================================================= */

const MAX_POINTS = 40;   // koliko točaka drži u prozoru
const W = 640, H = 220, PAD = 24;

/** Glatka bezier krivulja kroz točke. */
function smoothPath(pts) {
  if (pts.length < 2) return pts.length ? `M ${pts[0].x} ${pts[0].y}` : "";
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    const c1x = p1.x + (p2.x - p0.x) / 6, c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6, c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

export class LiveChart {
  /**
   * @param {HTMLElement} mount  kontejner u koji se crta SVG
   * @param {object} opts  { label, unit, min, max, interval, color, valueEl }
   */
  constructor(mount, opts = {}) {
    this.mount = mount;
    this.label = opts.label || "Metrika";
    this.unit = opts.unit || "";
    this.min = opts.min ?? 0;
    this.max = opts.max ?? 100;
    this.interval = opts.interval || 1500;
    this.valueEl = opts.valueEl || null;   // element za tekstualnu trenutnu vrijednost
    this.data = [];
    this.timer = null;
    // Seed: napuni prozor početnim vrijednostima da graf odmah izgleda pun
    let v = (this.min + this.max) / 2;
    for (let i = 0; i < MAX_POINTS; i++) { v = this._next(v); this.data.push(v); }
    this._buildSVG();
    this.render();
  }

  _next(prev) {
    // Random-walk s blagim vraćanjem prema sredini (realistična metrika)
    const mid = (this.min + this.max) / 2;
    const drift = (mid - prev) * 0.05;
    const noise = (Math.random() - 0.5) * (this.max - this.min) * 0.22;
    let v = prev + drift + noise;
    return Math.max(this.min, Math.min(this.max, v));
  }

  _buildSVG() {
    this.mount.innerHTML = `
      <svg class="chart live-chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
        <defs>
          <linearGradient id="liveLine" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stop-color="#7c5cff"/><stop offset="1" stop-color="#22d3ee"/>
          </linearGradient>
          <linearGradient id="liveArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#22d3ee" stop-opacity=".45"/>
            <stop offset="1" stop-color="#22d3ee" stop-opacity="0"/>
          </linearGradient>
        </defs>
        <g class="lc-grid"></g>
        <path class="lc-area"></path>
        <path class="lc-line"></path>
        <circle class="lc-head" r="4.5"></circle>
        <circle class="lc-pulse" r="4.5"></circle>
      </svg>`;
    const grid = this.mount.querySelector(".lc-grid");
    let g = "";
    for (let i = 0; i <= 4; i++) {
      const y = PAD + ((H - PAD * 2) / 4) * i;
      g += `<line x1="${PAD}" y1="${y}" x2="${W - PAD}" y2="${y}" stroke="var(--border)" stroke-width="1"/>`;
    }
    grid.innerHTML = g;
    this.$area = this.mount.querySelector(".lc-area");
    this.$line = this.mount.querySelector(".lc-line");
    this.$head = this.mount.querySelector(".lc-head");
    this.$pulse = this.mount.querySelector(".lc-pulse");
  }

  _points() {
    const n = this.data.length;
    const step = (W - PAD * 2) / (MAX_POINTS - 1);
    const range = this.max - this.min || 1;
    return this.data.map((v, i) => ({
      x: PAD + (i + (MAX_POINTS - n)) * step,
      y: PAD + (H - PAD * 2) * (1 - (v - this.min) / range),
    }));
  }

  render() {
    const pts = this._points();
    const line = smoothPath(pts);
    const last = pts[pts.length - 1];
    this.$line.setAttribute("d", line);
    this.$area.setAttribute("d", `${line} L ${last.x} ${H - PAD} L ${pts[0].x} ${H - PAD} Z`);
    this.$head.setAttribute("cx", last.x); this.$head.setAttribute("cy", last.y);
    this.$pulse.setAttribute("cx", last.x); this.$pulse.setAttribute("cy", last.y);
    if (this.valueEl) {
      const cur = this.data[this.data.length - 1];
      this.valueEl.textContent = cur.toFixed(this.max <= 10 ? 2 : 0) + this.unit;
    }
  }

  tick() {
    const next = this._next(this.data[this.data.length - 1]);
    this.data.push(next);
    if (this.data.length > MAX_POINTS) this.data.shift();
    this.render();
  }

  start() {
    if (this.timer) return;
    this.timer = setInterval(() => this.tick(), this.interval);
  }

  stop() {
    clearInterval(this.timer);
    this.timer = null;
  }
}
