const $ = (id) => document.getElementById(id);
const state = {
  runs: [],
  run: null,
  entities: [],
  evidence: [],
  sources: [],
  report: null,
  mediaManifest: null,
  shown: 20,
  timer: 0,
  selectedEntity: "",
  activeView: "grid",
  searchKeyword: "",
  snapshotMode: false
};

const labels = {
  positive: "Positif",
  negative: "Negatif",
  neutral: "Netral",
  mixed: "Campuran",
  unclear: "Belum jelas"
};

const kindLabels = {
  customer_review: "Ulasan pelanggan",
  customer_comment: "Komentar pelanggan",
  owner_content: "Konten pemilik",
  editorial: "Artikel",
  search_snippet: "Cuplikan pencarian"
};

const statusLabels = {
  queued: "Dalam antrean",
  running: "Sedang berjalan",
  completed: "Selesai",
  partial: "Parsial",
  failed: "Gagal",
  ok: "Tersedia (100% OK)",
  blocked: "Diblokir",
  not_found: "Tidak ditemukan",
  unsupported: "Tidak didukung",
  limit: "Batas riset",
  pending: "Menunggu"
};

const fmt = new Intl.NumberFormat("id-ID");

function node(tag, text, className) {
  const item = document.createElement(tag);
  if (text !== undefined && text !== null) item.textContent = text;
  if (className) item.className = className;
  return item;
}

function cell(text, className) {
  return node("td", text, className);
}

function emptyRow(body, columns, message) {
  const row = document.createElement("tr");
  const item = cell(message, "empty-cell");
  item.colSpan = columns;
  row.append(item);
  body.replaceChildren(row);
}

function setRows(id, rows, columns, empty) {
  const body = $(id);
  if (!body) return;
  body.replaceChildren();
  if (!rows.length) {
    emptyRow(body, columns, empty);
    return;
  }
  rows.forEach((row) => body.append(row));
}

function safeLink(url, text, className) {
  const link = node("a", text, className);
  try {
    const parsed = new URL(url, location.origin);
    if (!["https:", "http:"].includes(parsed.protocol)) return node("span", text, className);
    link.href = parsed.href;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
  } catch {
    return node("span", text, className);
  }
  return link;
}

async function api(path, options) {
  const response = await fetch(path, options);
  const body = await response.json().catch(() => ({}));
  if (response.status === 401 && state.snapshotMode) showLogin(body.detail || "Silakan login kembali");
  if (!response.ok) throw new Error(body.detail || `Permintaan gagal (${response.status})`);
  return body;
}

function showLogin(message = "") {
  $("login-view").hidden = false;
  $("app-shell").hidden = true;
  const error = $("login-error");
  error.textContent = message;
  error.hidden = !message;
  $("login-password").focus();
}

async function enterSnapshot() {
  $("login-view").hidden = true;
  $("app-shell").hidden = false;
  $("job-select").hidden = true;
  $("refresh-button").hidden = true;
  $("logout-button").hidden = false;
  $("status-text").textContent = "Snapshot riset baca-saja · data diperbarui dari proses lokal.";
  await Promise.all([loadRuns(), loadMediaAssets()]);
  switchMainView("grid");
}

function nameOf(id) {
  return state.entities.find((entity) => entity.id === id)?.name || id;
}

function hostOf(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function dateLabel(value) {
  if (!value) return "Tanggal tidak diketahui";
  const date = new Date(value);
  return Number.isNaN(date.valueOf())
    ? value
    : new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeZone: "Asia/Jakarta" }).format(date);
}

function dateTimeLabel(value) {
  if (!value) return "Tanggal tidak diketahui";
  const date = new Date(value);
  return Number.isNaN(date.valueOf())
    ? value
    : `${new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(date)} WIB`;
}

function evidenceHref(id) {
  return `#evidence-${encodeURIComponent(id)}`;
}

function citationButton(id) {
  const ev = state.evidence.find((item) => item.id === id);
  const targetUrl = ev?.url || (ev?.source_id ? state.sources.find((s) => s.id === ev.source_id)?.url : "");
  if (targetUrl) {
    const link = safeLink(targetUrl, `Bukti ${id.slice(-6)} ↗`, "citation citation-link");
    link.title = `Buka link bukti publik langsung (${hostOf(targetUrl)})`;
    return link;
  }
  return node("span", `Bukti ${id.slice(-6)}`, "citation");
}

/* View Switching */
function switchMainView(viewName) {
  state.activeView = viewName;
  const views = ["grid", "feed", "network", "analytics", "media"];
  views.forEach((v) => {
    const el = $(`view-${v}`);
    if (el) el.hidden = v !== viewName;
    const btn = $(`btn${v.charAt(0).toUpperCase() + v.slice(1)}`);
    if (btn) btn.classList.toggle("active", v === viewName);
  });
  if ($("view-evidence")) $("view-evidence").hidden = true;
  if (viewName === "network") {
    requestAnimationFrame(drawEcosystemGraph);
  }
  if (viewName === "feed") {
    renderCommentFeed();
  }
}

/* Pemetaan Aset Media Berdasarkan Unit Bisnis */
function getFilteredAssets(entityId) {
  if (!state.mediaManifest?.assets) return [];
  const assets = state.mediaManifest.assets;
  if (!entityId || entityId === "all-internal") return assets;

  if (entityId === "business") {
    return assets.filter(
      (a) => a.entity_id === "business" || (a.outlet && a.outlet.startsWith("sanghyang_resort"))
    );
  }
  if (entityId === "dragon-beach-club") {
    return assets.filter(
      (a) => a.entity_id === "dragon-beach-club" || (a.outlet && a.outlet.startsWith("dragon_beach_club"))
    );
  }
  if (entityId === "sunset-grill") {
    return assets.filter(
      (a) => a.entity_id === "sunset-grill" || (a.outlet && a.outlet.startsWith("sunset_grill"))
    );
  }
  if (entityId === "dbistro") {
    return assets.filter(
      (a) => a.entity_id === "dbistro" || (a.outlet && a.outlet.startsWith("dbistro"))
    );
  }
  if (entityId === "dspa") {
    const spaKeywords = ["spa", "hot spring", "air panas", "belerang", "massage", "relax", "terapi", "kolam"];
    return assets.filter(
      (a) =>
        spaKeywords.some((k) => (a.description || "").toLowerCase().includes(k)) ||
        (a.filename || "").toLowerCase().includes("spa")
    );
  }
  if (entityId === "dbar") {
    const barKeywords = ["bar", "karaoke", "night", "lounge", "music", "dj", "drink", "cocktail", "mocktail"];
    return assets.filter(
      (a) =>
        barKeywords.some((k) => (a.description || "").toLowerCase().includes(k)) ||
        (a.filename || "").toLowerCase().includes("bar")
    );
  }
  return assets;
}

