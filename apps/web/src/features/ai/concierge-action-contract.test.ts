import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const repositoryRoot = resolve(import.meta.dirname, "../../../../..");
const migration = readFileSync(
  resolve(
    repositoryRoot,
    "supabase/migrations/20260728150000_ai_concierge_actions.sql",
  ),
  "utf8",
);
const edgeFunction = readFileSync(
  resolve(repositoryRoot, "supabase/functions/ai-assistant/index.ts"),
  "utf8",
);
const client = readFileSync(
  resolve(
    repositoryRoot,
    "apps/web/src/features/ai/api/ai-assistant.client.ts",
  ),
  "utf8",
);
const widget = readFileSync(
  resolve(repositoryRoot, "apps/web/src/features/ai/ui/AssistantWidget.tsx"),
  "utf8",
);
const customerLayout = readFileSync(
  resolve(repositoryRoot, "apps/web/app/(customer)/layout.tsx"),
  "utf8",
);

describe("AI Concierge action contract", () => {
  it("keeps action requests service-only with lifecycle evidence", () => {
    expect(migration).toContain("ENABLE ROW LEVEL SECURITY");
    expect(migration).toContain(
      "REVOKE ALL ON TABLE public.ai_action_requests FROM PUBLIC, anon, authenticated",
    );
    expect(migration).toContain("'proposed'");
    expect(migration).toContain("'confirmed'");
    expect(migration).toContain("'executed'");
    expect(migration).toContain("confirmed_at");
    expect(migration).toContain("executed_at");
  });

  it("requires customer role, ownership, confirmation, and the existing RPC", () => {
    expect(edgeFunction).toContain('eq("role", "customer")');
    expect(edgeFunction).toContain('.eq("customer_id", userId)');
    expect(edgeFunction).toContain("rawBody?.confirmed === true");
    expect(edgeFunction).toContain('"cancel_booking_request"');
    expect(edgeFunction).toContain("Authorization: authorization");
    expect(edgeFunction).toContain("samePrincipal");
  });

  it("audits proposal, rejection, execution, and failure", () => {
    for (const action of [
      "ai.concierge.action_proposed",
      "ai.concierge.action_confirmed",
      "ai.concierge.action_rejected",
      "ai.concierge.action_executed",
      "ai.concierge.action_failed",
    ]) {
      expect(edgeFunction).toContain(action);
    }
  });

  it("renders explicit confirmation through the streaming client", () => {
    expect(client).toContain('"actionProposal"');
    expect(client).toContain("executeAssistantAction");
    expect(widget).toContain("Confirm cancellation");
    expect(widget).toContain("Keep booking");
  });

  it("removes the duplicate simulated concierge", () => {
    expect(customerLayout).not.toContain("AIConciergeWidget");
    expect(
      existsSync(
        resolve(
          repositoryRoot,
          "apps/web/src/features/ai/ui/AIConciergeWidget.tsx",
        ),
      ),
    ).toBe(false);
  });
});
