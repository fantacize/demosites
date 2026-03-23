import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import type { ScoredLead } from "./types.js";

const OUTPUT_DIR = "output";

function escapeCsvField(field: string): string {
  if (field.includes(",") || field.includes('"') || field.includes("\n")) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

function leadToCsvRow(lead: ScoredLead): string {
  return [
    lead.score,
    lead.name,
    lead.category,
    lead.location,
    lead.address,
    lead.phone,
    lead.website || "(none)",
    lead.rating,
    lead.reviewCount,
    lead.reason,
    lead.googleMapsUrl,
  ]
    .map(String)
    .map(escapeCsvField)
    .join(",");
}

const CSV_HEADER = [
  "Score",
  "Business Name",
  "Category",
  "Location",
  "Address",
  "Phone",
  "Website",
  "Rating",
  "Reviews",
  "Reason",
  "Google Maps",
].join(",");

export async function writeOutput(leads: readonly ScoredLead[]): Promise<{ csvPath: string; jsonPath: string; htmlPath: string }> {
  await mkdir(OUTPUT_DIR, { recursive: true });

  const timestamp = new Date().toISOString().slice(0, 10);

  const csvPath = path.join(OUTPUT_DIR, `leads-${timestamp}.csv`);
  const rows = [CSV_HEADER, ...leads.map(leadToCsvRow)];
  await writeFile(csvPath, rows.join("\n"), "utf-8");

  const jsonPath = path.join(OUTPUT_DIR, `leads-${timestamp}.json`);
  await writeFile(jsonPath, JSON.stringify(leads, null, 2), "utf-8");

  const htmlPath = path.join(OUTPUT_DIR, `leads-${timestamp}.html`);
  await writeFile(htmlPath, buildHtml(leads), "utf-8");

  return { csvPath, jsonPath, htmlPath };
}

function rankLabel(score: number): { label: string; color: string; bg: string } {
  if (score >= 60) return { label: "HOT", color: "#dc2626", bg: "#fef2f2" };
  if (score >= 40) return { label: "WARM", color: "#d97706", bg: "#fffbeb" };
  if (score >= 20) return { label: "COOL", color: "#2563eb", bg: "#eff6ff" };
  return { label: "LOW", color: "#6b7280", bg: "#f9fafb" };
}

function buildHtml(leads: readonly ScoredLead[]): string {
  const locationCounts = new Map<string, number>();
  const categoryCounts = new Map<string, number>();
  for (const l of leads) {
    locationCounts.set(l.location, (locationCounts.get(l.location) ?? 0) + 1);
    categoryCounts.set(l.category, (categoryCounts.get(l.category) ?? 0) + 1);
  }

  const hot = leads.filter(l => l.score >= 60).length;
  const warm = leads.filter(l => l.score >= 40 && l.score < 60).length;
  const cool = leads.filter(l => l.score >= 20 && l.score < 40).length;

  const tableRows = leads.map((lead, i) => {
    const rank = rankLabel(lead.score);
    const websiteCell = lead.website
      ? `<a href="${escapeHtml(lead.website)}" target="_blank" class="link">${truncate(lead.website, 30)}</a>`
      : '<span class="no-site">No website</span>';
    const phoneCell = lead.phone
      ? `<a href="tel:${escapeHtml(lead.phone)}" class="phone">${escapeHtml(lead.phone)}</a>`
      : '<span class="muted">—</span>';

    return `<tr data-score="${lead.score}" data-location="${escapeHtml(lead.location)}" data-category="${escapeHtml(lead.category)}">
      <td class="rank-num">${i + 1}</td>
      <td><span class="badge" style="color:${rank.color};background:${rank.bg}">${rank.label} ${lead.score}</span></td>
      <td class="biz-name"><a href="${escapeHtml(lead.googleMapsUrl)}" target="_blank">${escapeHtml(lead.name)}</a></td>
      <td>${escapeHtml(lead.category)}</td>
      <td>${escapeHtml(lead.location)}</td>
      <td>${phoneCell}</td>
      <td>${websiteCell}</td>
      <td class="center">${lead.rating > 0 ? "⭐ " + lead.rating : "—"}</td>
      <td class="center">${lead.reviewCount}</td>
      <td class="reason">${escapeHtml(lead.reason)}</td>
    </tr>`;
  }).join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Lead Generation Results</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8fafc; color: #1e293b; padding: 24px; }
  .header { margin-bottom: 24px; }
  .header h1 { font-size: 24px; font-weight: 700; margin-bottom: 4px; }
  .header p { color: #64748b; font-size: 14px; }
  .stats { display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }
  .stat-card { background: white; border-radius: 10px; padding: 16px 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); min-width: 140px; }
  .stat-card .num { font-size: 28px; font-weight: 700; }
  .stat-card .label { font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
  .stat-card.hot .num { color: #dc2626; }
  .stat-card.warm .num { color: #d97706; }
  .stat-card.cool .num { color: #2563eb; }
  .filters { display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; align-items: center; }
  .filters select, .filters input { padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 14px; background: white; }
  .filters input { width: 260px; }
  .table-wrap { background: white; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { background: #f1f5f9; text-align: left; padding: 10px 12px; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #475569; cursor: pointer; user-select: none; white-space: nowrap; position: sticky; top: 0; }
  th:hover { background: #e2e8f0; }
  td { padding: 10px 12px; border-top: 1px solid #f1f5f9; vertical-align: top; }
  tr:hover { background: #f8fafc; }
  .rank-num { color: #94a3b8; font-weight: 600; font-size: 12px; }
  .badge { padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: 700; letter-spacing: 0.3px; white-space: nowrap; }
  .biz-name a { color: #1e293b; text-decoration: none; font-weight: 600; }
  .biz-name a:hover { color: #2563eb; text-decoration: underline; }
  .no-site { color: #dc2626; font-weight: 600; font-size: 12px; }
  .link { color: #2563eb; text-decoration: none; font-size: 12px; word-break: break-all; }
  .link:hover { text-decoration: underline; }
  .phone { color: #1e293b; text-decoration: none; white-space: nowrap; }
  .phone:hover { color: #2563eb; }
  .muted { color: #cbd5e1; }
  .center { text-align: center; }
  .reason { font-size: 11px; color: #64748b; max-width: 220px; }
  .empty { text-align: center; padding: 48px; color: #94a3b8; }
</style>
</head>
<body>

<div class="header">
  <h1>Lead Generation Results</h1>
  <p>Generated ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })} &mdash; ${leads.length} qualified leads</p>
</div>

<div class="stats">
  <div class="stat-card"><div class="num">${leads.length}</div><div class="label">Total Leads</div></div>
  <div class="stat-card hot"><div class="num">${hot}</div><div class="label">Hot (60+)</div></div>
  <div class="stat-card warm"><div class="num">${warm}</div><div class="label">Warm (40-59)</div></div>
  <div class="stat-card cool"><div class="num">${cool}</div><div class="label">Cool (20-39)</div></div>
</div>

<div class="filters">
  <input type="text" id="search" placeholder="Search by name, category, address..." />
  <select id="filterLocation">
    <option value="">All Locations</option>
    ${[...locationCounts.entries()].map(([loc, n]) => `<option value="${escapeHtml(loc)}">${escapeHtml(loc)} (${n})</option>`).join("")}
  </select>
  <select id="filterRank">
    <option value="">All Ranks</option>
    <option value="60">Hot (60+)</option>
    <option value="40">Warm (40-59)</option>
    <option value="20">Cool (20-39)</option>
    <option value="0">Low (&lt;20)</option>
  </select>
</div>

<div class="table-wrap">
<table id="leads-table">
<thead>
  <tr>
    <th data-sort="index">#</th>
    <th data-sort="score">Score</th>
    <th data-sort="name">Business</th>
    <th>Category</th>
    <th>Location</th>
    <th>Phone</th>
    <th>Website</th>
    <th data-sort="rating">Rating</th>
    <th data-sort="reviews">Reviews</th>
    <th>Why</th>
  </tr>
</thead>
<tbody>
${tableRows}
</tbody>
</table>
</div>

<script>
const rows = [...document.querySelectorAll("#leads-table tbody tr")];
const searchInput = document.getElementById("search");
const locFilter = document.getElementById("filterLocation");
const rankFilter = document.getElementById("filterRank");

function applyFilters() {
  const q = searchInput.value.toLowerCase();
  const loc = locFilter.value;
  const rankMin = rankFilter.value ? parseInt(rankFilter.value) : null;
  const rankMax = rankMin !== null ? (rankMin === 60 ? 999 : rankMin + 19) : null;

  rows.forEach(row => {
    const text = row.textContent.toLowerCase();
    const score = parseInt(row.dataset.score);
    const rowLoc = row.dataset.location;

    let show = true;
    if (q && !text.includes(q)) show = false;
    if (loc && rowLoc !== loc) show = false;
    if (rankMin !== null) {
      if (rankMin === 0 && score >= 20) show = false;
      else if (rankMin > 0 && (score < rankMin || score > rankMax)) show = false;
    }
    row.style.display = show ? "" : "none";
  });
}

searchInput.addEventListener("input", applyFilters);
locFilter.addEventListener("change", applyFilters);
rankFilter.addEventListener("change", applyFilters);

document.querySelectorAll("th[data-sort]").forEach(th => {
  th.addEventListener("click", () => {
    const key = th.dataset.sort;
    const tbody = document.querySelector("#leads-table tbody");
    const sorted = [...rows].sort((a, b) => {
      if (key === "score") return parseInt(b.dataset.score) - parseInt(a.dataset.score);
      if (key === "index") return rows.indexOf(a) - rows.indexOf(b);
      const aText = a.children[key === "name" ? 2 : key === "rating" ? 7 : 8].textContent;
      const bText = b.children[key === "name" ? 2 : key === "rating" ? 7 : 8].textContent;
      const aNum = parseFloat(aText); const bNum = parseFloat(bText);
      if (!isNaN(aNum) && !isNaN(bNum)) return bNum - aNum;
      return aText.localeCompare(bText);
    });
    sorted.forEach(r => tbody.appendChild(r));
  });
});
</script>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max) + "...";
}
