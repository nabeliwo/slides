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
</head>
<body>
  <h1>Slides</h1>
  <ul>
${talkEntries
  .sort((a, b) => b.talk.localeCompare(a.talk))
  .map(
    ({ talk, title, event, date }) => {
      const meta = [event, date].filter(Boolean).join(" / ");
      const label = meta ? `${escapeHtml(title)} (${escapeHtml(meta)})` : escapeHtml(title);
      return `    <li><a href="/${REPO_NAME}/${TALKS_DIR}/${talk}/">${label}</a></li>`;
    }
  )
  .join("\n")}
  </ul>
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
