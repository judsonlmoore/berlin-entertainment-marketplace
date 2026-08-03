# Salon Visual Design Specification

Status: approved visual-direction source of truth
Companions: [Product specification](./PRODUCT_SPEC.md), [Technical specification](./TECHNICAL_SPEC.md), [Cursor handoff](./CURSOR_HANDOFF.md)

## 1. Reference set and authority

These seven screenshots are the approved aesthetic and interaction references:

| Screen | Reference |
|---|---|
| Public landing | [landing.png](./design-reference/landing.png) |
| Authenticated dashboard | [dashboard.png](./design-reference/dashboard.png) |
| Private discovery | [discovery.png](./design-reference/discovery.png) |
| Open opportunities | [opportunities.png](./design-reference/opportunities.png) |
| Booking pipeline | [bookings.png](./design-reference/bookings.png) |
| Native calendar | [calendar.png](./design-reference/calendar.png) |
| Dual-role profile | [dual-role-profile.png](./design-reference/dual-role-profile.png) |

Use the images to match tone, hierarchy, density, proportions, and interaction patterns. Do not copy their demo names, dates, counts, or text into production code. Real routes render authorized server data and localized copy.

When a screenshot conflicts with accessibility, responsive behavior, security, the product specification, or real data constraints, preserve the visual intent while following the higher-order requirement. Document any material visual departure.

## 2. Design intent

Salon should feel like a small Berlin cultural institution with excellent editorial taste, not a generic booking SaaS product. Refined, calm, private, credible. The interface creates confidence through typography, spacing, thin structure, and restrained color rather than effects.

The public surface is editorial and expressive. Authenticated surfaces become more functional but retain the same cultural voice. Users should understand within three seconds that the marketplace is curated, human, and serious about the details of live performance.

### Required character

- Editorial, refined Berlin cultural-marketplace tone
- Warm ivory page ground, never cold white as the dominant canvas
- Near-black forest-green navigation and primary ink
- Muted terracotta as the rare accent
- Soft blue and ochre as controlled identity/card fields
- High-contrast serif display headings paired with restrained sans-serif UI type
- Generous whitespace and clear rhythm, even in operational screens
- Monograms and avatar initials instead of generic stock imagery
- Crisp rectangular geometry with small radii only where function calls for it

### Explicitly prohibited

No gradients, glassmorphism, neon colors, oversized rounded cards, pill-everything styling, generic SaaS dashboard chrome, generic stock photography, decorative blobs, arbitrary icon packs, mismatched icon styles, gradient buttons, drop-shadow-heavy cards, or purple-first AI-template aesthetics.

The screenshot image fields may look softly tonal because of their source rendering. Reimplement them as flat or subtly textured color fields, not CSS gradients.

## 3. Foundational tokens

Treat these as starting tokens. Tune only after side-by-side screenshot comparison and accessibility measurement.

### Color

| Token | Starting value | Use |
|---|---:|---|
| `canvas` | `#F4F1E9` | Warm ivory page ground |
| `surface` | `#FCFBF8` | Cards, forms, top bar |
| `ink` | `#1C2823` | Near-black forest text and dark rail |
| `primary` | `#2F664F` | Primary buttons, active progress, approved/confirmed |
| `terracotta` | `#C86549` | Eyebrows, selected tab rule, notification count, restrained emphasis |
| `blue-soft` | `#8EA9B7` | Performer identity field and requested state family |
| `ochre-soft` | `#B99A59` | Performer identity field and tentative/warning family |
| `rose-soft` | `#B9786C` | Performer identity field and avatar family |
| `text-muted` | `#7B817D` | Secondary copy; verify contrast at rendered size |
| `rule` | `#D9D5CB` | Thin warm-gray borders and separators |
| `success-soft` | `#E3EEE5` | Approved/confirmed background |
| `warning-soft` | `#F3E8CF` | Signature/hold background |
| `info-soft` | `#DEE7ED` | Requested background |

Use color semantically and sparingly. Never rely on color alone: every state also needs a text label, shape, icon, or pattern. Text/background pairs must meet WCAG 2.2 AA contrast.

### Typography

