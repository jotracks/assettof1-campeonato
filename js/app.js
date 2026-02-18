// js/app.js
function el(tag, attrs = {}, children = []) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") n.className = v;
    else if (k === "html") n.innerHTML = v;
    else n.setAttribute(k, v);
  }
  for (const c of children) {
    if (typeof c === "string") n.appendChild(document.createTextNode(c));
    else if (c) n.appendChild(c);
  }
  return n;
}

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function badge(type, txt) {
  return `<span class="badge ${type}">${escapeHtml(txt)}</span>`;
}

function msToClock(ms) {
  if (!Number.isFinite(ms) || ms <= 0) return "";
  const total = Math.max(0, Math.floor(ms));
  const m = Math.floor(total / 60000);
  const s = Math.floor((total % 60000) / 1000);
  const c = Math.floor((total % 1000) / 10);
  return `${m}:${String(s).padStart(2, "0")}.${String(c).padStart(2, "0")}`;
}

function teamSlug(team) {
  return String(team || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function formatDriverDisplayName(full) {
  const s = String(full || "").trim();
  if (!s) return "—";
  const parts = s.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].toUpperCase();
  const first = parts[0];
  const last = parts[parts.length - 1];
  const initial = first[0] ? first[0].toUpperCase() : "";
  return `${initial}. ${last.toUpperCase()}`;
}

/* Color opcional por equipo */
function hashColor(slug) {
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) >>> 0;
  const hue = h % 360;
  return `hsl(${hue} 80% 55%)`;
}

/* ======================================================
   TEAM BANNER (case sensitive)
   Busca: img/<TEAM>.(png|webp|jpg|jpeg)
   ====================================================== */
function teamBannerCandidates(team) {
  const raw = String(team || "").trim();
  if (!raw) return [];
  const safe = raw.replace(/\.\.[/\\]/g, "").replace(/[/\\]/g, "_");
  const base = safe.replace(/\.(png|webp|jpg|jpeg)$/i, "");
  const enc = encodeURIComponent(base);

  const rel = [
    `img/${enc}.png`,
    `img/${enc}.webp`,
    `img/${enc}.jpg`,
    `img/${enc}.jpeg`,
  ];
  return rel.map((p) => new URL(p, document.baseURI).toString());
}

function setRowTeamBanner(rowEl, team) {
  const candidates = teamBannerCandidates(team);
  if (!candidates.length) {
    rowEl.style.setProperty("--teamBg", "none");
    return;
  }

  const probe = new Image();
  let idx = 0;

  const tryNext = () => {
    if (idx >= candidates.length) {
      rowEl.style.setProperty("--teamBg", "none");
      return;
    }
    const path = candidates[idx++];

    probe.onload = () => rowEl.style.setProperty("--teamBg", `url('${path}')`);
    probe.onerror = tryNext;

    // cache-bust para desarrollo (podés borrar esto en prod)
    probe.src = path + (path.includes("?") ? "&" : "?") + "v=" + Date.now();
  };

  tryNext();
}

function getTeamFromDriver(d) {
  return (
    typeof d.team === "string"
      ? d.team
      : typeof d.constructor === "string"
        ? d.constructor
        : ""
  ).trim();
}



function getResultPointsAny(r) {
  const keys = ["points", "pts", "score", "puntos"];
  for (const k of keys) {
    const n = Number(r?.[k]);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function ensureRacePoints(race, ptsTable) {
  const results = Array.isArray(race?.results) ? race.results : [];

  // Sort classified by finishing position (pos > 0) and not DSQ
  const classified = results
    .filter((r) => Number(r?.pos) > 0 && String(r?.status || "OK").toUpperCase() !== "DSQ")
    .slice()
    .sort((a, b) => (a.pos ?? 0) - (b.pos ?? 0));

  classified.forEach((r, idx) => {
    const existing = getResultPointsAny(r);
    r.points = existing != null ? existing : Number(ptsTable[idx] ?? 0);
  });

  // Everyone else: normalize points to 0 (and also normalize pts/score -> points)
  results.forEach((r) => {
    const existing = getResultPointsAny(r);
    if (existing != null) r.points = existing;
    if (r.points == null) r.points = 0;
  });
}

function computeDriversFromRaces(races) {
  const map = new Map();

  for (const race of races) {
    const results = Array.isArray(race?.results) ? race.results : [];
    for (const r of results) {
      const name = String(r?.driverName || "").trim();
      if (!name) continue;

      if (!map.has(name)) {
        map.set(name, { driverName: name, team: r.team || r.constructor || "", points: 0, wins: 0 });
      }
      const d = map.get(name);

      if (!d.team && (r.team || r.constructor)) d.team = r.team || r.constructor;

      const pts = Number(r?.points ?? 0);
      if (Number.isFinite(pts)) d.points += pts;

      const st = String(r?.status || "OK").toUpperCase();
      if (Number(r?.pos) === 1 && st !== "DSQ") d.wins += 1;
    }
  }

  return [...map.values()].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.wins !== a.wins) return b.wins - a.wins;
    return String(a.driverName).localeCompare(String(b.driverName));
  });
}

