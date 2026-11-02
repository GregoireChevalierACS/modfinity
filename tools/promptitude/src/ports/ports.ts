import type { ModFile } from '../domain/answer-panel.js';

/** Lines appended to the game's debug.log, as they are written. */
export interface LogSource {
  /** Lines already in the log when the companion starts (used to recover the game context). */
  history(): Promise<string[]>;
  /** New lines, until `stop()` is called. */
  follow(): AsyncIterable<string>;
  stop(): void;
}

/** Something that answers a prompt (Claude through the user's subscription, an API, a fake...). */
export interface AnswerProvider {
  answer(prompt: string): Promise<string>;
}

/** Files of the mod that the game reloads while it runs. */
export interface ModFileWriter {
  write(files: readonly ModFile[]): Promise<void>;
}

/** What the companion tells the user while it runs. */
export interface CompanionReporter {
  info(message: string): void;
  error(message: string): void;
}
