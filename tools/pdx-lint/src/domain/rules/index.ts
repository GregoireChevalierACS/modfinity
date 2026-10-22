import { eventIdsRule } from './event-ids.js';
import { forbiddenEffectsRule } from './forbidden-effects.js';
import { localizationLanguageRule } from './localization-language.js';
import { localizationRootScopeRule } from './localization-root-scope.js';
import { missingLocalizationRule } from './missing-localization.js';
import type { Rule } from './rule.js';
import { syntaxRule } from './syntax.js';
import { utf8BomRule } from './utf8-bom.js';

export interface RuleOptions {
  readonly requiredLanguages: readonly string[];
  readonly forbiddenEffects: readonly string[];
}

export function createRules(options: RuleOptions): Rule[] {
  return [
    syntaxRule,
    utf8BomRule,
    localizationLanguageRule,
    eventIdsRule,
    missingLocalizationRule(options.requiredLanguages),
    localizationRootScopeRule,
    forbiddenEffectsRule(options.forbiddenEffects),
  ];
}

export type { Rule } from './rule.js';
