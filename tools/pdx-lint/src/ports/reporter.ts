import type { Diagnostic } from '../domain/diagnostic.js';

export interface ModLintResult {
  readonly modName: string;
  readonly diagnostics: readonly Diagnostic[];
}

export interface LintReport {
  readonly results: readonly ModLintResult[];
  readonly errorCount: number;
  readonly warningCount: number;
}

export interface Reporter {
  report(report: LintReport): void;
}
