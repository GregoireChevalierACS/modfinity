import { compareWithBaseline, distinctErrors, type LogComparison } from '../domain/error-log.js';
import type { BaselineRepository, GameLogs } from '../ports/game-logs.js';

export interface SavedBaseline {
  readonly gameVersion: string;
  readonly messageCount: number;
  readonly location: string;
}

/** To run right after a session played without any mod. */
export class SaveBaselineUseCase {
  constructor(
    private readonly logs: GameLogs,
    private readonly baselines: BaselineRepository,
  ) {}

  async execute(): Promise<SavedBaseline> {
    const [gameVersion, errorLog] = await Promise.all([this.logs.readGameVersion(), this.logs.readErrorLog()]);
    const messages = distinctErrors(errorLog);
    const location = await this.baselines.save(gameVersion, messages);
    return { gameVersion, messageCount: messages.length, location };
  }
}

export interface ErrorLogReport extends LogComparison {
  readonly gameVersion: string;
}

/** Lists the errors of the last session that the vanilla baseline does not explain. */
export class CompareErrorLogUseCase {
  constructor(
    private readonly logs: GameLogs,
    private readonly baselines: BaselineRepository,
  ) {}

  async execute(): Promise<ErrorLogReport> {
    const [gameVersion, errorLog] = await Promise.all([this.logs.readGameVersion(), this.logs.readErrorLog()]);
    const baseline = await this.baselines.load(gameVersion);
    if (baseline === null) {
      throw new Error(`no baseline for game version ${gameVersion}: play a session without mods, then run save-baseline`);
    }
    return { gameVersion, ...compareWithBaseline(errorLog, baseline) };
  }
}
