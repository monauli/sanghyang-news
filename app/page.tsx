"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import StepIndicator from "./components/StepIndicator";
import { KUNCI } from "@/lib/ui";

const MAKS_HARI = 90;

const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Rentang siap pakai. Pemakaian utama newsletter ini bulanan. */
function rentang(jenis: "bulanLalu" | "bulanIni" | "hari30") {
  const kini = new Date();
  const y = kini.getFullYear();
  const m = kini.getMonth();
  if (jenis === "bulanLalu")
    return { dari: ymd(new Date(y, m - 1, 1)), sampai: ymd(new Date(y, m, 0)) };
  if (jenis === "bulanIni")
    return { dari: ymd(new Date(y, m, 1)), sampai: ymd(kini) };
  const mulai = new Date(kini);
  mulai.setDate(mulai.getDate() - 29);
  return { dari: ymd(mulai), sampai: ymd(kini) };
}

const selisihHari = (dari: string, sampai: string) =>
  Math.round(
    (new Date(sampai).getTime() - new Date(dari).getTime()) / 86400000,
  ) + 1;

function cekRentang(dari: string, sampai: string): string | null {
  if (!dari || !sampai) return "Isi kedua tanggal dulu.";
  if (dari > sampai)
    return "Tanggal awal tidak boleh lewat dari tanggal akhir.";
  if (selisihHari(dari, sampai) > MAKS_HARI)
    return `Rentangnya kepanjangan. Maksimal ${MAKS_HARI} hari sekali cari.`;
  return null;
}

export default function Halaman1() {
  const router = useRouter();
  const [dari, setDari] = useState("");
  const [sampai, setSampai] = useState("");
  const [loading, setLoading] = useState(false);
  const [progres, setProgres] = useState("");
  const [galat, setGalat] = useState<string | null>(null);

  // Dihitung di browser, bukan saat build — kalau tidak, "bulan lalu" akan basi.
  useEffect(() => {
    const r = rentang("bulanLalu");
    // Browser-only default; moving this into useState would risk hydration drift.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDari(r.dari);
    setSampai(r.sampai);
  }, []);

  const pilih = (jenis: Parameters<typeof rentang>[0]) => {
    const r = rentang(jenis);
    setDari(r.dari);
    setSampai(r.sampai);
  };

  const galatRentang = dari && sampai ? cekRentang(dari, sampai) : null;
  const siap = !!dari && !!sampai && !galatRentang;

  async function cari(e: React.FormEvent) {
    e.preventDefault();
    if (!siap) return;
    setLoading(true);
    setGalat(null);
    setProgres("Menyiapkan…");

    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dateFrom: dari, dateTo: sampai }),
      });
      if (!res.ok || !res.body)
        throw new Error(
          (await res.json().catch(() => ({}))).error ?? "Pencarian gagal.",
        );

      // Balasannya dialirkan baris demi baris supaya progresnya nyata, bukan tebakan.
      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      let sisa = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        sisa += value;
        const baris = sisa.split(/\r?\n/);
        sisa = baris.pop() ?? "";
        for (const b of baris) {
          if (!b.trim()) continue;
          const p = JSON.parse(b);
          if (p.tahap === "cari")
            setProgres(`Mencari berita… (${p.sudah}/${p.total})`);
          else if (p.tahap === "saring")
            setProgres("Menyaring berita yang relevan…");
          else if (p.tahap === "galat") throw new Error(p.pesan);
          else if (p.tahap === "selesai") {
            setProgres(`Ditemukan ${p.utama} berita utama`);
            sessionStorage.setItem(KUNCI.hasil, JSON.stringify(p.articles));
            sessionStorage.setItem(KUNCI.gagal, String(p.failedQueries ?? 0));
            // Dipakai kop newsletter: periode BERITA, bukan tanggal terbit.
            sessionStorage.setItem(KUNCI.periode, `${dari}..${sampai}`);
            router.push("/review");
            return;
          }
        }
      }
      throw new Error("Pencarian terputus.");
    } catch (err) {
      setGalat((err as Error).message);
      setLoading(false);
      setProgres("");
    }
  }

  return (
    <div className="min-h-screen bg-[#f7f9f8] lg:flex">
      <aside className="w-full bg-[#132840] px-6 py-7 text-white lg:min-h-screen lg:w-64">
        <a href="/dashboard" className="text-2xl font-bold tracking-tight">Sanghyang</a>
            <p className="mt-1 text-sm text-white/70">Ruang kerja pemasaran</p>
        <nav className="mt-12 space-y-2" aria-label="Navigasi utama">
          <a href="/dashboard" className="block rounded-xl px-4 py-3 text-sm font-semibold text-white/80 hover:bg-white/10">Dashboard</a>
          <Link href="/" className="block rounded-xl bg-[#b7ff67] px-4 py-3 text-sm font-semibold text-[#1d5c50]">Newsletter</Link>
            <a href="/market-intelligence" className="block rounded-xl px-4 py-3 text-sm font-semibold text-white/80 hover:bg-white/10">Insight Pasar</a>
        </nav>
      </aside>
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-6 py-12">
      <StepIndicator aktif={1} />

      <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-[#226e6b]">
          Sanghyang Highlights
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Buat newsletter berita otomatis.
        </p>
        <form
          id="newsletter"
          onSubmit={cari}
          className="mt-8 flex flex-col gap-6"
        >
          <div>
            <p className="mb-2 text-sm font-medium text-gray-700">
              Pilih periode
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => pilih("bulanLalu")}
                disabled={loading}
                className="rounded-lg bg-[#226e6b] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#185754] disabled:opacity-50"
              >
                Bulan Lalu
              </button>
              <button
                type="button"
                onClick={() => pilih("bulanIni")}
                disabled={loading}
                className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-700 hover:border-[#226e6b] hover:text-[#226e6b] disabled:opacity-50"
              >
                Bulan Ini
              </button>
              <button
                type="button"
                onClick={() => pilih("hari30")}
                disabled={loading}
                className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-700 hover:border-[#226e6b] hover:text-[#226e6b] disabled:opacity-50"
              >
                30 Hari Terakhir
              </button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-700">
              Dari tanggal
              <input
                type="date"
                value={dari}
                onChange={(e) => setDari(e.target.value)}
                disabled={loading}
                className="rounded-lg border border-gray-300 px-3 py-2 font-normal text-gray-900 focus:border-green-800 focus:outline-none disabled:bg-gray-50"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-700">
              Sampai tanggal
              <input
                type="date"
                value={sampai}
                onChange={(e) => setSampai(e.target.value)}
                disabled={loading}
                className="rounded-lg border border-gray-300 px-3 py-2 font-normal text-gray-900 focus:border-green-800 focus:outline-none disabled:bg-gray-50"
              />
            </label>
          </div>

          {galatRentang && (
            <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {galatRentang}
            </p>
          )}
          {galat && (
            <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
              {galat} Coba lagi sebentar lagi.
            </p>
          )}

          <button
            type="submit"
            disabled={!siap || loading}
            className="rounded-lg bg-[#226e6b] px-6 py-3 font-semibold text-white hover:bg-[#185754] disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            {loading ? "Sedang mencari berita…" : "Cari Berita"}
          </button>

          {loading && (
            <div className="text-center text-sm text-gray-600">
              <p className="font-medium text-green-900">{progres}</p>
              <p className="mt-1 text-gray-500">
                Biasanya butuh sekitar setengah menit. Jangan tutup tab ini.
              </p>
            </div>
          )}
        </form>
      </div>
      </main>
    </div>
  );
}
