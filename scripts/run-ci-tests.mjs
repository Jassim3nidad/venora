import { spawnSync } from "node:child_process";
import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const outputRoot = join(root, "artifacts", "ci");
mkdirSync(outputRoot, { recursive: true });
const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const minimumVitest = Number(process.env.MIN_VITEST_TESTS ?? 124);

const suites = [
  { name: "unit", script: "test:unit", canonical: true },
  { name: "component", script: "test:component", canonical: true },
  { name: "integration", script: "test:integration", canonical: true },
  { name: "booking", script: "test:booking", canonical: false },
  { name: "payment", script: "test:payment", canonical: false },
  { name: "analytics", script: "test:analytics", canonical: false },
  { name: "security", script: "test:security", canonical: false },
  { name: "ai", script: "test:ai", canonical: false },
];

function run(args, envOverrides = {}) {
  const executable =
    process.platform === "win32" ? `${pnpm} ${args.join(" ")}` : pnpm;
  const executableArgs = process.platform === "win32" ? [] : args;
  const result = spawnSync(executable, executableArgs, {
    cwd: root,
    encoding: "utf8",
    env: {
      ...process.env,
      ...envOverrides,
      FORCE_COLOR: "0",
      NO_COLOR: "1",
    },
    shell: process.platform === "win32",
    maxBuffer: 50 * 1024 * 1024,
  });
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}${result.error?.message ?? ""}`;
  process.stdout.write(output);
  return { code: result.status ?? 1, output };
}

function stripAnsi(value) {
  return value.replace(/\u001B(?:[@-_]|\[[0-?]*[ -/]*[@-~])/g, "");
}

const results = [];
for (const suite of suites) {
  console.log(`\n[ci-tests] ${suite.name}`);
  const runResult = run(["run", suite.script]);
  const normalizedOutput = stripAnsi(runResult.output);
  const vitestMatch = normalizedOutput.match(/Tests\s+(\d+)\s+passed/i);
  const vitestFailedMatch = normalizedOutput.match(/Tests\s+(\d+)\s+failed/i);
  const vitestSkippedMatch = normalizedOutput.match(
    /Tests[\s\S]*?(\d+)\s+skipped/i,
  );
  const denoMatch = normalizedOutput.match(/(\d+) passed \| 0 failed/i);
  const passed = Number(vitestMatch?.[1] ?? denoMatch?.[1] ?? 0);
  const failed = Number(
    vitestFailedMatch?.[1] ?? (runResult.code === 0 ? 0 : 1),
  );
  const skipped = Number(vitestSkippedMatch?.[1] ?? 0);
  results.push({
    category: suite.name,
    command: `pnpm ${suite.script}`,
    status: runResult.code === 0 ? "PASS" : "FAIL",
    discovered: passed + failed + skipped,
    executed: passed + failed,
    passed,
    failed,
    skipped,
    blocked: 0,
    canonical: suite.canonical,
  });
}

function discover(label, args) {
  const result = run(args, {
    NEXT_PUBLIC_SUPABASE_URL: "https://ci-discovery.invalid",
    SUPABASE_SERVICE_ROLE_KEY: "ci-discovery-placeholder",
  });
  const match = result.output.match(/Total:\s+(\d+) tests?/i);
  return {
    category: label,
    command: `pnpm ${args.join(" ")}`,
    status: "BLOCKED",
    discovered: Number(match?.[1] ?? 0),
    executed: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    blocked: Number(match?.[1] ?? 0),
    reason:
      "Requires protected non-production URL and dedicated hosted fixtures",
  };
}

const hosted = [
  discover("e2e", [
    "--filter",
    "@venora/web",
    "exec",
    "playwright",
    "test",
    "--list",
  ]),
  discover("accessibility", [
    "--filter",
    "@venora/web",
    "exec",
    "playwright",
    "test",
    "e2e/a11y",
    "--list",
  ]),
  {
    category: "hosted-storage-rls",
    command: "pnpm hosted:rls",
    status: "BLOCKED",
    discovered: 1,
    executed: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    blocked: 1,
    reason: "Runs only in the protected staging environment",
  },
  {
    category: "hosted-notification-providers",
    command: "protected provider-specific staging verification",
    status: "BLOCKED",
    discovered: 1,
    executed: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    blocked: 1,
    reason:
      "Requires authorized staging Resend/Web Push/provider credentials and fixtures",
  },
];

const canonicalPassed = results
  .filter((result) => result.canonical && result.status === "PASS")
  .reduce((total, result) => total + result.passed, 0);
const failures = results.filter((result) => result.status === "FAIL");
if (canonicalPassed < minimumVitest) {
  failures.push({
    category: "canonical-total",
    status: "FAIL",
    reason: `${canonicalPassed} is below required ${minimumVitest}`,
  });
}

const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  commit: process.env.GITHUB_SHA ?? null,
  branch: process.env.GITHUB_REF_NAME ?? null,
  trigger: process.env.GITHUB_EVENT_NAME ?? "local",
  canonicalVitestPassed: canonicalPassed,
  minimumVitest,
  localSuites: results,
  hostedSuites: hosted,
  status: failures.length === 0 ? "PASS" : "FAIL",
};
writeFileSync(
  join(outputRoot, "test-summary.json"),
  `${JSON.stringify(report, null, 2)}\n`,
);

const rows = [...results, ...hosted]
  .map(
    (result) =>
      `| ${result.category} | ${result.status} | ${result.discovered ?? 0} | ${result.executed ?? 0} | ${result.passed ?? 0} | ${result.failed ?? 0} | ${result.skipped ?? 0} | ${result.blocked ?? 0} |`,
  )
  .join("\n");
const markdown = `# CI test summary\n\nCanonical Vitest: ${canonicalPassed}/${minimumVitest} minimum. Domain suites intentionally repeat focused subsets and are not added to the canonical total.\n\n| Category | Status | Discovered | Executed | Passed | Failed | Skipped | Blocked |\n| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |\n${rows}\n`;
writeFileSync(join(outputRoot, "test-summary.md"), markdown);
if (process.env.GITHUB_STEP_SUMMARY)
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, markdown);

if (failures.length > 0) {
  console.error(
    `CI test gate failed (${failures.length}). See artifacts/ci/test-summary.json.`,
  );
  process.exit(1);
}
console.log(
  `CI test gate passed: ${canonicalPassed} canonical Vitest tests; hosted suites correctly reported BLOCKED.`,
);
