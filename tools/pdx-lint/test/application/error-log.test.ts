import { describe, expect, it } from 'vitest';

import { CompareErrorLogUseCase, SaveBaselineUseCase } from '../../src/application/error-log.js';
import type { BaselineRepository, GameLogs } from '../../src/ports/game-logs.js';

class FakeGameLogs implements GameLogs {
  constructor(
    private readonly errorLog: string,
    private readonly version = '1.3.11',
  ) {}

  readErrorLog(): Promise<string> {
    return Promise.resolve(this.errorLog);
  }

  readGameVersion(): Promise<string> {
    return Promise.resolve(this.version);
  }
}

class InMemoryBaselineRepository implements BaselineRepository {
  readonly saved = new Map<string, readonly string[]>();

  load(gameVersion: string): Promise<string[] | null> {
    const baseline = this.saved.get(gameVersion);
    return Promise.resolve(baseline === undefined ? null : [...baseline]);
  }

  save(gameVersion: string, messages: readonly string[]): Promise<string> {
    this.saved.set(gameVersion, messages);
    return Promise.resolve(`memory:${gameVersion}`);
  }
}

describe('SaveBaselineUseCase', () => {
  it('saves the distinct messages of the last session under the game version', async () => {
    const baselines = new InMemoryBaselineRepository();

    const result = await new SaveBaselineUseCase(new FakeGameLogs('[10:00:00]a\n[10:00:01]a\n'), baselines).execute();

    expect(result).toEqual({ gameVersion: '1.3.11', messageCount: 1, location: 'memory:1.3.11' });
    expect(baselines.saved.get('1.3.11')).toEqual(['a']);
  });
});

describe('CompareErrorLogUseCase', () => {
  it('reports the messages that the baseline does not explain', async () => {
    const baselines = new InMemoryBaselineRepository();
    await baselines.save('1.3.11', ['vanilla']);

    const report = await new CompareErrorLogUseCase(new FakeGameLogs('vanilla\nmod error\n'), baselines).execute();

    expect(report).toEqual({
      gameVersion: '1.3.11',
      totalLines: 2,
      newErrors: [{ message: 'mod error', occurrences: 1 }],
    });
  });

  it('fails with guidance when no baseline exists for the game version', async () => {
    const useCase = new CompareErrorLogUseCase(new FakeGameLogs('x', '1.4.0'), new InMemoryBaselineRepository());

    await expect(useCase.execute()).rejects.toThrow('no baseline for game version 1.4.0');
  });
});
