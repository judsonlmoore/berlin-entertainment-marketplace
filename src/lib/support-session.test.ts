import { describe, expect, it } from "vitest";
import {
  decodeSupportSession,
  encodeSupportSession,
  type SupportSessionPayload,
} from "./support-session";

describe("support session cookie", () => {
  it("round-trips a signed payload", () => {
    process.env.AUTH_SECRET = "test-secret-for-support-session";
    const payload: SupportSessionPayload = {
      staffUserId: "staff-1",
      subjectUserId: "member-1",
      entityType: "entertainer",
      entityId: "11111111-1111-4111-8111-111111111111",
      label: "Drumson",
      exp: Date.now() + 60_000,
    };
    const encoded = encodeSupportSession(payload);
    const decoded = decodeSupportSession(encoded);
    expect(decoded).toEqual(payload);
  });

  it("rejects tampered payloads", () => {
    process.env.AUTH_SECRET = "test-secret-for-support-session";
    const payload: SupportSessionPayload = {
      staffUserId: "staff-1",
      subjectUserId: "member-1",
      entityType: "venue",
      entityId: "22222222-2222-4222-8222-222222222222",
      label: "Kesselhaus",
      exp: Date.now() + 60_000,
    };
    const encoded = encodeSupportSession(payload);
    const [body] = encoded.split(".");
    expect(decodeSupportSession(`${body}.tampered`)).toBeNull();
  });

  it("rejects expired payloads", () => {
    process.env.AUTH_SECRET = "test-secret-for-support-session";
    const payload: SupportSessionPayload = {
      staffUserId: "staff-1",
      subjectUserId: "member-1",
      entityType: "entertainer",
      entityId: "11111111-1111-4111-8111-111111111111",
      label: "Drumson",
      exp: Date.now() - 1000,
    };
    expect(decodeSupportSession(encodeSupportSession(payload))).toBeNull();
  });
});
