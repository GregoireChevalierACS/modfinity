import type { Operator } from './ast.js';

export type Token =
  | { readonly type: 'word'; readonly text: string; readonly line: number }
  | { readonly type: 'string'; readonly text: string; readonly line: number }
  | { readonly type: 'operator'; readonly operator: Operator; readonly line: number }
  | { readonly type: 'open'; readonly line: number }
  | { readonly type: 'close'; readonly line: number };

export interface TokenizerError {
  readonly line: number;
  readonly message: string;
}

export interface TokenizeResult {
  readonly tokens: readonly Token[];
  readonly errors: readonly TokenizerError[];
}

// Longest operators first so that "<=" is not read as "<" then "=".
const OPERATORS: readonly Operator[] = ['?=', '<=', '>=', '!=', '==', '=', '<', '>'];
const WORD_BREAKERS = new Set([' ', '\t', '\r', '\n', '{', '}', '"', '#', '=', '<', '>', '!']);

export function tokenize(source: string): TokenizeResult {
  const tokens: Token[] = [];
  const errors: TokenizerError[] = [];
  const text = source.startsWith('﻿') ? source.slice(1) : source;
  let position = 0;
  let line = 1;

  const peek = (offset = 0): string => text.charAt(position + offset);

  while (position < text.length) {
    const char = peek();

    if (char === '\n') {
      line++;
      position++;
    } else if (char === ' ' || char === '\t' || char === '\r') {
      position++;
    } else if (char === '#') {
      while (position < text.length && peek() !== '\n') position++;
    } else if (char === '{') {
      tokens.push({ type: 'open', line });
      position++;
    } else if (char === '}') {
      tokens.push({ type: 'close', line });
      position++;
    } else if (char === '"') {
      const startLine = line;
      position++;
      let value = '';
      while (position < text.length && peek() !== '"') {
        if (peek() === '\\' && position + 1 < text.length) {
          value += peek() + peek(1);
          position += 2;
          continue;
        }
        if (peek() === '\n') line++;
        value += peek();
        position++;
      }
      if (position >= text.length) {
        errors.push({ line: startLine, message: 'unterminated string' });
      }
      position++;
      tokens.push({ type: 'string', text: value, line: startLine });
    } else {
      const operator = OPERATORS.find((candidate) => text.startsWith(candidate, position));
      if (operator !== undefined) {
        tokens.push({ type: 'operator', operator, line });
        position += operator.length;
      } else if (char === '!') {
        errors.push({ line, message: "unexpected character '!'" });
        position++;
      } else {
        const start = position;
        if (char === '@' && peek(1) === '[') {
          // Inline math, e.g. @[ base * 2 ], is a single value.
          while (position < text.length && peek() !== ']' && peek() !== '\n') position++;
          position++;
        } else {
          while (position < text.length && !isWordEnd(text, position)) position++;
        }
        tokens.push({ type: 'word', text: text.slice(start, position), line });
      }
    }
  }

  return { tokens, errors };
}

function isWordEnd(text: string, position: number): boolean {
  const char = text.charAt(position);
  return WORD_BREAKERS.has(char) || (char === '?' && text.charAt(position + 1) === '=');
}
