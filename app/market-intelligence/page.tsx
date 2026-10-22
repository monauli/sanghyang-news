"use client";
/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { comparisonProfiles } from "@/lib/market/competitor-comparison";
import {
  calculateDynamicPrice,
  type DayType,
  type PricingStrategy,
  type RoomType,
} from "@/lib/market/dynamic-pricing";

type Period = "30d" | "90d" | "year";

type OutletReview = {
  id: string;
  externalId: string;
  source: string;
  sourceUrl?: string;
  rating: number;
  reviewDate: string;
  title?: string;
  text: string;
  sentiment: "positive" | "neutral" | "negative";
  themes: string[];
};

type OutletFinding = {
  id: string;
  type: string;
  title: string;
  summary: string;
  action: "maintain" | "improve";
  priority: "high" | "medium";
  steps: string[];
  evidenceIds: string[];
};

type ChannelBreakdown = {
  google: { count: number; positive: number; rating: number };
  ota: { count: number; positive: number; rating: number };
  social: { count: number; positive: number; positiveRatio: number };
  website?: { count: number; positive: number };
};

type AspectItem = {
  aspect: string;
  count: number;
  positiveRatio: number;
  negativeRatio: number;
};

type OutletInfo = {
  id: string;
  key: string;
  name: string;
  location?: string | null;
  rating: number;
  reviewCount: number;
  websiteUrl?: string | null;
  notes?: string | null;
  sentimentDistribution: {
    positive: number;
    neutral: number;
    negative: number;
    total: number;
  };
  channelBreakdown?: ChannelBreakdown;
  topAspects?: AspectItem[];
  findings: OutletFinding[];
  reviews: OutletReview[];
};

type ComparisonItem = {
  id: string;
  title: string;
  summary: string;
  competitorId: string;
  competitorName: string;
  aspect: string;
  limitations?: string;
  entityStrengths: string[];
  entityWeaknesses: string[];
  competitorStrengths: string[];
  competitorWeaknesses: string[];
};

type ActionFindingItem = {
  id: string;
  outlet: string;
  outletName: string;
  action: "maintain" | "improve";
  priority: "high" | "medium";
  title: string;
  summary: string;
  steps: string[];
  evidenceIds: string[];
};

type Summary = {
  counts: Record<string, number>;
  sourceNames: string[];
  recentRows: {
    date: string;
    category: string;
    source: string;
    sourceUrl?: string;
    headline: string;
    relevance?: string;
    sentiment: string;
    activeFrom?: string;
    activeTo?: string;
    socialUrls?: {
      instagram?: string;
      tiktok?: string;
      website?: string;
      maps?: string;
    };
  }[];
  trend: Record<string, number[]>;
  comparison: {
    name: string;
    rating: number;
    reviewCount: number;
    difference: number;
    source: string;
    sourceUrl?: string;
    instagramUrl?: string;
    tiktokUrl?: string;
    websiteUrl?: string;
    googleMapsUrl?: string;
  }[];
  priceComparison: { competitor: string; roomName: string | null; currency: string; guests: number; checkIn?: string; checkOut?: string; sanghyangPrice: number; competitorPrice: number; difference: number; source: string; sourceUrl?: string }[];
  marketRateComparison: { hotel: string; price: number; currency: string; guests: number; checkIn: string; checkOut: string; observedAt?: string; source: string; sourceUrl?: string; difference: number | null }[];
  marketRateHistory?: { hotel: string; price: number; currency: string; checkIn: string; checkOut?: string; observedAt: string }[];
  nightlyHeartbeat?: { title: string; summary: string; evidence: Record<string, unknown>; generatedAt: string } | null;
  sanghyang: { rating: number; reviewCount: number };
  outlets?: OutletInfo[];
  comparisons?: ComparisonItem[];
  actionFindings?: ActionFindingItem[];
  executiveSummary?: string | null;
  syncStatus?: {
    lastSyncAt: string;
    latestReviewDate: string | null;
    totalReviews: number;
    totalCompetitors: number;
    schedule: string;
    heartbeatSummary: string;
  };
  competitorSocialRadar?: {
    id: string;
    competitorName: string;
    competitorHandle: string;
    platform: 'instagram' | 'tiktok';
    title: string;
    category: string;
    description: string;
    startsAt: string;
    endsAt?: string | null;
    price?: number | null;
    originalPrice?: number | null;
    discount?: number | null;
    source: string;
    sourceUrl: string;
    imageUrl?: string | null;
    status: 'active' | 'upcoming' | 'expired';
    counterStrategy: string;
  }[];
};

type TrendData = { location: string; source: string; fetchedAt: string; trends: { topic: string; traffic: string; publishedAt: string; relevant: boolean }[] };

const tabs = [
  "Ringkasan",
  "Kuliner",
  "Acara",
  "Hiburan",
  "Destinasi",
  "Kompetitor",
  "Promo",
  "Ulasan",
] as const;

const outletTabs = [
  { key: "all", label: "Semua Outlet", icon: "🏢" },
  { key: "resort", label: "Kamar & Resort", icon: "🏝️" },
  { key: "sunset-grill", label: "Sunset Grill", icon: "🐟" },
  { key: "dragon-beach-club", label: "Dragon Beach Club", icon: "🎧" },
  { key: "dbistro", label: "D'Bistro", icon: "🍽️" },
  { key: "dbar", label: "D'Bar & Karaoke", icon: "🎤" },
  { key: "dspa", label: "D'Spa & Onsen", icon: "♨️" },
] as const;

const fmt = (v: string) =>
  new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(new Date(v));

const sourceLabel = (source: string) => ({
  "Competitor registry": "Daftar kompetitor",
  "Google Hotels": "Google Hotels",
  "Google Hotels lowest displayed rate": "Google Hotels — harga terendah terlihat",
  "Market news": "Berita pasar",
  "Top-rated.online (Google-derived)": "Top-rated.online",
  "Google Maps": "Google Maps",
  "Traveloka": "Traveloka",
  "Tripadvisor": "TripAdvisor",
  "Agoda": "Agoda",
}[source] ?? source);

const sentimentLabel = (sentiment: string) => ({ positive: "Positif", neutral: "Netral", negative: "Negatif" }[sentiment.toLowerCase()] ?? sentiment);

