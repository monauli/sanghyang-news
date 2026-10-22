import { ai, model } from "../gemini";

export type ContentDraftInput = {
  competitorName: string;
  promoTitle: string;
  promoCategory: string;
  counterStrategy: string;
  outletName?: string;
};

export type SocialDraftReels = {
  format: "reels";
  headline: string;
  hook3Sec: string;
  visualDirection: string;
  caption: string;
  audioRecommendation: string;
  callToAction: string;
  hashtags: string[];
};

export type SocialDraftTikTok = {
  format: "tiktok";
  headline: string;
  hookPOV: string;
  storyline: string[];
  caption: string;
  soundTrend: string;
  callToAction: string;
  hashtags: string[];
};

export type SocialDraftCarousel = {
  format: "carousel";
  headline: string;
  slides: Array<{
    slideNo: number;
    title: string;
    description: string;
    visualNote: string;
  }>;
  caption: string;
  promoOffer: string;
  hashtags: string[];
};

export type GeneratedContentDraftBundle = {
  competitorContext: {
    competitorName: string;
    promoTitle: string;
    counterStrategy: string;
  };
  generatedAt: string;
  reels: SocialDraftReels;
  tiktok: SocialDraftTikTok;
  carousel: SocialDraftCarousel;
};

export function createFallbackContentDraft(input: ContentDraftInput): GeneratedContentDraftBundle {
  const outlet = input.outletName || "Sanghyang Indah Spa Resort";
  return {
    competitorContext: {
      competitorName: input.competitorName,
      promoTitle: input.promoTitle,
      counterStrategy: input.counterStrategy,
    },
    generatedAt: new Date().toISOString(),
    reels: {
      format: "reels",
      headline: `Liburan Tanpa Bikin Kantong Boncos di ${outlet}!`,
      hook3Sec: "Tahu gak kalau di Anyer ada resort pantai privat yang punya Onsen air belerang alami 24 jam?",
      visualDirection:
        "Buka video dengan transisi langkah kaki dari teras cottage langsung menyentuh pasir putih pantai, lanjut ke uap hangat Onsen alami saat senja.",
      caption: `Siapa bilang liburan mewah di tepi pantai Anyer harus mahal? 🌊✨\n\nDi ${outlet}, kamu bisa menikmati suasana resort asri seluas puluhan hektar, deburan ombak Selat Sunda langsung di depan mata, plus berendam di Onsen Air Panas Belerang Alami vulkanik 24 jam!\n\n${input.counterStrategy}\n\nTag orang tersayangmu yang butuh healing akhir pekan ini! 👇`,
      audioRecommendation: "Trending Acoustic Chill / Warm Sunset Surf Vibes",
      callToAction: "Kirim DM 'STAY' untuk dapatkan voucher diskon langsung & jaminan harga termurah!",
      hashtags: ["#SanghyangResort", "#AnyerBeach", "#ExploreBanten", "#WisataAnyer", "#StaycationAnyer"],
    },
    tiktok: {
      format: "tiktok",
      headline: "POV: Liburan Anti-Mainstream di Anyer",
      hookPOV: "POV: Pas orang lain bayar mahal buat hotel tebing, kamu nemu resort yang langsung di bibir pantai pasir putih...",
      storyline: [
        "Detik 0-3: POV membuka pintu cottage dengan pemandangan pohon kelapa dan laut lepas.",
        "Detik 4-10: Menunjukkan suasana santai di beanbag Dragon Beach Club & aroma seafood bakar Sunset Grill.",
        "Detik 11-20: Momen malam berendam air hangat belerang alami yang bikin badan rileks total.",
      ],
      caption: `Gak nyangka nemu tempat se-cozy ini di Anyer! Suasananya tenang, pantainya landai tanpa karang tajam, dan ada Onsen air belerang alami vulkanik 24 jam! 🏝️🧖‍♀️\n\nYuk agendakan bareng bestie kamu!`,
      soundTrend: "Original Sound POV / Lo-fi Chill Surf Trip",
      callToAction: "Cek link di bio kami buat amankan cottage favoritmu!",
      hashtags: ["#TikTokTravel", "#HiddenGemAnyer", "#HealingAnyer", "#InfoAnyer", "#RekomendasiHotel"],
    },
    carousel: {
      format: "carousel",
      headline: "5 Alasan Kenapa Kamu Harus Liburan ke Sanghyang",
      slides: [
        {
          slideNo: 1,
          title: "Bosan Sama Hotel yang Gitu-Gitu Aja?",
          description: "Temukan resort pantai luas dengan alam asri di Anyer.",
          visualNote: "Foto aerial panorama pantai Sanghyang saat golden hour.",
        },
        {
          slideNo: 2,
          title: "Akses Langsung ke Pantai Pasir Putih",
          description: "Hanya 10 langkah dari cottage, tanpa tangga curam atau tebing berbahaya.",
          visualNote: "Foto keluarga berjalan santai di tepi pantai.",
        },
        {
          slideNo: 3,
          title: "Satu-satunya Onsen Air Belerang Alami di Anyer",
          description: "Bikin kulit halus, redakan pegal-pegal, dan bebas dinikmati 24 jam.",
          visualNote: "Uap hangat kolam onsen alami dengan pencahayaan hangat malam hari.",
        },
        {
          slideNo: 4,
          title: "Sunset Grill & Dragon Beach Club",
          description: "Makan seafood bakar segar langsung di atas pasir pantai.",
          visualNote: "Platter seafood bakar lezat dengan latar matahari tenggelam.",
        },
        {
          slideNo: 5,
          title: "Penawaran Spesial Pekan Ini!",
          description: input.counterStrategy,
          visualNote: "Grafis penawaran voucher promo dengan kontak WhatsApp resmi.",
        },
      ],
      caption: `Mau liburan yang benar-benar rileks tanpa ribet? 🌴\n\nGeser ke kiri untuk lihat 5 keunggulan unik Sanghyang Indah Spa Resort yang gak bakal kamu temukan di hotel lain di Anyer!\n\n${input.counterStrategy}\n\nHubungi kontak kami sekarang sebelum kuota cottage penuh! 📞`,
      promoOffer: "Paket Menginap Cottage + Free Onsen Soak + Diskon F&B Sunset Grill",
      hashtags: ["#SanghyangIndahSpaResort", "#HotelAnyer", "#PantaiAnyer", "#LiburanKeluarga", "#WeekendGetaway"],
    },
  };
}

