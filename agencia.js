// ── Datos quemados ──
const CIUDADES_COLOMBIA = [
  { code: "BOG", city: "Bogotá",       search: "bogota" },
  { code: "MDE", city: "Medellín",     search: "medellin" },
  { code: "CTG", city: "Cartagena",    search: "cartagena" },
  { code: "CLO", city: "Cali",         search: "cali" },
  { code: "BAQ", city: "Barranquilla", search: "barranquilla" },
  { code: "SMR", city: "Santa Marta",  search: "santa marta" },
  { code: "ADZ", city: "San Andrés",   search: "san andres" },
  { code: "PEI", city: "Pereira",      search: "pereira" },
  { code: "CUC", city: "Cúcuta",       search: "cucuta" },
  { code: "BGA", city: "Bucaramanga",  search: "bucaramanga" },
  { code: "AXM", city: "Armenia",      search: "armenia" },
  { code: "MZL", city: "Manizales",    search: "manizales" },
  { code: "LET", city: "Leticia",      search: "leticia" },
  { code: "PSO", city: "Pasto",        search: "pasto" },
  { code: "VUP", city: "Valledupar",   search: "valledupar" },
];

// ── Estado ──
let reservas = JSON.parse(localStorage.getItem("viajacol_reservas") || "[]");
let destinoActual = "";
let destinoKey = "";
let datosBuscador = null; // { origen, destino, pasajeros, tipoVuelo, fechaIda, fechaRegreso }
let fechasPicker = null;

// ── Tabs ──
function switchTab(tab, evt) {
  document.querySelectorAll(".page").forEach((p) => p.classList.remove("active"));
  document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
  document.getElementById("page-" + tab).classList.add("active");

  if (evt && evt.target) {
    evt.target.classList.add("active");
  } else {
    const btn = document.querySelector(`.tab-btn[data-tab="${tab}"]`);
    if (btn) btn.classList.add("active");
  }

  if (tab === "reservas") renderTabla();
}

// ── Modal ──
function openModal(ciudad, key, prefilled) {
  destinoActual = ciudad;
  destinoKey = key;
  document.getElementById("modal-dest-label").textContent = "✈ Reservar viaje a";
  document.getElementById("modal-dest-title").textContent = ciudad;
  document.getElementById("f-nombre").value = "";
  document.getElementById("f-correo").value = "";
  document.getElementById("f-telefono").value = "";
  document.getElementById("f-fecha-ida").value = prefilled?.fechaIda || "";
  document.getElementById("f-fecha-regreso").value = prefilled?.fechaRegreso || "";
  limpiarErrores();

  const infoBox = document.getElementById("modal-vuelo-info");
  if (prefilled && prefilled.origen) {
    document.getElementById("info-ruta").textContent =
      `${prefilled.origen} (${prefilled.origenCode}) → ${ciudad} (${prefilled.destinoCode})`;
    document.getElementById("info-pasajeros").textContent =
      `${prefilled.pasajeros} ${prefilled.pasajeros === 1 ? "adulto" : "adultos"}`;
    document.getElementById("info-tipo").textContent =
      prefilled.tipoVuelo === "ida" ? "Solo ida" : "Ida y regreso";
    infoBox.style.display = "flex";

    // Si es solo ida, oculta la fecha de regreso del formulario
    const regresoGroup = document.getElementById("f-fecha-regreso").closest(".form-group");
    if (prefilled.tipoVuelo === "ida") {
      regresoGroup.style.display = "none";
    } else {
      regresoGroup.style.display = "";
    }
  } else {
    infoBox.style.display = "none";
    document.getElementById("f-fecha-regreso").closest(".form-group").style.display = "";
  }

  document.getElementById("modal-overlay").classList.add("open");
}

function closeModal() {
  document.getElementById("modal-overlay").classList.remove("open");
  datosBuscador = null;
}

function closeModalOutside(e) {
  if (e.target === document.getElementById("modal-overlay")) closeModal();
}

