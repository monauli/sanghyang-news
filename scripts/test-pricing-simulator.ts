import assert from 'node:assert/strict';
import { calculateDynamicPrice, ROOM_TYPE_META, type DayType, type PricingStrategy, type RoomType } from '../lib/market/dynamic-pricing';

function runPricingSimulatorTests() {
  console.log('--- Memulai Pengujian Algoritma Kalkulator Simulasi Tarif Dinamis & RevPAR ---');

  const baselineRate = 285602; // Tarif riil Sanghyang dari Google Hotels
  const competitorRates = {
    astonRate: 663094,
    mambrukRate: 776288,
    jayakartaRate: 229168,
  };

  // Test 1: Skenario Normal (Balanced, Weekday, 50% Occupancy)
  const resBalanced = calculateDynamicPrice({
    baselineRate,
    competitorRates,
    occupancyPercent: 50,
    dayType: 'weekday',
    strategy: 'balanced',
    roomType: 'standard',
  });

  console.log('[Test 1] Skenario Balanced Weekday 50%:');
  console.log(`  Tarif Baseline: Rp ${resBalanced.baselineRate.toLocaleString('id-ID')}`);
  console.log(`  Rekomendasi Tarif: Rp ${resBalanced.recommendedRate.toLocaleString('id-ID')}`);
  console.log(`  Perubahan: ${resBalanced.percentChange}%`);
  console.log(`  RevPAR: Rp ${resBalanced.revparRecommended.toLocaleString('id-ID')}`);
  console.log(`  Price Positioning Index: ${resBalanced.pricePositioningIndex}%`);

  assert.ok(resBalanced.recommendedRate > 0, 'Tarif harus bernilai positif');
  assert.ok(resBalanced.revparRecommended > 0, 'RevPAR harus bernilai positif');
  assert.equal(resBalanced.demandTier, 'Healthy', 'Demand tier harus Healthy');

  // Test 2: Skenario Peak Saturday (85% Occupancy, Saturday, Yield Strategy)
  const resPeak = calculateDynamicPrice({
    baselineRate,
    competitorRates,
    occupancyPercent: 85,
    dayType: 'saturday',
    strategy: 'yield',
    roomType: 'standard',
  });

  console.log('[Test 2] Skenario Peak Saturday 85% Yield:');
  console.log(`  Rekomendasi Tarif: Rp ${resPeak.recommendedRate.toLocaleString('id-ID')}`);
  console.log(`  Perubahan: +${resPeak.percentChange}%`);
  console.log(`  RevPAR Lift: +${resPeak.revparLiftPercent}%`);
  console.log(`  Estimasi Tambahan Omset Bulanan: +Rp ${resPeak.estimatedMonthlyRevenueLift.toLocaleString('id-ID')}`);

  assert.ok(resPeak.recommendedRate > resBalanced.recommendedRate, 'Tarif Peak Sabtu harus lebih tinggi dari Weekday');
  assert.ok(resPeak.revparLiftPercent > 0, 'RevPAR lift harus positif pada skenario peak');
  assert.equal(resPeak.demandTier, 'High Demand', 'Demand tier harus High Demand');

  // Test 3: Skenario Low Demand (Volume strategy, 20% Occupancy, Weekday)
  const resLow = calculateDynamicPrice({
    baselineRate,
    competitorRates,
    occupancyPercent: 20,
    dayType: 'weekday',
    strategy: 'volume',
    roomType: 'standard',
  });

  console.log('[Test 3] Skenario Low Demand 20% Volume:');
  console.log(`  Rekomendasi Tarif: Rp ${resLow.recommendedRate.toLocaleString('id-ID')}`);
  assert.equal(resLow.demandTier, 'Low Demand', 'Demand tier harus Low Demand');
  assert.ok(resLow.recommendedRate <= baselineRate, 'Tarif volume low demand harus kompetitif/fleksibel');

  // Test 4: Uji Semua Tipe Kamar
  const roomTypes: RoomType[] = ['standard', 'deluxe', 'beachfront', 'suite'];
  for (const rt of roomTypes) {
    const resRoom = calculateDynamicPrice({
      baselineRate,
      competitorRates,
      occupancyPercent: 70,
      dayType: 'saturday',
      strategy: 'balanced',
      roomType: rt,
    });
    assert.ok(resRoom.recommendedRate > 0);
    assert.equal(resRoom.roomTypeName, ROOM_TYPE_META[rt].name);
    console.log(`  [Room Type] ${ROOM_TYPE_META[rt].name}: Rp ${resRoom.recommendedRate.toLocaleString('id-ID')}`);
  }

  // Test 5: Bundling Rekomendasi tidak boleh kosong
  assert.ok(resPeak.bundlingRecommendation.title, 'Bundling recommendation title must exist');
  assert.ok(resPeak.bundlingRecommendation.items.length >= 2, 'Bundling items must have at least 2 items');

  console.log('✅ Seluruh pengujian matematika finansial Dynamic Pricing Simulator BERHASIL LOLOS!');
}

runPricingSimulatorTests();
