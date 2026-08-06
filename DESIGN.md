# Design System — Salon

## Product Context
- **What this is:** A private, curated Berlin B2B marketplace connecting venues with small-format entertainers — discovery, protected contact unlock, agreements, native calendar, and (later) payments.
- **Who it's for:** Active venue operators and entertainers (one role per account) who need to manage availability, bookings, and trust safely.
- **Space/industry:** Two-sided marketplace / cultural booking ops (Airbnb-shaped trust model, not consumer travel chrome).
- **Project type:** Authenticated web app + public marketing/signup surface.
- **Memorable thing:** The private, protected way Berlin venues and acts book each other.
- **Profile / onboarding memorable:** After five seconds, trust that Salon brings more business and lowers booking/agreement stress — and that a strong profile presence is worth the effort.

## Aesthetic Direction
- **Direction:** Crisp cultural-ops (evolved from editorial warm-ivory)
- **Decoration level:** Intentional — thin rules, quiet surfaces, monograms; no gradients/glass/pills-everywhere
- **Mood:** Calm, trustworthy, current. Berlin atelier restraint with booking-grade clarity. Users should feel they can manage availability and close a protected booking today — not browse a lifestyle brochure.
- **Reference sites:** Airbnb host/ops clarity for density and “what needs me now?”; keep Salon cultural identity distinct (no Coral red, no pill search, no photo-mall discovery).
- **Preview (system):** `~/.gstack/projects/berlin-entertainment-marketplace/designs/design-system-20260803/salon-evolved-preview.html`
- **Preview (profile + onboarding):** `~/.gstack/projects/judsonlmoore-berlin-entertainment-marketplace/designs/profile-builder-20260805/preview.html`

## Typography
- **Display/Hero:** Fraunces — brand wordmark and public landing hero only
- **Body / UI / Labels:** IBM Plex Sans — navigation, forms, tables, buttons, metadata, authenticated page titles
- **Data/Tables:** IBM Plex Sans with `font-variant-numeric: tabular-nums`
- **Code:** JetBrains Mono (admin/debug only if needed)
- **Loading:** Google Fonts via `next/font` (Fraunces + IBM Plex Sans)
- **Rules:** Do not use Instrument Serif for every authenticated H1. Authenticated titles use IBM Plex Sans 600 at `clamp(1.75rem, 2.5vw, 2.25rem)`.
- **Scale:**
  - Public hero: `clamp(3rem, 5.5vw, 5rem)` Fraunces, tight line-height
  - Authenticated H1: `clamp(1.75rem, 2.5vw, 2.25rem)` IBM Plex Sans 600
  - Section H2: `1.15–1.35rem` IBM Plex Sans 600
  - Card title: `1.05–1.15rem` IBM Plex Sans 600
  - Body: `1rem` / 400, line-height ~1.5
  - Labels: `0.875rem` / 500
  - UI/meta: `0.8–0.875rem` / 500 on muted
  - Eyebrow: `0.72rem` / 600, uppercase, `0.12–0.16em` tracking, accent color
- **Blacklist / avoid as primary:** Inter, Roboto, Arial, system-ui as display, Space Grotesk, Instrument Sans, Outfit (replaced — too geometric for ops UI)

## Color
- **Approach:** Restrained — one primary voltage, rare accent, AA-first neutrals
- **Primary:** `#1F5A45` — CTAs, focus rings, active progress, confirmed/approved
- **Primary foreground:** `#FFFFFF`
- **Accent (terracotta):** `#B84A32` — eyebrows, rare emphasis, alerts; never chrome-wide
- **Canvas:** `#F7F6F3` — cool stone page ground (replaces dated warm ivory `#F4F1E9`)
- **Surface:** `#FFFFFF` — cards, forms, top bar (true white for field contrast)
- **Ink:** `#141816` — body text
- **Muted:** `#5C635F` — secondary copy; must pass WCAG 2.2 AA at UI sizes (replaces `#7B817D`)
- **Rule:** `#E4E1DA` — hairlines
- **Rail:** `#121A17` — left nav
- **Rail muted / active:** `#9AA39E` / `#1E2A25`
- **Identity fields:** blue-soft `#8EA9B7`, ochre-soft `#B99A59`, rose-soft `#B9786C` (flat monogram grounds)
- **Semantic softs:** success `#E3EEE5`, warning `#F3E8CF`, info `#DEE7ED` — text on these uses ink, not muted gray
- **Danger:** `#A11F2C` — errors
- **Dark mode:** Optional later; redesign surfaces, keep primary readable; not required for MVP

