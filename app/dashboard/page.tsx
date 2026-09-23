const cards = [
  { href: '/', title: 'Newsletter', text: 'Cari berita, review artikel, dan unduh PDF newsletter.' },
  { href: '/market-intelligence', title: 'Market Intelligence', text: 'Pantau F&B, event, kompetitor, promosi, dan review.' },
];

export default function DashboardPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-6 py-12">
      <p className="text-sm font-semibold text-green-800">Sanghyang Resort Management</p>
      <h1 className="mt-2 text-4xl font-bold text-slate-900">Dashboard</h1>
      <p className="mt-2 text-slate-500">Pilih area kerja yang ingin dibuka.</p>

      <section className="mt-8 grid gap-5 md:grid-cols-3">
        {cards.map((card) => (
          <a key={card.href} href={card.href} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-green-700 hover:shadow-md">
            <h2 className="text-xl font-semibold text-slate-900">{card.title}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">{card.text}</p>
            <span className="mt-6 inline-block text-sm font-semibold text-green-800">Buka →</span>
          </a>
        ))}
        <section className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6">
          <h2 className="text-xl font-semibold text-slate-900">Dashboard Ringkasan</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">Akan diisi KPI, aktivitas terakhir, dan ringkasan insight.</p>
          <span className="mt-6 inline-block text-sm text-slate-400">Segera hadir</span>
        </section>
      </section>
    </main>
  );
}
