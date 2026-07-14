import { performance } from "node:perf_hooks";

const baseUrl = process.env.APP_BASE_URL;
const thresholdMs = Number(process.env.PERFORMANCE_THRESHOLD_MS ?? 5000);
const sampleCount = Number(process.env.PERFORMANCE_SAMPLES ?? 5);

if (!baseUrl) {
  console.error("APP_BASE_URL is required; use a running local Venora server.");
  process.exit(1);
}

const base = new URL(baseUrl);
if (!["localhost", "127.0.0.1", "::1"].includes(base.hostname)) {
  console.error("Performance smoke refuses non-local hosts.");
  process.exit(1);
}
if (!Number.isFinite(thresholdMs) || thresholdMs <= 0) {
  console.error("PERFORMANCE_THRESHOLD_MS must be a positive number.");
  process.exit(1);
}
if (!Number.isInteger(sampleCount) || sampleCount < 1 || sampleCount > 20) {
  console.error("PERFORMANCE_SAMPLES must be an integer from 1 to 20.");
  process.exit(1);
}

const scenarios = ["/", "/venues", "/suppliers"];
const failures = [];

for (const path of scenarios) {
  const url = new URL(path, base);
  const durations = [];

  for (let index = 0; index < sampleCount + 1; index += 1) {
    const start = performance.now();
    const response = await fetch(url, { redirect: "manual" });
    const duration = performance.now() - start;
    await response.arrayBuffer();

    if (response.status >= 400) {
      failures.push(`${path} returned HTTP ${response.status}`);
      break;
    }
    if (index > 0) durations.push(duration);
  }

  if (durations.length === 0) continue;
  const sorted = [...durations].sort((a, b) => a - b);
  const p95 = sorted[Math.ceil(sorted.length * 0.95) - 1];
  const median = sorted[Math.floor(sorted.length / 2)];
  console.log(
    `${path}: median=${median.toFixed(1)}ms p95=${p95.toFixed(1)}ms samples=${durations.length}`,
  );
  if (p95 > thresholdMs) {
    failures.push(`${path} p95 ${p95.toFixed(1)}ms exceeds ${thresholdMs}ms`);
  }
}

if (failures.length > 0) {
  console.error(`Local performance smoke failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  `Local performance smoke passed: ${scenarios.length} public routes, ${sampleCount} measured samples each.`,
);
