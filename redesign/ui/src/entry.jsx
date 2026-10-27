import React, { useEffect, useMemo, useRef } from "react";
import { createRoot } from "react-dom/client";

/** ========= Helpers (mirrors app.js) ========= */
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

function hashColor(slug) {
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) >>> 0;
  const hue = h % 360;
  return `hsl(${hue} 80% 55%)`;
}

function isDev() {
  const host = location.hostname;
  return host === "localhost" || host === "127.0.0.1";
}

function withCacheBuster(url) {
  if (!isDev()) return url;
  return url + (url.includes("?") ? "&" : "?") + "v=" + Date.now();
}

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
    probe.src = withCacheBuster(path);
  };

  tryNext();
}

function getTeamFromDriver(d) {
  return (
    typeof d?.team === "string"
      ? d.team
      : typeof d?.constructor === "string"
        ? d.constructor
        : ""
  ).trim();
}

/** ========= React UI (islands) ========= */

function StandRowDriver({ d, i }) {
  const team = getTeamFromDriver(d);
  const slug = teamSlug(team);
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return;
    setRowTeamBanner(ref.current, team);
  }, [team]);

  const teamColor = slug ? hashColor(slug) : "rgba(255,255,255,.18)";

  return (
    <div
      ref={ref}
      className="standRow"
      style={{ "--teamColor": teamColor }}
    >
      <div className="posBox">{i + 1}</div>
      <div className="namePlate">
        <div className="driverName">{formatDriverDisplayName(d.driverName)}</div>
        {team ? <div className="teamName">{team}</div> : null}
      </div>
      <div className="pointsBox">
        <div className="points">{String(d.points ?? 0)}</div>
      </div>
    </div>
  );
}

function StandRowTeam({ t, i, hidePoints }) {
  const slug = teamSlug(t.team);
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return;
    setRowTeamBanner(ref.current, t.team);
  }, [t.team]);

  const teamColor = slug ? hashColor(slug) : "rgba(255,255,255,.18)";

  return (
    <div
      ref={ref}
      className="standRow"
      style={{ "--teamColor": teamColor }}
    >
      <div className="posBox">{i + 1}</div>
      <div className="namePlate">
        <div className="driverName">{String(t.team || "—").toUpperCase()}</div>
        <div className="teamName">{t.drivers} pilotos</div>
      </div>
      <div className="pointsBox" style={{ visibility: hidePoints ? "hidden" : "visible" }}>
        <div className="points">{hidePoints ? "" : String(t.points ?? 0)}</div>
      </div>
    </div>
  );
}

function DriversStandings({ drivers }) {
  // small micro-optim: stable array ref
  const list = useMemo(() => Array.isArray(drivers) ? drivers : [], [drivers]);
  return (
    <div className="tw-flex tw-flex-col tw-gap-2">
      {list.map((d, i) => (
        <StandRowDriver key={`${d.driverName || "driver"}-${i}`} d={d} i={i} />
      ))}
    </div>
  );
}

function TeamsStandings({ teams, hidePoints }) {
  const list = useMemo(() => Array.isArray(teams) ? teams : [], [teams]);
  return (
    <div className="tw-flex tw-flex-col tw-gap-2">
      {list.map((t, i) => (
        <StandRowTeam key={`${t.team || "team"}-${i}`} t={t} i={i} hidePoints={hidePoints} />
      ))}
    </div>
  );
}

let roots = {
  drivers: null,
  teams: null,
};

export function render({ drivers = [], teams = [], hideTeamPoints = false } = {}) {
  const driversHost = document.getElementById("driversStandings");
  if (driversHost) {
    if (!roots.drivers) {
      driversHost.innerHTML = "";
      roots.drivers = createRoot(driversHost);
    }
    roots.drivers.render(<DriversStandings drivers={drivers} />);
  }

  const teamsHost = document.getElementById("teamsStandings");
  if (teamsHost) {
    if (!roots.teams) {
      teamsHost.innerHTML = "";
      roots.teams = createRoot(teamsHost);
    }
    roots.teams.render(<TeamsStandings teams={teams} hidePoints={hideTeamPoints} />);
  }
}

// expose for debugging in console
export const _debug = {
  teamSlug,
  hashColor,
  teamBannerCandidates,
};
