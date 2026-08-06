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

  it("links profile enquiry notifications to the lead", () => {
    const received = generateNotificationContent({
      type: "profile_enquiry_received",
      locale: "en",
      params: {
        entertainerName: "Trio Nord",
        venueName: "Salon Mitte",
        bookingId: "b34ef01f-0000-0000-0000-b34ef01f0000",
      },
    });
    expect(received.actionUrl).toBe(
      "/marketplace/leads/b34ef01f-0000-0000-0000-b34ef01f0000",
    );
    expect(received.actionLabel).toBe("View lead");

    const interested = generateNotificationContent({
      type: "profile_enquiry_interested",
      locale: "de",
      params: {
        entertainerName: "Trio Nord",
        venueName: "Salon Mitte",
        bookingId: "b34ef01f-0000-0000-0000-b34ef01f0000",
      },
    });
    expect(interested.body).toContain("Salon Mitte");
    expect(interested.actionLabel).toBe("Lead ansehen");
  });
});