- **Display and editorial headings:** a high-contrast serif with an assured cultural/editorial voice. Preferred implementation candidates: Instrument Serif or a properly licensed comparable serif. Do not use a default system serif without visual comparison.
- **Body and UI:** a restrained sans-serif such as Instrument Sans or Geist. Use one family consistently for navigation, labels, inputs, tables, buttons, metadata, and helper text.
- **Numbers:** use tabular numerals for metrics, fees, dates, counts, and calendar cells.
- **Scale:** public hero `clamp(3.5rem, 6vw, 6rem)` with tight line-height; authenticated H1 `clamp(2.5rem, 4vw, 4.5rem)`; section H2 `1.75–2.25rem`; card title `1.25–1.75rem`; body `1rem`; UI/meta `0.75–0.875rem`; eyebrow `0.6875–0.75rem`.
- **Eyebrows:** compact coral uppercase, semibold/bold, `0.12–0.18em` tracking. Never use them as long sentences.

Headings are not decorative labels. Preserve semantic order and avoid shrinking them until the editorial character disappears.

### Spacing, edges, and elevation

- Base spacing unit: `4px`; common steps: `8, 12, 16, 24, 32, 48, 64, 96`.
- Authenticated page padding: approximately `48–64px` desktop, `24–32px` tablet, `16–20px` mobile.
- Content width: one consistent authenticated max width, approximately `1480px`, centered in the area beside the rail.
- Desktop collection grids: three equal columns with `20–28px` gutters.
- Rules: `1px` warm gray. Use borders to group and separate; avoid shadows by default.
- Cards: off-white surface, thin border, square or `2–4px` corner radius. Never use oversized floating rounded containers.
- Primary action: solid dark green, white label, compact rectangular shape, minimum `44px` touch height.
- Secondary action: off-white/transparent surface, thin warm-gray border, dark label.
- Links: dark green or ink with underline/arrow where action clarity benefits.
- Motion: minimal and functional, `120–220ms`; respect reduced-motion. No decorative page choreography.

## 4. Authenticated application shell

At desktop widths (`>= 1024px`), use a fixed or sticky `280px` near-black forest-green left rail. It contains the Salon mark, primary navigation, optional numeric badge, approval/access state, and current-person summary. The active item uses a slightly lighter dark field and high-contrast text. Icons are a tiny coherent set chosen for meaning, not decoration.

The content area begins with a slim white top bar, roughly `72–80px`, containing breadcrumb on the left and locale/search/notifications or account utilities on the right. Use thin bottom rules. Do not turn this bar into a dense global navigation system.

At tablet widths, the rail may collapse to a narrow icon rail or drawer, provided labels remain available on demand. Below `768px`, replace it with a compact top header and five-item bottom navigation for the highest-frequency destinations; lower-frequency and account actions move into a menu. Respect safe-area insets. Never squeeze the desktop rail beside a narrow content column.

## 5. Core component contracts

- **Monogram identity panel:** large serif initials centered in a flat rose, soft-blue, ochre, or forest field. Provide accessible act/venue name text nearby; initials are not the accessible name.
- **Avatar:** circular initials, 32–64px depending on hierarchy, with deterministic identity color and sufficient contrast.
- **Status label:** short uppercase or compact title-case text on a quiet semantic background. No oversized pills.
- **Date tile:** bordered square/near-square with large serif day and coral uppercase month.
- **Filter/control:** rectangular white field, thin border, 44px minimum height, clear label and native/form affordance.
- **Progress track:** text-labeled steps with completed, current, and future states. Do not hide meaning in checkmarks alone.
- **Data card/list row:** one clear primary object, secondary metadata, and one dominant row action. Use dividers instead of nested card shadows.
- **Notices:** full-width quiet semantic surface with icon, concise message, and optional end action.

## 6. Page contracts

### 6.1 Public landing

Reference: [landing.png](./design-reference/landing.png)

**Purpose:** explain the private marketplace, establish trust, and route visitors to apply or sign in.

**Hierarchy:** slim public header → two-column hero → credibility/member proof → dark venue strip → three editorial value propositions → restrained footer.

**Required modules:** Salon wordmark; locale toggle; sign-in and apply CTA; coral eyebrow; large multi-line serif proposition; supporting copy; primary entry/apply actions; approved-member count only when backed by real data; abstract arched stage/performer monogram composition; two small status callouts; approved venue proof strip; three numbered principles; footer legal/navigation.

**Data/actions:** locale switch, sign in, apply for access, privacy/terms. Counts and venue names must come from approved publishable data or be omitted.

**Responsive transformation:** stack copy above visual; retain headline impact without clipping; collapse proof strip to a horizontally scrollable or shortened verified set; stack principle columns; keep CTAs at least 44px and full-width where helpful. Decorative callouts must not obscure the visual or core copy.

### 6.2 Dashboard / overview

Reference: [dashboard.png](./design-reference/dashboard.png)

