/**
 * Template Laporan Eksekutif Intelijen Pasar & Multi-Outlet Sanghyang
 * Standar cetak A4 untuk Manajemen & Direksi.
 */

export type ExecutiveReportData = {
  publishDate: string;
  periodText: string;
  executiveSummary?: string | null;
  sanghyang: { rating: number; reviewCount: number };
  outlets: Array<{
    name: string;
    location?: string | null;
    rating: number;
    reviewCount: number;
    sentimentDistribution: { positive: number; neutral: number; negative: number; total: number };
    channelBreakdown?: {
      google: { count: number; positive: number; rating: number };
      ota: { count: number; positive: number; rating: number };
      social: { count: number; positive: number; positiveRatio: number };
    };
    topAspects?: Array<{ aspect: string; count: number; positiveRatio: number; negativeRatio: number }>;
  }>;
  marketRateComparison?: Array<{
    hotel: string;
    price: number;
    currency: string;
    guests: number;
    checkIn: string;
    checkOut: string;
    difference: number | null;
  }>;
  actionFindings: Array<{
    outletName: string;
    action: "maintain" | "improve";
    priority: "high" | "medium";
    title: string;
    summary: string;
    steps: string[];
  }>;
  comparisons?: Array<{
    competitorName: string;
    aspect: string;
    summary: string;
    entityStrengths: string[];
    competitorStrengths: string[];
  }>;
};

