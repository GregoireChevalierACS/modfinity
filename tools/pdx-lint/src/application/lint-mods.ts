import { lintMod } from '../domain/lint.js';
import { createRules } from '../domain/rules/index.js';
import type { ConfigRepository } from '../ports/config-repository.js';
import type { KnowledgeRepository } from '../ports/knowledge-repository.js';
import type { ModRepository } from '../ports/mod-repository.js';
import type { LintReport, ModLintResult, Reporter } from '../ports/reporter.js';

export class LintModsUseCase {
  constructor(
    private readonly mods: ModRepository,
    private readonly config: ConfigRepository,
    private readonly knowledge: KnowledgeRepository,
    private readonly reporter: Reporter,
  ) {}

  /** Lints every mod (or only `modNames`), reports the result and returns it. */
  async execute(modNames?: readonly string[]): Promise<LintReport> {
    const [config, knowledge] = await Promise.all([this.config.load(), this.knowledge.load()]);
    const names = modNames ?? (await this.mods.listModNames());

    const results: ModLintResult[] = [];
    for (const modName of names) {
      const rules = createRules({
        requiredLanguages: config.requiredLanguages,
        forbiddenEffects: config.mods[modName]?.forbiddenEffects ?? [],
        knowledge,
      });
      results.push({ modName, diagnostics: lintMod(await this.mods.load(modName), rules) });
    }

    const diagnostics = results.flatMap((result) => result.diagnostics);
    const report: LintReport = {
      results,
      errorCount: diagnostics.filter((diagnostic) => diagnostic.severity === 'error').length,
      warningCount: diagnostics.filter((diagnostic) => diagnostic.severity === 'warning').length,
      notes: knowledge === null ? ['unknown-keywords skipped: game script docs not found (run script_docs in game)'] : [],
    };
    this.reporter.report(report);
    return report;
  }
}
