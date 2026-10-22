import type { Diagnostic } from '../diagnostic.js';
import type { ModAnalysis } from '../mod-analysis.js';
import type { Rule } from './rule.js';

/** Every localization key referenced by an event must exist in each required language. */
export function missingLocalizationRule(requiredLanguages: readonly string[]): Rule {
  const id = 'missing-localization';

  return {
    id,
    description: `Event texts must be localized in: ${requiredLanguages.join(', ')}.`,
    check({ eventFiles, localizations }: ModAnalysis): Diagnostic[] {
      const keysByLanguage = new Map<string, Set<string>>();
      for (const { content } of localizations) {
        if (content.language === null) continue;
        const keys = keysByLanguage.get(content.language) ?? new Set<string>();
        content.entries.forEach((entry) => keys.add(entry.key));
        keysByLanguage.set(content.language, keys);
      }

      return eventFiles.flatMap(({ events }) =>
        events.flatMap((event) =>
          event.localizationKeys.flatMap((reference) =>
            requiredLanguages
              .filter((language) => !keysByLanguage.get(language)?.has(reference.key))
              .map(
                (language): Diagnostic => ({
                  ruleId: id,
                  severity: 'error',
                  filePath: event.filePath,
                  line: reference.line,
                  message: `localization key '${reference.key}' is missing in ${language}`,
                }),
              ),
          ),
        ),
      );
    },
  };
}
