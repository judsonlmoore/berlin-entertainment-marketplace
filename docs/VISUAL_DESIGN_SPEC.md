# Salon Visual Design Specification

Status: approved visual-direction source of truth (evolved 2026-08-03)
Companions: [DESIGN.md](../DESIGN.md), [Product specification](./PRODUCT_SPEC.md), [Technical specification](./TECHNICAL_SPEC.md), [Cursor handoff](./CURSOR_HANDOFF.md)

Token, type, form, and aesthetic authority for new work: **[DESIGN.md](../DESIGN.md)**. This document keeps route contracts, shell behavior, responsive rules, and implementation order. When this file and `DESIGN.md` disagree on tokens or typography, **prefer `DESIGN.md`**.

## 1. Reference set and authority

Historical screenshots remain useful for **layout composition and information hierarchy**, not for literal cream/ivory color matching or Instrument Serif on every ops heading:

| Screen | Reference |
|---|---|
| Public landing | [landing.png](./design-reference/landing.png) |
| Authenticated dashboard | [dashboard.png](./design-reference/dashboard.png) |
| Private discovery | [discovery.png](./design-reference/discovery.png) |
| Open opportunities | [opportunities.png](./design-reference/opportunities.png) |
| Booking pipeline | [bookings.png](./design-reference/bookings.png) |
| Native calendar | [calendar.png](./design-reference/calendar.png) |
| Dual-role profile | [dual-role-profile.png](./design-reference/dual-role-profile.png) |

Approved evolved preview (contrast, forms, tokens):  
`~/.gstack/projects/berlin-entertainment-marketplace/designs/design-system-20260803/salon-evolved-preview.html`

Use references to match module order, density, and interaction patterns. Do not copy demo names, dates, counts, or text. Real routes render authorized server data and localized copy.

When a screenshot conflicts with accessibility, `DESIGN.md`, product/security rules, or real data constraints, follow the higher-order requirement. Document material visual departures.

## 2. Design intent

**Memorable thing:** the private, protected way Berlin venues and acts book each other.

Salon should feel like a crisp Berlin cultural-ops product — calm, trustworthy, current — not a dated warm-ivory editorial brochure and not generic booking SaaS. Confidence comes from readable type, AA contrast, disciplined structure, and first-class forms.

Public surfaces may stay more expressive (Fraunces hero). Authenticated surfaces are operational: IBM Plex Sans titles, clear metrics, scannable lists, sectioned profile forms.

### Required character

- Crisp cultural-ops tone (Airbnb-shaped trust clarity, Berlin taste)
- Cool stone canvas `#F7F6F3` with true white `#FFFFFF` surfaces
- Near-black green rail `#121A17` and deeper primary `#1F5A45`
- Muted terracotta `#B84A32` as a rare accent only
- Soft blue / ochre / rose as flat monogram identity fields
- Fraunces for brand/hero; IBM Plex Sans for all app UI (labels ≥ weight 500)
- Comfortable whitespace and clear rhythm on operational screens
- Monograms and avatar initials instead of generic stock imagery
- Rectangular geometry with functional radii (`6–8px` on controls/cards)

### Explicitly prohibited

No gradients, glassmorphism, neon colors, oversized rounded cards, pill-everything styling, generic SaaS dashboard chrome, generic stock photography, decorative blobs, arbitrary icon packs, mismatched icon styles, gradient buttons, drop-shadow-heavy cards, purple-first AI-template aesthetics, or warm-cream + giant serif everywhere as the authenticated default.

## 3. Foundational tokens

Authoritative values live in [DESIGN.md](../DESIGN.md). Summary:

### Color

| Token | Value | Use |
|---|---:|---|
| `canvas` | `#F7F6F3` | Cool stone page ground |
| `surface` | `#FFFFFF` | Cards, forms, top bar |
| `ink` | `#141816` | Body text |
| `primary` | `#1F5A45` | Primary buttons, focus, confirmed/approved |
| `primary-foreground` | `#FFFFFF` | On primary |
| `terracotta` / accent | `#B84A32` | Eyebrows, rare emphasis |
| `blue-soft` | `#8EA9B7` | Identity / requested family |
| `ochre-soft` | `#B99A59` | Identity / warning family |
| `rose-soft` | `#B9786C` | Identity / avatar family |
| `text-muted` | `#5C635F` | Secondary copy (AA at UI sizes) |
| `rule` | `#E4E1DA` | Hairlines |
| `rail` | `#121A17` | Left navigation |
| `success-soft` | `#E3EEE5` | Approved/confirmed background |
| `warning-soft` | `#F3E8CF` | Hold/signature background |
| `info-soft` | `#DEE7ED` | Requested background |
| `danger` | `#A11F2C` | Errors |

