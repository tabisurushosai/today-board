import type { AppState, AppStatePatch } from "../core/types";
import { deserializeAppState, serializeAppStatePatch } from "./serialization";

export type StorageRecord = Record<string, unknown>;
export type SerializedAppStatePatch = Record<string, string | null>;

export interface StorageAdapter {
  readAll(): Promise<StorageRecord>;
  write(patch: SerializedAppStatePatch): Promise<void>;
}

export interface AppStorage {
  load(): Promise<AppState>;
  save(patch: AppStatePatch): Promise<void>;
}

export function createAppStorage(adapter: StorageAdapter): AppStorage {
  return new SerializedAppStorage(adapter);
}

class SerializedAppStorage implements AppStorage {
  constructor(private readonly adapter: StorageAdapter) {}

  async load(): Promise<AppState> {
    return deserializeAppState(await this.adapter.readAll());
  }

  async save(patch: AppStatePatch): Promise<void> {
    await this.adapter.write(serializeAppStatePatch(patch));
  }
}
