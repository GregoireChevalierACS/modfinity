import type { Mod } from '../domain/mod.js';

/** Where mods come from (file system, memory…). */
export interface ModRepository {
  /** Names of the mod folders found under the mods root. */
  listModNames(): Promise<string[]>;
  load(modName: string): Promise<Mod>;
}
