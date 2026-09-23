'use client';

import { useEffect, useMemo, useState } from 'react';

type Kind = 'fnb' | 'event' | 'destination';
type MarketItem = { id: string; kind: Kind; description?: string | null; targetAudience?: string | null; createdAt: string; article?: { title?: string | null; publishedAt?: string | null; source?: { name?: string | null } | null } | null };
type Competitor = { id: string; name: string; location?: string | null };
type Snapshot = { id: string; competitorId: string; source: string; observedAt: string; price: string | number; roomName?: string | null; packageName?: string | null };
type Promotion = { id: string; competitorId: string; title: string; source: string; capturedAt: string; status: string };
type Review = { id: string; competitorId: string; source: string; reviewDate: string; text: string; sentiment: 'positive' | 'neutral' | 'negative'; rating: string | number };

const tabs = ['Overview', 'F&B', 'Events', 'Competitors', 'Promotions', 'Reviews'] as const;
const colors: Record<string, string> = { fnb: '#118a8c', event: '#172b4d', competitors: '#ccb89e', promotions: '#ef6658', reviews: '#78b1e2' };

function formatDate(value?: string) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
}

function Chart({ series }: { series: Record<string, number[]> }) {
  const width = 760;
  const height = 220;
  const points = (values: number[]) => values.map((value, index) => `${(index / 6) * width},${height - value * 1.65}`).join(' ');
  return (
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Market activity trend chart" className="h-auto w-full">
      {[0, 50, 100, 150, 200].map((tick) => <g key={tick}><line x1="0" y1={height - tick * 1.05} x2={width} y2={height - tick * 1.05} stroke="#e5ebf1" /><text x="0" y={height - tick * 1.05 - 5} fill="#718096" fontSize="11">{tick}</text></g>)}
      {Object.entries(series).map(([key, values]) => <polyline key={key} points={points(values)} fill="none" stroke={colors[key]} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />)}
    </svg>
  );
}

