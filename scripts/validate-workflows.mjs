import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { parseDocument } from "yaml";

const root = resolve(import.meta.dirname, "..");
const workflowsRoot = join(root, ".github", "workflows");
const errors = [];
const requiredWorkflows = [
  "ci.yml",
  "security.yml",
  "hosted-verification.yml",
  "deployment-verification.yml",
  "protected-operations.yml",
];

function display(path) {
  return relative(root, path).split(sep).join("/");
}

function visit(value, callback, path = []) {
  callback(value, path);
  if (Array.isArray(value)) {
    value.forEach((item, index) => visit(item, callback, [...path, index]));
  } else if (value && typeof value === "object") {
    Object.entries(value).forEach(([key, item]) =>
      visit(item, callback, [...path, key]),
    );
  }
}

for (const name of requiredWorkflows) {
  if (!existsSync(join(workflowsRoot, name))) {
    errors.push(`required workflow missing: .github/workflows/${name}`);
  }
}

const workflowFiles = existsSync(workflowsRoot)
  ? readdirSync(workflowsRoot)
      .filter((name) => /\.ya?ml$/.test(name))
      .map((name) => join(workflowsRoot, name))
  : [];

for (const file of workflowFiles) {
  const source = readFileSync(file, "utf8");
  const document = parseDocument(source, { prettyErrors: true });
  if (document.errors.length > 0) {
    for (const error of document.errors) {
      errors.push(`${display(file)}: ${error.message}`);
    }
    continue;
  }

  const workflow = document.toJS();
  const events = workflow.on ?? {};
  if (Object.prototype.hasOwnProperty.call(events, "pull_request_target")) {
    errors.push(`${display(file)} uses forbidden pull_request_target`);
  }
  if (/continue-on-error\s*:\s*true/i.test(source)) {
    errors.push(`${display(file)} weakens a gate with continue-on-error`);
  }
  if (/secrets\s*:\s*inherit/i.test(source)) {
    errors.push(`${display(file)} inherits secrets instead of naming them`);
  }
  if (/\b(?:printenv|env\s*$|set\s*$|Get-ChildItem\s+Env:)\b/im.test(source)) {
    errors.push(`${display(file)} may dump the environment`);
  }
  if (
    /\b(?:vercel\s+(?:deploy|--prod)|supabase\s+db\s+reset)\b/i.test(source)
  ) {
    errors.push(
      `${display(file)} contains a forbidden deployment/reset command`,
    );
  }

  const topPermissions = workflow.permissions ?? {};
  for (const [scope, access] of Object.entries(topPermissions)) {
    if (access === "write") {
      errors.push(`${display(file)} grants top-level ${scope}: write`);
    }
  }

  visit(workflow, (value, path) => {
    const key = path.at(-1);
    if (key === "uses" && typeof value === "string") {
      if (!/^[^\s@]+@[0-9a-f]{40}$/.test(value)) {
        errors.push(`${display(file)} has unpinned action: ${value}`);
      }
    }
    if (key === "run" && typeof value === "string") {
      if (/\b(?:curl|wget)\b[^\n]*\|\s*(?:ba)?sh\b/i.test(value)) {
        errors.push(`${display(file)} pipes a download into a shell`);
      }
    }
  });

  for (const [jobName, job] of Object.entries(workflow.jobs ?? {})) {
    const permissions = job.permissions ?? {};
    for (const [scope, access] of Object.entries(permissions)) {
      const codeqlException =
        file.endsWith("security.yml") &&
        jobName === "codeql" &&
        scope === "security-events" &&
        access === "write";
      if (access === "write" && !codeqlException) {
        errors.push(
          `${display(file)} job ${jobName} grants unexpected ${scope}: write`,
        );
      }
    }

    for (const step of job.steps ?? []) {
      if (step.uses?.startsWith("actions/checkout@")) {
        if (step.with?.["persist-credentials"] !== false) {
          errors.push(
            `${display(file)} job ${jobName} checkout must set persist-credentials: false`,
          );
        }
      }
    }
  }

  const protectedWorkflows = [
    "hosted-verification.yml",
    "deployment-verification.yml",
    "protected-operations.yml",
  ].some((name) => file.endsWith(name));
  const manualOnly = [
    "hosted-verification.yml",
    "protected-operations.yml",
  ].some((name) => file.endsWith(name));
  if (manualOnly) {
    const eventNames =
      typeof events === "string" ? [events] : Object.keys(events ?? {});
    if (eventNames.length !== 1 || eventNames[0] !== "workflow_dispatch") {
      errors.push(`${display(file)} must be workflow_dispatch only`);
    }
  }
  if (protectedWorkflows) {
    for (const [jobName, job] of Object.entries(workflow.jobs ?? {})) {
      if (!job.environment) {
        errors.push(
          `${display(file)} job ${jobName} lacks an environment gate`,
        );
      }
    }
  }

  if (!workflow.concurrency) {
    errors.push(`${display(file)} lacks concurrency control`);
  }
}

if (errors.length > 0) {
  console.error(`Workflow validation failed (${errors.length}):`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(
  `Workflow validation passed: ${workflowFiles.length} YAML files; syntax, action pins, permissions, triggers, and protected environments valid.`,
);
