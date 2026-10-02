"use client";
/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from "react";
import Link from "next/link";
import { sanghyangProfile } from "@/lib/market/sanghyang-profile";
import { comparisonProfiles } from "@/lib/market/competitor-comparison";
type Period = "30d" | "90d" | "year";
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
  }[];
  trend: Record<string, number[]>;
  comparison: { name: string; rating: number; reviewCount: number; difference: number; source: string; sourceUrl?: string }[];
  priceComparison: { competitor: string; roomName: string | null; currency: string; guests: number; checkIn?: string; checkOut?: string; sanghyangPrice: number; competitorPrice: number; difference: number; source: string; sourceUrl?: string }[];
  marketRateComparison: { hotel: string; price: number; currency: string; guests: number; checkIn: string; checkOut: string; source: string; sourceUrl?: string; difference: number | null }[];
  sanghyang: { rating: number; reviewCount: number };
};
type TrendData = { location: string; source: string; fetchedAt: string; trends: { topic: string; traffic: string; publishedAt: string; relevant: boolean }[] };
const tabs = [
  "Ringkasan",
  "Kuliner",
  "Acara",
  "Hiburan",
  "Kompetitor",
  "Promo",
  "Ulasan",
] as const;
const fmt = (v: string) =>
  new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(new Date(v));
