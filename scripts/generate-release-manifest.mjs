import { execFileSync } from "node:child_process";
import {
  existsSync,
  appendFileSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const outputRoot = join(root, "artifacts", "ci");
mkdirSync(outputRoot, { recursive: true });
const commit = (
  process.env.EXPECTED_COMMIT_SHA ||
  execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" })
).trim();
const branch =
  process.env.GITHUB_REF_NAME ||
  execFileSync("git", ["branch", "--show-current"], {
    cwd: root,
    encoding: "utf8",
  }).trim() ||
  "detached";
const migrationFiles = readdirSync(join(root, "supabase", "migrations"))
  .filter((name) => /^\d+_.+\.sql$/.test(name))
  .sort();

function readJson(name) {
  const path = join(outputRoot, name);
  return existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : null;
}

const deployment = readJson("deployment-verification.json");
const hostedEnvironment = readJson("hosted-environment.json");
const hostedRls = readJson("hosted-storage-rls.json");
const tests = readJson("test-summary.json");
const blockedChecks = [
  ...(tests?.hostedSuites ?? [])
    .filter((suite) => suite.status === "BLOCKED")
    .map((suite) => suite.category),
  ...(!hostedEnvironment || hostedEnvironment.status !== "PASS"
    ? ["hosted-environment"]
    : []),
  ...(!hostedRls || hostedRls.status !== "PASS" ? ["hosted-storage-rls"] : []),
  ...(!deployment || deployment.status !== "PASS"
    ? ["deployment-verification"]
    : []),
];
const manifest = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  repository: process.env.GITHUB_REPOSITORY ?? "local/venora",
  branch,
  releaseCommit: commit,
  buildIdentifier:
    process.env.GITHUB_RUN_ID && process.env.GITHUB_RUN_ATTEMPT
      ? `${process.env.GITHUB_RUN_ID}-${process.env.GITHUB_RUN_ATTEMPT}`
      : "LOCAL",
  workflowRun: process.env.GITHUB_SERVER_URL
    ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
    : null,
  tier: process.env.DEPLOYMENT_TIER ?? "unassigned",
  protectedOperation: process.env.OPERATION
    ? {
        operation: process.env.OPERATION,
        status: (process.env.OPERATION_RESULT ?? "COMPLETED").toUpperCase(),
        changeReference: process.env.CHANGE_TICKET ?? "NOT_RECORDED",
        edgeFunction: process.env.FUNCTION_NAME || null,
        edgeJwtVerification: process.env.VERIFY_JWT || null,
      }
    : null,
  repositoryChecks: tests?.status ?? "NOT_RECORDED",
  testSummary: tests,
  deploymentVerification: deployment?.status ?? "BLOCKED",
  vercelDeploymentIdentifier: deployment?.deploymentId ?? null,
  productionUrl:
    process.env.DEPLOYMENT_TIER === "production"
      ? (deployment?.deploymentUrl ?? null)
      : null,
  hostedEnvironment: hostedEnvironment?.status ?? "BLOCKED",
  hostedStorageRls: hostedRls?.status ?? "BLOCKED",
  migrations: {
    count: migrationFiles.length,
    localIdentifiers: migrationFiles,
    appliedIdentifiers: "NOT_RECORDED_BY_LOCAL_MANIFEST",
    latestFiles: migrationFiles.slice(-5),
    legacyVersion068Rename: "TRACKED_PENDING_HOSTED_HISTORY_RECONCILIATION",
    duplicateVersion071: "ALLOWLISTED_PENDING_HOSTED_HISTORY_RECONCILIATION",
  },
  edgeFunctionsDeployed:
    process.env.OPERATION === "edge-deploy" && process.env.FUNCTION_NAME
      ? [process.env.FUNCTION_NAME]
      : [],
  blockedChecks: [...new Set(blockedChecks)],
  knownLimitations: [
    "Hosted migration history and migration 071 require protected verification evidence.",
    "The upstream 068-to-0680 rename and duplicate migration 071 remain pending hosted reconciliation.",
    "Full Edge Function Deno format/type checks have recorded legacy debt.",
  ],
  workflowInitiator: process.env.GITHUB_ACTOR ?? null,
  releaseApprover: process.env.RELEASE_APPROVER ?? null,
  rollbackTarget: process.env.ROLLBACK_TARGET ?? null,
  rollback: "docs/rollback.md",
};
writeFileSync(
  join(outputRoot, "release-manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
);
const markdown = `# Release manifest\n\n| Field | Value |\n| --- | --- |\n| Commit | \`${manifest.releaseCommit}\` |\n| Branch | ${manifest.branch} |\n| Build | ${manifest.buildIdentifier} |\n| Tier | ${manifest.tier} |\n| Protected operation | ${manifest.protectedOperation?.operation ?? "None"} |\n| Repository checks | ${manifest.repositoryChecks} |\n| Deployment verification | ${manifest.deploymentVerification} |\n| Hosted environment | ${manifest.hostedEnvironment} |\n| Hosted Storage RLS | ${manifest.hostedStorageRls} |\n| Migration count | ${manifest.migrations.count} |\n| Edge Functions deployed | ${manifest.edgeFunctionsDeployed.join(", ") || "None"} |\n| Blocked checks | ${manifest.blockedChecks.join(", ") || "None"} |\n| Rollback target | ${manifest.rollbackTarget ?? "NOT_RECORDED"} |\n\nThe upstream 068-to-0680 rename and duplicate migration 071 remain tracked pending hosted-history reconciliation.\n`;
writeFileSync(join(outputRoot, "release-manifest.md"), markdown);
if (process.env.GITHUB_STEP_SUMMARY) {
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, markdown);
}
console.log(`Release manifest generated for ${commit.slice(0, 12)}.`);
