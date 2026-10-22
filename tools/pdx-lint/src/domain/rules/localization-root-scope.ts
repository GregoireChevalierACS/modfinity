import type { Diagnostic } from '../diagnostic.js';
import type { ModAnalysis } from '../mod-analysis.js';
import type { Rule } from './rule.js';

// In EU5 localization, ROOT is a generic scope: country data must go through ROOT.GetCountry.
const COUNTRY_FUNCTION_ON_ROOT = /\[ROOT\.(GetName|GetNameWithNoTooltip|GetLongName|GetAdjective|GetFlavorRank)[^\]]*\]/g;

export const localizationRootScopeRule: Rule = {
  id: 'localization-root-scope',
  description: 'Country data in localization must be read through ROOT.GetCountry (e.g. [ROOT.GetCountry.GetName]).',
  check({ localizations }: ModAnalysis): Diagnostic[] {
    return localizations.flatMap(({ file, content }) =>
      content.entries.flatMap((entry) =>
        [...entry.value.matchAll(COUNTRY_FUNCTION_ON_ROOT)].map(
          (match): Diagnostic => ({
            ruleId: localizationRootScopeRule.id,
            severity: 'error',
            filePath: file.relativePath,
            line: entry.line,
            message: `'${match[0]}' in '${entry.key}' must be written '[ROOT.GetCountry.${match[1] ?? ''}…]'`,
          }),
        ),
      ),
    );
  },
};
