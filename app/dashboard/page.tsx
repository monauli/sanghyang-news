"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Summary = {
  counts: Record<string, number>;
  recentRows: { category: string; headline: string; date: string }[];
};
const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/", label: "Newsletter" },
  { href: "/market-intelligence", label: "Insight Pasar" },
];
const categoryLabel: Record<string, string> = {
  "F&B": "Kuliner",
  Events: "Acara",
  Entertainment: "Hiburan",
  Competitors: "Kompetitor",
  Promotions: "Promo",
  Reviews: "Ulasan",
  Destinations: "Destinasi",
};

export default function DashboardPage() {
  const [data, setData] = useState<Summary | null>(null);
  useEffect(() => {
    fetch("/api/market-intelligence/summary?period=30d&segment=all", { cache: "no-store" })
      .then((r) => r.ok && r.json())
      .then(setData)
      .catch(() => setData(null));
  }, []);
  const counts = data?.counts ?? {};
  const kpis = [
    ["Berita kuliner", counts.fnb ?? 0, "text-[#2c8a83]"],
    ["Berita acara", counts.events ?? 0, "text-[#4b6f9f]"],
    ["Berita hiburan", counts.entertainment ?? 0, "text-[#8a5a9c]"],
    ["Info kompetitor", counts.competitors ?? 0, "text-[#9c6b9a]"],
    ["Ulasan pelanggan", counts.reviews ?? 0, "text-[#c78d55]"],
  ];
  const activity = [
    ["Kuliner", counts.fnb ?? 0],
    ["Acara", counts.events ?? 0],
    ["Hiburan", counts.entertainment ?? 0],
    ["Kompetitor", counts.competitors ?? 0],
    ["Ulasan", counts.reviews ?? 0],
  ] as const;
  const activityTotal = activity.reduce((sum, [, value]) => sum + value, 0);
  return (
    <main className="min-h-screen bg-[#f7f9f8] text-[#183334] lg:flex">
      <aside className="w-full bg-[#132840] px-6 py-7 text-white lg:min-h-screen lg:w-64">
        <div className="text-2xl font-bold tracking-tight">Sanghyang</div>
        <p className="mt-1 text-sm text-white/70">Ruang kerja pemasaran</p>
        <nav className="mt-12 space-y-2" aria-label="Navigasi utama">
          {links.map((link, index) => (
            <Link
              key={link.href}
              href={link.href}
              className={`block rounded-xl px-4 py-3 text-sm font-semibold ${index === 0 ? "bg-[#b7ff67] text-[#1d5c50]" : "text-white/80 hover:bg-white/10"}`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <p className="mt-12 text-xs leading-5 text-white/60">
          Data diperbarui otomatis setiap hari.
        </p>
      </aside>
      <section className="min-w-0 flex-1 px-5 py-7 lg:px-10">
        <header className="flex items-center justify-between border-b border-[#dce8e5] pb-6">
          <div>
            <p className="text-sm text-[#71908d]">Ringkasan</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">
              Dashboard
            </h1>
          </div>
          <Link
            href="/market-intelligence"
            className="rounded-lg bg-[#183334] px-4 py-2.5 text-sm font-semibold text-white"
          >
            Buka Insight Pasar
          </Link>
        </header>
        <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
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
              <h2 className="text-lg font-semibold">Aktivitas pasar</h2>
              <span className="text-xs text-[#879996]">30 hari terakhir</span>
            </div>
            <p className="mt-2 text-sm text-[#718783]">Jumlah temuan yang masuk per kategori.</p>
            <div className="mt-6 space-y-4">
              {activity.map(([label, value]) => (
                <div key={label}>
                  <div className="flex justify-between text-sm"><span>{label}</span><strong>{value}</strong></div>
                  <div className="mt-1 h-2 rounded-full bg-[#e8f0ed]"><div className="h-2 rounded-full bg-[#2c8a83]" style={{ width: activityTotal ? ((value / activityTotal) * 100) + "%" : "0%" }} /></div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-[#e0eae7] bg-white p-5">
            <h2 className="text-lg font-semibold">Ringkasan kategori</h2>
            <p className="mt-2 text-sm text-[#718783]">Gunakan Insight Pasar untuk membaca berita dan pembandingnya.</p>
            <div className="mt-6 space-y-3 text-sm">
              {activity.map(([label, value]) => <div key={label} className="flex items-center justify-between border-b border-[#edf2f0] pb-3"><span>{label}</span><strong>{value}</strong></div>)}
            </div>
          </div>
        </section>
        <section className="mt-5 rounded-xl border border-[#e0eae7] bg-white p-5">
          <h2 className="text-lg font-semibold">Temuan terbaru</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-[#e5eeeb] text-[#82938f]">
                <tr>
                  <th className="px-3 py-3">Kategori</th>
                  <th className="px-3 py-3">Judul berita</th>
                  <th className="px-3 py-3">Tanggal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#edf2f0]">
                {data?.recentRows?.length ? (
                  data.recentRows.slice(0, 5).map((row) => (
                    <tr key={`${row.category}-${row.headline}`}>
                      <td className="px-3 py-3">{categoryLabel[row.category] ?? row.category}</td>
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
                      Belum ada data analisis pasar.
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
