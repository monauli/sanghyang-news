"use client";

import { useEffect, useState } from "react";

type Summary = {
  counts: Record<string, number>;
  recentRows: { category: string; headline: string; date: string }[];
};
const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/", label: "Newsletter" },
  { href: "/market-intelligence", label: "Market Intelligence" },
];

export default function DashboardPage() {
  const [data, setData] = useState<Summary | null>(null);
  useEffect(() => {
    fetch("/api/market-intelligence/summary?period=30d&segment=all")
      .then((r) => r.ok && r.json())
      .then(setData)
      .catch(() => setData(null));
  }, []);
  const counts = data?.counts ?? {};
  const kpis = [
    ["F&B mentions", counts.fnb ?? 0, "text-[#2c8a83]"],
    ["Event mentions", counts.events ?? 0, "text-[#4b6f9f]"],
    ["Competitor updates", counts.competitors ?? 0, "text-[#9c6b9a]"],
    ["Reviews", counts.reviews ?? 0, "text-[#c78d55]"],
  ];
  return (
    <main className="min-h-screen bg-[#f7f9f8] text-[#183334] lg:flex">
      <aside className="w-full bg-[#226e6b] px-6 py-7 text-white lg:min-h-screen lg:w-64">
        <div className="text-2xl font-bold tracking-tight">Sanghyang</div>
        <p className="mt-1 text-sm text-white/70">Management workspace</p>
        <nav className="mt-12 space-y-2" aria-label="Dashboard navigation">
          {links.map((link, index) => (
            <a
              key={link.href}
              href={link.href}
              className={`block rounded-xl px-4 py-3 text-sm font-semibold ${index === 0 ? "bg-[#b7ff67] text-[#1d5c50]" : "text-white/80 hover:bg-white/10"}`}
            >
              {link.label}
            </a>
          ))}
        </nav>
        <p className="mt-12 text-xs leading-5 text-white/60">
          Data diperbarui otomatis melalui proses intelligence terjadwal.
        </p>
      </aside>
      <section className="min-w-0 flex-1 px-5 py-7 lg:px-10">
        <header className="flex items-center justify-between border-b border-[#dce8e5] pb-6">
          <div>
            <p className="text-sm text-[#71908d]">Overview</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">
              Dashboard
            </h1>
          </div>
          <a
            href="/market-intelligence"
            className="rounded-lg bg-[#183334] px-4 py-2.5 text-sm font-semibold text-white"
          >
            Open Intelligence
          </a>
        </header>
        <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {kpis.map(([label, value, color]) => (
            <div
              key={label}
              className="rounded-xl border border-[#e0eae7] bg-white p-5"
            >
              <p className="text-sm text-[#718783]">{label}</p>
              <p className={`mt-3 text-3xl font-semibold ${color}`}>{value}</p>
              <p className="mt-2 text-xs text-[#9aaba8]">30 hari terakhir</p>
            </div>
          ))}
        </section>
        <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
          <div className="rounded-xl border border-[#e0eae7] bg-white p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Activity overview</h2>
              <span className="text-xs text-[#879996]">Last 30 days</span>
            </div>
            <svg
              viewBox="0 0 760 220"
              className="mt-6 h-56 w-full"
              role="img"
              aria-label="Activity overview chart"
            >
              <path
                d="M0 180 L70 150 L140 165 L210 105 L280 130 L350 72 L420 160 L490 118 L560 135 L630 85 L700 112 L760 96 L760 220 L0 220Z"
                fill="#d9f1e7"
              />
              <path
                d="M0 180 L70 150 L140 165 L210 105 L280 130 L350 72 L420 160 L490 118 L560 135 L630 85 L700 112 L760 96"
                fill="none"
                stroke="#2c8a83"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className="rounded-xl border border-[#e0eae7] bg-white p-5">
            <h2 className="text-lg font-semibold">Activity mix</h2>
            <div
              className="mx-auto mt-7 h-40 w-40 rounded-full"
              style={{
                background:
                  "conic-gradient(#2c8a83 0 35%, #72c8c0 35% 60%, #b7e8dd 60% 78%, #dcefeb 78% 100%)",
              }}
            />
            <p className="mt-6 text-sm text-[#718783]">
              Gunakan Market Intelligence untuk rincian per kategori.
            </p>
          </div>
        </section>
        <section className="mt-5 rounded-xl border border-[#e0eae7] bg-white p-5">
          <h2 className="text-lg font-semibold">Recent intelligence</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-[#e5eeeb] text-[#82938f]">
                <tr>
                  <th className="px-3 py-3">Category</th>
                  <th className="px-3 py-3">Headline</th>
                  <th className="px-3 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#edf2f0]">
                {data?.recentRows?.length ? (
                  data.recentRows.slice(0, 5).map((row) => (
                    <tr key={`${row.category}-${row.headline}`}>
                      <td className="px-3 py-3 capitalize">{row.category}</td>
                      <td className="max-w-[520px] truncate px-3 py-3">
                        {row.headline}
                      </td>
                      <td className="px-3 py-3 text-[#718783]">
                        {new Date(row.date).toLocaleDateString("id-ID")}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-3 py-8 text-center text-[#8a9b98]"
                    >
                      Belum ada data intelligence.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </main>
  );
}
