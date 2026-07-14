# Accessibility audit

## Scope and confidence

Runtime inspection was anonymous and covered representative public pages at
mobile and desktop widths. Checks included landmarks, headings, accessible names,
form labels, image alt presence, link/button names, document overflow, and target
bounds. Source inspection covered shells, permission handling, mobile menus,
loading/error files, and shared primitives. No screen reader, switch device,
forced-colors, formal contrast measurement, authenticated workflow, or complete
keyboard traversal was performed.

## Findings

| Severity      | Route / surface                         | Evidence                                                                                                | Impact                                                                 | Recommended action                                                       |
| ------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| High          | Public and marketplace page shells      | Runtime accessibility tree exposed two `main` landmarks on `/`, `/pricing`, `/venues`, and `/suppliers` | Screen-reader landmark navigation is ambiguous                         | Make the shell or child page—not both—own `main`                         |
| High          | Mobile public and enterprise navigation | Source shows visual overlays without a dialog/focus-containment/Escape contract                         | Keyboard focus can leave an open menu or fail to return                | Compose menus with canonical dialog/drawer behavior                      |
| High          | Supplier profile image crop dialog      | Source has an unnamed icon-only close button, unlabeled zoom range, and pointer-only image panning      | Keyboard/screen-reader users cannot identify or fully operate cropping | Label controls and provide keyboard-accessible positioning/reset actions |
| Medium        | All routes                              | No skip-navigation link found                                                                           | Keyboard users must traverse repeated navigation                       | Add a root skip link and stable main target                              |
| Medium        | `/venues`                               | Runtime exposed two h1 elements and nested complementary filter regions                                 | Heading/region navigation is confusing                                 | Keep one page h1 and one labeled filter region                           |
| Medium        | `/forgot-password`                      | Runtime mobile tree exposed two h1 elements                                                             | Page outline has competing titles                                      | Demote the decorative/marketing heading                                  |
| Medium        | `/suppliers`                            | Runtime found five visible filter inputs/selects without programmatic label association                 | Purpose may be unclear to screen-reader users                          | Associate visible labels or add precise accessible names                 |
| Medium        | Authentication and footer controls      | Runtime bounds showed 32 × 32 px password toggles and many ~16 px-high links                            | Touch activation is error-prone                                        | Enlarge activation areas to about 44 × 44 px                             |
| Medium        | `/unauthorized` and default 404         | Runtime found no `main` landmark; default 404 lacks branded recovery                                    | Navigation/recovery is weaker                                          | Add semantic branded denial, not-found, and error screens                |
| Medium        | Customer desktop header                 | Help is a named button with no action or href in source                                                 | Keyboard and pointer users reach a dead control                        | Render a link to `/help`                                                 |
| Low           | Marketing footer                        | Source uses h6 section headings after higher-level page headings                                        | Heading levels skip                                                    | Use headings that follow document hierarchy or labeled nav regions       |
| Low           | Venue cards                             | Browser console emitted above-fold image LCP priority warnings                                          | Performance can delay meaningful content                               | Mark only actual above-fold hero/card images appropriately               |
| Informational | Private/auth routes                     | Root metadata sets `robots` index/follow and pages have inconsistent metadata                           | Search behavior is not intentionally documented                        | Define page/group `noindex` for auth and protected areas                 |
| Informational | Loading/error states                    | Only six route loading files and no route error/not-found files exist                                   | Announcements/recovery vary or fall back to framework UI               | Establish canonical accessible loading, empty, error, and 404 patterns   |

No Critical finding or confirmed protected-data exposure was found. The High
findings are interaction/structure risks, not evidence of an authorization bypass.

## Positive observations

- Sampled public pages had no document-level horizontal overflow.
- Sampled images did not expose missing alt attributes.
- Sampled links and buttons had accessible names.
- Login/register fields had visible/programmatic labels.
- Radix-backed canonical dialogs, menus, tabs, and selects provide a stronger
  accessibility base when feature code uses them correctly.
- Admin modules combine navigation filtering with server-side page/action guards.

## Required manual follow-up

1. Complete keyboard-only journeys for registration, venue filter, booking,
   payment return, cancellation, application approval, and mobile drawers.
2. Test NVDA/Firefox and VoiceOver/Safari announcements, headings, landmarks,
   dialog focus, supplier image cropping, validation, live statuses, tables,
   charts, and calendars.
3. Measure contrast for all interactive/status states and test forced colors.
4. Test 200%/400% zoom, 320 px reflow, text-only zoom, landscape, and software
   keyboard behavior.
5. Run authenticated role and ownership-negative scenarios with synthetic test
   accounts, especially supplier event-location snapshots and admin permissions.