/* ======================================================
   Section headers (PNG)
   ====================================================== */
function headerImg(srcRel, alt) {
  const src = new URL(srcRel, document.baseURI).toString();
  const img = document.createElement("img");
  img.className = "sectionHeaderImg";
  img.alt = alt;
  img.src = src + (src.includes("?") ? "&" : "?") + "v=" + Date.now();
  return img;
}

function ensurePilotsHeader(card, driversHost) {
  if (card.querySelector("#pilotsHeader")) return;

  const candidates = Array.from(card.querySelectorAll("h2, .sectionTitle, .cardTitle"));
  const existing = candidates.find((n) => /piloto/i.test((n.textContent || "").trim()));

  if (existing) {
    existing.id = "pilotsHeader";
    existing.textContent = "";
    existing.appendChild(headerImg("img/campeonatodepilotos.png", "Campeonato de Pilotos"));
    existing.classList.add("sectionHeader");
    return;
  }

  const wrap = document.createElement("div");
  wrap.id = "pilotsHeader";
  wrap.className = "sectionHeader";
  wrap.appendChild(headerImg("img/campeonatodepilotos.png", "Campeonato de Pilotos"));
  driversHost.parentElement.insertBefore(wrap, driversHost);
}

/* ======================================================
   Drivers standings (broadcast rows)
   ====================================================== */
function renderStandingsBroadcast(drivers) {
  const host = document.getElementById("driversStandings");
  host.innerHTML = "";

  drivers.forEach((d, i) => {
    const team = getTeamFromDriver(d);
    const slug = teamSlug(team);

    const row = document.createElement("div");
    row.className = "standRow";

    row.style.setProperty("--teamColor", slug ? hashColor(slug) : "rgba(255,255,255,.18)");
    setRowTeamBanner(row, team);

    const pos = document.createElement("div");
    pos.className = "posBox";
    pos.textContent = String(i + 1);

    const plate = document.createElement("div");
    plate.className = "namePlate";

    const name = document.createElement("div");
    name.className = "driverName";
    name.textContent = formatDriverDisplayName(d.driverName);

    const teamEl = document.createElement("div");
    teamEl.className = "teamName";
    teamEl.textContent = team || "";

    plate.appendChild(name);
    if (team) plate.appendChild(teamEl);

    const ptsBox = document.createElement("div");
    ptsBox.className = "pointsBox";

    const pts = document.createElement("div");
    pts.className = "points";
    pts.textContent = String(d.points ?? 0);

    ptsBox.appendChild(pts);

    row.appendChild(pos);
    row.appendChild(plate);
    row.appendChild(ptsBox);

    host.appendChild(row);
  });
}

/* ======================================================
   Teams standings (grouped)
   ====================================================== */
function computeTeamsFromDrivers(drivers) {
  const map = new Map();

  for (const d of drivers) {
    const team = getTeamFromDriver(d) || "—";
    if (!map.has(team)) map.set(team, { team, points: 0, wins: 0, drivers: 0 });
    const t = map.get(team);
    t.points += Number(d.points ?? 0);
    t.wins += Number(d.wins ?? 0);
    t.drivers += 1;
  }

  return [...map.values()].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.wins !== a.wins) return b.wins - a.wins;
    return String(a.team).localeCompare(String(b.team));
  });
}

function ensureTeamsSection(card) {
  let teamsHost = document.getElementById("teamsStandings");
  if (teamsHost) return teamsHost;

  const divider = document.createElement("div");
  divider.className = "standingsGap";

  const header = document.createElement("div");
  header.id = "teamsHeader";
  header.className = "sectionHeader";
  header.appendChild(headerImg("img/campeonatodeequipos.png", "Campeonato de Equipos"));

  teamsHost = document.createElement("div");
  teamsHost.id = "teamsStandings";
  teamsHost.className = "standings";

  card.appendChild(divider);
  card.appendChild(header);
  card.appendChild(teamsHost);

  return teamsHost;
}

