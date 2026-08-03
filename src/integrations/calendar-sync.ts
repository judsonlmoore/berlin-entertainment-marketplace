import type {
  calendarOwnerTypeEnum,
  calendarSyncProviderEnum,
} from "@/src/db/schema/enums";

export type CalendarOwnerType =
  (typeof calendarOwnerTypeEnum.enumValues)[number];
export type CalendarSyncProviderName =
  (typeof calendarSyncProviderEnum.enumValues)[number];

/** Busy block imported from an external calendar — no private event titles. */
export type BusyBlock = {
  startsAt: Date;
  endsAt: Date;
};

export type CalendarConnectionRef = {
  ownerType: CalendarOwnerType;
  ownerId: string;
  provider: CalendarSyncProviderName;
  externalAccountLabel?: string | null;
};

export type ConfirmedBookingExport = {
  bookingId: string;
  ownerType: CalendarOwnerType;
  ownerId: string;
  startsAt: Date;
  endsAt: Date;
  displayTimezone: string;
};

export interface CalendarSyncProvider {
  connect(connection: CalendarConnectionRef): Promise<void>;
  disconnect(connection: CalendarConnectionRef): Promise<void>;
  importBusyBlocks(
    connection: CalendarConnectionRef,
    range: { from: Date; to: Date },
  ): Promise<BusyBlock[]>;
  exportConfirmedBooking(
    connection: CalendarConnectionRef,
    booking: ConfirmedBookingExport,
  ): Promise<void>;
}

/** Phase 7 stub — no OAuth or external API calls until Phase 10. */
export class StubNoopProvider implements CalendarSyncProvider {
  async connect(): Promise<void> {
    return;
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

export function getCalendarSyncProvider(
  provider: CalendarSyncProviderName,
): CalendarSyncProvider {
  void provider;
  return new StubNoopProvider();
}
