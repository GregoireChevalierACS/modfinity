import { lintMod } from '../domain/lint.js';
import { createRules } from '../domain/rules/index.js';
import type { ConfigRepository } from '../ports/config-repository.js';
import type { ModRepository } from '../ports/mod-repository.js';
import type { LintReport, ModLintResult, Reporter } from '../ports/reporter.js';

export class LintModsUseCase {
  constructor(
    private readonly mods: ModRepository,
    private readonly config: ConfigRepository,
    private readonly reporter: Reporter,
  ) {}

  /** Lints every mod (or only `modNames`), reports the result and returns it. */
  async execute(modNames?: readonly string[]): Promise<LintReport> {
    const config = await this.config.load();
    const names = modNames ?? (await this.mods.listModNames());

    const results: ModLintResult[] = [];
    for (const modName of names) {
      const rules = createRules({
        requiredLanguages: config.requiredLanguages,
        forbiddenEffects: config.mods[modName]?.forbiddenEffects ?? [],
      });
      results.push({ modName, diagnostics: lintMod(await this.mods.load(modName), rules) });
    }

    const diagnostics = results.flatMap((result) => result.diagnostics);
    const report: LintReport = {
      results,
      errorCount: diagnostics.filter((diagnostic) => diagnostic.severity === 'error').length,
      warningCount: diagnostics.filter((diagnostic) => diagnostic.severity === 'warning').length,
    };
    this.reporter.report(report);
    return report;
  }
}
