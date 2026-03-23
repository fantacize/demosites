import { initBrowser, closeBrowser, searchPlaces } from "./places.js";

async function test() {
  await initBrowser();
  const results = await searchPlaces("", "restaurant in Wallingford, CT");
  console.log(`Found ${results.length} results`);
  for (const r of results.slice(0, 5)) {
    console.log(`  ${r.name} | ${r.phone || "no phone"} | ${r.website || "NO WEBSITE"} | ${r.rating}⭐ (${r.reviewCount})`);
  }
  await closeBrowser();
}

test().catch(console.error);
