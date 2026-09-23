export type ComparisonProfile = {
  name: string;
  sourceUrl: string;
  rooms: string;
  foodAndBeverage: string;
  facilities: string;
  eventsEntertainment: string;
};

export const comparisonProfiles: ComparisonProfile[] = [
  {
    name: "Sanghyang Indah Spa Resort",
    sourceUrl: "https://sanghyang.com/",
    rooms: "7 tipe: Baduy Suite, Krakatau Suite, Beach View, Villa, Condo, Sanghyang Suite, Deluxe",
    foodAndBeverage: "D’Bistro, Sunset Grill, Pool Garden",
    facilities: "Spa air panas, kolam renang, beach access, watersport, tenis",
    eventsEntertainment: "Meeting room sampai 100 orang; aktivitas pantai dan watersport",
  },
  {
    name: "Mambruk Hotel & Convention",
    sourceUrl: "https://www.mambruk.co.id/facilities",
    rooms: "145 kamar; Superior, Premier Deluxe, Residence, Villa, Presidential Suite",
    foodAndBeverage: "Infinity Restaurant, Lighthouse Restaurant & Bar, Infinity Pool Bar",
    facilities: "Infinity pool, sea pool, private beach, playground, marina, boat park",
    eventsEntertainment: "Live entertainment; meeting indoor sampai 500 pax dan pendopo sampai 1.000 pax",
  },
  {
    name: "Mutiara Carita Cottages",
    sourceUrl: "https://mutiara-carita.com/",
    rooms: "Hotel room dan cottage 2–5 kamar; beberapa tipe sampai 290 m²",
    foodAndBeverage: "F&B resort dan dining untuk keluarga, corporate, serta event",
    facilities: "Private beach, water sport, ATV, mini zoo, konservasi penyu, playground, kolam",
    eventsEntertainment: "MICE, wedding, dinner di jetty, paintball, karaoke, flying fox",
  },
  {
    name: "The Jayakarta Villas Anyer",
    sourceUrl: "https://jayakartagroup.com/affiliated/view/9",
    rooms: "48 unit; garden cottage 3–4 kamar dan Boutique Suites",
    foodAndBeverage: "Lagoon Restaurant, kapasitas 400 kursi; menu lokal, Chinese, dan Western",
    facilities: "Beach resort, kolam renang, spa, cottage dengan living room dan full kitchen",
    eventsEntertainment: "Meeting venue sampai 300 pax; ballroom, Krakatau, Payang, Rakata, Rawayan",
  },
];
