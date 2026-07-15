import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { check, resolveConfig } from "prettier";

const root = resolve(import.meta.dirname, "..");
const allowlistPath = join(root, ".github", "ci", "format-allowlist.json");
const allowlist = existsSync(allowlistPath)
  ? JSON.parse(readFileSync(allowlistPath, "utf8"))
  : { exactFiles: [] };
const baseSha = process.env.CI_BASE_SHA?.trim();
const hasUsableBase =
  baseSha && /^[0-9a-f]{40}$/i.test(baseSha) && !/^0+$/.test(baseSha);
const diffRange = hasUsableBase ? [baseSha, "HEAD"] : ["HEAD"];
const baselineRef = hasUsableBase ? baseSha : "HEAD";

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
  // Supabase Edge sources use Deno's canonical formatter. The strict
  // edge:validate gate checks that tree with `deno fmt --check`.
  .filter((file) => !file.startsWith("supabase/functions/"))
  .filter((file) => existsSync(join(root, file)))
  .sort();

if (files.length === 0) {
  console.log(
    "Changed-file formatting check passed: no supported files changed.",
  );
  process.exit(0);
}

const unformatted = [];
const grandfathered = [];
for (const file of files) {
  const path = join(root, file);
  const configuration = (await resolveConfig(path)) ?? {};
  const formatted = await check(readFileSync(path, "utf8"), {
    ...configuration,
    filepath: path,
  });
  if (!formatted) {
    const exception = allowlist.exactFiles?.find((item) => item.file === file);
    let baselineWasUnformatted = false;
    if (exception) {
      try {
        const baselineSource = git(["show", `${baselineRef}:${file}`]);
        baselineWasUnformatted = !(await check(baselineSource, {
          ...configuration,
          filepath: path,
        }));
      } catch {
        baselineWasUnformatted = false;
      }
    }
    if (exception && baselineWasUnformatted) {
      grandfathered.push(exception);
    } else {
      unformatted.push(file);
    }
  }
}
if (unformatted.length > 0) {
  console.error(
    `Changed-file formatting check failed (${unformatted.length}):`,
  );
  unformatted.forEach((file) => console.error(`- ${file}`));
  process.exit(1);
}
for (const exception of grandfathered) {
  console.warn(
    `WARN: exact baseline format debt: ${exception.file} (${exception.removalCondition})`,
  );
}
console.log(`Changed-file formatting check passed: ${files.length} files.`);
