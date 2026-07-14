import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";

const root = resolve(import.meta.dirname, "..");
const errors = [];
const requiredDocs = [
  "ci-cd.md",
  "release-process.md",
  "release-checklist.md",
  "branch-protection.md",
  "github-environments.md",
  "preview-deployments.md",
  "production-verification.md",
  "hosted-database-verification.md",
  "workflow-security.md",
  "rollback.md",
  "ci-secrets.md",
  "ci-troubleshooting.md",
  "release-manifest.md",
];

function display(path) {
  return relative(root, path).split(sep).join("/");
}

const files = requiredDocs.map((name) => join(root, "docs", name));
for (const file of files) {
  if (!existsSync(file)) {
    errors.push(`required CI/CD document missing: ${display(file)}`);
    continue;
  }
  const source = readFileSync(file, "utf8");
  if (!/^# .+/m.test(source)) errors.push(`missing H1: ${display(file)}`);
  if (/(?:[A-Za-z]:\\Users\\|\/(?:Users|home)\/[^\s/]+\/)/.test(source)) {
    errors.push(`absolute local path in ${display(file)}`);
  }
  for (const match of source.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
    const href = match[1].trim().replace(/^<|>$/g, "").split("#", 1)[0];
    if (!href || /^(?:https?:|mailto:|tel:)/i.test(href)) continue;
    const target = href.startsWith("/")
      ? join(root, href)
      : resolve(dirname(file), href);
    if (!existsSync(target)) {
      errors.push(`broken link in ${display(file)}: ${match[1]}`);
    }
  }
}

for (const file of [
  ".github/pull_request_template.md",
  ".github/dependabot.yml",
  ".github/ci/migration-allowlist.json",
  ".github/ci/format-allowlist.json",
]) {
  if (!existsSync(join(root, file)))
    errors.push(`required automation file missing: ${file}`);
}

const packageJson = JSON.parse(
  readFileSync(join(root, "package.json"), "utf8"),
);
for (const name of [
  "format:check",
  "security:audit",
  "test:ci",
  "db:types:validate",
  "ci:workflows:validate",
  "edge:validate",
  "edge:deployment:verify",
  "ci:contracts:report",
  "docs:ci:validate",
  "hosted:guard",
  "hosted:rls",
  "deployment:verify",
  "release:manifest",
  "validate:ci",
]) {
  if (!packageJson.scripts?.[name])
    errors.push(`required package script missing: ${name}`);
}

for (const [name, command] of Object.entries(packageJson.scripts ?? {})) {
  const scriptPath = command.match(/^node\s+(scripts\/[^\s]+)/)?.[1];
  if (scriptPath && !existsSync(join(root, scriptPath))) {
    errors.push(
      `package script ${name} references missing file: ${scriptPath}`,
    );
  }
}

const secretDoc = existsSync(join(root, "docs", "ci-secrets.md"))
  ? readFileSync(join(root, "docs", "ci-secrets.md"), "utf8")
  : "";
for (const name of [
  "STAGING_SUPABASE_ANON_KEY",
  "STAGING_SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_STAGING_DB_URL",
  "SUPABASE_ACCESS_TOKEN",
  "VERCEL_TOKEN",
  "VERCEL_ORG_ID",
  "VERCEL_PROJECT_ID",
]) {
  if (!secretDoc.includes(name))
    errors.push(`CI secret is undocumented: ${name}`);
}

const workflowSource = readdirSync(join(root, ".github", "workflows"))
  .filter((name) => /\.ya?ml$/.test(name))
  .map((name) => readFileSync(join(root, ".github", "workflows", name), "utf8"))
  .join("\n");
for (const match of workflowSource.matchAll(
  /\b(?:secrets|vars)\.([A-Z][A-Z0-9_]*)\b/g,
)) {
  if (match[1] !== "GITHUB_TOKEN" && !secretDoc.includes(match[1])) {
    errors.push(`workflow secret/variable is undocumented: ${match[1]}`);
  }
}

if (errors.length > 0) {
  console.error(`CI/CD documentation validation failed (${errors.length}):`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(
  `CI/CD documentation valid: ${requiredDocs.length} documents and automation contracts present.`,
);
