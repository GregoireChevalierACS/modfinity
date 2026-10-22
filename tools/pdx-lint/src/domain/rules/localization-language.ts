import type { Diagnostic } from '../diagnostic.js';
import type { ModAnalysis } from '../mod-analysis.js';
import type { Rule } from './rule.js';

export const localizationLanguageRule: Rule = {
  id: 'localization-language',
  description:
    'A localization file must agree on its language: folder `<lang>/`, name `*_l_<lang>.yml` and header `l_<lang>:`.',
  check({ localizations }: ModAnalysis): Diagnostic[] {
    return localizations.flatMap(({ file, folderLanguage, fileNameLanguage, content }): Diagnostic[] => {
      const diagnostic = (message: string, line?: number): Diagnostic => ({
        ruleId: localizationLanguageRule.id,
        severity: 'error',
        filePath: file.relativePath,
        ...(line === undefined ? {} : { line }),
        message,
      });

      if (fileNameLanguage === null) {
        return [diagnostic("file name must end with '_l_<language>.yml'")];
      }
      const problems: Diagnostic[] = [];
      if (folderLanguage !== fileNameLanguage) {
        problems.push(
          diagnostic(`file name language '${fileNameLanguage}' does not match folder '${folderLanguage ?? '?'}'`),
        );
      }
      if (content.language !== null && content.language !== fileNameLanguage) {
        problems.push(
          diagnostic(`header 'l_${content.language}:' does not match file name language '${fileNameLanguage}'`, 1),
        );
      }
      return problems;
    });
  },
};
