"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function HalamanMasuk() {
  const router = useRouter();
  const [sandi, setSandi] = useState("");
  const [galat, setGalat] = useState<string | null>(null);
  const [kirim, setKirim] = useState(false);

  async function masuk(e: React.FormEvent) {
    e.preventDefault();
    if (!sandi) return;
    setKirim(true);
    setGalat(null);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: sandi }),
      });
      if (!res.ok)
        throw new Error(
          (await res.json().catch(() => ({}))).error ?? "Gagal masuk.",
        );
      router.replace("/dashboard");
      router.refresh();
    } catch (e) {
      setGalat((e as Error).message);
      setKirim(false);
    }
  }

  return (
    <main className="flex min-h-screen bg-[#eef8f6]">
      <section className="relative hidden w-1/2 overflow-hidden bg-[#168d80] lg:flex lg:items-center lg:justify-center">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,.24),transparent_28%),radial-gradient(circle_at_80%_80%,rgba(0,60,60,.25),transparent_35%)]" />
        <div className="relative max-w-md px-12 text-white">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-white/75">
            Sanghyang Resort
          </p>
          <h2 className="mt-5 text-5xl font-semibold leading-tight">
            Data pasar untuk keputusan yang lebih cepat.
          </h2>
          <p className="mt-6 text-lg leading-8 text-white/80">
            Berita, tren pasar, dan insight bisnis dalam satu ruang kerja.
          </p>
        </div>
      </section>

      <section className="flex w-full items-center justify-center bg-white px-6 py-16 lg:w-1/2 lg:rounded-l-[18%] lg:-ml-16 lg:pl-24">
        <div className="w-full max-w-md">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#168d80]">
            Sanghyang Highlights
          </p>
          <h1 className="mt-5 text-5xl font-light tracking-tight text-slate-800">
            Selamat datang
          </h1>
          <p className="mt-3 text-slate-500">Masuk untuk melanjutkan.</p>

          <form onSubmit={masuk} className="mt-10 flex flex-col gap-5">
            <label className="text-sm font-medium text-slate-600">
              Sandi
              <input
                type="password"
                value={sandi}
                onChange={(e) => setSandi(e.target.value)}
                autoFocus
                autoComplete="current-password"
                disabled={kirim}
                placeholder="Masukkan sandi"
                className="mt-2 w-full rounded-full border border-slate-200 px-5 py-3.5 text-slate-900 outline-none transition focus:border-[#168d80] focus:ring-4 focus:ring-[#168d80]/10 disabled:bg-slate-50"
              />
            </label>

            {galat && <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-800">{galat}</p>}

            <button
              type="submit"
              disabled={!sandi || kirim}
              className="mt-2 rounded-full bg-[#31cbb8] px-6 py-3.5 font-semibold text-white shadow-sm transition hover:bg-[#22b5a4] disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {kirim ? "Memeriksa…" : "Masuk"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