function renderTeamsStandingsBroadcast(teams, opts = {}) {
  const driversHost = document.getElementById("driversStandings");
  if (!driversHost) return;

  const card = document.getElementById("standingsCard") || driversHost.parentElement;

  ensurePilotsHeader(card, driversHost);

  const host = ensureTeamsSection(card);
  host.innerHTML = "";

  const hidePoints = !!opts.hidePoints;

  teams.forEach((t, i) => {
    const slug = teamSlug(t.team);

    const row = document.createElement("div");
    row.className = "standRow";

    row.style.setProperty("--teamColor", slug ? hashColor(slug) : "rgba(255,255,255,.18)");
    setRowTeamBanner(row, t.team);

    const pos = document.createElement("div");
    pos.className = "posBox";
    pos.textContent = String(i + 1);

    const plate = document.createElement("div");
    plate.className = "namePlate";

    const name = document.createElement("div");
    name.className = "driverName";
    name.textContent = String(t.team || "—").toUpperCase();

    const sub = document.createElement("div");
    sub.className = "teamName";
    sub.textContent = `${t.drivers} pilotos`;

    plate.appendChild(name);
    plate.appendChild(sub);

    const ptsBox = document.createElement("div");
    ptsBox.className = "pointsBox";

    const pts = document.createElement("div");
    pts.className = "points";
    pts.textContent = hidePoints ? "" : String(t.points);
    ptsBox.style.visibility = hidePoints ? "hidden" : "visible";

    ptsBox.appendChild(pts);

    row.appendChild(pos);
    row.appendChild(plate);
    row.appendChild(ptsBox);

    host.appendChild(row);
  });
}

/* ======================================================
   Results / history
   ====================================================== */
