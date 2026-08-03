export type CreateEnvelopeInput = {
  agreementId: string;
  germanControlling: true;
  signerEmails: string[];
};

export type EnvelopeStatus = {
  providerEnvelopeId: string;
  status: "created" | "sent" | "partially_signed" | "completed" | "voided";
};

/**
 * E-signature provider boundary. Sandbox only until legal templates are approved.
 */
export interface ESignProvider {
  createEnvelope(input: CreateEnvelopeInput): Promise<EnvelopeStatus>;
  getStatus(providerEnvelopeId: string): Promise<EnvelopeStatus>;
  verifyWebhook(
    rawBody: string,
    signatureHeader: string | null,
  ): Promise<unknown>;
}

export class UnconfiguredESignProvider implements ESignProvider {
  async createEnvelope(): Promise<EnvelopeStatus> {
    throw new Error("E-signature provider is not configured");
  }

  async getStatus(): Promise<EnvelopeStatus> {
    throw new Error("E-signature provider is not configured");
  }

  async verifyWebhook(): Promise<unknown> {
    throw new Error("E-signature provider is not configured");
  }
}

export function getESignProvider(): ESignProvider {
  if (!process.env.ESIGN_API_KEY || !process.env.ESIGN_PROVIDER) {
    return new UnconfiguredESignProvider();
  }
  return new UnconfiguredESignProvider();
}
