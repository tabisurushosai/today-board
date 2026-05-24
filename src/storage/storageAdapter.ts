export type StorageRecord = Readonly<Record<string, unknown>>;
export type StoragePatch = Record<string, string | null>;

export interface StorageAdapter {
  read(keys: readonly string[]): Promise<StorageRecord>;
  write(patch: StoragePatch): Promise<void>;
}
