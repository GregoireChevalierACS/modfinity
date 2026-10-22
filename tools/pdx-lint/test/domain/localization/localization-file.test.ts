import { describe, expect, it } from 'vitest';

import { parseLocalization } from '../../../src/domain/localization/localization-file.js';

describe('parseLocalization', () => {
  it('reads the language header and entries', () => {
    const result = parseLocalization('﻿l_french:\n key.a: "Texte"\n key.b:0 "Autre"\n');

    expect(result).toEqual({
      language: 'french',
      entries: [
        { key: 'key.a', value: 'Texte', line: 2 },
        { key: 'key.b', value: 'Autre', line: 3 },
      ],
      errors: [],
    });
  });

  it('skips blank lines and comments', () => {
    const result = parseLocalization('# comment\nl_english:\n\n # note\n key: "Text" # trailing\n');

    expect(result.entries).toEqual([{ key: 'key', value: 'Text', line: 5 }]);
    expect(result.errors).toEqual([]);
  });

  it('keeps data functions and quotes inside values', () => {
    const result = parseLocalization('l_english:\n key: "Hello [ROOT.GetCountry.GetName], \\"friend\\""\n');

    expect(result.entries[0]?.value).toBe('Hello [ROOT.GetCountry.GetName], \\"friend\\"');
  });

  it('reports a missing header', () => {
    const result = parseLocalization(' key: "Text"\n');

    expect(result.language).toBeNull();
    expect(result.errors).toEqual([{ line: 1, message: "expected a language header such as 'l_english:'" }]);
  });

  it('reports malformed entries', () => {
    const result = parseLocalization('l_english:\n key "missing colon"\n');

    expect(result.errors).toEqual([{ line: 2, message: 'malformed entry, expected \' key: "text"\'' }]);
  });
});
