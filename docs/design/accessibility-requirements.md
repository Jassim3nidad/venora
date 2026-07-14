# Accessibility requirements

These requirements are a product/engineering checklist, not a claim of WCAG
conformance. Target WCAG 2.2 AA and verify with automated tooling, keyboard,
screen reader, zoom, and contrast inspection.

## Page structure

- Every rendered page has one primary `main` landmark, one descriptive h1, and a
  logical heading sequence.
- A visible-on-focus skip link moves focus to the primary content.
- Header, navigation, complementary, search, and footer regions have distinct
  accessible names when repeated.
- Protected-route redirects preserve a clear destination and `/unauthorized`
  provides a primary landmark and recovery link.
- Custom not-found and error screens identify the problem without exposing
  technical or private details and provide recovery actions.

## Navigation and controls

- Every action uses the correct native element: link for navigation, button for
  mutation/toggle, submit button for form submission.
- All icon-only controls have accessible names and at least an approximately
  44 × 44 px activation area.
- Focus order follows visual order; `:focus-visible` is never removed.
- Menus, drawers, and dialogs expose name/description, contain focus while open,
  close with Escape, prevent background interaction, and restore trigger focus.
- Current navigation location is conveyed programmatically, not by color alone.

## Forms, status, and feedback

- Every field has a persistent programmatic label; placeholder text is optional
  guidance only.
- Required fields are conveyed in text and semantics before submission.
- Validation messages identify the field, explain correction, use
  `aria-describedby`, and are announced after submit.
- Pending submissions prevent duplicate mutation and announce progress.
- Success/error toasts are supplemental; durable inline feedback remains
  available where a user must act.
- Booking, payment, refund, verification, and review statuses pair text with
  shape/icon and explain the next allowed action.

## Complex widgets and content

- Data tables retain headers, captions or accessible names, sortable-state
  semantics, and keyboard-reachable row actions.
- Charts expose a concise text summary and data alternative; keyboard tooltips
  do not depend on pointer hover.
- Calendars use a documented keyboard model and announce selected/current dates,
  availability, and validation.
- Images have useful alt text when informative and empty alt text when decorative.
- Uploads name file restrictions, progress, success, failure, removal, and retry.
- Loading skeletons are hidden from assistive technology and accompanied by a
  polite text status; empty states name the empty collection and available action.

## Visual and device support

- Text and meaningful UI meet WCAG AA contrast in every state.
- Status does not depend on color alone.
- Content reflows at 320 CSS px and remains usable at 200% and 400% zoom where
  applicable.
- Text resizing, browser zoom, forced colors, and mobile orientation do not hide
  primary actions or errors.
- Motion respects `prefers-reduced-motion`; no essential meaning depends on
  animation.

## Privacy and authorization UX

- Hidden navigation is never the only permission control.
- Denied resource access does not disclose customer, venue, supplier, event,
  payment, or verification details.
- Supplier event-location snapshots render only for eligible relationships; a
  safe unavailable message replaces missing/protected data.
- Payment UI shows operational status and document access, never provider secrets
  or unneeded raw payloads.