/* RENDERING FEED KOMENTAR & ULASAN NETIZEN (INSTAGRAM, TIKTOK, OTA) */
function renderCommentFeed() {
  const container = $("commentFeedGrid");
  if (!container) return;
  container.replaceChildren();

  const category = $("feed-filter-category")?.value || "";
  const sentiment = $("feed-filter-sentiment") ? $("feed-filter-sentiment").value : "";
  const platform = $("feed-filter-platform") ? $("feed-filter-platform").value : "";
  const keyword = (state.searchKeyword || "").toLowerCase().trim();

  // Hanya saring ulasan/komentar konsumen bertanggal (tanpa konten promosi pemilik/owner_content)
  const items = state.evidence.filter((item) => {
    if (!item.kind || !item.kind.startsWith("customer_")) return false;
    if (!item.in_window) return false;
    if (!category || item.entity_id !== category) return false;

    // Filter Sentimen
    if (sentiment && item.sentiment !== sentiment) return false;

    // Filter Platform
    if (platform && item.platform !== platform) return false;

    // Filter Keyword
    if (keyword) {
      const haystack = (item.text + " " + item.quote + " " + nameOf(item.entity_id) + " " + item.platform).toLowerCase();
      if (!haystack.includes(keyword)) return false;
    }

    return true;
  });

  const countBadge = $("feed-count-badge");
  if (countBadge) {
    const selected = state.entities.find((entity) => entity.id === category);
    countBadge.textContent = `${fmt.format(items.length)} opini terverifikasi · ${selected?.name || "Pilih unit atau kompetitor"}`;
  }

  if (!items.length) {
    const empty = node("p", "Tidak ada komentar atau ulasan pelanggan yang sesuai dengan filter yang dipilih.", "empty-content");
    container.append(empty);
    return;
  }

  items.forEach((item) => {
    const card = node("div", undefined, "comment-card");

    // Header kartu: Platform pill, Entity Name, Sentiment Badge
    const header = node("div", undefined, "comment-header");
    const authorWrap = node("div", undefined, "comment-author-wrap");

    let platformClass = "platform-traveloka";
    let platformIcon = "✈️";
    const plLower = (item.platform || "").toLowerCase();
    if (plLower.includes("instagram")) {
      platformClass = "platform-instagram";
      platformIcon = "📷";
    } else if (plLower.includes("tiktok")) {
      platformClass = "platform-tiktok";
      platformIcon = "🎵";
    } else if (plLower.includes("agoda")) {
      platformClass = "platform-agoda";
      platformIcon = "🏨";
    } else if (plLower.includes("booking")) {
      platformClass = "platform-booking";
      platformIcon = "🛏️";
    } else if (plLower.includes("tiket")) {
      platformClass = "platform-tiket";
      platformIcon = "🎫";
    } else if (plLower.includes("trip.com")) {
      platformClass = "platform-trip";
      platformIcon = "🌐";
    } else if (plLower.includes("tripadvisor")) {
      platformClass = "platform-tripadvisor";
      platformIcon = "🦉";
    } else if (plLower.includes("google")) {
      platformClass = "platform-google";
      platformIcon = "📍";
    } else if (plLower.includes("facebook")) {
      platformClass = "platform-facebook";
      platformIcon = "📘";
    } else if (plLower.includes("youtube")) {
      platformClass = "platform-youtube";
      platformIcon = "▶️";
    }

    const platformPill = node("span", `${platformIcon} ${item.platform}`, `comment-platform-pill ${platformClass}`);
    const entityTitle = node("span", nameOf(item.entity_id), "comment-entity-title");
    authorWrap.append(platformPill, entityTitle);

    const sentLabel = labels[item.sentiment] || item.sentiment;
    const sentBadge = node("span", sentLabel, `comment-sentiment-badge badge-sentiment-${item.sentiment}`);
    header.append(authorWrap, sentBadge);

    // Quote Box
    const quote = node("blockquote", `"${item.quote}"`, "comment-quote");

    // Full text
    const fullText = node("p", item.text, "comment-full-text");

    card.append(header, quote, fullText);

    // Aspects chips
    if (item.aspects && item.aspects.length) {
      const aspectsRow = node("div", undefined, "comment-aspects-row");
      item.aspects.forEach((asp) => {
        const isPositive = asp.sentiment === "positive";
        const chip = node(
          "span",
          `${asp.name}: ${labels[asp.sentiment] || asp.sentiment}`,
          `comment-aspect-chip ${isPositive ? "pro" : "con"}`
        );
        aspectsRow.append(chip);
      });
      card.append(aspectsRow);
    }

    // Footer: Tanggal, Flag otentik, Link Bukti
    const footer = node("div", undefined, "comment-footer");
    const authFlag = node("span", "✅ Ulasan Konsumen Publik", "comment-auth-flag");
    const dateText = node("span", dateLabel(item.published_at));
    const citeBtn = citationButton(item.id);

    footer.append(authFlag, dateText, citeBtn);
    card.append(footer);

    container.append(card);
  });
}

/* Render Laporan & Rekomendasi */
function renderFindings(container, findings, limit = 0) {
  if (!container) return;
  container.replaceChildren();
  const rows = limit ? findings.slice(0, limit) : findings;
  if (!rows.length) {
    container.append(node("p", "Belum ada rekomendasi berbasis opini pelanggan dalam periode.", "empty-content"));
    return;
  }
  rows.forEach((finding) => {
    const article = node("article", undefined, "summary-finding");
    article.append(node("h3", finding.title));
    article.append(node("p", `${nameOf(finding.entity_id)} · ${finding.rationale}`));
    const refs = node("div", undefined, "citations");
    finding.evidence_ids.forEach((id) => refs.append(citationButton(id)));
    article.append(refs);
    container.append(article);
  });
}

function renderReport() {
  const report = state.report;
  const selectedEntity = state.selectedEntity;
  const summary = $("report-summary");
  if (summary) {
    if (report?.summary && !selectedEntity) {
      summary.textContent = report.summary;
      summary.hidden = false;
    } else {
      summary.hidden = true;
    }
  }

  const findings = report?.findings || [];
  renderFindings(
    $("summary-improve"),
    findings.filter((item) => item.action === "improve" && (!selectedEntity || item.entity_id === selectedEntity)),
    3
  );
  renderFindings(
    $("summary-maintain"),
    findings.filter((item) => item.action === "maintain" && (!selectedEntity || item.entity_id === selectedEntity)),
    3
  );

  const filterAction = $("finding-action") ? $("finding-action").value : "";
  const selected = findings.filter(
    (item) => (!filterAction || item.action === filterAction) && (!selectedEntity || item.entity_id === selectedEntity)
  );

  const list = $("findings");
  if (list) {
    list.replaceChildren();
    if (!selected.length) {
      list.append(node("p", "Belum ada tindakan yang tervalidasi dengan bukti dalam periode.", "empty-content"));
    }
    selected.forEach((finding) => {
      const article = node("article", undefined, "detail-item");
      const meta = node("div", undefined, "item-meta");
      meta.append(
        node("span", nameOf(finding.entity_id)),
        node("span", `Prioritas ${finding.priority}`),
        node(
          "span",
          finding.action === "improve"
            ? "Perlu diperbaiki"
            : finding.action === "maintain"
            ? "Perlu dipertahankan"
            : "Perlu ditelusuri",
          `action-label ${finding.action}`
        )
      );
      article.append(meta, node("h3", finding.title), node("p", finding.rationale));
      if (finding.steps?.length) {
        const steps = document.createElement("ol");
        finding.steps.forEach((step) => steps.append(node("li", step)));
        article.append(steps);
      }
      const refs = node("div", undefined, "citations");
      finding.evidence_ids.forEach((id) => refs.append(citationButton(id)));
      article.append(refs);
      list.append(article);
    });
  }
}

/* Helper SVG Bar untuk menghindari style inline CSP */
function createSvgBar(sharePercent, colorHex) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", "100%");
  svg.setAttribute("height", "10");
  svg.setAttribute("viewBox", "0 0 100 10");
  svg.setAttribute("preserveAspectRatio", "none");

  const bgRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  bgRect.setAttribute("width", "100");
  bgRect.setAttribute("height", "10");
  bgRect.setAttribute("rx", "3");
  bgRect.setAttribute("fill", "rgba(30, 41, 59, 0.7)");
  svg.append(bgRect);

  if (sharePercent > 0) {
    const fillRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    fillRect.setAttribute("width", String(sharePercent));
    fillRect.setAttribute("height", "10");
    fillRect.setAttribute("rx", "3");
    fillRect.setAttribute("fill", colorHex);
    svg.append(fillRect);
  }
  return svg;
}

const sentimentColors = {
  positive: "#10b981",
  negative: "#f43f5e",
  neutral: "#94a3b8",
  mixed: "#f59e0b",
  unclear: "#64748b"
};

/* Render Statistik & Sentimen */
function businessEntities() {
  return state.entities.filter((entity) => !entity.is_competitor);
}

function relatedCompetitors(entityId) {
  return state.entities.filter((entity) => entity.is_competitor && entity.comparator_for?.includes(entityId));
}

function syncFeedCategoryButton(value) {
  const selected = state.entities.find((entity) => entity.id === value);
  const category = selected?.is_competitor ? "competitor" : "internal";
  document.querySelectorAll(".feed-segment-btn[data-category]").forEach((button) => {
    button.classList.toggle("active", button.dataset.category === category);
  });
}

function customerEvidence(entityIds) {
  const ids = new Set(entityIds);
  return state.evidence.filter((item) => ids.has(item.entity_id) && item.in_window && item.kind.startsWith("customer_"));
}

function scopeIds(entityId = state.selectedEntity) {
  return entityId ? [entityId, ...relatedCompetitors(entityId).map((entity) => entity.id)] : businessEntities().map((entity) => entity.id);
}

