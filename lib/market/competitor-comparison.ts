import { sanghyangProfile } from "./sanghyang-profile";

export type ComparisonProfile = {
  name: string;
  sourceUrl: string;
  rooms: string;
  foodAndBeverage: string;
  facilities: string;
  eventsEntertainment: string;
  instagramUrl?: string;
  tiktokUrl?: string;
};

export const sanghyangComparisonProfile: ComparisonProfile = {
  name: sanghyangProfile.name,
  sourceUrl: sanghyangProfile.officialUrl,
  rooms: sanghyangProfile.rooms.join(", "),
  foodAndBeverage: sanghyangProfile.foodAndBeverage.join(", "),
  facilities: sanghyangProfile.facilities.join(", "),
  eventsEntertainment: "Meeting room sampai 100 orang; aktivitas pantai, sunset dining, dan watersport",
  instagramUrl: "https://www.instagram.com/sanghyangindahsparesort/",
};

export function buildComparisonProfile(competitor: {
  name: string;
  websiteUrl?: string | null;
  instagramUrl?: string | null;
  tiktokUrl?: string | null;
  location?: string | null;
  notes?: string | null;
}): ComparisonProfile {
  return {
    name: competitor.name,
    sourceUrl: competitor.websiteUrl || competitor.instagramUrl || "https://google.com/travel/hotels",
    rooms: competitor.notes?.includes("kamar") ? competitor.notes : "Akomodasi & tipe kamar resort tepi pantai",
    foodAndBeverage: competitor.notes?.includes("Resto") || competitor.notes?.includes("Cafe") ? competitor.notes : "F&B dining & beachfront resto",
    facilities: "Fasilitas rekreasi pantai, area santai, dan panorama laut Anyer",
    eventsEntertainment: "Aktivitas liburan, sunset leisure, dan acara pertemuan",
    instagramUrl: competitor.instagramUrl || undefined,
    tiktokUrl: competitor.tiktokUrl || undefined,
  };
}

/**
 * Daftar profil perbandingan kompetitor utama di kawasan Anyer–Carita.
 * Disinkronkan dengan registri properti dan profil resmi Sanghyang.
 */
export const comparisonProfiles: ComparisonProfile[] = [
  sanghyangComparisonProfile,
  {
    name: "Aston Anyer Beach Hotel & Aquavillas",
    sourceUrl: "https://anyer.astonhotelsinternational.com/",
    rooms: "101 kamar; Deluxe, Ocean View, Honeymoon Suite, Aquavillas atas laut privat",
    foodAndBeverage: "Sunset Café (pan-Asian & buffet), The Pier (overwater seafood dining)",
    facilities: "Overwater boardwalk dermaga kaca, infinity pool, private beach, kids playground",
    eventsEntertainment: "Live acoustic sunset, BBQ night di dermaga The Pier, floating breakfast di Aquavillas",
    instagramUrl: "https://www.instagram.com/astonanyer/",
    tiktokUrl: "https://www.tiktok.com/@archipelagohotels",
  },
  {
    name: "Mambruk Hotel & Convention",
    sourceUrl: "https://www.mambruk.co.id/facilities",
    rooms: "145 kamar; Superior, Premier Deluxe, Residence, Villa, Presidential Suite",
    foodAndBeverage: "Infinity Restaurant, Lighthouse Restaurant & Bar, Infinity Pool Bar",
    facilities: "Infinity pool, sea pool (kolam air laut), private beach, marina, boat park, taman tropis",
    eventsEntertainment: "Live entertainment, fire dance, meeting indoor sampai 500 pax, pendopo sampai 1.000 pax",
    instagramUrl: "https://www.instagram.com/mambrukhotelanyer/",
    tiktokUrl: "https://www.tiktok.com/@mambrukhotelanyer",
  },
  {
    name: "Novus Jiva Anyer Villa, Resort & Spa",
    sourceUrl: "https://novushotels.com/novusjiva/",
    rooms: "136 kamar modern & 10 private pool villas bertingkat di atas bukit tepi laut",
    foodAndBeverage: "The Upper Circle rooftop sunset bar, Serai Restaurant, Sarasa Lounge",
    facilities: "Seashell Chapel, infinity edge pool tebing laut, Barefoot beach, Daiva Spa",
    eventsEntertainment: "Golden hour sunset DJ, intimate beach wedding, yoga retreat, MICE ballroom",
    instagramUrl: "https://www.instagram.com/novusjivaanyer/",
    tiktokUrl: "https://www.tiktok.com/@novusjivaanyer",
  },
  {
    name: "Mövenpick Resort Carita",
    sourceUrl: "https://all.accor.com/hotel/B9W7/index.en.shtml",
    rooms: "Resort bintang 5 baru dengan kamar all-ocean view, Family Suite, Executive Suite",
    foodAndBeverage: "Lagoon Restaurant, Bluewave Lounge, Oceana Pool Bar, Swiss Chocolate Hour",
    facilities: "Outdoor infinity pool, private beach, kids club, Seabreeze golf simulator, Bliss Spa",
    eventsEntertainment: "Family weekend recreation, chocolate hour experience, sunset cocktails",
    instagramUrl: "https://www.instagram.com/movenpickresortcarita/",
    tiktokUrl: "https://www.tiktok.com/tag/movenpickcarita",
  },
  {
    name: "Mutiara Carita Cottages",
    sourceUrl: "https://mutiara-carita.com/",
    rooms: "Hotel room dan cottage 2–5 kamar; beberapa tipe sampai 290 m²",
    foodAndBeverage: "F&B resort dan dining untuk keluarga, corporate, serta event di jetty",
    facilities: "Private beach, water sport, ATV, mini zoo, konservasi penyu, playground, kolam",
    eventsEntertainment: "MICE, wedding, dinner di jetty, paintball, karaoke, flying fox",
    instagramUrl: "https://www.instagram.com/mutiaracarita/",
  },
  {
    name: "The Jayakarta Villas Anyer Beach Resort",
    sourceUrl: "https://jayakartagroup.com/affiliated/view/9",
    rooms: "48 unit; garden cottage 3–4 kamar dan Boutique Suites dengan full kitchen",
    foodAndBeverage: "Lagoon Restaurant, kapasitas 400 kursi; menu lokal, Chinese, dan Western",
    facilities: "Beach resort, kolam renang, spa, cottage dengan living room luas dan dapur",
    eventsEntertainment: "Meeting venue sampai 300 pax; ballroom, Krakatau, Payang, Rakata, Rawayan",
    instagramUrl: "https://www.instagram.com/thejayakartaanyer/",
  },
  {
    name: "Andalan Beach View Anyer",
    sourceUrl: "https://www.instagram.com/andalanbeach/",
    rooms: "Konsep Cafe & Beachfront Dining (tanpa kamar inap)",
    foodAndBeverage: "Kopi artisan, mocktail tropis, grilled platter, paket kongkow sunset",
    facilities: "Area pasir terbuka, beanbag warna-warni, panggung live music, spot sunset estetik ala Bali",
    eventsEntertainment: "Live music akustik harian, sunset chill sessions, bonfire night, beach gathering",
    instagramUrl: "https://www.instagram.com/andalanbeach/",
  },
];
