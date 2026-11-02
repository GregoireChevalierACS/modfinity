import { describe, expect, it } from 'vitest';

import type { KnowledgeCard } from '../../../src/domain/knowledge/knowledge-card.js';
import { normalize, selectKnowledge } from '../../../src/domain/knowledge/knowledge-selection.js';

const card = (domain: string, id: string, name: string | null, facts = 'x=1'): KnowledgeCard => ({
  domain,
  id,
  name,
  facts,
});

const CARDS: readonly KnowledgeCard[] = [
  card('goods', 'clay', 'Argile', 'default_market_price=0.5'),
  card('goods', 'goods_gold', 'Or', 'default_market_price=8'),
  card('government_reforms', 'plutocratic_monarchy', 'Monarchie ploutocratique', 'government=monarchy'),
  card('government_reforms', 'veche_republic', 'République russe', 'government=republic'),
  card('estate_privileges', 'formal_guilds', 'Guildes officielles', 'estate=burghers_estate'),
];

describe('normalize', () => {
  it('lowers the case, removes accents and punctuation, and pads with spaces', () => {
    expect(normalize('Quel bien est le plus élevé ?')).toBe(' quel bien est le plus eleve ');
  });
});

describe('selectKnowledge', () => {
  it('includes a whole family when a keyword matches, even in the plural', () => {
    const selection = selectKnowledge('Quels biens ont le prix le plus élevé ?', CARDS);

    expect(selection.cardCount).toBe(2);
    expect(selection.text).toContain('- [Biens (goods)] goods_gold (Or): default_market_price=8');
  });

  it('includes a definition named in the question, whatever its family', () => {
    const selection = selectKnowledge('Que font les guildes officielles ?', CARDS);

    expect(selection.text).toBe(
      '- [Privilèges des ordres (estate_privileges)] formal_guilds (Guildes officielles): estate=burghers_estate',
    );
  });

  it('ranks the cards of a family by relevance to the question', () => {
    const selection = selectKnowledge('Comment devenir une république ?', CARDS);

    expect(selection.text.split('\n')[0]).toContain('veche_republic');
  });

  it('never matches names shorter than four letters ("or" is also a French word)', () => {
    expect(selectKnowledge('Je veux la paix or la guerre', CARDS).cardCount).toBe(0);
  });

  it('stays within the budget', () => {
    const many = Array.from({ length: 200 }, (_, index) => card('goods', `good_${index}`, null, 'price=1'));

    const selection = selectKnowledge('quel bien ?', many, 500);

    expect(selection.text.length).toBeLessThanOrEqual(500);
    expect(selection.cardCount).toBeGreaterThan(0);
  });

  it('returns nothing for unrelated questions', () => {
    expect(selectKnowledge('Comment gagner une guerre ?', CARDS)).toEqual({ text: '', cardCount: 0 });
  });
});
