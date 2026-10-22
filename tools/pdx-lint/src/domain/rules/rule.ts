import type { Diagnostic } from '../diagnostic.js';
import type { ModAnalysis } from '../mod-analysis.js';

/** A single, independent check over an analyzed mod (Strategy pattern). */
export interface Rule {
  readonly id: string;
  readonly description: string;
  check(analysis: ModAnalysis): Diagnostic[];
}