## Spacing
- **Base unit:** 4px
- **Density:** Comfortable (ops-friendly, not sparse magazine)
- **Scale:** 2xs(2) xs(4) sm(8) md(16) lg(24) xl(32) 2xl(48) 3xl(64) 4xl(96)
- Authenticated page padding: ~40–56px desktop, 24–32px tablet, 16–20px mobile
- Content max width: ~1480px beside rail

## Layout
- **Approach:** Hybrid — editorial public landing; grid-disciplined authenticated app
- **Grid:** 12-col mental model; collections often 3 → 2 → 1
- **Border radius:** sm `6px`, md `8px` (inputs/buttons/cards), lg `12px` (app frames only); avatars `9999px`
- **Elevation:** Borders first; optional single soft shadow on marketing frames only — no heavy card stacks

## Motion
- **Approach:** Minimal-functional
- **Easing:** enter ease-out, exit ease-in, move ease-in-out
- **Duration:** micro 50–100ms, short 150–220ms
- Respect `prefers-reduced-motion`

## Forms (first-class)
- Label above control, IBM Plex Sans 500, ink
- Control: white surface, 1px rule, 8px radius, min-height 44px, comfortable padding
- Focus: 2px primary ring + offset (or `box-shadow` focus ring); never remove outline without replacement
- Error: danger text + stronger border; `role="alert"`
- Success: `aria-live="polite"`
- Group fields under section titles with rule separators (“Venue basics”, “Production”, …)
- Dual-role tabs: active = primary underline **and** weight 600 (not color alone)
- Primary button: solid primary / white label; secondary: white + rule + ink

## Profile builder & onboarding setup
Surfaces: `/[locale]/onboarding/setup` and `/[locale]/profile`. Same tokens as the rest of the app; these rules are surface-specific.

### Intent
- Feel like building a **booking asset** (act/venue presence), not filling an admin spreadsheet.
- Outcome framing in one quiet line max (e.g. fuller profiles get shortlisted / verification unlocks contact). Do not stack salesy callouts.
- No live preview panel beside the form.

### Layout
- **Onboarding:** Narrow focused steps (shell without app rail). Short path. Final “you’re in / pending verification” screen stays until the user clicks Continue (no auto-redirect).
- **Profile:** Single long page. Form column ~720–800px. Display-name strip near top; it sticks under the mobile chrome (and to the top on desktop) so Publish, autosave status, and errors stay visible while scrolling. Section hairline rules. Media high; logistics later. Account language/deletion live under `/account`, not profile.

### Autosave & publication status
- Autosave while editing. Status copy: **Unsaved changes**, **Saving…**, and **Saved.** (no clock time). Warn before leaving the page when there are unsaved changes.
- Display-name strip hosts one publication control on the right: **Publish** when unpublished, **Unpublish** when live (plus **Suspended** when staff-locked). Autosave status sits beside it, vertically centered. The strip is sticky on scroll so the action remains reachable at the bottom of the form.
- **Publish** is self-serve (`draft` → `approved`) after a built-in QA checklist passes. **Unpublish** returns to draft. Edits while published do **not** unpublish the profile.
- Staff may still suspend publication for moderation; they are not in the critical path for going live.

