export interface ModLintConfig {
  readonly forbiddenEffects: readonly string[];
}

export interface LintConfig {
  readonly requiredLanguages: readonly string[];
  readonly mods: Readonly<Record<string, ModLintConfig>>;
}

export interface ConfigRepository {
  load(): Promise<LintConfig>;
}
