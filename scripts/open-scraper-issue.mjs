const title = "scraper-broken: refresh failed";
const body = process.env.SCRAPER_ERROR || "The SunsetDiff refresh failed the sanity gate or tests. Data was not overwritten.";

if (!process.env.GH_TOKEN && !process.env.GITHUB_TOKEN) {
  console.log("No GitHub token. Issue was not opened.");
  process.exit(0);
}

const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
const repo = process.env.GITHUB_REPOSITORY;
if (!repo) {
  console.log("GITHUB_REPOSITORY is missing.");
  process.exit(0);
}

const headers = {
  authorization: `Bearer ${token}`,
  accept: "application/vnd.github+json",
  "user-agent": "sunsetdiff-bot",
};

const listed = await fetch(`https://api.github.com/repos/${repo}/issues?state=open&labels=scraper-broken`, { headers });
if (!listed.ok) {
  console.error(await listed.text());
  process.exit(1);
}
const issues = await listed.json();
if (issues.length) {
  const update = await fetch(`https://api.github.com/repos/${repo}/issues/${issues[0].number}/comments`, {
    method: "POST",
    headers: { ...headers, "content-type": "application/json" },
    body: JSON.stringify({ body }),
  });
  if (!update.ok) {
    console.error(await update.text());
    process.exit(1);
  }
  console.log(`Updated issue #${issues[0].number}`);
} else {
  const created = await fetch(`https://api.github.com/repos/${repo}/issues`, {
    method: "POST",
    headers: { ...headers, "content-type": "application/json" },
    body: JSON.stringify({ title, body, labels: ["scraper-broken"] }),
  });
  if (!created.ok) {
    console.error(await created.text());
    process.exit(1);
  }
  console.log("Opened scraper-broken issue");
}