const categoryLabel: Record<string, string> = {
  "F&B": "Kuliner",
  Events: "Acara",
  Entertainment: "Hiburan",
  Competitors: "Kompetitor",
  Promotions: "Promo",
  Reviews: "Ulasan",
  Destinations: "Destinasi",
};
const sourceLabel = (source: string) => ({
  "Competitor registry": "Daftar kompetitor",
  "Google Hotels": "Google Hotels",
  "Google Hotels lowest displayed rate": "Google Hotels — harga terendah terlihat",
  "Market news": "Berita pasar",
  "Top-rated.online (Google-derived)": "Top-rated.online",
}[source] ?? source);
const sentimentLabel = (sentiment: string) => ({ positive: "Positif", neutral: "Netral", negative: "Negatif" }[sentiment.toLowerCase()] ?? sentiment);
export default function MarketIntelligencePage() {
  const [tab, setTab] = useState<(typeof tabs)[number]>("Ringkasan");
  const [period, setPeriod] = useState<Period>("30d"),
    [segment, setSegment] = useState("all"),
    [source, setSource] = useState(""),
    [applied, setApplied] = useState({
      period: "30d" as Period,
      segment: "all",
      source: "",
    });
  const [data, setData] = useState<Summary | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState<string | null>(null);
  const [trendData, setTrendData] = useState<TrendData | null>(null), [trendLoading, setTrendLoading] = useState(true);
  const [refreshingRates, setRefreshingRates] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

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
  const rows = (data?.recentRows ?? [])
    .filter((r) => tab === "Ringkasan" || r.category === ({ Kuliner: "F&B", Acara: "Events", Hiburan: "Entertainment", Kompetitor: "Competitors", Promo: "Promotions", Ulasan: "Reviews" } as Record<string, string>)[tab])
    .slice(0, 8);
  const comparison = data?.comparison ?? [];
  const strongestCompetitor = comparison.reduce((best, item) => !best || item.rating > best.rating ? item : best, null as Summary["comparison"][number] | null);
  const higherRated = comparison.filter((item) => item.difference > 0);
  const lowerRated = comparison.filter((item) => item.difference < 0);
  const reset = () => {
    setPeriod("30d");
    setSegment("all");
    setSource("");
    setApplied({ period: "30d", segment: "all", source: "" });
  };
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
            <p className="text-sm text-[#66758a]">Data pasar untuk keputusan yang lebih cepat</p>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">Insight Pasar</h1>
            <p className="mt-3 text-sm text-[#66758a]">Periode: {data?.recentRows.length ? fmt(data.recentRows[data.recentRows.length - 1].date) : "belum ada data"} – {fmt(new Date().toISOString())}</p>
          </div>
          <a href="/admin/scraping" className="rounded-lg bg-[#183334] px-5 py-3 text-sm font-semibold text-white hover:bg-[#226e6b]">Perbarui Data</a>
        </header>
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
                const nextSegment = ({ Kuliner: "fnb", Acara: "event", Hiburan: "entertainment", Kompetitor: "competitor", Promo: "promotion", Ulasan: "review" } as Record<string, string>)[x] ?? "all";
                setTab(x);
                setSegment(nextSegment);
                setApplied({ period, segment: nextSegment, source });
              }}
              className={`whitespace-nowrap border-b-2 px-1 pb-4 text-sm font-semibold ${tab === x ? "border-[#226e6b] text-[#226e6b]" : "border-transparent text-[#68768a]"}`}
            >
              {x}
            </button>
          ))}
        </div>
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
          <button onClick={reset} className="px-3 py-3 text-sm text-[#315783]">
            Atur ulang
          </button>
          <button
            onClick={() => setApplied({ period, segment, source })}
          className="rounded-lg bg-[#183334] px-6 py-3 text-sm font-semibold text-white"
          >
            Terapkan
          </button>
        </section>
        {tab === "Ringkasan" && <section className="mb-5 rounded-xl border border-[#dbe3eb] bg-white p-5 shadow-[0_8px_24px_rgba(19,40,64,0.05)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#226e6b]">Sinyal pencarian</p>
              <h2 className="mt-1 text-xl font-semibold">Tren pencarian Google</h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-[#66758a]">Tren pencarian Google Indonesia hari ini. Topik yang berkaitan dengan resort diberi tanda relevan.</p>
            </div>
          </div>
          <div className="mt-5 rounded-xl border border-[#dbe3eb] bg-[#fbfcfd] p-4">
            {trendLoading ? <p className="text-sm text-[#66758a]">Memuat tren Indonesia hari ini…</p> : trendData?.trends.length ? <div className="grid gap-2 sm:grid-cols-2">{trendData.trends.map((trend, index) => <div key={`${trend.topic}-${index}`} className="flex items-center justify-between gap-3 rounded-lg border border-[#e4eaef] bg-white px-3 py-3"><div className="flex min-w-0 items-center gap-3"><span className="text-sm font-semibold text-[#66758a]">{index + 1}</span><span className="truncate text-sm font-medium">{trend.topic}</span></div><div className="flex shrink-0 items-center gap-2"><span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${trend.relevant ? "bg-[#e7f7ef] text-[#22745e]" : "bg-[#f1f4f7] text-[#66758a]"}`}>{trend.relevant ? "Relevan" : "Tren umum"}</span><span className="text-xs text-[#66758a]">{trend.traffic || "—"}</span></div></div>)}</div> : <div className="rounded-lg border border-dashed border-[#b9cbd0] bg-white p-5"><p className="text-sm font-semibold text-[#183334]">Belum ada tren Indonesia hari ini</p><p className="mt-1 text-sm leading-6 text-[#66758a]">Sumber Google Trends belum mengirim data pada pembaruan terakhir.</p></div>}
          </div>
          <p className="mt-4 text-xs text-[#66758a]">Sumber: Google Trends Indonesia. Data menunjukkan minat pencarian relatif, bukan jumlah pencarian absolut. Diperbarui: {trendData?.fetchedAt ? fmt(trendData.fetchedAt) : "menunggu data"}.</p>
        </section>}
        {tab !== "Ringkasan" && <section className="mb-5 rounded-xl border border-[#dbe3eb] bg-white p-5 shadow-[0_8px_24px_rgba(19,40,64,0.05)]">
          <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#226e6b]">Temuan terpilih</p><h2 className="mt-1 text-xl font-semibold">Rekap {tab}</h2><p className="mt-1 text-sm text-[#66758a]">Temuan dalam rentang tanggal yang dipilih.</p></div><span className="rounded-full bg-[#f4fbe9] px-3 py-1 text-xs font-semibold text-[#1d5c50]">{rows.length} temuan</span></div>
          {loading ? <p className="py-8 text-center text-sm text-[#66758a]">Memuat rekap…</p> : rows.length ? <div className="mt-5 space-y-3">{rows.map((r) => <article key={`${r.category}-${r.date}-${r.headline}`} className="rounded-xl border border-[#dbe3eb] bg-[#fbfcfd] p-4 transition-colors duration-200 hover:border-[#8fbfb6] hover:bg-white"><div className="flex flex-wrap items-start justify-between gap-2"><span className="text-xs font-semibold uppercase tracking-wide text-[#66758a]">{fmt(r.date)} · {sourceLabel(r.source)}</span><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${r.sentiment === "positive" ? "bg-[#e7f7ef] text-[#22745e]" : r.sentiment === "negative" ? "bg-[#fff0ef] text-[#b54747]" : "bg-[#f1f4f7] text-[#52657c]"}`}>{sentimentLabel(r.sentiment)}</span></div><h3 className="mt-3 font-semibold leading-6">{r.sourceUrl ? <a className="text-[#1b6c68] underline decoration-[#b7ff67] underline-offset-2" href={r.sourceUrl} target="_blank" rel="noreferrer">{r.headline}</a> : r.headline}</h3><p className="mt-2 text-sm leading-6 text-[#66758a]">{r.relevance}</p></article>)}</div> : <div className="mt-4 rounded-xl bg-[#f4f7fa] p-4 text-sm text-[#42546b]">Belum ada temuan {tab.toLowerCase()} pada rentang tanggal ini.</div>}
        </section>}
        {(tab === "Ringkasan" || tab === "Kompetitor") && <>
        <section className="mb-4 rounded-lg border bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">Perbandingan harga pasar</h2>
              <p className="mt-1 text-sm text-[#66758a]">Harga terendah yang terlihat di Google Hotels untuk pencarian yang sama: tanggal, 2 dewasa, dan mata uang IDR. Ini bukan jaminan tipe kamar atau paket yang identik.</p>
            </div>
            <button
              type="button"
              onClick={() => void refreshRates()}
              disabled={refreshingRates}
              className="rounded-lg border border-[#183334] px-3.5 py-2 text-xs font-semibold text-[#183334] hover:bg-[#183334] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {refreshingRates ? "Memperbarui via Crawl4AI…" : "Perbarui Harga Sekarang"}
            </button>
          </div>
          {data?.marketRateComparison?.length ? <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[860px] text-left text-sm"><thead className="bg-[#f4f7fa]"><tr>{["Hotel", "Tanggal menginap", "Tamu", "Harga terendah terlihat", "Selisih dari Sanghyang", "Sumber"].map((h) => <th key={h} className="px-3 py-3">{h}</th>)}</tr></thead><tbody className="divide-y">{data.marketRateComparison.map((x) => <tr key={`${x.hotel}-${x.checkIn}`} className={x.hotel === "Sanghyang" ? "bg-[#f4fbe9]" : ""}><td className="px-3 py-3 font-semibold">{x.hotel}</td><td className="px-3 py-3">{fmt(x.checkIn)} – {fmt(x.checkOut)}</td><td className="px-3 py-3">{x.guests} dewasa</td><td className="px-3 py-3">{x.currency} {x.price.toLocaleString("id-ID")}</td><td className={`px-3 py-3 font-semibold ${x.difference == null || x.difference === 0 ? "text-[#183334]" : x.difference > 0 ? "text-[#b54747]" : "text-[#22745e]"}`}>{x.difference == null || x.difference === 0 ? "Patokan Sanghyang" : `${x.difference > 0 ? "+" : ""}${x.currency} ${x.difference.toLocaleString("id-ID")}`}</td><td className="px-3 py-3"><a className="text-[#1b6c68] underline" href={x.sourceUrl} target="_blank" rel="noreferrer">Google Hotels</a></td></tr>)}</tbody></table></div> : <div className="mt-3 rounded-lg bg-[#f4f7fa] p-4 text-sm text-[#42546b]">Belum ada harga pasar tersimpan.</div>}
        </section>
        <section className="mb-4 rounded-lg border border-[#b7ff67] bg-[#f4fbe9] p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">Profil Sanghyang sebagai patokan</h2>
              <p className="mt-1 text-sm text-[#66758a]">Semua temuan di bawah dibaca terhadap profil resort kita sendiri, bukan hanya dibandingkan antar-kompetitor.</p>
            </div>
            <a href={sanghyangProfile.officialUrl} target="_blank" rel="noreferrer" className="text-sm font-semibold text-[#1b6c68] underline">Buka profil resmi</a>
          </div>
          <div className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
            <div><span className="text-[#66758a]">Reputasi publik</span><p className="font-semibold">{sanghyangProfile.rating} · {sanghyangProfile.reviewCount}</p></div>
            <div><span className="text-[#66758a]">Kuliner</span><p className="font-semibold">{sanghyangProfile.foodAndBeverage.join(", ")}</p></div>
            <div><span className="text-[#66758a]">Keunggulan</span><p className="font-semibold">Spa air panas, beach access, watersport, meeting room</p></div>
          </div>
          <p className="mt-2 text-xs text-[#66758a]">Snapshot publik; angka rating dan ulasan dapat berubah.</p>
        </section>
        <section className="mb-4 grid gap-3 md:grid-cols-3">
          <article className="rounded-lg border border-[#dbe3eb] bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#66758a]">Reputasi Sanghyang</p>
            <p className="mt-2 text-2xl font-semibold">{data?.sanghyang.rating ?? 4.4}/5</p>
            <p className="mt-1 text-sm text-[#66758a]">{(data?.sanghyang.reviewCount ?? 2909).toLocaleString("id-ID")} ulasan publik</p>
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
        <section className="mb-4 rounded-lg border bg-white p-5">
          <h2 className="text-xl font-semibold">Matriks produk dan pengalaman</h2>
          <p className="mt-1 text-sm text-[#66758a]">Perbandingan ini menunjukkan siapa yang punya kamar, kuliner, fasilitas, dan aktivitas paling relevan untuk tamu Sanghyang.</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {comparisonProfiles.map((x, i) => <article key={x.name} className={i === 0 ? "rounded-lg border border-[#b7ff67] bg-[#f4fbe9] p-4" : "rounded-lg border border-[#dbe3eb] bg-white p-4"}>
              <div className="flex items-start justify-between gap-3">
                <a href={x.sourceUrl} target="_blank" rel="noreferrer" className="font-semibold text-[#1b6c68] underline">{x.name}</a>
                {i === 0 && <span className="shrink-0 rounded-full bg-[#b7ff67] px-2 py-1 text-xs font-semibold text-[#1d5c50]">Kita</span>}
              </div>
              <dl className="mt-4 grid gap-3 text-sm">
                <div><dt className="text-xs font-semibold uppercase tracking-wide text-[#66758a]">Kamar</dt><dd className="mt-1">{x.rooms}</dd></div>
                <div><dt className="text-xs font-semibold uppercase tracking-wide text-[#66758a]">Kuliner</dt><dd className="mt-1">{x.foodAndBeverage}</dd></div>
                <div><dt className="text-xs font-semibold uppercase tracking-wide text-[#66758a]">Fasilitas</dt><dd className="mt-1">{x.facilities}</dd></div>
                <div><dt className="text-xs font-semibold uppercase tracking-wide text-[#66758a]">Acara & hiburan</dt><dd className="mt-1">{x.eventsEntertainment}</dd></div>
              </dl>
            </article>)}
          </div>
          <p className="mt-3 text-xs text-[#66758a]">Sumber setiap baris dapat dibuka dari nama resort. Data ini adalah snapshot halaman publik, bukan audit operasional langsung.</p>
        </section>
        <section className="mb-4 rounded-lg border bg-white p-5">
          <h2 className="text-xl font-semibold">Posisi reputasi dibanding kompetitor</h2>
          <p className="mt-1 text-sm text-[#66758a]">Diurutkan dari jumlah ulasan terbanyak. Selisih rating menunjukkan posisi setiap resort dibanding rating Sanghyang ({data?.sanghyang.rating ?? 4.4}/5).</p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-[#f4f7fa]"><tr>{["Resort", "Rating publik", "Jumlah ulasan", "Dibanding Sanghyang", "Sumber"].map((h) => <th key={h} className="px-3 py-3">{h}</th>)}</tr></thead>
              <tbody className="divide-y">
                <tr className="bg-[#f4fbe9]"><td className="px-3 py-3 font-semibold">Sanghyang</td><td className="px-3 py-3 font-semibold">{data?.sanghyang.rating ?? 4.4}/5</td><td className="px-3 py-3">{(data?.sanghyang.reviewCount ?? 2909).toLocaleString("id-ID")}</td><td className="px-3 py-3">Profil kita</td><td className="px-3 py-3">Profil resmi</td></tr>
                {(data?.comparison ?? []).map((x) => <tr key={x.name}><td className="px-3 py-3">{x.sourceUrl ? <a href={x.sourceUrl} target="_blank" rel="noreferrer" className="text-[#1b6c68] underline">{x.name}</a> : x.name}</td><td className="px-3 py-3">{x.rating.toFixed(1)}/5</td><td className="px-3 py-3">{x.reviewCount.toLocaleString("id-ID")}</td><td className={`px-3 py-3 font-medium ${x.difference > 0 ? "text-[#b54747]" : "text-[#22745e]"}`}>{x.difference > 0 ? `Sanghyang kurang ${x.difference.toFixed(1)} poin` : x.difference < 0 ? `Sanghyang unggul ${Math.abs(x.difference).toFixed(1)} poin` : "Setara"}</td><td className="px-3 py-3 text-[#66758a]">{sourceLabel(x.source)}</td></tr>)}
              </tbody>
            </table>
          </div>
        </section>
        <section className="mb-4 rounded-lg border bg-white p-5">
          <h2 className="text-xl font-semibold">Perbandingan harga yang setara</h2>
          <p className="mt-1 text-sm text-[#66758a]">Hanya menampilkan harga dengan tanggal menginap, jumlah malam, tipe kamar, jumlah tamu, dan mata uang yang sama.</p>
          {data?.priceComparison?.length ? <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[820px] text-left text-sm"><thead className="bg-[#f4f7fa]"><tr>{["Kompetitor", "Tipe kamar", "Tanggal menginap", "Tamu", "Harga Sanghyang", "Harga kompetitor", "Selisih"].map((h) => <th key={h} className="px-3 py-3">{h}</th>)}</tr></thead><tbody className="divide-y">{data.priceComparison.map((x) => <tr key={`${x.competitor}-${x.roomName}-${x.checkIn}`}><td className="px-3 py-3 font-semibold">{x.competitor}</td><td className="px-3 py-3">{x.roomName ?? "—"}</td><td className="px-3 py-3">{x.checkIn ? `${fmt(x.checkIn)} – ${fmt(x.checkOut ?? x.checkIn)}` : "—"}</td><td className="px-3 py-3">{x.guests} dewasa</td><td className="px-3 py-3">{x.currency} {x.sanghyangPrice.toLocaleString("id-ID")}</td><td className="px-3 py-3">{x.currency} {x.competitorPrice.toLocaleString("id-ID")}</td><td className={`px-3 py-3 font-semibold ${x.difference > 0 ? "text-[#b54747]" : "text-[#22745e]"}`}>{x.difference > 0 ? "+" : ""}{x.currency} {x.difference.toLocaleString("id-ID")}</td></tr>)}</tbody></table></div> : <div className="mt-3 rounded-lg bg-[#f4f7fa] p-4 text-sm text-[#42546b]">Belum ada harga yang benar-benar setara. Data akan muncul setelah tanggal, tipe kamar, jumlah tamu, dan mata uangnya sama.</div>}
        </section>
        </>}
        {error && (
          <div
            role="alert"
            className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            {error}
          </div>
        )}
        {tab === "Ringkasan" && <section className="rounded-xl border border-[#dbe3eb] bg-white p-5 shadow-[0_8px_24px_rgba(19,40,64,0.05)]">
          <div>
            <h2 className="text-xl font-semibold">Ringkasan temuan</h2>
            <p className="mt-1 text-sm text-[#66758a]">Ringkasan jumlah temuan pada periode yang dipilih.</p>
            {loading ? (
              <p className="py-8">Memuat ringkasan temuan…</p>
            ) : (
              <div className="mt-3 divide-y">
                {[
                  ["Berita kuliner", "fnb"],
                  ["Berita acara", "events"],
                  ["Berita hiburan", "entertainment"],
                  ["Info kompetitor", "competitors"],
                  ["Promo kompetitor", "promotions"],
                  ["Ulasan pelanggan", "reviews"],
                ].map(([l, k]) => (
                  <div key={l} className="flex justify-between py-3">
                    <span>{l}</span>
                    <b>{data?.counts[k] ?? 0}</b>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>}
        {tab === "Ringkasan" && <section className="mt-5 rounded-xl border border-[#dbe3eb] bg-white p-5 shadow-[0_8px_24px_rgba(19,40,64,0.05)]">
          <h2 className="text-xl font-semibold">Rekap berita & kaitan kompetitor</h2>
          <p className="mt-1 text-sm text-[#66758a]">Berita dalam rentang tanggal yang dipilih. Kolom pembanding menjelaskan kaitannya dengan kompetitor Sanghyang.</p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-[#f4f7fa]">
                <tr>
                  {["Tanggal", "Kategori", "Sumber berita", "Judul berita", "Pembanding untuk Sanghyang", "Nada berita"].map(
                    (h) => (
                      <th key={h} className="px-3 py-3">
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-10 text-center">
                      Memuat temuan…
                    </td>
                  </tr>
                ) : rows.length ? (
                  rows.map((r) => (
                    <tr key={`${r.category}-${r.date}-${r.headline}`}>
                      <td className="px-3 py-3">{fmt(r.date)}</td>
                      <td className="px-3 py-3">{categoryLabel[r.category] ?? r.category}</td>
                      <td className="px-3 py-3">{sourceLabel(r.source)}</td>
                      <td className="max-w-[360px] px-3 py-3">
                        {r.sourceUrl ? <a className="font-medium text-[#1b6c68] underline decoration-[#b7ff67] underline-offset-2" href={r.sourceUrl} target="_blank" rel="noreferrer">{r.headline}</a> : r.headline}
                      </td>
                      <td className="max-w-[360px] px-3 py-3 text-[#66758a]">{r.relevance ?? "—"}</td>
                      <td className="px-3 py-3">{sentimentLabel(r.sentiment)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-3 py-10 text-center">
                      Belum ada berita pada tampilan ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>}
      </main>
    </div>
  );
}
