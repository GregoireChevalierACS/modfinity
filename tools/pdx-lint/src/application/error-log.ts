import { attributeToMods, compareWithBaseline, distinctErrors, type AttributedErrors } from '../domain/error-log.js';
import type { BaselineRepository, GameLogs } from '../ports/game-logs.js';
import type { ModRepository } from '../ports/mod-repository.js';

export interface SavedBaseline {
  readonly gameVersion: string;
  readonly messageCount: number;
  /** Messages this session added to the existing baseline. */
  readonly addedCount: number;
  readonly location: string;
}

/**
 * To run right after a session played without any mod. Vanilla noise depends on what happened in the
 * session, so the baseline accumulates the messages of every such session unless `replace` is set.
 */
export class SaveBaselineUseCase {
  constructor(
    private readonly logs: GameLogs,
    private readonly baselines: BaselineRepository,
  ) {}

  async execute({ replace = false } = {}): Promise<SavedBaseline> {
    const [gameVersion, errorLog] = await Promise.all([this.logs.readGameVersion(), this.logs.readErrorLog()]);
    const existing = replace ? [] : ((await this.baselines.load(gameVersion)) ?? []);
    const messages = [...new Set([...existing, ...distinctErrors(errorLog)])].sort();
    const location = await this.baselines.save(gameVersion, messages);
    return { gameVersion, messageCount: messages.length, addedCount: messages.length - existing.length, location };
  }
}

export interface ErrorLogReport extends AttributedErrors {
  readonly gameVersion: string;
  readonly totalLines: number;
}

/** Lists the errors of the last session that the vanilla baseline does not explain, grouped by mod. */
export class CompareErrorLogUseCase {
  constructor(
    private readonly logs: GameLogs,
    private readonly baselines: BaselineRepository,
    private readonly mods: ModRepository,
  ) {}

  async execute(): Promise<ErrorLogReport> {
    const [gameVersion, errorLog] = await Promise.all([this.logs.readGameVersion(), this.logs.readErrorLog()]);
    const baseline = await this.baselines.load(gameVersion);
    if (baseline === null) {
      throw new Error(`no baseline for game version ${gameVersion}: play a session without mods, then run save-baseline`);
    }

    const { totalLines, newErrors } = compareWithBaseline(errorLog, baseline);
    const mods = await Promise.all((await this.mods.listModNames()).map((name) => this.mods.load(name)));
    return { gameVersion, totalLines, ...attributeToMods(newErrors, mods) };
  }
}
