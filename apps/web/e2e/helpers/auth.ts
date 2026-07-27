import type { Page } from "@playwright/test";

export type Role =
  | "customer"
  | "venue"
  | "coordinator"
  | "supplier"
  | "superadmin"
  | "analystAdmin"
  | "financeAdmin"
  | "tenantAOwner"
  | "tenantBOwner"
  | "tenantACustomer"
  | "tenantBCustomer"
  | "nonMember";

const CREDENTIAL_ENV: Record<Role, { email: string; password: string }> = {
  customer: { email: "E2E_CUSTOMER_EMAIL", password: "E2E_CUSTOMER_PASSWORD" },
  venue: { email: "E2E_VENUE_EMAIL", password: "E2E_VENUE_PASSWORD" },
  coordinator: {
    email: "E2E_COORDINATOR_EMAIL",
    password: "E2E_COORDINATOR_PASSWORD",
  },
  supplier: { email: "E2E_SUPPLIER_EMAIL", password: "E2E_SUPPLIER_PASSWORD" },
  superadmin: {
    email: "E2E_SUPERADMIN_EMAIL",
    password: "E2E_SUPERADMIN_PASSWORD",
  },
  analystAdmin: {
    email: "E2E_ANALYST_ADMIN_EMAIL",
    password: "E2E_ANALYST_ADMIN_PASSWORD",
  },
  financeAdmin: {
    email: "E2E_FINANCE_ADMIN_EMAIL",
    password: "E2E_FINANCE_ADMIN_PASSWORD",
  },
  tenantAOwner: {
    email: "E2E_TENANT_A_OWNER_EMAIL",
    password: "E2E_TENANT_A_OWNER_PASSWORD",
  },
  tenantBOwner: {
    email: "E2E_TENANT_B_OWNER_EMAIL",
    password: "E2E_TENANT_B_OWNER_PASSWORD",
  },
  tenantACustomer: {
    email: "E2E_TENANT_A_CUSTOMER_EMAIL",
    password: "E2E_TENANT_A_CUSTOMER_PASSWORD",
  },
  tenantBCustomer: {
    email: "E2E_TENANT_B_CUSTOMER_EMAIL",
    password: "E2E_TENANT_B_CUSTOMER_PASSWORD",
  },
  nonMember: {
    email: "E2E_NON_MEMBER_EMAIL",
    password: "E2E_NON_MEMBER_PASSWORD",
  },
};

// Dedicated QA fixtures (see apps/web/.env.local, gitignored) -- never
// real customer accounts. Credentials are read from the environment only,
// never hardcoded here.
export function credentialsFor(role: Role): {
  email: string;
  password: string;
} {
  const keys = CREDENTIAL_ENV[role];
  const email = process.env[keys.email];
  const password = process.env[keys.password];
  if (!email || !password) {
    throw new Error(
      `Missing E2E credentials for role "${role}" -- set ${keys.email}/${keys.password} in apps/web/.env.local`,
    );
  }
  return { email, password };
}

export async function loginAs(page: Page, role: Role): Promise<void> {
  const { email, password } = credentialsFor(role);
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    await page.goto("/login");
    await page.fill("#login-email", email);
    await page.fill("#login-password", password);
    await page.click("#login-submit-btn");

    try {
      // A successful login always navigates away from /login; an unauthorized
      // route after that lands on /unauthorized rather than bouncing back to
      // /login, so waiting for either confirms the auth step itself completed.
      await page.waitForURL((url) => !url.pathname.startsWith("/login"), {
        timeout: 20_000,
      });
      return; // success
    } catch {
      if (attempt === maxAttempts)
        throw new Error(
          `loginAs("${role}") failed after ${maxAttempts} attempts (last email: ${email}). ` +
            `Page stayed on /login — likely Supabase auth rate-limit or credential mismatch.`,
        );
      // Jittered backoff before retry (absorbs free-tier rate-limit bursts)
      const delay = 2000 * attempt + Math.random() * 1000;
      await page.waitForTimeout(delay);
    }
  }
}

export const VIEWPORTS = {
  mobileSmall: { width: 375, height: 667 },
  mobileLarge: { width: 390, height: 844 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1440, height: 900 },
} as const;
