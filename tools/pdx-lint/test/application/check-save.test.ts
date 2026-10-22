import { describe, expect, it } from 'vitest';

import { CheckSaveUseCase } from '../../src/application/check-save.js';
import type { ConfigRepository, LintConfig } from '../../src/ports/config-repository.js';
import type { SaveGames } from '../../src/ports/save-games.js';

class InMemorySaveGames implements SaveGames {
  readonly linesRead: string[] = [];

  constructor(private readonly saves: Readonly<Record<string, string>>) {}

  latest(): Promise<string | null> {
    return Promise.resolve(Object.keys(this.saves).at(-1) ?? null);
  }

  async *readLines(save: string): AsyncIterable<string> {
    for (const line of (this.saves[save] ?? '').split('\n')) {
      await Promise.resolve();
      this.linesRead.push(line);
      yield line;
    }
  }
}

class FixedConfigRepository implements ConfigRepository {
  constructor(private readonly config: LintConfig) {}

  load(): Promise<LintConfig> {
    return Promise.resolve(this.config);
  }
}

function save(...countries: [tag: string, government: string, visited: boolean][]): string {
  const entries = countries.map(
    ([tag, government, visited], index) => `${index}={
	flag="${tag}"
	owned_locations={${index}}
	government={
		type=${government}
	}
	variables={
		data={ {
				flag=${visited ? 'visited' : 'other'}
			} }
	}
}`,
  );
  return ['countries={', '\tdatabase={', ...entries, '\t}', '}', 'population={', '\tlots_of_data=1', '}'].join('\n');
}

const config: LintConfig = {
  requiredLanguages: ['english'],
  mods: {
    scholar: { forbiddenEffects: [], saveChecks: [{ variable: 'visited', requiredGovernments: ['monarchy', 'republic'] }] },
    other: { forbiddenEffects: [], saveChecks: [] },
  },
};

describe('CheckSaveUseCase', () => {
  it('checks the latest save against each mod expectations', async () => {
    const saves = new InMemorySaveGames({
      old: save(['FRA', 'monarchy', false]),
      latest: save(['FRA', 'monarchy', true], ['VEN', 'republic', true]),
    });

    const report = await new CheckSaveUseCase(saves, new FixedConfigRepository(config)).execute();

    expect(report.save).toBe('latest');
    expect(report.countryCount).toBe(2);
    expect(report.passed).toBe(true);
    expect(report.mods.map((mod) => mod.modName)).toEqual(['scholar']);
  });

  it('fails when a required government was never visited', async () => {
    const saves = new InMemorySaveGames({ only: save(['FRA', 'monarchy', true], ['VEN', 'republic', false]) });

    const report = await new CheckSaveUseCase(saves, new FixedConfigRepository(config)).execute();

    expect(report.passed).toBe(false);
    expect(report.mods[0]?.results[0]?.missingGovernments).toEqual(['republic']);
  });

  it('stops reading once the countries are known', async () => {
    const saves = new InMemorySaveGames({ only: save(['FRA', 'monarchy', true]) });

    await new CheckSaveUseCase(saves, new FixedConfigRepository(config)).execute('only');

    expect(saves.linesRead).not.toContain('\tlots_of_data=1');
  });

  it('explains when no save or no country can be found', async () => {
    const useCase = (saves: Record<string, string>) => new CheckSaveUseCase(new InMemorySaveGames(saves), new FixedConfigRepository(config));

    await expect(useCase({}).execute()).rejects.toThrow('no save found');
    await expect(useCase({ binary: 'not a text save' }).execute()).rejects.toThrow('only plain-text saves');
  });
});
