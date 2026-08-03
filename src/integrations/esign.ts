export type CreateEnvelopeInput = {
  agreementId: string;
  germanControlling: true;
  signerEmails: string[];
};

export type EnvelopeStatus = {
  providerEnvelopeId: string;
  status: "created" | "sent" | "partially_signed" | "completed" | "voided";
};

export type ESignWebhookEvent = {
  providerEnvelopeId: string;
  type: "envelope.completed" | "signer.completed" | "envelope.voided";
  signerEmail?: string;
  eventHash: string;
};

/**
 * E-signature provider boundary. Sandbox only until legal templates are approved.
 */
export interface ESignProvider {
  readonly name: string;
  createEnvelope(input: CreateEnvelopeInput): Promise<EnvelopeStatus>;
  getStatus(providerEnvelopeId: string): Promise<EnvelopeStatus>;
  verifyWebhook(
    rawBody: string,
    signatureHeader: string | null,
  ): Promise<ESignWebhookEvent>;
}

export class UnconfiguredESignProvider implements ESignProvider {
  readonly name = "unconfigured";

  async createEnvelope(): Promise<EnvelopeStatus> {
    throw new Error("E-signature provider is not configured");
  }

  async getStatus(): Promise<EnvelopeStatus> {
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
  private readonly envelopes = new Map<string, EnvelopeStatus>();

  async createEnvelope(input: CreateEnvelopeInput): Promise<EnvelopeStatus> {
    const providerEnvelopeId = `sandbox_${input.agreementId}`;
    const status: EnvelopeStatus = {
      providerEnvelopeId,
      status: "sent",
    };
    this.envelopes.set(providerEnvelopeId, status);
    return status;
  }

  async getStatus(providerEnvelopeId: string): Promise<EnvelopeStatus> {
    return (
      this.envelopes.get(providerEnvelopeId) ?? {
        providerEnvelopeId,
        status: "sent",
      }
    );
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
