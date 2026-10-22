import { describe, expect, it } from 'vitest';

import { definedNames, inlineDefinitions } from '../../../src/domain/knowledge/script-knowledge.js';
import { parseScript } from '../../../src/domain/paradox-script/parser.js';

describe('definedNames', () => {
  it('returns the top-level names of a definition file', () => {
    expect(definedNames(parseScript('a = { }\nb = 5\n').root)).toEqual(['a', 'b']);
  });
});

describe('inlineDefinitions', () => {
  const root = parseScript(`namespace = test
scripted_effect my_effect = { }
scripted_trigger my_trigger = { }
test.1 = { }`).root;

  it('finds inline scripted effects', () => {
    expect(inlineDefinitions(root, 'scriptedEffects')).toEqual(['my_effect']);
  });

  it('finds inline scripted triggers', () => {
    expect(inlineDefinitions(root, 'scriptedTriggers')).toEqual(['my_trigger']);
  });
});
