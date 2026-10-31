import * as core from "@actions/core";
import snapshot from "../snapshot/models.json" with { type: "json" };
import { loadModels, scanRepo, type ModelHit } from "./scan.js";

const warnDays = Number(core.getInput("warn-days") || "60");
const failDays = Number(core.getInput("fail-days") || "14");
const apiUrl = core.getInput("api-url") || "https://sunsetdiff.onrender.com/api/v1/models.json";
const paths = core.getInput("paths") || "**/*.{py,ts,js,json,yaml,yml,toml,env.example}";
const models = await loadModels(apiUrl, snapshot as ModelHit[]);
const findings = await scanRepo(process.cwd(), models, warnDays, failDays, paths);
let errors = 0;
const rows = ["| File | Model | Level | Detail |", "| --- | --- | --- | --- |"];
for (const finding of findings) {
  const annotation = { file: finding.file, startLine: finding.line, title: "SunsetDiff" };
  if (finding.level === "error") {
    core.error(finding.message, annotation);
    errors += 1;
  } else {
    core.warning(finding.message, annotation);
  }
  rows.push(`| ${finding.file}:${finding.line} | ${finding.model.id} | ${finding.level} | ${finding.message.replace(/\|/g, "/")} |`);
}
try {
  await core.summary.addHeading("SunsetDiff").addRaw(rows.join("\n")).write();
} catch (error) {
  core.info(`Job summary skipped: ${error instanceof Error ? error.message : "unavailable"}`);
}
if (!findings.length) core.info("No deprecated or soon-to-shut-down model ids found.");
if (errors) core.setFailed(`${errors} model ids are inside the fail window or already retired.`);