### Media
- Empty slots: **dashed outlined** rectangles/squares on white surface — not mystery-person silhouettes, not photo backgrounds as placeholders.
- Hero empty: light drop affordance (small stacked-photo icon + short “Drop hero photo / or click to browse”); gallery empties are quieter (`+` only).
- Filled: show the image; circular remove control top-right; loading = dark overlay + spinner.
- Optional **Hero** badge on the title photo once set.
- Featured YouTube: URL field + thumbnail; **clicking the thumbnail opens a modal with the embedded video**.

### Description
- Shared **ParagraphTextField** for all multi-line prose (talent description/technical/accessibility/equipment; buyer short description/audience/house rules/load-in/production notes/accessibility; same on onboarding).
- Rich text (bold / italic / underline / lists / quote) with Gmail-style toolbar icons. Character counter with field-specific min/max. No links.
- Same control on onboarding basics and profile builders — do not invent per-field textarea chrome.

### Website & social links
- Plain full-URL text inputs with platform-specific **placeholders** (e.g. `https://www.instagram.com/yourhandle`).
- Do **not** hardcode URL prefix chrome beside the field.
- Validate that the value matches the expected platform (host/path). An Instagram field must reject a Twitter/X URL, etc.
- Inline **Valid** / **Invalid** status right-aligned **inside** the input; short `role="alert"` error under invalid fields.

### Contact on these surfaces
- Do not collect a separate private contact email on onboarding or profile builder. Prefer the signed-in account email for contact workflows.
- Contact privacy copy still applies where discovery reveals contacts after shortlist/accepted request.

## Shell
- Desktop ≥1024px: sticky ~280px rail, slim surface top bar (~64–72px), breadcrumb + locale
- Mobile &lt;768px: compact header + drawer navigation (same rail menu); no sticky bottom nav
- Member rail may show a quiet **Getting started** checklist (publish → search → open a result → send an enquiry). When all steps are done, show a one-line congrats + dismiss; dismiss hides it permanently. Staff and support-mode overlays never see it.
- Logged-out surfaces share one public footer (privacy, terms, cookies, sign-in)

## Explicitly prohibited
No gradients, glassmorphism, neon, purple-first templates, oversized rounded cards, pill-everything, generic stock photography, decorative blobs, drop-shadow-heavy cards, warm-cream + terracotta + giant serif everywhere as the default authenticated look.
No mystery-person avatar placeholders for hero/gallery media.
No fixed social URL prefix chrome on profile/onboarding link fields.
No live marketplace preview rail on profile edit.

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-08-03 | Evolved visual system from warm-ivory editorial to crisp cultural-ops | Status quo felt dated; muted `#7B817D` failed readability; forms were under-designed. Preview approved in design consultation. |
| 2026-08-03 | Cool stone canvas + true white surfaces | Improves contrast and modern marketplace feel while keeping cultural restraint |
| 2026-08-03 | Fraunces for brand/hero; Outfit for UI | Serif demoted so ops screens stay scannable |
| 2026-08-06 | IBM Plex Sans replaces Outfit for UI | Outfit felt too geometric/fashion for ops readability; keep Fraunces for brand/hero only |
| 2026-08-03 | Form system with 8px radius and section groups | Profile/booking trust surfaces need first-class field UI |
| 2026-08-03 | Remove authenticated sticky bottom nav | Mobile drawer + desktop rail already cover navigation; bottom bar was redundant |
| 2026-08-03 | Legal pages from markdown under `content/legal` | Easier bilingual updates; shared prose template + public footer |
| 2026-08-05 | Profile + onboarding as booking-asset editors | Presence-led, autosave, dashed media empties, platform URL validation, status tags instead of submit; preview approved in design consultation |
| 2026-08-06 | Publish CTA on display-name strip | Owners explicitly submit ready drafts for staff verification; autosave + status tags alone were not actionable enough |
| 2026-08-06 | Self-serve publish/unpublish with QA checklist | Staff review removed from the critical path; edits stay published; leave warning for unsaved changes |
| 2026-08-06 | Rail getting-started checklist replaces verification banner | Staff no longer review accounts; guide members through publish → discover → enquire, then dismiss forever |
