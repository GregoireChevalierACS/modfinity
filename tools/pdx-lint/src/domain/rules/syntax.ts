import type { Diagnostic } from '../diagnostic.js';
import type { ModAnalysis } from '../mod-analysis.js';
import type { Rule } from './rule.js';

export const syntaxRule: Rule = {
  id: 'syntax',
  description: 'Script and localization files must be well-formed.',
  check({ scripts, localizations }: ModAnalysis): Diagnostic[] {
    const scriptErrors = scripts.flatMap(({ file, syntaxErrors }) =>
      syntaxErrors.map((error) => toDiagnostic(file.relativePath, error)),
    );
    const localizationErrors = localizations.flatMap(({ file, content }) =>
      content.errors.map((error) => toDiagnostic(file.relativePath, error)),
    );
    return [...scriptErrors, ...localizationErrors];
  },
};

function toDiagnostic(filePath: string, error: { line: number; message: string }): Diagnostic {
  return { ruleId: syntaxRule.id, severity: 'error', filePath, line: error.line, message: error.message };
}
