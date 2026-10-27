(() => {
  "use strict";
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => Array.from(root.querySelectorAll(s));
  const text = (s, value) => { const n = $(s); if (n && value !== undefined && value !== null) n.textContent = String(value); };
  const image = (s, src, alt) => { const n = $(s); if (n && src) { n.src = src; if (alt) n.alt = alt; } };
  async function json(path, fallback) {
    try { const r = await fetch(path, {cache:"no-store"}); if (!r.ok) throw new Error(path); return await r.json(); }
    catch (_) { return fallback || {}; }
  }
  function time(ms) {
    const n = Number(ms);
    if (!Number.isFinite(n) || n <= 0) return "—";
    const m = Math.floor(n / 60000), s = Math.floor((n % 60000) / 1000), h = Math.floor((n % 1000) / 10);
    return m + ":" + String(s).padStart(2,"0") + "." + String(h).padStart(2,"0");
  }
  function date(value) {
    if (!value) return "FECHA A CONFIRMAR";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "FECHA A CONFIRMAR";
    return new Intl.DateTimeFormat("es-AR",{timeZone:"America/Argentina/Buenos_Aires",day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit",hour12:false})
      .format(d).replace(".", "").toUpperCase() + " ARG";
  }
  function winner(race) {
    return (race?.results || []).slice().sort((a,b) => Number(a.pos || 999)-Number(b.pos || 999))
      .find(r => String(r.status || "OK").toUpperCase() !== "DSQ") || null;
  }
  function leaders(champ) {
    const table = champ?.meta?.points || [20,17,14,12,10,8,6,4,2,1], totals = new Map();
    (champ?.races || []).forEach(race => {
      const mult = Number(race.pointsMultiplier) || 1;
      (race.results || []).filter(r => Number(r.pos)>0 && String(r.status || "OK").toUpperCase() !== "DSQ")
        .slice().sort((a,b)=>Number(a.pos)-Number(b.pos)).forEach((r,i) => {
          const name = String(r.driverName || "").trim(); if (!name) return;
          const row = totals.get(name) || {name,team:r.team || "",points:0,wins:0};
          const explicit = [r.points,r.pts,r.score,r.puntos].map(Number).find(Number.isFinite);
          row.points += (explicit === undefined ? Number(table[i] || 0) : explicit) * mult;
          if (Number(r.pos) === 1) row.wins++;
          if (!row.team && r.team) row.team = r.team;
          totals.set(name,row);
        });
    });
    return Array.from(totals.values()).sort((a,b)=>b.points-a.points || b.wins-a.wins || a.name.localeCompare(b.name));
  }
  function norm(s) { return String(s || "").toLowerCase().replace(/[^a-z0-9]/g,""); }
  function setLinks(site) {
    const links = site?.links || {};
    $$('[data-link="youtube"]').forEach(a => { if (links.youtube) a.href = links.youtube; });
    $$('[data-link="registration"]').forEach(a => { a.href = site?.registration?.pageUrl || "inscripcion.html"; });
    const promo = site?.registration?.promotion;
    const free = promo?.active === true && site?.registration?.open !== false && Number(site?.registration?.availableSlots ?? site?.registration?.totalSlots ?? 0) > 0;
    $$(".registerButton").forEach(a => a.textContent = free ? (promo.ctaLabel || "INSCRIBITE GRATIS") : "INSCRIBITE AHORA");
    $$("[data-registration-label]").forEach(n => n.textContent = free ? "INSCRIPCIÓN GRATIS →" : "INSCRIBITE →");
  }
  function renderLeaders(champ, site) {
    const host = $("#topThree"); if (!host) return;
    const teams = Object.entries(site?.teams || {});
    const backgrounds = ["img/media/pack-battle-wide.webp","img/media/wheel-to-wheel.webp","img/media/mercedes-sunset-wide.webp"];
    const rows = leaders(champ).slice(0,3);
    if (!rows.length) { host.innerHTML = '<li class="loadingRow">Todavía no hay posiciones cargadas.</li>'; return; }
    host.replaceChildren(...rows.map((entry,index) => {
      const li=document.createElement("li"); li.className="driverRow";
      const found=teams.find(([name])=>norm(name)===norm(entry.team));
      li.style.setProperty("--team",found?.[1]?.color || "#df2632");
      li.style.setProperty("--photo",'url("' + backgrounds[index % backgrounds.length] + '")');
      const rank=document.createElement("span");rank.className="driverRank";rank.textContent=(index+1)+"º";
      const identity=document.createElement("span");identity.className="driverIdentity";
      const name=document.createElement("strong");name.textContent=entry.name;
      const team=document.createElement("small");team.textContent=entry.team || "Equipo a confirmar";
      identity.append(name,team);
      const points=document.createElement("span");points.className="driverPoints";points.innerHTML=String(entry.points)+'<small>PTS</small>';
      li.append(rank,identity,points);
      if(found?.[1]?.asset){const logo=document.createElement("img");logo.className="teamLogo";logo.src=found[1].asset;logo.alt="Logo de "+entry.team;li.append(logo);}
      return li;
    }));
  }
  function renderFullStandings(champ) {
    const host=$("#fullStandings"); if(!host) return;
    const rows=leaders(champ);
    host.replaceChildren(...rows.map((entry,index)=>{
      const tr=document.createElement("tr");
      [String(index+1),entry.name,entry.team || "—",String(entry.points)].forEach(value=>{const td=document.createElement("td");td.textContent=value;tr.append(td);});
      return tr;
    }));
    text("#driverCount",rows.length+" PILOTOS");
  }
  function setupMagazine(config) {
    const imageNode=$("#magazinePage"),pages=(config?.fallbackPages || []).slice();
    if (!imageNode || !pages.length) { text("#magazineStatus","Revista sin páginas cargadas."); return; }
    let cursor=pages.length-1, zoom=1;
    const setPage=()=>{imageNode.src=pages[cursor];imageNode.alt="Página "+(cursor+1)+" de la revista";text("#magazineStatus","PÁGINA "+(cursor+1)+" DE "+pages.length);$("#magPrev").disabled=cursor<=0;$("#magNext").disabled=cursor>=pages.length-1;};
    const updateZoom=()=>{imageNode.style.transform="scale("+zoom+")";text("#zoomValue",Math.round(zoom*100)+"%");$("#zoomOut").disabled=zoom<=1;$("#zoomIn").disabled=zoom>=2.5;};
    $("#magPrev").addEventListener("click",()=>{if(cursor>0){cursor--;setPage();}});
    $("#magNext").addEventListener("click",()=>{if(cursor<pages.length-1){cursor++;setPage();}});
    $("#zoomOut").addEventListener("click",()=>{zoom=Math.max(1,zoom-.25);updateZoom();});
    $("#zoomIn").addEventListener("click",()=>{zoom=Math.min(2.5,zoom+.25);updateZoom();});
    imageNode.addEventListener("dblclick",()=>{zoom=zoom===1?1.75:1;updateZoom();});
    setPage();updateZoom();
  }
  async function main() {
    const snapshot=window.ASSETTO_F1_SNAPSHOT || {};
    const results=await Promise.all([json("data/site.json",snapshot.site),json("data/championship.json",snapshot.championship)]);
    const site=results[0] || {}, champ=results[1] || {};
    setLinks(site);
    const races=(champ.races || []).slice().sort((a,b)=>String(b.date || "").localeCompare(String(a.date || "")));
    const race=races[0], win=winner(race), alias=site.trackAliases || {}, track=alias[race?.trackName] || {};
    text("[data-stage]",site.stageLabel || "TEMPORADA");
    const digits=String(site.stageLabel || "").match(/\d+/); text("[data-stage-number]",digits ? digits[0] : "—");
    text("#lastRaceName",(track.name || race?.trackName || "ÚLTIMA CARRERA").toUpperCase());
    text("#lastRaceCircuit",track.circuit || track.name || race?.trackName || "Circuito a confirmar");
    text("#winnerName",win?.driverName || "—"); text("#winnerTime",time(win?.finalTimeMs));
    if(site.media?.carousel?.lastRace?.src) image("#lastRacePhoto",site.media.carousel.lastRace.src,"");
    const next=site.nextRace || {};
    text("#nextRaceName",next.name || "PRÓXIMA FECHA"); text("#nextRaceCircuit",next.circuit || "Circuito a confirmar"); text("#nextRaceDate",date(next.date));
    if(next.trackAsset) image("#nextTrackMap",next.trackAsset,"Trazado de "+(next.country || next.name || "la próxima fecha"));
    if(site.media?.carousel?.nextRace?.src) image("#nextRacePhoto",site.media.carousel.nextRace.src,"");
    if(site.media?.carousel?.youtubeWindow?.src) image("#youtubeImage",site.media.carousel.youtubeWindow.src,"");
    text("#raceCount",(champ.races || []).length+" FECHA"+((champ.races || []).length===1?"":"S"));
    renderLeaders(champ,site);
    renderFullStandings(champ);
    const resultsList=$("#resultsList");
    if(resultsList){resultsList.replaceChildren(...races.map(r=>{const row=document.createElement("div");row.className="resultRow";const td=alias[r.trackName] || {};const place=document.createElement("b");place.textContent=td.name || r.trackName || "Carrera";const pilot=document.createElement("span");pilot.textContent=winner(r)?.driverName || "Sin ganador";const resultTime=document.createElement("small");resultTime.textContent=time(winner(r)?.finalTimeMs);row.append(place,pilot,resultTime);return row;}));}
    text("#resultsCount",(races.length || 0)+" carrera"+(races.length===1?"":"s"));
    setupMagazine(site.magazine || {});
  }
  main().catch(error=>console.error("Preview Assetto F1:",error));
})();