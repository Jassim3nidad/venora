# Accessibility Test Coverage

## Automation

```bash
pnpm test:component
pnpm test:a11y
```

Playwright lists 36 accessibility cases across administrator routes, four
viewports, permission denial, keyboard focus, tier dialog, form labels, tables,
and pagination. Component tests verify DataTable empty state and semantic table
output. These browser cases need a running QA app and administrator fixtures;
listing is not execution.

## Coverage state

| Target                      | Automated evidence                | Remaining work                           |
| --------------------------- | --------------------------------- | ---------------------------------------- |
| Admin routes                | axe serious/critical checks       | Run in QA; inspect lower-impact findings |
| Responsive admin            | Four viewport list                | Real device/browser and zoom             |
| Sidebar keyboard            | Tab/focus assertion               | Screen-reader navigation                 |
| Tier dialog                 | Trap/return test                  | Run when administrator rows exist        |
| Forms/tables                | Labels, headers, pagination names | Error association/live regions           |
| Public/auth/booking/payment | MISSING                           | Add representative axe/keyboard cases    |
| Mobile drawers              | MISSING                           | Semantics, Escape, trap, return          |
| Supplier crop dialog        | MISSING                           | Accessible name, keyboard, focus         |

## Manual-only checks

NVDA/VoiceOver, 200%/400% zoom, color contrast review, reduced motion, touch
targets, Windows high contrast, real mobile browsers, reading order, and
responsive visual inspection remain MANUAL ONLY. No compliance claim is made.
