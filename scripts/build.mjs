import { execSync } from "node:child_process";
import { readdirSync, readFileSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";

const REPO_NAME = "slides";
const TALKS_DIR = "talks";
const DIST_DIR = "dist";

const rootDir = resolve(import.meta.dirname, "..");
const talksPath = join(rootDir, TALKS_DIR);
const distPath = join(rootDir, DIST_DIR);

const talks = readdirSync(talksPath).filter((name) => {
  const fullPath = join(talksPath, name);
  return statSync(fullPath).isDirectory() && !name.startsWith(".");
});

if (talks.length === 0) {
  console.log("No talks found in talks/ directory.");
  process.exit(0);
}

console.log(`Found ${talks.length} talk(s): ${talks.join(", ")}\n`);

for (const talk of talks) {
  const talkDir = join(talksPath, talk);
  const basePath = `/${REPO_NAME}/${TALKS_DIR}/${talk}/`;
  const outDir = join(distPath, TALKS_DIR, talk);

  console.log(`Building: ${talk}`);
  console.log(`  base: ${basePath}`);
  console.log(`  out:  ${outDir}\n`);

  execSync(`pnpm exec slidev build --base ${basePath} --out ${outDir}`, {
    cwd: talkDir,
    stdio: "inherit",
  });
}

// Generate landing page
const talkEntries = talks.map((talk) => {
  const readmePath = join(talksPath, talk, "README.md");
  let title = talk;
  let event = "";
  let date = "";

  try {
    const readme = readFileSync(readmePath, "utf-8");
    const titleMatch = readme.match(/^#\s+(.+)$/m);
    const eventMatch = readme.match(/^-\s*Event:\s*(.+)$/m);
    const dateMatch = readme.match(/^-\s*Date:\s*(.+)$/m);
    if (titleMatch) title = titleMatch[1];
    if (eventMatch) event = eventMatch[1].trim();
    if (dateMatch) date = dateMatch[1].trim();
  } catch {
    // README.md not found, use directory name
  }

  return { talk, title, event, date };
});

const html = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Slides - nabeliwo</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #e2e8f0; min-height: 100vh; padding: 2rem; }
    h1 { text-align: center; margin-bottom: 2rem; font-size: 2rem; color: #f8fafc; }
    .talks { max-width: 640px; margin: 0 auto; display: flex; flex-direction: column; gap: 1rem; }
    a.card { display: block; padding: 1.25rem 1.5rem; background: #1e293b; border: 1px solid #334155; border-radius: 0.75rem; text-decoration: none; color: inherit; transition: background 0.15s, border-color 0.15s; }
    a.card:hover { background: #334155; border-color: #60a5fa; }
    .card-title { font-size: 1.125rem; font-weight: 600; color: #f8fafc; }
    .card-meta { margin-top: 0.375rem; font-size: 0.875rem; color: #94a3b8; }
  </style>
</head>
<body>
  <h1>Slides</h1>
  <div class="talks">
${talkEntries
  .sort((a, b) => b.talk.localeCompare(a.talk))
  .map(
    ({ talk, title, event, date }) =>
      `    <a class="card" href="/${REPO_NAME}/${TALKS_DIR}/${talk}/">
      <div class="card-title">${escapeHtml(title)}</div>
      ${event || date ? `<div class="card-meta">${[event, date].filter(Boolean).join(" / ")}</div>` : ""}
    </a>`
  )
  .join("\n")}
  </div>
</body>
</html>`;

mkdirSync(distPath, { recursive: true });
writeFileSync(join(distPath, "index.html"), html);
console.log("\nGenerated dist/index.html (landing page)");

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
