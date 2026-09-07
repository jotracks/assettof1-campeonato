(() => {
  "use strict";

  async function loadConfig() {
    try {
      const response = await fetch("data/site.json", { cache: "no-store" });
      if (!response.ok) throw new Error("No se pudo cargar la configuración de inscripción");
      return response.json();
    } catch (error) {
      if (window.ASSETTO_F1_SNAPSHOT?.site) return window.ASSETTO_F1_SNAPSHOT.site;
      throw error;
    }
  }

  function fallbackCopy(value) {
    const input = document.createElement("textarea");
    input.value = value;
    input.style.position = "fixed";
    input.style.opacity = "0";
    document.body.appendChild(input);
    input.select();
    document.execCommand("copy");
    input.remove();
  }

  function buildWhatsAppUrl(registration, promotionActive) {
    if (registration.whatsappProofUrl) return registration.whatsappProofUrl;
    const number = String(registration.whatsappNumber || "").replace(/\D/g, "");
    if (!number) return "";
    const message = promotionActive
      ? registration.promotion?.whatsappMessage || "Hola Jota, quiero inscribirme a Assetto F1.\n\nNombre y apellido:\nSteam ID:"
      : registration.whatsappMessage || "Hola Jota, me inscribí para Assetto F1.\n\nNombre y apellido:\nSteam ID:\n\nAdjunto el comprobante.";
    return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
  }

  function hydrateLinks(site) {
    const links = {
      server: site?.links?.server,
      youtube: site?.links?.youtube,
      instagram: site?.links?.instagram
    };

    Object.entries(links).forEach(([key, href]) => {
      if (!href) return;
      document.querySelectorAll(`[data-link="${key}"]`).forEach((anchor) => { anchor.href = href; });
    });
  }

  function renderGeneratedQr(host, value) {
    if (!host || !value || !window.QRCode) return;
    host.replaceChildren();
    new window.QRCode(host, {
      text: value,
      width: 220,
      height: 220,
      colorDark: "#0a0a0c",
      colorLight: "#ffffff",
      correctLevel: window.QRCode.CorrectLevel.M
    });
  }

  function renderQr(host, value, asset) {
    if (!host || !value) return;
    if (!asset) {
      renderGeneratedQr(host, value);
      return;
    }

    host.replaceChildren();
    const link = document.createElement("a");
    link.href = value;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.setAttribute("aria-label", "Abrir el enlace de pago de Mercado Pago");

    const image = document.createElement("img");
    image.src = asset;
    image.alt = "Código QR para pagar la inscripción con Mercado Pago";
    image.width = 220;
    image.height = 220;
    image.addEventListener("error", () => renderGeneratedQr(host, value), { once: true });
    link.appendChild(image);
    host.appendChild(link);
  }

  async function main() {
    const priceNodes = document.querySelectorAll("[data-registration-price]");
    const raceNodes = document.querySelectorAll("[data-registration-races]");
    const capacityNodes = document.querySelectorAll("[data-registration-capacity]");
    const availableNodes = document.querySelectorAll("[data-registration-available]");
    const seasonNodes = document.querySelectorAll("[data-site-season]");
    const aliasNode = document.getElementById("paymentAlias");
    const paymentButton = document.getElementById("paymentButton");
    const copyButton = document.getElementById("copyAliasButton");
    const proofButton = document.getElementById("proofButton");
    const proofButtonLabel = document.getElementById("proofButtonLabel");
    const proofRequirement = document.getElementById("proofRequirement");
    const statusNode = document.getElementById("registrationStatus");
    const introNode = document.getElementById("registrationIntro");
    const heroButton = document.getElementById("registrationHeroButton");
    const heroCtaNode = document.querySelector("[data-registration-hero-cta]");
    const checkoutEyebrow = document.getElementById("checkoutEyebrow");
    const checkoutTitle = document.getElementById("checkoutTitle");
    const confirmStepLabel = document.getElementById("confirmStepLabel");
    const confirmTitle = document.getElementById("confirmTitle");
    const confirmIntro = document.getElementById("confirmIntro");
    const availabilityNode = document.getElementById("registrationAvailability");
    const capacityBar = document.getElementById("registrationCapacityBar");
    const qrHost = document.getElementById("paymentQr");
    let alias = "JOTRACKS";

    try {
      const site = await loadConfig();
      const registration = site.registration || {};
      const totalSlots = Math.max(1, Number(registration.totalSlots) || 20);
      const availableSlots = Math.min(totalSlots, Math.max(0, Number(registration.availableSlots ?? totalSlots)));
      const isOpen = registration.open !== false && availableSlots > 0;
      const promotion = registration.promotion || {};
      const promotionActive = promotion.active === true && isOpen;
      const paymentUrl = registration.paymentUrl || "";
      const whatsAppUrl = buildWhatsAppUrl(registration, promotionActive);
      alias = registration.paymentAlias || alias;

      hydrateLinks(site);
      document.body.classList.toggle("registrationPromoActive", promotionActive);
      document.querySelectorAll("[data-registration-promo]").forEach((node) => { node.hidden = !promotionActive; });
      document.querySelectorAll("[data-registration-promo-title]").forEach((node) => {
        node.textContent = promotion.title || "INSCRIPCIÓN GRATIS";
      });
      document.querySelectorAll("[data-registration-promo-subtitle]").forEach((node) => {
        node.textContent = promotion.subtitle || "POR TIEMPO LIMITADO";
      });
      seasonNodes.forEach((node) => { node.textContent = site.seasonLabel || "TEMPORADA 2026"; });
      priceNodes.forEach((node) => {
        node.textContent = promotionActive ? (promotion.priceLabel || "GRATIS") : (registration.price || "$15.000 ARS");
      });
      raceNodes.forEach((node) => { node.textContent = String(Number(registration.races) || 6); });
      capacityNodes.forEach((node) => { node.textContent = String(totalSlots); });
      availableNodes.forEach((node) => { node.textContent = String(availableSlots); });
      if (aliasNode) aliasNode.textContent = alias;

      if (capacityBar) capacityBar.style.width = `${(availableSlots / totalSlots) * 100}%`;
      if (availabilityNode) availabilityNode.classList.toggle("isClosed", !isOpen);
      if (statusNode) statusNode.textContent = promotionActive ? "INSCRIPCIÓN GRATIS" : (isOpen ? "INSCRIPCIONES ABIERTAS" : "CUPOS COMPLETOS");
      document.body.classList.toggle("registrationClosed", !isOpen);

      if (introNode) {
        introNode.textContent = promotionActive
          ? "Gratis por tiempo limitado. Necesitás nombre, apellido y Steam ID."
          : "La inscripción incluye las seis carreras. Necesitás nombre, apellido y Steam ID.";
      }
      if (heroButton) heroButton.href = promotionActive ? "#comprobante" : "#pago";
      if (heroCtaNode) heroCtaNode.textContent = promotionActive ? (promotion.ctaLabel || "INSCRIBITE GRATIS") : "PAGAR INSCRIPCIÓN";
      if (checkoutEyebrow) checkoutEyebrow.textContent = promotionActive ? "INSCRIPCIÓN" : "PAGO Y CONFIRMACIÓN";
      if (checkoutTitle) checkoutTitle.textContent = promotionActive ? "RESERVÁ TU LUGAR" : "PAGÁ Y ENVIÁ EL COMPROBANTE";
      if (confirmStepLabel) confirmStepLabel.textContent = promotionActive ? "01 · WHATSAPP" : "02 · WHATSAPP";
      if (confirmTitle) confirmTitle.textContent = promotionActive ? "CONFIRMÁ TU INSCRIPCIÓN" : "ENVIÁ EL COMPROBANTE";
      if (confirmIntro) confirmIntro.textContent = "Mandá estos datos:";
      if (proofRequirement) proofRequirement.hidden = promotionActive;
      if (proofButtonLabel) proofButtonLabel.textContent = promotionActive ? "INSCRIBIRME POR WHATSAPP" : "ABRIR WHATSAPP";

      if (paymentButton) {
        if (promotionActive) {
          paymentButton.removeAttribute("href");
          paymentButton.setAttribute("aria-disabled", "true");
          paymentButton.classList.add("isDisabled");
          paymentButton.textContent = "PROMOCIÓN ACTIVA";
        } else if (isOpen && paymentUrl) {
          paymentButton.href = paymentUrl;
          paymentButton.removeAttribute("aria-disabled");
          paymentButton.classList.remove("isDisabled");
          paymentButton.innerHTML = 'PAGAR CON MERCADO PAGO <span aria-hidden="true">→</span>';
        } else {
          paymentButton.removeAttribute("href");
          paymentButton.setAttribute("aria-disabled", "true");
          paymentButton.classList.add("isDisabled");
          paymentButton.textContent = "CUPOS COMPLETOS";
        }
      }

      if (promotionActive && qrHost) qrHost.replaceChildren();
      else if (isOpen) renderQr(qrHost, paymentUrl, registration.paymentQrAsset);
      else if (qrHost) qrHost.innerHTML = '<span class="registrationQrClosed">SIN CUPOS</span>';

      if (copyButton) {
        copyButton.disabled = promotionActive;
        copyButton.setAttribute("aria-hidden", promotionActive ? "true" : "false");
      }

      if (proofButton && whatsAppUrl) {
        proofButton.href = whatsAppUrl;
        proofButton.target = "_blank";
        proofButton.rel = "noopener noreferrer";
        proofButton.hidden = false;
      }
    } catch (error) {
      console.warn(error);
    }

    copyButton?.addEventListener("click", async () => {
      try {
        if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(alias);
        else fallbackCopy(alias);
        copyButton.textContent = "ALIAS COPIADO";
        window.setTimeout(() => { copyButton.textContent = "COPIAR"; }, 1800);
      } catch (_) {
        fallbackCopy(alias);
      }
    });

    paymentButton?.addEventListener("click", (event) => {
      if (paymentButton.getAttribute("aria-disabled") === "true") event.preventDefault();
    });
  }

  main();
})();
