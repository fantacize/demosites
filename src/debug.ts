import puppeteer from "puppeteer";

async function debug() {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  await page.goto("https://www.google.com/maps/search/restaurant+in+Wallingford+CT", {
    waitUntil: "networkidle2",
    timeout: 30000,
  });

  // Check the actual structure of results
  const structure = await page.evaluate(() => {
    const feed = document.querySelector('div[role="feed"]');
    if (!feed) return { error: "no feed" };

    // Try different selectors for the result links
    const allLinks = feed.querySelectorAll("a");
    const placeLinks = [...allLinks].filter(a => a.href.includes("/maps/place/"));

    // Check headline class
    const headlines = feed.querySelectorAll(".fontHeadlineSmall");

    // Try getting the direct children structure
    const children = [...feed.children].slice(0, 3).map(child => ({
      tag: child.tagName,
      classes: child.className.slice(0, 80),
      childCount: child.children.length,
      innerHTML: child.innerHTML.slice(0, 200),
    }));

    return {
      feedChildCount: feed.children.length,
      allLinksCount: allLinks.length,
      placeLinksCount: placeLinks.length,
      placeLinksHrefs: [...placeLinks].slice(0, 3).map(a => a.href.slice(0, 100)),
      headlineCount: headlines.length,
      headlineTexts: [...headlines].slice(0, 5).map(h => h.textContent),
      children,
    };
  });

  console.log(JSON.stringify(structure, null, 2));

  // Try to find the right selector path
  const selectorTest = await page.evaluate(() => {
    const feed = document.querySelector('div[role="feed"]');
    if (!feed) return "no feed";

    // Check nesting depth of place links
    const link = feed.querySelector('a[href*="/maps/place/"]');
    if (!link) return "no place link found in feed";

    const path: string[] = [];
    let el: Element | null = link;
    while (el && el !== feed) {
      path.unshift(`${el.tagName}.${el.className.slice(0, 30)}`);
      el = el.parentElement;
    }
    return path.join(" > ");
  });

  console.log("\nSelector path:", selectorTest);

  await new Promise(r => setTimeout(r, 3000));
  await browser.close();
}

debug().catch(console.error);
