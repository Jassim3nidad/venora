import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";

const root = resolve(import.meta.dirname, "..");
const docsRoot = join(root, "docs", "design");
const appRoot = join(root, "apps", "web", "app");
const routeMatrixPath = join(docsRoot, "route-screen-matrix.md");
const flowPath = join(docsRoot, "user-flows.md");
const requiredDocs = [
  "README.md",
  "screen-inventory.md",
  "route-screen-matrix.md",
  "user-flows.md",
  "wireframes.md",
  "responsive-behavior.md",
  "accessibility-requirements.md",
  "accessibility-audit.md",
  "component-inventory.md",
  "navigation-map.md",
  "role-experience-matrix.md",
  "ui-gap-analysis.md",
  "ux-remediation-backlog.md",
];
const errors = [];

function walk(directory, predicate, output = []) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const fullPath = join(directory, entry.name);
    if (entry.isDirectory()) walk(fullPath, predicate, output);
    else if (predicate(fullPath)) output.push(fullPath);
  }
  return output;
}

for (const file of requiredDocs) {
  if (!existsSync(join(docsRoot, file))) {
    errors.push(`required design document missing: docs/design/${file}`);
  }
}

if (existsSync(routeMatrixPath)) {
  const matrix = readFileSync(routeMatrixPath, "utf8");
  const pages = walk(appRoot, (file) => file.endsWith(`${sep}page.tsx`));
  if (pages.length !== 135) {
    errors.push(
      `route baseline changed: expected 135 page files, found ${pages.length}`,
    );
  }
  for (const page of pages) {
    const source = relative(root, page).split(sep).join("/");
    if (!matrix.includes(`\`${source}\``)) {
      errors.push(`page missing from route matrix: ${source}`);
    }
  }
}

if (existsSync(flowPath)) {
  const flows = readFileSync(flowPath, "utf8");
  const headings = [...flows.matchAll(/^## (\d+)\. /gm)].map((match) =>
    Number(match[1]),
  );
  const expected = Array.from({ length: 32 }, (_, index) => index + 1);
  if (headings.join(",") !== expected.join(",")) {
    errors.push(
      `expected user flow headings 1-32, found: ${headings.join(", ")}`,
    );
  }
  const sections = flows.split(/^## \d+\. /gm).slice(1);
  for (const [index, section] of sections.entries()) {
    if (!/```mermaid\r?\nflowchart/.test(section)) {
      errors.push(`user flow ${index + 1} lacks a Mermaid flowchart`);
    }
  }
}

let mermaidCount = 0;
for (const file of requiredDocs.map((name) => join(docsRoot, name))) {
  if (!existsSync(file)) continue;
  const source = readFileSync(file, "utf8");
  const openings = source.match(/```mermaid\r?\n/g)?.length ?? 0;
  const allFences = source.match(/^```/gm)?.length ?? 0;
  mermaidCount += openings;
  if (allFences % 2 !== 0) {
    errors.push(`unbalanced Markdown fence: ${relative(root, file)}`);
  }
  for (const diagram of source.matchAll(/```mermaid\r?\n([\s\S]*?)```/g)) {
    if (!/^flowchart\s+(?:TD|TB|BT|RL|LR)\s*$/m.test(diagram[1])) {
      errors.push(`unsupported Mermaid declaration: ${relative(root, file)}`);
    }
  }
  if (
    /C:\\Users\\|\.env\.local|SUPABASE_SERVICE_ROLE_KEY\s*=|PAYMONGO_SECRET_KEY\s*=/.test(
      source,
    )
  ) {
    errors.push(
      `local path or secret-like documentation content: ${relative(root, file)}`,
    );
  }
}

if (mermaidCount < 35) {
  errors.push(`expected at least 35 Mermaid diagrams, found ${mermaidCount}`);
}

if (errors.length > 0) {
  console.error(`Design documentation validation failed (${errors.length}):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  `Design documentation valid: ${requiredDocs.length} files, 135 routes, 32 flows, ${mermaidCount} Mermaid diagrams.`,
);
