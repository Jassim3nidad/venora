# Marketing Landing Page Design Updates

This document describes the layout and styling changes applied to the marketplace landing page at `app/(marketing)/page.tsx` and its parent layout at `app/(marketing)/layout.tsx`.

## Summary

The landing page had four related layout issues: a cramped header, overlapping hero search fields, uneven use of horizontal space (including a large blank area on the right), and inconsistent page width handling. The updates focus on structural CSS changes rather than visual rebranding.

---

## 1. Header — Navigation List

### Before

- Header used `flex justify-between` with logo, navigation, and auth controls as three siblings in a single row.
- Navigation links used `space-x-8` but sat between the logo and auth buttons, not centered on the page.
- On wider viewports, links appeared bunched together near the left side instead of in the visual center of the header.

### After

- Header inner container uses a **three-column CSS grid**: `grid-template-columns: 1fr auto 1fr`.
- Logo aligns to the **left column**.
- Navigation sits in the **center column** with `justify-content: center` and `gap: 32px`.
- Auth controls align to the **right column** with `justify-content: flex-end`.
- Nav links include `whitespace-nowrap` to prevent label wrapping.

**Files changed:** `page.tsx` (header markup + `.site-header-inner`, `.site-header-nav` styles)

---

## 2. Header — Log In / Sign Up Buttons

### Before

- Auth buttons shared the same `justify-between` row as navigation, causing spacing conflicts with the nav cluster.
- Buttons could feel cramped against nav items on medium-width screens.

### After

- Log In and Sign Up are placed in a dedicated **`.site-header-actions`** container in the right grid column.
- Actions use `gap: 16px`, `justify-content: flex-end`, and `whitespace-nowrap`.
- Sign Up uses `inline-flex` for consistent button sizing.

**Files changed:** `page.tsx` (header markup + `.site-header-actions` styles)

---

## 3. Hero Section — Browse Venues Search Bar

### Before

- Search bar used `flex flex-col md:flex-row` with `flex-1` field wrappers.
- Flex children lacked `min-width: 0`, so long placeholder text could overflow and overlap adjacent fields.
- Labels and inputs had tight vertical spacing (`mb-1` on labels, `p-0` on inputs), which contributed to cramped/overlapping text.

### After

- Search bar uses a **CSS grid** (`.hero-search`):
  - Mobile: single column stack
  - Desktop: `minmax(0, 1fr) minmax(0, 1fr) auto` for Location, Event Type, and Search button
- Field wrappers use `.hero-search-field` with:
  - `min-width: 0` to allow proper shrinking inside grid/flex parents
  - Consistent padding (`12px 16px`)
  - Explicit input spacing (`margin-top: 4px`, `outline: none`)
- Inputs are associated with labels via `htmlFor` / `id` for accessibility.
- Search button uses `shrink-0` and `whitespace-nowrap` so it does not compress field content.

**Files changed:** `page.tsx` (hero search markup + `.hero-search`, `.hero-search-field` styles)

---

## 4. Page Width & Right-Side Blank Space

### Before

- Root page wrapper did not enforce `w-full`, `max-w-full`, or `overflow-x-hidden`.
- Sections mixed `max-w-container_max_width`, `px-margin_*`, and inline padding inconsistently.
- Hero visual card used `ml-auto max-w-sm`, leaving most of the right column empty on large screens.
- The rotated hero card (`rotate-2`) could extend past the viewport and contribute to horizontal overflow / perceived empty space.
- Marketing layout wrapped content in an extra nested `<main>` without overflow control.

### After

- **Page root** (`page.tsx`): added `w-full max-w-full overflow-x-hidden`.
- **Marketing layout** (`layout.tsx`): added `w-full max-w-full overflow-x-hidden` and removed redundant nested `<main>` wrapper.
- Introduced a shared **`.page-container`** utility:
  - `width: 100%`
  - `max-width: 1280px`
  - Centered with auto margins
  - Responsive horizontal padding (16px mobile, 32px desktop)
- Full-bleed sections (trust strip, featured venues, footer) use `w-full` backgrounds with inner `.page-container` for content alignment.
- Hero visual column uses `flex items-center justify-center`, `overflow-hidden`, and a wider `max-w-md` card centered in the column instead of pushed to the far right.
- Removed redundant `pt-20` offset on `<main>` (sticky header already occupies space in document flow).

**Files changed:** `page.tsx`, `layout.tsx`

---

## CSS Additions Reference

| Class | Purpose |
|-------|---------|
| `.page-container` | Shared max-width content wrapper with responsive padding |
| `.site-header-inner` | 3-column grid for balanced header layout |
| `.site-header-nav` | Centered navigation cluster (visible ≥768px) |
| `.site-header-actions` | Right-aligned auth buttons (visible ≥768px) |
| `.hero-search` | Responsive grid for search fields + button |
| `.hero-search-field` | Field cell with overflow-safe input sizing |

---

## Files Modified

1. `apps/web/app/(marketing)/page.tsx` — Header, hero, section containers, search bar, layout CSS
2. `apps/web/app/(marketing)/layout.tsx` — Full-width overflow-safe shell

---

## Verification Checklist

- [ ] Header nav links are visually centered on desktop (≥768px).
- [ ] Log In and Sign Up sit cleanly on the right with even spacing.
- [ ] Hero search labels and placeholders do not overlap at common breakpoints (375px, 768px, 1024px, 1280px+).
- [ ] No horizontal scrollbar or large unexplained blank area on the right.
- [ ] Trust strip, featured venues, and footer align with hero content edges.
