import { describe, expect, it } from 'vitest';

import { CompareErrorLogUseCase, SaveBaselineUseCase } from '../../src/application/error-log.js';
import type { Mod } from '../../src/domain/mod.js';
import type { BaselineRepository, GameLogs } from '../../src/ports/game-logs.js';
import type { ModRepository } from '../../src/ports/mod-repository.js';
import { modFile } from '../helpers.js';

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

class InMemoryModRepository implements ModRepository {
  constructor(private readonly mods: readonly Mod[]) {}

  listModNames(): Promise<string[]> {
    return Promise.resolve(this.mods.map((mod) => mod.name));
  }

  load(modName: string): Promise<Mod> {
    const mod = this.mods.find((candidate) => candidate.name === modName);
    return mod === undefined ? Promise.reject(new Error(modName)) : Promise.resolve(mod);
  }
}

const scholarMod: Mod = { name: 'travelling_scholar', files: [modFile('in_game/events/modfinity_scholar.txt', '')] };

describe('SaveBaselineUseCase', () => {
  it('saves the distinct messages of the last session under the game version', async () => {
    const baselines = new InMemoryBaselineRepository();

    const result = await new SaveBaselineUseCase(new FakeGameLogs('[10:00:00]a\n[10:00:01]a\n'), baselines).execute();

    expect(result).toEqual({ gameVersion: '1.3.11', messageCount: 1, location: 'memory:1.3.11' });
    expect(baselines.saved.get('1.3.11')).toEqual(['a']);
  });
});

describe('CompareErrorLogUseCase', () => {
  it('reports new messages, grouped by mod when they mention one', async () => {
    const baselines = new InMemoryBaselineRepository();
    await baselines.save('1.3.11', ['vanilla']);
    const log = 'vanilla\nScript location: events/modfinity_scholar.txt:3\nnew vanilla noise\n';
    const useCase = new CompareErrorLogUseCase(new FakeGameLogs(log), baselines, new InMemoryModRepository([scholarMod]));

    expect(await useCase.execute()).toEqual({
      gameVersion: '1.3.11',
      totalLines: 3,
      byMod: [
        {
          modName: 'travelling_scholar',
          errors: [{ message: 'Script location: events/modfinity_scholar.txt:3', occurrences: 1 }],
        },
      ],
      unattributed: [{ message: 'new vanilla noise', occurrences: 1 }],
    });
  });

  it('fails with guidance when no baseline exists for the game version', async () => {
    const useCase = new CompareErrorLogUseCase(
      new FakeGameLogs('x', '1.4.0'),
      new InMemoryBaselineRepository(),
      new InMemoryModRepository([]),
    );

    await expect(useCase.execute()).rejects.toThrow('no baseline for game version 1.4.0');
  });
});
