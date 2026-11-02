import { describe, expect, it } from 'vitest';

import { buildAdvisorPrompt, fitAnswer, MAX_ANSWER_LENGTH } from '../../src/domain/advisor-prompt.js';
import { EMPTY_CONTEXT } from '../../src/domain/game-context.js';

describe('buildAdvisorPrompt', () => {
  it('includes the question and the known country', () => {
    const prompt = buildAdvisorPrompt('Que faire face à la peste ?', { countryName: 'Arborée', tag: 'ARB' });

    expect(prompt).toContain('« Que faire face à la peste ? »');
    expect(prompt).toContain('Arborée (tag ARB)');
  });

  it('says when the country is not known yet', () => {
    expect(buildAdvisorPrompt('?', EMPTY_CONTEXT)).toContain('inconnu pour l\'instant');
  });

  it('adds the knowledge cards as facts to rely on', () => {
    const prompt = buildAdvisorPrompt('?', EMPTY_CONTEXT, '- [Biens (goods)] goods_gold (Or): default_market_price=8');

    expect(prompt).toContain('Ce sont des faits exacts');
    expect(prompt).toContain('goods_gold (Or): default_market_price=8');
  });

  it('has no knowledge section without cards', () => {
    expect(buildAdvisorPrompt('?', EMPTY_CONTEXT)).not.toContain('Fiches extraites');
  });

  it('forbids titles that assume a monarchy', () => {
    expect(buildAdvisorPrompt('?', EMPTY_CONTEXT)).toContain('n\'emploie aucun titre');
  });
});

describe('fitAnswer', () => {
  it('keeps short answers, trimmed', () => {
    expect(fitAnswer('  Réponse.  ')).toBe('Réponse.');
  });

  it('cuts long answers with an ellipsis', () => {
    const fitted = fitAnswer('a'.repeat(MAX_ANSWER_LENGTH + 50));

    expect(fitted).toHaveLength(MAX_ANSWER_LENGTH);
    expect(fitted.endsWith('…')).toBe(true);
  });
});
