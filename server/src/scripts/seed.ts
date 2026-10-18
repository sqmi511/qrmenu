import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import { Category } from "../models/Category.js";
import { Item } from "../models/Item.js";
import { Restaurant } from "../models/Restaurant.js";

const L = (en: string, ar: string) => ({ en, ar });

const menu = [
  {
    name: L("Starters", "المقبلات"),
    items: [
      { name: L("Hummus", "حمص"), description: L("Chickpeas, tahini, olive oil", "حمص وطحينة وزيت زيتون"), priceMinor: 550, tags: ["vegan", "popular"] },
      { name: L("Tabbouleh", "تبولة"), description: L("Parsley, bulgur, tomato, lemon", "بقدونس وبرغل وبندورة وليمون"), priceMinor: 600, tags: ["vegan"] },
      { name: L("Fattoush", "فتوش"), description: L("Crisp greens, sumac, toasted pita", "خضار مقرمشة وسماق وخبز محمص"), priceMinor: 650, tags: ["vegetarian"] },
    ],
  },
  {
    name: L("Mains", "الأطباق الرئيسية"),
    items: [
      { name: L("Mixed Grill", "مشاوي مشكلة"), description: L("Kafta, shish tawook, lamb skewer", "كفتة وشيش طاووق وسيخ لحم"), priceMinor: 1850, tags: ["halal", "popular"] },
      { name: L("Chicken Shawarma", "شاورما دجاج"), description: L("Garlic sauce, pickles, saj bread", "ثوم ومخلل على خبز الصاج"), priceMinor: 950, tags: ["halal"] },
      { name: L("Kibbeh", "كبة"), description: L("Fried bulgur shells with spiced lamb", "كبة مقلية محشوة بلحم متبّل"), priceMinor: 1200, tags: ["halal", "spicy"] },
    ],
  },
  {
    name: L("Desserts", "الحلويات"),
    items: [
      { name: L("Baklava", "بقلاوة"), description: L("Phyllo, pistachio, syrup", "عجين فيلو وفستق وقطر"), priceMinor: 700, tags: ["vegetarian"] },
      { name: L("Kunafa", "كنافة"), description: L("Warm cheese, crisp semolina, syrup", "جبنة دافئة وكنافة مقرمشة وقطر"), priceMinor: 800, tags: ["vegetarian", "new"] },
    ],
  },
  {
    name: L("Drinks", "المشروبات"),
    items: [
      { name: L("Mint Lemonade", "ليموناضة بالنعناع"), description: L("Fresh lemon, mint, ice", "ليمون طازج ونعناع وثلج"), priceMinor: 400, tags: ["vegan"] },
      { name: L("Arabic Coffee", "قهوة عربية"), description: L("Cardamom-scented, served hot", "قهوة بالهيل تقدم ساخنة"), priceMinor: 300, tags: ["vegan"] },
    ],
  },
];

async function main() {
  await connectDB();

  const old = await Restaurant.findOne({ slug: "demo" });
  if (old) {
    await Promise.all([Item.deleteMany({ restaurant: old._id }), Category.deleteMany({ restaurant: old._id })]);
    await old.deleteOne();
  }

  const rest = await Restaurant.create({
    slug: "demo",
    name: L("Cedar & Olive", "الأرز والزيتون"),
    description: L("Modern Levantine kitchen", "مطبخ شامي عصري"),
    currency: "USD",
    tableCount: 12,
  });

  for (const [ci, c] of menu.entries()) {
    const cat = await Category.create({ restaurant: rest._id, name: c.name, order: ci });
    await Item.insertMany(c.items.map((it, ii) => ({ ...it, restaurant: rest._id, category: cat._id, order: ii })));
  }

  console.log(`Seeded slug "demo", restaurant id ${rest._id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());