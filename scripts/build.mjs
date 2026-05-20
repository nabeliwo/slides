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

  // Inject SPA restore script into the talk's index.html so that
  // `?/<rest>` query (set by the root 404.html redirect) is converted
  // back into a real path via history.replaceState before Slidev's
  // Vue Router boots.
  const indexHtmlPath = join(outDir, "index.html");
  const restoreScript = `<script>(function(){var l=window.location;if(l.search[1]==="/"){var d=l.search.slice(1).split("&").map(function(s){return s.replace(/~and~/g,"&")}).join("?");window.history.replaceState(null,null,l.pathname.slice(0,-1)+d+l.hash)}})();</script>`;
  const originalHtml = readFileSync(indexHtmlPath, "utf-8");
  writeFileSync(indexHtmlPath, originalHtml.replace("<head>", `<head>\n${restoreScript}`));
}

// Generate root dist/404.html that redirects unknown paths under
// /<REPO_NAME>/<TALKS_DIR>/<talk>/... to the talk's index.html with
// the original path encoded as `?/<rest>`. The restore script
// injected into each talk's index.html will turn it back into a real
// path. Paths that don't match the talk pattern fall back to the
// landing page.
const pathPrefix = `/${REPO_NAME}/${TALKS_DIR}/`;
const landingPath = `/${REPO_NAME}/`;
const fallbackHtml = `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<title>Redirecting...</title>
<script>
(function () {
  var l = window.location;
  var prefix = ${JSON.stringify(pathPrefix)};
  var landing = ${JSON.stringify(landingPath)};
  if (l.pathname.indexOf(prefix) === 0) {
    var rest = l.pathname.slice(prefix.length).split("/");
    var talk = rest.shift();
    var subPath = rest.join("/");
    // Only redirect when there's an actual sub-path beyond the talk
    // root. If subPath is empty, the talk itself doesn't exist (its
    // index.html would have been served instead of 404.html), so
    // redirecting to the same URL would loop — fall through to the
    // landing page below.
    if (talk && subPath) {
      l.replace(
        l.protocol + "//" + l.host + prefix + talk + "/?/" +
        subPath.replace(/&/g, "~and~") +
        (l.search ? "&" + l.search.slice(1).replace(/&/g, "~and~") : "") +
        l.hash
      );
      return;
    }
  }
  l.replace(l.protocol + "//" + l.host + landing);
})();
</script>
</head>
<body></body>
</html>`;

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
    body { font-family: system-ui, sans-serif; max-width: 600px; margin: 80px auto; padding: 0 20px; color: #222; }
    h1 { font-size: 1.5rem; font-weight: 600; margin-bottom: 2rem; }
    ul { list-style: none; padding: 0; display: flex; flex-direction: column; gap: 0.75rem; }
    a { color: inherit; text-decoration: none; display: block; padding: 0.75rem 1rem; border: 1px solid #e5e5e5; border-radius: 8px; transition: border-color 0.15s; }
    a:hover { border-color: #888; }
    .meta { font-size: 0.85rem; color: #888; margin-top: 0.25rem; }
  </style>
</head>
<body>
  <h1>Slides</h1>
  <ul>
${talkEntries
  .sort((a, b) => b.talk.localeCompare(a.talk))
  .map(
    ({ talk, title, event, date }) => {
      const meta = [event, date].filter(Boolean).join(" / ");
      const metaHtml = meta ? `<div class="meta">${escapeHtml(meta)}</div>` : "";
      return `    <li><a href="/${REPO_NAME}/${TALKS_DIR}/${talk}/">${escapeHtml(title)}${metaHtml}</a></li>`;
    }
  )
  .join("\n")}
  </ul>
</body>
</html>`;

mkdirSync(distPath, { recursive: true });
writeFileSync(join(distPath, "index.html"), html);
console.log("\nGenerated dist/index.html (landing page)");

writeFileSync(join(distPath, "404.html"), fallbackHtml);
console.log("Generated dist/404.html (SPA deep-link fallback)");

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
