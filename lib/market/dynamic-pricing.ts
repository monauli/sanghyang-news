export type DayType = 'weekday' | 'friday' | 'saturday' | 'holiday';
export type PricingStrategy = 'volume' | 'balanced' | 'yield';
export type RoomType = 'standard' | 'deluxe' | 'beachfront' | 'suite';

export interface DynamicPricingInput {
  baselineRate: number; // Tarif dasar Sanghyang (misal dari Google Hotels)
  competitorRates: {
    astonRate?: number;
    mambrukRate?: number;
    jayakartaRate?: number;
  };
  occupancyPercent: number; // 10 s/d 100
  dayType: DayType;
  strategy: PricingStrategy;
  roomType?: RoomType;
  totalRooms?: number; // Total kapasitas kamar resort (default 100 kamar)
}

export interface DynamicPricingResult {
  recommendedRate: number;
  baselineRate: number;
  difference: number;
  percentChange: number;
  revparBaseline: number;
  revparRecommended: number;
  revparLiftPercent: number;
  estimatedMonthlyRevenue: number;
  estimatedMonthlyRevenueLift: number;
  pricePositioningIndex: number;
  marketAverageRate: number;
  demandTier: 'Low Demand' | 'Healthy' | 'High Demand' | 'Surge / Peak';
  demandTierColor: string;
  roomTypeName: string;
  bundlingRecommendation: {
    title: string;
    items: string[];
    targetAudience: string;
  };
  positioningAnalysis: string;
}

export const ROOM_TYPE_META: Record<RoomType, { name: string; multiplier: number; description: string }> = {
  standard: {
    name: 'Standard Garden View Cottage',
    multiplier: 1.0,
    description: 'Tipe kamar baseline pondok asri dengan taman hijau teduh dan akses cepat ke pantai.',
  },
  deluxe: {
    name: 'Deluxe Pool View Room',
    multiplier: 1.25,
    description: 'Kamar lantai atas menghadap kolam renang dengan balkon privat.',
  },
  beachfront: {
    name: 'Executive Beachfront Villa',
    multiplier: 1.65,
    description: 'Villa eksklusif tepat di bibir pantai pasir putih dengan panorama Selat Sunda langsung.',
  },
  suite: {
    name: 'Sanghyang Family Grand Suite',
    multiplier: 2.1,
    description: 'Suite 2 kamar tidur luas dengan ruang keluarga, ideal untuk liburan keluarga besar.',
  },
};

