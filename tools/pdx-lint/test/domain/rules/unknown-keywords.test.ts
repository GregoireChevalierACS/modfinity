import { describe, expect, it } from 'vitest';

import type { ScriptKnowledge } from '../../../src/domain/knowledge/script-knowledge.js';
import { unknownKeywordsRule } from '../../../src/domain/rules/unknown-keywords.js';
import { analyze, modFile } from '../../helpers.js';

const knowledge: ScriptKnowledge = {
  effects: new Set(['add_gold', 'set_variable', 'every_country', 'hidden_effect', 'random_list', 'trigger_event']),
  triggers: new Set(['gold', 'is_ai', 'has_variable', 'any_country', 'always']),
  links: new Set(['capital', 'owner']),
  scriptedEffects: new Set(['vanilla_effect']),
  scriptedTriggers: new Set(['vanilla_trigger']),
  scriptValues: new Set(['vanilla_value']),
  scriptedLists: new Set(['courtier']),
};
const rule = unknownKeywordsRule(knowledge);

function unknowns(path: string, source: string, ...extraFiles: ReturnType<typeof modFile>[]): string[] {
  return rule.check(analyze(modFile(path, source), ...extraFiles)).map((diagnostic) => diagnostic.message);
}

function eventWith(body: string): string {
  return `namespace = test\ntest.1 = {\n${body}\n}`;
}

const EVENT = 'in_game/events/test.txt';

describe('unknown-keywords', () => {
  it('accepts documented effects and triggers in their context', () => {
    const source = eventWith(`
	trigger = { is_ai = no gold > 10 }
	immediate = { set_variable = { name = seen days = 7300 } }
	option = { name = test.1.a add_gold = 5 }`);

    expect(unknowns(EVENT, source)).toEqual([]);
  });

  it('reports a trigger used as effect and an effect used as trigger', () => {
    const source = eventWith(`
	trigger = { add_gold = 5 }
	immediate = { is_ai = no }`);

    expect(unknowns(EVENT, source)).toEqual(["unknown trigger 'add_gold'", "unknown effect 'is_ai'"]);
  });

  it('reports a typo with its line', () => {
    const diagnostics = rule.check(analyze(modFile(EVENT, eventWith('\ttrigger = { is_at_war = no }'))));

    expect(diagnostics).toMatchObject([{ line: 3, message: "unknown trigger 'is_at_war'" }]);
  });

  it('does not check the parameters of an effect', () => {
    expect(unknowns(EVENT, eventWith('\timmediate = { set_variable = { name = x value = yes days = 10 } }'))).toEqual([]);
  });

  it('checks inside logical operators, conditionals and iterators', () => {
    const source = eventWith(`
	trigger = { OR = { is_ai = yes bogus_trigger = yes } any_country = { count > 2 gold > 1 } }
	immediate = {
		if = { limit = { is_ai = no } add_gold = 1 }
		else = { bogus_effect = yes }
		every_country = { limit = { gold > 1 } add_gold = 1 }
		hidden_effect = { add_gold = 1 }
		random_list = { 50 = { desc = x add_gold = 1 } 50 = { trigger = { is_ai = yes } } }
	}`);

    expect(unknowns(EVENT, source)).toEqual(["unknown trigger 'bogus_trigger'", "unknown effect 'bogus_effect'"]);
  });

  it('descends into scope links and prefixed scopes', () => {
    const source = eventWith(`
	trigger = { capital = { bogus_inner = yes } c:FRA ?= { is_ai = no } scope:target.owner = { gold > 1 } }`);

    expect(unknowns(EVENT, source)).toEqual(["unknown trigger 'bogus_inner'"]);
  });

  it('accepts comparisons holding script values, function calls and reversed numbers', () => {
    const source = eventWith(`
	trigger = {
		gold > { value = 10 multiply = 2 }
		50 <= { value = gold }
		gold(root) > 1
		vanilla_value > 3
	}`);

    expect(unknowns(EVENT, source)).toEqual([]);
  });

  it('accepts option fields and flags', () => {
    const source = eventWith('\toption = { name = a ai_will_select = { value = 1 } historical_option = yes evil_option = yes }');

    expect(unknowns(EVENT, source)).toEqual([]);
  });

  it('accepts vanilla scripted definitions and iterators of scripted lists', () => {
    const source = eventWith(`
	trigger = { vanilla_trigger = yes any_courtier = { is_ai = no } }
	immediate = { vanilla_effect = yes every_courtier = { add_gold = 1 } }`);

    expect(unknowns(EVENT, source)).toEqual([]);
  });

  it('accepts scripted definitions of the mod, in files or inline in event files', () => {
    const source = `namespace = test
scripted_effect inline_effect = { add_gold = 1 }
test.1 = { immediate = { mod_effect = yes inline_effect = yes } trigger = { mod_trigger = yes } }`;

    expect(
      unknowns(
        EVENT,
        source,
        modFile('in_game/common/scripted_effects/effects.txt', 'mod_effect = { add_gold = 1 }'),
        modFile('in_game/common/scripted_triggers/triggers.txt', 'mod_trigger = { always = yes }'),
      ),
    ).toEqual([]);
  });

  it('ignores parameterized keys of scripted definitions', () => {
    expect(unknowns('in_game/common/scripted_effects/e.txt', 'my_effect = { $target$ = { add_gold = 1 } }')).toEqual([]);
  });

  it('checks on_actions, scripted definitions and game tests', () => {
    expect(unknowns('in_game/common/on_action/a.txt', 'my_pulse = { trigger = { nope = yes } effect = { nope2 = yes } }')).toEqual([
      "unknown trigger 'nope'",
      "unknown effect 'nope2'",
    ]);
    expect(unknowns('in_game/common/scripted_triggers/t.txt', 'my_trigger = { nope = yes }')).toEqual([
      "unknown trigger 'nope'",
    ]);
    expect(unknowns('in_game/common/tests/t.txt', 'my_test = { year = 1400 success = { nope = yes } }')).toEqual([
      "unknown trigger 'nope'",
    ]);
  });

  it('leaves other folders alone', () => {
    expect(unknowns('in_game/common/script_values/v.txt', 'my_value = { value = 1 nope = yes }')).toEqual([]);
  });
});
