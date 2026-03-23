import type { RawBusiness, ScoredLead } from "./types.js";

const SOCIAL_DOMAINS = [
  "facebook.com",
  "instagram.com",
  "yelp.com",
  "linkedin.com",
  "twitter.com",
  "x.com",
  "tiktok.com",
];

const SITE_BUILDER_DOMAINS = [
  "wix.com",
  "squarespace.com",
  "weebly.com",
  "godaddy.com",
  "wordpress.com",
  "sites.google.com",
  "square.site",
  "order.online",
];

type WebPresence = "none" | "social_only" | "site_builder" | "custom_site";

function classifyWebPresence(website: string): WebPresence {
  if (!website) return "none";

  const lower = website.toLowerCase();

  if (SOCIAL_DOMAINS.some((d) => lower.includes(d))) return "social_only";
  if (SITE_BUILDER_DOMAINS.some((d) => lower.includes(d)))
    return "site_builder";

  return "custom_site";
}

function scoreLead(business: RawBusiness): ScoredLead | null {
  const presence = classifyWebPresence(business.website);

  let score = 0;
  const reasons: string[] = [];

  // No website = highest value
  if (presence === "none") {
    score += 50;
    reasons.push("No website");
  } else if (presence === "social_only") {
    score += 40;
    reasons.push("Only has social media page");
  } else if (presence === "site_builder") {
    score += 20;
    reasons.push("Using basic site builder");
  } else {
    // Has a custom site — skip unless we add PageSpeed checking later
    return null;
  }

  // Active business with reviews = more likely to pay
  if (business.reviewCount > 50) {
    score += 15;
    reasons.push("50+ reviews (established)");
  } else if (business.reviewCount > 10) {
    score += 10;
    reasons.push("10+ reviews");
  }

  // Good rating = healthy business
  if (business.rating >= 4.0) {
    score += 10;
    reasons.push("Good rating (4.0+)");
  }

  // Has phone = reachable
  if (business.phone) {
    score += 5;
    reasons.push("Phone available");
  }

  return {
    ...business,
    score,
    reason: reasons.join("; "),
  };
}

export function qualifyLeads(businesses: readonly RawBusiness[]): ScoredLead[] {
  return businesses
    .map(scoreLead)
    .filter((lead): lead is ScoredLead => lead !== null)
    .sort((a, b) => b.score - a.score);
}
