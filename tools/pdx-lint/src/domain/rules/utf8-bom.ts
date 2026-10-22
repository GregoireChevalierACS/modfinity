import type { Diagnostic } from '../diagnostic.js';
import { isLocalization, isScript, type ModAnalysis } from '../mod-analysis.js';
import { hasUtf8Bom } from '../mod.js';
import type { Rule } from './rule.js';

export const utf8BomRule: Rule = {
  id: 'utf8-bom',
  description: 'Script and localization files must be encoded in UTF-8 with BOM, like vanilla files.',
  check({ mod }: ModAnalysis): Diagnostic[] {
    return mod.files
      .filter((file) => (isScript(file) || isLocalization(file)) && !hasUtf8Bom(file))
      .map((file) => ({
        ruleId: utf8BomRule.id,
        severity: 'error',
        filePath: file.relativePath,
        message: 'file must be encoded in UTF-8 with BOM',
      }));
  },
};
