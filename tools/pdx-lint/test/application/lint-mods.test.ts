import { describe, expect, it } from 'vitest';

import { LintModsUseCase } from '../../src/application/lint-mods.js';
import type { Mod } from '../../src/domain/mod.js';
import type { ConfigRepository, LintConfig } from '../../src/ports/config-repository.js';
import type { ModRepository } from '../../src/ports/mod-repository.js';
import type { LintReport, Reporter } from '../../src/ports/reporter.js';
import { ENGLISH_EVENT_LOC, modFile, VALID_EVENT } from '../helpers.js';

class InMemoryModRepository implements ModRepository {
  constructor(private readonly mods: readonly Mod[]) {}

  listModNames(): Promise<string[]> {
    return Promise.resolve(this.mods.map((mod) => mod.name));
  }

  load(modName: string): Promise<Mod> {
    const mod = this.mods.find((candidate) => candidate.name === modName);
    return mod === undefined ? Promise.reject(new Error(`unknown mod ${modName}`)) : Promise.resolve(mod);
  }
}

class FixedConfigRepository implements ConfigRepository {
  constructor(private readonly config: LintConfig) {}

  load(): Promise<LintConfig> {
    return Promise.resolve(this.config);
  }
}

class RecordingReporter implements Reporter {
  readonly reports: LintReport[] = [];

  report(report: LintReport): void {
    this.reports.push(report);
  }
}

const cleanMod: Mod = {
  name: 'clean',
  files: [
    modFile('in_game/events/test.txt', VALID_EVENT),
    modFile('main_menu/localization/english/test_l_english.yml', ENGLISH_EVENT_LOC),
  ],
};

const modUsingLegitimacy: Mod = {
  name: 'generic',
  files: [modFile('in_game/common/scripted_effects/effects.txt', 'my_effect = { add_legitimacy = 5 }')],
};

function setup(mods: readonly Mod[], config: LintConfig) {
  const reporter = new RecordingReporter();
  const useCase = new LintModsUseCase(new InMemoryModRepository(mods), new FixedConfigRepository(config), reporter);
  return { useCase, reporter };
}

describe('LintModsUseCase', () => {
  it('reports a clean mod with no errors', async () => {
    const { useCase, reporter } = setup([cleanMod], { requiredLanguages: ['english'], mods: {} });

    const report = await useCase.execute();

    expect(report).toEqual({ results: [{ modName: 'clean', diagnostics: [] }], errorCount: 0, warningCount: 0 });
    expect(reporter.reports).toEqual([report]);
  });

  it('applies the per-mod configuration only to that mod', async () => {
    const config: LintConfig = {
      requiredLanguages: ['english'],
      mods: { generic: { forbiddenEffects: ['add_legitimacy'] } },
    };
    const otherModUsingLegitimacy: Mod = { ...modUsingLegitimacy, name: 'other' };
    const { useCase } = setup([modUsingLegitimacy, otherModUsingLegitimacy], config);

    const report = await useCase.execute();

    expect(report.errorCount).toBe(1);
    expect(report.results.map((result) => [result.modName, result.diagnostics.length])).toEqual([
      ['generic', 1],
      ['other', 0],
    ]);
  });

  it('lints only the requested mods', async () => {
    const { useCase } = setup([cleanMod, modUsingLegitimacy], { requiredLanguages: ['english'], mods: {} });

    const report = await useCase.execute(['clean']);

    expect(report.results.map((result) => result.modName)).toEqual(['clean']);
  });
});
