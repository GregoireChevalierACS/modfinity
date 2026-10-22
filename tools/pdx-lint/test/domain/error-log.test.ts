import { describe, expect, it } from 'vitest';

import { compareWithBaseline, distinctErrors } from '../../src/domain/error-log.js';

const LOG = `[12:00:01][gui.cpp:1]: vanilla noise
[12:00:02][gui.cpp:1]: vanilla noise
[12:00:03][script.cpp:9]: Unknown effect in my_mod

[12:00:04][script.cpp:9]: Unknown effect in my_mod
[12:00:05][loc.cpp:3]: Missing key modfinity.1.title
`;

describe('distinctErrors', () => {
  it('drops timestamps, blank lines and duplicates, then sorts', () => {
    expect(distinctErrors(LOG)).toEqual([
      '[gui.cpp:1]: vanilla noise',
      '[loc.cpp:3]: Missing key modfinity.1.title',
      '[script.cpp:9]: Unknown effect in my_mod',
    ]);
  });

  it('handles Windows line endings', () => {
    expect(distinctErrors('[12:00:01]a\r\n[12:00:02]b\r\n')).toEqual(['a', 'b']);
  });
});

describe('compareWithBaseline', () => {
  it('lists messages missing from the baseline, most frequent first', () => {
    expect(compareWithBaseline(LOG, ['[gui.cpp:1]: vanilla noise'])).toEqual({
      totalLines: 5,
      newErrors: [
        { message: '[script.cpp:9]: Unknown effect in my_mod', occurrences: 2 },
        { message: '[loc.cpp:3]: Missing key modfinity.1.title', occurrences: 1 },
      ],
    });
  });

  it('finds nothing new when the log only contains baseline messages', () => {
    expect(compareWithBaseline(LOG, distinctErrors(LOG)).newErrors).toEqual([]);
  });
});
