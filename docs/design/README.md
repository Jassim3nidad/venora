# Venora UI/UX documentation

This directory records the interface implemented at commit `afceb1d`. It is an
inventory and audit, not a redesign. Findings marked **runtime-verified** were
checked anonymously in a browser on 2026-07-14. Protected screens were inspected
from source only because no test credentials or private data were used.

## Documents

- [Screen inventory](screen-inventory.md) — screen families, layouts, states, and verification limits.
- [Route-to-screen matrix](route-screen-matrix.md) — all 98 App Router page files.
- [Navigation map](navigation-map.md) — public, account, and role navigation.
- [Role experience matrix](role-experience-matrix.md) — role access, completeness, and gaps.
- [User flows](user-flows.md) — 32 required journeys with Mermaid flowcharts.
- [Overall system user flow](overall-system-user-flow.md) — end-to-end system map with real-life scenarios.
- [Marketplace relationships & overall user flow](marketplace-relationships-user-flow.md) — customer / venue / supplier / coordinator relationships and whether clients hire ECs.
- [Wireframes](wireframes.md) — low-fidelity layouts for 25 screen families.
- [Responsive behavior](responsive-behavior.md) — tested viewports and source-based risks.
- [Accessibility requirements](accessibility-requirements.md) — implementation and QA criteria.
- [Accessibility audit](accessibility-audit.md) — confirmed and source-observed findings.
- [Component inventory](component-inventory.md) — shared and feature-level UI.
- [UI gap analysis](ui-gap-analysis.md) — prioritized missing, partial, duplicate, and dead-end UX.
- [UX remediation backlog](ux-remediation-backlog.md) — sequenced, testable work.

Related contracts: [API overview](../api/README.md),
[authentication](../api/authentication.md), [Server Actions](../api/server-actions.md),
[webhooks](../api/webhooks.md), and [storage](../api/storage.md).

## Status language

| Status                               | Meaning                                                                              |
| ------------------------------------ | ------------------------------------------------------------------------------------ |
| IMPLEMENTED AND VERIFIED             | Route exists and its public behavior was checked in a real browser.                  |
| IMPLEMENTED BUT NOT RUNTIME-VERIFIED | Source supports the documented behavior; runtime was not authenticated or exercised. |
| PARTIALLY IMPLEMENTED                | Core UI exists but a confirmed defect or missing state interrupts completeness.      |
| PLACEHOLDER                          | Route intentionally presents future or unavailable functionality.                    |
| MISSING                              | Required experience has no dedicated implemented screen.                             |
| DUPLICATE                            | Route re-exports another screen.                                                     |
| DEPRECATED                           | Compatibility route redirects to a canonical route.                                  |
| INACCESSIBLE                         | Implemented route cannot be reached by its intended actor.                           |
| BLOCKED                              | Verification could not proceed because an external dependency was unavailable.       |
| NOT APPLICABLE                       | The criterion does not apply to the screen.                                          |

## Coverage summary

The repository contains 98 `page.tsx`, 11 `layout.tsx`, 6 `loading.tsx`, and no
route-level `error.tsx` or `not-found.tsx` files. Page status totals are:

| Status                               | Count |
| ------------------------------------ | ----: |
| IMPLEMENTED AND VERIFIED             |     6 |
| IMPLEMENTED BUT NOT RUNTIME-VERIFIED |    82 |
| PARTIALLY IMPLEMENTED                |     2 |
| PLACEHOLDER                          |     2 |
| DUPLICATE                            |     3 |
| DEPRECATED                           |     3 |
| INACCESSIBLE / BLOCKED               |     0 |

Conceptual missing screens are tracked separately in the gap analysis; they do
not inflate the page-file count.
