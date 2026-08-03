import { getTranslations } from "next-intl/server";
import {
  bookingLifecycleSteps,
  isKnownBookingState,
} from "@/src/domain/booking-lifecycle";
import type { BookingState } from "@/src/domain/booking";

export async function BookingLifecycleTrack({ state }: { state: string }) {
  const t = await getTranslations("bookings");
  const bookingState = isKnownBookingState(state)
    ? (state as BookingState)
    : "applied";
  const steps = bookingLifecycleSteps(bookingState);

  return (
    <ol className="grid gap-2 sm:grid-cols-5">
      {steps.map((step, index) => {
        const label = t(`step_${step.id}` as "step_terms_agreed");
        const tone =
          step.status === "complete"
            ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
            : step.status === "current"
              ? "border-[var(--primary)] bg-[var(--success-soft)] text-[var(--ink)]"
              : step.status === "terminal"
                ? "border-[var(--rule)] bg-[var(--canvas)] text-[var(--text-muted)]"
                : "border-[var(--rule)] bg-[var(--surface)] text-[var(--text-muted)]";
        return (
          <li
            key={step.id}
            className={`border px-2 py-3 text-center text-xs ${tone}`}
          >
            <span className="tabular block font-semibold">{index + 1}</span>
            <span className="mt-1 block leading-snug">{label}</span>
            <span className="sr-only">{step.status}</span>
          </li>
        );
      })}
    </ol>
  );
}
