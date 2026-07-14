# Venora Test Strategy

## Goal and scope

Risk-based checks protect auth, RBAC, tenant isolation, booking integrity,
payments, Storage, notifications, analytics, AI controls, accessibility, and
public UX. Tests never target production or real customer/payment data.

## Layers

| Layer            | Runner                         | Purpose                                                  | Trust boundary             |
| ---------------- | ------------------------------ | -------------------------------------------------------- | -------------------------- |
| Unit             | Vitest                         | Validation, value objects, calculations, mapping         | In-process, deterministic  |
| Component        | Vitest + React server renderer | Rendered semantics and stable states                     | No browser interaction     |
| Integration      | Vitest with controlled mocks   | Actions, gateways, state transitions                     | Mocked DB/providers        |
| Database static  | Node validator                 | Migration order, functions, policies, grants, type drift | Repository SQL only        |
| Database runtime | Supabase + Playwright          | RLS, grants, triggers, cross-tenant isolation            | Disposable/hosted QA DB    |
| E2E              | Playwright                     | Role journeys and browser behavior                       | Running non-production app |
| Accessibility    | Playwright + axe               | Serious/critical automated findings, keyboard checks     | Browser and QA fixtures    |
| Performance      | Node fetch smoke               | Local response-time regression signal                    | Local server only          |

## Environments

| Environment       | Allowed                         | Prohibited                                           |
| ----------------- | ------------------------------- | ---------------------------------------------------- |
| Mocked local      | Unit/component/integration      | Claims about deployed policy/provider behavior       |
| Local Supabase    | Seeds, RLS, migrations, cleanup | Production credentials or data                       |
| Hosted QA/preview | Role E2E, provider test mode    | Real customer accounts or live charges               |
| Production        | Approved read-only smoke only   | Seeding, reset, destructive tests, synthetic charges |

## Priorities and exit rules

- P0: payment integrity, data loss, secrets, cross-account exposure. Release
  blocks until fixed and runtime-verified where applicable.
- P1: major workflow/security blocker. Fix before normal release.
- P2: material reliability, accessibility, or abuse risk. Track owner and plan.
- P3: low-impact quality issue.

PASS requires zero new regressions, zero unresolved P0 exposure, lint/type/build
success, deterministic suites green, and blocked runtime suites reported as
blocked rather than passed. Current evidence and limitations are in
[final test report](final-test-report.md).

## Status vocabulary

Inventory uses ACTIVE AND PASSING, ACTIVE BUT FAILING, ACTIVE BUT FLAKY,
SKIPPED WITH VALID REASON, SKIPPED WITHOUT VALID REASON, OBSOLETE, DUPLICATE,
MISSING, BLOCKED, MANUAL ONLY, and NOT APPLICABLE. Traceability uses FULLY
AUTOMATED, PARTIALLY AUTOMATED, MANUAL ONLY, IMPLEMENTED BUT UNTESTED, BLOCKED,
NOT IMPLEMENTED, and NOT APPLICABLE.