function renderUnitSelectors() {
  const select = $("select-display-unit");
  if (select) {
    const current = state.selectedEntity;
    select.replaceChildren(new Option("Ringkasan portofolio", ""));
    const group = document.createElement("optgroup");
    group.label = "Unit bisnis";
    businessEntities().forEach((entity) => group.append(new Option(entity.name, entity.id)));
    select.append(group);
    select.value = current;
  }
  const nav = $("unit-selector-buttons");
  if (!nav) return;
  nav.replaceChildren();
  [{ id: "", name: "Semua unit" }, ...businessEntities().map((entity) => ({ id: entity.id, name: entity.name }))].forEach((item) => {
    const button = node("button", item.name, `chip${state.selectedEntity === item.id ? " active" : ""}`);
    button.type = "button";
    button.dataset.selectUnit = item.id;
    button.setAttribute("aria-pressed", String(state.selectedEntity === item.id));
    nav.append(button);
  });
}

function renderPortfolio() {
  const ids = businessEntities().map((entity) => entity.id);
  const evidence = customerEvidence(ids);
  const positive = evidence.filter((item) => item.sentiment === "positive").length;
  const negative = evidence.filter((item) => item.sentiment === "negative").length;
  if ($("portfolio-customer")) $("portfolio-customer").textContent = fmt.format(evidence.length);
  if ($("portfolio-positive")) $("portfolio-positive").textContent = `${evidence.length ? Math.round(positive / evidence.length * 100) : 0}%`;
  if ($("portfolio-negative")) $("portfolio-negative").textContent = `${evidence.length ? Math.round(negative / evidence.length * 100) : 0}%`;

  const stats = new Map((state.run?.stats?.entities || []).map((item) => [item.entity_id, item]));

  // 1. Render Unit Bisnis Kita (Sanghyang)
  const grid = $("unit-grid");
  if (grid) {
    grid.replaceChildren();
    businessEntities().forEach((entity) => {
      const row = stats.get(entity.id) || {};
      const total = row.total || 0;
      const button = node("button", undefined, "unit-card");
      button.type = "button";
      button.dataset.selectUnit = entity.id;
      button.append(
        node("span", entity.name, "unit-card-title"),
        node("span", entity.description || entity.kind, "unit-card-description"),
        node("span", `${fmt.format(total)} opini bertanggal`, "unit-card-sample")
      );
      const rates = node("span", undefined, "unit-card-rates");
      rates.append(
        node("span", `${total ? Math.round((row.positive || 0) / total * 100) : 0}% positif`, "positive-text"),
        node("span", `${total ? Math.round((row.negative || 0) / total * 100) : 0}% negatif`, "negative-text")
      );
      button.append(rates, node("span", `${relatedCompetitors(entity.id).length} kompetitor terkait`, "unit-card-competitors"));
      button.addEventListener("click", () => selectOutlet(entity.id));
      grid.append(button);
    });
    if (!businessEntities().length) {
      grid.append(node("p", "Riset ini belum memiliki unit bisnis. Muat riset lain atau mulai riset baru.", "empty-content"));
    }
  }

  // 2. Render Benchmark Kompetitor Pembanding Anyer
  const compGrid = $("competitor-grid");
  if (compGrid) {
    compGrid.replaceChildren();
    const competitors = state.entities.filter((e) => e.is_competitor);
    competitors.forEach((entity) => {
      const row = stats.get(entity.id) || {};
      const total = row.total || 0;
      const card = node("div", undefined, "unit-card competitor-card clickable-card");
      card.setAttribute("role", "button");
      card.setAttribute("tabindex", "0");
      card.setAttribute("aria-label", `Buka ulasan dan sentimen ${entity.name}`);
      card.append(
        node("span", entity.name, "unit-card-title"),
        node("span", entity.description || entity.kind.replaceAll("_", " "), "unit-card-description"),
        node("span", `${fmt.format(total)} opini bertanggal`, "unit-card-sample")
      );
      const rates = node("span", undefined, "unit-card-rates");
      rates.append(
        node("span", `${total ? Math.round((row.positive || 0) / total * 100) : 0}% positif`, "positive-text"),
        node("span", `${total ? Math.round((row.negative || 0) / total * 100) : 0}% negatif`, "negative-text")
      );
      const rel = entity.metadata?.relation || (entity.id.includes("lighthouse") ? "Pesaing langsung Nightlife Dragon" : "Kompetitor sepadan Anyer");
      card.append(rates, node("span", `⚔️ ${rel}`, "unit-card-competitors"));

      const openCompFeed = () => {
        const catSelect = $("feed-filter-category");
        if (catSelect) catSelect.value = entity.id;
        syncFeedCategoryButton(entity.id);
        switchMainView("feed");
      };

      const actionBtn = node("button", "Lihat Ulasan 💬", "secondary filter-comp-btn");
      actionBtn.type = "button";
      actionBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        openCompFeed();
      });
      card.append(actionBtn);

      card.addEventListener("click", () => openCompFeed());
      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openCompFeed();
        }
      });
      compGrid.append(card);
    });
    if (!competitors.length) {
      compGrid.append(node("p", "Tidak ada data kompetitor pada riset ini.", "empty-content"));
    }
  }
}

function renderOutletPills() {
  renderUnitSelectors();
  renderPortfolio();
  renderUnitDetail();
}

function selectOutlet(entityId) {
  const entity = state.entities.find((item) => item.id === entityId);
  state.selectedEntity = entityId && entity && !entity.is_competitor ? entityId : "";
  const feedCategory = $("feed-filter-category");
  if (feedCategory && state.selectedEntity) feedCategory.value = state.selectedEntity;
  syncFeedCategoryButton(feedCategory?.value || "");
  const exportSelect = $("export-unit-select");
  if (exportSelect) {
    exportSelect.value = state.selectedEntity || "";
    updateExportLinks();
  }
  if ($("filter-entity")) $("filter-entity").value = "";
  state.shown = 20;
  renderUnitSelectors();
  renderPortfolio();
  renderUnitDetail();
  renderCommentFeed();
  renderStats();
  renderReport();
  renderEvidence();
  renderMediaGallery(state.selectedEntity);
  renderMediaTabGallery(state.selectedEntity);
  if (state.activeView === "network") drawEcosystemGraph();
}

function renderUnitDetail() {
  const entity = state.entities.find((item) => item.id === state.selectedEntity);
  if ($("portfolio-overview")) $("portfolio-overview").hidden = Boolean(entity);
  if ($("entity-detail")) $("entity-detail").hidden = !entity;
  if (!entity) return;
  $("detail-title").textContent = entity.name;
  $("detail-kind").textContent = entity.kind.replaceAll("_", " ");
  $("detail-description").textContent = entity.description || "Deskripsi belum tersedia dari sumber riset.";
  $("detail-period").textContent = `Periode ulasan: ${dateLabel(state.run.start_at)} – ${dateLabel(state.run.end_at)} (${state.run.period_months} bulan)`;
  const evidence = customerEvidence([entity.id]);
  const positive = evidence.filter((item) => item.sentiment === "positive").length;
  const negative = evidence.filter((item) => item.sentiment === "negative").length;
  $("detail-customer").textContent = fmt.format(evidence.length);
  $("detail-positive").textContent = fmt.format(positive);
  $("detail-negative").textContent = fmt.format(negative);
  $("detail-positive-rate").textContent = `${evidence.length ? Math.round(positive / evidence.length * 100) : 0}% dari sampel`;
  $("detail-negative-rate").textContent = `${evidence.length ? Math.round(negative / evidence.length * 100) : 0}% dari sampel`;
  renderUnitTrend("unit-trend-chart", "unit-trend-note", [entity.id]);
  renderUnitFindings(entity.id);
  renderComparisons(entity.id);
  renderSources();
}

function renderUnitFindings(entityId) {
  const container = $("unit-findings");
  if (!container) return;
  container.replaceChildren();
  const findings = (state.report?.findings || []).filter((item) => item.entity_id === entityId);
  if (!findings.length) {
    container.append(node("p", "Belum ada rekomendasi yang didukung bukti pelanggan dalam periode.", "empty-content"));
    return;
  }
  findings.forEach((finding) => {
    const article = node("article", undefined, "detail-item");
    article.append(node("span", finding.action === "improve" ? "Perlu diperbaiki" : finding.action === "maintain" ? "Perlu dipertahankan" : "Perlu ditelusuri", `action-label ${finding.action}`));
    article.append(node("h4", finding.title), node("p", finding.rationale));
    if (finding.steps?.length) {
      const steps = document.createElement("ul");
      finding.steps.forEach((step) => steps.append(node("li", step)));
      article.append(steps);
    }
    const refs = node("div", undefined, "citations");
    finding.evidence_ids.forEach((id) => refs.append(citationButton(id)));
    article.append(refs);
    container.append(article);
  });
}

