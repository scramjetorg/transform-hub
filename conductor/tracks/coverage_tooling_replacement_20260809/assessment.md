# Coverage Assessment

Command: `npm run test:packages -- --coverage`

This evidence-only c8 assessment covered 26 package reports and 383 remapped
`src/**/*.ts` files. It is a new baseline, not a nyc comparison or release gate.

| Metric | Hit | Total | Percent |
| --- | ---: | ---: | ---: |
| Lines | 4,574 | 45,248 | 10.11% |
| Functions | 244 | 796 | 30.65% |
| Branches | 732 | 1,335 | 54.83% |

| Package | Files | Lines | Functions | Branches | Zero-hit files |
| --- | ---: | ---: | ---: | ---: | ---: |
| adapter-docker | 7 | 0.00% | 0.00% | 0.00% | 7 |
| adapter-kubernetes | 7 | 0.00% | 0.00% | 0.00% | 7 |
| adapter-process | 3 | 0.00% | 0.00% | 0.00% | 3 |
| adapters | 6 | 0.00% | 0.00% | 0.00% | 6 |
| adapters-common | 5 | 0.00% | 0.00% | 0.00% | 5 |
| api-client | 6 | 0.00% | 0.00% | 0.00% | 6 |
| api-router | 16 | 0.00% | 0.00% | 0.00% | 16 |
| api-server | 20 | 48.40% | 55.95% | 90.28% | 2 |
| cli | 56 | 56.29% | 44.52% | 71.27% | 8 |
| client-utils | 5 | 0.00% | 0.00% | 0.00% | 5 |
| config | 15 | 0.00% | 0.00% | 0.00% | 15 |
| host | 46 | 0.00% | 0.00% | 0.00% | 46 |
| load-check | 5 | 0.00% | 0.00% | 0.00% | 5 |
| logger | 3 | 73.70% | 40.00% | 62.86% | 0 |
| manager | 27 | 8.20% | 50.00% | 47.98% | 25 |
| middleware-api-client | 3 | 0.00% | 0.00% | 0.00% | 3 |
| model | 14 | 48.42% | 19.51% | 52.00% | 1 |
| multi-manager | 18 | 0.00% | 0.00% | 0.00% | 18 |
| multi-manager-api-client | 2 | 0.00% | 0.00% | 0.00% | 2 |
| rest-api2 | 5 | 0.00% | 0.00% | 0.00% | 5 |
| runner | 21 | 0.00% | 0.00% | 0.00% | 21 |
| runner-node | 15 | 0.00% | 0.00% | 0.00% | 15 |
| sequence-test | 9 | 0.00% | 0.00% | 0.00% | 9 |
| sth | 6 | 25.84% | 66.67% | 67.35% | 5 |
| telemetry | 3 | 0.00% | 0.00% | 0.00% | 3 |
| utility | 60 | 0.00% | 0.00% | 0.00% | 60 |

298 of 383 assessed files had zero line hits. The source scope excluded staged
`.ava-*`, build, dependency, coverage-output, and spec paths; the run found no
scope anomalies and left no staged directories. The user accepted this baseline
on 2026-08-11 without coverage-gap remediation.
