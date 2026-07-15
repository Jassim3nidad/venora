import {
  appendFileSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { spawnSync } from "node:child_process";
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
      : source.includes("x-notification-secret")
        ? "shared notification webhook secret enforced"
        : "deployed JWT setting or trusted caller must be verified",
    usesServiceRole: source.includes("SUPABASE_SERVICE_ROLE_KEY"),
    jwtDeploymentSetting: "UNVERIFIED_HOSTED_SETTING",
  });
}

if (functions.length === 0) errors.push("no Edge Function entrypoints found");

const staticValidation = errors.length === 0 ? "PASS" : "FAIL";

function runDeno(label, args) {
  const result = spawnSync("deno", args, {
    cwd: root,
    encoding: "utf8",
    windowsHide: true,
  });
  if (result.error) {
    errors.push(`${label}: ${result.error.message}`);
    return false;
  }
  if (result.status !== 0) {
    const detail = (result.stderr || result.stdout || "unknown Deno error")
      .trim()
      .slice(0, 2_000);
    errors.push(`${label}: ${detail}`);
    return false;
  }
  return true;
}

const denoFormatPassed = runDeno("Deno format", [
  "fmt",
  "--check",
  functionsRoot,
]);
let denoTypePassed = true;
for (const item of functions) {
  const passed = runDeno(`Deno type check (${item.name})`, [
    "--quiet",
    "check",
    "--no-config",
    "--node-modules-dir=none",
    "--frozen",
    "--lock=deno.lock",
    join(functionsRoot, item.name, "index.ts"),
  ]);
  item.typeCheck = passed ? "PASS" : "FAIL";
  denoTypePassed = denoTypePassed && passed;
}

const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  status: errors.length === 0 ? "PASS" : "FAIL",
  staticValidation,
  denoRepositoryFormat: denoFormatPassed ? "PASS" : "FAIL",
  denoRepositoryTypeCheck: denoTypePassed ? "PASS" : "FAIL",
  importResolution: denoTypePassed ? "PASS" : "FAIL",
  functionCount: functions.length,
  functions,
  errors,
};
writeFileSync(
  join(outputRoot, "edge-functions.json"),
  `${JSON.stringify(report, null, 2)}\n`,
);

const markdown = `# Edge Function validation\n\n| Function | Static checks | Type check | Authentication assumption | Hosted JWT |\n| --- | --- | --- | --- | --- |\n${functions
  .map(
    (item) =>
      `| ${item.name} | ${Object.values(item.checks).every(Boolean) ? "PASS" : "FAIL"} | ${item.typeCheck} | ${item.authentication} | UNVERIFIED |`,
  )
  .join(
    "\n",
  )}\n\nDeno repository format: **${report.denoRepositoryFormat}**. Deno type/import validation: **${report.denoRepositoryTypeCheck}**. Hosted JWT settings remain independently unverified.\n`;
writeFileSync(join(outputRoot, "edge-functions.md"), markdown);
if (process.env.GITHUB_STEP_SUMMARY) {
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, markdown);
}

if (errors.length > 0) {
  console.error(`Edge Function validation failed (${errors.length}):`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(
  `Edge Function validation passed for ${functions.length} functions; Deno format, type, and import checks passed.`,
);
