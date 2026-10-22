import { describe, expect, it } from 'vitest';

import { LintModsUseCase } from '../../src/application/lint-mods.js';
import type { Mod } from '../../src/domain/mod.js';
import type { ScriptKnowledge } from '../../src/domain/knowledge/script-knowledge.js';
import type { ConfigRepository, LintConfig } from '../../src/ports/config-repository.js';
import type { KnowledgeRepository } from '../../src/ports/knowledge-repository.js';
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

class FixedKnowledgeRepository implements KnowledgeRepository {
  constructor(private readonly knowledge: ScriptKnowledge | null) {}

  load(): Promise<ScriptKnowledge | null> {
    return Promise.resolve(this.knowledge);
  }
}

const EMPTY_KNOWLEDGE: ScriptKnowledge = {
  effects: new Set(),
  triggers: new Set(),
  links: new Set(),
  scriptedEffects: new Set(),
  scriptedTriggers: new Set(),
  scriptValues: new Set(),
  scriptedLists: new Set(),
};

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

function setup(mods: readonly Mod[], config: LintConfig, knowledge: ScriptKnowledge | null = null) {
  const reporter = new RecordingReporter();
  const useCase = new LintModsUseCase(
    new InMemoryModRepository(mods),
    new FixedConfigRepository(config),
    new FixedKnowledgeRepository(knowledge),
    reporter,
  );
  return { useCase, reporter };
}

describe('LintModsUseCase', () => {
  it('reports a clean mod with no errors', async () => {
    const { useCase, reporter } = setup([cleanMod], { requiredLanguages: ['english'], mods: {} }, EMPTY_KNOWLEDGE);

    const report = await useCase.execute();

    expect(report).toEqual({
      results: [{ modName: 'clean', diagnostics: [] }],
      errorCount: 0,
      warningCount: 0,
      notes: [],
    });
    expect(reporter.reports).toEqual([report]);
  });

  it('skips unknown-keywords with a note when the game docs are unavailable', async () => {
    const { useCase } = setup([modUsingLegitimacy], { requiredLanguages: ['english'], mods: {} });

    const report = await useCase.execute();

    expect(report.errorCount).toBe(0);
    expect(report.notes).toEqual(['unknown-keywords skipped: game script docs not found (run script_docs in game)']);
  });

  it('flags unknown keywords when the game docs are available', async () => {
    const { useCase } = setup([modUsingLegitimacy], { requiredLanguages: ['english'], mods: {} }, EMPTY_KNOWLEDGE);

    const report = await useCase.execute();

    expect(report.results[0]?.diagnostics.map((diagnostic) => diagnostic.ruleId)).toEqual(['unknown-keywords']);
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
