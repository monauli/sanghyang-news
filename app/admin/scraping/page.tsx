"use client";

import { useCallback, useEffect, useState } from "react";

type Source = {
  id: string;
  name: string;
  domain: string;
  enabled: boolean;
  lastRunAt: string | null;
  lastSuccessAt: string | null;
  failureCount: number;
};

type Run = {
  id: string;
  status: "running" | "success" | "partial" | "failed";
  startedAt: string;
  finishedAt: string | null;
  recordsDiscovered: number;
  recordsSaved: number;
  duplicates: number;
  errors: number;
};

type Status = { sources: Source[]; runs: Run[] };

const formatDate = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat("id-ID", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value))
    : "Belum pernah";

const labelStatus = (status: Run["status"]) =>
  ({
    running: "Sedang berjalan",
    success: "Selesai",
    partial: "Selesai sebagian",
    failed: "Gagal",
  })[status];

export default function HalamanAdminScraping() {
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [runId, setRunId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/scraping");
      if (!response.ok) throw new Error();
      const next: unknown = await response.json();
      if (
        !next ||
        typeof next !== "object" ||
        !Array.isArray((next as Status).sources) ||
        !Array.isArray((next as Status).runs)
      )
        throw new Error();
      setStatus(next as Status);
      setError(null);
      return next as Status;
    } catch {
      setError("Tidak dapat memuat status pengambilan berita.");
      return null;
    }
  }, []);

  useEffect(() => {
    // The browser-only initial fetch deliberately transitions the loading state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load().finally(() => setLoading(false));
  }, [load]);

  useEffect(() => {
    if (!runId) return;
    const interval = window.setInterval(() => {
      void load().then((next) => {
        const run = next?.runs.find((item) => item.id === runId);
        if (run && run.status !== "running") setRunId(null);
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [load, runId]);

  async function runNewsNow() {
    setStarting(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/scraping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job: "news" }),
      });
      if (!response.ok) throw new Error();
      const started: unknown = await response.json();
      if (
        !started ||
        typeof started !== "object" ||
        typeof (started as { runId?: unknown }).runId !== "string"
      )
        throw new Error();
      const runId = (started as { runId: string }).runId;
      setRunId(runId);
      const next = await load();
      const run = next?.runs.find((item) => item.id === runId);
      if (run && run.status !== "running") setRunId(null);
    } catch {
      setError("Tidak dapat memulai pengambilan berita. Coba lagi.");
    } finally {
      setStarting(false);
    }
  }

  const latestRun = status?.runs[0];
  const polling = runId !== null;

  return (
    <div className="min-h-screen bg-[#f7f9f8] lg:flex">
      <aside className="w-full bg-[#132840] px-6 py-7 text-white lg:min-h-screen lg:w-64">
        <a href="/dashboard" className="text-2xl font-bold tracking-tight">Sanghyang</a>
        <p className="mt-1 text-sm text-white/70">Management workspace</p>
        <nav className="mt-12 space-y-2" aria-label="Navigasi utama">
          <a href="/dashboard" className="block rounded-xl px-4 py-3 text-sm font-semibold text-white/80 hover:bg-white/10">Dashboard</a>
          <a href="/" className="block rounded-xl px-4 py-3 text-sm font-semibold text-white/80 hover:bg-white/10">Newsletter</a>
          <a href="/market-intelligence" className="block rounded-xl px-4 py-3 text-sm font-semibold text-white/80 hover:bg-white/10">Market Intelligence</a>
          <a href="/admin/scraping" className="block rounded-xl bg-[#b7ff67] px-4 py-3 text-sm font-semibold text-[#1d5c50]">Update Data</a>
        </nav>
      </aside>
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-6 py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-green-900">
            Pengambilan Berita
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Pantau sumber dan jalankan pengambilan berita terbaru.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void runNewsNow()}
          disabled={loading || starting || polling}
          className="rounded-lg bg-green-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-900 disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          {starting
            ? "Menjalankan…"
            : polling
              ? "Sedang berjalan…"
              : "Run News Now"}
        </button>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      )}

      {loading ? (
        <p className="rounded-lg border border-gray-200 bg-white px-4 py-8 text-center text-sm text-gray-600">
          Memuat status pengambilan berita…
        </p>
      ) : (
        status && (
          <>
            <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-base font-semibold text-green-900">
                Status sumber
              </h2>
              {status.sources.length ? (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {status.sources.map((source) => (
                    <article
                      key={source.id}
                      className="rounded-lg border border-gray-200 p-4 text-sm"
                    >
                      <h3 className="font-semibold text-gray-900">
                        {source.name}
                      </h3>
                      <p className="mt-1 text-gray-500">{source.domain}</p>
                      <dl className="mt-3 grid gap-1 text-gray-600">
                        <div>
                          <dt className="inline">Status: </dt>
                          <dd className="inline">
                            {source.enabled ? "Aktif" : "Nonaktif"}
                          </dd>
                        </div>
                        <div>
                          <dt className="inline">Terakhir berhasil: </dt>
                          <dd className="inline">
                            {formatDate(source.lastSuccessAt)}
                          </dd>
                        </div>
                        <div>
                          <dt className="inline">Kegagalan: </dt>
                          <dd className="inline">
                            {source.failureCount} kegagalan berturut-turut
                          </dd>
                        </div>
                      </dl>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-sm text-gray-500">
                  Belum ada sumber aktif.
                </p>
              )}
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-base font-semibold text-green-900">
                Pengambilan terbaru
              </h2>
              {!latestRun ? (
                <p className="mt-4 text-sm text-gray-500">
                  Belum ada riwayat pengambilan berita.
                </p>
              ) : (
                <div className="mt-4 rounded-lg bg-gray-50 p-4 text-sm text-gray-700">
                  <p className="font-semibold text-gray-900">
                    {labelStatus(latestRun.status)}
                  </p>
                  <p className="mt-1 text-gray-500">
                    Dimulai: {formatDate(latestRun.startedAt)}
                  </p>
                  <dl className="mt-4 grid gap-2 sm:grid-cols-4">
                    <div>
                      <dt className="text-gray-500">Ditemukan</dt>
                      <dd className="font-semibold">
                        Ditemukan: {latestRun.recordsDiscovered}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">Disimpan</dt>
                      <dd className="font-semibold">
                        Disimpan: {latestRun.recordsSaved}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">Duplikat</dt>
                      <dd className="font-semibold">
                        Duplikat: {latestRun.duplicates}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">Kesalahan</dt>
                      <dd className="font-semibold">
                        Kesalahan: {latestRun.errors}
                      </dd>
                    </div>
                  </dl>
                </div>
              )}
            </section>
          </>
        )
      )}
      </main>
    </div>
  );
}
