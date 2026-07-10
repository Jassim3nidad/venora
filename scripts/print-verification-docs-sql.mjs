import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sqlPath = path.join(
  root,
  "supabase",
  "scripts",
  "fix-verification-docs-upload.sql",
);
const sql = readFileSync(sqlPath, "utf8");

console.log("Run this SQL in Supabase Dashboard → SQL Editor:");
console.log(
  "https://supabase.com/dashboard/project/szmjjkywcsnzkgqevinz/sql/new\n",
);
console.log(sql);
