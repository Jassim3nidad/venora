# Performance Test Plan

## Local smoke

Start a built local server, then run:

```bash
pnpm test:performance
```

`scripts/run-local-performance-smoke.mjs` refuses non-local hosts, warms each
route, takes five samples by default, and fails when p95 exceeds 5,000 ms. It
checks `/`, `/venues`, and `/suppliers`. Override sample count/threshold only for
a documented environment comparison.

## Thresholds

| Scenario               | Local signal  | Threshold                            | Limitation                                 |
| ---------------------- | ------------- | ------------------------------------ | ------------------------------------------ |
| Public landing         | HTTP response | p95 <= 5 s                           | Not browser paint/Core Web Vitals          |
| Venue marketplace      | HTTP response | p95 <= 5 s                           | QA DB/data volume differs                  |
| Supplier marketplace   | HTTP response | p95 <= 5 s                           | Sample fallback may mask DB cost           |
| Booking/approval       | MISSING       | Define after fixture harness         | Authenticated mutation/data cleanup needed |
| Analytics/export/admin | MISSING       | Define with large deterministic seed | Query count/memory not instrumented        |
| AI endpoints           | MISSING       | Mocked provider timeout budget       | Paid provider calls prohibited by default  |

Local measurements are regression signals, never production guarantees. N+1,
bundle/image impact, memory, slow-provider timeout, pagination under load, and
large CSV/PDF data need dedicated profiling.