function renderComparisons(entityId) {
  const container = $("unit-comparisons");
  if (!container) return;
  container.replaceChildren();
  const related = relatedCompetitors(entityId);
  if (!related.length) {
    container.append(node("p", "Belum ada kompetitor yang dipetakan untuk unit ini.", "empty-content"));
    return;
  }

  const allComparisons = (state.report?.comparisons || []).filter((item) => item.entity_id === entityId);
  if (!allComparisons.length) {
    container.append(node("p", `Belum ada perbandingan berbukti antara ${nameOf(entityId)} dan kompetitor pembanding.`, "empty-content"));
    return;
  }

  const evidenceById = new Map(state.evidence.map((item) => [item.id, item]));
  const counts = new Map((state.run?.stats?.entities || []).map((item) => [item.entity_id, item.total || 0]));

  let renderedCount = 0;

  related.forEach((competitor, compIndex) => {
    const rows = allComparisons.filter((item) => item.competitor_id === competitor.id);
    if (!rows.length) return;

    renderedCount += rows.length;

    const groupWrapper = node("div", undefined, "comparison-competitor-group");

    // Header pembanding penanda kompetitor langsung
    const groupHeader = node("div", undefined, "comparison-group-banner");
    const groupLeft = node("div", undefined, "group-banner-left");
    groupLeft.append(
      node("span", `⚔️ KOMPETITOR PEMBANDING ${related.length > 1 ? `${compIndex + 1} DARI ${related.length}` : ""}`.trim(), "badge-competitor-tag"),
      node("strong", `Head-to-Head: ${nameOf(entityId)} vs ${competitor.name}`, "comparison-group-title")
    );
    groupHeader.append(groupLeft, node("span", competitor.description || "Kompetitor sepadan Anyer", "group-desc"));
    groupWrapper.append(groupHeader);

    rows.forEach((comparison) => {
      const article = node("article", undefined, "comparison-card comparison-aspect-card");
      const header = node("div", undefined, "comparison-card-header");
      header.append(node("h4", comparison.aspect));
      const advantageLabels = {
        entity: `${nameOf(entityId)} unggul`,
        competitor: `${competitor?.name || "Kompetitor"} unggul`,
        balanced: "Seimbang",
        insufficient: "Belum cukup bukti"
      };
      const advantage = advantageLabels[comparison.advantage] || "Belum dinilai pada laporan lama";
      header.append(node("span", advantage, `comparison-advantage ${comparison.advantage || "unscored"}`));
      article.append(header, node("p", `${nameOf(entityId)} vs ${competitor?.name || competitor.id}`, "comparison-pair-title"));
      const refs = comparison.evidence_ids.map((id) => evidenceById.get(id)).filter(Boolean);
      const platforms = [...new Set(refs.map((item) => item.platform))];
      article.append(node("p", `Total opini: ${fmt.format(counts.get(entityId) || 0)} vs ${fmt.format(counts.get(comparison.competitor_id) || 0)} · Bukti aspek ini: ${refs.length}${platforms.length ? ` · Platform: ${platforms.join(", ")}` : ""}`, "item-meta"));
      if (comparison.observation) article.append(node("p", comparison.observation));
      const hasStructuredSides = [
        ...(comparison.entity_strengths || []),
        ...(comparison.entity_weaknesses || []),
        ...(comparison.competitor_strengths || []),
        ...(comparison.competitor_weaknesses || [])
      ].length > 0;
      if (hasStructuredSides) {
        const sides = node("div", undefined, "comparison-sides");

        // 1. Kolom Kiri: Unit Bisnis Kita (Susun vertikal: Positif di atas, Negatif di bawah)
        const internalCol = node("div", undefined, "comparison-entity-col internal-col");
        const internalHeader = node("div", undefined, "comparison-col-header internal");
        internalHeader.append(node("span", "👑 UNIT BISNIS KITA", "badge-tag"), node("strong", nameOf(entityId)));
        internalCol.append(internalHeader);

        const intStrength = node("div", undefined, "comparison-side strength-side");
        intStrength.append(node("strong", `${nameOf(entityId)} · Keunggulan (Positif)`, "positive-title"));
        const intStrengths = comparison.entity_strengths || [];
        if (intStrengths.length) {
          const list = node("ul");
          intStrengths.forEach((item) => list.append(node("li", item)));
          intStrength.append(list);
        } else {
          intStrength.append(node("p", "Belum cukup bukti untuk menyimpulkan."));
        }
        internalCol.append(intStrength);

        const intWeakness = node("div", undefined, "comparison-side weakness-side");
        intWeakness.append(node("strong", `${nameOf(entityId)} · Perlu diperbaiki (Negatif)`, "negative-title"));
        const intWeaknesses = comparison.entity_weaknesses || [];
        if (intWeaknesses.length) {
          const list = node("ul");
          intWeaknesses.forEach((item) => list.append(node("li", item)));
          intWeakness.append(list);
        } else {
          intWeakness.append(node("p", "Belum cukup bukti untuk menyimpulkan."));
        }
        internalCol.append(intWeakness);

        // 2. Kolom Kanan: Sampingnya Kompetitor (Susun vertikal: Positif di atas, Negatif di bawah)
        const compCol = node("div", undefined, "comparison-entity-col competitor-col");
        const compHeader = node("div", undefined, "comparison-col-header competitor");
        compHeader.append(node("span", "⚔️ KOMPETITOR", "badge-tag"), node("strong", competitor?.name || "Kompetitor"));
        compCol.append(compHeader);

        const compStrength = node("div", undefined, "comparison-side strength-side");
        compStrength.append(node("strong", `${competitor?.name || "Kompetitor"} · Keunggulan (Positif)`, "positive-title"));
        const compStrengths = comparison.competitor_strengths || [];
        if (compStrengths.length) {
          const list = node("ul");
          compStrengths.forEach((item) => list.append(node("li", item)));
          compStrength.append(list);
        } else {
          compStrength.append(node("p", "Belum cukup bukti untuk menyimpulkan."));
        }
        compCol.append(compStrength);

        const compWeakness = node("div", undefined, "comparison-side weakness-side");
        compWeakness.append(node("strong", `${competitor?.name || "Kompetitor"} · Kekurangan (Negatif)`, "negative-title"));
        const compWeaknesses = comparison.competitor_weaknesses || [];
        if (compWeaknesses.length) {
          const list = node("ul");
          compWeaknesses.forEach((item) => list.append(node("li", item)));
          compWeakness.append(list);
        } else {
          compWeakness.append(node("p", "Belum cukup bukti untuk menyimpulkan."));
        }
        compCol.append(compWeakness);

        sides.append(internalCol, compCol);
        article.append(sides);
      } else if (comparison.observation) {
        article.append(node("p", comparison.observation));
      }
      const citations = node("div", undefined, "citations");
      comparison.evidence_ids.forEach((id) => citations.append(citationButton(id)));
      article.append(citations);
      groupWrapper.append(article);
    });

    container.append(groupWrapper);
  });

  if (!renderedCount) {
    container.append(node("p", `Belum ada perbandingan berbukti antara ${nameOf(entityId)} dan kompetitor pembanding.`, "empty-content"));
  }
}

function renderUnitQuotes(entityId) {
  const container = $("unit-quotes");
  if (!container) return;
  container.replaceChildren();
  const evidence = customerEvidence([entityId]);
  const rows = evidence.filter((item) => item.quote).sort((a, b) => Date.parse(b.published_at || "") - Date.parse(a.published_at || "")).slice(0, 3);
  const note = $("unit-quotes-note");
  if (note) note.textContent = `${rows.length} kutipan terbaru dari ${fmt.format(evidence.length)} opini bertanggal yang berhasil dikumpulkan. Tab Feed menampilkan semua opini yang terkumpul pada riset ini.`;
  if (!rows.length) {
    container.append(node("p", "Belum ada kutipan pelanggan bertanggal untuk unit ini.", "empty-content"));
    return;
  }
  rows.forEach((item) => {
    const card = node("article", undefined, "quote-card");
    card.append(node("blockquote", item.quote, "customer-quote-text"), node("p", `${item.platform} · ${dateLabel(item.published_at)}`, "item-meta"), safeLink(item.url, "Buka sumber publik"));
    container.append(card);
  });
}