function buildTable(headers, rowObjs) {
  const wrap = el("div", { class: "tableWrap" });
  const table = el("table");
  const thead = el("thead");
  const trh = el("tr");
  headers.forEach((h) => trh.appendChild(el("th", {}, [h])));
  thead.appendChild(trh);
  table.appendChild(thead);

  const tbody = el("tbody");
  rowObjs.forEach((r) => {
    const tr = el("tr");
    if (r.__rowClass) tr.className = r.__rowClass;

    r.__cells.forEach((cell) => {
      const td = el("td");
      if (cell && typeof cell === "object" && cell.__html != null) td.innerHTML = cell.__html;
      else td.textContent = String(cell ?? "");
      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  wrap.appendChild(table);
  return wrap;
}

function winnerFromRace(race) {
  const res = (race.results || []).slice().sort((a, b) => (a.pos ?? 0) - (b.pos ?? 0));
  const w = res.find((x) => (x.status || "OK") !== "DSQ") || res[0];
  return w || null;
}

function fastestLapInfo(race) {
  return race.fastestLap || race.fastLap || null;
}

function getTyreFromResult(r) {
  const candidates = [
    r.tyre, r.tire, r.compound,
    r.tyres, r.tires,
    r.finishTyre, r.finishTire,
    r.finalTyre, r.finalTire,
    r.endTyre, r.endTire,
    r.tyreEnd, r.tireEnd,
    r.tyreFinish, r.tireFinish
  ];

  for (const v of candidates) {
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number" && Number.isFinite(v)) return String(v);
  }

  const obj = candidates.find((v) => v && typeof v === "object");
  if (obj) {
    if (typeof obj.compound === "string") return obj.compound;
    if (typeof obj.name === "string") return obj.name;
    try {
      const s = JSON.stringify(obj);
      return s.length > 24 ? s.slice(0, 24) + "…" : s;
    } catch (_) {}
  }

  return "";
}

function getStartPosFromResult(r) {
  const candidates = [r.grid, r.startPos, r.start, r.gridPos, r.qualPos, r.qualiPos];
  for (const v of candidates) {
    const n = Number(v);
    if (Number.isFinite(n) && n > 0) return Math.floor(n);
  }
  return null;
}


function tyreClass(t) {
  const s = String(t || "").trim().toUpperCase();
  if (!s) return "";
  if (s === "H" || s === "HARD" || s === "C1" || s === "C2") return "hard";
  if (s === "M" || s === "MEDIUM" || s === "C3") return "medium";
  if (s === "S" || s === "SOFT" || s === "C4" || s === "C5") return "soft";
  if (s === "I" || s === "INTER" || s === "INTERS" || s === "IM" || s === "INT") return "inter";
  if (s === "W" || s === "WET" || s === "RAIN") return "wet";
  if (/^C\d+$/.test(s)) return "soft";
  return "";
}

function buildTyreDotsHtml(tyresUsed, tyreEnd) {
  const used = Array.isArray(tyresUsed) ? tyresUsed.filter(Boolean) : [];
  const end = String(tyreEnd || "").trim().toUpperCase();
  const list = used.length ? used.map((x) => String(x).trim().toUpperCase()) : (end ? [end] : []);
  if (!list.length) return "";
  const dots = list.map((t) => `<span class="tyreDot ${tyreClass(t)}" title="${escapeHtml(t)}"></span>`).join("");
  const tag = end ? `<span class="badge tyre">${escapeHtml(end)}</span>` : "";
  return `<span class="tyreDots">${dots}</span>${tag ? " " + tag : ""}`;
}


function computeMostOvertakes(race) {
  const mo = race.mostOvertakes || race.mostOvertake || race.overtakesLeader;
  if (mo && typeof mo === "object") {
    const name = String(mo.driverName || mo.driver || "").trim();
    const gained = Number(mo.gained ?? mo.positions ?? mo.overtakes);
    if (name && Number.isFinite(gained)) return { driverName: name, gained: Math.floor(gained) };
  }

  let best = null;
  for (const r of (race.results || [])) {
    const st = String(r.status || "OK").toUpperCase();
    if (st === "DSQ") continue;

    const grid = getStartPosFromResult(r);
    const pos = Number(r.pos);
    if (!grid || !Number.isFinite(pos) || pos <= 0) continue;

    const gained = Math.floor(grid - pos);
    if (!Number.isFinite(gained)) continue;
    if (gained <= 0) continue;

    if (!best || gained > best.gained) best = { driverName: String(r.driverName || "").trim(), gained };
  }
  return best;
}

function formatNotes(r) {
  const notes = [];
  const st = (r.status || "OK").toUpperCase();
  if (st === "DNF") notes.push(badge("dnf", "DNF"));
  if (st === "DSQ") notes.push(badge("dsq", "DSQ"));
  const penMs = Number(r.penaltyExtraMs || 0);
  if (penMs > 0) notes.push(badge("pen", `+${(penMs / 1000).toFixed(1)}s`));
  return notes.join(" ");
}

function raceCard(race) {
  const round = race.round ?? "?";
  const date = race.date ? String(race.date) : "";
  const track = race.trackName || "";

  const head = el("div", { class: "row" }, [
    el("span", { class: "pill" }, [`Fecha ${round}`]),
    track ? el("span", { class: "pill" }, [track]) : null,
    el("span", { class: "pill right mono" }, [date]),
  ]);

  const winner = winnerFromRace(race);
  const winnerLine = el("div", { class: "winnerLine", style: "margin-top:10px" }, [
    el("span", { class: "pill winnerPill" }, ["Ganador"]),
    el("span", { class: "winnerName" }, [winner ? winner.driverName : "—"]),
    winner?.team ? el("span", { class: "pill" }, [winner.team]) : null,
  ]);

  const fl = fastestLapInfo(race);
  const flDriver = String(fl?.driverName || fl?.driver || "").trim();
  const flTime = String(fl?.time || fl?.lapTime || "").trim();

  const fastLapLine = fl
    ? el("div", { class: "fastLapLine" }, [
        el("span", { class: "pill violet" }, ["Vuelta rápida"]),
        el("span", { class: "fastLapName" }, [flDriver || "—"]),
        flTime ? el("span", { class: "pill violet mono" }, [flTime]) : null,
      ])
    : null;

  const mo = computeMostOvertakes(race);
  const overtakeLine = mo
    ? el("div", { class: "overtakeLine" }, [
        el("span", { class: "pill cyan" }, ["Más adelantamientos"]),
        el("span", { class: "overtakeName" }, [mo.driverName]),
        el("span", { class: "pill cyan mono" }, [`+${mo.gained}`]),
      ])
    : null;

  const rows = (race.results || [])
    .slice()
    .sort((a, b) => (a.pos ?? 0) - (b.pos ?? 0))
    .map((x) => {
      const nameRaw = String(x.driverName || "").trim();
      const isFL = flDriver && nameRaw === flDriver;
      const isMO = mo?.driverName && nameRaw === mo.driverName;

      const tyreEnd = getTyreFromResult(x) || x.tyreEnd || x.endTyre || "";
      const tyreHtml = buildTyreDotsHtml(x.tyresUsed || x.tiresUsed || x.compoundsUsed || [], tyreEnd);

      const dotHtml = [
        isFL ? `<span class="flDot" title="Vuelta rápida"></span>` : "",
        isMO ? `<span class="otDot" title="Más adelantamientos"></span>` : "",
      ].join("");

      const nameHtml = `${dotHtml}<span class="nameText">${escapeHtml(nameRaw)}</span>`;

      let notesHtml = formatNotes(x);
      if (x.noCompoundChange) notesHtml += (notesHtml ? " " : "") + badge("warn", "NO CHANGE");
      if (isFL) notesHtml += (notesHtml ? " " : "") + badge("fl", "FL");
      if (isMO && mo?.gained) notesHtml += (notesHtml ? " " : "") + badge("ovr", `+${mo.gained}`);

      const rowClass = [
        isFL ? "fastLapRow" : "",
        isMO ? "mostOvertakesRow" : "",
      ].filter(Boolean).join(" ");

      return {
        __rowClass: rowClass,
        __cells: [
          x.pos,
          { __html: nameHtml },
          x.team || "",
          { __html: tyreHtml },
          { __html: `<span class="mono">${msToClock(Number(x.finalTimeMs || 0)) || escapeHtml(x.finalTime || "")}</span>` },
          { __html: `<span class="mono">${Number(x.points || 0)}</span>` },
          { __html: notesHtml },
        ],
      };
    });

  const table = buildTable(["Pos", "Piloto", "Marca", "Neum", "Tiempo", "Pts", "Notas"], rows);

  const card = el("div", { class: "card" }, [head, winnerLine]);
  if (fastLapLine) card.appendChild(fastLapLine);
  if (overtakeLine) card.appendChild(overtakeLine);
  card.appendChild(el("div", { style: "margin-top:10px" }, [table]));
  return card;
}

/* ======================================================
   Main render
   ====================================================== */
function render(data) {
  const season = data?.meta?.season || "Temporada";
  const updated = data?.meta?.updatedAt || "";
  const pts = Array.isArray(data?.meta?.points)
    ? data.meta.points
    : [20, 17, 14, 12, 10, 8, 6, 4, 2, 1];

  document.getElementById("seasonPill").textContent = season;
  document.getElementById("updatedPill").textContent = updated ? "Actualizado: " + updated : "Actualizado";
  document.getElementById("pointsPill").textContent = "Puntos: " + pts.join(",");

  const races = (data?.races || []).slice();

// 1) Asegura puntos por carrera (si el JSON no trae results[].points / pts / score)
races.forEach((r) => ensureRacePoints(r, pts));

// 2) Usa standings del JSON si existe.
//    Si falta, lo calcula desde las carreras.
//    Si hay 0 puntos *pero NO hay resultados de carreras* (pre-temporada), lo respeta.
const hasRaceResults = races.some(r => Array.isArray(r?.results) && r.results.length);

let drivers = (data?.standings?.drivers || []).slice();
if (!drivers.length) {
  drivers = computeDriversFromRaces(races);
} else if (hasRaceResults) {
  const sum = drivers.reduce((acc, d) => acc + Number(d?.points ?? 0), 0);
  if (!Number.isFinite(sum) || sum <= 0) drivers = computeDriversFromRaces(races);
}
document.getElementById("driversCount").textContent = `Pilotos: ${drivers.length}`;
  document.getElementById("racesPill").textContent = `Fechas: ${races.length}`;
  document.getElementById("historyCount").textContent = `${races.length} carreras`;

  renderStandingsBroadcast(drivers);

  const teams = computeTeamsFromDrivers(drivers);
  renderTeamsStandingsBroadcast(teams, { hidePoints: !!data.__entryMode });

  const hist = document.getElementById("history");
  hist.innerHTML = "";
  races
    .sort((a, b) => {
      const ar = Number(a.round || 0);
      const br = Number(b.round || 0);
      if (br !== ar) return br - ar;
      return String(b.date || "").localeCompare(String(a.date || ""));
    })
    .forEach((r) => hist.appendChild(raceCard(r)));
}


// -------- Entry list (pre-season) support --------
// If there are no races yet and standings are empty, we can pull drivers + teams from an EntryList JSON
// (e.g. a Server Manager preset export) and show the grid publicly with 0 points.
const CHAMPIONSHIP_URL_CANDIDATES = [
  "data/championship.json",
  "championship.json",
];

const ENTRYLIST_URL_CANDIDATES = [
  "data/entrylist.json",
  "entrylist.json",
  "data/PRE Temporada  2026 .json",
  "PRE Temporada  2026 .json",
];

const MODEL_TO_TEAM = {
  gp_2026_w17: "Mercedes",
  gp_2026_sf26: "Ferrari",
  gp_2026_a526: "Alpine",
  gp_2026_rb22: "Red Bull",
  gp_2026_vcarb03: "VCARB",
  gp_2026_cad26: "Cadillac",
};

function normalizeTeamFromEntry(e) {
  const t = String(e?.Team || "").trim();
  if (t) return t;
  const m = String(e?.Model || "").trim();
  return MODEL_TO_TEAM[m] || "";
}

function entryListToDrivers(entryJson) {
  const list = entryJson?.EntryList || entryJson?.entryList || entryJson?.entry_list;
  if (!list || typeof list !== "object") return [];
  const drivers = [];
  for (const v of Object.values(list)) {
    const name = String(v?.Name || v?.name || "").trim();
    if (!name) continue;
    const team = normalizeTeamFromEntry(v);
    drivers.push({ driverName: name, team: team, points: 0, wins: 0 });
  }
  // stable alphabetical order for "no races yet"
  drivers.sort((a, b) => String(a.driverName).localeCompare(String(b.driverName)));
  return drivers;
}


function isEntryListJson(obj) {
  return !!(obj && (obj.EntryList || obj.entryList || obj.entry_list));
}

function coerceEntryListToChampionship(entryJson, seasonLabel = "Inscriptos") {
  const drivers = entryListToDrivers(entryJson);
  return {
    __entryMode: true,
    meta: {
      season: seasonLabel,
      updatedAt: "",
      // points table: render() will fall back to defaults
    },
    races: [],
    standings: { drivers }
  };
}

async function tryFetchAny(urls) {
  let lastErr = null;
  for (const u of urls) {
    try {
      const res = await fetch(u, { cache: "no-store" });
      if (!res.ok) continue;
      return await res.json();
    } catch (e) {
      lastErr = e;
    }
  }
  if (lastErr) throw lastErr;
  throw new Error("fetch failed");
}

function hasAnyStandingsOrRaces(data) {
  const races = Array.isArray(data?.races) ? data.races : [];
  const drivers = Array.isArray(data?.standings?.drivers) ? data.standings.drivers : [];
  const hasRaceResults = races.some(r => Array.isArray(r?.results) && r.results.length);
  const hasDriverNames = drivers.some(d => String(d?.driverName || "").trim());
  return hasRaceResults || hasDriverNames;
}

async function tryFetch() {
  return await tryFetchAny(CHAMPIONSHIP_URL_CANDIDATES);
}

function enableOfflinePicker() {
  document.getElementById("loadCard").style.display = "block";
  const picker = document.getElementById("filePicker");
  picker.addEventListener("change", async () => {
    const f = picker.files?.[0];
    if (!f) return;
    const txt = await f.text();
    let data = JSON.parse(txt);
    if (isEntryListJson(data) && !Array.isArray(data?.races) && !Array.isArray(data?.standings?.drivers)) {
      data = coerceEntryListToChampionship(data, "Inscriptos");
    }
    render(data);
  });
}

(async function main() {
  try {
    let data = await tryFetch();

    // If the fetched file is actually an EntryList JSON, render it as a 0-points "pre-season" standings.
    if (isEntryListJson(data) && !Array.isArray(data?.races) && !Array.isArray(data?.standings?.drivers)) {
      data = coerceEntryListToChampionship(data, "Inscriptos");
      render(data);
      return;
    }

    // If no races/standings yet, try to populate the grid from an EntryList JSON
    if (!hasAnyStandingsOrRaces(data)) {
      try {
        const entryJson = await tryFetchAny(ENTRYLIST_URL_CANDIDATES);
        const entryDrivers = entryListToDrivers(entryJson);
        if (entryDrivers.length) {
          data.standings = data.standings || {};
          data.standings.drivers = entryDrivers;
        }
      } catch (e) {
        // silently ignore entry list fetch, we'll still render what we have
        console.warn("entry list fetch failed", e);
      }
    }

    render(data);
  } catch (e) {
    console.warn(e);
    // If championship.json is missing, try to render entrylist.json directly.
    try {
      const entryJson = await tryFetchAny(ENTRYLIST_URL_CANDIDATES);
      const coerced = coerceEntryListToChampionship(entryJson, "Inscriptos");
      render(coerced);
    } catch (e2) {
      console.warn("entrylist fallback failed", e2);
      enableOfflinePicker();
    }
  }
})();
