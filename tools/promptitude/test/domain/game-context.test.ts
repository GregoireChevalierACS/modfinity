import { describe, expect, it } from 'vitest';

import { EMPTY_CONTEXT, GameContextTracker } from '../../src/domain/game-context.js';

describe('GameContextTracker', () => {
  it('takes the country from the scope line that follows the state probe', () => {
    const tracker = new GameContextTracker();

    tracker.observe({ kind: 'state-probe' });
    tracker.observe({ kind: 'scope', countryName: 'Arborée', tag: 'ARB' });

    expect(tracker.context).toEqual({ countryName: 'Arborée', tag: 'ARB' });
  });

  it('ignores scope lines that do not follow the probe', () => {
    const tracker = new GameContextTracker();

    tracker.observe({ kind: 'scope', countryName: 'Castille', tag: 'CAS' });
    tracker.observe({ kind: 'state-probe' });
    tracker.observe(null);
    tracker.observe({ kind: 'scope', countryName: 'Aragon', tag: 'ARA' });

    expect(tracker.context).toEqual(EMPTY_CONTEXT);
  });

  it('keeps the latest country, e.g. after a tag switch', () => {
    const tracker = new GameContextTracker();

    for (const [countryName, tag] of [
      ['Arborée', 'ARB'],
      ['Sardaigne', 'SAR'],
    ] as const) {
      tracker.observe({ kind: 'state-probe' });
      tracker.observe({ kind: 'scope', countryName, tag });
    }

    expect(tracker.context.tag).toBe('SAR');
  });
});
