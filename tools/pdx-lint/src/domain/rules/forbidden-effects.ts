import type { Diagnostic } from '../diagnostic.js';
import type { ModAnalysis } from '../mod-analysis.js';
import { walkProperties } from '../paradox-script/ast.js';
import type { Rule } from './rule.js';

/** Bans a mod-specific list of effects, e.g. government-specific ones in a government-agnostic mod. */
export function forbiddenEffectsRule(forbiddenEffects: readonly string[]): Rule {
  const id = 'forbidden-effects';
  const forbidden = new Set(forbiddenEffects);

  return {
    id,
    description: 'Some effects are banned by the mod configuration.',
    check({ scripts }: ModAnalysis): Diagnostic[] {
      return scripts.flatMap(({ file, root }) =>
        [...walkProperties(root)]
          .filter((property) => forbidden.has(property.key))
          .map(
            (property): Diagnostic => ({
              ruleId: id,
              severity: 'error',
              filePath: file.relativePath,
              line: property.line,
              message: `effect '${property.key}' is forbidden in this mod`,
            }),
          ),
      );
    },
  };
}