/**
 * Menghasilkan 3 draf konten media sosial berkualitas tinggi (Reels, TikTok, Carousel)
 * menggunakan model Gemini AI yang terintegrasi dengan data intelijen kompetitor.
 */
export async function generateSocialContentDrafts(
  input: ContentDraftInput
): Promise<GeneratedContentDraftBundle> {
  const fallback = createFallbackContentDraft(input);

  if (!process.env.GEMINI_API_KEY) {
    return fallback;
  }

  try {
    const prompt = `Kamu adalah Creative Social Media Director profesional untuk Sanghyang Indah Spa Resort Anyer (resort pantai luas dengan cottage asri, Sunset Grill tepi pantai, Dragon Beach Club, dan satu-satunya Onsen Air Panas Belerang Alami vulkanik 24 jam di Banten).
    
Tugasmu adalah membuat STRATEGI BALASAN KONTEN MEDIA SOSIAL (Instagram Reels, TikTok POV, dan Instagram Carousel) untuk mengimbangi promo kompetitor berikut:

<KOMPETITOR>
Nama Kompetitor: ${input.competitorName}
Judul Promo/Event: ${input.promoTitle}
Kategori: ${input.promoCategory}
</KOMPETITOR>

<TAKTIK_BALASAN_SANGHYANG>
Rekomendasi Taktis: ${input.counterStrategy}
Outlet Terkait: ${input.outletName || "Sanghyang Indah Spa Resort"}
</TAKTIK_BALASAN_SANGHYANG>

Instruksi:
Keluarkan HANYA JSON valid (tanpa markdown pembuka/penutup) dengan struktur:
{
  "reels": {
    "format": "reels",
    "headline": "string",
    "hook3Sec": "string",
    "visualDirection": "string",
    "caption": "string",
    "audioRecommendation": "string",
    "callToAction": "string",
    "hashtags": ["string"]
  },
  "tiktok": {
    "format": "tiktok",
    "headline": "string",
    "hookPOV": "string",
    "storyline": ["string"],
    "caption": "string",
    "soundTrend": "string",
    "callToAction": "string",
    "hashtags": ["string"]
  },
  "carousel": {
    "format": "carousel",
    "headline": "string",
    "slides": [
      {
        "slideNo": 1,
        "title": "string",
        "description": "string",
        "visualNote": "string"
      }
    ],
    "caption": "string",
    "promoOffer": "string",
    "hashtags": ["string"]
  }
}`;

    const res = await ai().models.generateContent({
      model: model(),
      contents: prompt,
    });

    const text = res.text?.trim() || "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return fallback;

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      competitorContext: {
        competitorName: input.competitorName,
        promoTitle: input.promoTitle,
        counterStrategy: input.counterStrategy,
      },
      generatedAt: new Date().toISOString(),
      reels: parsed.reels || fallback.reels,
      tiktok: parsed.tiktok || fallback.tiktok,
      carousel: parsed.carousel || fallback.carousel,
    };
  } catch (err) {
    console.warn("[ai-content-generator] Kendala panggilan Gemini, beralih ke fallback cerdas:", (err as Error)?.message);
    return fallback;
  }
}

