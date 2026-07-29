import { beforeEach, describe, expect, it, vi } from "vitest";

const { redirectMock, createClientMock } = vi.hoisted(() => ({
  redirectMock: vi.fn((path: string) => {
    throw new Error(`redirect:${path}`);
  }),
  createClientMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

vi.mock("@/src/lib/supabase/server", () => ({
  createClient: createClientMock,
}));

import CustomerMessagesPage from "../../../../app/(customer)/account/messages/page";

describe("CustomerMessagesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects unauthenticated users to the login route", async () => {
    createClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
    });

    await expect(CustomerMessagesPage()).rejects.toThrow("redirect:/login");
  });
});
