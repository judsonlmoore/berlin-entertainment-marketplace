# ADR: External calendar synchronization boundary

## Status

Accepted — Phase 7 stub; iCalendar/ICS basics first, OAuth-based providers later.

## Context

Entertainers and venues need to reflect external availability and export confirmed Salon bookings without exposing private calendar titles or blocking core marketplace delivery.

## Decision

1. **Integration boundary** lives in `src/integrations/calendar-sync.ts` behind a `CalendarSyncProvider` interface with `connect`, `disconnect`, `importBusyBlocks`, and `exportConfirmedBooking`.
2. **Phase 7** ships `StubNoopProvider` only — no OAuth, token storage, or provider SDK calls.
3. **Connection records** use `calendar_connections` with `status = disconnected` by default; helpers in `src/db/queries/calendar-connections.ts` list and upsert rows.
4. **Phase A (iCalendar/ICS first):**
   - Import policy: external events become **busy blocks without titles** — only start/end timestamps feed availability conflict checks.
   - Export policy: expose a **revocable secret HTTPS ICS subscription URL** for **confirmed Salon bookings only**. Tentative holds, requests, and drafts are never exported.
5. **Phase B (OAuth later):** provider implementations (Google/Microsoft/Apple) and two-way sync are delivered after iCalendar/ICS basics, while preserving the same import/export privacy rules.
6. **Privacy:** imported metadata must not persist event titles, attendees, or location from third-party calendars.

## Consequences

- Core booking, hold expiry, and conflict logic can ship without calendar credentials.
- iCalendar/ICS basics ship before OAuth provider implementations without changing the domain model.
- Operators must provision OAuth secrets and background sync jobs separately before claiming calendar sync is operational.
