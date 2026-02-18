/* js/app.js */

const $ = (id) => document.getElementById(id);

const elTitle = $("title");
const elSubtitle = $("subtitle");

const elLoadCard = $("loadCard");
const elFilePicker = $("filePicker");

const elDriversCount = $("driversCount");
const elDriversStandings = $("driversStandings");

const elHistoryCount = $("historyCount");
const elHistory = $("history");

const elUpdated = $("updatedPill");

function setUpdatedNow() {
  if (!elUpdated) return;
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  elUpdated.textContent = `Actualizado: ${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function showOfflineCard(show) {
  if (!elLoadCard) return;
  elLoadCard.style.display = show ? "block" : "none";
}

async function fetchJson(path) {
  // Importante: resolve contra el documento, no contra /js/
  const url = new URL(path, document.baseURI).toString();
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return res.json();
}

async function loadAuto() {
  // 1) championship.json (si existe)
  try {
    const data = await fetchJson("data/championship.json");
    return { data, kind: "championship" };
  } catch (_) {
    // 2) entrylist.json (fallback)
    const data = await fetchJson("data/entrylist.json");
    return { data, kind: "entrylist" };
  }
}

/* --------- Parsing flexible --------- */

function pick(obj, keys, fallback = "") {
  for (const k of keys) {
    if (obj && obj[k] !== undefined && obj[k] !== null && obj[k] !== "") return obj[k];
  }
  return fallback;
}

function toNumber(x, def = 0) {
  const n = Number(x);
  return Number.isFinite(n) ? n : def;
}

function extractDrivers(raw) {
  // Soporta varios formatos típicos
  let arr =
    (raw && Array.isArray(raw.drivers) && raw.drivers) ||
    (raw && Array.isArray(raw.entries) && raw.entries) ||
    (raw && raw.entrylist && Array.isArray(raw.entrylist.entries) && raw.entrylist.entries) ||
    [];

  // Si viniera como objeto tipo { "Nombre": {...} }
  if (!Array.isArray(arr) && raw && typeof raw === "object") {
    const maybe = raw.standings || raw.classification;
    if (Array.isArray(maybe)) arr = maybe;
  }

  if (!Array.isArray(arr)) arr = [];

  const drivers = arr.map((d) => {
    // drivers[] puede tener drivers internos (AC entrylist)
    // Ej: { drivers:[{name:""}], team:"", car:"" }
    let name =
      (Array.isArray(d.drivers) && d.drivers[0] && pick(d.drivers[0], ["name", "driverName"])) ||
      pick(d, ["name", "driver", "driverName", "playerName", "nick", "username"]);

    let team = pick(d, ["team", "teamName", "constructor", "carName", "car", "vehicle"]);

    const points = toNumber(pick(d, ["points", "pts", "score"], 0), 0);
    const wins = toNumber(pick(d, ["wins", "victories"], 0), 0);

    return {
      name: String(name || "SIN NOMBRE").trim(),
      team: String(team || "SIN EQUIPO").trim(),
      points,
      wins,
    };
  });

  // Filtrar repetidos vacíos
  return drivers.filter((x) => x.name && x.name !== "SIN NOMBRE");
}

function extractRaces(raw) {
  // Soporta varios formatos posibles
  const races =
    (raw && Array.isArray(raw.races) && raw.races) ||
    (raw && Array.isArray(raw.rounds) && raw.rounds) ||
    [];

  if (!Array.isArray(races)) return [];
  return races;
}

/* --------- Render --------- */

function clearNode(node) {
  if (!node) return;
  while (node.firstChild) node.removeChild(node.firstChild);
}

function renderStandings(drivers) {
  clearNode(elDriversStandings);

  // Orden: puntos desc, wins desc, nombre
  const sorted = [...drivers].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.wins !== a.wins) return b.wins - a.wins;
    return a.name.localeCompare(b.name);
  });

  if (elDriversCount) elDriversCount.textContent = `Pilotos: ${sorted.length}`;

  sorted.forEach((d, i) => {
    const row = document.createElement("div");
    row.className = "standRow";

    const pos = document.createElement("div");
    pos.className = "posBox";
    pos.textContent = String(i + 1);

    const plate = document.createElement("div");
    plate.className = "namePlate";

    const dn = document.createElement("div");
    dn.className = "driverName";
    dn.textContent = d.name;

    const tn = document.createElement("div");
    tn.className = "teamName";
    tn.textContent = d.team;

    plate.appendChild(dn);
    plate.appendChild(tn);

    const pb = document.createElement("div");
    pb.className = "pointsBox";

    const pts = document.createElement("div");
    pts.className = "points";
    pts.textContent = String(d.points ?? 0);

    const wins = document.createElement("div");
    wins.className = "wins";
    wins.textContent = d.wins ? `Wins: ${d.wins}` : "";

    pb.appendChild(pts);
    pb.appendChild(wins);

    row.appendChild(pos);
    row.appendChild(plate);
    row.appendChild(pb);

    elDriversStandings.appendChild(row);
  });
}

function renderHistory(races) {
  clearNode(elHistory);

  if (!races || races.length === 0) {
    if (elHistoryCount) elHistoryCount.textContent = "0 carreras";
    return;
  }

  if (elHistoryCount) elHistoryCount.textContent = `${races.length} carreras`;

  // Mostrar última → primera (como tu título)
  const list = [...races].reverse();

  list.forEach((r) => {
    const card = document.createElement("div");
    card.className = "raceCard";

    const top = document.createElement("div");
    top.className = "raceTop";

    const name = document.createElement("div");
    name.className = "raceName";
    name.textContent = String(pick(r, ["name", "track", "title", "gp"], "Carrera")).toUpperCase();

    const date = document.createElement("div");
    date.className = "raceDate";
    date.textContent = String(pick(r, ["date", "day"], ""));

    top.appendChild(name);
    top.appendChild(date);

    const body = document.createElement("div");
    body.className = "raceBody";

    // Intentar sacar resultados
    const results =
      (Array.isArray(r.results) && r.results) ||
      (Array.isArray(r.classification) && r.classification) ||
      (Array.isArray(r.standings) && r.standings) ||
      [];

    if (Array.isArray(results) && results.length) {
      const grid = document.createElement("div");
      grid.className = "resultsGrid";

      results.forEach((it, idx) => {
        const pos = document.createElement("div");
        pos.className = "cellPos";
        pos.textContent = String(pick(it, ["pos", "position"], idx + 1));

        const drv = document.createElement("div");
        drv.className = "cellDriver";
        drv.textContent = String(pick(it, ["name", "driver", "driverName"], "—"));

        const team = document.createElement("div");
        team.className = "cellTeam";
        team.textContent = String(pick(it, ["team", "teamName", "constructor"], "—"));

        const time = document.createElement("div");
        time.className = "cellTime";
        time.textContent = String(pick(it, ["time", "gap", "best"], "—"));

        grid.appendChild(pos);
        grid.appendChild(drv);
        grid.appendChild(team);
        grid.appendChild(time);
      });

      body.appendChild(grid);
    } else {
      const p = document.createElement("div");
      p.className = "muted";
      p.textContent = "Sin resultados en el JSON.";
      body.appendChild(p);
    }

    card.appendChild(top);
    card.appendChild(body);

    elHistory.appendChild(card);
  });
}

function applyHeaderFromData(raw) {
  // Título/subtítulo si vienen
  const t = pick(raw, ["title", "seasonTitle", "name"], "");
  if (t && elTitle) elTitle.textContent = t;

  const sub = pick(raw, ["subtitle", "description"], "");
  if (elSubtitle) {
    if (sub) {
      elSubtitle.textContent = sub;
      elSubtitle.style.display = "";
    } else {
      // ✅ evita espacio abajo del título si no hay subtítulo
      elSubtitle.textContent = "";
      elSubtitle.style.display = "none";
    }
  }
}

function renderAll(raw, kind) {
  showOfflineCard(false);
  setUpdatedNow();

  applyHeaderFromData(raw);

  const drivers = extractDrivers(raw);
  renderStandings(drivers);

  // history solo si es championship (o si hay races)
  const races = extractRaces(raw);
  renderHistory(races);

  // Si es entrylist, no hay carreras
  if (kind === "entrylist" && elHistoryCount) {
    elHistoryCount.textContent = "0 carreras";
  }
}

/* --------- Offline manual load --------- */

function setupFilePicker() {
  if (!elFilePicker) return;
  elFilePicker.addEventListener("change", async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const raw = JSON.parse(text);
      renderAll(raw, "manual");
      showOfflineCard(false);
    } catch (err) {
      console.error("JSON inválido:", err);
      alert("Ese JSON no se pudo leer. ¿Seguro exportaste el archivo correcto?");
    }
  });
}

/* --------- Init --------- */

(async function init() {
  setupFilePicker();

  try {
    const { data, kind } = await loadAuto();
    renderAll(data, kind);
  } catch (err) {
    console.error("No se pudo cargar data automáticamente:", err);
    // Mostrar modo offline (file:// o falta data en GH Pages)
    showOfflineCard(true);
    setUpdatedNow();
    // También oculto subtítulo para que no meta margen vacío
    if (elSubtitle) elSubtitle.style.display = "none";
  }
})();
