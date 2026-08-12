(() => {
  "use strict";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  async function loadJson(path, fallback) {
    try {
      const response = await fetch(path, { cache: "no-store" });
      if (!response.ok) throw new Error(`No se pudo cargar ${path}`);
      return response.json();
    } catch (error) {
      if (fallback) return fallback;
      throw error;
    }
  }

  function setText(selector, value) {
    const node = $(selector);
    if (node && value !== undefined && value !== null) node.textContent = String(value);
  }

  function setImage(selector, src, alt) {
    const image = $(selector);
    if (!image || !src) return;
    image.src = src;
    if (alt) image.alt = alt;
  }

  function formatClock(ms) {
    const value = Number(ms);
    if (!Number.isFinite(value) || value <= 0) return "—";
    const minutes = Math.floor(value / 60000);
    const seconds = Math.floor((value % 60000) / 1000);
    const hundredths = Math.floor((value % 1000) / 10);
    return `${minutes}:${String(seconds).padStart(2, "0")}.${String(hundredths).padStart(2, "0")}`;
  }

  function formatRaceDate(value, includeTime = true) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    const parts = new Intl.DateTimeFormat("es-AR", {
      timeZone: "America/Argentina/Buenos_Aires",
      day: "2-digit",
      month: "short",
      ...(includeTime ? { hour: "2-digit", minute: "2-digit", hour12: false } : {})
    }).formatToParts(date);
    const get = (type) => parts.find((part) => part.type === type)?.value || "";
    const datePart = `${get("day")} ${get("month").replace(".", "")}`.toUpperCase();
    return includeTime ? `${datePart} · ${get("hour")}:${get("minute")} ARG` : datePart;
  }

  function winnerFromRace(race) {
    return (race?.results || [])
      .slice()
      .sort((a, b) => Number(a.pos || 999) - Number(b.pos || 999))
      .find((result) => String(result.status || "OK").toUpperCase() !== "DSQ") || null;
  }

  function latestRace(championship) {
    return (championship?.races || [])
      .slice()
      .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")))[0] || null;
  }

  function computeLeaders(championship) {
    const pointsTable = championship?.meta?.points || [20, 17, 14, 12, 10, 8, 6, 4, 2, 1];
    const drivers = new Map();

    for (const race of championship?.races || []) {
      const multiplier = Number(race.pointsMultiplier) || 1;
      const classified = (race.results || [])
        .filter((result) => Number(result.pos) > 0 && String(result.status || "OK").toUpperCase() !== "DSQ")
        .slice()
        .sort((a, b) => Number(a.pos) - Number(b.pos));

      classified.forEach((result, index) => {
        const name = String(result.driverName || "").trim();
        if (!name) return;
        const current = drivers.get(name) || { name, team: result.team || "", points: 0, wins: 0 };
        const explicit = [result.points, result.pts, result.score, result.puntos]
          .map(Number)
          .find(Number.isFinite);
        current.points += (explicit ?? Number(pointsTable[index] || 0)) * multiplier;
        if (Number(result.pos) === 1) current.wins += 1;
        if (!current.team && result.team) current.team = result.team;
        drivers.set(name, current);
      });
    }

    return [...drivers.values()].sort((a, b) =>
      b.points - a.points || b.wins - a.wins || a.name.localeCompare(b.name)
    );
  }

  function shortDriverName(value) {
    const parts = String(value || "").trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "—";
    if (parts.length === 1) return parts[0].toUpperCase();
    return `${parts[0][0].toUpperCase()}. ${parts.at(-1).toUpperCase()}`;
  }

  function hydrateLinks(site) {
    const links = {
      server: site?.links?.server,
      youtube: site?.links?.youtube,
      instagram: site?.links?.instagram,
      registration: site?.registration?.pageUrl || "inscripcion.html"
    };

    Object.entries(links).forEach(([key, href]) => {
      if (!href) return;
      $$(`[data-link="${key}"]`).forEach((anchor) => { anchor.href = href; });
    });
  }

  function hydrateSiteText(site) {
    $$('[data-site-season]').forEach((node) => { node.textContent = site.seasonLabel || "TEMPORADA 2026"; });
    $$('[data-site-stage]').forEach((node) => { node.textContent = site.stageLabel || "ETAPA"; });
    $$('[data-site-price]').forEach((node) => { node.textContent = site?.registration?.price || "Consultar"; });
    $$('[data-site-races]').forEach((node) => {
      const races = Number(site?.registration?.races);
      node.textContent = races ? `${races} fechas` : "Edición completa";
    });
  }

  function hydrateMedia(site) {
    const carousel = site?.media?.carousel || {};
    const images = {
      lastRace: "#lastRaceBackdrop",
      nextRace: "#nextRaceBackdrop",
      youtube: "#youtubeBackdrop",
      youtubeWindow: "#youtubeWindowImage",
      registration: "#registrationBackdrop"
    };

    Object.entries(images).forEach(([key, selector]) => {
      const asset = carousel[key];
      if (asset?.src) setImage(selector, asset.src, "");
    });
  }

  function hydrateRaceSummary(site, championship) {
    const race = latestRace(championship);
    const winner = winnerFromRace(race);
    const trackData = site?.trackAliases?.[race?.trackName] || {};
    const trackName = trackData.name || race?.trackName || "Última carrera";
    const circuit = trackData.circuit || trackName;
    const trackAsset = trackData.trackAsset || "img/tracks/spa-francorchamps.svg";

    setText("#lastRaceHeroTitle", trackName.toUpperCase());
    setText("#lastRaceHeroLead", circuit);
    setText("#lastRaceHeroWinner", winner?.driverName || "—");
    setText("#lastRaceTabLabel", `RESUMEN ${trackName}`.toUpperCase());
    setText("#lastRaceCardTrack", trackName);
    setText("#lastRaceCardWinner", winner?.driverName || "—");
    setText("#lastRaceCardTeam", winner?.team || "—");
    setText("#lastRaceCardTime", formatClock(winner?.finalTimeMs));
    setImage("#lastRaceHeroTrack", trackAsset, `Trazado de ${trackName}`);
    setImage("#lastRaceCardTrackImg", trackAsset, `Trazado de ${trackName}`);

    const next = site?.nextRace || {};
    setText("#nextRaceHeroTitle", next.name || "PRÓXIMA FECHA");
    setText("#nextRaceHeroCircuit", next.circuit || "Circuito a confirmar");
    setText("#nextRaceHeroDate", formatRaceDate(next.date));
    setText("#nextBroadcastStatus", `PRÓXIMA TRANSMISIÓN · ${formatRaceDate(next.date)}`);
    setText("#nextRaceCardName", next.country || next.name || "Próxima fecha");
    setText("#nextRaceCardCircuit", next.circuit || "Circuito a confirmar");
    setText("#nextRaceCardDate", formatRaceDate(next.date, false));
    setImage("#nextRaceHeroTrack", next.trackAsset, `Trazado de ${next.country || next.name}`);
    setImage("#nextRaceCardTrackImg", next.trackAsset, `Trazado de ${next.country || next.name}`);

    const leaders = computeLeaders(championship).slice(0, 3);
    const host = $("#leadersSummary");
    if (host) {
      host.replaceChildren(...leaders.map((driver, index) => {
        const item = document.createElement("li");
        const label = document.createElement("span");
        const points = document.createElement("b");
        label.textContent = `${index + 1}  ${shortDriverName(driver.name)}`;
        points.textContent = String(driver.points);
        item.append(label, points);
        return item;
      }));
    }
  }

  function initCarousel() {
    const carousel = $("#homeCarousel");
    if (!carousel) return;
    const slides = $$(".carouselSlide", carousel);
    const tabs = $$('[data-carousel-go]', carousel);
    const labels = ["Resumen de la última carrera", "Próxima fecha", "Transmisión en YouTube", "Inscripción"];
    let current = Math.max(0, slides.findIndex((slide) => slide.classList.contains("isActive")));
    let timer = null;

    function show(index, restart = true) {
      current = (index + slides.length) % slides.length;
      slides.forEach((slide, slideIndex) => {
        const active = slideIndex === current;
        slide.classList.toggle("isActive", active);
        slide.setAttribute("aria-hidden", active ? "false" : "true");
      });
      tabs.forEach((tab, tabIndex) => {
        const active = tabIndex === current;
        tab.classList.toggle("isActive", active);
        tab.setAttribute("aria-selected", active ? "true" : "false");
        const number = tab.querySelector("small");
        if (number) number.textContent = `${String(tabIndex + 1).padStart(2, "0")}${active ? " · ACTIVO" : ""}`;
      });
      setText("#carouselStatus", labels[current]);
      if (restart) startTimer();
    }

    function startTimer() {
      window.clearInterval(timer);
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      timer = window.setInterval(() => show(current + 1, false), 9000);
    }

    tabs.forEach((tab) => tab.addEventListener("click", () => show(Number(tab.dataset.carouselGo))));
    $("[data-carousel-next]", carousel)?.addEventListener("click", () => show(current + 1));
    carousel.addEventListener("mouseenter", () => window.clearInterval(timer));
    carousel.addEventListener("mouseleave", startTimer);
    carousel.addEventListener("focusin", () => window.clearInterval(timer));
    carousel.addEventListener("focusout", startTimer);

    let pointerStart = null;
    carousel.addEventListener("pointerdown", (event) => { pointerStart = event.clientX; });
    carousel.addEventListener("pointerup", (event) => {
      if (pointerStart === null) return;
      const delta = event.clientX - pointerStart;
      pointerStart = null;
      if (Math.abs(delta) > 55) show(current + (delta < 0 ? 1 : -1));
    });

    show(current);
  }

  function initStandingsControls() {
    const card = $("#standingsCard");
    const toggle = $("#standingsToggle");
    if (card && toggle) {
      toggle.addEventListener("click", () => {
        const expanded = card.classList.toggle("isExpanded");
        toggle.setAttribute("aria-expanded", expanded ? "true" : "false");
        toggle.innerHTML = expanded ? 'MOSTRAR PODIO <span aria-hidden="true">↑</span>' : 'VER TABLA COMPLETA <span aria-hidden="true">→</span>';
      });
    }

    const root = $("#standingsTabs");
    if (!root) return;
    const buttons = $$(".tabBtn", root);
    const panels = $$(".tabPanel", root);

    function setTab(tab) {
      buttons.forEach((button) => {
        const active = button.dataset.tab === tab;
        button.classList.toggle("isActive", active);
        button.setAttribute("aria-selected", active ? "true" : "false");
        button.tabIndex = active ? 0 : -1;
      });
      panels.forEach((panel) => panel.classList.toggle("isActive", panel.dataset.panel === tab));
      try { localStorage.setItem("standingsTab", tab); } catch (_) {}
    }

    buttons.forEach((button) => button.addEventListener("click", () => setTab(button.dataset.tab)));
    root.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
      const currentButton = document.activeElement?.closest?.(".tabBtn");
      if (!currentButton) return;
      event.preventDefault();
      const index = buttons.indexOf(currentButton);
      const nextIndex = event.key === "ArrowRight" ? (index + 1) % buttons.length : (index - 1 + buttons.length) % buttons.length;
      buttons[nextIndex].focus();
      setTab(buttons[nextIndex].dataset.tab);
    });

    let initial = "pilotos";
    try {
      const saved = localStorage.getItem("standingsTab");
      if (["pilotos", "equipos"].includes(saved)) initial = saved;
    } catch (_) {}
    setTab(initial);
  }

  function imageExists(path) {
    return new Promise((resolve) => {
      const probe = new Image();
      let settled = false;
      const finish = (found) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeout);
        resolve(found);
      };
      const timeout = window.setTimeout(() => finish(false), 4000);
      probe.onload = () => finish(true);
      probe.onerror = () => finish(false);
      const cacheKey = `mag=${Date.now()}`;
      probe.src = window.location?.protocol === "file:" ? path : `${path}${path.includes("?") ? "&" : "?"}${cacheKey}`;
    });
  }

  async function discoverMagazinePages(config) {
    const pages = [];
    const maxPages = Math.max(1, Number(config.maxPages) || 60);
    const extensions = config.extensions || ["webp", "png", "jpg", "jpeg", "svg"];

    for (let index = 1; index <= maxPages; index += 1) {
      let found = null;
      for (const extension of extensions) {
        const path = `${config.directory}/${config.prefix}${index}.${extension}`;
        if (await imageExists(path)) {
          found = path;
          break;
        }
      }
      if (!found) break;
      pages.push(found);
    }
    return pages.length ? pages : (config.fallbackPages || []);
  }

  async function initMagazine(site) {
    const viewer = $("#magazineViewer");
    if (!viewer) return;
    const config = site?.magazine || {};
    const pages = await discoverMagazinePages(config);
    const left = $("#magazinePageLeft");
    const right = $("#magazinePageRight");
    const spread = $("[data-mag-spread]", viewer);
    const viewport = $("[data-mag-viewport]", viewer);
    const fullscreenTarget = viewer.closest(".magazineSection") || viewer;
    const fullscreenButton = $("[data-mag-fullscreen]");
    const zoomOutButton = $("[data-mag-zoom-out]");
    const zoomInButton = $("[data-mag-zoom-in]");
    const zoomResetButton = $("[data-mag-zoom-reset]");
    const mobileQuery = window.matchMedia("(max-width: 720px)");
    let cursor = 0;
    let zoom = 1;
    const zoomMin = 1;
    const zoomMax = 3;
    const zoomStep = .25;

    function setZoom(nextZoom, preserveCenter = true) {
      if (!spread || !viewport) return;
      const previousWidth = Math.max(1, viewport.scrollWidth);
      const previousHeight = Math.max(1, viewport.scrollHeight);
      const centerX = (viewport.scrollLeft + viewport.clientWidth / 2) / previousWidth;
      const centerY = (viewport.scrollTop + viewport.clientHeight / 2) / previousHeight;
      zoom = Math.min(zoomMax, Math.max(zoomMin, Math.round(nextZoom * 100) / 100));
      spread.style.width = `${Math.round(zoom * 100)}%`;
      spread.style.marginInline = zoom === 1 ? "auto" : "0";
      setText("#magazineZoomValue", `${Math.round(zoom * 100)}%`);
      zoomOutButton?.toggleAttribute("disabled", zoom <= zoomMin);
      zoomInButton?.toggleAttribute("disabled", zoom >= zoomMax);
      zoomResetButton?.toggleAttribute("disabled", zoom === zoomMin);

      window.requestAnimationFrame(() => {
        if (!preserveCenter || zoom === 1) {
          viewport.scrollTo({ left: 0, top: 0 });
          return;
        }
        viewport.scrollTo({
          left: Math.max(0, centerX * viewport.scrollWidth - viewport.clientWidth / 2),
          top: Math.max(0, centerY * viewport.scrollHeight - viewport.clientHeight / 2)
        });
      });
    }

    function render() {
      const mobile = mobileQuery.matches;
      const leftIndex = cursor;
      const rightIndex = mobile ? -1 : leftIndex + 1;
      if (left) {
        left.src = pages[leftIndex] || "";
        left.hidden = !pages[leftIndex];
        left.alt = pages[leftIndex] ? `Página ${leftIndex + 1} de la revista` : "";
      }
      if (right) {
        right.src = pages[rightIndex] || "";
        right.hidden = !pages[rightIndex];
        right.alt = pages[rightIndex] ? `Página ${rightIndex + 1} de la revista` : "";
      }
      const shown = rightIndex >= 0 && pages[rightIndex] ? `${leftIndex + 1}–${rightIndex + 1}` : `${leftIndex + 1}`;
      setText("#magazineStatus", pages.length ? `PÁGINAS ${shown} DE ${pages.length}` : "SIN PÁGINAS PUBLICADAS");
      $("[data-mag-prev]")?.toggleAttribute("disabled", cursor === 0);
      const nextCursor = cursor + (mobile ? 1 : 2);
      $("[data-mag-next]")?.toggleAttribute("disabled", nextCursor >= pages.length);
    }

    function move(direction) {
      const step = mobileQuery.matches ? 1 : 2;
      const maxCursor = mobileQuery.matches ? Math.max(0, pages.length - 1) : Math.max(0, Math.floor((pages.length - 1) / 2) * 2);
      cursor = Math.min(maxCursor, Math.max(0, cursor + direction * step));
      setZoom(1, false);
      render();
    }

    $("[data-mag-prev]")?.addEventListener("click", () => move(-1));
    $("[data-mag-next]")?.addEventListener("click", () => move(1));
    zoomOutButton?.addEventListener("click", () => setZoom(zoom - zoomStep));
    zoomInButton?.addEventListener("click", () => setZoom(zoom + zoomStep));
    zoomResetButton?.addEventListener("click", () => setZoom(1, false));
    fullscreenButton?.addEventListener("click", async () => {
      try {
        if (document.fullscreenElement) await document.exitFullscreen();
        else await fullscreenTarget.requestFullscreen();
      } catch (_) {}
    });
    document.addEventListener("fullscreenchange", () => {
      if (!fullscreenButton) return;
      fullscreenButton.textContent = document.fullscreenElement === fullscreenTarget ? "SALIR DE PANTALLA COMPLETA" : "PANTALLA COMPLETA";
    });
    viewer.addEventListener("keydown", (event) => {
      if (event.key === "ArrowLeft") move(-1);
      if (event.key === "ArrowRight") move(1);
      if (["+", "="].includes(event.key)) {
        event.preventDefault();
        setZoom(zoom + zoomStep);
      }
      if (event.key === "-") {
        event.preventDefault();
        setZoom(zoom - zoomStep);
      }
      if (event.key === "0") {
        event.preventDefault();
        setZoom(1, false);
      }
    });
    viewport?.addEventListener("wheel", (event) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      setZoom(zoom + (event.deltaY < 0 ? zoomStep : -zoomStep));
    }, { passive: false });
    viewport?.addEventListener("dblclick", () => setZoom(zoom === 1 ? 1.75 : 1));
    let start = null;
    viewer.addEventListener("pointerdown", (event) => {
      if (zoom > 1 || event.target.closest?.("button")) return;
      start = event.clientX;
    });
    viewer.addEventListener("pointerup", (event) => {
      if (start === null) return;
      const delta = event.clientX - start;
      start = null;
      if (Math.abs(delta) > 55) move(delta < 0 ? 1 : -1);
    });
    mobileQuery.addEventListener?.("change", () => {
      if (!mobileQuery.matches) cursor = Math.floor(cursor / 2) * 2;
      setZoom(1, false);
      render();
    });
    setZoom(1, false);
    render();
  }

  async function main() {
    const snapshot = window.ASSETTO_F1_SNAPSHOT || {};
    const [siteResult, championshipResult] = await Promise.allSettled([
      loadJson("data/site.json", snapshot.site),
      loadJson("data/championship.json", snapshot.championship)
    ]);
    const site = siteResult.status === "fulfilled" ? siteResult.value : {};
    const championship = championshipResult.status === "fulfilled" ? championshipResult.value : {};
    if (siteResult.status === "rejected") console.warn("Configuración de portada:", siteResult.reason);
    if (championshipResult.status === "rejected") console.warn("Datos del campeonato:", championshipResult.reason);

    window.assettoF1SiteConfig = site;
    hydrateLinks(site);
    hydrateSiteText(site);
    hydrateMedia(site);
    hydrateRaceSummary(site, championship);
    initCarousel();
    initStandingsControls();
    initMagazine(site);
  }

  main();
})();