function renderStats() {
  const unitIds = state.selectedEntity ? [state.selectedEntity] : businessEntities().map((entity) => entity.id);
  const evidence = customerEvidence(unitIds);
  const positive = evidence.filter((item) => item.sentiment === "positive").length;
  const negative = evidence.filter((item) => item.sentiment === "negative").length;
  if ($("metric-customer")) $("metric-customer").textContent = fmt.format(evidence.length);
  if ($("metric-customer-note")) $("metric-customer-note").textContent = state.selectedEntity ? `opini bertanggal untuk ${nameOf(state.selectedEntity)}` : "opini pelanggan unit bisnis dalam periode";
  if ($("metric-positive")) $("metric-positive").textContent = fmt.format(positive);
  if ($("metric-positive-note")) $("metric-positive-note").textContent = `${evidence.length ? Math.round(positive / evidence.length * 100) : 0}% dari sampel`;
  if ($("metric-negative")) $("metric-negative").textContent = fmt.format(negative);
  if ($("metric-negative-note")) $("metric-negative-note").textContent = `${evidence.length ? Math.round(negative / evidence.length * 100) : 0}% dari sampel`;

  const labelsCount = Object.fromEntries(["positive", "negative", "neutral", "mixed", "unclear"].map((key) => [key, evidence.filter((item) => item.sentiment === key).length]));
  const bars = $("sentiment-bars");
  if (bars) {
    bars.replaceChildren();
    Object.entries(labelsCount).forEach(([key, count]) => {
      const share = evidence.length ? count / evidence.length * 100 : 0;
      const track = node("div", undefined, "bar-track");
      track.append(createSvgBar(share, sentimentColors[key]));
      const row = node("div", undefined, "sentiment-row");
      row.append(node("span", labels[key]), track, node("span", `${fmt.format(count)} · ${Math.round(share)}%`, "sentiment-value"));
      bars.append(row);
    });
  }

  const stats = new Map((state.run?.stats?.entities || []).map((item) => [item.entity_id, item]));
  const entities = businessEntities().filter((entity) => !state.selectedEntity || entity.id === state.selectedEntity);
  const internalTitle = $("internal-table-title");
  if (internalTitle) {
    internalTitle.textContent = state.selectedEntity
      ? `Sentimen ${nameOf(state.selectedEntity)}`
      : "Sentimen Unit Bisnis Kita (Sanghyang)";
  }
  setRows("summary-rows", entities.map((entity) => {
    const item = stats.get(entity.id) || {};
    const row = document.createElement("tr");
    row.className = "clickable-row";
    row.title = `Klik untuk melihat detail & perkembangan ${entity.name}`;
    row.addEventListener("click", () => {
      selectOutlet(entity.id);
      switchMainView("grid");
    });
    row.append(cell(entity.name), cell(fmt.format(item.total || 0)), cell(fmt.format(item.positive || 0)),
      cell(fmt.format(item.negative || 0)), cell(entity.verification === "verified" ? "Terverifikasi" : "Kandidat"));
    return row;
  }), 5, "Belum ada opini bertanggal untuk unit ini.");

  const competitorEntities = state.selectedEntity
    ? relatedCompetitors(state.selectedEntity)
    : state.entities.filter((entity) => entity.is_competitor);

  const compTitle = $("competitor-table-title");
  if (compTitle) {
    compTitle.textContent = state.selectedEntity
      ? `Sentimen Kompetitor Pembanding (${nameOf(state.selectedEntity)})`
      : "Sentimen Benchmark Kompetitor Anyer";
  }

  setRows("competitor-summary-rows", competitorEntities.map((entity) => {
    const item = stats.get(entity.id) || {};
    const rel = entity.metadata?.relation || (entity.id.includes("lighthouse") ? "Pesaing Nightlife" : "Pesaing Kawasan");
    const row = document.createElement("tr");
    row.className = "clickable-row";
    row.title = `Klik untuk melihat ulasan & sentimen ${entity.name}`;
    row.addEventListener("click", () => {
      const catSelect = $("feed-filter-category");
      if (catSelect) catSelect.value = entity.id;
      syncFeedCategoryButton(entity.id);
      switchMainView("feed");
    });
    row.append(
      cell(entity.name),
      cell(rel),
      cell(fmt.format(item.total || 0)),
      cell(fmt.format(item.positive || 0)),
      cell(fmt.format(item.negative || 0)),
      cell(entity.verification === "verified" ? "Terverifikasi" : "Kandidat")
    );
    return row;
  }), 6, state.selectedEntity ? `Belum ada kompetitor pembanding untuk ${nameOf(state.selectedEntity)}.` : "Belum ada opini bertanggal untuk kompetitor.");

  const platforms = [...new Set(evidence.map((item) => item.platform))].sort();
  setRows("platform-rows", platforms.map((platform) => {
    const rows = evidence.filter((item) => item.platform === platform);
    const row = document.createElement("tr");
    row.append(cell(platform), ...["total", "positive", "negative", "neutral", "mixed", "unclear"].map((key) =>
      cell(fmt.format(key === "total" ? rows.length : rows.filter((item) => item.sentiment === key).length))));
    return row;
  }), 7, "Belum ada opini pada unit ini.");
  renderUnitTrend("weekly-chart", "weekly-note", unitIds);
  renderSources();
}

function renderUnitTrend(chartId, noteId, entityIds) {
  const chart = $(chartId);
  const note = $(noteId);
  if (!chart) return;
  chart.replaceChildren();
  const evidence = customerEvidence(entityIds).filter((item) => item.published_at && !Number.isNaN(Date.parse(item.published_at)));
  if (evidence.length < 5) {
    if (note) note.textContent = evidence.length ? `Sampel bertanggal hanya ${evidence.length}; minimal 5 diperlukan sebelum pola ditampilkan.` : "Belum ada ulasan pelanggan bertanggal dalam periode riset.";
    chart.append(node("p", "Tren belum dapat disimpulkan dari sampel ini.", "empty-content"));
    setRows("weekly-rows", [], 7, "Belum cukup sampel bertanggal untuk merangkum tren.");
    return;
  }
  if (note) note.textContent = `${fmt.format(evidence.length)} opini bertanggal dalam periode riset. Batang tertinggi menandai bulan dengan opini terbanyak; angka di bawahnya adalah jumlah opini bulan itu.`;
  const legend = node("div", undefined, "trend-legend");
  legend.setAttribute("aria-label", "Legenda sentimen");
  ["positive", "negative", "mixed", "neutral", "unclear"].forEach((key) => {
    const item = node("span", undefined, "trend-legend-item");
    const swatch = node("span", undefined, "trend-swatch");
    swatch.style.backgroundColor = sentimentColors[key];
    item.append(swatch, node("span", labels[key]));
    legend.append(item);
  });
  const monthTrack = node("div", undefined, "trend-months");
  chart.append(legend, monthTrack);
  const first = new Date(state.run.start_at);
  const last = new Date(state.run.end_at);
  const months = [];
  const cursor = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), 1));
  const lastMonth = `${last.getUTCFullYear()}-${String(last.getUTCMonth() + 1).padStart(2, "0")}`;
  while (`${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, "0")}` <= lastMonth) {
    const key = `${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, "0")}`;
    months.push({ month: key, total: 0, positive: 0, negative: 0, mixed: 0, neutral: 0, unclear: 0 });
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  const byMonth = new Map(months.map((month) => [month.month, month]));
  evidence.forEach((item) => {
    const date = new Date(item.published_at);
    const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
    const month = byMonth.get(key);
    if (month) { month.total += 1; month[item.sentiment] = (month[item.sentiment] || 0) + 1; }
  });
  const max = Math.max(1, ...months.map((month) => month.total));
  months.forEach((month) => {
    const column = node("div", undefined, "month-column");
    column.dataset.month = month.month;
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 100"); svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", `${month.month}: ${month.total} opini; positif ${month.positive}, negatif ${month.negative}, campuran ${month.mixed}, netral ${month.neutral}, belum jelas ${month.unclear}`);
    let y = 100;
    ["positive", "negative", "mixed", "neutral", "unclear"].forEach((key) => {
      if (!month[key]) return;
      const height = month[key] / max * 100; y -= height;
      const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      rect.setAttribute("x", "0"); rect.setAttribute("y", String(y)); rect.setAttribute("width", "24");
      rect.setAttribute("height", String(height)); rect.setAttribute("fill", sentimentColors[key]); svg.append(rect);
    });
    const monthLabel = new Intl.DateTimeFormat("id-ID", { month: "short", year: "2-digit", timeZone: "UTC" })
      .format(new Date(`${month.month}-01T00:00:00Z`));
    column.append(svg, node("span", monthLabel, "month-label"), node("span", fmt.format(month.total), "month-count"));
    monthTrack.append(column);
  });
  setRows("weekly-rows", months.map((month) => {
    const row = document.createElement("tr");
    row.append(cell(month.month), ...["total", "positive", "negative", "mixed", "neutral", "unclear"].map((key) => cell(fmt.format(month[key] || 0))));
    return row;
  }), 7, "Belum ada opini dalam periode.");
}

