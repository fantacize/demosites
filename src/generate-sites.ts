import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

type Business = {
  slug: string;
  name: string;
  tagline: string;
  type: string;
  description: string;
  address: string;
  phone: string;
  hours: Record<string, string>;
  services: string[];
  servicesLabel: string;
  rating: number;
  reviews: number;
  colors: {
    primary: string;
    primaryDark: string;
    accent: string;
    bg: string;
    heroBg: string;
  };
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function serviceIcon(type: string): string {
  const icons: Record<string, string> = {
    restaurant: "🍽️",
    "bar-restaurant": "🍺",
    barber: "✂️",
    "auto-repair": "🔧",
    bakery: "🍞",
    "nail-salon": "💅",
  };
  return icons[type] ?? "⭐";
}

function heroEmoji(type: string): string {
  const icons: Record<string, string> = {
    restaurant: "🥢",
    "bar-restaurant": "🍻",
    barber: "💈",
    "auto-repair": "🚗",
    bakery: "🎂",
    "nail-salon": "✨",
  };
  return icons[type] ?? "🏪";
}

function stars(rating: number): string {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5 ? 1 : 0;
  return "★".repeat(full) + (half ? "½" : "") + " " + rating;
}

function buildSite(biz: Business): string {
  const hoursRows = Object.entries(biz.hours)
    .map(
      ([day, time]) =>
        `<tr><td class="day">${escapeHtml(day)}</td><td class="time">${escapeHtml(time)}</td></tr>`
    )
    .join("\n              ");

  const serviceItems = biz.services
    .map(
      (s) =>
        `<div class="service-card"><span class="service-icon">${serviceIcon(biz.type)}</span><span>${escapeHtml(s)}</span></div>`
    )
    .join("\n            ");

  const phoneClean = biz.phone.replace(/[^0-9+]/g, "");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(biz.name)} — ${escapeHtml(biz.tagline)}</title>
  <meta name="description" content="${escapeHtml(biz.description)}">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Playfair+Display:wght@700;800&display=swap');

    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

    :root {
      --primary: ${biz.colors.primary};
      --primary-dark: ${biz.colors.primaryDark};
      --accent: ${biz.colors.accent};
      --bg: ${biz.colors.bg};
    }

    body {
      font-family: 'Inter', -apple-system, sans-serif;
      color: #1e293b;
      background: #ffffff;
      -webkit-font-smoothing: antialiased;
    }

    /* HERO */
    .hero {
      background: ${biz.colors.heroBg};
      color: white;
      padding: 80px 24px 60px;
      text-align: center;
      position: relative;
      overflow: hidden;
    }
    .hero::before {
      content: '';
      position: absolute;
      top: -50%;
      left: -50%;
      width: 200%;
      height: 200%;
      background: radial-gradient(circle, rgba(255,255,255,0.05) 0%, transparent 60%);
      animation: shimmer 8s ease-in-out infinite alternate;
    }
    @keyframes shimmer {
      0% { transform: translate(0, 0); }
      100% { transform: translate(30px, 20px); }
    }
    .hero-content { position: relative; z-index: 1; max-width: 700px; margin: 0 auto; }
    .hero-emoji { font-size: 48px; margin-bottom: 16px; display: block; }
    .hero h1 {
      font-family: 'Playfair Display', serif;
      font-size: clamp(32px, 6vw, 52px);
      font-weight: 800;
      line-height: 1.1;
      margin-bottom: 12px;
      letter-spacing: -0.5px;
    }
    .hero .tagline {
      font-size: clamp(16px, 2.5vw, 20px);
      opacity: 0.9;
      font-weight: 400;
      margin-bottom: 24px;
    }
    .hero .rating-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: rgba(255,255,255,0.15);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255,255,255,0.2);
      padding: 8px 18px;
      border-radius: 100px;
      font-size: 14px;
      font-weight: 600;
    }
    .hero .rating-badge .stars { color: #fbbf24; letter-spacing: 1px; }
    .hero-cta {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      margin-top: 28px;
      background: white;
      color: var(--primary-dark);
      padding: 14px 32px;
      border-radius: 12px;
      text-decoration: none;
      font-weight: 700;
      font-size: 16px;
      transition: transform 0.2s, box-shadow 0.2s;
      box-shadow: 0 4px 14px rgba(0,0,0,0.15);
    }
    .hero-cta:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.2); }

    /* NAV */
    nav {
      background: white;
      border-bottom: 1px solid #e2e8f0;
      padding: 14px 24px;
      position: sticky;
      top: 0;
      z-index: 100;
      display: flex;
      justify-content: center;
      gap: 32px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.04);
    }
    nav a {
      color: #475569;
      text-decoration: none;
      font-size: 14px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      transition: color 0.2s;
    }
    nav a:hover { color: var(--primary); }

    /* SECTIONS */
    section { padding: 64px 24px; max-width: 900px; margin: 0 auto; }
    .section-title {
      font-family: 'Playfair Display', serif;
      font-size: 28px;
      font-weight: 700;
      margin-bottom: 8px;
      color: #0f172a;
    }
    .section-subtitle {
      color: #64748b;
      font-size: 15px;
      margin-bottom: 32px;
    }

    /* ABOUT */
    .about-text {
      font-size: 17px;
      line-height: 1.8;
      color: #334155;
      max-width: 680px;
    }

    /* SERVICES */
    #services { background: var(--bg); }
    .services-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 16px;
    }
    .service-card {
      background: white;
      padding: 18px 20px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      gap: 12px;
      font-weight: 500;
      font-size: 15px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.06);
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .service-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
    .service-icon { font-size: 20px; }

    /* HOURS */
    .hours-table { border-collapse: collapse; width: 100%; max-width: 420px; }
    .hours-table tr { border-bottom: 1px solid #f1f5f9; }
    .hours-table td { padding: 12px 0; font-size: 15px; }
    .hours-table .day { font-weight: 600; color: #0f172a; width: 120px; }
    .hours-table .time { color: #475569; }

    /* CONTACT */
    #contact { background: var(--bg); }
    .contact-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 24px;
    }
    .contact-card {
      background: white;
      padding: 28px;
      border-radius: 16px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.06);
    }
    .contact-card h3 { font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; color: #94a3b8; margin-bottom: 8px; }
    .contact-card p { font-size: 16px; color: #1e293b; }
    .contact-card a { color: var(--primary); text-decoration: none; font-weight: 600; }
    .contact-card a:hover { text-decoration: underline; }

    /* MAP */
    .map-container {
      width: 100%;
      height: 300px;
      border-radius: 16px;
      overflow: hidden;
      margin-top: 32px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.06);
    }
    .map-container iframe { width: 100%; height: 100%; border: 0; }

    /* FOOTER */
    footer {
      background: #0f172a;
      color: #94a3b8;
      text-align: center;
      padding: 32px 24px;
      font-size: 13px;
    }
    footer .biz-name { color: white; font-weight: 700; }

    /* MOBILE */
    @media (max-width: 640px) {
      .hero { padding: 60px 20px 48px; }
      section { padding: 48px 20px; }
      nav { gap: 20px; flex-wrap: wrap; }
      nav a { font-size: 12px; }
      .services-grid { grid-template-columns: 1fr; }
      .contact-grid { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>

  <!-- HERO -->
  <header class="hero">
    <div class="hero-content">
      <span class="hero-emoji">${heroEmoji(biz.type)}</span>
      <h1>${escapeHtml(biz.name)}</h1>
      <p class="tagline">${escapeHtml(biz.tagline)}</p>
      <div class="rating-badge">
        <span class="stars">${stars(biz.rating)}</span>
        <span>${biz.reviews} reviews on Google</span>
      </div>
      <br>
      <a href="tel:${phoneClean}" class="hero-cta">📞 Call ${escapeHtml(biz.phone)}</a>
    </div>
  </header>

  <!-- NAV -->
  <nav>
    <a href="#about">About</a>
    <a href="#services">${escapeHtml(biz.servicesLabel)}</a>
    <a href="#hours">Hours</a>
    <a href="#contact">Contact</a>
  </nav>

  <!-- ABOUT -->
  <section id="about">
    <h2 class="section-title">About Us</h2>
    <p class="about-text">${escapeHtml(biz.description)}</p>
  </section>

  <!-- SERVICES -->
  <section id="services">
    <h2 class="section-title">${escapeHtml(biz.servicesLabel)}</h2>
    <p class="section-subtitle">What we're known for</p>
    <div class="services-grid">
      ${serviceItems}
    </div>
  </section>

  <!-- HOURS -->
  <section id="hours">
    <h2 class="section-title">Hours</h2>
    <p class="section-subtitle">Plan your visit</p>
    <table class="hours-table">
      ${hoursRows}
    </table>
  </section>

  <!-- CONTACT -->
  <section id="contact">
    <h2 class="section-title">Get in Touch</h2>
    <p class="section-subtitle">We'd love to hear from you</p>
    <div class="contact-grid">
      <div class="contact-card">
        <h3>Address</h3>
        <p>${escapeHtml(biz.address)}</p>
      </div>
      <div class="contact-card">
        <h3>Phone</h3>
        <p><a href="tel:${phoneClean}">${escapeHtml(biz.phone)}</a></p>
      </div>
      <div class="contact-card">
        <h3>Visit Us</h3>
        <p>Walk-ins welcome! Give us a call for more info.</p>
      </div>
    </div>
    <div class="map-container">
      <iframe
        loading="lazy"
        allowfullscreen
        referrerpolicy="no-referrer-when-downgrade"
        src="https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${encodeURIComponent(biz.name + ", " + biz.address)}"
      ></iframe>
    </div>
  </section>

  <!-- FOOTER -->
  <footer>
    <p><span class="biz-name">${escapeHtml(biz.name)}</span> · ${escapeHtml(biz.address)} · ${escapeHtml(biz.phone)}</p>
    <p style="margin-top:8px">&copy; ${new Date().getFullYear()} ${escapeHtml(biz.name)}. All rights reserved.</p>
  </footer>

</body>
</html>`;
}

async function main() {
  const raw = await readFile("sites/data.json", "utf-8");
  const businesses: Business[] = JSON.parse(raw);

  await mkdir("sites", { recursive: true });

  for (const biz of businesses) {
    const dir = path.join("sites", biz.slug);
    await mkdir(dir, { recursive: true });
    const html = buildSite(biz);
    const filePath = path.join(dir, "index.html");
    await writeFile(filePath, html, "utf-8");
    console.log(`  Built: ${filePath}`);
  }

  // Build index page
  const indexHtml = buildIndex(businesses);
  await writeFile("sites/index.html", indexHtml, "utf-8");
  console.log("  Built: sites/index.html (portfolio index)");

  console.log(`\nDone! ${businesses.length} sites generated.`);
}

function buildIndex(businesses: Business[]): string {
  const cards = businesses
    .map(
      (biz) => `
      <a href="${biz.slug}/index.html" class="card" style="border-left: 4px solid ${biz.colors.primary}">
        <div class="card-emoji">${heroEmoji(biz.type)}</div>
        <div class="card-info">
          <h2>${escapeHtml(biz.name)}</h2>
          <p class="card-tagline">${escapeHtml(biz.tagline)}</p>
          <p class="card-meta">${escapeHtml(biz.address)} · ${stars(biz.rating)}</p>
        </div>
      </a>`
    )
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Lead Websites — Portfolio</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', sans-serif; background: #f8fafc; color: #1e293b; padding: 40px 24px; }
    h1 { font-size: 28px; font-weight: 800; margin-bottom: 8px; }
    .subtitle { color: #64748b; margin-bottom: 32px; font-size: 15px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(380px, 1fr)); gap: 16px; max-width: 1000px; }
    .card {
      background: white; border-radius: 12px; padding: 20px 24px; text-decoration: none; color: inherit;
      display: flex; align-items: center; gap: 16px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.06); transition: transform 0.2s, box-shadow 0.2s;
    }
    .card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
    .card-emoji { font-size: 32px; }
    .card-info h2 { font-size: 16px; font-weight: 700; margin-bottom: 2px; }
    .card-tagline { font-size: 13px; color: #64748b; margin-bottom: 4px; }
    .card-meta { font-size: 12px; color: #94a3b8; }
    @media (max-width: 480px) { .grid { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <h1>Lead Websites</h1>
  <p class="subtitle">${businesses.length} custom sites built for Wallingford, CT businesses</p>
  <div class="grid">
    ${cards}
  </div>
</body>
</html>`;
}

main().catch(console.error);
