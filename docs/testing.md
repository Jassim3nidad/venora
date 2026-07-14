# Testing and Quality Entry Point

Detailed strategy, inventory, traceability, execution commands, and latest
evidence live in [testing documentation](testing/test-strategy.md).

## Core documents

- [Test inventory](testing/test-inventory.md)
- [Coverage matrix](testing/coverage-matrix.md)
- [Execution guide](testing/execution-guide.md)
- [Database and RLS](testing/database-and-rls.md)
- [Security](testing/security-tests.md)
- [Final test report](testing/final-test-report.md)

## Safe default

```bash
pnpm validate:quality
```

This command covers local deterministic checks. Playwright, hosted RLS,
provider dashboards, notification delivery, and PayMongo test-mode smoke checks
remain separate because they need dedicated non-production environments. Never
use real customer data, production credentials, or destructive production DB
commands.