function renderSources() {
  const ids = state.selectedEntity ? new Set([state.selectedEntity, ...relatedCompetitors(state.selectedEntity).map((entity) => entity.id)]) : null;
  const items = state.sources.filter((source) => !ids || ids.has(source.entity_id));
  const unitSources = state.selectedEntity ? items.filter((source) => source.entity_id === state.selectedEntity) : items;
  if ($("unit-coverage-note")) $("unit-coverage-note").textContent = `${unitSources.filter((source) => source.status === "ok").length} dari ${unitSources.length} sumber unit tersedia; semua status tetap terlihat.`;
  const list = $("unit-sources");
  if (list) {
    list.replaceChildren();
    items.forEach((source) => {
      const row = node("article", undefined, `source-row ${source.status}`);
      row.append(node("strong", `${nameOf(source.entity_id)} · ${source.platform}`), node("span", statusLabels[source.status] || source.status),
        node("p", source.message || "Tidak ada keterangan sumber."), safeLink(source.canonical_url || source.url, hostOf(source.url)));
      list.append(row);
    });
    if (!items.length) list.append(node("p", "Belum ada status sumber untuk unit ini.", "empty-content"));
  }
  setRows("source-rows", items.map((source) => {
    const row = document.createElement("tr");
    row.append(cell(`${source.platform} · ${nameOf(source.entity_id)}`));
    const url = cell(); url.append(safeLink(source.canonical_url || source.url, source.url));
    const status = cell(statusLabels[source.status] || source.status); status.classList.add("source-status", source.status);
    row.append(url, status, cell(source.message || "Tidak ada keterangan."));
    return row;
  }), 4, "Belum ada sumber yang tercatat.");
}

function renderEvidence() {
  const sharedScope = state.selectedEntity ? new Set(scopeIds()) : null;
  const query = {
    entity_id: $("filter-entity") ? $("filter-entity").value : "",
    platform: $("filter-platform") ? $("filter-platform").value : "",
    sentiment: $("filter-sentiment") ? $("filter-sentiment").value : "",
    kind: $("filter-kind") ? $("filter-kind").value : "customer",
    in_window: $("filter-window") ? $("filter-window").value : "in"
  };
  const matches = state.evidence.filter((item) => {
    if (sharedScope && !sharedScope.has(item.entity_id)) return false;
    // 1. Entity Filter (Internal vs Competitor grouping)
    if (query.entity_id === "all-internal") {
      if (state.entities.find((e) => e.id === item.entity_id)?.is_competitor) return false;
    } else if (query.entity_id === "all-competitors") {
      if (!state.entities.find((e) => e.id === item.entity_id)?.is_competitor) return false;
    } else if (query.entity_id && item.entity_id !== query.entity_id) {
      return false;
    }

    // 2. Platform Filter
    if (query.platform && item.platform !== query.platform) return false;

    // 3. Sentiment Filter
    if (query.sentiment && item.sentiment !== query.sentiment) return false;

    // 4. Kind Filter (Default ke Opini Konsumen customer_review & customer_comment)
    if (query.kind === "customer") {
      if (!item.kind || !item.kind.startsWith("customer_")) return false;
    } else if (query.kind && item.kind !== query.kind) {
      return false;
    }

    // 5. In-Window Filter
    if (query.in_window === "undated") {
      if (item.published_at) return false;
    } else if (query.in_window === "in") {
      if (!item.in_window) return false;
    } else if (query.in_window === "out") {
      if (!item.published_at || item.in_window) return false;
    }

    return true;
  });

  const count = $("evidence-count");
  if (count) count.textContent = `${fmt.format(matches.length)} bukti`;
  const list = $("evidence-list");
  if (!list) return;
  list.replaceChildren();
  matches.slice(0, state.shown).forEach((item) => {
    const article = node("article", undefined, "evidence-item");
    article.id = `evidence-${item.id}`;
    article.tabIndex = -1;
    const title = node(
      "h3",
      `${nameOf(item.entity_id)} · ${labels[item.sentiment] || item.sentiment}`,
      `sentiment-label ${item.sentiment}`
    );
    article.append(
      title,
      node(
        "div",
        `${kindLabels[item.kind] || item.kind} · ${item.platform} · ${dateLabel(item.published_at)}${
          item.in_window ? " · Dalam periode (12 Bulan)" : item.published_at ? " · Di luar periode" : " · Tanpa tanggal"
        }`,
        "item-meta"
      ),
      node("blockquote", item.quote)
    );
    const details = document.createElement("details");
    details.append(node("summary", "Teks bukti lengkap"), node("p", item.text));
    article.append(details);
    if (item.aspects?.length)
      article.append(
        node(
          "p",
          item.aspects.map((aspect) => `${aspect.name}: ${labels[aspect.sentiment]}`).join(" · "),
          "aspects"
        )
      );
    article.append(safeLink(item.url, "Buka sumber publik"));
    list.append(article);
  });
  if (!matches.length) list.append(node("p", "Tidak ada bukti yang cocok dengan filter.", "empty-content"));
  if ($("evidence-more")) $("evidence-more").hidden = matches.length <= state.shown;
}

function populateFilters() {
  const entity = $("filter-entity");
  if (entity) {
    entity.replaceChildren(
      new Option("Semua unit & kompetitor", ""),
      new Option("Semua unit bisnis", "all-internal"),
      new Option("Semua kompetitor", "all-competitors")
    );

    const internalOptGroup = document.createElement("optgroup");
    internalOptGroup.label = "Unit Bisnis Pribadi";
    businessEntities().forEach((item) => internalOptGroup.append(new Option(item.name, item.id)));
    entity.append(internalOptGroup);

    const compOptGroup = document.createElement("optgroup");
    compOptGroup.label = "Benchmark Kompetitor";
    state.entities.filter((item) => item.is_competitor).forEach((item) => compOptGroup.append(new Option(item.name, item.id)));
    entity.append(compOptGroup);
  }

  const platform = $("filter-platform");
  if (platform) {
    platform.replaceChildren(new Option("Semua platform", ""));
    [...new Set(state.evidence.map((item) => item.platform))].sort().forEach((item) => platform.add(new Option(item, item)));
  }

  const feedCat = $("feed-filter-category");
  if (feedCat) {
    const current = feedCat.value;
    feedCat.replaceChildren();
    const internal = businessEntities();
    const competitors = state.entities.filter((item) => item.is_competitor);
    if (internal.length) {
      const intGroup = document.createElement("optgroup");
      intGroup.label = "Unit Bisnis";
      internal.forEach((item) => intGroup.append(new Option(item.name, item.id)));
      feedCat.append(intGroup);
    }
    if (competitors.length) {
      const compGroup = document.createElement("optgroup");
      compGroup.label = "Kompetitor";
      competitors.forEach((item) => compGroup.append(new Option(item.name, item.id)));
      feedCat.append(compGroup);
    }
    const preferred = state.entities.find((item) => item.id === current)
      || state.entities.find((item) => item.id === state.selectedEntity)
      || internal[0]
      || competitors[0];
    feedCat.value = preferred?.id || "";
    syncFeedCategoryButton(feedCat.value);
  }

  const exportSelect = $("export-unit-select");
  if (exportSelect) {
    const current = exportSelect.value;
    exportSelect.replaceChildren(new Option("Semua unit (Laporan Portofolio)", ""));
    businessEntities().forEach((entity) => {
      exportSelect.add(new Option(entity.name, entity.id));
    });
    if (state.selectedEntity) {
      exportSelect.value = state.selectedEntity;
    } else if (current) {
      exportSelect.value = current;
    }
    updateExportLinks();
  }
}

/* Memuat & Menampilkan Media Medsos dari /api/media */
async function loadMediaAssets() {
  try {
    const manifest = await api("/api/media");
    state.mediaManifest = manifest;
    renderMediaGallery(state.selectedEntity);
    renderMediaTabGallery(state.selectedEntity);
  } catch (err) {
    console.warn("Gagal memuat aset media:", err);
  }
}