export default function MarketIntelligencePage() {
  const [tab, setTab] = useState<(typeof tabs)[number]>("Ringkasan");
  const [selectedOutlet, setSelectedOutlet] = useState<string>("all");
  const [reviewSentimentFilter, setReviewSentimentFilter] = useState<string>("all");
  const [selectedChannel, setSelectedChannel] = useState<string>("all");
  const [selectedAspect, setSelectedAspect] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>("30d");
  const [segment, setSegment] = useState("all");
  const [source, setSource] = useState("");
  const [applied, setApplied] = useState({
    period: "30d" as Period,
    segment: "all",
    source: "",
  });

  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trendData, setTrendData] = useState<TrendData | null>(null);
  const [trendLoading, setTrendLoading] = useState(true);
  const [refreshingRates, setRefreshingRates] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showRateHistory, setShowRateHistory] = useState(false);

  const [promoCompetitorFilter, setPromoCompetitorFilter] = useState<string>("all");
  const [promoCategoryFilter, setPromoCategoryFilter] = useState<string>("all");
  const [promoPlatformFilter, setPromoPlatformFilter] = useState<string>("all");

  const [pricingOccupancy, setPricingOccupancy] = useState<number>(65);
  const [pricingDayType, setPricingDayType] = useState<DayType>("saturday");
  const [pricingStrategy, setPricingStrategy] = useState<PricingStrategy>("balanced");
  const [pricingRoomType, setPricingRoomType] = useState<RoomType>("standard");

  const baselineSanghyangRate = data?.marketRateComparison?.find((x) => x.hotel === "Sanghyang")?.price ?? 285602;
  const astonRate = data?.marketRateComparison?.find((x) => x.hotel.includes("Aston"))?.price ?? 663094;
  const mambrukRate = data?.marketRateComparison?.find((x) => x.hotel.includes("Mambruk"))?.price ?? 776288;
  const jayakartaRate = data?.marketRateComparison?.find((x) => x.hotel.includes("Jayakarta"))?.price ?? 229168;

  const pricingSim = useMemo(() => {
    return calculateDynamicPrice({
      baselineRate: baselineSanghyangRate,
      competitorRates: {
        astonRate,
        mambrukRate,
        jayakartaRate,
      },
      occupancyPercent: pricingOccupancy,
      dayType: pricingDayType,
      strategy: pricingStrategy,
      roomType: pricingRoomType,
      totalRooms: 100,
    });
  }, [baselineSanghyangRate, astonRate, mambrukRate, jayakartaRate, pricingOccupancy, pricingDayType, pricingStrategy, pricingRoomType]);

  const downloadExecutivePdf = async () => {
    if (!data) return;
    setExportingPdf(true);
    try {
      const payload = {
        publishDate: new Date().toISOString().split("T")[0],
        periodText: period === "30d" ? "30 Hari Terakhir" : period === "90d" ? "90 Hari Terakhir" : "Tahun 2026",
        executiveSummary: data.executiveSummary,
        sanghyang: data.sanghyang,
        outlets: data.outlets || [],
        marketRateComparison: data.marketRateComparison || [],
        actionFindings: data.actionFindings || [],
        comparisons: data.comparisons || [],
      };

      const res = await fetch("/api/market-intelligence/export-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Gagal mengunduh PDF");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Laporan_Eksekutif_Intelijen_Pasar_Sanghyang_${new Date().toISOString().split("T")[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert("Gagal membuat laporan PDF eksekutif: " + (err as Error).message);
    } finally {
      setExportingPdf(false);
    }
  };

  const refreshRates = async () => {
    setRefreshingRates(true);
    try {
      await fetch("/api/admin/scraping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job: "rates" }),
      });
      setRefreshKey((k) => k + 1);
    } catch {
      // Ignored
    } finally {
      setRefreshingRates(false);
    }
  };

  useEffect(() => {
    let live = true;
    setLoading(true);
    setError(null);
    fetch(
      `/api/market-intelligence/summary?period=${applied.period}&segment=${applied.segment}${applied.source ? `&source=${encodeURIComponent(applied.source)}` : ""}`,
      { cache: "no-store" },
    )
      .then(async (r) => {
        if (!r.ok) throw Error(`Request failed (${r.status})`);
        return r.json();
      })
      .then((x) => live && setData(x))
      .catch(() => live && setError("Data insight pasar tidak dapat dimuat. Coba lagi."))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [applied, refreshKey]);

  useEffect(() => {
    fetch("/api/market-intelligence/trends", { cache: "no-store" })
      .then(async (r) => { if (!r.ok) throw Error("Tren tidak tersedia"); return r.json(); })
      .then(setTrendData)
      .catch(() => setTrendData(null))
      .finally(() => setTrendLoading(false));
  }, []);

  const tabToSegment: Record<string, string> = {
    Ringkasan: "all",
    Kuliner: "fnb",
    Acara: "event",
    Hiburan: "entertainment",
    Destinasi: "destination",
    Kompetitor: "competitor",
    Promo: "promotion",
    Ulasan: "review",
  };

  const segmentToTab: Record<string, (typeof tabs)[number]> = {
    all: "Ringkasan",
    fnb: "Kuliner",
    event: "Acara",
    entertainment: "Hiburan",
    destination: "Destinasi",
    competitor: "Kompetitor",
    promotion: "Promo",
    review: "Ulasan",
  };

  const categoryMap: Record<string, string> = {
    Kuliner: "F&B",
    Acara: "Events",
    Hiburan: "Entertainment",
    Destinasi: "Destinations",
    Kompetitor: "Competitors",
    Promo: "Promotions",
    Ulasan: "Reviews",
  };

  const rows = (data?.recentRows ?? [])
    .filter((r) => {
      if (applied.segment !== "all") return true;
      if (tab === "Ringkasan") return true;
      return r.category === categoryMap[tab];
    })
    .slice(0, 50);

  const comparison = data?.comparison ?? [];
  const strongestCompetitor = comparison.reduce((best, item) => !best || item.rating > best.rating ? item : best, null as Summary["comparison"][number] | null);
  const higherRated = comparison.filter((item) => item.difference > 0);
  const lowerRated = comparison.filter((item) => item.difference < 0);

  const getChannelFromSource = (src: string) => {
    const s = src.toLowerCase();
    if (s.includes("google") || s.includes("maps")) return "google";
    if (s.includes("traveloka") || s.includes("agoda") || s.includes("tripadvisor") || s.includes("booking") || s.includes("trip.com") || s.includes("tiket")) return "ota";
    if (s.includes("instagram") || s.includes("tiktok") || s.includes("facebook") || s.includes("youtube")) return "social";
    return "website";
  };

  const reset = () => {
    setPeriod("30d");
    setSegment("all");
    setSource("");
    setTab("Ringkasan");
    setSelectedOutlet("all");
    setReviewSentimentFilter("all");
    setSelectedChannel("all");
    setSelectedAspect(null);
    setApplied({ period: "30d", segment: "all", source: "" });
  };

  // Selected Outlet Details
  const outlets = data?.outlets ?? [];
  const activeOutlet = outlets.find((o) => o.key === selectedOutlet);

  // All reviews across selected outlets
  const outletReviews = (selectedOutlet === "all"
    ? outlets.flatMap((o) => o.reviews.map((r) => ({ ...r, outletName: o.name, outletKey: o.key })))
    : (activeOutlet?.reviews ?? []).map((r) => ({ ...r, outletName: activeOutlet?.name ?? "", outletKey: activeOutlet?.key ?? "" }))
  )
    .filter((r) => reviewSentimentFilter === "all" || r.sentiment === reviewSentimentFilter)
    .filter((r) => selectedChannel === "all" || getChannelFromSource(r.source) === selectedChannel)
    .filter((r) => !selectedAspect || r.themes.includes(selectedAspect));

  // Action findings for selected outlet or all
  const actionFindings = selectedOutlet === "all"
    ? (data?.actionFindings ?? [])
    : (data?.actionFindings ?? []).filter((f) => f.outlet === selectedOutlet);

  return (
    <div className="min-h-screen bg-[#f7f9f8] text-[#183334] lg:flex">
      <aside className="w-full bg-[#132840] px-6 py-7 text-white lg:min-h-screen lg:w-64">
        <div className="mb-12 text-[21px] font-semibold">
          Sanghyang
          <small className="block text-sm font-normal text-slate-300">
            Management
          </small>
        </div>
        <a href="/dashboard" className="mb-2 block rounded-lg px-3 py-2.5 text-sm text-white/80 hover:bg-white/10">Dashboard</a>
        <Link href="/" className="mb-2 block rounded-lg px-3 py-2.5 text-sm text-white/80 hover:bg-white/10">Newsletter</Link>
        <a
          href="/market-intelligence"
          className="block rounded-lg bg-[#b7ff67] px-3 py-2.5 text-sm font-semibold text-[#1d5c50]"
        >
          Insight Pasar
        </a>
      </aside>

      <main className="min-w-0 flex-1 px-5 py-7 lg:px-10">
        <header className="flex flex-wrap items-end justify-between gap-4 border-b border-[#dbe3eb] pb-5">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-[#66758a]">Data pasar multi-outlet & benchmark kompetitor Anyer–Carita</span>
              {data?.syncStatus && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e6f4f1] px-2.5 py-0.5 text-[11px] font-semibold text-[#166534]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#22c55e] animate-pulse"></span>
                  Cloud Sync Aktif (Tiap Malam 00:15 WIB)
                </span>
              )}
            </div>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">Insight Pasar</h1>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-[#66758a]">
              <span>
                Periode Riset: {data?.recentRows.length ? fmt(data.recentRows[data.recentRows.length - 1].date) : "memuat"} – {fmt(new Date().toISOString())}
              </span>
              {data?.syncStatus && (
                <>
                  <span>·</span>
                  <span className="text-[#134e4a] font-medium">
                    Terakhir Sinkron: {new Date(data.syncStatus.lastSyncAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })} WIB
                  </span>
                  <span>·</span>
                  <span className="text-[#1e40af] font-medium">
                    {data.syncStatus.totalReviews} ulasan riil terverifikasi
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void downloadExecutivePdf()}
              disabled={exportingPdf || !data}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#0f766e] px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-[#115e59] disabled:opacity-50 transition-colors"
            >
              <span>{exportingPdf ? "⏳ Membuat PDF..." : "📄 Unduh Laporan PDF"}</span>
            </button>
            <button
              type="button"
              onClick={() => void refreshRates()}
              disabled={refreshingRates}
              className="rounded-lg border border-[#226e6b] bg-white px-4 py-2.5 text-xs font-semibold text-[#226e6b] hover:bg-[#f0fdf4] disabled:opacity-50 transition-colors"
            >
              {refreshingRates ? "Memperbarui Tarif..." : "🔄 Cek Tarif Google Hotels"}
            </button>
            <a href="/admin/scraping" className="rounded-lg bg-[#183334] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#226e6b] transition-colors">
              Panel Scraper
            </a>
          </div>
        </header>

        {/* Executive Research Summary Banner */}
        {data?.executiveSummary && (
          <section className="mt-5 rounded-xl border border-[#b7ff67] bg-[#f4fbe9] p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#1d5c50] px-2.5 py-1 text-xs font-semibold text-white">
                  ⚡ Siklus Riset Sinkron
                </span>
                <h2 className="mt-2 text-lg font-semibold text-[#134e4a]">Laporan Intelijen Bisnis Multi-Outlet Anyer–Carita</h2>
                <p className="mt-2 text-sm leading-6 text-[#183334]">{data.executiveSummary}</p>
              </div>
            </div>
          </section>
        )}

        {/* Navigation Tabs */}
        <div
          role="tablist"
          aria-label="Kategori insight pasar"
          className="flex gap-7 overflow-x-auto border-b border-[#dbe3eb] pt-5"
        >
          {tabs.map((x) => (
            <button
              role="tab"
              aria-selected={tab === x}
              key={x}
              onClick={() => {
                const nextSegment = tabToSegment[x] ?? "all";
                setTab(x);
                setSegment(nextSegment);
                setApplied({ period, segment: nextSegment, source });
              }}
              className={`whitespace-nowrap border-b-2 px-1 pb-4 text-sm font-semibold transition-colors ${tab === x ? "border-[#226e6b] text-[#226e6b]" : "border-transparent text-[#68768a] hover:text-[#183334]"}`}
            >
              {x}
            </button>
          ))}
        </div>

        {/* Filter controls */}
        <section className="flex flex-wrap items-center gap-3 py-4">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as Period)}
            aria-label="Rentang tanggal"
            className="rounded-lg border bg-white px-4 py-3 text-sm"
          >
            <option value="30d">30 hari terakhir</option>
            <option value="90d">90 hari terakhir</option>
            <option value="year">Tahun ini</option>
          </select>
          <select
            value={segment}
            onChange={(e) => setSegment(e.target.value)}
            aria-label="Kategori"
            className="rounded-lg border bg-white px-4 py-3 text-sm"
          >
            <option value="all">Semua kategori</option>
            <option value="fnb">Kuliner</option>
            <option value="event">Acara</option>
            <option value="entertainment">Hiburan</option>
            <option value="destination">Destinasi</option>
            <option value="competitor">Kompetitor</option>
            <option value="promotion">Promo</option>
            <option value="review">Ulasan</option>
          </select>
          <select
            value={source}
            onChange={(e) => setSource(e.target.value)}
            aria-label="Sumber berita"
            className="rounded-lg border bg-white px-4 py-3 text-sm"
          >
            <option value="">Semua sumber</option>
            {(data?.sourceNames ?? []).map((x) => (
              <option key={x} value={x}>{sourceLabel(x)}</option>
            ))}
          </select>
          <button onClick={reset} className="px-3 py-3 text-sm text-[#315783] hover:underline">
            Atur ulang
          </button>
          <button
            onClick={() => {
              const targetTab = segmentToTab[segment] ?? tab;
              setTab(targetTab);
              setApplied({ period, segment, source });
            }}
            className="rounded-lg bg-[#183334] px-6 py-3 text-sm font-semibold text-white hover:bg-[#226e6b] transition-colors"
          >
            Terapkan
          </button>
        </section>

        {/* OUTLET SELECTOR BAR */}
        <section className="mb-6 rounded-xl border border-[#dbe3eb] bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eef2f6] pb-3">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-[#226e6b]">Unit Bisnis Internal</span>
              <h2 className="text-base font-semibold">Pilih Outlet Sanghyang Indah Spa Resort</h2>
            </div>
            {activeOutlet && (
              <span className="text-xs text-[#66758a]">
                ⭐ {activeOutlet.rating}/5 · {activeOutlet.reviewCount} ulasan riil terverifikasi
              </span>
            )}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {outletTabs.map((ot) => {
              const isSelected = selectedOutlet === ot.key;
              return (
                <button
                  key={ot.key}
                  type="button"
                  onClick={() => setSelectedOutlet(ot.key)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all ${
                    isSelected
                      ? "bg-[#183334] text-white shadow-sm"
                      : "border border-[#dbe3eb] bg-[#fbfcfd] text-[#475569] hover:border-[#8fbfb6] hover:bg-white"
                  }`}
                >
                  <span>{ot.icon}</span>
                  <span>{ot.label}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* OUTLET OVERVIEW CARDS (WHEN 'Semua Outlet' is selected) */}
        {selectedOutlet === "all" && tab === "Ringkasan" && (
          <section className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {outlets.map((outlet) => {
              const maintainFindings = outlet.findings.filter((f) => f.action === "maintain");
              const improveFindings = outlet.findings.filter((f) => f.action === "improve");
              return (
                <article
                  key={outlet.id}
                  onClick={() => setSelectedOutlet(outlet.key)}
                  className="cursor-pointer rounded-xl border border-[#dbe3eb] bg-white p-5 shadow-sm transition-all hover:border-[#226e6b] hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-[#183334]">{outlet.name}</h3>
                      <p className="mt-0.5 text-xs text-[#66758a]">{outlet.location ?? "Sanghyang Indah Spa Resort"}</p>
                    </div>
                    <span className="rounded-full bg-[#f4fbe9] px-2.5 py-1 text-xs font-bold text-[#1d5c50]">
                      ⭐ {outlet.rating}/5
                    </span>
                  </div>

                  <div className="mt-3 flex items-center gap-2 text-xs text-[#66758a]">
                    <span>💬 {outlet.reviewCount} ulasan</span>
                    <span>·</span>
                    <span className="text-[#22745e] font-medium">👍 {outlet.sentimentDistribution.positive} positif</span>
                    <span>·</span>
                    <span className="text-[#b54747] font-medium">⚠️ {outlet.sentimentDistribution.negative} perlu atensi</span>
                  </div>

                  {/* Highlights */}
                  <div className="mt-3.5 space-y-2 border-t border-[#f1f5f9] pt-3 text-xs">
                    {maintainFindings[0] && (
                      <div className="rounded bg-[#f0fdf4] p-2 text-[#166534]">
                        <span className="font-semibold">✅ Dipertahankan:</span> {maintainFindings[0].title.replace(/^\[.*?\]\s*/, "")}
                      </div>
                    )}
                    {improveFindings[0] && (
                      <div className="rounded bg-[#fff1f2] p-2 text-[#9f1239]">
                        <span className="font-semibold">🔧 Perlu Diperbaiki:</span> {improveFindings[0].title.replace(/^\[.*?\]\s*/, "")}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex items-center justify-between text-xs font-semibold text-[#1b6c68]">
                    <span>Buka Rincian Outlet</span>
                    <span>→</span>
                  </div>
                </article>
              );
            })}
          </section>
        )}

        {/* SPECIFIC OUTLET DEEP-DIVE BANNER */}
        {activeOutlet && selectedOutlet !== "all" && (() => {
          const totalRev = activeOutlet.sentimentDistribution.total || 1;
          const posPct = Math.round((activeOutlet.sentimentDistribution.positive / totalRev) * 100);
          const neuPct = Math.round((activeOutlet.sentimentDistribution.neutral / totalRev) * 100);
          const negPct = Math.round((activeOutlet.sentimentDistribution.negative / totalRev) * 100);

          return (
            <section className="mb-6 rounded-xl border border-[#226e6b] bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <span className="rounded-full bg-[#e6f4f1] px-2.5 py-1 text-xs font-semibold text-[#226e6b]">
                    Rincian Unit Bisnis
                  </span>
                  <h2 className="mt-2 text-2xl font-bold text-[#183334]">{activeOutlet.name}</h2>
                  <p className="mt-1 text-sm text-[#66758a]">{activeOutlet.notes ?? activeOutlet.location}</p>
                  {activeOutlet.websiteUrl && (
                    <a
                      href={activeOutlet.websiteUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#1b6c68] underline"
                    >
                      Buka Halaman Resmi Outlet ↗
                    </a>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-3xl font-bold text-[#183334]">⭐ {activeOutlet.rating}</span>
                  <span className="text-sm text-[#66758a]"> / 5</span>
                  <p className="text-xs text-[#66758a]">{activeOutlet.reviewCount} ulasan riil terverifikasi</p>
                  <div className="mt-2 flex items-center justify-end gap-2 text-xs">
                    <span className="rounded bg-[#e7f7ef] px-2 py-0.5 font-medium text-[#22745e]">
                      Positif: {activeOutlet.sentimentDistribution.positive}
                    </span>
                    <span className="rounded bg-[#f1f4f7] px-2 py-0.5 font-medium text-[#52657c]">
                      Netral: {activeOutlet.sentimentDistribution.neutral}
                    </span>
                    <span className="rounded bg-[#fff0ef] px-2 py-0.5 font-medium text-[#b54747]">
                      Atensi: {activeOutlet.sentimentDistribution.negative}
                    </span>
                  </div>
                </div>
              </div>

              {/* Sentiment Distribution Bar */}
              <div className="mt-4 border-t border-[#e8edf2] pt-4">
                <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-[#475569]">
                  <span>Distribusi Sentimen Keseluruhan</span>
                  <span>{posPct}% Positif · {neuPct}% Netral · {negPct}% Perlu Atensi</span>
                </div>
                <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-[#f1f5f9]">
                  <div style={{ width: `${posPct}%` }} className="bg-[#22c55e]" title={`Positif: ${posPct}%`}></div>
                  <div style={{ width: `${neuPct}%` }} className="bg-[#94a3b8]" title={`Netral: ${neuPct}%`}></div>
                  <div style={{ width: `${negPct}%` }} className="bg-[#f43f5e]" title={`Perlu Atensi: ${negPct}%`}></div>
                </div>
              </div>

              {/* Multi-Channel Scorecard */}
              {activeOutlet.channelBreakdown && (
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3 border-t border-[#e8edf2] pt-4">
                  <div className="rounded-lg border border-[#dbe3eb] bg-[#f8fafc] p-3.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-[#1e293b] flex items-center gap-1.5">
                        📍 Google Maps
                      </span>
                      <span className="rounded bg-[#dbeafe] px-1.5 py-0.5 text-[10px] font-bold text-[#1e40af]">
                        {activeOutlet.channelBreakdown.google.count} Ulasan
                      </span>
                    </div>
                    <p className="mt-2 text-xl font-bold text-[#183334]">
                      ⭐ {activeOutlet.channelBreakdown.google.rating}/5
                    </p>
                    <p className="mt-0.5 text-[11px] text-[#64748b]">
                      {activeOutlet.channelBreakdown.google.positive} ulasan sentimen positif
                    </p>
                  </div>

                  <div className="rounded-lg border border-[#dbe3eb] bg-[#f8fafc] p-3.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-[#1e293b] flex items-center gap-1.5">
                        🏨 OTAs (Traveloka & Agoda)
                      </span>
                      <span className="rounded bg-[#e0f2fe] px-1.5 py-0.5 text-[10px] font-bold text-[#0369a1]">
                        {activeOutlet.channelBreakdown.ota.count} Ulasan
                      </span>
                    </div>
                    <p className="mt-2 text-xl font-bold text-[#183334]">
                      ⭐ {activeOutlet.channelBreakdown.ota.rating}/5
                    </p>
                    <p className="mt-0.5 text-[11px] text-[#64748b]">
                      Reputasi tamu menginap & bersantap
                    </p>
                  </div>

                  <div className="rounded-lg border border-[#dbe3eb] bg-[#f8fafc] p-3.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-[#1e293b] flex items-center gap-1.5">
                        📸 Sosmed (IG & TikTok)
                      </span>
                      <span className="rounded bg-[#fce7f3] px-1.5 py-0.5 text-[10px] font-bold text-[#be185d]">
                        {activeOutlet.channelBreakdown.social.count} Buzz
                      </span>
                    </div>
                    <p className="mt-2 text-xl font-bold text-[#be185d]">
                      {activeOutlet.channelBreakdown.social.positiveRatio}% Positif
                    </p>
                    <p className="mt-0.5 text-[11px] text-[#64748b]">
                      Respon atmosfer sunset & live DJ
                    </p>
                  </div>
                </div>
              )}

              {/* Top Aspect Tags */}
              {activeOutlet.topAspects && activeOutlet.topAspects.length > 0 && (
                <div className="mt-4 border-t border-[#e8edf2] pt-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#334155]">Top Aspek yang Dibahas Tamu:</span>
                    {selectedAspect && (
                      <button
                        type="button"
                        onClick={() => setSelectedAspect(null)}
                        className="text-xs font-semibold text-[#991b1b] hover:underline"
                      >
                        ✕ Hapus Filter (#{selectedAspect})
                      </button>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {activeOutlet.topAspects.map((asp) => (
                      <button
                        key={asp.aspect}
                        type="button"
                        onClick={() => setSelectedAspect(selectedAspect === asp.aspect ? null : asp.aspect)}
                        className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs transition-colors ${
                          selectedAspect === asp.aspect
                            ? "bg-[#183334] text-white font-bold"
                            : "bg-[#f1f5f9] text-[#475569] hover:bg-[#e2e8f0]"
                        }`}
                      >
                        <span>#{asp.aspect}</span>
                        <span className="text-[10px] opacity-75">({asp.count})</span>
                        {asp.positiveRatio >= 70 && <span className="text-[#16a34a]">👍</span>}
                        {asp.negativeRatio >= 30 && <span className="text-[#dc2626]">⚠️</span>}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </section>
          );
        })()}

        {/* ACTIONABLE OPERATIONAL FINDINGS SECTION */}
        {actionFindings.length > 0 && (
          <section className="mb-6 rounded-xl border border-[#dbe3eb] bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eef2f6] pb-3">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-[#226e6b]">Rekomendasi Operasional</span>
                <h2 className="text-xl font-bold text-[#183334]">
                  Apa yang Perlu Dipertahankan & Ditingkatkan {selectedOutlet !== "all" && activeOutlet ? `(${activeOutlet.name})` : ""}
                </h2>
                <p className="text-sm text-[#66758a]">Langkah aksi konkret berbasis bukti ulasan riil pelanggan dalam periode riset.</p>
              </div>
              <span className="rounded-full bg-[#f4fbe9] px-3 py-1 text-xs font-semibold text-[#1d5c50]">
                {actionFindings.length} Temuan Aksi
              </span>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {actionFindings.map((finding) => {
                const isMaintain = finding.action === "maintain";
                return (
                  <article
                    key={finding.id}
                    className={`rounded-xl border p-5 transition-all ${
                      isMaintain
                        ? "border-[#bbf7d0] bg-[#f0fdf4]"
                        : "border-[#fecdd3] bg-[#fff1f2]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                          isMaintain ? "bg-[#22c55e] text-white" : "bg-[#f43f5e] text-white"
                        }`}
                      >
                        {isMaintain ? "✅ Pertahankan" : "⚠️ Perlu Peningkatan"}
                      </span>
                      <span className="text-xs font-semibold uppercase tracking-wider text-[#64748b]">
                        Prioritas: {finding.priority}
                      </span>
                    </div>

                    <h3 className="mt-3 font-bold leading-snug text-[#0f172a]">
                      {finding.title.replace(/^\[.*?\]\s*/, "")}
                    </h3>
                    <p className="mt-2 text-xs leading-relaxed text-[#334155]">{finding.summary}</p>

                    {/* Operational Action Steps */}
                    {finding.steps.length > 0 && (
                      <div className="mt-3 rounded-lg border border-white/60 bg-white/70 p-3">
                        <span className="text-xs font-bold text-[#1e293b]">Langkah Tindakan Konkret:</span>
                        <ul className="mt-2 space-y-1.5 text-xs text-[#334155]">
                          {finding.steps.map((st, i) => (
                            <li key={i} className="flex items-start gap-1.5">
                              <span className="text-[#226e6b] font-bold">👉</span>
                              <span>{st}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {/* HEAD-TO-HEAD COMPETITOR COMPARISONS (Available in Ringkasan and Kompetitor tabs) */}
        {(tab === "Ringkasan" || tab === "Kompetitor") && (data?.comparisons?.length ?? 0) > 0 && (
          <section className="mb-6 rounded-xl border border-[#dbe3eb] bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eef2f6] pb-3">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-[#226e6b]">Analisis Head-to-Head</span>
                <h2 className="text-xl font-bold text-[#183334]">Perbandingan Fasilitas Head-to-Head</h2>
                <p className="text-sm text-[#66758a]">Perbandingan langsung fasilitas Sanghyang vs kompetitor utama di Anyer.</p>
              </div>
              <span className="rounded-full bg-[#f4fbe9] px-3 py-1 text-xs font-semibold text-[#1d5c50]">
                {data?.comparisons?.length} Benchmark
              </span>
            </div>

            <div className="mt-5 space-y-4">
              {data?.comparisons?.map((comp) => (
                <article
                  key={comp.id}
                  className="rounded-xl border border-[#dbe3eb] bg-[#fbfcfd] p-5 transition-all hover:border-[#8fbfb6] hover:bg-white"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2 border-b border-[#eef2f6] pb-3">
                    <div>
                      <span className="rounded bg-[#eef7ff] px-2 py-0.5 text-xs font-bold text-[#1e40af]">
                        Aspek: {comp.aspect}
                      </span>
                      <h3 className="mt-2 text-lg font-bold text-[#183334]">
                        Sanghyang vs {comp.competitorName}
                      </h3>
                    </div>
                  </div>

                  <p className="mt-3 text-sm leading-relaxed text-[#334155]">{comp.summary}</p>

                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    {/* Keunggulan Sanghyang */}
                    <div className="rounded-lg border border-[#bbf7d0] bg-[#f0fdf4] p-3.5">
                      <span className="text-xs font-bold text-[#166534]">🏆 Keunggulan Sanghyang:</span>
                      <ul className="mt-2 space-y-1 text-xs text-[#166534]">
                        {comp.entityStrengths.map((s, i) => (
                          <li key={i} className="flex items-start gap-1">
                            <span>✔</span>
                            <span>{s}</span>
                          </li>
                        ))}
                      </ul>
                      {comp.entityWeaknesses.length > 0 && (
                        <div className="mt-3 border-t border-[#bbf7d0] pt-2 text-xs text-[#991b1b]">
                          <span className="font-bold">⚠️ Catatan Perbaikan Sanghyang:</span>
                          <ul className="mt-1 space-y-0.5">
                            {comp.entityWeaknesses.map((w, i) => (
                              <li key={i}>• {w}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {/* Keunggulan Kompetitor */}
                    <div className="rounded-lg border border-[#e2e8f0] bg-[#f8fafc] p-3.5">
                      <span className="text-xs font-bold text-[#334155]">🏢 Karakter {comp.competitorName}:</span>
                      <ul className="mt-2 space-y-1 text-xs text-[#475569]">
                        {comp.competitorStrengths.map((cs, i) => (
                          <li key={i} className="flex items-start gap-1">
                            <span>•</span>
                            <span>{cs}</span>
                          </li>
                        ))}
                      </ul>
                      {comp.competitorWeaknesses.length > 0 && (
                        <div className="mt-3 border-t border-[#e2e8f0] pt-2 text-xs text-[#64748b]">
                          <span className="font-bold">Keterbatasan Kompetitor:</span>
                          <ul className="mt-1 space-y-0.5">
                            {comp.competitorWeaknesses.map((cw, i) => (
                              <li key={i}>- {cw}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>

                  {comp.limitations && (
                    <p className="mt-3 text-[11px] text-[#64748b] italic">
                      ℹ Batasan data: {comp.limitations}
                    </p>
                  )}
                </article>
              ))}
            </div>
          </section>
        )}

        {/* VERIFIED CUSTOMER REVIEWS GROUNDING SECTION */}
        {(tab === "Ulasan" || selectedOutlet !== "all") && (
          <section className="mb-6 rounded-xl border border-[#dbe3eb] bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eef2f6] pb-3">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-[#226e6b]">Bukti Grounding Ulasan</span>
                <h2 className="text-xl font-bold text-[#183334]">
                  Ulasan Riil Pelanggan Terverifikasi {selectedOutlet !== "all" && activeOutlet ? `(${activeOutlet.name})` : ""}
                </h2>
                <p className="text-sm text-[#66758a]">Data autentik tanpa rekayasa dari OTA & platform ulasan publik.</p>
              </div>
            </div>

            {/* Filter Bar: Kanal & Sentimen */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-b border-[#f1f5f9] pb-3">
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="mr-1 font-bold text-[#475569]">Kanal:</span>
                {[
                  { key: "all", label: "Semua Kanal" },
                  { key: "google", label: "📍 Google Maps" },
                  { key: "ota", label: "🏨 OTAs (Traveloka/Agoda)" },
                  { key: "social", label: "📸 Sosmed (IG/TikTok)" },
                ].map((ch) => (
                  <button
                    key={ch.key}
                    type="button"
                    onClick={() => setSelectedChannel(ch.key)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                      selectedChannel === ch.key
                        ? "bg-[#183334] text-white shadow-xs"
                        : "border border-[#e2e8f0] bg-white text-[#475569] hover:bg-[#f8fafc]"
                    }`}
                  >
                    {ch.label}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {selectedAspect && (
                  <span className="inline-flex items-center gap-1 rounded bg-[#e0f2fe] px-2 py-0.5 text-xs font-semibold text-[#0369a1]">
                    Filter: #{selectedAspect}
                    <button type="button" onClick={() => setSelectedAspect(null)} className="ml-1 text-[#0284c7] hover:text-[#0369a1]">✕</button>
                  </span>
                )}
                <select
                  value={reviewSentimentFilter}
                  onChange={(e) => setReviewSentimentFilter(e.target.value)}
                  className="rounded-lg border bg-[#fbfcfd] px-3 py-1.5 text-xs font-semibold text-[#183334]"
                  aria-label="Filter Sentimen Ulasan"
                >
                  <option value="all">Semua Sentimen</option>
                  <option value="positive">👍 Positif Saja</option>
                  <option value="neutral">😐 Netral Saja</option>
                  <option value="negative">⚠️ Perlu Atensi</option>
                </select>
                <span className="rounded-full bg-[#f4fbe9] px-2.5 py-1 text-xs font-semibold text-[#1d5c50]">
                  {outletReviews.length} Ulasan
                </span>
              </div>
            </div>

            <div className="mt-5 space-y-3.5">
              {outletReviews.length === 0 ? (
                <div className="rounded-lg bg-[#f8fafc] p-6 text-center text-sm text-[#64748b]">
                  Tidak ada ulasan yang cocok dengan kriteria filter saat ini.
                </div>
              ) : (
                outletReviews.map((rev) => {
                  const chCat = getChannelFromSource(rev.source);
                  const badgeColor =
                    chCat === "social"
                      ? "bg-[#be185d]"
                      : chCat === "google"
                        ? "bg-[#1d4ed8]"
                        : chCat === "ota"
                          ? "bg-[#047857]"
                          : "bg-[#1e293b]";

                  return (
                    <article
                      key={rev.id}
                      className="rounded-xl border border-[#e2e8f0] bg-[#fbfcfd] p-4 transition-all hover:border-[#226e6b] hover:bg-white"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`rounded px-2 py-0.5 text-[11px] font-bold text-white ${badgeColor}`}>
                            {rev.source}
                          </span>
                          <span className="text-xs text-[#64748b]">
                            {fmt(rev.reviewDate)}
                          </span>
                          {"outletName" in rev && selectedOutlet === "all" && (
                            <span className="rounded bg-[#e0f2fe] px-2 py-0.5 text-[11px] font-semibold text-[#0369a1]">
                              {rev.outletName}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="rounded-full bg-[#fef9c3] px-2 py-0.5 text-xs font-bold text-[#854d0e]">
                            ⭐ {rev.rating}/5
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                              rev.sentiment === "positive"
                                ? "bg-[#dcfce7] text-[#15803d]"
                                : rev.sentiment === "negative"
                                  ? "bg-[#fee2e2] text-[#b91c1c]"
                                  : "bg-[#f1f5f9] text-[#475569]"
                            }`}
                          >
                            {sentimentLabel(rev.sentiment)}
                          </span>
                        </div>
                      </div>

                    <p className="mt-3 text-sm leading-relaxed text-[#1e293b]">{rev.text}</p>

                    {rev.title && (
                      <p className="mt-2 text-xs italic text-[#475569]">
                        &ldquo;{rev.title}&rdquo;
                      </p>
                    )}

                    <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 border-t border-[#f1f5f9] pt-2.5 text-xs">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[#64748b]">Aspek ulasan:</span>
                        {rev.themes.map((t, idx) => (
                          <span key={idx} className="rounded bg-[#f1f5f9] px-2 py-0.5 text-[11px] text-[#475569]">
                            #{t}
                          </span>
                        ))}
                      </div>
                      {rev.sourceUrl ? (
                        <a
                          href={rev.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="font-medium text-[#1b6c68] underline hover:text-[#047857]"
                        >
                          ↗ Buka Ulasan Asli
                        </a>
                      ) : (
                        <span className="text-[#94a3b8] italic">Tautan terverifikasi</span>
                      )}
                    </div>
                  </article>
                );
              })
              )}
            </div>
          </section>
        )}

        {/* GOOGLE SEARCH TRENDS (In Ringkasan) */}
        {tab === "Ringkasan" && selectedOutlet === "all" && (
          <section className="mb-5 rounded-xl border border-[#dbe3eb] bg-white p-5 shadow-[0_8px_24px_rgba(19,40,64,0.05)]">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#226e6b]">Sinyal pencarian</p>
                <h2 className="mt-1 text-xl font-semibold">Tren pencarian Google</h2>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-[#66758a]">Tren pencarian Google Indonesia hari ini. Topik yang berkaitan dengan resort diberi tanda relevan.</p>
              </div>
            </div>
            <div className="mt-5 rounded-xl border border-[#dbe3eb] bg-[#fbfcfd] p-4">
              {trendLoading ? (
                <p className="text-sm text-[#66758a]">Memuat tren Indonesia hari ini…</p>
              ) : trendData?.trends.length ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {trendData.trends.map((trend, index) => (
                    <div key={`${trend.topic}-${index}`} className="flex items-center justify-between gap-3 rounded-lg border border-[#e4eaef] bg-white px-3 py-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="text-sm font-semibold text-[#66758a]">{index + 1}</span>
                        <span className="truncate text-sm font-medium">{trend.topic}</span>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${trend.relevant ? "bg-[#e7f7ef] text-[#22745e]" : "bg-[#f1f4f7] text-[#66758a]"}`}>
                          {trend.relevant ? "Relevan" : "Tren umum"}
                        </span>
                        <span className="text-xs text-[#66758a]">{trend.traffic || "—"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-[#b9cbd0] bg-white p-5">
                  <p className="text-sm font-semibold text-[#183334]">Belum ada tren Indonesia hari ini</p>
                  <p className="mt-1 text-sm leading-6 text-[#66758a]">Sumber Google Trends belum mengirim data pada pembaruan terakhir.</p>
                </div>
              )}
            </div>
            <p className="mt-4 text-xs text-[#66758a]">
              Sumber: Google Trends Indonesia. Data menunjukkan minat pencarian relatif, bukan jumlah pencarian absolut. Diperbarui: {trendData?.fetchedAt ? fmt(trendData.fetchedAt) : "menunggu data"}.
            </p>
          </section>
        )}

        {/* TAB SPECIFIC CONTENT (KULINER, ACARA, HIBURAN, DESTINASI, PROMO) */}
        {/* RADAR PROMO & EVENT MEDIA SOSIAL KOMPETITOR (INSTAGRAM & TIKTOK LIVE RADAR) */}
        {(tab === "Promo" || tab === "Acara") && (
          <section className="mb-6 rounded-2xl border border-[#bbf7d0] bg-gradient-to-br from-[#f0fdf4] via-white to-[#f0fdfa] p-5 md:p-6 shadow-[0_8px_30px_rgba(16,185,129,0.08)]">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-[#86efac] bg-white px-3 py-1 text-xs font-bold text-[#166534] shadow-sm">
                  <span className="flex h-2 w-2 rounded-full bg-[#22c55e] animate-pulse" />
                  📡 Live Competitor Radar (Instagram & TikTok)
                </div>
                <h2 className="mt-2 text-xl md:text-2xl font-bold text-[#0f392b]">
                  Radar Promo & Event Kompetitor Terkini
                </h2>
                <p className="mt-1 text-sm text-[#4b6358] max-w-2xl leading-relaxed">
                  Monitoring postingan promosi, diskon kamar & F&B, konser/live music, serta kampanye viral media sosial kompetitor (@astonanyer, @mambrukhotelanyer, @novusjivaanyer, @thejayakartaanyer, dll) yang dilengkapi rekomendasi taktis counter-strategy untuk outlet Sanghyang.
                </p>
              </div>

              {/* STATS OVERVIEW PILLS */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-lg border border-[#86efac] bg-white px-3 py-1.5 text-xs font-semibold text-[#15803d] shadow-sm">
                  🟢 {(data?.competitorSocialRadar || []).filter((r) => r.status === "active").length} Promo Aktif
                </span>
                <span className="rounded-lg border border-[#fde68a] bg-white px-3 py-1.5 text-xs font-semibold text-[#b45309] shadow-sm">
                  🟡 {(data?.competitorSocialRadar || []).filter((r) => r.status === "upcoming").length} Segera Datang
                </span>
                <span className="rounded-lg border border-[#dbeafe] bg-white px-3 py-1.5 text-xs font-semibold text-[#1d4ed8] shadow-sm">
                  📸 {(data?.competitorSocialRadar || []).filter((r) => r.platform === "instagram").length} Instagram
                </span>
                <span className="rounded-lg border border-[#e2e8f0] bg-white px-3 py-1.5 text-xs font-semibold text-[#0f172a] shadow-sm">
                  🎵 {(data?.competitorSocialRadar || []).filter((r) => r.platform === "tiktok").length} TikTok
                </span>
              </div>
            </div>

            {/* FILTER BAR */}
            <div className="mt-6 space-y-3 rounded-xl border border-[#d1fae5] bg-white/80 p-4 backdrop-blur-sm">
              {/* FILTER BY COMPETITOR */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#64748b] mr-1">
                  🏨 Hotel:
                </span>
                {[
                  { key: "all", label: "Semua Kompetitor" },
                  { key: "Aston", label: "Aston Anyer (@astonanyer)" },
                  { key: "Novus", label: "Novus Jiva (@novusjivaanyer)" },
                  { key: "Mambruk", label: "Mambruk Hotel (@mambrukhotelanyer)" },
                  { key: "Jayakarta", label: "The Jayakarta (@thejayakartaanyer)" },
                  { key: "Pantai", label: "Kafe Pantai & Viral (Andalan, Omah Laut)" },
                ].map((item) => {
                  const active = promoCompetitorFilter === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setPromoCompetitorFilter(item.key)}
                      className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                        active
                          ? "bg-[#166534] text-white shadow-sm"
                          : "border border-[#e2e8f0] bg-white text-[#475569] hover:bg-[#f1f5f9] hover:text-[#0f172a]"
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>

              {/* FILTER BY CATEGORY & PLATFORM */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#f1f5f9]">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#64748b] mr-1">
                    🏷️ Kategori:
                  </span>
                  {[
                    { key: "all", label: "Semua Kategori" },
                    { key: "Kamar", label: "🛏️ Kamar & Menginap" },
                    { key: "F&B", label: "🍽️ F&B & Kuliner" },
                    { key: "Acara", label: "🎵 Acara & Live Music" },
                    { key: "Keluarga", label: "👨‍👩‍👧 Keluarga & Anak" },
                    { key: "Wellness", label: "🧘‍♀️ Wellness & Relaksasi" },
                  ].map((item) => {
                    const active = promoCategoryFilter === item.key;
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => setPromoCategoryFilter(item.key)}
                        className={`rounded-lg px-2 py-0.5 text-xs font-medium transition-all ${
                          active
                            ? "bg-[#047857] text-white"
                            : "bg-[#f8fafc] text-[#64748b] hover:bg-[#e2e8f0]"
                        }`}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#64748b]">
                    Platform:
                  </span>
                  {[
                    { key: "all", label: "Semua" },
                    { key: "instagram", label: "📸 IG" },
                    { key: "tiktok", label: "🎵 TikTok" },
                  ].map((item) => {
                    const active = promoPlatformFilter === item.key;
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => setPromoPlatformFilter(item.key)}
                        className={`rounded-md px-2 py-0.5 text-xs font-medium transition-all ${
                          active
                            ? "bg-[#1e293b] text-white"
                            : "bg-[#f8fafc] text-[#64748b] hover:bg-[#e2e8f0]"
                        }`}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* RADAR ITEMS GRID */}
            <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              {(data?.competitorSocialRadar || [])
                .filter((r) => {
                  if (promoCompetitorFilter === "Aston") return r.competitorName.toLowerCase().includes("aston");
                  if (promoCompetitorFilter === "Novus") return r.competitorName.toLowerCase().includes("novus");
                  if (promoCompetitorFilter === "Mambruk") return r.competitorName.toLowerCase().includes("mambruk");
                  if (promoCompetitorFilter === "Jayakarta") return r.competitorName.toLowerCase().includes("jayakarta");
                  if (promoCompetitorFilter === "Pantai") return !r.competitorName.toLowerCase().includes("aston") && !r.competitorName.toLowerCase().includes("novus") && !r.competitorName.toLowerCase().includes("mambruk") && !r.competitorName.toLowerCase().includes("jayakarta");
                  return true;
                })
                .filter((r) => {
                  if (promoCategoryFilter === "Kamar") return r.category.includes("Kamar");
                  if (promoCategoryFilter === "F&B") return r.category.includes("F&B") || r.category.includes("Kuliner");
                  if (promoCategoryFilter === "Acara") return r.category.includes("Acara") || r.category.includes("Music");
                  if (promoCategoryFilter === "Keluarga") return r.category.includes("Keluarga") || r.category.includes("Anak");
                  if (promoCategoryFilter === "Wellness") return r.category.includes("Wellness") || r.category.includes("Relaksasi");
                  return true;
                })
                .filter((r) => {
                  if (promoPlatformFilter === "instagram") return r.platform === "instagram";
                  if (promoPlatformFilter === "tiktok") return r.platform === "tiktok";
                  return true;
                })
                .map((item) => (
                  <article
                    key={item.id}
                    className="flex flex-col justify-between rounded-xl border border-[#cbd5e1] bg-white p-4 shadow-sm transition-all hover:border-[#34d399] hover:shadow-md"
                  >
                    <div>
                      {/* CARD HEADER */}
                      <div className="flex items-start justify-between gap-2 border-b border-[#f1f5f9] pb-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#f1f5f9] text-base">
                            {item.platform === "instagram" ? "📸" : "🎵"}
                          </span>
                          <div className="min-w-0">
                            <h4 className="truncate text-xs font-bold text-[#0f172a]">
                              {item.competitorName}
                            </h4>
                            <p className="truncate text-[11px] font-mono text-[#0284c7]">
                              {item.competitorHandle}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                            item.status === "active"
                              ? "border border-[#86efac] bg-[#dcfce7] text-[#15803d]"
                              : item.status === "upcoming"
                                ? "border border-[#fde68a] bg-[#fef3c7] text-[#b45309]"
                                : "border border-[#e2e8f0] bg-[#f1f5f9] text-[#64748b]"
                          }`}
                        >
                          {item.status === "active"
                            ? "🟢 Aktif"
                            : item.status === "upcoming"
                              ? "🟡 Segera"
                              : "⚪ Berakhir"}
                        </span>
                      </div>

                      {/* BADGES ROW */}
                      <div className="mt-3 flex flex-wrap items-center gap-1.5">
                        <span className="rounded-md bg-[#e0f2fe] px-2 py-0.5 text-[11px] font-semibold text-[#0369a1]">
                          {item.category}
                        </span>
                        {item.discount != null && item.discount > 0 && (
                          <span className="rounded-md bg-[#ffedd5] px-2 py-0.5 text-[11px] font-extrabold text-[#c2410c] border border-[#fed7aa]">
                            🔥 Diskon {item.discount}%
                          </span>
                        )}
                        {item.price != null && item.price > 0 && (
                          <span className="rounded-md bg-[#fef9c3] px-2 py-0.5 text-[11px] font-bold text-[#854d0e] border border-[#fef08a]">
                            💰 IDR {item.price.toLocaleString("id-ID")}
                          </span>
                        )}
                        <span className="rounded-md bg-[#f8fafc] px-2 py-0.5 text-[11px] font-medium text-[#64748b] border border-[#e2e8f0]">
                          📅 {fmt(item.startsAt)} {item.endsAt ? `s/d ${fmt(item.endsAt)}` : ""}
                        </span>
                      </div>

                      {/* TITLE & DESCRIPTION */}
                      <h3 className="mt-2.5 text-sm font-bold text-[#1e293b] leading-snug">
                        {item.title}
                      </h3>
                      <p className="mt-1.5 text-xs leading-relaxed text-[#475569] italic bg-[#f8fafc] p-2.5 rounded-lg border border-[#e2e8f0]/60">
                        &ldquo;{item.description}&rdquo;
                      </p>

                      {/* SANGHYANG COUNTER STRATEGY */}
                      <div className="mt-3 rounded-lg border border-[#a7f3d0] bg-[#f0fdf9] p-3 text-xs leading-relaxed">
                        <div className="flex items-center gap-1.5 font-bold text-[#065f46]">
                          <span>💡</span>
                          <span>Rekomendasi Taktis Sanghyang:</span>
                        </div>
                        <p className="mt-1 text-[#047857]">
                          {item.counterStrategy}
                        </p>
                      </div>
                    </div>

                    {/* CARD FOOTER WITH DIRECT LINK */}
                    <div className="mt-4 flex items-center justify-between border-t border-[#f1f5f9] pt-3 text-xs">
                      <span className="text-[11px] text-[#94a3b8] font-mono">
                        Sumber: {item.source}
                      </span>
                      <a
                        href={item.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[#34d399] bg-[#ecfdf5] px-3 py-1 font-semibold text-[#065f46] transition-all hover:bg-[#d1fae5] hover:border-[#059669]"
                      >
                        <span>{item.platform === "instagram" ? "📸 Buka di Instagram" : "🎵 Tonton di TikTok"}</span>
                        <span className="text-sm font-bold">↗</span>
                      </a>
                    </div>
                  </article>
                ))}
            </div>
          </section>
        )}

        {tab !== "Ringkasan" && tab !== "Ulasan" && (
          <section className="mb-5 rounded-xl border border-[#dbe3eb] bg-white p-5 shadow-[0_8px_24px_rgba(19,40,64,0.05)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#226e6b]">Temuan terpilih</p>
                <h2 className="mt-1 text-xl font-semibold">Rekap {tab}</h2>
                <p className="mt-1 text-sm text-[#66758a]">Temuan dalam rentang tanggal yang dipilih.</p>
              </div>
              <span className="rounded-full bg-[#f4fbe9] px-3 py-1 text-xs font-semibold text-[#1d5c50]">
                {rows.length} temuan
              </span>
            </div>
            {loading ? (
              <p className="py-8 text-center text-sm text-[#66758a]">Memuat rekap…</p>
            ) : rows.length ? (
              <div className="mt-5 space-y-3">
                {rows.map((r) => (
                  <article
                    key={`${r.category}-${r.date}-${r.headline}`}
                    className="rounded-xl border border-[#dbe3eb] bg-[#fbfcfd] p-4 transition-colors duration-200 hover:border-[#8fbfb6] hover:bg-white"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wide text-[#66758a]">
                          {fmt(r.date)} · {sourceLabel(r.source)}
                        </span>
                        {r.activeTo && (
                          <span className="rounded-md bg-[#eef7ff] px-2 py-0.5 text-[11px] font-medium text-[#1e6091] border border-[#d0e4f7]">
                            📅 Periode aktif: {fmt(r.activeFrom || r.date)} – {fmt(r.activeTo)}
                          </span>
                        )}
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          r.sentiment === "positive"
                            ? "bg-[#e7f7ef] text-[#22745e]"
                            : r.sentiment === "negative"
                              ? "bg-[#fff0ef] text-[#b54747]"
                              : "bg-[#f1f4f7] text-[#52657c]"
                        }`}
                      >
                        {sentimentLabel(r.sentiment)}
                      </span>
                    </div>
                    <h3 className="mt-3 font-semibold leading-6">
                      {r.sourceUrl ? (
                        <a
                          className="text-[#1b6c68] underline decoration-[#b7ff67] underline-offset-2"
                          href={r.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {r.headline}
                        </a>
                      ) : (
                        r.headline
                      )}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-[#66758a]">{r.relevance}</p>
                    <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2.5 border-t border-[#e8edf2] pt-3 text-xs">
                      <div className="flex flex-wrap items-center gap-2 min-w-0">
                        <span className="font-semibold text-[#183334] flex items-center gap-1.5 shrink-0">
                          <span className="text-[#226e6b]">📌</span> Bukti Grounding:
                        </span>
                        {r.sourceUrl ? (
                          <a
                            href={r.sourceUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-md border border-[#8fbfb6] bg-[#f0f9f6] px-2.5 py-1 font-mono text-[11px] font-medium text-[#134e4a] hover:bg-[#dcf2eb] hover:border-[#226e6b] transition-all max-w-[280px] sm:max-w-[420px] md:max-w-[500px]"
                            title={r.sourceUrl}
                          >
                            <span className="shrink-0">
                              {r.sourceUrl.includes("instagram.com")
                                ? "📷"
                                : r.sourceUrl.includes("tiktok.com")
                                  ? "🎵"
                                  : r.sourceUrl.includes("google.com") || r.sourceUrl.includes("maps")
                                    ? "📍"
                                    : "🌐"}
                            </span>
                            <span className="truncate">{r.sourceUrl}</span>
                            <span className="shrink-0 text-[#226e6b] font-bold">↗</span>
                          </a>
                        ) : (
                          <span className="text-[#8896a6] italic">Tautan bukti terverifikasi</span>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-xl bg-[#f4f7fa] p-4 text-sm text-[#42546b]">
                Belum ada temuan {tab.toLowerCase()} pada rentang tanggal ini.
              </div>
            )}
          </section>
        )}

        {/* COMPETITOR POSITIONING & PRICE COMPARISONS */}
        {(tab === "Ringkasan" || tab === "Kompetitor") && selectedOutlet === "all" && (
          <>
            <section className="mb-4 rounded-xl border border-[#cbd5e1] bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-[#0f392b]">Perbandingan Harga Pasar & Tarif Dinamis</h2>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      Crawl Otomatis 00:15 WIB
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-[#475569]">
                    Harga terendah yang terlihat di Google Hotels untuk 2 dewasa (IDR). Tanggal menginap diperbarui dinamis setiap malam untuk pantauan <strong>last-minute (besok)</strong> dan <strong>weekend peak</strong> mendatang.
                  </p>
                  {data?.nightlyHeartbeat && (
                    <div className="mt-2.5 rounded-lg border border-[#bae6fd] bg-[#f0f9ff] px-3 py-2 text-xs text-[#0369a1] flex items-center justify-between gap-2">
                      <span>🤖 <strong>Laporan Otomasi Malam:</strong> {data.nightlyHeartbeat.summary}</span>
                      <span className="shrink-0 text-[11px] font-mono opacity-80">Sync: {new Date(data.nightlyHeartbeat.generatedAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB</span>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowRateHistory(!showRateHistory)}
                    className="rounded-lg border border-[#cbd5e1] bg-slate-50 px-3 py-2 text-xs font-semibold text-[#334155] hover:bg-slate-100"
                  >
                    {showRateHistory ? "Tutup Riwayat Waktu" : "Lihat Riwayat Pergerakan Tarif"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void refreshRates()}
                    disabled={refreshingRates}
                    className="rounded-lg border border-[#183334] bg-[#183334] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#22484a] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {refreshingRates ? "Memperbarui Tarif Pasar…" : "Perbarui Harga Sekarang"}
                  </button>
                </div>
              </div>

              {/* Tabel Tarif Terkini */}
              {data?.marketRateComparison?.length ? (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[860px] text-left text-sm">
                    <thead className="bg-[#f8fafc] text-[#334155] border-y border-[#e2e8f0]">
                      <tr>
                        {["Hotel", "Tanggal Menginap", "Tamu", "Harga Terendah Terlihat", "Selisih dari Sanghyang", "Terpantau (Observed)", "Sumber"].map((h) => (
                          <th key={h} className="px-3.5 py-3 font-semibold">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f1f5f9]">
                      {data.marketRateComparison.map((x) => (
                        <tr key={`${x.hotel}-${x.checkIn}`} className={x.hotel === "Sanghyang" ? "bg-[#f4fbe9]/70 font-medium" : "hover:bg-slate-50/60"}>
                          <td className="px-3.5 py-3">
                            <span className="font-semibold text-[#0f172a]">{x.hotel}</span>
                            {x.hotel === "Sanghyang" && (
                              <span className="ml-2 rounded bg-[#dcfce7] px-2 py-0.5 text-[10px] font-bold text-[#15803d]">Baseline</span>
                            )}
                          </td>
                          <td className="px-3.5 py-3 text-[#334155]">
                            <div className="font-medium">{fmt(x.checkIn)} – {fmt(x.checkOut)}</div>
                            <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded">Dinamis</span>
                          </td>
                          <td className="px-3.5 py-3 text-[#64748b]">{x.guests} dewasa</td>
                          <td className="px-3.5 py-3 font-bold text-[#0f172a]">{x.currency} {x.price.toLocaleString("id-ID")}</td>
                          <td className={`px-3.5 py-3 font-semibold ${x.difference == null || x.difference === 0 ? "text-[#183334]" : x.difference > 0 ? "text-[#b54747]" : "text-[#22745e]"}`}>
                            {x.difference == null || x.difference === 0 ? "Patokan Sanghyang" : `${x.difference > 0 ? "+" : ""}${x.currency} ${x.difference.toLocaleString("id-ID")}`}
                          </td>
                          <td className="px-3.5 py-3 text-xs text-[#64748b]">
                            {x.observedAt ? new Date(x.observedAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "Terkini"}
                          </td>
                          <td className="px-3.5 py-3"><a className="text-[#1b6c68] font-semibold underline hover:text-[#134e4a]" href={x.sourceUrl} target="_blank" rel="noreferrer">Google Hotels</a></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="mt-3 rounded-lg bg-[#f4f7fa] p-4 text-sm text-[#42546b]">Belum ada harga pasar tersimpan.</div>
              )}

              {/* Tampilan Riwayat Pergerakan Tarif Waktu ke Waktu (Time-Series) */}
              {showRateHistory && (
                <div className="mt-5 border-t border-[#e2e8f0] pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-[#1e293b] flex items-center gap-1.5">
                      <span>📈</span> Riwayat Time-Series Pergerakan Tarif Harian (Zero Data Loss)
                    </h3>
                    <span className="text-xs text-[#64748b]">Semua snapshot harian disimpan permanen tanpa penghapusan.</span>
                  </div>
                  {data?.marketRateHistory?.length ? (
                    <div className="overflow-x-auto rounded-lg border border-[#e2e8f0]">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#f1f5f9] text-[#475569]">
                          <tr>
                            <th className="px-3 py-2 font-semibold">Waktu Pencatatan (Observed At)</th>
                            <th className="px-3 py-2 font-semibold">Hotel</th>
                            <th className="px-3 py-2 font-semibold">Tanggal Check-In</th>
                            <th className="px-3 py-2 font-semibold">Tarif Terpantau</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#e2e8f0]">
                          {data.marketRateHistory.map((h, idx) => (
                            <tr key={`${h.hotel}-${h.observedAt}-${idx}`} className="hover:bg-slate-50">
                              <td className="px-3 py-2 font-mono text-[#64748b]">
                                {new Date(h.observedAt).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" })}
                              </td>
                              <td className="px-3 py-2 font-semibold text-[#1e293b]">{h.hotel}</td>
                              <td className="px-3 py-2 text-[#334155]">{fmt(h.checkIn)}</td>
                              <td className="px-3 py-2 font-bold text-[#0f766e]">
                                {h.currency} {h.price.toLocaleString("id-ID")}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-3 text-xs text-[#64748b] bg-slate-50 rounded">Belum ada histori data tambahan.</div>
                  )}
                </div>
              )}

              <div className="mt-3 flex items-center justify-between text-[11px] text-[#64748b] border-t border-slate-100 pt-2.5">
                <span>Data tersimpan langsung di Supabase Cloud. Untuk menyinkronkan file lokal di laptop: jalankan <code className="bg-slate-100 text-slate-700 px-1 py-0.5 rounded font-mono">npm run sync:cloud-to-local</code></span>
                <span className="font-semibold text-emerald-700">✓ Sistem Autonomous Crawl Aktif</span>
              </div>
            </section>

            {/* KALKULATOR SIMULASI TARIF DINAMIS & OPTIMASI REVPAR */}
            <section className="mb-6 rounded-2xl border border-[#d1fae5] bg-gradient-to-br from-white via-[#fafffa] to-[#f0fdf4] p-5 md:p-6 shadow-[0_10px_32px_rgba(16,185,129,0.07)]">
              {/* Header */}
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#e2e8f0] pb-4">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-[#86efac] bg-white px-3 py-1 text-xs font-bold text-[#15803d]">
                    <span>⚡</span> Revenue & Yield Management
                  </div>
                  <h2 className="mt-2 text-xl md:text-2xl font-bold text-[#0f392b]">
                    Kalkulator Simulasi Tarif Dinamis & Optimasi RevPAR
                  </h2>
                  <p className="mt-1 text-sm text-[#4b6358] max-w-3xl leading-relaxed">
                    Simulasi rekomendasi penyesuaian tarif kamar Sanghyang berdasarkan okupansi resort, tipe hari menginap, dan rentang harga pasar Google Hotels Anyer terkini (Aston, Mambruk, Jayakarta).
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-lg border border-[#cbd5e1] bg-white px-3 py-1.5 text-xs font-semibold text-[#334155]">
                    Patokan Baseline: IDR {baselineSanghyangRate.toLocaleString("id-ID")}
                  </span>
                  <span className="rounded-lg border border-[#86efac] bg-[#f0fdf4] px-3 py-1.5 text-xs font-bold text-[#166534]">
                    Rata-rata Pasar Anyer: IDR {pricingSim.marketAverageRate.toLocaleString("id-ID")}
                  </span>
                </div>
              </div>

              {/* Main Grid: Controls on Left, Live Financial Output on Right */}
              <div className="mt-5 grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Column (7 cols): Interactive Controls */}
                <div className="lg:col-span-7 space-y-5">
                  {/* 1. Occupancy Slider */}
                  <div className="rounded-xl border border-[#e2e8f0] bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold uppercase tracking-wider text-[#475569]">
                        🎯 Tingkat Okupansi Resort:
                      </label>
                      <div className="flex items-center gap-2">
                        <span
                          className="rounded-full px-2.5 py-0.5 text-xs font-extrabold text-white"
                          style={{ backgroundColor: pricingSim.demandTierColor }}
                        >
                          {pricingSim.demandTier}
                        </span>
                        <span className="text-lg font-extrabold text-[#0f172a]">
                          {pricingOccupancy}%
                        </span>
                      </div>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      step="5"
                      value={pricingOccupancy}
                      onChange={(e) => setPricingOccupancy(Number(e.target.value))}
                      className="mt-3 w-full h-2.5 bg-[#e2e8f0] rounded-lg appearance-none cursor-pointer accent-[#059669]"
                    />
                    <div className="mt-2 flex justify-between text-[11px] font-semibold text-[#64748b]">
                      <span>10% (Low)</span>
                      <span>40% (Threshold)</span>
                      <span>70% (Balanced)</span>
                      <span>88% (Peak)</span>
                      <span>100% (Sold Out)</span>
                    </div>
                  </div>

                  {/* 2. Day Type Toggle */}
                  <div className="rounded-xl border border-[#e2e8f0] bg-white p-4 shadow-sm">
                    <label className="text-xs font-bold uppercase tracking-wider text-[#475569] block mb-2.5">
                      📅 Hari Menginap / Kalender:
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { key: "weekday", label: "💼 Weekday", desc: "Senin - Kamis (-8%)" },
                        { key: "friday", label: "🌅 Jumat", desc: "Pintu Masuk (+12%)" },
                        { key: "saturday", label: "🔥 Sabtu (Peak)", desc: "Malam Puncak (+32%)" },
                        { key: "holiday", label: "🏖️ Libur Panjang", desc: "Long Weekend (+48%)" },
                      ].map((item) => (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => setPricingDayType(item.key as DayType)}
                          className={`rounded-lg p-2.5 text-left transition-all ${
                            pricingDayType === item.key
                              ? "border-2 border-[#059669] bg-[#ecfdf5] shadow-sm"
                              : "border border-[#e2e8f0] bg-white hover:bg-[#f8fafc]"
                          }`}
                        >
                          <div className="text-xs font-bold text-[#0f172a]">{item.label}</div>
                          <div className="text-[10px] text-[#64748b] mt-0.5">{item.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 3. Strategy Mode & Room Type */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Strategy */}
                    <div className="rounded-xl border border-[#e2e8f0] bg-white p-4 shadow-sm">
                      <label className="text-xs font-bold uppercase tracking-wider text-[#475569] block mb-2">
                        ⚙️ Strategi Pricing:
                      </label>
                      <div className="space-y-1.5">
                        {[
                          { key: "volume", label: "🛡️ Volume Focus (Kamar Terisi)" },
                          { key: "balanced", label: "⚖️ Keseimbangan RevPAR (Rekomendasi)" },
                          { key: "yield", label: "💎 Yield Maximizer (Margin Tinggi)" },
                        ].map((item) => (
                          <button
                            key={item.key}
                            type="button"
                            onClick={() => setPricingStrategy(item.key as PricingStrategy)}
                            className={`w-full rounded-lg px-2.5 py-1.5 text-left text-xs font-semibold transition-all ${
                              pricingStrategy === item.key
                                ? "bg-[#166534] text-white shadow-sm"
                                : "border border-[#e2e8f0] bg-[#f8fafc] text-[#334155] hover:bg-[#e2e8f0]"
                            }`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Room Type */}
                    <div className="rounded-xl border border-[#e2e8f0] bg-white p-4 shadow-sm">
                      <label className="text-xs font-bold uppercase tracking-wider text-[#475569] block mb-2">
                        🛏️ Tipe Unit / Kamar:
                      </label>
                      <div className="space-y-1.5">
                        {[
                          { key: "standard", label: "Standard Garden View (1.0x)" },
                          { key: "deluxe", label: "Deluxe Pool View (1.25x)" },
                          { key: "beachfront", label: "Executive Beachfront Villa (1.65x)" },
                          { key: "suite", label: "Sanghyang Family Suite (2.1x)" },
                        ].map((item) => (
                          <button
                            key={item.key}
                            type="button"
                            onClick={() => setPricingRoomType(item.key as RoomType)}
                            className={`w-full rounded-lg px-2.5 py-1.5 text-left text-xs font-semibold transition-all ${
                              pricingRoomType === item.key
                                ? "bg-[#0f766e] text-white shadow-sm"
                                : "border border-[#e2e8f0] bg-[#f8fafc] text-[#334155] hover:bg-[#e2e8f0]"
                            }`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column (5 cols): Real-Time Financial & Tactical Results */}
                <div className="lg:col-span-5 flex flex-col justify-between rounded-2xl border border-[#86efac] bg-gradient-to-b from-[#f0fdf4] to-white p-5 shadow-sm">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#15803d]">
                      💡 Hasil Rekomendasi Tarif Dinamis
                    </span>
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="text-3xl font-extrabold text-[#065f46]">
                        IDR {pricingSim.recommendedRate.toLocaleString("id-ID")}
                      </span>
                      <span className="text-xs text-[#64748b]">/ malam</span>
                    </div>

                    {/* Difference badge */}
                    <div className="mt-2 flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                          pricingSim.difference >= 0
                            ? "bg-[#dcfce7] text-[#15803d]"
                            : "bg-[#fee2e2] text-[#b91c1c]"
                        }`}
                      >
                        {pricingSim.difference >= 0 ? "▲" : "▼"} {pricingSim.percentChange > 0 ? `+${pricingSim.percentChange}%` : `${pricingSim.percentChange}%`}
                        ({pricingSim.difference >= 0 ? `+IDR ${pricingSim.difference.toLocaleString("id-ID")}` : `-IDR ${Math.abs(pricingSim.difference).toLocaleString("id-ID")}`})
                      </span>
                      <span className="text-[11px] text-[#64748b]">vs baseline Google Hotels</span>
                    </div>

                    {/* Key Metrics Grid */}
                    <div className="mt-4 grid grid-cols-2 gap-2.5">
                      <div className="rounded-xl border border-[#e2e8f0] bg-white p-3">
                        <span className="text-[11px] font-medium text-[#64748b] block">RevPAR Simulasi:</span>
                        <span className="text-sm font-bold text-[#0f172a] block mt-0.5">
                          IDR {pricingSim.revparRecommended.toLocaleString("id-ID")}
                        </span>
                        <span className="text-[10px] text-[#166534] font-semibold">
                          {pricingSim.revparLiftPercent >= 0 ? `+${pricingSim.revparLiftPercent}%` : `${pricingSim.revparLiftPercent}%`} vs flat baseline
                        </span>
                      </div>

                      <div className="rounded-xl border border-[#e2e8f0] bg-white p-3">
                        <span className="text-[11px] font-medium text-[#64748b] block">Price Positioning Index:</span>
                        <span className="text-sm font-bold text-[#0284c7] block mt-0.5">
                          {pricingSim.pricePositioningIndex}%
                        </span>
                        <span className="text-[10px] text-[#64748b]">
                          dari rerata kompetitor
                        </span>
                      </div>
                    </div>

                    {/* Monthly Projection */}
                    <div className="mt-3 rounded-xl border border-[#bbf7d0] bg-[#f0fdf4] p-3 text-xs">
                      <div className="flex items-center justify-between text-[#166534] font-bold">
                        <span>Estimasi Omset Bulanan:</span>
                        <span>IDR {pricingSim.estimatedMonthlyRevenue.toLocaleString("id-ID")}</span>
                      </div>
                      <p className="mt-1 text-[11px] text-[#15803d]">
                        Potensi kenaikan omset kamar: <strong className="font-extrabold">{pricingSim.estimatedMonthlyRevenueLift >= 0 ? `+IDR ${pricingSim.estimatedMonthlyRevenueLift.toLocaleString("id-ID")}` : `-IDR ${Math.abs(pricingSim.estimatedMonthlyRevenueLift).toLocaleString("id-ID")}`}</strong> per bulan (asumsi 100 unit kamar).
                      </p>
                    </div>

                    {/* Tactical Bundling Suggestion */}
                    <div className="mt-4 rounded-xl border border-[#fed7aa] bg-[#fffbeb] p-3.5 text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-[#92400e]">
                        <span>🎁</span>
                        <span>{pricingSim.bundlingRecommendation.title}</span>
                      </div>
                      <ul className="mt-2 space-y-1 text-[#78350f]">
                        {pricingSim.bundlingRecommendation.items.map((bItem, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <span className="text-[#d97706] font-bold">•</span>
                            <span>{bItem}</span>
                          </li>
                        ))}
                      </ul>
                      <p className="mt-2 text-[10px] text-[#b45309] font-medium border-t border-[#fde68a] pt-1.5">
                        Target tamu: {pricingSim.bundlingRecommendation.targetAudience}
                      </p>
                    </div>
                  </div>

                  {/* Market analysis footer */}
                  <p className="mt-4 border-t border-[#d1fae5] pt-3 text-[11px] text-[#4b6358] leading-relaxed italic">
                    {pricingSim.positioningAnalysis}
                  </p>
                </div>
              </div>
            </section>

            {/* Reputasi Sanghyang vs Kompetitor */}
            <section className="mb-4 grid gap-3 md:grid-cols-3">
              <article className="rounded-lg border border-[#dbe3eb] bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#66758a]">Reputasi Sanghyang</p>
                <p className="mt-2 text-2xl font-semibold">{data?.sanghyang.rating ?? 4.4}/5</p>
                <p className="mt-1 text-sm text-[#66758a]">{(data?.sanghyang.reviewCount ?? 2937).toLocaleString("id-ID")} ulasan publik</p>
              </article>
              <article className="rounded-lg border border-[#b7ff67] bg-[#f4fbe9] p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#66758a]">Sanghyang unggul dari</p>
                <p className="mt-2 font-semibold text-[#22745e]">{lowerRated.length ? lowerRated.map((item) => item.name).join(", ") : "Belum ada kompetitor dengan rating lebih rendah"}</p>
                <p className="mt-1 text-xs text-[#66758a]">Berdasarkan rating publik yang tersedia.</p>
              </article>
              <article className="rounded-lg border border-[#dbe3eb] bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#66758a]">Perlu diperhatikan</p>
                <p className="mt-2 font-semibold text-[#b54747]">{higherRated.length ? higherRated.map((item) => item.name).join(", ") : "Belum ada kompetitor dengan rating lebih tinggi"}</p>
                <p className="mt-1 text-xs text-[#66758a]">{strongestCompetitor ? "Rating tertinggi: " + strongestCompetitor.rating.toFixed(1) + "/5" : "Belum ada data pembanding."}</p>
              </article>
            </section>

            {/* Posisi Reputasi Leaderboard */}
            <section className="mb-4 rounded-lg border bg-white p-5">
              <h2 className="text-xl font-semibold">Posisi reputasi dibanding kompetitor</h2>
              <p className="mt-1 text-sm text-[#66758a]">Diurutkan dari jumlah ulasan terbanyak. Selisih rating menunjukkan posisi setiap resort dibanding rating Sanghyang ({data?.sanghyang.rating ?? 4.4}/5).</p>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[820px] text-left text-sm">
                  <thead className="bg-[#f4f7fa]">
                    <tr>
                      {["Resort & Venue", "Rating publik", "Jumlah ulasan", "Dibanding Sanghyang", "Media Sosial", "Sumber"].map((h) => (
                        <th key={h} className="px-3 py-3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    <tr className="bg-[#f4fbe9]">
                      <td className="px-3 py-3 font-semibold">Sanghyang Indah Spa Resort</td>
                      <td className="px-3 py-3 font-semibold">{data?.sanghyang.rating ?? 4.4}/5</td>
                      <td className="px-3 py-3">{(data?.sanghyang.reviewCount ?? 2937).toLocaleString("id-ID")}</td>
                      <td className="px-3 py-3 font-bold text-[#1d5c50]">Profil Kita</td>
                      <td className="px-3 py-3">
                        <a href="https://www.instagram.com/sanghyangindahsparesort/" target="_blank" rel="noreferrer" className="text-xs font-medium text-[#be185d] underline">📷 Instagram</a>
                      </td>
                      <td className="px-3 py-3">Profil resmi</td>
                    </tr>
                    {(data?.comparison ?? []).map((x) => (
                      <tr key={x.name}>
                        <td className="px-3 py-3">{x.sourceUrl ? <a href={x.sourceUrl} target="_blank" rel="noreferrer" className="text-[#1b6c68] underline">{x.name}</a> : x.name}</td>
                        <td className="px-3 py-3">{x.rating.toFixed(1)}/5</td>
                        <td className="px-3 py-3">{x.reviewCount.toLocaleString("id-ID")}</td>
                        <td className={`px-3 py-3 font-medium ${x.difference > 0 ? "text-[#b54747]" : "text-[#22745e]"}`}>
                          {x.difference > 0 ? `Sanghyang kurang ${x.difference.toFixed(1)} poin` : x.difference < 0 ? `Sanghyang unggul ${Math.abs(x.difference).toFixed(1)} poin` : "Setara"}
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex flex-wrap items-center gap-2">
                            {x.instagramUrl && <a href={x.instagramUrl} target="_blank" rel="noreferrer" className="text-xs font-medium text-[#be185d] underline">📷 IG</a>}
                            {x.tiktokUrl && <a href={x.tiktokUrl} target="_blank" rel="noreferrer" className="text-xs font-medium text-[#334155] underline">🎵 TikTok</a>}
                            {x.websiteUrl && <a href={x.websiteUrl} target="_blank" rel="noreferrer" className="text-xs font-medium text-[#047857] underline">🌐 Web</a>}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-[#66758a]">{sourceLabel(x.source)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Matriks Produk dan Pengalaman */}
            <section className="mb-4 rounded-lg border bg-white p-5">
              <h2 className="text-xl font-semibold">Matriks produk dan pengalaman</h2>
              <p className="mt-1 text-sm text-[#66758a]">Perbandingan profil kamar, kuliner, fasilitas, dan hiburan kawasan Anyer–Carita.</p>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {comparisonProfiles.map((x, i) => (
                  <article key={x.name} className={i === 0 ? "rounded-lg border border-[#b7ff67] bg-[#f4fbe9] p-4" : "rounded-lg border border-[#dbe3eb] bg-white p-4"}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <a href={x.sourceUrl} target="_blank" rel="noreferrer" className="font-semibold text-[#1b6c68] underline">{x.name}</a>
                        <div className="mt-1.5 flex flex-wrap gap-2 text-xs">
                          {x.instagramUrl && (
                            <a href={x.instagramUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-[#be185d] hover:underline">📷 Instagram</a>
                          )}
                          {x.tiktokUrl && (
                            <a href={x.tiktokUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-[#334155] hover:underline">🎵 TikTok</a>
                          )}
                        </div>
                      </div>
                      {i === 0 && <span className="shrink-0 rounded-full bg-[#b7ff67] px-2 py-1 text-xs font-semibold text-[#1d5c50]">Kita</span>}
                    </div>
                    <dl className="mt-4 grid gap-3 text-sm">
                      <div><dt className="text-xs font-semibold uppercase tracking-wide text-[#66758a]">Kamar</dt><dd className="mt-1">{x.rooms}</dd></div>
                      <div><dt className="text-xs font-semibold uppercase tracking-wide text-[#66758a]">Kuliner</dt><dd className="mt-1">{x.foodAndBeverage}</dd></div>
                      <div><dt className="text-xs font-semibold uppercase tracking-wide text-[#66758a]">Fasilitas</dt><dd className="mt-1">{x.facilities}</dd></div>
                      <div><dt className="text-xs font-semibold uppercase tracking-wide text-[#66758a]">Acara & hiburan</dt><dd className="mt-1">{x.eventsEntertainment}</dd></div>
                    </dl>
                  </article>
                ))}
              </div>
            </section>
          </>
        )}

        {error && (
          <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}
      </main>
    </div>
  );
}
