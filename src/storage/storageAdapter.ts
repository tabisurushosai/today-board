export type StorageRecord = Record<string, unknown>;
export type StoragePatch = Record<string, string | null>;

export interface StorageAdapter {
  readAll(): Promise<StorageRecord>;
  write(patch: StoragePatch): Promise<void>;
}
