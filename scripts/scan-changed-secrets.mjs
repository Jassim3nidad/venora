import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const errors = [];
const patterns = [
  [
    "provider secret",
    /\bsk_(?:live|test|proj|org|svcacct)_[A-Za-z0-9_-]{12,}\b/,
  ],
  ["webhook secret", /\bwhsec_[A-Za-z0-9]{12,}\b/],
  ["Supabase secret", /\bsb_secret_[A-Za-z0-9_-]{12,}\b/],
  ["GitHub token", /\bgh[opusr]_[A-Za-z0-9]{30,}\b/],
  ["AWS access key", /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/],
  ["Google API key", /\bAIza[A-Za-z0-9_-]{30,}\b/],
  ["Resend API key", /\bre_[A-Za-z0-9_-]{20,}\b/],
  ["JWT-like token", /\beyJhbGciOiJ[A-Za-z0-9_-]{20,}\b/],
  ["private key", /-----BEGIN (?:RSA |OPENSSH )?PRIVATE KEY-----/],
  ["absolute local path", /(?:[A-Za-z]:\\Users\\|\/(?:Users|home)\/[^\s/]+\/)/],
];

function runGit(args) {
  return execFileSync("git", args, {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });
}

const baseSha = process.env.CI_BASE_SHA?.trim();
const diffRange =
  baseSha && /^[0-9a-f]{40}$/i.test(baseSha) && !/^0+$/.test(baseSha)
    ? [baseSha, "HEAD"]
    : ["HEAD"];
const diff = runGit([
  "diff",
  "--no-ext-diff",
  "--unified=0",
  ...diffRange,
  "--",
  ".",
]);
const addedDiff = diff
  .split(/\r?\n/)
  .filter((line) => line.startsWith("+") && !line.startsWith("+++"))
  .join("\n");

const untracked = runGit(["ls-files", "--others", "--exclude-standard"])
  .split(/\r?\n/)
  .filter(Boolean);
const untrackedSource = untracked
  .filter((file) => existsSync(resolve(root, file)))
  .map((file) => readFileSync(resolve(root, file), "utf8"))
  .join("\n");
const source = `${addedDiff}\n${untrackedSource}`;

for (const [label, pattern] of patterns) {
  if (pattern.test(source)) errors.push(`${label} detected in changed content`);
}

if (errors.length > 0) {
  console.error(`Changed-content secret/path scan failed (${errors.length}):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  `Changed-content secret/path scan passed: diff plus ${untracked.length} untracked files.`,
);
