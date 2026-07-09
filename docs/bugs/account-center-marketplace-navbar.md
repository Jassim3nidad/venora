# Bug Overview: Account Center Shows Marketplace Navbar

## Description

On the Account Center pages, the top navigation bar incorrectly renders the marketplace customer navigation (`Browse`, `Suppliers`, `Bookings`, `Favorites`, and `Dashboard`) instead of the public landing-page navbar (`Home`, `Venues`, `About`, `Host a Venue`). This creates inconsistent navigation between account management and the rest of the customer experience. The customer dashboard is also exposed in the marketplace navbar rather than being grouped with Account Center sidebar items such as Personal Information and Payments and Payouts.

## Expected Result

- Account Center should use the same landing-page navbar as the marketing site.
- Customer Dashboard should appear in the Account Center sidebar alongside Personal Information, Payments and Payouts, Transactions, Privacy and Sharing, and Become a Partner.
- Marketplace pages should keep the customer marketplace navbar without a separate Dashboard top-nav item.

## Actual Result

- Account Center renders the marketplace navbar with Browse, Suppliers, Bookings, Favorites, and Dashboard.
- Customer Dashboard is accessed from the top navigation instead of the Account Center sidebar.
- Account settings and dashboard activity feel split across two different navigation systems.

## Affected Users

Customers

## Priority

Medium

## Resolution

- Replaced `CustomerNavbar` with `MarketingNavbar` in the Account Center layout.
- Added **Customer Dashboard** to the Account Center sidebar at `/account/dashboard`.
- Redirected legacy `/dashboard/customer` to `/account/dashboard`.
- Removed **Dashboard** from the marketplace `CustomerNavbar`.
