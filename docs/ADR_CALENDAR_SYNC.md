# ADR: External calendar synchronization boundary

## Status

Accepted — Phase 7 stub; full integration deferred to Phase 10.

## Context

Entertainers and venues need to reflect external availability and export confirmed Salon bookings without exposing private calendar titles or blocking core marketplace delivery.

## Decision

1. **Integration boundary** lives in `src/integrations/calendar-sync.ts` behind a `CalendarSyncProvider` interface with `connect`, `disconnect`, `importBusyBlocks`, and `exportConfirmedBooking`.
2. **Phase 7** ships `StubNoopProvider` only — no OAuth, token storage, or provider SDK calls.
3. **Connection records** use `calendar_connections` with `status = disconnected` by default; helpers in `src/db/queries/calendar-connections.ts` list and upsert rows.
4. **Import policy (Phase 10):** external events become **busy blocks without titles** — only start/end timestamps feed availability conflict checks.
5. **Export policy (Phase 10):** only **confirmed Salon bookings** are written back to the connected calendar; tentative holds, requests, and drafts are never exported.
6. **Privacy:** imported metadata must not persist event titles, attendees, or location from third-party calendars.

## Consequences

- Core booking, hold expiry, and conflict logic can ship without calendar credentials.
- Phase 10 adds provider implementations (Google, Microsoft, iCal) without changing the domain model.
- Operators must provision OAuth secrets and background sync jobs separately before claiming calendar sync is operational.
