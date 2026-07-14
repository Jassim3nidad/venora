import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { check, resolveConfig } from "prettier";

const root = resolve(import.meta.dirname, "..");
const baseSha = process.env.CI_BASE_SHA?.trim();
const diffRange =
  baseSha && /^[0-9a-f]{40}$/i.test(baseSha) && !/^0+$/.test(baseSha)
    ? [baseSha, "HEAD"]
    : ["HEAD"];

function git(args) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8" });
}

const candidates = new Set([
  ...git(["diff", "--name-only", ...diffRange, "--", "."])
    .split(/\r?\n/)
    .filter(Boolean),
  ...git(["ls-files", "--others", "--exclude-standard"])
    .split(/\r?\n/)
    .filter(Boolean),
]);
const generated = new Set([
  "pnpm-lock.yaml",
  "docs/api/openapi.json",
  "docs/api/openapi.yaml",
  "packages/database/types/generated.ts",
]);
const files = [...candidates]
  .filter((file) => /\.(?:ts|tsx|md|json|ya?ml|mjs)$/.test(file))
  .filter((file) => !generated.has(file))
  .filter((file) => existsSync(join(root, file)))
  .sort();

if (files.length === 0) {
  console.log(
    "Changed-file formatting check passed: no supported files changed.",
  );
  process.exit(0);
}

const unformatted = [];
for (const file of files) {
  const path = join(root, file);
  const configuration = (await resolveConfig(path)) ?? {};
  const formatted = await check(readFileSync(path, "utf8"), {
    ...configuration,
    filepath: path,
  });
  if (!formatted) unformatted.push(file);
}
if (unformatted.length > 0) {
  console.error(
    `Changed-file formatting check failed (${unformatted.length}):`,
  );
  unformatted.forEach((file) => console.error(`- ${file}`));
  process.exit(1);
}
console.log(`Changed-file formatting check passed: ${files.length} files.`);
