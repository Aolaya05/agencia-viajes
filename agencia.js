// ── Estado ──
let reservas = JSON.parse(localStorage.getItem("viajacol_reservas") || "[]");
let destinoActual = "";
let destinoKey = "";

// ── Tabs ──
function switchTab(tab) {
  document
    .querySelectorAll(".page")
    .forEach((p) => p.classList.remove("active"));
  document
    .querySelectorAll(".tab-btn")
    .forEach((b) => b.classList.remove("active"));
  document.getElementById("page-" + tab).classList.add("active");
  event.target.classList.add("active");
  if (tab === "reservas") renderTabla();
}

// ── Modal ──
function openModal(ciudad, key) {
  destinoActual = ciudad;
  destinoKey = key;
  document.getElementById("modal-dest-label").textContent =
    "✈ Reservar viaje a";
  document.getElementById("modal-dest-title").textContent = ciudad;
  document.getElementById("f-nombre").value = "";
  document.getElementById("f-correo").value = "";
  document.getElementById("f-telefono").value = "";
  document.getElementById("f-fecha-ida").value = "";
  document.getElementById("f-fecha-regreso").value = "";
  document.getElementById("modal-overlay").classList.add("open");
}

function closeModal() {
  document.getElementById("modal-overlay").classList.remove("open");
}

function closeModalOutside(e) {
  if (e.target === document.getElementById("modal-overlay")) closeModal();
}

// ── Guardar reserva ──
function guardarReserva() {
  const nombre = document.getElementById("f-nombre").value.trim();
  const correo = document.getElementById("f-correo").value.trim();
  const telefono = document.getElementById("f-telefono").value.trim();
  const fechaIda = document.getElementById("f-fecha-ida").value;
  const fechaReg = document.getElementById("f-fecha-regreso").value;

  if (!nombre || !correo || !telefono || !fechaIda || !fechaReg) {
    alert("Por favor, completa todos los campos obligatorios.");
    return;
  }

  if (new Date(fechaReg) <= new Date(fechaIda)) {
    alert("La fecha de regreso debe ser posterior a la fecha de ida.");
    return;
  }

  const reserva = {
    id: Date.now(),
    nombre,
    correo,
    telefono,
    destino: destinoActual,
    destinoKey,
    fechaIda,
    fechaRegreso: fechaReg,
    fechaReserva: new Date().toLocaleDateString("es-CO"),
  };

  reservas.push(reserva);
  localStorage.setItem("viajacol_reservas", JSON.stringify(reservas));

  closeModal();
  showToast();
}

// ── Toast ──
function showToast() {
  const t = document.getElementById("toast");
  t.style.display = "block";
  setTimeout(() => {
    t.style.display = "none";
  }, 3500);
}

// ── Renderizar tabla ──
function renderTabla() {
  const wrap = document.getElementById("tabla-reservas");
  const count = document.getElementById("reservas-count");
  count.textContent =
    reservas.length + (reservas.length === 1 ? " reserva" : " reservas");

  if (reservas.length === 0) {
    wrap.innerHTML = `<div class="empty-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
          <rect x="9" y="3" width="6" height="4" rx="1"/>
        </svg>
        <p>No hay reservas aún.<br>¡Sé el primero en reservar tu destino!</p>
      </div>`;
    return;
  }

  const chipClass = {
    santamarta: "chip-santamarta",
    cartagena: "chip-cartagena",
    medellin: "chip-medellin",
  };

  const rows = reservas
    .map(
      (r) => `
      <tr>
        <td>${r.nombre}</td>
        <td>${r.correo}</td>
        <td>${r.telefono}</td>
        <td><span class="dest-chip ${chipClass[r.destinoKey] || ""}">${r.destino}</span></td>
        <td>${formatDate(r.fechaIda)}</td>
        <td>${formatDate(r.fechaRegreso)}</td>
        <td>${r.fechaReserva}</td>
      </tr>
    `,
    )
    .join("");

  wrap.innerHTML = `<table>
      <thead>
        <tr>
          <th>Nombre</th>
          <th>Correo</th>
          <th>Teléfono</th>
          <th>Destino</th>
          <th>Fecha ida</th>
          <th>Fecha regreso</th>
          <th>Reservado el</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function formatDate(str) {
  if (!str) return "-";
  const [y, m, d] = str.split("-");
  return `${d}/${m}/${y}`;
}

// Fecha mínima hoy
const hoy = new Date().toISOString().split("T")[0];
document.getElementById("f-fecha-ida").min = hoy;
document.getElementById("f-fecha-regreso").min = hoy;