export function calculateDynamicPrice(input: DynamicPricingInput): DynamicPricingResult {
  const baselineRate = Math.max(100000, input.baselineRate);
  const occupancy = Math.min(100, Math.max(10, input.occupancyPercent));
  const totalRooms = Math.max(10, input.totalRooms ?? 100);
  const roomType = input.roomType ?? 'standard';
  const roomMeta = ROOM_TYPE_META[roomType];

  // 1. Hitung Rata-Rata Pasar Kompetitor
  const compRates = [
    input.competitorRates.astonRate,
    input.competitorRates.mambrukRate,
    input.competitorRates.jayakartaRate,
  ].filter((r): r is number => typeof r === 'number' && r > 0);

  const marketAverageRate = compRates.length > 0
    ? Math.round(compRates.reduce((a, b) => a + b, 0) / compRates.length)
    : Math.round(baselineRate * 1.8);

  // 2. Faktor Okupansi (Demand Curve)
  let fOcc = 1.0;
  let demandTier: DynamicPricingResult['demandTier'] = 'Healthy';
  let demandTierColor = '#059669';

  if (occupancy < 40) {
    fOcc = 0.88 + (occupancy / 40) * 0.08; // 0.88 - 0.96
    demandTier = 'Low Demand';
    demandTierColor = '#0284c7';
  } else if (occupancy <= 70) {
    fOcc = 0.96 + ((occupancy - 40) / 30) * 0.16; // 0.96 - 1.12
    demandTier = 'Healthy';
    demandTierColor = '#10b981';
  } else if (occupancy <= 88) {
    fOcc = 1.12 + ((occupancy - 70) / 18) * 0.22; // 1.12 - 1.34
    demandTier = 'High Demand';
    demandTierColor = '#f59e0b';
  } else {
    fOcc = 1.34 + ((occupancy - 88) / 12) * 0.26; // 1.34 - 1.60
    demandTier = 'Surge / Peak';
    demandTierColor = '#ef4444';
  }

  // 3. Faktor Tipe Hari (Day of Week Multiplier)
  const dayFactors: Record<DayType, number> = {
    weekday: 0.92,
    friday: 1.12,
    saturday: 1.32,
    holiday: 1.48,
  };
  const fDay = dayFactors[input.dayType] ?? 1.0;

  // 4. Faktor Strategi (Strategy Multiplier)
  const strategyFactors: Record<PricingStrategy, number> = {
    volume: 0.88,
    balanced: 1.0,
    yield: 1.14,
  };
  const fStrat = strategyFactors[input.strategy] ?? 1.0;

  // 5. Kalkulasi Tarif Mentah
  const rawTargetRate = baselineRate * roomMeta.multiplier * fOcc * fDay * fStrat;

  // 6. Batas Aman Pasar (Guardrails)
  // Tidak boleh lebih rendah dari 70% baseline, dan untuk standard room tidak boleh melampaui Mambruk
  const priceFloor = Math.round(baselineRate * 0.75 * roomMeta.multiplier);
  const highestLuxuryCompetitor = Math.max(input.competitorRates.mambrukRate ?? 770000, input.competitorRates.astonRate ?? 660000);
  const priceCeiling = Math.round(highestLuxuryCompetitor * roomMeta.multiplier * 1.15);

  const boundedRate = Math.min(priceCeiling, Math.max(priceFloor, rawTargetRate));

  // Bulatkan ke nominal ribuan Rupiah yang rapi (kelipatan 5.000)
  const recommendedRate = Math.round(boundedRate / 5000) * 5000;
  const difference = recommendedRate - baselineRate;
  const percentChange = Number(((difference / baselineRate) * 100).toFixed(1));

  // 7. Kalkulasi RevPAR (Revenue Per Available Room)
  const occRatio = occupancy / 100;
  const revparBaseline = Math.round(baselineRate * occRatio);
  const revparRecommended = Math.round(recommendedRate * occRatio);
  const revparLiftPercent = revparBaseline > 0
    ? Number((((revparRecommended - revparBaseline) / revparBaseline) * 100).toFixed(1))
    : 0;

  // Proyeksi Bulanan (30 hari * totalRooms * RevPAR)
  const estimatedMonthlyRevenue = Math.round(revparRecommended * totalRooms * 30);
  const monthlyBaselineRevenue = Math.round(revparBaseline * totalRooms * 30);
  const estimatedMonthlyRevenueLift = estimatedMonthlyRevenue - monthlyBaselineRevenue;

  // 8. Price Positioning Index (PPI vs Pasar Anyer)
  const pricePositioningIndex = Number(((recommendedRate / (marketAverageRate * roomMeta.multiplier)) * 100).toFixed(1));

  // 9. Rekomendasi Bundling Taktis Berdasarkan Tarif Rekomendasi
  let bundlingRecommendation: DynamicPricingResult['bundlingRecommendation'];

  if (input.dayType === 'holiday' || occupancy > 85) {
    bundlingRecommendation = {
      title: 'Paket Peak Premium: Healing & Sunset Indah',
      items: [
        'Gratis 2 Tiket Terapi Onsen Air Panas Belerang Alami D\'Spa',
        'Voucher Makan Malam Rp 75.000 di Sunset Grill (Seafood Tepi Laut)',
        'Prioritas Meja Sunset di Dragon Beach Club',
      ],
      targetAudience: 'Wisatawan keluarga & pasangan liburan hari raya/long weekend',
    };
  } else if (input.dayType === 'saturday') {
    bundlingRecommendation = {
      title: 'Paket Weekend Escape: Beachfront Acoustic & BBQ',
      items: [
        'Akses Bebas Kolam Renang Air Hangat & Pantai Privat',
        'Diskon 20% Menu Bakaran Ikan Segar di Sunset Grill',
        'Free Welcome Tropical Mocktail di Dragon Beach Club',
      ],
      targetAudience: 'Tamu akhir pekan Jakarta & Banten yang mencari hiburan santai',
    };
  } else if (input.strategy === 'volume' || occupancy < 45) {
    bundlingRecommendation = {
      title: 'Paket Smart Staycation: Hemat Berkualitas',
      items: [
        'Sarapan prasmanan 2 orang di D\'Bistro',
        'Fasilitas Early Check-In pukul 12.00 WIB (S&K ketersediaan)',
        'Diskon 15% Seluruh Layanan Pijat Tradisional D\'Spa',
      ],
      targetAudience: 'Pelancong hemat, pekerja remote (work from hotel), dan transit',
    };
  } else {
    bundlingRecommendation = {
      title: 'Paket Keseimbangan Kompetitif: Nilai Lebih Anyer',
      items: [
        'Free Berendam Kolam Belerang Alami 1 Jam',
        'Diskon F&B 10% di Sunset Grill & D\'Bistro',
        'Gratis Sewa Sepeda Taman Pantai 30 Menit',
      ],
      targetAudience: 'Pasangan muda dan keluarga santai mid-tier',
    };
  }

  // 10. Analisis Posisi Pasar
  let positioningAnalysis = '';
  if (pricePositioningIndex < 75) {
    positioningAnalysis = `Tarif Sanghyang berada pada indeks ${pricePositioningIndex}% dari rata-rata kompetitor (Strong Value Tier). Sangat menarik bagi tamu yang sensitif harga namun menginginkan fasilitas resort lengkap.`;
  } else if (pricePositioningIndex <= 95) {
    positioningAnalysis = `Tarif Sanghyang berada pada indeks ${pricePositioningIndex}% dari rata-rata pasar (Optimal RevPAR Zone). Selisih harga tetap kompetitif di bawah Aston & Mambruk dengan profitabilitas kamar yang optimal.`;
  } else {
    positioningAnalysis = `Tarif Sanghyang berada pada indeks ${pricePositioningIndex}% dari rata-rata pasar (Upper Yield Zone). Penjualan wajib ditopang oleh keunikan fasilitas onsen belerang dan kuliner sunset grill agar konversi tetap tinggi.`;
  }

  return {
    recommendedRate,
    baselineRate,
    difference,
    percentChange,
    revparBaseline,
    revparRecommended,
    revparLiftPercent,
    estimatedMonthlyRevenue,
    estimatedMonthlyRevenueLift,
    pricePositioningIndex,
    marketAverageRate,
    demandTier,
    demandTierColor,
    roomTypeName: roomMeta.name,
    bundlingRecommendation,
    positioningAnalysis,
  };
}

