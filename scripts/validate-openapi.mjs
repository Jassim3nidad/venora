import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";

const root = resolve(import.meta.dirname, "..");
const specPath = join(root, "docs", "api", "openapi.json");
const appRoot = join(root, "apps", "web", "app");
const functionsRoot = join(root, "supabase", "functions");
const docsRoot = join(root, "docs");
const httpMethods = new Set([
  "get",
  "post",
  "put",
  "patch",
  "delete",
  "options",
  "head",
]);
const errors = [];
const requiredDocs = [
  "README.md",
  "api/README.md",
  "api/authentication.md",
  "api/endpoint-inventory.md",
  "api/error-handling.md",
  "api/server-actions.md",
  "api/storage.md",
  "api/supabase-rpc.md",
  "api/webhooks.md",
  "api/openapi.json",
];

function walk(directory, predicate, output = []) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const fullPath = join(directory, entry.name);
    if (entry.isDirectory()) walk(fullPath, predicate, output);
    else if (predicate(fullPath)) output.push(fullPath);
  }
  return output;
}

function routePath(file) {
  const routeDirectory = relative(appRoot, file.slice(0, -"route.ts".length));
  const segments = routeDirectory
    .split(sep)
    .filter(Boolean)
    .filter((segment) => !(segment.startsWith("(") && segment.endsWith(")")))
    .map((segment) => segment.replace(/^\[([^\]]+)\]$/, "{$1}"));
  return `/${segments.join("/")}`;
}

function operationKey(method, path) {
  return `${method.toUpperCase()} ${path}`;
}

if (!existsSync(specPath)) {
  throw new Error(`OpenAPI document not found: ${specPath}`);
}

for (const doc of requiredDocs) {
  if (!existsSync(join(docsRoot, doc)))
    errors.push(`required documentation missing: docs/${doc}`);
}

for (const file of walk(docsRoot, (candidate) => candidate.endsWith(".md"))) {
  const source = readFileSync(file, "utf8");
  let expectedTablePipes = null;
  for (const [index, line] of source.split(/\r?\n/).entries()) {
    if (!/^\s*\|/.test(line)) {
      expectedTablePipes = null;
      continue;
    }
    const pipeCount = line.match(/(?<!\\)\|/g)?.length ?? 0;
    expectedTablePipes ??= pipeCount;
    if (pipeCount !== expectedTablePipes) {
      errors.push(
        `malformed Markdown table in ${relative(root, file)}:${index + 1}: ` +
          `expected ${expectedTablePipes} column markers, found ${pipeCount}`,
      );
    }
  }
  for (const match of source.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
    const href = match[1].trim().replace(/^<|>$/g, "").split("#", 1)[0];
    if (!href || /^(?:https?:|mailto:|tel:)/i.test(href)) continue;
    const target = href.startsWith("/")
      ? join(root, href)
      : resolve(dirname(file), href);
    if (!existsSync(target)) {
      errors.push(`broken local link in ${relative(root, file)}: ${match[1]}`);
    }
  }
}

let spec;
try {
  spec = JSON.parse(readFileSync(specPath, "utf8"));
} catch (error) {
  throw new Error(
    `OpenAPI JSON is invalid: ${error instanceof Error ? error.message : error}`,
  );
}

if (spec.openapi !== "3.1.0") errors.push("openapi must equal 3.1.0");
if (!spec.info?.title || !spec.info?.version)
  errors.push("info.title and info.version are required");
if (!Array.isArray(spec.servers) || spec.servers.length === 0)
  errors.push("at least one server is required");
if (!spec.components?.securitySchemes?.bearerAuth)
  errors.push("bearerAuth security scheme is required");

const requiredSchemas = [
  "StandardError",
  "Pagination",
  "Booking",
  "Payment",
  "Venue",
  "Supplier",
  "Notification",
  "Review",
  "AdminAudit",
  "PayMongoWebhook",
];
for (const name of requiredSchemas) {
  if (!spec.components?.schemas?.[name])
    errors.push(`components.schemas.${name} is required`);
}

const documentedOperations = new Set();
for (const [path, pathItem] of Object.entries(spec.paths ?? {})) {
  if (!path.startsWith("/")) errors.push(`path must start with /: ${path}`);
  for (const [method, operation] of Object.entries(pathItem ?? {})) {
    if (!httpMethods.has(method)) continue;
    documentedOperations.add(operationKey(method, path));
    if (!operation.operationId)
      errors.push(`${method.toUpperCase()} ${path} lacks operationId`);
    if (!operation.description)
      errors.push(`${method.toUpperCase()} ${path} lacks description`);
    if (!Array.isArray(operation.tags) || operation.tags.length === 0) {
      errors.push(`${method.toUpperCase()} ${path} lacks tags`);
    }
    if (!operation.responses || Object.keys(operation.responses).length === 0) {
      errors.push(`${method.toUpperCase()} ${path} lacks responses`);
    }
  }
}

const implementedRouteOperations = new Set();
for (const file of walk(appRoot, (candidate) =>
  candidate.endsWith(`${sep}route.ts`),
)) {
  const source = readFileSync(file, "utf8");
  const path = routePath(file);
  for (const match of source.matchAll(
    /export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)\s*\(/g,
  )) {
    implementedRouteOperations.add(operationKey(match[1], path));
  }
}

for (const operation of implementedRouteOperations) {
  if (!documentedOperations.has(operation))
    errors.push(`undocumented Route Handler: ${operation}`);
}

const edgeFunctions = readdirSync(functionsRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && entry.name !== "_shared")
  .filter((entry) => existsSync(join(functionsRoot, entry.name, "index.ts")))
  .map((entry) => entry.name)
  .sort();

for (const functionName of edgeFunctions) {
  const path = `/${functionName}`;
  const operation = spec.paths?.[path]?.post;
  if (
    !operation ||
    operation["x-venora-surface"] !== "supabase-edge-function"
  ) {
    errors.push(`undocumented Supabase Edge Function: POST ${path}`);
  }
}

const refs = JSON.stringify(spec).matchAll(
  /"\$ref":"#\/components\/schemas\/([^"/]+)"/g,
);
for (const match of refs) {
  if (!spec.components?.schemas?.[match[1]])
    errors.push(`unresolved schema reference: ${match[1]}`);
}

if (errors.length > 0) {
  console.error(`OpenAPI validation failed (${errors.length}):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  `OpenAPI valid: ${documentedOperations.size} operations; ` +
    `${implementedRouteOperations.size} Route Handler operations and ${edgeFunctions.length} Edge Functions covered.`,
);
