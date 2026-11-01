import type { LogEvent } from './log-events.js';

/** What the companion knows about the player's game. Grows as the mod writes more to the log. */
export interface GameContext {
  readonly countryName: string | null;
  readonly tag: string | null;
}

export const EMPTY_CONTEXT: GameContext = { countryName: null, tag: null };

/**
 * Builds the context from the mod's probe: a "PROMPTITUDE|state" line followed by
 * the scope line naming the player's country.
 */
export class GameContextTracker {
  private current: GameContext = EMPTY_CONTEXT;
  private expectingScope = false;

  get context(): GameContext {
    return this.current;
  }

  observe(event: LogEvent | null): void {
    if (event?.kind === 'state-probe') {
      this.expectingScope = true;
      return;
    }
    if (event?.kind === 'scope' && this.expectingScope) {
      this.current = { countryName: event.countryName, tag: event.tag };
    }
    this.expectingScope = false;
  }
}
