import type { Diagnostic } from '../domain/diagnostic.js';

export interface ModLintResult {
  readonly modName: string;
  readonly diagnostics: readonly Diagnostic[];
}

export interface LintReport {
  readonly results: readonly ModLintResult[];
  readonly errorCount: number;
  readonly warningCount: number;
  /** Informational messages, e.g. a rule skipped because its data is missing. */
  readonly notes: readonly string[];
}

export interface Reporter {
  report(report: LintReport): void;
}
