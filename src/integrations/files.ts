import { randomUUID } from "node:crypto";
import { validateRiderUploadInput } from "@/src/domain/rider";

export type FileUploadInput = {
  ownerUserId: string;
  mimeType: string;
  sizeBytes: number;
  checksum: string;
};

export type FileRecord = {
  key: string;
  mimeType: string;
  sizeBytes: number;
  checksum: string;
};

/**
 * Private file storage boundary. Production uses Vercel Blob once provisioned.
 */
export interface FileStore {
  readonly name: string;
  createUpload(
    input: FileUploadInput,
  ): Promise<{ uploadUrl: string; key: string }>;
  getMetadata(key: string): Promise<FileRecord | null>;
  createAuthorizedReadUrl(key: string): Promise<string>;
  delete(key: string): Promise<void>;
}

export class UnconfiguredFileStore implements FileStore {
  readonly name = "unconfigured";

  async createUpload(): Promise<{ uploadUrl: string; key: string }> {
    throw new Error("BLOB_READ_WRITE_TOKEN is not configured");
  }

  async getMetadata(): Promise<FileRecord | null> {
    throw new Error("BLOB_READ_WRITE_TOKEN is not configured");
  }

  async createAuthorizedReadUrl(): Promise<string> {
    throw new Error("BLOB_READ_WRITE_TOKEN is not configured");
  }

  async delete(): Promise<void> {
    throw new Error("BLOB_READ_WRITE_TOKEN is not configured");
  }
}

/**
 * Local/demo adapter. Registers private keys and metadata only — no binary
 * bytes and no public URLs. Enable with FILE_STORE=sandbox.
 */
export class SandboxFileStore implements FileStore {
  readonly name = "sandbox";
  private readonly records = new Map<string, FileRecord>();

  async createUpload(
    input: FileUploadInput,
  ): Promise<{ uploadUrl: string; key: string }> {
    const check = validateRiderUploadInput(input);
    if (!check.ok) {
      throw new Error(check.reason);
    }
    const key = `sandbox/${input.ownerUserId}/${randomUUID()}.pdf`;
    this.records.set(key, {
      key,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      checksum: input.checksum.toLowerCase(),
    });
    return {
      uploadUrl: `sandbox://intent/${key}`,
      key,
    };
  }

  async getMetadata(key: string): Promise<FileRecord | null> {
    return this.records.get(key) ?? null;
  }

  async createAuthorizedReadUrl(key: string): Promise<string> {
    if (!this.records.has(key) && !key.startsWith("sandbox/")) {
      throw new Error("Unknown rider key");
    }
    return `sandbox://read/${key}?exp=short`;
  }

  async delete(key: string): Promise<void> {
    this.records.delete(key);
  }
}

export function getFileStore(): FileStore {
  if (process.env.FILE_STORE === "sandbox") {
    return new SandboxFileStore();
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return new UnconfiguredFileStore();
  }
  // Real Vercel Blob adapter lands after token provisioning + smoke test.
  return new UnconfiguredFileStore();
}

export function isFileStoreConfigured(): boolean {
  return getFileStore().name !== "unconfigured";
}
