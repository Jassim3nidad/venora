import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const required = [
  "DEPLOYMENT_URL",
  "DEPLOYMENT_TIER",
  "EXPECTED_COMMIT_SHA",
  "PRODUCTION_BASE_URL",
  "VERCEL_TOKEN",
  "VERCEL_ORG_ID",
  "VERCEL_PROJECT_ID",
];
const missing = required.filter((name) => !process.env[name]?.trim());
if (missing.length > 0) {
  console.error(
    `BLOCKED: deployment verification configuration missing: ${missing.join(", ")}`,
  );
  process.exit(1);
}

const tier = process.env.DEPLOYMENT_TIER;
if (!["preview", "staging", "production"].includes(tier)) {
  console.error(
    "BLOCKED: DEPLOYMENT_TIER must be preview, staging, or production.",
  );
  process.exit(1);
}

function safeUrl(value, label) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") throw new Error();
    if (["localhost", "127.0.0.1", "::1"].includes(url.hostname))
      throw new Error();
    url.username = "";
    url.password = "";
    url.hash = "";
    return url;
  } catch {
    console.error(`BLOCKED: ${label} must be a non-local HTTPS URL.`);
    process.exit(1);
  }
}

const deploymentUrl = safeUrl(process.env.DEPLOYMENT_URL, "DEPLOYMENT_URL");
const productionUrl = safeUrl(
  process.env.PRODUCTION_BASE_URL,
  "PRODUCTION_BASE_URL",
);
if (
  tier === "production" &&
  deploymentUrl.hostname !== productionUrl.hostname
) {
  console.error(
    "BLOCKED: production verification URL does not match PRODUCTION_BASE_URL.",
  );
  process.exit(1);
}
if (
  tier !== "production" &&
  deploymentUrl.hostname === productionUrl.hostname
) {
  console.error("BLOCKED: non-production verification targets production.");
  process.exit(1);
}

const expectedSha = process.env.EXPECTED_COMMIT_SHA.trim().toLowerCase();
if (!/^[0-9a-f]{40}$/.test(expectedSha)) {
  console.error(
    "BLOCKED: EXPECTED_COMMIT_SHA must be a full 40-character commit hash.",
  );
  process.exit(1);
}

const deploymentLookup = encodeURIComponent(deploymentUrl.hostname);
const apiUrl = new URL(
  `https://api.vercel.com/v13/deployments/${deploymentLookup}`,
);
apiUrl.searchParams.set("teamId", process.env.VERCEL_ORG_ID);
apiUrl.searchParams.set("withGitRepoInfo", "true");
const waitSeconds = Math.min(
  900,
  Math.max(0, Number(process.env.DEPLOYMENT_WAIT_SECONDS ?? 0) || 0),
);
const deadline = Date.now() + waitSeconds * 1000;
let deployment;
let deployedSha;
for (;;) {
  const apiResponse = await fetch(apiUrl, {
    headers: { Authorization: `Bearer ${process.env.VERCEL_TOKEN}` },
  });
  if (apiResponse.ok) {
    const candidate = await apiResponse.json();
    const projectId = candidate.projectId ?? candidate.project?.id;
    if (projectId !== process.env.VERCEL_PROJECT_ID) {
      console.error(
        "BLOCKED: deployment belongs to a different Vercel project.",
      );
      process.exit(1);
    }
    const candidateSha = [
      candidate.gitSource?.sha,
      candidate.meta?.githubCommitSha,
      candidate.meta?.gitCommitSha,
    ].find(
      (value) => typeof value === "string" && /^[0-9a-f]{40}$/i.test(value),
    );
    if (
      candidate.readyState === "READY" &&
      candidateSha?.toLowerCase() === expectedSha
    ) {
      deployment = candidate;
      deployedSha = candidateSha;
      break;
    }
    if (["ERROR", "CANCELED"].includes(candidate.readyState)) {
      console.error(
        `Deployment entered terminal state ${candidate.readyState}.`,
      );
      process.exit(1);
    }
  } else if (Date.now() >= deadline) {
    console.error(
      `BLOCKED: Vercel deployment lookup failed with HTTP ${apiResponse.status}.`,
    );
    process.exit(1);
  }

  if (Date.now() >= deadline) {
    console.error(
      "Deployment readiness/commit binding timed out for EXPECTED_COMMIT_SHA.",
    );
    process.exit(1);
  }
  console.log("Waiting for Vercel READY state and exact commit binding.");
  await new Promise((resolve) => setTimeout(resolve, 15_000));
}

const checks = [];
async function check(path, allowedStatuses, label) {
  const url = new URL(path, deploymentUrl);
  const response = await fetch(url, { redirect: "manual" });
  if (
    !allowedStatuses.some(
      ([min, max]) => response.status >= min && response.status <= max,
    )
  ) {
    throw new Error(`${label} returned HTTP ${response.status}`);
  }
  const location = response.headers.get("location") ?? "";
  if (/localhost|127\.0\.0\.1|[A-Za-z]:\\Users\\/i.test(location)) {
    throw new Error(`${label} leaked a local redirect`);
  }
  const contentType = response.headers.get("content-type") ?? "";
  if (/text|json|xml|javascript/i.test(contentType)) {
    const body = (await response.text()).slice(0, 2_000_000);
    if (
      /localhost:\d+|[A-Za-z]:\\Users\\|\/(?:Users|home)\/[^\s/]+\//i.test(body)
    ) {
      throw new Error(`${label} leaked local-only content`);
    }
  }
  checks.push({ label, path, status: response.status, result: "PASS" });
}

try {
  await check("/", [[200, 399]], "home");
  await check("/venues", [[200, 399]], "venue listing");
  await check("/login", [[200, 399]], "login");
  await check("/robots.txt", [[200, 299]], "robots");
  await check("/sitemap.xml", [[200, 299]], "sitemap");
  await check(
    "/dashboard",
    [
      [300, 399],
      [401, 403],
    ],
    "protected dashboard",
  );
  await check("/api/debug", [[404, 404]], "debug route absence");
} catch (error) {
  console.error(
    `Deployment smoke verification failed: ${error instanceof Error ? error.message : "unknown error"}`,
  );
  process.exit(1);
}

const outputRoot = join(root, "artifacts", "ci");
mkdirSync(outputRoot, { recursive: true });
const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  status: "PASS",
  tier,
  deploymentId: deployment.id ?? deployment.uid ?? null,
  deploymentHost: deploymentUrl.hostname,
  deploymentUrl: deploymentUrl.origin,
  expectedCommitSha: expectedSha,
  deployedCommitSha: deployedSha.toLowerCase(),
  readyState: deployment.readyState,
  checks,
};
writeFileSync(
  join(outputRoot, "deployment-verification.json"),
  `${JSON.stringify(report, null, 2)}\n`,
);
console.log(
  `Deployment verification passed: ${tier} host is READY and bound to ${expectedSha.slice(0, 12)}.`,
);
