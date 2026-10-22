import type { Diagnostic } from '../diagnostic.js';
import {
  definedNames,
  inlineDefinitions,
  SCRIPTED_DEFINITION_FOLDERS,
  type ScriptedDefinitionKind,
  type ScriptKnowledge,
} from '../knowledge/script-knowledge.js';
import type { ModAnalysis, ScriptFile } from '../mod-analysis.js';
import { properties, type Block, type Property } from '../paradox-script/ast.js';
import type { Rule } from './rule.js';

type Context = 'effect' | 'trigger';

interface Vocabulary {
  readonly effects: ReadonlySet<string>;
  readonly triggers: ReadonlySet<string>;
  readonly links: ReadonlySet<string>;
}

const LOGICAL_OPERATORS = new Set(['AND', 'OR', 'NOT', 'NOR', 'NAND']);
const SCOPE_KEYWORDS = new Set(['root', 'this', 'prev', 'from', 'ROOT', 'THIS', 'PREV', 'FROM']);
const CONDITIONAL_EFFECTS = new Set(['if', 'else_if', 'else', 'while', 'hidden_effect', 'random']);
const CONDITIONAL_TRIGGERS = new Set(['trigger_if', 'trigger_else_if', 'trigger_else']);
const ITERATOR_EFFECT = /^(every|random|ordered)_/;
const ITERATOR_TRIGGER_PREFIX = 'any_';
/** Parameters of conditionals and iterators, which are neither effects nor triggers. */
const BLOCK_PARAMETERS = new Set([
  'chance', 'modifier', 'count', 'percent', 'max', 'min', 'order_by', 'position', 'check_range_bounds',
  'alternative_limit', 'weight', 'base', 'factor', 'add', 'multiply', 'list', 'variable', 'type', 'desc',
  'show_chance',
]);
const OPTION_FIELDS = new Set(['name', 'ai_will_select', 'ai_weight', 'ai_chance', 'highlight', 'fallback', 'exclusive']);
/** Option flags such as `historical_option`, `high_risk_option`, `evil_option`. */
const OPTION_FLAG_SUFFIX = '_option';
/** Function-call form: `border_distance_to(root) > 5`. */
const CALL_ARGUMENTS = /\(.*\)$/;
/** Reversed comparison: `50 <= { value = total_population }`. */
const NUMBER = /^-?\d+(\.\d+)?$/;

/**
 * Flags effects and triggers that the game does not know, based on the official script docs.
 * Only keys in effect or trigger position are checked: parameters of an effect are left alone.
 */
export function unknownKeywordsRule(knowledge: ScriptKnowledge): Rule {
  const id = 'unknown-keywords';

  return {
    id,
    description: 'Effects and triggers must exist in the game (script_docs) or be scripted in the mod.',
    check(analysis: ModAnalysis): Diagnostic[] {
      const vocabulary = buildVocabulary(knowledge, analysis);

      return analysis.scripts.flatMap((script) => {
        const checker = new KeywordChecker(id, script.file.relativePath, vocabulary);
        checker.checkFile(script);
        return checker.diagnostics;
      });
    },
  };
}

class KeywordChecker {
  readonly diagnostics: Diagnostic[] = [];

  constructor(
    private readonly ruleId: string,
    private readonly filePath: string,
    private readonly vocabulary: Vocabulary,
  ) {}

  checkFile({ root }: ScriptFile): void {
    const path = this.filePath;
    for (const definition of blockProperties(root)) {
      const body = definition.value as Block;
      if (path.startsWith('in_game/events/')) this.checkEvent(body);
      else if (path.startsWith('in_game/common/on_action/')) this.checkFields(body, { trigger: 'trigger', effect: 'effect' });
      else if (path.startsWith('in_game/common/scripted_effects/')) this.checkBlock(body, 'effect');
      else if (path.startsWith('in_game/common/scripted_triggers/')) this.checkBlock(body, 'trigger');
      else if (path.startsWith('in_game/common/tests/')) this.checkTest(body);
    }
  }

  private checkEvent(event: Block): void {
    this.checkFields(event, {
      trigger: 'trigger',
      major_trigger: 'trigger',
      immediate: 'effect',
      after: 'effect',
      on_trigger_fail: 'effect',
    });
    for (const option of blockProperties(event, 'option')) {
      for (const property of properties(option.value as Block)) {
        if (property.key === 'trigger') this.checkValue(property, 'trigger');
        else if (!OPTION_FIELDS.has(property.key) && !property.key.endsWith(OPTION_FLAG_SUFFIX)) {
          this.checkProperty(property, 'effect');
        }
      }
    }
  }

  private checkTest(test: Block): void {
    this.checkFields(test, { success: 'trigger', failure: 'trigger', success_effect: 'effect', failure_effect: 'effect' });
    for (const child of blockProperties(test, 'success_child')) {
      this.checkFields(child.value as Block, { trigger: 'trigger' });
    }
  }

  /** Checks only the listed fields of a structural block, each in its own context. */
  private checkFields(block: Block, fields: Readonly<Record<string, Context>>): void {
    for (const property of properties(block)) {
      const context = fields[property.key];
      if (context !== undefined) this.checkValue(property, context);
    }
  }