**Purpose:** answer “what needs my attention?” and surface the next useful actions for a dual-role member.

**Hierarchy:** date eyebrow and greeting + primary action → four compact metrics → recent applications and next confirmed booking → recommended acts in a three-column row.

**Required modules:** role-aware greeting; post-opportunity action when permitted; metric strip; recent application rows with initials, relative time, and shortlist/review action; next-booking date tile and progress; recommendation cards with monograms, match explanation, metadata, fee range, save, and request action.

**Data/actions:** server-authorized metrics and records; shortlist/review; open booking; explore discovery; save act; start direct request. Do not show venue controls to entertainer-only accounts.

**Responsive transformation:** metrics become two columns then a horizontal/stacked set; application and next-booking panels stack; recommendations become one column or a snap-scrolling row; primary action moves below heading or becomes a compact sticky action. Maintain reading order: attention items before recommendations.

### 6.3 Private discovery

Reference: [discovery.png](./design-reference/discovery.png)

**Purpose:** help approved members find acts that fit venue, audience, budget, size, and date.

**Hierarchy:** privacy eyebrow → serif page title/supporting line → filter/search bar → three-column results grid.

**Required modules:** category/date/act-size/budget filters; search; result count/active-filter summary; monogram cards; save control; match indicator with explanation; category, name, size, district, price range, and request action; pagination or load-more behavior; loading skeletons; no-results and permission-denied states.

**Data/actions:** URL-backed filters; authorized private profile projections; save/unsave; open profile; start direct request. Never include locked contact fields in page data or HTML.

**Responsive transformation:** filters become a “Filters” sheet/drawer with active chips/summary; search remains visible; grid moves 3 → 2 → 1 columns; sorting and result count stay near the grid; card actions remain thumb reachable.

### 6.4 Opportunities

Reference: [opportunities.png](./design-reference/opportunities.png)

**Purpose:** let approved entertainers assess open venue needs quickly and let authorized venue operators create opportunities.

**Hierarchy:** access eyebrow → title/supporting line + role-aware post action → vertically spaced opportunity rows.

**Required modules:** date tile; application status label; opportunity title; venue/district; category, group-size, and budget tags; application count where authorized/appropriate; deadline; view/apply action; filters and empty/closed states in production.

**Data/actions:** open detail; apply or manage applications based on role; create/edit/close opportunity for permitted venue members. Application counts must follow privacy rules.

**Responsive transformation:** each wide row becomes a compact stacked card: date/status first, title/meta second, tags wrap, action becomes full width. Keep date and action visible without horizontal scrolling.

### 6.5 Bookings

Reference: [bookings.png](./design-reference/bookings.png)

**Purpose:** show applications and direct requests in one dependable booking pipeline and make the next required action obvious.

**Hierarchy:** booking eyebrow/title → Active/Confirmed/Past tabs with counts → expanded current booking → compact additional booking rows → deposit-semantics notice.

**Required modules:** origin and booking ID; party monogram/name pairing; event date/time/location; status label; fully labeled lifecycle track; German-controlling agreement notice with English convenience translation label; relevant agreement/terms/signature action; separate deposit notice/action; loading, empty, stale-version, cancelled, and conflict states.

**Data/actions:** switch tabs; open booking; accept/propose terms; review generated agreement; initiate/inspect sandbox signature flow; record deposit status when authorized. Never imply deposit confirms a booking or that Salon holds funds.

**Responsive transformation:** tabs remain horizontally scrollable; party/title information stacks; lifecycle becomes a vertical timeline with labels; agreement and action stack; notice becomes a compact block with action below. Preserve the current step and next action above the fold.

### 6.6 Calendar

Reference: [calendar.png](./design-reference/calendar.png)

**Purpose:** let a member understand and manage native availability while seeing holds, requests, and booking blocks.

**Hierarchy:** calendar eyebrow → month and owner context + add action → five-state legend → month grid.

**Required modules:** month navigation and today control; resource selector for dual-role users; state legend with text; weekday header; date cells; compact entries for available, unavailable, tentative hold with expiry, requested, confirmed; detail/editor interaction; conflict and loading states.

**Data/actions:** navigate period; select act/venue resource; add/edit availability; inspect request/booking; release hold where allowed. Confirmed blocks are immutable except through authorized booking lifecycle operations.

**Responsive transformation:** switch from seven-column month grid to an agenda/week-first view below tablet width; never create an unreadable squeezed month. Preserve status labels, expiry, time, and resource context. Offer month view through an explicit toggle if useful.