Never rely on color alone. Text on soft semantic surfaces uses `ink`. Meet WCAG 2.2 AA.

### Typography

- **Display:** Fraunces — Salon wordmark and public hero only
- **UI/Body:** IBM Plex Sans 400/500/600 — nav, labels, inputs, tables, buttons, authenticated headings
- **Numbers:** tabular numerals for metrics, fees, dates, counts, calendar cells
- **Scale:** see `DESIGN.md` (authenticated H1 is IBM Plex Sans, not oversized serif)
- **Eyebrows:** accent uppercase, weight 600, `0.12–0.16em` tracking; never long sentences

### Forms

Forms are a first-class system (see `DESIGN.md`): label above, 44px min height, 8px radius, visible focus ring, section titles, error/`aria-live` patterns.

### Spacing, edges, and elevation

- Base unit `4px`; steps `8, 12, 16, 24, 32, 48, 64, 96`
- Authenticated max content width ~`1480px`
- Desktop collections: three columns, `20–28px` gutters
- Cards: white surface, thin rule, `6–8px` radius; borders over shadows
- Primary action: solid primary, white label, min `44px` height
- Motion: `150–220ms` functional only; respect reduced-motion

## 4. Authenticated application shell

At desktop widths (`>= 1024px`), use a fixed or sticky `280px` near-black green left rail. It contains the Salon mark (Fraunces), primary navigation, optional badge, approval state, and person summary. Active item: lighter dark field + high-contrast text.

Content area: slim white top bar (~64–72px), breadcrumb left, locale/account utilities right. Thin bottom rule. Do not densify into a second global nav.

Tablet: collapse rail to icon rail or drawer with labels on demand. Below `768px`: compact top header + drawer navigation (same items as the rail); safe-area insets. Never squeeze the desktop rail beside a narrow column. Do not add a sticky bottom nav when the drawer/rail menu already covers navigation.

## 5. Core component contracts

- **Monogram identity panel:** large initials (display font OK here) on flat rose/blue/ochre/forest; accessible name text nearby
- **Avatar:** circular initials, 32–64px, deterministic color, sufficient contrast
- **Status label:** compact text on quiet semantic background; ink text; no oversized pills
- **Date tile:** bordered near-square; strong day numeral; accent uppercase month
- **Filter/control:** white field, thin border, 44px min, clear label
- **Progress track:** text-labeled steps; never color/checkmarks alone
- **Data card/list row:** one primary object, secondary meta, one dominant action; dividers over nested shadows
- **Notices:** full-width quiet semantic surface + concise message + optional action
- **Form section:** titled group with rule separator and consistent field grid

## 6. Page contracts

Layout hierarchy and modules below still apply. Visual treatment follows `DESIGN.md` (stone/white, IBM Plex Sans titles, form system). Screenshots guide composition only.

### 6.1 Public landing

Reference: [landing.png](./design-reference/landing.png)

**Purpose:** explain the private marketplace, establish trust, route to apply or sign in.

**Hierarchy:** slim public header → hero (Fraunces proposition) → credibility/member proof → venue strip → value propositions → footer.

**Required modules:** Salon wordmark; locale; sign-in/apply; accent eyebrow; large proposition; supporting copy; primary CTAs; approved-member count only from real data; monogram/stage composition; status callouts; venue proof; principles; footer legal/nav.

**Data/actions:** locale, sign in, apply, privacy/terms. Omit unverifiable counts.

**Responsive:** stack copy above visual; keep CTA ≥44px; don’t obscure core copy with decoration.

### 6.2 Dashboard / overview

Reference: [dashboard.png](./design-reference/dashboard.png)

**Purpose:** “what needs my attention?” plus next useful actions for role-aware members.

**Hierarchy:** date eyebrow + IBM Plex Sans greeting + primary action → metrics → recent applications + next booking → role-aware explore (acts for venues, venues for entertainers).

**Required modules:** greeting; post-opportunity when permitted; metric strip; application rows; next-booking + lifecycle; explore cards with monograms (no fake match % unless real).

**Data/actions:** authorized metrics only; review/open booking; explore discovery; start direct request when permitted. Role-segregated discovery rules apply.

**Responsive:** metrics 4 → 2 → 1; stack panels; keep attention items before recommendations.

### 6.3 Private discovery

Reference: [discovery.png](./design-reference/discovery.png)

**Purpose:** help the **authorized role** find fitting counterparts (venues discover acts; entertainers discover venues/opportunities).

**Hierarchy:** privacy eyebrow → page title → filters → results grid.

**Required modules:** filters/search; result count; monogram cards; metadata; request/open actions; pagination; loading/empty/denied states.

**Data/actions:** URL filters; authorized projections only; never locked contacts in HTML.

**Responsive:** filter sheet; grid 3 → 2 → 1.

### 6.4 Opportunities