function renderMediaCard(asset) {
  const card = node("div", undefined, "media-item-card");
  const thumbWrap = node("div", undefined, "media-thumb-wrap");

  const badge = node("span", (asset.platform || "medsos").toUpperCase(), `media-platform-badge ${asset.platform || ""}`);
  thumbWrap.append(badge);

  const img = node("img", undefined, "media-thumb-img");
  img.src = `/api/media/file/${encodeURIComponent(asset.filename)}`;
  img.alt = asset.description || asset.filename;
  img.loading = "lazy";
  img.onerror = () => {
    img.remove();
    const placeholder = node("span", asset.platform === "tiktok" ? "🎵" : "📷", "media-thumb-placeholder");
    thumbWrap.append(placeholder);
  };
  thumbWrap.append(img);

  const captionBox = node("div", undefined, "media-caption-box");
  const outletFriendlyNames = {
    sanghyang_resort: "@sanghyangresort",
    sanghyang_resort_tiktok: "@sanghyangsparesort (TikTok)",
    dragon_beach_club: "@dragonbeachclub",
    dragon_beach_club_tiktok: "@dragonbeachclub (TikTok)",
    sunset_grill: "@sunsetgrillsanghyang",
    dbistro: "@dbistro.anyer"
  };
  const outletLabel = node(
    "span",
    outletFriendlyNames[asset.outlet] || (asset.outlet || "").replace(/_/g, " ").toUpperCase(),
    "media-outlet-name"
  );
  const desc = node("span", asset.description || asset.filename, "media-desc-text");
  captionBox.append(outletLabel, desc);

  card.append(thumbWrap, captionBox);
  return card;
}

function renderMediaGallery(entityId = "") {
  const container = $("mediaGalleryGrid");
  if (!container) return;
  container.replaceChildren();

  const items = getFilteredAssets(entityId);
  items.slice(0, 36).forEach((asset) => {
    container.append(renderMediaCard(asset));
  });
  if (!items.length) {
    container.append(node("p", "Tidak ada aset media untuk unit bisnis ini.", "empty-content"));
  }
}

function renderMediaTabGallery(entityId = "") {
  const container = $("mediaTabGalleryGrid");
  if (!container) return;
  container.replaceChildren();

  const items = getFilteredAssets(entityId);
  items.forEach((asset) => {
    container.append(renderMediaCard(asset));
  });
  if (!items.length) {
    container.append(node("p", "Tidak ada aset media untuk unit bisnis ini.", "empty-content"));
  }
}

