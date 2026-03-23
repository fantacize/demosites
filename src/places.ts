import puppeteer, { type Page } from "puppeteer";
import type { RawBusiness } from "./types.js";

async function autoScroll(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const feed = document.querySelector('div[role="feed"]');
    if (!feed) return;
    for (let i = 0; i < 5; i++) {
      feed.scrollTop = feed.scrollHeight;
      await new Promise((r) => setTimeout(r, 1500));
    }
  });
}

export async function initBrowser(): Promise<void> {}
export async function closeBrowser(): Promise<void> {}

export async function searchPlaces(
  _apiKey: string,
  query: string
): Promise<RawBusiness[]> {
  const location = query.includes("Toronto")
    ? "Toronto, ON"
    : "Wallingford, CT";

  // Fresh browser per search to avoid Google flagging
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-blink-features=AutomationControlled",
    ],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
    );

    const url = `https://www.google.com/maps/search/${encodeURIComponent(query)}`;
    await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });

    await page
      .waitForSelector('div[role="feed"]', { timeout: 10000 })
      .catch(() => null);
    await autoScroll(page);

    // Collect listing URLs and basic info from the results list
    const listings = await page.evaluate(() => {
      const results: Array<{
        name: string;
        url: string;
        rating: number;
        reviewCount: number;
        category: string;
        address: string;
      }> = [];

      const articles = document.querySelectorAll(
        'div[role="feed"] div[role="article"]'
      );

      for (const article of articles) {
        const link = article.querySelector(
          "a.hfpxzc"
        ) as HTMLAnchorElement | null;
        if (!link) continue;

        const name = link.getAttribute("aria-label") ?? "";
        const url = link.href ?? "";
        if (!name || !url) continue;

        const text = article.textContent ?? "";

        const ratingMatch = text.match(/(\d\.\d)\s*\((\d[\d,]*)\)/);
        const rating = ratingMatch ? parseFloat(ratingMatch[1]) : 0;
        const reviewCount = ratingMatch
          ? parseInt(ratingMatch[2].replace(/,/g, ""), 10)
          : 0;

        const afterName = text.slice(text.indexOf(name) + name.length);
        const parts = afterName
          .split("·")
          .map((s) => s.trim())
          .filter(Boolean);
        const category =
          parts[0]?.replace(/^\d\.\d.*?\)/, "").trim() ?? "";
        const address = parts[1] ?? "";

        results.push({ name, url, rating, reviewCount, category, address });
      }

      return results;
    });

    if (listings.length === 0) {
      await browser.close();
      return [];
    }

    // Visit each listing to get phone + website
    const businesses: RawBusiness[] = [];

    for (const listing of listings.slice(0, 20)) {
      try {
        await page.goto(listing.url, {
          waitUntil: "networkidle2",
          timeout: 15000,
        });

        await page
          .waitForSelector("button[data-item-id]", { timeout: 5000 })
          .catch(() => null);

        const details = await page.evaluate(() => {
          let phone = "";
          let website = "";
          let address = "";
          let rating = 0;
          let reviewCount = 0;

          const phoneBtn = document.querySelector(
            'button[data-item-id^="phone:"]'
          );
          if (phoneBtn) {
            phone =
              phoneBtn
                .getAttribute("data-item-id")
                ?.replace("phone:tel:", "") ?? "";
          }

          const websiteLink = document.querySelector(
            'a[data-item-id="authority"]'
          );
          if (websiteLink) {
            website = (websiteLink as HTMLAnchorElement).href ?? "";
          }

          const addrBtn = document.querySelector(
            'button[data-item-id="address"]'
          );
          if (addrBtn) {
            address = addrBtn.textContent?.trim() ?? "";
          }

          const ratingEl = document.querySelector(
            'div.F7nice span[aria-hidden="true"]'
          );
          if (ratingEl) {
            rating = parseFloat(ratingEl.textContent ?? "0") || 0;
          }

          const reviewEl = document.querySelector(
            'div.F7nice span[aria-label*="review"]'
          );
          if (reviewEl) {
            const m = reviewEl.textContent?.match(/[\d,]+/);
            if (m) reviewCount = parseInt(m[0].replace(/,/g, ""), 10);
          }

          return { phone, website, address, rating, reviewCount };
        });

        businesses.push({
          placeId: listing.url,
          name: listing.name,
          address: details.address || listing.address,
          phone: details.phone,
          website: details.website,
          googleMapsUrl: listing.url,
          rating: details.rating || listing.rating,
          reviewCount: details.reviewCount || listing.reviewCount,
          category: listing.category,
          location,
        });
      } catch {
        businesses.push({
          placeId: listing.url,
          name: listing.name,
          address: listing.address,
          phone: "",
          website: "",
          googleMapsUrl: listing.url,
          rating: listing.rating,
          reviewCount: listing.reviewCount,
          category: listing.category,
          location,
        });
      }
    }

    return businesses;
  } finally {
    await browser.close();
  }
}
