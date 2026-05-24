export type StorageKey = string;
export type StorageValue = string | null;
export type StorageRecord = Readonly<Partial<Record<StorageKey, unknown>>>;
export type StoragePatch = Readonly<Partial<Record<StorageKey, StorageValue>>>;

/**
 * Platform-neutral boundary for raw app-owned key/value storage.
 * Platform adapters may wrap Chrome storage or native storage, but core code
 * should only see the serialized records produced through this interface.
 */
export interface StorageAdapter {
  read(keys: readonly StorageKey[]): Promise<StorageRecord>;
  write(patch: StoragePatch): Promise<void>;
}
