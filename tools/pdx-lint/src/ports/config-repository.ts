import type { SaveCheck } from '../domain/save/save-check.js';

export interface ModLintConfig {
  readonly forbiddenEffects: readonly string[];
  /** Expectations verified on a save by `pdx-lint check-save`. */
  readonly saveChecks: readonly SaveCheck[];
}

export interface LintConfig {
  readonly requiredLanguages: readonly string[];
  readonly mods: Readonly<Record<string, ModLintConfig>>;
}

export interface ConfigRepository {
  load(): Promise<LintConfig>;
}
