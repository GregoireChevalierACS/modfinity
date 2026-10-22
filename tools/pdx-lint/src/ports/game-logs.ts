/** Logs written by the game in the user's documents. */
export interface GameLogs {
  readErrorLog(): Promise<string>;
  /** Game version of the last session, e.g. "1.3.11". */
  readGameVersion(): Promise<string>;
}

/** Vanilla error.log baselines, one per game version. */
export interface BaselineRepository {
  load(gameVersion: string): Promise<string[] | null>;
  /** Returns where the baseline was saved. */
  save(gameVersion: string, messages: readonly string[]): Promise<string>;
}