// ── Validación ──
const REGEX_NOMBRE = /^[A-Za-zÀ-ÿñÑ' ]{3,60}$/;
const REGEX_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const REGEX_TELEFONO = /^3\d{9}$/;

function setFieldError(fieldId, errorId, msg) {
  const input = document.getElementById(fieldId);
  const err = document.getElementById(errorId);
  if (msg) {
    input.classList.add("invalid");
    err.textContent = msg;
    err.classList.add("show");
  } else {
    input.classList.remove("invalid");
    err.textContent = "";
    err.classList.remove("show");
  }
}

function validarReserva(esSoloIda) {
  const nombre = document.getElementById("f-nombre").value.trim();
  const correo = document.getElementById("f-correo").value.trim();
  const telefono = document.getElementById("f-telefono").value.trim();
  const fechaIda = document.getElementById("f-fecha-ida").value;
  const fechaReg = document.getElementById("f-fecha-regreso").value;

  let ok = true;

  if (!nombre) {
    setFieldError("f-nombre", "err-nombre", "El nombre es obligatorio.");
    ok = false;
  } else if (!REGEX_NOMBRE.test(nombre)) {
    setFieldError("f-nombre", "err-nombre", "Solo letras y espacios (3 a 60 caracteres).");
    ok = false;
  } else {
    setFieldError("f-nombre", "err-nombre", "");
  }

  if (!correo) {
    setFieldError("f-correo", "err-correo", "El correo es obligatorio.");
    ok = false;
  } else if (!REGEX_CORREO.test(correo)) {
    setFieldError("f-correo", "err-correo", "Ingresa un correo válido (ej: nombre@dominio.com).");
    ok = false;
  } else {
    setFieldError("f-correo", "err-correo", "");
  }

  if (!telefono) {
    setFieldError("f-telefono", "err-telefono", "El teléfono es obligatorio.");
    ok = false;
  } else if (!/^\d+$/.test(telefono)) {
    setFieldError("f-telefono", "err-telefono", "El teléfono solo puede contener números.");
    ok = false;
  } else if (!REGEX_TELEFONO.test(telefono)) {
    setFieldError("f-telefono", "err-telefono", "Ingresa un celular colombiano válido (10 dígitos, inicia con 3).");
    ok = false;
  } else {
    setFieldError("f-telefono", "err-telefono", "");
  }

  const hoy = new Date(); hoy.setHours(0,0,0,0);
  if (!fechaIda) {
    setFieldError("f-fecha-ida", "err-fecha-ida", "Selecciona la fecha de ida.");
    ok = false;
  } else if (new Date(fechaIda) < hoy) {
    setFieldError("f-fecha-ida", "err-fecha-ida", "La fecha de ida no puede ser pasada.");
    ok = false;
  } else {
    setFieldError("f-fecha-ida", "err-fecha-ida", "");
  }

  if (!esSoloIda) {
    if (!fechaReg) {
      setFieldError("f-fecha-regreso", "err-fecha-regreso", "Selecciona la fecha de regreso.");
      ok = false;
    } else if (fechaIda && new Date(fechaReg) <= new Date(fechaIda)) {
      setFieldError("f-fecha-regreso", "err-fecha-regreso", "Debe ser posterior a la fecha de ida.");
      ok = false;
    } else {
      setFieldError("f-fecha-regreso", "err-fecha-regreso", "");
    }
  } else {
    setFieldError("f-fecha-regreso", "err-fecha-regreso", "");
  }

  return ok;
}

function limpiarErrores() {
  ["nombre", "correo", "telefono", "fecha-ida", "fecha-regreso"].forEach((k) => {
    setFieldError(`f-${k}`, `err-${k}`, "");
  });
}

// ── Guardar reserva ──
function guardarReserva() {
  const esSoloIda = datosBuscador?.tipoVuelo === "ida";
  if (!validarReserva(esSoloIda)) return;

  const nombre = document.getElementById("f-nombre").value.trim();
  const correo = document.getElementById("f-correo").value.trim();
  const telefono = document.getElementById("f-telefono").value.trim();
  const fechaIda = document.getElementById("f-fecha-ida").value;
  const fechaReg = document.getElementById("f-fecha-regreso").value;

  const reserva = {
    id: Date.now(),
    nombre,
    correo,
    telefono,
    destino: destinoActual,
    destinoKey,
    fechaIda,
    fechaRegreso: esSoloIda ? "" : fechaReg,
    fechaReserva: new Date().toLocaleDateString("es-CO"),
    origen: datosBuscador?.origen || "",
    origenCode: datosBuscador?.origenCode || "",
    destinoCode: datosBuscador?.destinoCode || "",
    pasajeros: datosBuscador?.pasajeros || 1,
    tipoVuelo: datosBuscador?.tipoVuelo || "ida_regreso",
  };

  reservas.push(reserva);
  localStorage.setItem("viajacol_reservas", JSON.stringify(reservas));

  closeModal();
  showToast();

  if (datosBuscador) {
    switchTab("reservas");
    datosBuscador = null;
  }
}

// ── Toast ──
function showToast() {
  const t = document.getElementById("toast");
  t.style.display = "block";
  setTimeout(() => { t.style.display = "none"; }, 3500);
}

// ── Renderizar tabla ──
function renderTabla() {
  const wrap = document.getElementById("tabla-reservas");
  const count = document.getElementById("reservas-count");
  count.textContent = reservas.length + (reservas.length === 1 ? " reserva" : " reservas");

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
    .map((r) => {
      const ruta = r.origen
        ? `${r.origenCode || "—"} → ${r.destinoCode || "—"}`
        : "—";
      const pax = r.pasajeros ? `${r.pasajeros}` : "1";
      return `
      <tr>
        <td>${r.nombre}</td>
        <td>${r.correo}</td>
        <td>${r.telefono}</td>
        <td><span class="dest-chip ${chipClass[r.destinoKey] || ""}">${r.destino}</span></td>
        <td>${ruta}</td>
        <td>${pax}</td>
        <td>${formatDate(r.fechaIda)}</td>
        <td>${r.fechaRegreso ? formatDate(r.fechaRegreso) : "—"}</td>
        <td>${r.fechaReserva}</td>
      </tr>`;
    })
    .join("");

  wrap.innerHTML = `<table>
      <thead>
        <tr>
          <th>Nombre</th>
          <th>Correo</th>
          <th>Teléfono</th>
          <th>Destino</th>
          <th>Ruta</th>
          <th>Pax</th>
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

// ── Autocomplete ──
function normalizar(str) {
  return str.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

function initAutocomplete(inputEl, listEl) {
  let activeIdx = -1;
  let current = [];

  function render(query) {
    const q = normalizar(query);
    current = q
      ? CIUDADES_COLOMBIA.filter((c) => c.search.includes(q))
      : CIUDADES_COLOMBIA.slice();

    if (current.length === 0) {
      listEl.innerHTML = `<div class="autocomplete-empty">Sin resultados</div>`;
    } else {
      listEl.innerHTML = current
        .map(
          (c, i) =>
            `<div class="autocomplete-item${i === activeIdx ? " active" : ""}" data-code="${c.code}" data-city="${c.city}" data-idx="${i}">
               <span>${c.city}</span>
               <span class="ac-code">${c.code}</span>
             </div>`
        )
        .join("");
    }
    listEl.classList.add("open");
  }

  function select(item) {
    inputEl.value = `${item.city} (${item.code})`;
    inputEl.dataset.code = item.code;
    inputEl.dataset.city = item.city;
    listEl.classList.remove("open");
    activeIdx = -1;
  }

  function setActive(idx) {
    activeIdx = idx;
    [...listEl.querySelectorAll(".autocomplete-item")].forEach((el, i) => {
      el.classList.toggle("active", i === activeIdx);
    });
    const activo = listEl.querySelector(".autocomplete-item.active");
    if (activo) activo.scrollIntoView({ block: "nearest" });
  }

  inputEl.addEventListener("focus", () => {
    activeIdx = -1;
    render(inputEl.value.replace(/\s*\([A-Z]{3}\)\s*$/, ""));
  });

  inputEl.addEventListener("input", () => {
    inputEl.dataset.code = "";
    activeIdx = -1;
    render(inputEl.value);
  });

  inputEl.addEventListener("keydown", (e) => {
    if (!listEl.classList.contains("open")) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive(Math.min(activeIdx + 1, current.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive(Math.max(activeIdx - 1, 0));
    } else if (e.key === "Enter") {
      if (activeIdx >= 0 && current[activeIdx]) {
        e.preventDefault();
        select(current[activeIdx]);
      }
    } else if (e.key === "Escape") {
      listEl.classList.remove("open");
    }
  });

  listEl.addEventListener("mousedown", (e) => {
    const item = e.target.closest(".autocomplete-item");
    if (!item) return;
    e.preventDefault();
    const idx = Number(item.dataset.idx);
    if (current[idx]) select(current[idx]);
  });

  document.addEventListener("click", (e) => {
    if (!inputEl.contains(e.target) && !listEl.contains(e.target)) {
      listEl.classList.remove("open");
    }
  });
}

// ── Buscador ──
function preLlenarCiudad(inputEl, code) {
  const c = CIUDADES_COLOMBIA.find((x) => x.code === code);
  if (!c) return;
  inputEl.value = `${c.city} (${c.code})`;
  inputEl.dataset.code = c.code;
  inputEl.dataset.city = c.city;
}

function swapOrigenDestino() {
  const o = document.getElementById("search-origen");
  const d = document.getElementById("search-destino");
  const tv = o.value, tc = o.dataset.code, tn = o.dataset.city;
  o.value = d.value; o.dataset.code = d.dataset.code; o.dataset.city = d.dataset.city;
  d.value = tv;      d.dataset.code = tc;             d.dataset.city = tn;
}

function reservarDesdeBuscador() {
  const origenInput = document.getElementById("search-origen");
  const destinoInput = document.getElementById("search-destino");
  const fechasInput = document.getElementById("search-fechas");
  const pasajerosSel = document.getElementById("search-pasajeros");
  const tipoVuelo = document.querySelector('input[name="tipoVuelo"]:checked').value;

  const origenCode = origenInput.dataset.code;
  const destinoCode = destinoInput.dataset.code;
  const origenCity = origenInput.dataset.city;
  const destinoCity = destinoInput.dataset.city;

  if (!origenCode || !destinoCode) {
    alert("Por favor, selecciona origen y destino válidos del listado.");
    return;
  }
  if (origenCode === destinoCode) {
    alert("El origen y el destino no pueden ser la misma ciudad.");
    return;
  }

  const seleccionadas = fechasPicker?.selectedDates || [];
  if (seleccionadas.length === 0) {
    alert("Por favor, selecciona las fechas de tu viaje.");
    return;
  }
  if (tipoVuelo === "ida_regreso" && seleccionadas.length < 2) {
    alert("Selecciona la fecha de ida y de regreso.");
    return;
  }

  const toISO = (d) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const fechaIda = toISO(seleccionadas[0]);
  const fechaRegreso = tipoVuelo === "ida_regreso" ? toISO(seleccionadas[1]) : "";
  const pasajeros = Number(pasajerosSel.value);
  const destinoKeyMap = {
    SMR: "santamarta",
    CTG: "cartagena",
    MDE: "medellin",
  };

  datosBuscador = {
    origen: origenCity,
    origenCode,
    destinoCode,
    pasajeros,
    tipoVuelo,
    fechaIda,
    fechaRegreso,
  };

  openModal(destinoCity, destinoKeyMap[destinoCode] || destinoCode.toLowerCase(), datosBuscador);
}

function initBuscador() {
  initAutocomplete(
    document.getElementById("search-origen"),
    document.getElementById("list-origen")
  );
  initAutocomplete(
    document.getElementById("search-destino"),
    document.getElementById("list-destino")
  );
  preLlenarCiudad(document.getElementById("search-origen"), "BOG");
  preLlenarCiudad(document.getElementById("search-destino"), "CTG");

  fechasPicker = flatpickr("#search-fechas", {
    mode: "range",
    locale: "es",
    minDate: "today",
    dateFormat: "d M Y",
  });

  document.querySelectorAll('input[name="tipoVuelo"]').forEach((r) => {
    r.addEventListener("change", () => {
      const tipo = document.querySelector('input[name="tipoVuelo"]:checked').value;
      fechasPicker.clear();
      fechasPicker.set("mode", tipo === "ida" ? "single" : "range");
    });
  });
}

// ── Init ──
document.addEventListener("DOMContentLoaded", () => {
  // Etiquetar los botones de tab para poder activarlos sin event
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    const m = btn.getAttribute("onclick")?.match(/switchTab\('(\w+)'/);
    if (m) btn.dataset.tab = m[1];
  });

  // Fecha mínima hoy en los inputs nativos del modal
  const hoy = new Date().toISOString().split("T")[0];
  document.getElementById("f-fecha-ida").min = hoy;
  document.getElementById("f-fecha-regreso").min = hoy;

  // ── Restricciones en tiempo real ──
  const inpNombre = document.getElementById("f-nombre");
  inpNombre.addEventListener("input", () => {
    inpNombre.value = inpNombre.value.replace(/[^A-Za-zÀ-ÿñÑ' ]/g, "");
    setFieldError("f-nombre", "err-nombre", "");
  });

  const inpTelefono = document.getElementById("f-telefono");
  inpTelefono.addEventListener("input", () => {
    inpTelefono.value = inpTelefono.value.replace(/\D/g, "").slice(0, 10);
    setFieldError("f-telefono", "err-telefono", "");
  });
  inpTelefono.addEventListener("keypress", (e) => {
    if (!/[0-9]/.test(e.key)) e.preventDefault();
  });
  inpTelefono.addEventListener("paste", (e) => {
    const txt = (e.clipboardData || window.clipboardData).getData("text");
    if (!/^\d+$/.test(txt)) e.preventDefault();
  });

  const inpCorreo = document.getElementById("f-correo");
  inpCorreo.addEventListener("input", () => {
    setFieldError("f-correo", "err-correo", "");
  });

  document.getElementById("f-fecha-ida").addEventListener("change", () => {
    setFieldError("f-fecha-ida", "err-fecha-ida", "");
  });
  document.getElementById("f-fecha-regreso").addEventListener("change", () => {
    setFieldError("f-fecha-regreso", "err-fecha-regreso", "");
  });

  initBuscador();
});
