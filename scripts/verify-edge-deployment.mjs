import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const outputRoot = join(root, "artifacts", "ci");
const functionName = process.env.FUNCTION_NAME;
const expectedJwt = process.env.VERIFY_JWT;
if (!functionName || !["true", "false"].includes(expectedJwt ?? "")) {
  console.error(
    "Edge deployment verification requires FUNCTION_NAME and VERIFY_JWT.",
  );
  process.exit(1);
}

let payload;
try {
  payload = JSON.parse(
    readFileSync(join(outputRoot, "edge-functions-remote.json"), "utf8"),
  );
} catch {
  console.error("Edge deployment verification could not read CLI evidence.");
  process.exit(1);
}
const functions = Array.isArray(payload)
  ? payload
  : (payload.functions ?? payload.data ?? []);
const deployed = functions.find(
  (item) => item?.name === functionName || item?.slug === functionName,
);
if (!deployed) {
  console.error(
    `Edge Function ${functionName} is absent from the target project.`,
  );
  process.exit(1);
}
const actualJwt = deployed.verify_jwt ?? deployed.verifyJwt;
const jwtStatus =
  actualJwt === undefined || actualJwt === null
    ? "UNVERIFIED_BY_CLI"
    : String(actualJwt) === expectedJwt
      ? "PASS"
      : "FAIL";
if (jwtStatus === "FAIL") {
  console.error(
    `Edge Function ${functionName} JWT setting does not match intent.`,
  );
  process.exit(1);
}

mkdirSync(outputRoot, { recursive: true });
writeFileSync(
  join(outputRoot, "edge-deployment.json"),
  `${JSON.stringify(
    {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      status: "PASS",
      functionName,
      expectedJwt: expectedJwt === "true",
      hostedJwtVerification: jwtStatus,
    },
    null,
    2,
  )}\n`,
);
console.log(
  `Edge Function ${functionName} is deployed; hosted JWT setting: ${jwtStatus}.`,
);