  private checkBlock(block: Block, context: Context): void {
    for (const property of properties(block)) this.checkProperty(property, context);
  }

  private checkValue(property: Property, context: Context): void {
    if (property.value.kind === 'block') this.checkBlock(property.value, context);
  }

  private checkProperty(property: Property, context: Context): void {
    const key = property.key.replace(CALL_ARGUMENTS, '');

    // Parameters of scripted effects/triggers (`$target$ = { ... }`) are only known at call time.
    if (key.includes('$') || this.isComparison(property, key, context)) return;
    if (this.visitKnown(property, key, context)) return;

    this.diagnostics.push({
      ruleId: this.ruleId,
      severity: 'error',
      filePath: this.filePath,
      line: property.line,
      message: `unknown ${context} '${key}'`,
    });
  }

  /** A comparison (`x > { value = ... multiply = 2 }`) holds a script value, not triggers. */
  private isComparison(property: Property, key: string, context: Context): boolean {
    const isComparisonOperator = property.operator !== '=' && property.operator !== '?=';
    return context === 'trigger' && isComparisonOperator && this.isKnownComparable(key);
  }

  /** Descends into the property when it is a known keyword; returns false when it is unknown. */
  private visitKnown(property: Property, key: string, context: Context): boolean {
    if (context === 'trigger') {
      if (LOGICAL_OPERATORS.has(key)) {
        this.checkValue(property, 'trigger');
        return true;
      }
      if (CONDITIONAL_TRIGGERS.has(key)) {
        this.checkInner(property, 'trigger');
        return true;
      }
      if (this.vocabulary.triggers.has(key)) {
        if (key.startsWith(ITERATOR_TRIGGER_PREFIX)) this.checkInner(property, 'trigger');
        return true;
      }
    } else {
      if (CONDITIONAL_EFFECTS.has(key)) {
        this.checkInner(property, 'effect');
        return true;
      }
      if (key === 'random_list') {
        this.checkRandomList(property);
        return true;
      }
      if (this.vocabulary.effects.has(key)) {
        if (ITERATOR_EFFECT.test(key)) this.checkInner(property, 'effect');
        return true;
      }
    }

    if (this.isScopeReference(key)) {
      this.checkValue(property, context);
      return true;
    }
    return false;
  }

  /** Body of a conditional or iterator: `limit`/`trigger` hold triggers, parameters are skipped. */
  private checkInner(property: Property, context: Context): void {
    if (property.value.kind !== 'block') return;
    for (const inner of properties(property.value)) {
      if (inner.key === 'limit' || inner.key === 'trigger') this.checkValue(inner, 'trigger');
      else if (!BLOCK_PARAMETERS.has(inner.key)) this.checkProperty(inner, context);
    }
  }

  /** `random_list = { 10 = { <effects> } 90 = { ... } }` */
  private checkRandomList(property: Property): void {
    if (property.value.kind !== 'block') return;
    for (const weighted of properties(property.value)) this.checkInner(weighted, 'effect');
  }

  private isKnownComparable(key: string): boolean {
    return NUMBER.test(key) || this.vocabulary.triggers.has(key) || this.isScopeReference(key);
  }

  private isScopeReference(key: string): boolean {
    return key.includes(':') || key.includes('.') || SCOPE_KEYWORDS.has(key) || this.vocabulary.links.has(key);
  }
}

function blockProperties(block: Block, key?: string): Property[] {
  return properties(block, key).filter((property) => property.value.kind === 'block');
}

/** Game knowledge completed with the mod's own scripted definitions. */
function buildVocabulary(knowledge: ScriptKnowledge, analysis: ModAnalysis): Vocabulary {
  const modDefinitions = (kind: ScriptedDefinitionKind): string[] =>
    analysis.scripts
      .filter(({ file }) =>
        ['in_game/', 'main_menu/'].some((layer) => file.relativePath.startsWith(layer + SCRIPTED_DEFINITION_FOLDERS[kind])),
      )
      .flatMap((script) => definedNames(script.root));
  const inline = (kind: 'scriptedEffects' | 'scriptedTriggers'): string[] =>
    analysis.scripts
      .filter(({ file }) => file.relativePath.startsWith('in_game/events/'))
      .flatMap((script) => inlineDefinitions(script.root, kind));

  const lists = [...knowledge.scriptedLists, ...modDefinitions('scriptedLists')];

  return {
    effects: new Set([
      ...knowledge.effects,
      ...knowledge.scriptedEffects,
      ...modDefinitions('scriptedEffects'),
      ...inline('scriptedEffects'),
      ...lists.flatMap((list) => [`every_${list}`, `random_${list}`, `ordered_${list}`]),
    ]),
    triggers: new Set([
      ...knowledge.triggers,
      ...knowledge.scriptedTriggers,
      ...knowledge.scriptValues,
      ...modDefinitions('scriptedTriggers'),
      ...modDefinitions('scriptValues'),
      ...inline('scriptedTriggers'),
      ...lists.map((list) => `any_${list}`),
    ]),
    links: knowledge.links,
  };
}