### 6.7 Dual-role profile

Reference: [dual-role-profile.png](./design-reference/dual-role-profile.png)

**Purpose:** let one approved person maintain venue and entertainer identities while understanding manual approval readiness.

**Hierarchy:** dual-role eyebrow → title/supporting line + save action → main profile editor and right-side approval panel → role tabs → structured form sections.

**Required modules:** person avatar/name/approval status; venue and entertainer tabs; unsaved/submit state; fields required by the product specification; production-resource/rider/media sections; contact privacy explanation; availability link; approval checklist; submit-for-review action; validation, save, upload, and review states.

**Data/actions:** switch role profile; save draft; upload through the future secure boundary; manage contact method; submit for manual review. Make re-review consequences explicit before submission.

**Responsive transformation:** approval panel moves before or directly after the active form summary; role tabs remain sticky/scrollable; two-column fields become one; save action becomes a safe sticky footer only when it does not obscure errors; preserve label/input association and error placement.

## 7. Responsive and state requirements

- Desktop: authenticated shell uses the `280px` rail and a consistent max-width content canvas; collections use three columns where shown.
- Tablet: two-column collections, collapsed navigation, reduced page padding, no loss of primary actions.
- Mobile: single-column content; compact header and bottom navigation; drawer filters; vertical booking progress; agenda calendar.
- Never scale the desktop screenshot down wholesale. Recompose modules around user priority.
- Provide skeleton/loading states that mirror final geometry without shimmering excessively.
- Empty states explain why the area is empty and offer the permitted next action.
- Errors state what failed, preserve user input, and provide retry/recovery.
- Forbidden, unapproved, and suspended states must be intentional screens, not blank pages.
- Focus is visible on every interactive element. Dialogs/sheets trap and restore focus. Touch targets are at least `44 × 44px`.
- Support 200% text zoom and narrow screens without clipped controls or horizontal page scrolling.

## 8. Must-match checklist

Cursor must verify each implemented route against its screenshot at desktop and against this spec at smaller widths.

- [ ] Warm ivory canvas and off-white bordered surfaces, not cold gray/white SaaS defaults
- [ ] Near-black forest rail/ink and solid dark-green primary actions
- [ ] Muted terracotta used sparingly for uppercase labels, selection, and emphasis
- [ ] Soft blue, ochre, and rose identity fields remain muted and flat
- [ ] High-contrast serif hierarchy plus restrained sans-serif UI typography
- [ ] `280px` desktop rail, slim white top bar, breadcrumb, and consistent content width
- [ ] Thin warm-gray rules, square/small-radius cards, no heavy shadows
- [ ] Three-column desktop collections where contracted, with generous gutters/whitespace
- [ ] Monograms/avatar initials replace generic stock imagery
- [ ] Controls, lifecycle states, and icons are consistent and purposeful
- [ ] Every loading, empty, error, forbidden, suspended, and stale-conflict state is designed
- [ ] Responsive layouts are recomposed, not merely shrunk
- [ ] WCAG 2.2 AA contrast, visible focus, keyboard operation, semantics, and 44px targets pass
- [ ] No gradients, glassmorphism, neon, oversized rounded cards, generic SaaS dashboard patterns, or arbitrary iconography
- [ ] Screenshot content is not hard-coded; real authorized data and locale catalogs drive the UI

## 9. Cursor implementation order

Implement visual parity one route at a time. Do not style all routes broadly and promise a later polish pass.

1. Build shared tokens, font loading, primitives, and authenticated shell. Compare the shell against dashboard/discovery references before feature pages.
2. Implement the public landing route. Render at the screenshot viewport, compare side by side, fix hierarchy/spacing/type/color, then verify mobile.
3. Implement dashboard using real slice data and all required states. Compare before continuing.
4. Implement private discovery and its filter/card responsive contracts. Compare before continuing.
5. Implement opportunities and role-aware actions. Compare before continuing.
6. Implement bookings, lifecycle, agreement, and deposit presentation. Compare before continuing.
7. Implement calendar desktop month and responsive agenda. Compare before continuing.
8. Implement dual-role profile, approval panel, forms, and upload placeholders. Compare before continuing.
9. Run the must-match checklist across every route in English and German, desktop/tablet/mobile, keyboard-only, loading/empty/error, approved/unapproved/suspended roles.

For each route, keep a short parity note in the implementation change: reference used, viewport compared, intentional differences, accessibility corrections, and remaining gap. Do not move to the next route while a material visual mismatch remains.
