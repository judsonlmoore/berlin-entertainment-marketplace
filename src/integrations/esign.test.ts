import { describe, expect, it } from "vitest";
import { SandboxESignProvider } from "./esign";

describe("SandboxESignProvider", () => {
  it("creates envelope and records typed acceptance", async () => {
    const provider = new SandboxESignProvider();
    const envelope = await provider.createEnvelope({
      agreementId: "agr-1",
      germanControlling: true,
      packageFingerprint: "abc123",
      packagePdfBlobKey: "local-doc/x.pdf",
      packagePageCount: 3,
      signerEmails: ["a@example.com", "b@example.com"],
    });
    expect(envelope.providerEnvelopeId).toBe("sandbox_agr-1");
    expect(envelope.status).toBe("sent");

    const partial = await provider.recordSignerAcceptance({
      providerEnvelopeId: envelope.providerEnvelopeId,
      signerUserId: "user-a",
      signerEmail: "a@example.com",
      confirmationPhrase: "I agree",
      packageFingerprint: "abc123",
      locale: "en",
    });
    expect(partial.status).toBe("partially_signed");

    const done = await provider.recordSignerAcceptance({
      providerEnvelopeId: envelope.providerEnvelopeId,
      signerUserId: "user-b",
      signerEmail: "b@example.com",
      confirmationPhrase: "Ich stimme zu",
      packageFingerprint: "abc123",
      locale: "de",
    });
    expect(done.status).toBe("completed");

    const artifact = await provider.getPackageArtifactRef(
      envelope.providerEnvelopeId,
    );
    expect(artifact.fingerprint).toBe("abc123");
  });

  it("rejects bad phrase or fingerprint", async () => {
    const provider = new SandboxESignProvider();
    const envelope = await provider.createEnvelope({
      agreementId: "agr-2",
      germanControlling: true,
      packageFingerprint: "fp",
      packagePdfBlobKey: "k",
      packagePageCount: 1,
      signerEmails: ["a@example.com"],
    });
    await expect(
      provider.recordSignerAcceptance({
        providerEnvelopeId: envelope.providerEnvelopeId,
        signerUserId: "u",
        signerEmail: "a@example.com",
        confirmationPhrase: "nope",
        packageFingerprint: "fp",
        locale: "en",
      }),
    ).rejects.toThrow(/Confirmation phrase/);
    await expect(
      provider.recordSignerAcceptance({
        providerEnvelopeId: envelope.providerEnvelopeId,
        signerUserId: "u",
        signerEmail: "a@example.com",
        confirmationPhrase: "I agree",
        packageFingerprint: "wrong",
        locale: "en",
      }),
    ).rejects.toThrow(/fingerprint/);
  });
});