Reference: [opportunities.png](./design-reference/opportunities.png)

**Purpose:** entertainers assess open needs; venue operators manage their own opportunities.

**Hierarchy:** eyebrow → title + role-aware post → opportunity rows.

**Required modules:** date tile; status; title; venue/district; tags; deadline; view/apply; empty/closed states.

**Responsive:** stacked cards; full-width actions on small screens.

### 6.5 Bookings

Reference: [bookings.png](./design-reference/bookings.png)

**Purpose:** one booking pipeline; next required action obvious.

**Hierarchy:** title → Active/Confirmed/Past tabs → rows → deposit notice.

**Required modules:** origin/ID; parties; datetime/location; status; labeled lifecycle; German-controlling agreement notice + English convenience label; deposit separate from confirmation.

**Responsive:** vertical lifecycle; sticky clarity of current step.

### 6.6 Calendar

Reference: [calendar.png](./design-reference/calendar.png)

**Purpose:** native availability, holds, requests, confirmed blocks.

**Hierarchy:** eyebrow → month/owner + add → legend → grid/agenda.

**Required modules:** navigation; resource selector; five-state legend with text; entries; conflict/loading states.

**Implementation note:** the calendar workspace is implemented with FullCalendar React v7 (month/day/week/list views + selection, drag, and resize). Scheduler/resource views are not used in the MVP.

**Responsive:** agenda/week below tablet; never an unreadable squeezed month.

### 6.7 Profile builder & onboarding setup

Reference preview: `~/.gstack/projects/judsonlmoore-berlin-entertainment-marketplace/designs/profile-builder-20260805/preview.html` (also see historical [dual-role-profile.png](./design-reference/dual-role-profile.png) for older dual-role chrome — XOR accounts supersede dual-role).

**Purpose:** Build and maintain the marketplace act/venue identity. Onboarding is the first pass; Profile is the ongoing single-page editor.

**Hierarchy (profile):** eyebrow → display name title → soft publication status tag + autosave status → optional one-line outcome copy → display-name strip → sectioned form (Media → Basics → Details → Links). No private-contact section; no Submit for review; no live preview rail.

**Hierarchy (onboarding):** step progress → eyebrow → title → short body → panel fields → Next / Submit path → done screen with Continue (manual).

**Required modules:**
- Autosave with `Saving…` / `Saved.` (`aria-live="polite"`)
- Soft tags: Under review (warning soft) / Verified (success soft)
- Dashed empty media slots; filled tiles with remove + loading; YouTube thumb → embed modal
- Rich-text description with counter (shared with onboarding)
- Full-URL social/website fields with placeholders + platform host validation; Valid/Invalid inside the field
- Account settings (locale, deletion) on `/account`, not profile

**Responsive:** single column on mobile; media grid 2-up; keep 44px targets and label/error association.

## 7. Responsive and state requirements

- Desktop: `280px` rail + consistent max-width canvas
- Tablet: two-column collections; collapsed nav
- Mobile: single column; drawer nav; drawer filters; agenda calendar
- Recompose modules; never scale desktop mockups wholesale
- Skeleton/empty/error/forbidden/suspended states are intentional
- Visible focus; ≥44×44px targets; 200% zoom without clipping

## 8. Must-match checklist

- [ ] Cool stone canvas + white surfaces (not warm ivory default, not cold gray SaaS)
- [ ] Near-black green rail and solid deeper-green primary actions
- [ ] Terracotta used sparingly for eyebrows/emphasis only
- [ ] Muted text `#5C635F` (or darker) passes AA at rendered size
- [ ] IBM Plex Sans for authenticated UI; Fraunces limited to brand/hero/monogram accents
- [ ] Form controls: 44px, 8px radius, visible focus, section groups
- [ ] `280px` desktop rail, slim top bar, consistent content width
- [ ] Thin rules; small radii; no heavy shadows
- [ ] Monograms replace stock imagery
- [ ] Loading/empty/error/forbidden/suspended states designed
- [ ] Responsive recomposition
- [ ] WCAG 2.2 AA, keyboard, semantics, 44px targets
- [ ] No gradients, glass, neon, purple templates, pill-everything
- [ ] No hard-coded screenshot demo content; real data + locales

## 9. Cursor implementation order

Implement visual evolution against `DESIGN.md` tokens one shared layer / route at a time:

1. Tokens, font loading (Fraunces + IBM Plex Sans), form primitives, authenticated shell
2. Public landing (Fraunces hero retained)
3. Dashboard
4. Discovery (role-segregated)
5. Opportunities
6. Bookings
7. Calendar
8. Dual-role profile + form sections
9. EN/DE, desktop/tablet/mobile, keyboard, loading/empty/error, role gates

For each change: note intentional differences from historical screenshots, accessibility fixes, and remaining gaps.