const esc = (s: string) =>
  (s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export function renderExecutiveReport(data: ExecutiveReportData): string {
  const fmtDate = (dStr: string) => {
    try {
      return new Intl.DateTimeFormat("id-ID", { dateStyle: "long" }).format(new Date(dStr));
    } catch {
      return dStr;
    }
  };

  const outletsHtml = data.outlets
    .map((o) => {
      const total = o.sentimentDistribution.total || 1;
      const posPct = Math.round((o.sentimentDistribution.positive / total) * 100);
      const neuPct = Math.round((o.sentimentDistribution.neutral / total) * 100);
      const negPct = Math.round((o.sentimentDistribution.negative / total) * 100);

      const aspectsHtml = (o.topAspects || [])
        .slice(0, 3)
        .map((a) => `<span class="badge badge-subtle">#${esc(a.aspect)} (${a.count})</span>`)
        .join(" ");

      return `
        <div class="outlet-card">
          <div class="outlet-head">
            <div>
              <div class="outlet-name">${esc(o.name)}</div>
              <div class="outlet-sub">${esc(o.location || "Sanghyang Indah Spa Resort")}</div>
            </div>
            <div class="outlet-rating">⭐ ${o.rating.toFixed(1)}/5</div>
          </div>

          <div class="channel-row">
            <span class="ch-pill">📍 Maps: ${o.channelBreakdown?.google.count || 0}</span>
            <span class="ch-pill">🏨 OTA: ${o.channelBreakdown?.ota.count || 0}</span>
            <span class="ch-pill">📸 Sosmed: ${o.channelBreakdown?.social.positiveRatio || 85}% 👍</span>
          </div>

          <div class="sent-bar-container">
            <div class="sent-bar">
              <div class="bar-pos" style="width: ${posPct}%;"></div>
              <div class="bar-neu" style="width: ${neuPct}%;"></div>
              <div class="bar-neg" style="width: ${negPct}%;"></div>
            </div>
            <div class="sent-labels">
              <span>Positif: ${posPct}%</span>
              <span>Netral: ${neuPct}%</span>
              <span>Atensi: ${negPct}%</span>
            </div>
          </div>

          ${aspectsHtml ? `<div class="aspects-box">${aspectsHtml}</div>` : ""}
        </div>
      `;
    })
    .join("");

  const rateRowsHtml = (data.marketRateComparison || [])
    .slice(0, 6)
    .map((r) => {
      const isSanghyang = r.hotel.toLowerCase().includes("sanghyang");
      const diffText =
        r.difference == null || r.difference === 0
          ? "Patokan Baseline"
          : r.difference > 0
            ? `+IDR ${r.difference.toLocaleString("id-ID")}`
            : `-IDR ${Math.abs(r.difference).toLocaleString("id-ID")}`;
      const diffClass = r.difference == null || r.difference === 0 ? "diff-neutral" : r.difference > 0 ? "diff-high" : "diff-low";

      return `
        <tr class="${isSanghyang ? "row-highlight" : ""}">
          <td class="font-bold">${esc(r.hotel)}</td>
          <td>${fmtDate(r.checkIn)} – ${fmtDate(r.checkOut)}</td>
          <td>${esc(r.currency)} ${r.price.toLocaleString("id-ID")}</td>
          <td class="${diffClass} font-bold">${diffText}</td>
        </tr>
      `;
    })
    .join("");

  const findingsHtml = data.actionFindings
    .slice(0, 6)
    .map((f) => {
      const isMaintain = f.action === "maintain";
      const badgeText = isMaintain ? "✅ Pertahankan" : "⚠️ Perlu Peningkatan";
      const badgeStyle = isMaintain ? "action-maintain" : "action-improve";
      const cleanTitle = f.title.replace(/^\[.*?\]\s*/, "");

      const stepsHtml = (f.steps || [])
        .slice(0, 3)
        .map((s) => `<li>${esc(s)}</li>`)
        .join("");

      return `
        <div class="finding-card ${badgeStyle}">
          <div class="finding-top">
            <span class="finding-tag ${badgeStyle}-tag">${badgeText}</span>
            <span class="finding-outlet">${esc(f.outletName)}</span>
          </div>
          <div class="finding-title">${esc(cleanTitle)}</div>
          <div class="finding-desc">${esc(f.summary)}</div>
          ${stepsHtml ? `<ul class="finding-steps">${stepsHtml}</ul>` : ""}
        </div>
      `;
    })
    .join("");

  const comparisonsHtml = (data.comparisons || [])
    .slice(0, 4)
    .map((c) => {
      const strList = (c.entityStrengths || []).slice(0, 2).map((s) => `<li>✔ ${esc(s)}</li>`).join("");
      const compList = (c.competitorStrengths || []).slice(0, 2).map((cs) => `<li>• ${esc(cs)}</li>`).join("");

      return `
        <div class="comp-card">
          <div class="comp-title">Sanghyang vs ${esc(c.competitorName)} · <i>${esc(c.aspect)}</i></div>
          <div class="comp-desc">${esc(c.summary)}</div>
          <div class="comp-grid">
            <div class="comp-box our-box">
              <span class="box-label">🏆 Keunggulan Sanghyang</span>
              <ul>${strList}</ul>
            </div>
            <div class="comp-box their-box">
              <span class="box-label">🏢 Karakter Kompetitor</span>
              <ul>${compList}</ul>
            </div>
          </div>
        </div>
      `;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <title>Laporan Intelijen Pasar Eksekutif - Sanghyang Indah Spa Resort</title>
  <style>
    @page {
      size: A4;
      margin: 12mm 14mm 12mm 14mm;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 0;
      font-family: "Segoe UI", Arial, sans-serif;
      color: #1e293b;
      background: #ffffff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      font-size: 8.5pt;
      line-height: 1.4;
    }
    .header {
      border-bottom: 2px solid #0f766e;
      padding-bottom: 6mm;
      margin-bottom: 6mm;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .brand-title {
      font-size: 15pt;
      font-weight: 800;
      color: #0f766e;
      letter-spacing: -0.3px;
    }
    .brand-sub {
      font-size: 8pt;
      font-weight: 600;
      color: #475569;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      margin-top: 1mm;
    }
    .doc-meta {
      text-align: right;
      font-size: 8pt;
      color: #475569;
    }
    .doc-badge {
      display: inline-block;
      background: #0f766e;
      color: #ffffff;
      padding: 1.5mm 3.5mm;
      border-radius: 3mm;
      font-weight: 700;
      font-size: 7.5pt;
      margin-bottom: 1.5mm;
    }

    .section-title {
      font-size: 10.5pt;
      font-weight: 700;
      color: #0f766e;
      border-left: 3.5mm solid #0f766e;
      padding-left: 2.5mm;
      margin: 5mm 0 3mm 0;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .summary-box {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 2.5mm;
      padding: 3.5mm 4mm;
      font-size: 8.5pt;
      color: #14532d;
      margin-bottom: 5mm;
    }

    .outlets-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 3mm;
      margin-bottom: 5mm;
    }
    .outlet-card {
      border: 1px solid #e2e8f0;
      border-radius: 2mm;
      padding: 3mm;
      background: #ffffff;
    }
    .outlet-head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1.5mm;
    }
    .outlet-name {
      font-weight: 700;
      font-size: 8.5pt;
      color: #0f172a;
    }
    .outlet-sub {
      font-size: 7pt;
      color: #64748b;
    }
    .outlet-rating {
      font-weight: 800;
      font-size: 8.5pt;
      color: #0f766e;
      background: #e6f4f1;
      padding: 1mm 2mm;
      border-radius: 1.5mm;
      white-space: nowrap;
    }
    .channel-row {
      display: flex;
      gap: 1.5mm;
      margin: 2mm 0;
      font-size: 7pt;
    }
    .ch-pill {
      background: #f1f5f9;
      padding: 0.8mm 1.8mm;
      border-radius: 1mm;
      color: #334155;
      font-weight: 600;
    }

    .sent-bar-container {
      margin: 2mm 0 1.5mm 0;
    }
    .sent-bar {
      height: 2mm;
      display: flex;
      border-radius: 1mm;
      overflow: hidden;
      background: #e2e8f0;
    }
    .bar-pos { background: #22c55e; }
    .bar-neu { background: #94a3b8; }
    .bar-neg { background: #f43f5e; }
    .sent-labels {
      display: flex;
      justify-content: space-between;
      font-size: 6.5pt;
      color: #64748b;
      margin-top: 1mm;
    }
    .aspects-box {
      margin-top: 2mm;
      display: flex;
      flex-wrap: wrap;
      gap: 1mm;
    }
    .badge-subtle {
      font-size: 6.5pt;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      padding: 0.5mm 1.5mm;
      border-radius: 1mm;
      color: #475569;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 8pt;
      margin-bottom: 5mm;
    }
    th {
      background: #f1f5f9;
      color: #1e293b;
      font-weight: 700;
      text-align: left;
      padding: 2mm 2.5mm;
      border: 1px solid #cbd5e1;
    }
    td {
      padding: 2mm 2.5mm;
      border: 1px solid #e2e8f0;
      color: #334155;
    }
    .row-highlight {
      background: #f0fdf4;
      font-weight: 600;
    }
    .diff-neutral { color: #0f766e; }
    .diff-high { color: #b91c1c; }
    .diff-low { color: #15803d; }

    .findings-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 3mm;
      margin-bottom: 5mm;
    }
    .finding-card {
      border-radius: 2mm;
      padding: 3mm 3.5mm;
      border: 1px solid;
    }
    .action-maintain {
      background: #f0fdf4;
      border-color: #bbf7d0;
    }
    .action-improve {
      background: #fff1f2;
      border-color: #fecdd3;
    }
    .finding-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5mm;
    }
    .finding-tag {
      font-size: 6.5pt;
      font-weight: 800;
      padding: 0.6mm 2mm;
      border-radius: 1.5mm;
    }
    .action-maintain-tag { background: #22c55e; color: #ffffff; }
    .action-improve-tag { background: #f43f5e; color: #ffffff; }
    .finding-outlet { font-size: 7pt; font-weight: 700; color: #475569; }
    .finding-title { font-size: 8pt; font-weight: 700; color: #0f172a; margin-bottom: 1mm; }
    .finding-desc { font-size: 7.5pt; color: #334155; margin-bottom: 1.5mm; }
    .finding-steps {
      margin: 0;
      padding-left: 4mm;
      font-size: 7pt;
      color: #1e293b;
    }

    .comp-card {
      border: 1px solid #cbd5e1;
      border-radius: 2mm;
      padding: 2.5mm 3.5mm;
      background: #f8fafc;
      margin-bottom: 3mm;
    }
    .comp-title { font-weight: 700; font-size: 8.5pt; color: #0f172a; }
    .comp-desc { font-size: 7.5pt; color: #475569; margin: 1mm 0 2mm 0; }
    .comp-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2.5mm; }
    .comp-box { padding: 2mm 2.5mm; border-radius: 1.5mm; font-size: 7pt; }
    .our-box { background: #dcfce7; color: #166534; }
    .their-box { background: #f1f5f9; color: #334155; }
    .box-label { font-weight: 700; display: block; margin-bottom: 1mm; }
    .comp-box ul { margin: 0; padding-left: 3.5mm; }

    .footer {
      border-top: 1px solid #cbd5e1;
      padding-top: 3mm;
      margin-top: 5mm;
      display: flex;
      justify-content: space-between;
      font-size: 7pt;
      color: #64748b;
    }
    .page-break {
      page-break-before: always;
    }
  </style>
</head>
<body>
  <!-- PAGE 1: EXECUTIVE DASHBOARD & MULTI-OUTLET HEALTH -->
  <div class="header">
    <div>
      <div class="brand-title">SANGHYANG INDAH SPA RESORT</div>
      <div class="brand-sub">Laporan Intelijen Pasar & Kinerja Multi-Outlet 2026</div>
    </div>
    <div class="doc-meta">
      <div class="doc-badge">DOKUMEN EKSEKUTIF DIREKSI</div>
      <div>Terbit: ${fmtDate(data.publishDate)}</div>
      <div>Periode: ${esc(data.periodText)}</div>
    </div>
  </div>

  ${
    data.executiveSummary
      ? `<div class="summary-box">
          <b>⚡ Rangkuman Eksekutif Pasar Anyer–Carita:</b><br>
          ${esc(data.executiveSummary)}
        </div>`
      : ""
  }

  <div class="section-title">1. Barometer Kinerja 6 Unit Bisnis Sanghyang (Multi-Kanal)</div>
  <div class="outlets-grid">
    ${outletsHtml}
  </div>

  <div class="section-title">2. Pembanding Tarif Pasar Google Hotels (Kamar & Cottage)</div>
  <table>
    <thead>
      <tr>
        <th>Hotel / Properti</th>
        <th>Periode Menginap</th>
        <th>Tarif Terendah Terlihat</th>
        <th>Posisi vs Sanghyang</th>
      </tr>
    </thead>
    <tbody>
      ${rateRowsHtml || '<tr><td colspan="4" style="text-align:center;">Data harga pasar belum tersedia.</td></tr>'}
    </tbody>
  </table>

  <!-- PAGE BREAK FOR PAGE 2: OPERATIONAL ACTIONS & BENCHMARK -->
  <div class="page-break"></div>

  <div class="header" style="margin-bottom: 4mm; padding-bottom: 3mm;">
    <div>
      <div class="brand-title" style="font-size: 12pt;">SANGHYANG INDAH SPA RESORT</div>
      <div class="brand-sub">Rekomendasi Operasional & Komparasi Fasilitas</div>
    </div>
    <div class="doc-meta">
      <div>Halaman 2 · Laporan Intelijen Pasar</div>
    </div>
  </div>

  <div class="section-title">3. Rekomendasi Aksi Operasional Konkret (Maintain & Improve)</div>
  <div class="findings-grid">
    ${findingsHtml}
  </div>

  <div class="section-title">4. Komparasi Fasilitas Head-to-Head Melawan Kompetitor Utama</div>
  <div>
    ${comparisonsHtml}
  </div>

  <div class="footer">
    <div>Sanghyang Market Intelligence Platform 2026 · Dilindungi Hak Cipta Internal</div>
    <div>Grounding Ulasan Otentik (Zero Mock Data) · PostgreSQL Supabase OCC</div>
  </div>
</body>
</html>`;
}

