import { describe, expect, it } from 'vitest';

import { properties, walkProperties, type Block, type Property } from '../../../src/domain/paradox-script/ast.js';
import { parseScript } from '../../../src/domain/paradox-script/parser.js';

function firstProperty(block: Block): Property {
  const [property] = properties(block);
  if (property === undefined) throw new Error('no property');
  return property;
}

describe('parseScript', () => {
  it('parses scalar properties with their line', () => {
    const { root, errors } = parseScript('a = 1\nb = yes');

    expect(errors).toEqual([]);
    expect(properties(root).map(({ key, line }) => [key, line])).toEqual([
      ['a', 1],
      ['b', 2],
    ]);
  });

  it.each(['=', '?=', '<', '<=', '>', '>=', '!=', '=='] as const)('parses the %s operator', (operator) => {
    const { root, errors } = parseScript(`stability ${operator} 5`);

    expect(errors).toEqual([]);
    expect(firstProperty(root)).toMatchObject({ key: 'stability', operator, value: { text: '5' } });
  });

  it('parses nested blocks', () => {
    const { root } = parseScript('event = { option = { add_gold = 25 } }');

    expect([...walkProperties(root)].map((property) => property.key)).toEqual(['event', 'option', 'add_gold']);
  });

  it('parses bare values as list entries', () => {
    const { root } = parseScript('events = { a.1 a.2 }');
    const events = firstProperty(root).value as Block;

    expect(events.entries.map((entry) => entry.kind)).toEqual(['bare', 'bare']);
  });

  it('ignores comments, including after a value', () => {
    const { root, errors } = parseScript('# header\na = 1 # trailing\n');

    expect(errors).toEqual([]);
    expect(properties(root)).toHaveLength(1);
  });

  it('keeps # inside quoted strings', () => {
    const { root } = parseScript('image = "gfx/#not_a_comment.dds"');

    expect(firstProperty(root).value).toMatchObject({ text: 'gfx/#not_a_comment.dds', quoted: true });
  });

  it('reads scope prefixes and dotted paths as one word', () => {
    const { root } = parseScript('c:ENG ?= { location:paris.owner = yes }');

    expect([...walkProperties(root)].map((property) => property.key)).toEqual(['c:ENG', 'location:paris.owner']);
  });

  it('reads inline math as a single value', () => {
    const { root, errors } = parseScript('value = @[ base * 2 ]');

    expect(errors).toEqual([]);
    expect(firstProperty(root).value).toMatchObject({ text: '@[ base * 2 ]' });
  });

  it('keeps tagged blocks such as rgb { } as block values', () => {
    const { root } = parseScript('color = rgb { 255 0 0 }');

    expect(firstProperty(root).value.kind).toBe('block');
  });

  it('ignores a leading BOM', () => {
    const { root } = parseScript('﻿namespace = test');

    expect(firstProperty(root).key).toBe('namespace');
  });

  it('reports a block that is never closed, at its opening line', () => {
    const { errors } = parseScript('a = {\n\tb = 1\n');

    expect(errors).toEqual([{ line: 1, message: "block opened here is never closed (missing '}')" }]);
  });

  it('reports an extra closing brace', () => {
    const { errors } = parseScript('a = 1\n}');

    expect(errors).toEqual([{ line: 2, message: "unexpected '}' without matching '{'" }]);
  });

  it('reports a missing value after an operator', () => {
    const { errors } = parseScript('a = { b = }');

    expect(errors).toEqual([{ line: 1, message: 'missing value after operator' }]);
  });

  it('reports an unterminated string', () => {
    const { errors } = parseScript('a = "oops');

    expect(errors).toContainEqual({ line: 1, message: 'unterminated string' });
  });
});
