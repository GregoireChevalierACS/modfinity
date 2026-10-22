import { describe, expect, it } from 'vitest';

import { attributeToMods, compareWithBaseline, distinctErrors, modMarkers } from '../../src/domain/error-log.js';
import { modFile } from '../helpers.js';

const scholarMod = {
  name: 'travelling_scholar',
  files: [
    modFile('.metadata/metadata.json', '{}', { bom: false }),
    modFile('in_game/events/modfinity_scholar.txt', ''),
    modFile('main_menu/localization/french/modfinity_scholar_l_french.yml', ''),
  ],
};

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

describe('modMarkers', () => {
  it('uses the mod folder and the base names of its files, not the descriptor', () => {
    expect(modMarkers(scholarMod)).toEqual(['travelling_scholar', 'modfinity_scholar', 'modfinity_scholar_l_french']);
  });
});

describe('attributeToMods', () => {
  it('assigns messages that mention a mod file or key, and keeps the rest apart', () => {
    const errors = [
      { message: '  Script location: events/modfinity_scholar.txt:12', occurrences: 2 },
      { message: "Data error in loc string 'modfinity_scholar.1.desc'", occurrences: 1 },
      { message: 'common/scripted_triggers/war_triggers.txt:126', occurrences: 213 },
    ];

    expect(attributeToMods(errors, [scholarMod])).toEqual({
      byMod: [{ modName: 'travelling_scholar', errors: [errors[0], errors[1]] }],
      unattributed: [errors[2]],
    });
  });

  it('reports no mod when nothing mentions one', () => {
    expect(attributeToMods([{ message: 'vanilla', occurrences: 1 }], [scholarMod]).byMod).toEqual([]);
  });
});
