/** Save files written by the game. */
export interface SaveGames {
  /** Most recent save, or null when there is none. */
  latest(): Promise<string | null>;
  /** Lines of a save, streamed: saves weigh hundreds of MB. */
  readLines(save: string): AsyncIterable<string>;
}
