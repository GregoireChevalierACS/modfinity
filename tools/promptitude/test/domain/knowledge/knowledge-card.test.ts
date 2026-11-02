import { parseScript } from 'pdx-lint/paradox-script';
import { describe, expect, it } from 'vitest';

import { describeDefinition, formatCard } from '../../../src/domain/knowledge/knowledge-card.js';

function describe1(source: string, name: string | null = null) {
  const [entry] = parseScript(source).root.entries;
  if (entry?.kind !== 'property' || entry.value.kind !== 'block') throw new Error('not a definition');
  return describeDefinition('test', entry.key, entry.value, name);
}

describe('describeDefinition', () => {
  it('keeps top-level values', () => {
    const card = describe1('goods_gold = { method = mining category = raw_material default_market_price = 8 }', 'Or');

    expect(card).toEqual({
      domain: 'test',
      id: 'goods_gold',
      name: 'Or',
      facts: 'method=mining; category=raw_material; default_market_price=8',
    });
  });

  it('summarizes modifier blocks and skips conditions and presentation', () => {
    const card = describe1(`formal_guilds = {
	estate = burghers_estate
	potential = { has_reform = x }
	color = goods_gold
	country_modifier = { global_burghers_estate_power = 0.50 allow_guild_hall = yes }
}`);

    expect(card.facts).toBe(
      'estate=burghers_estate; country_modifier: global_burghers_estate_power=0.50, allow_guild_hall=yes',
    );
  });

  it('describes nested blocks through their modifiers, with their path', () => {
    const card = describe1(`feudal_law = {
	law_category = administrative
	by_tradition = { years = 2 country_modifier = { cultural_tradition_modifier = 0.05 } }
	by_blood = { estate_preferences = { burghers_estate } }
}`);

    expect(card.facts).toBe(
      'law_category=administrative; by_tradition.country_modifier: cultural_tradition_modifier=0.05',
    );
  });

  it('keeps comparison operators', () => {
    expect(describe1('a = { min_level >= 2 }').facts).toBe('min_level >= 2');
  });

  it('cuts very long descriptions', () => {
    const values = Array.from({ length: 100 }, (_, index) => `value_${index} = ${index}`).join(' ');

    expect(describe1(`big = { ${values} }`).facts.length).toBeLessThanOrEqual(600);
  });
});

describe('formatCard', () => {
  it('shows the displayed name when it differs from the id', () => {
    expect(formatCard({ domain: 'goods', id: 'goods_gold', name: 'Or', facts: 'price=8' })).toBe(
      'goods_gold (Or): price=8',
    );
    expect(formatCard({ domain: 'goods', id: 'clay', name: null, facts: 'price=1' })).toBe('clay: price=1');
  });
});