/* Native Canvas Peta Ekosistem Graf (2026 Engine) */
function drawEcosystemGraph() {
  const canvas = $("ecosystemCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return;

  canvas.width = rect.width * window.devicePixelRatio;
  canvas.height = rect.height * window.devicePixelRatio;
  ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

  const width = rect.width;
  const height = rect.height;

  ctx.clearRect(0, 0, width, height);

  const cx = width / 2;
  const cy = height / 2;

  const selected = state.entities.find((entity) => entity.id === state.selectedEntity)
  const units = selected ? [selected] : businessEntities()
  const competitors = selected ? relatedCompetitors(selected.id) : state.entities.filter((entity) => entity.is_competitor)
  const entities = [...units, ...competitors]
  const nodes = entities.map((entity, index) => {
    const isCompetitor = entity.is_competitor
    const ring = isCompetitor ? Math.min(width, height) * 0.39 : Math.min(width, height) * (selected ? 0 : 0.2)
    const count = customerEvidence([entity.id]).length
    const total = isCompetitor ? competitors.length : units.length
    const angle = (index % total) / Math.max(1, total) * Math.PI * 2 - Math.PI / 2
    return {
      id: entity.id, entityId: entity.id, label: entity.name,
      x: selected && !isCompetitor ? cx : cx + Math.cos(angle) * ring,
      y: selected && !isCompetitor ? cy : cy + Math.sin(angle) * ring,
      color: isCompetitor ? '#f43f5e' : entity.kind === 'resort' ? '#f59e0b' : '#38bdf8',
      r: selected && !isCompetitor ? 30 : isCompetitor ? 20 : 23,
      type: isCompetitor ? 'comp' : entity.kind,
      desc: `${entity.description || entity.kind} · ${fmt.format(count)} opini pelanggan bertanggal dalam periode`
    }
  })
  const edges = competitors.flatMap((competitor) => competitor.comparator_for
    .filter((entityId) => units.some((unit) => unit.id === entityId))
    .map((entityId) => ({ from: entityId, to: competitor.id, label: 'pembanding' })))
  // Draw Edges
  edges.forEach((edge) => {
    const f = nodes.find((n) => n.id === edge.from);
    const t = nodes.find((n) => n.id === edge.to);
    if (!f || !t) return;
    ctx.beginPath();
    ctx.moveTo(f.x, f.y);
    ctx.lineTo(t.x, t.y);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Edge label
    const mx = (f.x + t.x) / 2;
    const my = (f.y + t.y) / 2;
    ctx.font = "10px Plus Jakarta Sans, sans-serif";
    ctx.fillStyle = "rgba(148, 163, 184, 0.7)";
    ctx.textAlign = "center";
    ctx.fillText(edge.label, mx, my - 4);
  });

  // Draw Nodes
  nodes.forEach((n) => {
    const isSelected = state.selectedEntity && n.entityId === state.selectedEntity;
    const radius = isSelected ? n.r + 6 : n.r;

    ctx.beginPath();
    ctx.arc(n.x, n.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = n.color;
    ctx.fill();
    ctx.lineWidth = isSelected ? 4 : 2;
    ctx.strokeStyle = isSelected ? "#fff" : "rgba(255, 255, 255, 0.3)";
    ctx.stroke();

    // Glow highlight
    if (isSelected) {
      ctx.shadowColor = n.color;
      ctx.shadowBlur = 20;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // Node Text
    ctx.fillStyle = "#fff";
    ctx.font = `${radius >= 30 ? "bold 12px" : "bold 10px"} Plus Jakarta Sans, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const lines = n.label.split("\n");
    if (lines.length > 1) {
      ctx.fillText(lines[0], n.x, n.y - 7);
      ctx.fillText(lines[1], n.x, n.y + 7);
    } else {
      ctx.fillText(n.label, n.x, n.y);
    }
  });

  // Update detail box jika ada yang terpilih
  if (state.selectedEntity) {
    const selNode = nodes.find((n) => n.entityId === state.selectedEntity);
    if (selNode) {
      if ($("nodeDetailTitle")) $("nodeDetailTitle").textContent = `${selNode.label.replace(/\n/g, " ")} (${selNode.type.toUpperCase()})`;
      if ($("nodeDetailDesc")) $("nodeDetailDesc").textContent = selNode.desc;
    }
  }

  // Interaktivitas Klik di Kanvas
  canvas.onclick = (evt) => {
    const cr = canvas.getBoundingClientRect();
    const mx = evt.clientX - cr.left;
    const my = evt.clientY - cr.top;

    const clicked = nodes.find((n) => {
      const dx = mx - n.x;
      const dy = my - n.y;
      return Math.sqrt(dx * dx + dy * dy) <= n.r + 8;
    });

    if (clicked) {
      if ($("nodeDetailTitle")) $("nodeDetailTitle").textContent = `${clicked.label.replace(/\n/g, " ")} (${clicked.type.toUpperCase()})`;
      if ($("nodeDetailDesc")) $("nodeDetailDesc").textContent = clicked.desc;
      if (clicked.entityId) {
        selectOutlet(clicked.entityId);
      }
    }
  };
}

function updateExportLinks() {
  const run = state.run;
  if (!run) return;
  const select = $("export-unit-select");
  const entityId = select?.value || "";
  const entityQuery = entityId ? `&entity_id=${encodeURIComponent(entityId)}` : "";

  const viewHtml = $("export-view-html");
  if (viewHtml) {
    viewHtml.href = `/api/research/${encodeURIComponent(run.id)}/export?format=html${entityQuery}`;
  }

  const dlHtml = $("export-html");
  if (dlHtml) {
    dlHtml.href = `/api/research/${encodeURIComponent(run.id)}/export?format=html${entityQuery}`;
    dlHtml.download = entityId ? `laporan-${entityId}-${run.id}.html` : `laporan-portofolio-${run.id}.html`;
  }

  const dlCsv = $("export-csv");
  if (dlCsv) {
    dlCsv.href = `/api/research/${encodeURIComponent(run.id)}/export?format=csv${entityQuery}`;
    dlCsv.download = entityId ? `data-${entityId}-${run.id}.csv` : `data-portofolio-${run.id}.csv`;
  }

  const dlJson = $("export-json");
  if (dlJson) {
    dlJson.href = `/api/research/${encodeURIComponent(run.id)}/export?format=json${entityQuery}`;
    dlJson.download = entityId ? `data-${entityId}-${run.id}.json` : `data-portofolio-${run.id}.json`;
  }
}

/* Render Run Lifecycle */
function renderRun() {
  const run = state.run;
  if (!run) return;
  if ($("job-status")) {
    $("job-status").hidden = false;
    $("job-status").textContent = statusLabels[run.status] || run.status;
    $("job-status").className = `status-label ${run.status}`;
  }
  if ($("status-text")) {
    $("status-text").textContent = run.message || statusLabels[run.status] || run.status;
  }
  if ($("run-meta")) {
    $("run-meta").hidden = false;
    $("run-meta").textContent = `Periode ulasan: ${dateLabel(run.start_at)} – ${dateLabel(run.end_at)} (${run.period_months} bulan) · Sinkron terakhir: ${dateTimeLabel(run.updated_at || run.created_at)} · Situs: ${run.url}`;
  }

  updateExportLinks();

  renderOutletPills();
  renderStats();
  renderReport();
  renderComparisons(state.selectedEntity);
  renderUnitFindings(state.selectedEntity);
  renderEvidence();
  renderMediaGallery(state.selectedEntity);
  renderMediaTabGallery(state.selectedEntity);

  clearTimeout(state.timer);
  if (["queued", "running"].includes(run.status)) {
    state.timer = setTimeout(() => loadRun(run.id), 8000);
  }
}

async function loadRun(id) {
  try {
    const run = await api(`/api/research/${encodeURIComponent(id)}`);
    const [entities, sources, evidence] = await Promise.all([
      api(`/api/research/${encodeURIComponent(id)}/entities`),
      api(`/api/research/${encodeURIComponent(id)}/sources`),
      api(`/api/research/${encodeURIComponent(id)}/evidence`)
    ]);
    state.run = run;
    state.entities = entities.items;
    state.sources = sources.items;
    state.evidence = evidence.items;
    state.report = run.report;
    if (state.selectedEntity && !state.entities.some((entity) => entity.id === state.selectedEntity && !entity.is_competitor)) {
      state.selectedEntity = "";
    }

    populateFilters();
    renderRun();
  } catch (error) {
    if ($("connection-error")) {
      $("connection-error").textContent = error.message;
      $("connection-error").hidden = false;
    }
  }
}

async function loadRuns(selectId = "") {
  const response = await api("/api/research");
  state.runs = response.items;
  const select = $("job-select");
  if (select) {
    select.replaceChildren();
    state.runs.forEach((run) =>
      select.add(
        new Option(`Sinkron ${dateLabel(run.updated_at || run.created_at)} · ${statusLabels[run.status] || run.status}`, run.id)
      )
    );
    if (selectId && state.runs.some((item) => item.id === selectId)) select.value = selectId;
    else if (state.runs.length) select.value = state.runs[0].id;
    if (select.value) await loadRun(select.value);
  }
}

/* Event Listeners Initialization */
function setupEventListeners() {
  $("login-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = $("login-button");
    button.disabled = true;
    try {
      await api("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: $("login-username").value, password: $("login-password").value })
      });
      $("login-password").value = "";
      await enterSnapshot();
    } catch (error) {
      showLogin(error.message);
    } finally {
      button.disabled = false;
    }
  });
  $("logout-button")?.addEventListener("click", async () => {
    try {
      await api("/api/auth/logout", { method: "POST" });
      showLogin();
    } catch (error) {
      showLogin(error.message);
    }
  });

  // Mode View Switchers
  document.querySelectorAll(".view-btn[data-view]").forEach((btn) => {
    btn.addEventListener("click", () => switchMainView(btn.dataset.view));
  });

  $("unit-selector-buttons")?.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-select-unit]");
    if (button) selectOutlet(button.dataset.selectUnit);
  });
  $("unit-grid")?.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-select-unit]");
    if (button) selectOutlet(button.dataset.selectUnit);
  });
  $("back-to-portfolio")?.addEventListener("click", () => selectOutlet(""));

  // Media Gallery Filter in Matrix Card and in Tab Media
  document.querySelectorAll(".media-filter-btn[data-entity-id]").forEach((btn) => {
    btn.addEventListener("click", () => selectOutlet(btn.dataset.entityId));
  });

  if ($("select-display-unit")) {
    $("select-display-unit").addEventListener("change", (e) => selectOutlet(e.target.value));
  }
  if ($("searchInput")) {
    $("searchInput").addEventListener("input", (e) => {
      const q = e.target.value.toLowerCase().trim();
      state.searchKeyword = q;
      document.querySelectorAll(".unit-card").forEach((card) => {
        const text = card.textContent.toLowerCase();
        card.hidden = Boolean(q && !text.includes(q));
      });
      if (state.activeView === "feed") {
        renderCommentFeed();
      }
    });
  }
  if ($("refresh-button")) {
    $("refresh-button").addEventListener("click", () => loadRuns($("job-select")?.value));
  }
  if ($("job-select")) {
    $("job-select").addEventListener("change", () => loadRun($("job-select").value));
  }
  if ($("finding-action")) {
    $("finding-action").addEventListener("change", renderReport);
  }
  if ($("export-unit-select")) $("export-unit-select").addEventListener("change", () => updateExportLinks());

  const btnExport = $("btnExportMenu");
  const exportsMenu = $("exportsMenu");
  if (btnExport && exportsMenu) {
    btnExport.addEventListener("click", (e) => {
      e.stopPropagation();
      exportsMenu.classList.toggle("show");
    });
    document.addEventListener("click", (e) => {
      if (!e.target.closest(".exports-dropdown")) {
        exportsMenu.classList.remove("show");
      }
    });
  }

  // Feed Segmented Buttons
  document.querySelectorAll(".feed-segment-btn[data-category]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const catSelect = $("feed-filter-category");
      if (catSelect) {
        const candidates = btn.dataset.category === "competitor"
          ? state.entities.filter((entity) => entity.is_competitor)
          : businessEntities();
        const preferred = candidates.find((entity) => entity.id === catSelect.value)
          || candidates.find((entity) => entity.id === state.selectedEntity)
          || (btn.dataset.category === "competitor" ? relatedCompetitors(state.selectedEntity)[0] : null)
          || candidates[0];
        catSelect.value = preferred?.id || "";
      }
      syncFeedCategoryButton(catSelect?.value || "");
      renderCommentFeed();
    });
  });

  $("feed-filter-category")?.addEventListener("change", (e) => {
    syncFeedCategoryButton(e.target.value);
  });

  $("comparison-competitor")?.addEventListener("change", () => renderComparisons(state.selectedEntity));

  ["feed-filter-category", "feed-filter-sentiment", "feed-filter-platform"].forEach((id) => {
    const el = $(id);
    if (el) el.addEventListener("change", renderCommentFeed);
  });
  ["filter-platform", "filter-sentiment", "filter-kind", "filter-window"].forEach((id) => {
    const el = $(id);
    if (el)
      el.addEventListener("change", () => {
        state.shown = 20;
        renderEvidence();
      });
  });
  if ($("more-button")) {
    $("more-button").addEventListener("click", () => {
      state.shown += 20;
      renderEvidence();
    });
  }
  window.addEventListener("resize", () => {
    if (state.activeView === "network") drawEcosystemGraph();
  });
}

async function start() {
  if (window.location.protocol === "file:") {
    const errorEl = $("connection-error");
    if (errorEl) {
      errorEl.textContent = "Dashboard memerlukan server lokal aktif. Harap buka URL http://127.0.0.1:8000/ pada peramban Anda agar data dan tombol dapat diklik.";
      errorEl.hidden = false;
    }
  }
  state.snapshotMode = document.querySelector('meta[name="deployment-mode"]')?.content === "snapshot";
  setupEventListeners();
  try {
    if (state.snapshotMode) {
      $("job-select").hidden = true;
      $("refresh-button").hidden = true;
      const session = await api("/api/auth/session");
      if (session.authenticated) await enterSnapshot();
      else showLogin();
      return;
    }
    $("app-shell").hidden = false;
    await Promise.all([loadRuns(), loadMediaAssets()]);
  } catch (error) {
    if ($("connection-error")) {
      $("connection-error").textContent = error.message;
      $("connection-error").hidden = false;
    }
  }
  switchMainView("grid");
}

start();
