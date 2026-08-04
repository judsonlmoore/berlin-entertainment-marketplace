# Design System — Salon

## Product Context
- **What this is:** A private, curated Berlin B2B marketplace connecting venues with small-format entertainers — discovery, protected contact unlock, agreements, native calendar, and (later) payments.
- **Who it's for:** Active venue operators and entertainers (one role per account) who need to manage availability, bookings, and trust safely.
- **Space/industry:** Two-sided marketplace / cultural booking ops (Airbnb-shaped trust model, not consumer travel chrome).
- **Project type:** Authenticated web app + public marketing/signup surface.
- **Memorable thing:** The private, protected way Berlin venues and acts book each other.

## Aesthetic Direction
- **Direction:** Crisp cultural-ops (evolved from editorial warm-ivory)
- **Decoration level:** Intentional — thin rules, quiet surfaces, monograms; no gradients/glass/pills-everywhere
- **Mood:** Calm, trustworthy, current. Berlin atelier restraint with booking-grade clarity. Users should feel they can manage availability and close a protected booking today — not browse a lifestyle brochure.
- **Reference sites:** Airbnb host/ops clarity for density and “what needs me now?”; keep Salon cultural identity distinct (no Coral red, no pill search, no photo-mall discovery).
- **Preview:** `~/.gstack/projects/berlin-entertainment-marketplace/designs/design-system-20260803/salon-evolved-preview.html`

## Typography
- **Display/Hero:** Fraunces — brand wordmark and public landing hero only
- **Body / UI / Labels:** Outfit — navigation, forms, tables, buttons, metadata, authenticated page titles
- **Data/Tables:** Outfit with `font-variant-numeric: tabular-nums`
- **Code:** JetBrains Mono (admin/debug only if needed)
- **Loading:** Google Fonts via `next/font` (Fraunces + Outfit)
- **Rules:** Do not use Instrument Serif for every authenticated H1. Authenticated titles use Outfit 600 at `clamp(1.75rem, 2.5vw, 2.25rem)`.
- **Scale:**
  - Public hero: `clamp(3rem, 5.5vw, 5rem)` Fraunces, tight line-height
  - Authenticated H1: `clamp(1.75rem, 2.5vw, 2.25rem)` Outfit 600
  - Section H2: `1.15–1.35rem` Outfit 600
  - Card title: `1.05–1.15rem` Outfit 600
  - Body: `1rem` / 400, line-height ~1.5
  - Labels: `0.875rem` / 500
  - UI/meta: `0.8–0.875rem` / 500 on muted
  - Eyebrow: `0.72rem` / 600, uppercase, `0.12–0.16em` tracking, accent color
- **Blacklist / avoid as primary:** Inter, Roboto, Arial, system-ui as display, Space Grotesk, Instrument Sans as the long-term UI face (migrate to Outfit)

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
- Label above control, Outfit 500, ink
- Control: white surface, 1px rule, 8px radius, min-height 44px, comfortable padding
- Focus: 2px primary ring + offset (or `box-shadow` focus ring); never remove outline without replacement
- Error: danger text + stronger border; `role="alert"`
- Success: `aria-live="polite"`
- Group fields under section titles with rule separators (“Venue basics”, “Production”, …)
- Dual-role tabs: active = primary underline **and** weight 600 (not color alone)
- Primary button: solid primary / white label; secondary: white + rule + ink

## Shell
- Desktop ≥1024px: sticky ~280px rail, slim surface top bar (~64–72px), breadcrumb + locale
- Mobile &lt;768px: compact header + drawer navigation (same rail menu); no sticky bottom nav
- Logged-out surfaces share one public footer (privacy, terms, cookies, sign-in)

## Explicitly prohibited
No gradients, glassmorphism, neon, purple-first templates, oversized rounded cards, pill-everything, generic stock photography, decorative blobs, drop-shadow-heavy cards, warm-cream + terracotta + giant serif everywhere as the default authenticated look.

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-08-03 | Evolved visual system from warm-ivory editorial to crisp cultural-ops | Status quo felt dated; muted `#7B817D` failed readability; forms were under-designed. Preview approved in design consultation. |
| 2026-08-03 | Cool stone canvas + true white surfaces | Improves contrast and modern marketplace feel while keeping cultural restraint |
| 2026-08-03 | Fraunces for brand/hero; Outfit for UI | Serif demoted so ops screens stay scannable |
| 2026-08-03 | Form system with 8px radius and section groups | Profile/booking trust surfaces need first-class field UI |
| 2026-08-03 | Remove authenticated sticky bottom nav | Mobile drawer + desktop rail already cover navigation; bottom bar was redundant |
| 2026-08-03 | Legal pages from markdown under `content/legal` | Easier bilingual updates; shared prose template + public footer |
