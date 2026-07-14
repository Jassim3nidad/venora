import {
  appendFileSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const functionsRoot = join(root, "supabase", "functions");
const outputRoot = join(root, "artifacts", "ci");
const errors = [];
const functions = [];

mkdirSync(outputRoot, { recursive: true });

for (const name of readdirSync(functionsRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && !entry.name.startsWith("_"))
  .map((entry) => entry.name)
  .sort()) {
  const path = join(functionsRoot, name, "index.ts");
  let source = "";
  try {
    source = readFileSync(path, "utf8");
  } catch {
    errors.push(`${name}: index.ts is missing`);
    continue;
  }

  const envNames = [
    ...new Set(
      [...source.matchAll(/Deno\.env\.get\(["']([A-Z0-9_]+)["']\)/g)].map(
        (match) => match[1],
      ),
    ),
  ].sort();
  const checks = {
    entrypoint: /\bserve\s*\(/.test(source),
    cors: /Access-Control-Allow-Origin/.test(source),
    preflight: /req\.method\s*===\s*["']OPTIONS["']/.test(source),
    errorHandling: /\bcatch\s*\(/.test(source),
    environmentGuard: /Deno\.env\.get\(/.test(source),
    secretLiteralSafe:
      !/(?:SUPABASE_SERVICE_ROLE_KEY|OPENAI_API_KEY|OPENROUTER_API_KEY|RESEND_API_KEY)\s*[=:]\s*["'][^"']{12,}["']/i.test(
        source,
      ),
  };
  for (const [check, passed] of Object.entries(checks)) {
    if (!passed) errors.push(`${name}: ${check} static check failed`);
  }

  functions.push({
    name,
    checks,
    envNames,
    authentication: /headers\.get\(["']Authorization["']\)/.test(source)
      ? "bearer-token inspected in function"
      : "deployed JWT setting or trusted caller must be verified",
    usesServiceRole: source.includes("SUPABASE_SERVICE_ROLE_KEY"),
    jwtDeploymentSetting: "UNVERIFIED_HOSTED_SETTING",
  });
}

if (functions.length === 0) errors.push("no Edge Function entrypoints found");

const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  status: errors.length === 0 ? "PASS" : "FAIL",
  staticValidation: errors.length === 0 ? "PASS" : "FAIL",
  denoRepositoryFormat: "BLOCKED_BY_LEGACY_FORMAT_DEBT",
  denoRepositoryTypeCheck: "BLOCKED_BY_LEGACY_TYPE_ERRORS",
  importResolution: "BLOCKED_WITH_FULL_DENO_TYPE_CHECK",
  functionCount: functions.length,
  functions,
  errors,
};
writeFileSync(
  join(outputRoot, "edge-functions.json"),
  `${JSON.stringify(report, null, 2)}\n`,
);

const rows = functions
  .map(
    (item) =>
      `| ${item.name} | ${Object.values(item.checks).every(Boolean) ? "PASS" : "FAIL"} | ${item.authentication} | UNVERIFIED |`,
  )
  .join("\n");
const markdown = `# Edge Function validation\n\n| Function | Static checks | Authentication assumption | Hosted JWT |\n| --- | --- | --- | --- |\n${rows}\n\nFull-repository Deno format, type, and import checks remain **BLOCKED** by recorded legacy debt. Protected deployment runs strict Deno checks for the selected function before deployment.\n`;
writeFileSync(join(outputRoot, "edge-functions.md"), markdown);
if (process.env.GITHUB_STEP_SUMMARY) {
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, markdown);
  appendFileSync(
    process.env.GITHUB_STEP_SUMMARY,
    "\n> [!WARNING]\n> Full Edge Function Deno format/type validation is blocked; static validation is not a substitute.\n",
  );
}

if (errors.length > 0) {
  console.error(`Edge Function static validation failed (${errors.length}):`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.warn(
  `Edge Function static validation passed for ${functions.length} functions; full Deno format/type checks remain BLOCKED by legacy debt.`,
);
