"use client";
/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from "react";
type Period = "30d" | "90d" | "year";
type Summary = {
  counts: Record<string, number>;
  sourceNames: string[];
  recentRows: {
    date: string;
    category: string;
    source: string;
    headline: string;
    sentiment: string;
  }[];
  trend: Record<string, number[]>;
};
const tabs = [
  "Overview",
  "F&B",
  "Events",
  "Competitors",
  "Promotions",
  "Reviews",
] as const;
const colors: Record<string, string> = {
  fnb: "#118a8c",
  event: "#172b4d",
  competitors: "#ccb89e",
  promotions: "#ef6658",
  reviews: "#78b1e2",
};
const fmt = (v: string) =>
  new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(v));
function Chart({ series }: { series: Record<string, number[]> }) {
  const w = 760,
    h = 220,
    max = Math.max(1, ...Object.values(series).flat());
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      role="img"
      aria-label="Market activity trend chart"
      className="h-auto w-full"
    >
      {[0, 0.25, 0.5, 0.75, 1].map((r) => {
        const y = h - r * (h - 12);
        return (
          <g key={r}>
            <line x1="0" y1={y} x2={w} y2={y} stroke="#e5ebf1" />
            <text x="0" y={y - 5} fill="#718096" fontSize="11">
              {Math.round(max * r)}
            </text>
          </g>
        );
      })}
      {Object.entries(series).map(([k, vs]) => (
        <polyline
          key={k}
          points={vs
            .map(
              (v, i) =>
                `${(i / Math.max(1, vs.length - 1)) * w},${h - (v / max) * (h - 12)}`,
            )
            .join(" ")}
          fill="none"
          stroke={colors[k] ?? "#64748b"}
          strokeWidth="3"
          strokeLinecap="round"
        />
      ))}
    </svg>
  );
}
export default function MarketIntelligencePage() {
  const [tab, setTab] = useState<(typeof tabs)[number]>("Overview");
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
  useEffect(() => {
    let live = true;
    setLoading(true);
    setError(null);
    fetch(
      `/api/market-intelligence/summary?period=${applied.period}&segment=${applied.segment}${applied.source ? `&source=${encodeURIComponent(applied.source)}` : ""}`,
    )
      .then(async (r) => {
        if (!r.ok) throw Error(`Request failed (${r.status})`);
        return r.json();
      })
      .then((x) => live && setData(x))
      .catch(
        (e) =>
          live &&
          setError(
            e instanceof Error ? e.message : "Unable to load intelligence.",
          ),
      )
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [applied]);
  const rows = (data?.recentRows ?? [])
    .filter((r) => tab === "Overview" || r.category === tab)
    .slice(0, 8);
  const reset = () => {
    setPeriod("30d");
    setSegment("all");
    setSource("");
    setApplied({ period: "30d", segment: "all", source: "" });
  };
  return (
    <div className="min-h-screen bg-[#f7f9f8] text-[#183334] lg:flex">
      <aside className="w-full bg-[#132840] px-5 py-6 text-white lg:min-h-screen lg:w-[220px]">
        <div className="mb-12 text-[21px] font-semibold">
          Sanghyang Resort
          <small className="block text-sm font-normal text-slate-300">
            Management
          </small>
        </div>
          <a
            href="/market-intelligence"
            className="block rounded-lg bg-[#b7ff67] px-3 py-2.5 text-sm font-semibold text-[#1d5c50]"
          >
            Market Intelligence
          </a>
          <a
            href="/admin/scraping"
            className="mt-2 block rounded-lg px-3 py-2.5 text-sm text-white/80 hover:bg-white/10"
          >
            Update Data
          </a>
      </aside>
      <main className="min-w-0 flex-1 px-5 py-7 lg:px-9">
        <header className="border-b border-[#dbe3eb] pb-5">
          <p className="text-sm text-[#66758a]">
            Insights for a stronger tomorrow
          </p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">
            Market Intelligence
          </h1>
          <p className="mt-3 text-sm text-[#66758a]">
            {data?.recentRows.length
              ? fmt(data.recentRows[data.recentRows.length - 1].date)
              : "Selected period"}{" "}
            – {fmt(new Date().toISOString())}
          </p>
        </header>
        <div
          role="tablist"
          aria-label="Market intelligence categories"
          className="flex gap-7 overflow-x-auto border-b border-[#dbe3eb] pt-5"
        >
          {tabs.map((x) => (
            <button
              role="tab"
              aria-selected={tab === x}
              key={x}
              onClick={() => setTab(x)}
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
            aria-label="Time period"
            className="rounded-lg border bg-white px-4 py-3 text-sm"
          >
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="year">This year</option>
          </select>
          <select
            value={segment}
            onChange={(e) => setSegment(e.target.value)}
            aria-label="Segment"
            className="rounded-lg border bg-white px-4 py-3 text-sm"
          >
            <option value="all">All segments</option>
            <option value="fnb">F&B</option>
            <option value="event">Events</option>
            <option value="destination">Destinations</option>
            <option value="competitor">Competitors</option>
            <option value="promotion">Promotions</option>
            <option value="review">Reviews</option>
          </select>
          <select
            value={source}
            onChange={(e) => setSource(e.target.value)}
            aria-label="Source"
            className="rounded-lg border bg-white px-4 py-3 text-sm"
          >
            <option value="">All sources</option>
            {(data?.sourceNames ?? []).map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
          <button onClick={reset} className="px-3 py-3 text-sm text-[#315783]">
            Reset
          </button>
          <button
            onClick={() => setApplied({ period, segment, source })}
          className="rounded-lg bg-[#183334] px-6 py-3 text-sm font-semibold text-white"
          >
            Apply
          </button>
        </section>
        {error && (
          <div
            role="alert"
            className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            {error}
          </div>
        )}
        <section className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_370px]">
          <div className="rounded-lg border bg-white p-5">
            <h2 className="text-xl font-semibold">Market Activity Trends</h2>
            {loading ? (
              <p className="py-20 text-center">Loading trends…</p>
            ) : (
              <Chart series={data?.trend ?? {}} />
            )}
          </div>
          <div className="rounded-lg border bg-white p-5">
            <h2 className="text-xl font-semibold">Key Insights</h2>
            {loading ? (
              <p className="py-8">Loading insights…</p>
            ) : (
              <div className="mt-3 divide-y">
                {[
                  ["F&B mentions", "fnb"],
                  ["Event mentions", "events"],
                  ["Competitor updates", "competitors"],
                  ["Promotion mentions", "promotions"],
                  ["Customer reviews", "reviews"],
                ].map(([l, k]) => (
                  <div key={l} className="flex justify-between py-3">
                    <span>{l}</span>
                    <b>{data?.counts[k] ?? 0}</b>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
        <section className="mt-4 rounded-lg border bg-white p-5">
          <h2 className="text-xl font-semibold">Recent intelligence</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-[#f4f7fa]">
                <tr>
                  {["Date", "Category", "Source", "Headline", "Sentiment"].map(
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
                    <td colSpan={5} className="px-3 py-10 text-center">
                      Loading intelligence…
                    </td>
                  </tr>
                ) : rows.length ? (
                  rows.map((r) => (
                    <tr key={`${r.category}-${r.date}-${r.headline}`}>
                      <td className="px-3 py-3">{fmt(r.date)}</td>
                      <td className="px-3 py-3">{r.category}</td>
                      <td className="px-3 py-3">{r.source}</td>
                      <td className="max-w-[360px] truncate px-3 py-3">
                        {r.headline}
                      </td>
                      <td className="px-3 py-3 capitalize">{r.sentiment}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-3 py-10 text-center">
                      No intelligence found for this view.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
