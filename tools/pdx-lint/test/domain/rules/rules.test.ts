import { describe, expect, it } from 'vitest';

import { eventIdsRule } from '../../../src/domain/rules/event-ids.js';
import { forbiddenEffectsRule } from '../../../src/domain/rules/forbidden-effects.js';
import { localizationLanguageRule } from '../../../src/domain/rules/localization-language.js';
import { localizationRootScopeRule } from '../../../src/domain/rules/localization-root-scope.js';
import { missingLocalizationRule } from '../../../src/domain/rules/missing-localization.js';
import { syntaxRule } from '../../../src/domain/rules/syntax.js';
import { utf8BomRule } from '../../../src/domain/rules/utf8-bom.js';
import { analyze, ENGLISH_EVENT_LOC, modFile, VALID_EVENT } from '../../helpers.js';

const EVENT_PATH = 'in_game/events/test.txt';
const ENGLISH_PATH = 'main_menu/localization/english/test_l_english.yml';

describe('syntax', () => {
  it('accepts well-formed files', () => {
    const analysis = analyze(modFile(EVENT_PATH, VALID_EVENT), modFile(ENGLISH_PATH, ENGLISH_EVENT_LOC));

    expect(syntaxRule.check(analysis)).toEqual([]);
  });

  it('reports script and localization errors with their location', () => {
    const analysis = analyze(
      modFile(EVENT_PATH, 'a = {'),
      modFile(ENGLISH_PATH, 'l_english:\n broken'),
    );

    expect(syntaxRule.check(analysis).map(({ filePath, line }) => [filePath, line])).toEqual([
      [EVENT_PATH, 1],
      [ENGLISH_PATH, 2],
    ]);
  });
});

describe('utf8-bom', () => {
  it('accepts files with BOM and ignores the descriptor', () => {
    const analysis = analyze(
      modFile(EVENT_PATH, VALID_EVENT),
      modFile('.metadata/metadata.json', '{}', { bom: false }),
    );

    expect(utf8BomRule.check(analysis)).toEqual([]);
  });

  it('reports script and localization files without BOM', () => {
    const analysis = analyze(
      modFile(EVENT_PATH, VALID_EVENT, { bom: false }),
      modFile(ENGLISH_PATH, ENGLISH_EVENT_LOC, { bom: false }),
    );

    expect(utf8BomRule.check(analysis).map((diagnostic) => diagnostic.filePath)).toEqual([EVENT_PATH, ENGLISH_PATH]);
  });
});

describe('localization-language', () => {
  it('accepts matching folder, file name and header, including in subfolders', () => {
    const analysis = analyze(
      modFile(ENGLISH_PATH, ENGLISH_EVENT_LOC),
      modFile('main_menu/localization/english/events/more_l_english.yml', 'l_english:\n'),
    );

    expect(localizationLanguageRule.check(analysis)).toEqual([]);
  });

  it('reports a file name without language suffix', () => {
    const analysis = analyze(modFile('main_menu/localization/english/test.yml', 'l_english:\n'));

    expect(localizationLanguageRule.check(analysis)).toMatchObject([
      { message: "file name must end with '_l_<language>.yml'" },
    ]);
  });

  it('reports a folder or header that disagrees with the file name', () => {
    const analysis = analyze(modFile('main_menu/localization/french/test_l_english.yml', 'l_german:\n'));

    expect(localizationLanguageRule.check(analysis).map((diagnostic) => diagnostic.message)).toEqual([
      "file name language 'english' does not match folder 'french'",
      "header 'l_german:' does not match file name language 'english'",
    ]);
  });
});

describe('event-ids', () => {
  it('accepts declared, in-range, unique ids', () => {
    expect(eventIdsRule.check(analyze(modFile(EVENT_PATH, VALID_EVENT)))).toEqual([]);
  });

  it('reports an undeclared namespace', () => {
    const analysis = analyze(modFile(EVENT_PATH, 'namespace = other\ntest.1 = { }'));

    expect(eventIdsRule.check(analysis)).toMatchObject([
      { line: 2, message: "event 'test.1' uses namespace 'test', which is not declared in this file" },
    ]);
  });

  it.each([0, 10000])('reports the out-of-range number %i', (number) => {
    const analysis = analyze(modFile(EVENT_PATH, `namespace = test\ntest.${number} = { }`));

    expect(eventIdsRule.check(analysis)).toMatchObject([
      { message: `event number ${number} is out of range 1..9999` },
    ]);
  });

  it('reports duplicates across files', () => {
    const analysis = analyze(
      modFile(EVENT_PATH, VALID_EVENT),
      modFile('in_game/events/copy.txt', VALID_EVENT),
    );

    expect(eventIdsRule.check(analysis)).toMatchObject([
      { filePath: 'in_game/events/copy.txt', message: `event 'test.1' is already defined at ${EVENT_PATH}:2` },
    ]);
  });
});

describe('missing-localization', () => {
  const rule = missingLocalizationRule(['english', 'french']);

  it('accepts keys present in every required language', () => {
    const analysis = analyze(
      modFile(EVENT_PATH, VALID_EVENT),
      modFile(ENGLISH_PATH, ENGLISH_EVENT_LOC),
      modFile('main_menu/localization/french/test_l_french.yml', ENGLISH_EVENT_LOC.replace('l_english', 'l_french')),
    );

    expect(rule.check(analysis)).toEqual([]);
  });

  it('reports each key missing in a language, at the line that uses it', () => {
    const analysis = analyze(modFile(EVENT_PATH, VALID_EVENT), modFile(ENGLISH_PATH, ENGLISH_EVENT_LOC));

    expect(rule.check(analysis).map(({ line, message }) => [line, message])).toEqual([
      [4, "localization key 'test.1.title' is missing in french"],
      [5, "localization key 'test.1.desc' is missing in french"],
      [7, "localization key 'test.1.a' is missing in french"],
    ]);
  });
});

describe('localization-root-scope', () => {
  it('accepts country data read through ROOT.GetCountry', () => {
    const analysis = analyze(modFile(ENGLISH_PATH, 'l_english:\n key: "[ROOT.GetCountry.GetName]"\n'));

    expect(localizationRootScopeRule.check(analysis)).toEqual([]);
  });

  it('reports country functions called directly on ROOT', () => {
    const analysis = analyze(modFile(ENGLISH_PATH, 'l_english:\n key: "Hello [ROOT.GetName]"\n'));

    expect(localizationRootScopeRule.check(analysis)).toMatchObject([
      { line: 2, message: "'[ROOT.GetName]' in 'key' must be written '[ROOT.GetCountry.GetName…]'" },
    ]);
  });
});

describe('forbidden-effects', () => {
  it('does nothing without configured effects', () => {
    const analysis = analyze(modFile(EVENT_PATH, 'a = { add_legitimacy = 5 }'));

    expect(forbiddenEffectsRule([]).check(analysis)).toEqual([]);
  });

  it('reports forbidden effects at any depth', () => {
    const analysis = analyze(modFile(EVENT_PATH, 'test.1 = {\n\toption = {\n\t\tadd_legitimacy = 5\n\t}\n}'));

    expect(forbiddenEffectsRule(['add_legitimacy']).check(analysis)).toMatchObject([
      { line: 3, message: "effect 'add_legitimacy' is forbidden in this mod" },
    ]);
  });
});
