import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const readSource = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

describe("mobile drawer accessibility contract", () => {
  it.each([
    "src/components/layout/MarketingNavbar.tsx",
    "src/components/dashboard/enterprise/EnterpriseShell.tsx",
  ])("uses a named modal dialog and shared focus trap in %s", (path) => {
    const source = readSource(path);

    expect(source).toContain("useFocusTrap");
    expect(source).toContain('role="dialog"');
    expect(source).toContain('aria-modal="true"');
    expect(source).toMatch(/aria-label="(?:Mobile|Dashboard) navigation"/);
  });

  it("keeps outside content inert and returns focus only after close", () => {
    const source = readSource("src/hooks/use-focus-trap.ts");

    expect(source).toContain("sibling.inert = true");
    expect(source).toContain("restoreOutsideContent()");
    expect(source).toContain("wasOpenRef.current");
    expect(source).toContain('e.key === "Escape"');
  });
});
