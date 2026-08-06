import { describe, expect, it } from "vitest";
import { generateNotificationContent } from "./templates";

describe("notification templates", () => {
  it("renders booking_post_gig_survey_ready content", () => {
    const content = generateNotificationContent({
      type: "booking_post_gig_survey_ready",
      locale: "en",
      params: { bookingId: "b34ef01f-0000-0000-0000-b34ef01f0000" },
    });

    expect(content.title.length).toBeGreaterThan(0);
    expect(content.body.length).toBeGreaterThan(0);
    expect(content.actionUrl).toBe(
      "/marketplace/bookings/b34ef01f-0000-0000-0000-b34ef01f0000",
    );
    expect(content.actionLabel).toBe("Give feedback");
  });
});
