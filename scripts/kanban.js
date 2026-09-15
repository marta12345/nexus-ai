/* =========================================================
   Kanban ploča — drag & drop, localStorage perzistencija
   ========================================================= */

const LS_KEY = "nexus-kanban";

const COLUMNS = [
  { id: "todo", title: "📋 Za napraviti" },
  { id: "doing", title: "⚙️ U tijeku" },
  { id: "done", title: "✅ Gotovo" },
];

const DEFAULT_DATA = {
  todo: [
    { id: uid(), text: "Dizajn nove landing stranice", tag: "design" },
    { id: uid(), text: "Istražiti WebGPU podršku", tag: "research" },
  ],
  doing: [
    { id: uid(), text: "Aurora API v2 — autentikacija", tag: "backend" },
    { id: uid(), text: "Nova UI Kit — komponente", tag: "design" },
  ],
  done: [
    { id: uid(), text: "Postaviti CI/CD pipeline", tag: "devops" },
    { id: uid(), text: "Migracija baze na v3", tag: "backend" },
  ],
};

const TAG_COLORS = {
  design: "#f472b6", research: "#22d3ee", backend: "#7c5cff",
  devops: "#f59e0b", ostalo: "#94a3b8",
};

function uid() { return "c" + Math.random().toString(36).slice(2, 9); }

function load() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return structuredClone(DEFAULT_DATA);
}
function save(data) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(data)); } catch {}
}

let data = load();
let onChange = () => {};

function esc(s) { return String(s).replace(/[&<>"]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[m])); }

/* ---------- HTML ---------- */
export function kanbanHTML() {
  return `<div class="kanban">
    ${COLUMNS.map((col) => `
      <div class="kanban-col" data-col="${col.id}">
        <div class="kanban-col-head">
          <span>${col.title}</span>
          <span class="kanban-count" data-count-for="${col.id}">${data[col.id].length}</span>
        </div>
        <div class="kanban-cards" data-drop="${col.id}">
          ${data[col.id].map(cardHTML).join("")}
        </div>
        <button class="kanban-add" data-add="${col.id}">+ Dodaj karticu</button>
      </div>`).join("")}
  </div>`;
}

function cardHTML(card) {
  const color = TAG_COLORS[card.tag] || TAG_COLORS.ostalo;
  return `<div class="kanban-card" draggable="true" data-id="${card.id}">
    <span class="kanban-tag" style="background:${color}22;color:${color}">${esc(card.tag || "ostalo")}</span>
    <button class="kanban-del" data-del="${card.id}" title="Obriši">✕</button>
    <div class="kanban-text">${esc(card.text)}</div>
  </div>`;
}

/* ---------- Perzistencija + counteri ---------- */
function persist() {
  save(data);
  COLUMNS.forEach((c) => {
    const el = document.querySelector(`[data-count-for="${c.id}"]`);
    if (el) el.textContent = data[c.id].length;
  });
  onChange(data);
}

function findCard(id) {
  for (const col of COLUMNS) {
    const idx = data[col.id].findIndex((c) => c.id === id);
    if (idx > -1) return { col: col.id, idx, card: data[col.id][idx] };
  }
  return null;
}

/* ---------- Drag & drop + akcije ---------- */
let dragId = null;

export function initKanban(changeCb) {
  onChange = changeCb || (() => {});
  const board = document.querySelector(".kanban");
  if (!board) return;

  // Drag
  board.addEventListener("dragstart", (e) => {
    const card = e.target.closest(".kanban-card");
    if (!card) return;
    dragId = card.dataset.id;
    card.classList.add("dragging");
    e.dataTransfer.effectAllowed = "move";
  });
  board.addEventListener("dragend", (e) => {
    e.target.closest(".kanban-card")?.classList.remove("dragging");
    board.querySelectorAll(".kanban-cards.over").forEach((z) => z.classList.remove("over"));
  });
  board.querySelectorAll("[data-drop]").forEach((zone) => {
    zone.addEventListener("dragover", (e) => { e.preventDefault(); zone.classList.add("over"); });
    zone.addEventListener("dragleave", () => zone.classList.remove("over"));
    zone.addEventListener("drop", (e) => {
      e.preventDefault();
      zone.classList.remove("over");
      moveCard(dragId, zone.dataset.drop);
    });
  });

  // Klik: brisanje + dodavanje
  board.addEventListener("click", (e) => {
    const del = e.target.closest("[data-del]");
    if (del) { deleteCard(del.dataset.del); return; }
    const add = e.target.closest("[data-add]");
    if (add) { addCard(add.dataset.add); }
  });
}

function moveCard(id, toCol) {
  const found = findCard(id);
  if (!found || found.col === toCol) return;
  data[found.col].splice(found.idx, 1);
  data[toCol].push(found.card);
  rerender();
}

function deleteCard(id) {
  const found = findCard(id);
  if (!found) return;
  data[found.col].splice(found.idx, 1);
  rerender();
}

function addCard(col) {
  const text = prompt("Naziv nove kartice:");
  if (!text || !text.trim()) return;
  const tag = (prompt("Oznaka (design / research / backend / devops):", "ostalo") || "ostalo").trim().toLowerCase();
  data[col].push({ id: uid(), text: text.trim(), tag });
  rerender();
}

/* Ponovno iscrtaj samo kanban dio (zadrži ostatak view-a) */
function rerender() {
  const wrap = document.querySelector(".kanban");
  if (!wrap) return;
  wrap.outerHTML = kanbanHTML();
  persist();
  initKanban(onChange);
}

export function resetKanban() {
  data = structuredClone(DEFAULT_DATA);
  rerender();
}
