import { NEWS_URL, PRICING_URL, UPDATES_URL, parseDeepSeek } from "../scrapers/deepseek.ts";
import { politeFetch } from "../scrapers/lib/fetch.ts";
import { loadHtml } from "../scrapers/lib/html.ts";
import { normalizeDashes } from "../scrapers/lib/dates.ts";

function tableHeads(html: string): string[] {
  const $ = loadHtml(html);
  const heads: string[] = [];
  $("table").each((index, table) => {
    const first = $(table).find("tr").first().text().replace(/\s+/g, " ").trim().slice(0, 180);
    heads.push(`${index}: ${first}`);
  });
  return heads;
}

function modelRow(html: string): string {
  const $ = loadHtml(html);
  let found = "";
  $("tr").each((_, tr) => {
    const cells = $(tr)
      .find("td, th")
      .map((__, cell) => normalizeDashes($(cell).text()).replace(/\s+/g, " ").trim())
      .get()
      .filter((cell) => cell.length > 0);
    if (cells[0]?.replace(/\(\d+\)/g, "").trim().toUpperCase() === "MODEL") found = JSON.stringify(cells);
  });
  return found || "(no MODEL row)";
}

async function main() {
  console.log(`node ${process.version}`);
  const updates = await politeFetch(UPDATES_URL);
  const pricing = await politeFetch(PRICING_URL);
  const news = await politeFetch(NEWS_URL);
  const models = parseDeepSeek(updates, pricing, news, "2026-10-25");
  console.log(`pricing url ${PRICING_URL}`);
  console.log(`pricing bytes ${pricing.length} contains deepseek-v4-pro ${pricing.includes("deepseek-v4-pro")}`);
  console.log(`pricing tables ${tableHeads(pricing).join(" || ")}`);
  console.log(`pricing model row ${modelRow(pricing)}`);
  console.log(`parsed ${models.map((model) => model.id).join(", ")}`);
  if (!models.some((model) => model.id === "deepseek-v4-pro")) {
    const at = pricing.indexOf("deepseek-v4-pro");
    console.log(`snippet ${at < 0 ? "id string absent" : pricing.slice(Math.max(0, at - 240), at + 180).replace(/\s+/g, " ")}`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exitCode = 1;
});
