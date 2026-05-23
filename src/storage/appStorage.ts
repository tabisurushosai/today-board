import type { AppState, AppStatePatch } from "../core/types";

export type StorageRecord = Record<string, unknown>;
export type SerializedAppStatePatch = Record<string, string | null>;

export interface AppStorage {
  load(): Promise<AppState>;
  save(patch: AppStatePatch): Promise<void>;
}
