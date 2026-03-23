import { searchPlaces, initBrowser, closeBrowser } from "./places.js";
import { qualifyLeads } from "./qualify.js";
import { writeOutput } from "./output.js";
import type { RawBusiness } from "./types.js";

const LOCATIONS = ["Wallingford, CT", "Toronto, ON"];

const CATEGORIES = [
  "restaurant",
  "hair salon",
  "barber shop",
  "auto repair",
  "dentist",
  "plumber",
  "electrician",
  "landscaping",
  "cleaning service",
  "yoga studio",
  "gym",
  "bakery",
  "florist",
  "pet grooming",
  "tattoo shop",
  "nail salon",
  "chiropractor",
  "accountant",
  "lawyer",
  "real estate agent",
];

async function main() {
  console.log("Starting lead search...\n");

  await initBrowser();

  const allBusinesses: RawBusiness[] = [];

  for (const location of LOCATIONS) {
    for (const category of CATEGORIES) {
      const query = `${category} in ${location}`;
      console.log(`  Searching: ${query}`);

      try {
        const results = await searchPlaces("", query);
        console.log(`    Found ${results.length} results`);
        allBusinesses.push(...results);
      } catch (err) {
        console.error(`  Failed: ${query}`, (err as Error).message);
      }

      // Longer delay between searches to avoid rate limiting
      await sleep(5000 + Math.random() * 5000);
    }
  }

  await closeBrowser();

  console.log(`\nFound ${allBusinesses.length} total businesses`);

  const unique = dedup(allBusinesses);
  console.log(`${unique.length} unique businesses after dedup`);

  const leads = qualifyLeads(unique);
  console.log(`${leads.length} qualified leads (no website or weak web presence)\n`);

  const { csvPath, jsonPath, htmlPath } = await writeOutput(leads);
  console.log(`Results saved to:`);
  console.log(`  CSV:  ${csvPath}`);
  console.log(`  JSON: ${jsonPath}`);
  console.log(`  HTML: ${htmlPath}  (open in browser for interactive view)`);
}

function dedup(businesses: RawBusiness[]): RawBusiness[] {
  const seen = new Map<string, RawBusiness>();
  for (const b of businesses) {
    if (!seen.has(b.placeId)) {
      seen.set(b.placeId, b);
    }
  }
  return [...seen.values()];
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch(console.error);