export default function MarketIntelligencePage() {
  const [tab, setTab] = useState<(typeof tabs)[number]>('Overview');
  const [items, setItems] = useState<MarketItem[]>([]);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [period, setPeriod] = useState('Last 30 days');
  const [source, setSource] = useState('All sources');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const base = await fetch('/api/market-intelligence').then((r) => r.ok ? r.json() : []);
        const comps: Competitor[] = await fetch('/api/competitors').then((r) => r.ok ? r.json() : []);
        const grouped = await Promise.all(comps.map(async (competitor) => {
          const [price, promotion, review] = await Promise.all([
            fetch(`/api/competitors?competitorId=${competitor.id}`).then((r) => r.ok ? r.json() : []),
            fetch(`/api/competitors?competitorId=${competitor.id}&type=promotion`).then((r) => r.ok ? r.json() : []),
            fetch(`/api/competitors?competitorId=${competitor.id}&type=review`).then((r) => r.ok ? r.json() : []),
          ]);
          return { price, promotion, review };
        }));
        if (!active) return;
        setItems(base); setCompetitors(comps); setSnapshots(grouped.flatMap((g) => g.price)); setPromotions(grouped.flatMap((g) => g.promotion)); setReviews(grouped.flatMap((g) => g.review));
      } finally { if (active) setLoading(false); }
    }
    load();
    return () => { active = false; };
  }, []);

  const counts = useMemo(() => ({ fnb: items.filter((item) => item.kind === 'fnb').length, event: items.filter((item) => item.kind === 'event').length, competitors: snapshots.length, promotions: promotions.length, reviews: reviews.length }), [items, snapshots, promotions, reviews]);
  const recent = useMemo(() => [
    ...snapshots.map((snapshot) => ({ date: snapshot.observedAt, category: 'Competitors', source: snapshot.source, headline: `${snapshot.roomName || snapshot.packageName || 'Rate'} observed at ${snapshot.price}`, sentiment: 'neutral', color: colors.competitors })),
    ...reviews.map((review) => ({ date: review.reviewDate, category: 'Reviews', source: review.source, headline: review.text, sentiment: review.sentiment, color: colors.reviews })),
    ...promotions.map((promotion) => ({ date: promotion.capturedAt, category: 'Promotions', source: promotion.source, headline: promotion.title, sentiment: 'neutral', color: colors.promotions })),
    ...items.map((item) => ({ date: item.createdAt, category: item.kind === 'fnb' ? 'F&B' : item.kind === 'event' ? 'Events' : 'Destinations', source: 'Market news', headline: item.description || item.targetAudience || 'New market intelligence item', sentiment: 'positive', color: colors[item.kind] })),
  ].sort((a, b) => +new Date(b.date) - +new Date(a.date)).slice(0, 8), [items, snapshots, promotions, reviews]);
  const visibleRecent = tab === 'Overview' ? recent : recent.filter((row) => row.category.toLowerCase().startsWith(tab.toLowerCase().replace('&', '')) || (tab === 'Competitors' && row.category === 'Competitors'));
  const series = { fnb: [62, 91, 116, 120, 79, 77, 81], event: [45, 27, 46, 35, 72, 61, 58], competitors: [69, 102, 121, 91, 83, 52, 22], promotions: [63, 70, 91, 46, 48, 63, 88], reviews: [48, 61, 63, 84, 95, 103, 131] };

  return (
    <div className="min-h-screen bg-[#f7f9fb] text-[#14233d] lg:flex">
      <aside className="flex w-full shrink-0 flex-col justify-between bg-[#132840] px-5 py-6 text-white lg:min-h-screen lg:w-[220px]">
        <div><div className="mb-12 px-1"><div className="text-[21px] font-semibold tracking-tight">Sanghyang Resort</div><div className="text-sm text-slate-300">Management</div></div><nav aria-label="Primary" className="space-y-2">{['Dashboard', 'Market Intelligence', 'Rooms & Revenue', 'F&B', 'Events', 'Guests', 'Marketing', 'Reports', 'Settings'].map((label) => <a key={label} href={label === 'Market Intelligence' ? '/market-intelligence' : '#'} className={`block rounded-lg px-3 py-2.5 text-sm ${label === 'Market Intelligence' ? 'bg-white/10 font-semibold' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}>{label}</a>)}</nav></div>
        <div className="hidden border-t border-white/10 pt-5 text-xs text-slate-300 lg:block">△<br /><span className="font-serif text-sm">A more memorable<br />tomorrow</span></div>
      </aside>
      <main className="min-w-0 flex-1 px-5 py-7 lg:px-9">
        <header className="flex flex-col gap-6 border-b border-[#dbe3eb] pb-5 xl:flex-row xl:items-start xl:justify-between"><div><p className="text-sm text-[#66758a]">Insights for a stronger tomorrow</p><h1 className="mt-2 text-4xl font-semibold tracking-tight text-[#12233e] sm:text-5xl">Market Intelligence</h1></div><div className="flex items-center gap-4 text-sm"><button className="rounded-lg border border-[#dbe3eb] bg-white px-4 py-3 text-[#33445d]">▣ &nbsp; May 1, 2024 – May 31, 2024⌄</button><div className="hidden items-center gap-3 sm:flex"><span className="grid h-10 w-10 place-items-center rounded-full bg-[#142840] font-semibold text-white">DS</span><span><b className="block">Dewi Santosa</b><small className="text-[#7a8799]">Resort Manager</small></span></div></div></header>
        <div className="flex gap-7 overflow-x-auto border-b border-[#dbe3eb] pt-5">{tabs.map((label) => <button key={label} onClick={() => setTab(label)} className={`whitespace-nowrap border-b-2 px-1 pb-4 text-sm font-semibold ${tab === label ? 'border-[#142840] text-[#142840]' : 'border-transparent text-[#68768a] hover:text-[#142840]'}`}>{label}</button>)}</div>
        <section className="flex flex-wrap items-center gap-3 py-4"><select value={period} onChange={(e) => setPeriod(e.target.value)} aria-label="Time period" className="rounded-lg border border-[#dbe3eb] bg-white px-4 py-3 text-sm"><option>Last 30 days</option><option>Last 90 days</option><option>This year</option></select><select aria-label="Segment" className="rounded-lg border border-[#dbe3eb] bg-white px-4 py-3 text-sm"><option>All segments</option><option>F&B</option><option>Events</option></select><select value={source} onChange={(e) => setSource(e.target.value)} aria-label="Source" className="rounded-lg border border-[#dbe3eb] bg-white px-4 py-3 text-sm"><option>All sources</option><option>Market news</option><option>TripAdvisor</option></select><button onClick={() => { setPeriod('Last 30 days'); setSource('All sources'); }} className="px-3 py-3 text-sm text-[#315783]">Reset</button><button className="rounded-lg bg-[#142840] px-6 py-3 text-sm font-semibold text-white hover:bg-[#1d3958]">Apply</button></section>
        <section className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_370px]"><div className="rounded-lg border border-[#e0e7ee] bg-white p-5 shadow-[0_2px_10px_rgba(19,40,64,.03)]"><div className="mb-3 flex items-start justify-between"><div><h2 className="text-xl font-semibold">Market Activity Trends</h2><p className="mt-1 text-sm text-[#7a8799]">Volume of market intelligence by category · {period}</p></div><select aria-label="Chart grouping" className="rounded-lg border border-[#dbe3eb] bg-white px-3 py-2 text-sm"><option>Daily</option><option>Weekly</option></select></div><Chart series={series} /><div className="flex flex-wrap justify-center gap-5 pt-2 text-xs text-[#40516a]">{Object.keys(series).map((key) => <span key={key}><i className="mr-2 inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colors[key] }} />{key[0].toUpperCase() + key.slice(1)}</span>)}</div></div><div className="rounded-lg border border-[#e0e7ee] bg-white p-5 shadow-[0_2px_10px_rgba(19,40,64,.03)]"><h2 className="text-xl font-semibold">Key Insights</h2><div className="mt-3 divide-y divide-[#edf1f5]">{[['F&B mentions', counts.fnb, '+12%', 'fnb'], ['Event mentions', counts.event, '+28%', 'event'], ['Competitor updates', counts.competitors, '+6%', 'competitors'], ['Promotion mentions', counts.promotions, '-18%', 'promotions'], ['Customer reviews', counts.reviews, '+22%', 'reviews']].map(([label, value, delta, key]) => <div key={String(label)} className="flex items-center gap-3 py-3"><span className="grid h-10 w-10 place-items-center rounded-lg bg-[#f4f7fa] text-lg" style={{ color: colors[String(key)] }}>◌</span><span className="flex-1"><b className="block text-xl">{value}</b><small className="text-[#6d7b8e]">{label}</small></span><span className={`text-sm font-semibold ${String(delta).startsWith('-') ? 'text-[#e35e53]' : 'text-[#16866c]'}`}>{delta}</span></div>)}</div></div></section>
        <section className="mt-4 rounded-lg border border-[#e0e7ee] bg-white p-5 shadow-[0_2px_10px_rgba(19,40,64,.03)]"><div className="flex items-center justify-between"><h2 className="text-xl font-semibold">Recent intelligence</h2><button className="text-sm font-medium text-[#315783]">View all →</button></div><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-[#f4f7fa] text-xs text-[#52637b]"><tr>{['Date', 'Category', 'Source', 'Headline', 'Sentiment', 'Impact', 'Actions'].map((head) => <th key={head} className="px-3 py-3 font-semibold">{head}</th>)}</tr></thead><tbody className="divide-y divide-[#e7edf3]">{loading ? <tr><td colSpan={7} className="px-3 py-10 text-center text-[#718096]">Loading intelligence…</td></tr> : visibleRecent.length ? visibleRecent.map((row) => <tr key={`${row.category}-${row.date}-${row.headline}`} className="hover:bg-[#fafcfd]"><td className="whitespace-nowrap px-3 py-3 text-[#52637b]">{formatDate(row.date)}</td><td className="whitespace-nowrap px-3 py-3"><span className="mr-2 inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: row.color }} />{row.category}</td><td className="whitespace-nowrap px-3 py-3 text-[#52637b]">{row.source}</td><td className="max-w-[360px] truncate px-3 py-3 font-medium">{row.headline}</td><td className="px-3 py-3"><span className={`rounded-md px-2 py-1 text-xs capitalize ${row.sentiment === 'positive' ? 'bg-[#daf4e9] text-[#14765e]' : row.sentiment === 'negative' ? 'bg-[#fee4e1] text-[#ae3f37]' : 'bg-[#eef1f5] text-[#52637b]'}`}>{row.sentiment}</span></td><td className="px-3 py-3">{row.sentiment === 'positive' ? 'High' : 'Medium'}</td><td className="px-3 py-3 text-lg text-[#68768a]">•••</td></tr>) : <tr><td colSpan={7} className="px-3 py-10 text-center text-[#718096]">No intelligence found for this view yet.</td></tr>}</tbody></table></div></section>
        <p className="mt-4 text-xs text-[#8491a2]">{competitors.length} competitors tracked · {snapshots.length} price observations · {reviews.length} reviews · {promotions.length} promotions</p>
      </main>
    </div>
  );
}
