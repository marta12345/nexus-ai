/* =========================================================
   Custom SVG charts — zero-dependency
   ========================================================= */

const NS = "http://www.w3.org/2000/svg";

/** Shared <defs> with gradients used by charts. */
function defs() {
  return `
    <defs>
      <linearGradient id="chartGrad" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#7c5cff"/><stop offset="1" stop-color="#22d3ee"/>
      </linearGradient>
      <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#7c5cff" stop-opacity=".55"/>
        <stop offset="1" stop-color="#7c5cff" stop-opacity="0"/>
      </linearGradient>
      <linearGradient id="barGrad" x1="0" y1="1" x2="0" y2="0">
        <stop offset="0" stop-color="#22d3ee"/><stop offset="1" stop-color="#7c5cff"/>
      </linearGradient>
    </defs>`;
}

/** Smooth catmull-rom -> bezier path for a line chart. */
function smoothPath(points) {
  if (points.length < 2) return "";
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] || points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

/** Animated line/area chart. data = number[] */
export function lineChart(data, { w = 640, h = 220, pad = 24 } = {}) {
  const max = Math.max(...data), min = Math.min(...data);
  const range = max - min || 1;
  const step = (w - pad * 2) / (data.length - 1);
  const pts = data.map((v, i) => ({
    x: pad + i * step,
    y: pad + (h - pad * 2) * (1 - (v - min) / range),
  }));
  const line = smoothPath(pts);
  const area = `${line} L ${pts[pts.length - 1].x} ${h - pad} L ${pts[0].x} ${h - pad} Z`;
  // grid lines
  let grid = "";
  for (let i = 0; i <= 4; i++) {
    const y = pad + ((h - pad * 2) / 4) * i;
    grid += `<line x1="${pad}" y1="${y}" x2="${w - pad}" y2="${y}" stroke="var(--border)" stroke-width="1"/>`;
  }
  // approximate path length for stroke-dash animation
  const len = pts.reduce((acc, p, i) => i ? acc + Math.hypot(p.x - pts[i-1].x, p.y - pts[i-1].y) : 0, 0) * 1.4;
  const dots = pts.map(p => `<circle cx="${p.x}" cy="${p.y}" r="3.5" fill="var(--surface-solid)" stroke="url(#chartGrad)" stroke-width="2"/>`).join("");
  return `<svg class="chart" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" style="--len:${len}">
    ${defs()}${grid}
    <path class="spark-area" d="${area}"/>
    <path class="spark-line" d="${line}"/>
    ${dots}
  </svg>`;
}

/** Animated bar chart. data = number[] */
export function barChart(data, { w = 640, h = 220, pad = 24 } = {}) {
  const max = Math.max(...data) || 1;
  const n = data.length;
  const gap = 14;
  const bw = (w - pad * 2 - gap * (n - 1)) / n;
  let bars = "";
  data.forEach((v, i) => {
    const bh = (h - pad * 2) * (v / max);
    const x = pad + i * (bw + gap);
    const y = h - pad - bh;
    bars += `<rect class="bar-track" x="${x}" y="${pad}" width="${bw}" height="${h - pad * 2}" rx="6"/>`;
    bars += `<rect x="${x}" y="${h - pad}" width="${bw}" height="0" rx="6" fill="url(#barGrad)">
      <animate attributeName="height" from="0" to="${bh}" dur="0.9s" begin="${i * 0.06}s" fill="freeze" calcMode="spline" keySplines="0.22 0.61 0.36 1"/>
      <animate attributeName="y" from="${h - pad}" to="${y}" dur="0.9s" begin="${i * 0.06}s" fill="freeze" calcMode="spline" keySplines="0.22 0.61 0.36 1"/>
    </rect>`;
  });
  return `<svg class="chart" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">${defs()}${bars}</svg>`;
}

/** Animated donut chart. segments = [{label, value, color}] */
export function donutChart(segments, { size = 180, thickness = 26 } = {}) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const r = (size - thickness) / 2;
  const c = size / 2;
  const circ = 2 * Math.PI * r;
  let offset = 0;
  const rings = segments.map((seg, i) => {
    const frac = seg.value / total;
    const dash = frac * circ;
    const el = `<circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="${seg.color}" stroke-width="${thickness}"
      stroke-linecap="round" stroke-dasharray="0 ${circ}" transform="rotate(-90 ${c} ${c})"
      style="stroke-dashoffset:${-offset}">
      <animate attributeName="stroke-dasharray" from="0 ${circ}" to="${dash} ${circ - dash}" dur="1s" begin="${i * 0.12}s" fill="freeze" calcMode="spline" keySplines="0.22 0.61 0.36 1"/>
    </circle>`;
    offset += dash;
    return el;
  }).join("");
  const legend = segments.map(seg =>
    `<div class="legend-item"><span class="legend-dot" style="background:${seg.color}"></span>${seg.label}
      <b style="margin-left:auto;color:var(--text)">${Math.round((seg.value/total)*100)}%</b></div>`
  ).join("");
  return `<div class="donut-wrap">
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      ${rings}
      <text x="${c}" y="${c-4}" text-anchor="middle" fill="var(--text)" font-size="26" font-weight="800">${total.toLocaleString()}</text>
      <text x="${c}" y="${c+18}" text-anchor="middle" fill="var(--muted)" font-size="12">ukupno</text>
    </svg>
    <div class="donut-legend">${legend}</div>
  </div>`;
}
