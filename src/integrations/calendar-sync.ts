/**
 * External calendar synchronization boundary.
 * Phase 6a: ICS import/export live outside this OAuth interface.
 * Phase 10b: Google/Microsoft providers implement this contract.
 */

export type CalendarSyncOwner = {
  ownerType: "entertainer" | "venue_space";
  ownerId: string;
};

export type BusyBlock = {
  startsAt: Date;
  endsAt: Date;
};

export type ConfirmedBookingExport = {
  bookingId: string;
  startsAt: Date;
  endsAt: Date;
  summary: string;
};

export interface CalendarSyncProvider {
  readonly name: string;
  connect(owner: CalendarSyncOwner): Promise<{ status: string }>;
  disconnect(owner: CalendarSyncOwner): Promise<void>;
  importBusyBlocks(owner: CalendarSyncOwner): Promise<BusyBlock[]>;
  exportConfirmedBooking(
    owner: CalendarSyncOwner,
    booking: ConfirmedBookingExport,
  ): Promise<void>;
}

export class StubNoopProvider implements CalendarSyncProvider {
  readonly name = "stub-noop";

  async connect(): Promise<{ status: string }> {
    return { status: "disconnected" };
  }

  async disconnect(): Promise<void> {
    return;
  }

  async importBusyBlocks(): Promise<BusyBlock[]> {
    return [];
  }

  async exportConfirmedBooking(): Promise<void> {
    return;
  }
}

export function getCalendarSyncProvider(): CalendarSyncProvider {
  return new StubNoopProvider();
}
