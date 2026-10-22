export type Severity = 'error' | 'warning';

export interface Diagnostic {
  readonly ruleId: string;
  readonly severity: Severity;
  /** Path relative to the mod root, with forward slashes. */
  readonly filePath: string;
  /** 1-based line, when the problem can be located. */
  readonly line?: number;
  readonly message: string;
}
