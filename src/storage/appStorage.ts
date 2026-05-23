import type { AppState, AppStatePatch } from "../core/types";

export interface AppStorage {
  load(): Promise<AppState>;
  save(patch: AppStatePatch): Promise<void>;
}
