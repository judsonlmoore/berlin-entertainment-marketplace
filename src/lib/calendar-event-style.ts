/** Visual tokens for calendar events — match StatusLabel legend tones. */
export type CalendarVisualState =
  | "unavailable"
  | "tentative_hold"
  | "requested"
  | "confirmed"
  | "imported_busy"
  | "available";

export function calendarEventStyle(state: string): {
  color: string;
  contrastColor: string;
  className: string;
} {
  switch (state) {
    case "unavailable":
      return {
        // Same light rose as StatusLabel danger (`rose-soft` at 25% on white).
        color: "color-mix(in srgb, var(--rose-soft) 25%, white)",
        contrastColor: "var(--ink)",
        className: "cal-state-unavailable",
      };
    case "tentative_hold":
      return {
        color: "var(--warning-soft)",
        contrastColor: "var(--ink)",
        className: "cal-state-tentative_hold",
      };
    case "requested":
      return {
        color: "var(--info-soft)",
        contrastColor: "var(--ink)",
        className: "cal-state-requested",
      };
    case "confirmed":
      return {
        color: "var(--success-soft)",
        contrastColor: "var(--ink)",
        className: "cal-state-confirmed",
      };
    case "imported_busy":
      return {
        color: "var(--rule)",
        contrastColor: "var(--text-muted)",
        className: "cal-state-imported_busy",
      };
    default:
      return {
        color: "color-mix(in srgb, var(--primary) 14%, white)",
        contrastColor: "var(--ink)",
        className: `cal-state-${state}`,
      };
  }
}
