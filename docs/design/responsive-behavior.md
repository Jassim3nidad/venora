# Responsive behavior audit

## Runtime coverage

Anonymous browser checks used the following representative widths. Protected
screens were not opened because no test credentials were used.

| Viewport group | Size        | Routes checked                                                                                                      |
| -------------- | ----------- | ------------------------------------------------------------------------------------------------------------------- |
| Small mobile   | 360 × 800   | `/`, `/venues`, `/suppliers`, `/login`, `/register`, `/forgot-password`, `/pricing`, `/unauthorized`, unknown route |
| Large mobile   | 430 × 900   | `/`                                                                                                                 |
| Tablet         | 768 × 1024  | `/`                                                                                                                 |
| Small laptop   | 1024 × 800  | `/`                                                                                                                 |
| Desktop        | 1440 × 900  | `/`, `/venues`, `/suppliers`, `/login`                                                                              |
| Large desktop  | 1920 × 1080 | `/`                                                                                                                 |

At these sampled sizes, document scroll width did not exceed viewport width.
That does not verify every dialog, data table, calendar, chart, authenticated
shell, browser zoom level, or long localized string.

## Confirmed findings

| Route / surface                      | Viewport        | Severity                | Reproduction                                                  | Current behavior                                                             | Expected / recommended correction                                          |
| ------------------------------------ | --------------- | ----------------------- | ------------------------------------------------------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Public/customer footers and controls | 360 px          | Medium                  | Inspect visible link/control bounds                           | Many links are about 16 px high; password reveal buttons are 32 × 32 px      | Provide an approximately 44 × 44 px activation area without enlarging text |
| `/venues`                            | 360 and 1440 px | High                    | Load all 11 returned venues                                   | “Load more venues” remains visible and reports `-1 more venues available`    | Derive visibility from real count and hide/disable load-more at zero       |
| `/venues`                            | 1440 px         | Medium                  | Inspect headings/regions                                      | Filter and content each expose h1; nested complementary regions appear       | Use one page h1 and one labeled filter region                              |
| Marketing and marketplace pages      | All sampled     | Medium                  | Inspect landmarks on `/`, `/pricing`, `/venues`, `/suppliers` | Two `main` landmarks because shells and pages both declare main              | Shell or page should own the single primary landmark                       |
| Mobile navigation overlays           | Under `md`/`lg` | Medium, source-observed | Open public or enterprise menu and inspect source behavior    | Overlay/drawer opens, but no focus containment or Escape contract is evident | Reuse the canonical dialog/drawer behavior and restore trigger focus       |

## Source-based behavior by component

| Surface              | Mobile                                   | Tablet                | Desktop                             | Risk / QA need                                                                                                    |
| -------------------- | ---------------------------------------- | --------------------- | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Marketing navigation | Collapsed overlay                        | Breakpoint transition | Inline links                        | Focus, Escape, and background interaction need manual keyboard QA                                                 |
| Enterprise shell     | Drawer below `lg`                        | Drawer                | Sticky 272 px sidebar               | Authenticated visual and focus QA not performed                                                                   |
| Marketplace          | Stacked filters/cards                    | Progressive columns   | Sidebar/filter + grid               | Very large municipality select and load-more logic need correction                                                |
| Forms                | Mostly one column                        | Wider centered cards  | Split/auth layouts where applicable | Long errors, zoom, autofill, and software keyboard not tested                                                     |
| Data tables          | Card/table-specific handling             | Mixed                 | Full table                          | Small-screen scrolling, sticky headers, and row action discovery are unverified                                   |
| Dialogs              | Consumer-defined max width               | Centered              | Centered                            | Long content, software keyboard, and focus return need authenticated tests; supplier crop panning is pointer-only |
| Charts               | Responsive wrappers in feature code      | Grid                  | Multi-column dashboards             | Labels, tooltips, descriptions, and overflow unverified with real data                                            |
| Calendars            | Compact/local responsive CSS             | Grid                  | Full month/task layout              | Touch, keyboard, and long event labels unverified                                                                 |
| Media                | Aspect-ratio containers and `next/image` | Responsive            | Larger galleries                    | Above-fold venue images emitted LCP priority warnings                                                             |
| Empty/error states   | Generally stacked                        | Centered              | Centered                            | No canonical route error or 404 layout                                                                            |

## Responsive acceptance checklist

- Check 320, 360, 430, 768, 1024, 1440, and 1920 px plus 200% browser zoom.
- Keep one page scroll container; avoid trapping keyboard focus in nested scroll
  regions.
- Preserve visible labels and errors when cards stack.
- Give compact controls a full touch activation area.
- Provide table/card alternatives or labeled scrolling at small widths.
- Keep dialogs within viewport with a reachable title, close control, and primary
  action when the software keyboard is open.
- Keep chart legends/tooltips inside the chart container and expose a text
  summary.
- Validate calendars with keyboard, touch, long labels, no events, and many events.
- Recheck real authenticated content, not only loading/empty fixtures.
