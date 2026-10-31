const title = "scraper-broken: refresh failed";
const rawBody = process.env.SCRAPER_ERROR || "The SunsetDiff refresh failed the sanity gate or tests. Data was not overwritten.";
const body = rawBody.length > 60000 ? `${rawBody.slice(0, 60000)}\n\n(truncated)` : rawBody;

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
  "x-github-api-version": "2022-11-28",
};

if (process.env.SCRAPER_RECOVERED === "1") {
  const listed = await fetch(`https://api.github.com/repos/${repo}/issues?state=open&labels=scraper-broken`, { headers });
  if (!listed.ok) {
    console.error(await listed.text());
    process.exit(1);
  }
  const issues = await listed.json();
  const note = "The refresh passed. The sanity gate and tests succeeded, so this issue is closed.";
  for (const issue of issues) {
    const comment = await fetch(`https://api.github.com/repos/${repo}/issues/${issue.number}/comments`, {
      method: "POST",
      headers: { ...headers, "content-type": "application/json" },
      body: JSON.stringify({ body: note }),
    });
    if (!comment.ok) {
      console.error(await comment.text());
      process.exit(1);
    }
    const closed = await fetch(`https://api.github.com/repos/${repo}/issues/${issue.number}`, {
      method: "PATCH",
      headers: { ...headers, "content-type": "application/json" },
      body: JSON.stringify({ state: "closed", state_reason: "completed" }),
    });
    if (!closed.ok) {
      console.error(await closed.text());
      process.exit(1);
    }
    console.log(`Closed issue #${issue.number}`);
  }
  if (!issues.length) console.log("No open scraper-broken issue.");
  process.exit(0);
}

const labeled = await fetch(`https://api.github.com/repos/${repo}/labels`, {
  method: "POST",
  headers: { ...headers, "content-type": "application/json" },
  body: JSON.stringify({
    name: "scraper-broken",
    color: "b60205",
    description: "SunsetDiff refresh failed the sanity gate or tests",
  }),
});
if (!labeled.ok && labeled.status !== 422) {
  console.error(await labeled.text());
}

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
  let created = await fetch(`https://api.github.com/repos/${repo}/issues`, {
    method: "POST",
    headers: { ...headers, "content-type": "application/json" },
    body: JSON.stringify({ title, body, labels: ["scraper-broken"] }),
  });
  if (!created.ok) {
    const text = await created.text();
    created = await fetch(`https://api.github.com/repos/${repo}/issues`, {
      method: "POST",
      headers: { ...headers, "content-type": "application/json" },
      body: JSON.stringify({ title, body }),
    });
    if (!created.ok) {
      console.error(text);
      console.error(await created.text());
      process.exit(1);
    }
  }
  console.log("Opened scraper-broken issue");
}
