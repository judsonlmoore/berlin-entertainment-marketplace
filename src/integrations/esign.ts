import {
  matchesConfirmationPhrase,
  type AgreementConfirmLocale,
} from "@/src/domain/agreement-confirm";

export type CreateEnvelopeInput = {
  agreementId: string;
  germanControlling: true;
  packageFingerprint: string;
  packagePdfBlobKey: string;
  packagePageCount: number;
  signerEmails: string[];
};

export type RecordSignerAcceptanceInput = {
  providerEnvelopeId: string;
  signerUserId: string;
  signerEmail: string;
  confirmationPhrase: string;
  packageFingerprint: string;
  locale: AgreementConfirmLocale;
};

export type EnvelopeStatus = {
  providerEnvelopeId: string;
  status: "created" | "sent" | "partially_signed" | "completed" | "voided";
  packageFingerprint?: string;
  packagePdfBlobKey?: string;
  packagePageCount?: number;
  acceptedSignerIds?: string[];
};

export type ESignWebhookEvent = {
  providerEnvelopeId: string;
  type: "envelope.completed" | "signer.completed" | "envelope.voided";
  signerEmail?: string;
  eventHash: string;
};

export type PackageArtifactRef = {
  blobKey: string;
  fingerprint: string;
};

/**
 * E-signature provider boundary. Sandbox only until legal templates are approved.
 */
export interface ESignProvider {
  readonly name: string;
  createEnvelope(input: CreateEnvelopeInput): Promise<EnvelopeStatus>;
  recordSignerAcceptance(
    input: RecordSignerAcceptanceInput,
  ): Promise<EnvelopeStatus>;
  getStatus(providerEnvelopeId: string): Promise<EnvelopeStatus>;
  getPackageArtifactRef(
    providerEnvelopeId: string,
  ): Promise<PackageArtifactRef>;
  verifyWebhook(
    rawBody: string,
    signatureHeader: string | null,
  ): Promise<ESignWebhookEvent>;
}

type SandboxEnvelope = EnvelopeStatus & {
  packageFingerprint: string;
  packagePdfBlobKey: string;
  packagePageCount: number;
  expectedSignerEmails: string[];
  acceptedSignerIds: string[];
};

export class UnconfiguredESignProvider implements ESignProvider {
  readonly name = "unconfigured";

  async createEnvelope(): Promise<EnvelopeStatus> {
    throw new Error("E-signature provider is not configured");
  }

  async recordSignerAcceptance(): Promise<EnvelopeStatus> {
    throw new Error("E-signature provider is not configured");
  }

  async getStatus(): Promise<EnvelopeStatus> {
    throw new Error("E-signature provider is not configured");
  }

  async getPackageArtifactRef(): Promise<PackageArtifactRef> {
    throw new Error("E-signature provider is not configured");
  }

  async verifyWebhook(): Promise<ESignWebhookEvent> {
    throw new Error("E-signature provider is not configured");
  }
}

/**
 * Local/demo adapter. Does not create legally binding documents.
 * Enabled only when ESIGN_PROVIDER=sandbox outside production.
 */
export class SandboxESignProvider implements ESignProvider {
  readonly name = "sandbox";
  private readonly envelopes = new Map<string, SandboxEnvelope>();

  async createEnvelope(input: CreateEnvelopeInput): Promise<EnvelopeStatus> {
    const providerEnvelopeId = `sandbox_${input.agreementId}`;
    const status: SandboxEnvelope = {
      providerEnvelopeId,
      status: "sent",
      packageFingerprint: input.packageFingerprint,
      packagePdfBlobKey: input.packagePdfBlobKey,
      packagePageCount: input.packagePageCount,
      expectedSignerEmails: input.signerEmails,
      acceptedSignerIds: [],
    };
    this.envelopes.set(providerEnvelopeId, status);
    return { ...status };
  }

  async recordSignerAcceptance(
    input: RecordSignerAcceptanceInput,
  ): Promise<EnvelopeStatus> {
    if (!matchesConfirmationPhrase(input.confirmationPhrase, input.locale)) {
      throw new Error("Confirmation phrase does not match");
    }

    let envelope = this.envelopes.get(input.providerEnvelopeId);
    if (!envelope) {
      // Stateless across serverless invocations: validate phrase + fingerprint only.
      envelope = {
        providerEnvelopeId: input.providerEnvelopeId,
        status: "partially_signed",
        packageFingerprint: input.packageFingerprint,
        packagePdfBlobKey: "",
        packagePageCount: 0,
        expectedSignerEmails: [],
        acceptedSignerIds: [input.signerUserId],
      };
      this.envelopes.set(input.providerEnvelopeId, envelope);
      return { ...envelope };
    }

    if (envelope.packageFingerprint !== input.packageFingerprint) {
      throw new Error("Package fingerprint mismatch");
    }
    if (!envelope.acceptedSignerIds.includes(input.signerUserId)) {
      envelope.acceptedSignerIds.push(input.signerUserId);
    }
    envelope.status =
      envelope.acceptedSignerIds.length >= 2 ? "completed" : "partially_signed";
    this.envelopes.set(input.providerEnvelopeId, envelope);
    return { ...envelope };
  }

  async getStatus(providerEnvelopeId: string): Promise<EnvelopeStatus> {
    const envelope = this.envelopes.get(providerEnvelopeId);
    if (envelope) return { ...envelope };
    return {
      providerEnvelopeId,
      status: "sent",
    };
  }

  async getPackageArtifactRef(
    providerEnvelopeId: string,
  ): Promise<PackageArtifactRef> {
    const envelope = this.envelopes.get(providerEnvelopeId);
    if (!envelope) {
      throw new Error("Unknown sandbox envelope");
    }
    return {
      blobKey: envelope.packagePdfBlobKey,
      fingerprint: envelope.packageFingerprint,
    };
  }

  async verifyWebhook(
    rawBody: string,
    signatureHeader: string | null,
  ): Promise<ESignWebhookEvent> {
    const secret = process.env.ESIGN_WEBHOOK_SECRET;
    if (!secret) {
      throw new Error("E-sign webhook secret is required");
    }
    if (signatureHeader !== secret) {
      throw new Error("Invalid e-sign webhook signature");
    }
    const parsed = JSON.parse(rawBody) as Partial<ESignWebhookEvent>;
    const allowedTypes = new Set([
      "envelope.completed",
      "signer.completed",
      "envelope.voided",
    ]);
    if (
      !parsed.providerEnvelopeId ||
      !parsed.type ||
      !parsed.eventHash ||
      !allowedTypes.has(parsed.type)
    ) {
      throw new Error("Invalid e-sign webhook payload");
    }
    return {
      providerEnvelopeId: parsed.providerEnvelopeId,
      type: parsed.type,
      eventHash: parsed.eventHash,
      ...(parsed.signerEmail ? { signerEmail: parsed.signerEmail } : {}),
    };
  }
}

function allowSandboxProvider(): boolean {
  if (process.env.NODE_ENV === "production") {
    return false;
  }
  const configured = process.env.ESIGN_PROVIDER;
  return (
    configured === "sandbox" || !configured || configured === "unconfigured"
  );
}

export function getESignProvider(): ESignProvider {
  if (process.env.ESIGN_PROVIDER === "sandbox" && allowSandboxProvider()) {
    return new SandboxESignProvider();
  }
  return new UnconfiguredESignProvider();
}

/** Prefer sandbox locally so agreement flow is demoable without external keys. */
export function getESignProviderForGeneration(): ESignProvider {
  if (allowSandboxProvider()) {
    return new SandboxESignProvider();
  }
  return getESignProvider();
}
