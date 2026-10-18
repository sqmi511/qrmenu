import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import mongoose, { Types } from "mongoose";
import { connectDB } from "../config/db.js";
import { Category } from "../models/Category.js";
import { InvoiceCounter } from "../models/InvoiceCounter.js";
import { Item } from "../models/Item.js";
import { Order } from "../models/Order.js";
import { Restaurant } from "../models/Restaurant.js";
import { User } from "../models/User.js";
import { haversineKm } from "../utils/delivery.js";
import { computeTotals } from "../utils/pricing.js";

const SLUG = "cedar-olive";
const EMAIL = (process.env.DEMO_EMAIL ?? "demo@example.com").toLowerCase();
const PASSWORD = process.env.DEMO_PASSWORD ?? randomBytes(9).toString("base64url");
const ORIGIN = { lat: 34.0047, lng: 36.211 };
const DAY = 86_400_000;

// deterministic, so every run gives the same history
function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = rng(2026);
const int = (a: number, b: number) => a + Math.floor(rand() * (b - a + 1));
const pick = <T>(a: T[]) => a[int(0, a.length - 1)];

interface Seed {
  en: string;
  ar: string;
  dEn: string;
  dAr: string;
  price: number; // minor units
  tags: string[];
  img: string; // image keyword
}

const MENU: { en: string; ar: string; items: Seed[] }[] = [
  {
    en: "Starters",
    ar: "المقبلات",
    items: [
      { en: "Hummus", ar: "حمص", dEn: "Chickpeas, tahini, olive oil", dAr: "حمص وطحينة وزيت زيتون", price: 550, tags: ["vegan", "popular"], img: "hummus" },
      { en: "Baba Ghanoush", ar: "بابا غنوج", dEn: "Smoked eggplant, tahini, lemon", dAr: "باذنجان مشوي وطحينة وليمون", price: 600, tags: ["vegan"], img: "eggplant" },
      { en: "Tabbouleh", ar: "تبولة", dEn: "Parsley, bulgur, tomato, lemon", dAr: "بقدونس وبرغل وبندورة وليمون", price: 600, tags: ["vegan"], img: "tabbouleh" },
      { en: "Fattoush", ar: "فتوش", dEn: "Crisp greens, sumac, toasted pita", dAr: "خضار مقرمشة وسماق وخبز محمص", price: 650, tags: ["vegetarian"], img: "salad" },
      { en: "Falafel", ar: "فلافل", dEn: "Crispy chickpea fritters, tahini", dAr: "أقراص حمص مقرمشة مع الطحينة", price: 500, tags: ["vegan", "popular"], img: "falafel" },
    ],
  },
  {
    en: "Mains",
    ar: "الأطباق الرئيسية",
    items: [
      { en: "Mixed Grill", ar: "مشاوي مشكلة", dEn: "Kafta, shish tawook, lamb skewer", dAr: "كفتة وشيش طاووق وسيخ لحم", price: 1850, tags: ["halal", "popular"], img: "kebab" },
      { en: "Chicken Shawarma", ar: "شاورما دجاج", dEn: "Garlic sauce, pickles, saj bread", dAr: "ثوم ومخلل على خبز الصاج", price: 950, tags: ["halal", "popular"], img: "shawarma" },
      { en: "Shish Tawook", ar: "شيش طاووق", dEn: "Marinated chicken skewers, garlic", dAr: "أسياخ دجاج متبلة مع الثوم", price: 1200, tags: ["halal"], img: "chicken" },
      { en: "Kafta Skewers", ar: "كفتة مشوية", dEn: "Spiced minced beef, grilled", dAr: "لحم مفروم متبل مشوي", price: 1300, tags: ["halal", "spicy"], img: "skewers" },
      { en: "Kibbeh", ar: "كبة", dEn: "Fried bulgur shells with spiced lamb", dAr: "كبة مقلية محشوة بلحم متبّل", price: 1200, tags: ["halal"], img: "meatball" },
    ],
  },
  {
    en: "Desserts",
    ar: "الحلويات",
    items: [
      { en: "Baklava", ar: "بقلاوة", dEn: "Phyllo, pistachio, syrup", dAr: "عجين فيلو وفستق وقطر", price: 700, tags: ["vegetarian"], img: "baklava" },
      { en: "Kunafa", ar: "كنافة", dEn: "Warm cheese, crisp semolina, syrup", dAr: "جبنة دافئة وكنافة مقرمشة وقطر", price: 800, tags: ["vegetarian", "new"], img: "dessert" },
      { en: "Rice Pudding", ar: "رز بحليب", dEn: "Creamy milk pudding, orange blossom", dAr: "رز بحليب كريمي وماء زهر", price: 550, tags: ["vegetarian"], img: "pudding" },
    ],
  },
  {
    en: "Drinks",
    ar: "المشروبات",
    items: [
      { en: "Mint Lemonade", ar: "ليموناضة بالنعناع", dEn: "Fresh lemon, mint, ice", dAr: "ليمون طازج ونعناع وثلج", price: 400, tags: ["vegan", "popular"], img: "lemonade" },
      { en: "Arabic Coffee", ar: "قهوة عربية", dEn: "Cardamom-scented, served hot", dAr: "قهوة بالهيل تقدم ساخنة", price: 300, tags: ["vegan"], img: "coffee" },
      { en: "Jallab", ar: "جلاب", dEn: "Date molasses, rose water, pine nuts", dAr: "دبس تمر وماء ورد وصنوبر", price: 450, tags: ["vegan"], img: "juice" },
      { en: "Ayran", ar: "عيران", dEn: "Chilled salted yogurt drink", dAr: "مشروب لبن بارد مملح", price: 300, tags: ["vegetarian"], img: "yogurt" },
    ],
  },
];

