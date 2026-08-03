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
  createUpload(
    input: FileUploadInput,
  ): Promise<{ uploadUrl: string; key: string }>;
  getMetadata(key: string): Promise<FileRecord | null>;
  createAuthorizedReadUrl(key: string): Promise<string>;
  delete(key: string): Promise<void>;
}

export class UnconfiguredFileStore implements FileStore {
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

export function getFileStore(): FileStore {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return new UnconfiguredFileStore();
  }
  // Blob adapter is provisioned when the rider-upload slice begins.
  return new UnconfiguredFileStore();
}