const NAMES = ["Rami Haddad", "Nour Khalil", "Layla Mansour", "Omar Saad", "Maya Aoun", "Hadi Nassar", "Rima Fakhoury", "Karim Salameh"];
const STREETS = ["Main Street", "Hospital Road", "Temple Road", "Rayak Road", "Park Street", "Old Souk"];

async function main() {
  await connectDB();

  const old = await Restaurant.findOne({ slug: SLUG }).select("_id").lean();
  if (old) {
    await Promise.all([
      Order.deleteMany({ restaurant: old._id }),
      Item.deleteMany({ restaurant: old._id }),
      Category.deleteMany({ restaurant: old._id }),
      User.deleteMany({ restaurant: old._id }),
      InvoiceCounter.deleteOne({ _id: old._id }),
    ]);
    await Restaurant.deleteOne({ _id: old._id });
  }
  if (await User.exists({ email: EMAIL })) {
    throw new Error(`${EMAIL} already belongs to another account. Set DEMO_EMAIL to a different address.`);
  }

  const restaurant = await Restaurant.create({
    slug: SLUG,
    name: { en: "Cedar & Olive", ar: "الأرز والزيتون" },
    description: { en: "Modern Levantine kitchen in the heart of Baalbek", ar: "مطبخ شامي عصري في قلب بعلبك" },
    coverUrl: "https://loremflickr.com/1600/700/lebanese,food?lock=7",
    currency: "USD",
    defaultLang: "en",
    tableCount: 12,
    accentColor: "#4d7c0f",
    vatBps: 1100,
    pricesIncludeVat: false,
    dineInEnabled: true,
    deliveryEnabled: true,
    deliveryFeeMinor: 200,
    deliveryPerKmMinor: 100,
    freeDeliveryOverMinor: 4000,
    maxDeliveryKm: 15,
    minDeliveryOrderMinor: 0,
    locationLat: ORIGIN.lat,
    locationLng: ORIGIN.lng,
    whatsappNumber: "96170123456",
    paymentCash: true,
    paymentCard: true,
    address: "Main Street, Baalbek, Lebanon",
    phone: "+961 8 123 456",
    vatNumber: "123456-001",
    invoiceFooter: "Thank you for dining with us! شكراً لزيارتكم",
    plan: "annual", // not logged as a payment, so your income stays clean
    accessUntil: new Date(Date.now() + 365 * DAY),
  });
  const rid = restaurant._id;

  await User.create({
    email: EMAIL,
    passwordHash: await bcrypt.hash(PASSWORD, 12),
    role: "admin",
    restaurant: rid,
    mustChangePassword: false,
  });

  const all: { id: Types.ObjectId; en: string; ar: string; price: number; popular: boolean }[] = [];
  let n = 0;
  for (const [ci, c] of MENU.entries()) {
    const cat = await Category.create({ restaurant: rid, name: { en: c.en, ar: c.ar }, order: ci });
    const docs = await Item.insertMany(
      c.items.map((it, ii) => ({
        restaurant: rid,
        category: cat._id,
        name: { en: it.en, ar: it.ar },
        description: { en: it.dEn, ar: it.dAr },
        priceMinor: it.price,
        imageUrl: `https://loremflickr.com/600/600/${it.img}?lock=${++n}`,
        tags: it.tags,
        isAvailable: true,
        order: ii,
      })),
    );
    docs.forEach((d, i) =>
      all.push({ id: d._id as Types.ObjectId, en: c.items[i].en, ar: c.items[i].ar, price: c.items[i].price, popular: c.items[i].tags.includes("popular") }),
    );
  }

  // ~14 days of order history; popular items are picked more often
  const pool = all.flatMap((it, i) => (it.popular ? [i, i, i] : [i]));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const cutoff = Date.now() - 30 * 60_000;
  const orders: Record<string, unknown>[] = [];

  for (let d = 13; d >= 0; d--) {
    const day = new Date(today.getTime() - d * DAY);
    const busy = [5, 6].includes(day.getDay()) ? 7 : 0;
    const count = int(8, 20) + busy;

    for (let k = 0; k < count; k++) {
      const createdAt = new Date(day.getTime() + int(690, 1350) * 60_000); // 11:30 to 22:30
      if (createdAt.getTime() > cutoff) continue;

      const chosen = new Set<number>();
      const want = int(1, 4);
      while (chosen.size < want) chosen.add(pool[int(0, pool.length - 1)]);
      const lines = [...chosen].map((i) => ({
        item: all[i].id,
        nameSnapshot: { en: all[i].en, ar: all[i].ar },
        priceMinorSnapshot: all[i].price,
        qty: rand() < 0.7 ? 1 : int(2, 3),
        note: "",
      }));
      const subtotal = lines.reduce((s, l) => s + l.priceMinorSnapshot * l.qty, 0);

      const delivery = rand() < 0.35;
      let fee = 0;
      let customer: Record<string, unknown> | undefined;
      let km: number | undefined;
      if (delivery) {
        const loc = { lat: ORIGIN.lat + (rand() - 0.5) * 0.12, lng: ORIGIN.lng + (rand() - 0.5) * 0.12 };
        km = Math.round(haversineKm(ORIGIN, loc) * 100) / 100;
        fee = subtotal >= 4000 ? 0 : 200 + 100 * Math.ceil(km);
        customer = {
          name: pick(NAMES),
          phone: `+96170${int(100000, 999999)}`,
          address: `${pick(STREETS)}, Baalbek, building ${int(1, 40)}`,
          notes: "",
          location: { lat: Math.round(loc.lat * 1e6) / 1e6, lng: Math.round(loc.lng * 1e6) / 1e6 },
        };
      }
      const totals = computeTotals(subtotal, { vatBps: 1100, pricesIncludeVat: false, deliveryFeeMinor: fee });
      const cancelled = rand() < 0.05;

      orders.push({
        _id: new Types.ObjectId(),
        restaurant: rid,
        orderType: delivery ? "delivery" : "dine_in",
        ...(delivery ? { customer, deliveryDistanceKm: km } : { tableNumber: int(1, 12) }),
        lines,
        vatBps: 1100,
        pricesIncludeVat: false,
        ...totals,
        paymentMethod: rand() < 0.6 ? "cash" : "card",
        paymentStatus: cancelled ? "unpaid" : "paid",
        status: cancelled ? "cancelled" : "served",
        publicToken: randomBytes(24).toString("base64url"),
        createdAt,
        updatedAt: new Date(Math.min(createdAt.getTime() + 40 * 60_000, Date.now())),
      });
    }
  }
  // raw insert keeps the back-dated timestamps
  await Order.collection.insertMany(orders);

  const origin = process.env.CLIENT_ORIGIN ?? "http://localhost:5173";
  console.log(`\nDemo ready: ${all.length} items, ${orders.length} past orders`);
  console.log(`Menu:   ${origin}/r/${SLUG}?table=5`);
  console.log(`Admin:  ${origin}/admin/login`);
  console.log(`Email:    ${EMAIL}`);
  console.log(`Password: ${PASSWORD}\n`);
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());