import type { Block, Entry, Scalar, Value } from './ast.js';
import { tokenize, type Token } from './tokenizer.js';

export interface ScriptSyntaxError {
  readonly line: number;
  readonly message: string;
}

export interface ParseResult {
  readonly root: Block;
  readonly errors: readonly ScriptSyntaxError[];
}

/** Parses Paradox script (Clausewitz/Jomini text format) and recovers from errors. */
export function parseScript(source: string): ParseResult {
  const { tokens, errors: tokenizerErrors } = tokenize(source);
  const parser = new Parser(tokens);
  const root: Block = { kind: 'block', entries: parser.parseEntries(null), line: 1 };
  return { root, errors: [...tokenizerErrors, ...parser.errors] };
}

class Parser {
  readonly errors: ScriptSyntaxError[] = [];
  private position = 0;

  constructor(private readonly tokens: readonly Token[]) {}

  /** Parses entries until the matching `}` (or end of file at top level, when `openedAt` is null). */
  parseEntries(openedAt: number | null): Entry[] {
    const entries: Entry[] = [];

    for (;;) {
      const token = this.peek();

      if (token === undefined) {
        if (openedAt !== null) {
          this.errors.push({ line: openedAt, message: "block opened here is never closed (missing '}')" });
        }
        return entries;
      }

      if (token.type === 'close') {
        this.position++;
        if (openedAt !== null) return entries;
        this.errors.push({ line: token.line, message: "unexpected '}' without matching '{'" });
        continue;
      }

      if (token.type === 'operator') {
        this.position++;
        this.errors.push({ line: token.line, message: `unexpected operator '${token.operator}' without key` });
        continue;
      }

      if (token.type === 'open') {
        this.position++;
        entries.push({ kind: 'bare', value: this.parseBlock(token.line), line: token.line });
        continue;
      }

      this.position++;
      const next = this.peek();
      if (next?.type === 'operator') {
        this.position++;
        const value = this.parseValue(next.line);
        if (value !== undefined) {
          entries.push({ kind: 'property', key: token.text, operator: next.operator, value, line: token.line });
        }
      } else {
        entries.push({ kind: 'bare', value: toScalar(token), line: token.line });
      }
    }
  }

  private parseValue(operatorLine: number): Value | undefined {
    const token = this.peek();

    if (token?.type === 'open') {
      this.position++;
      return this.parseBlock(token.line);
    }

    if (token?.type === 'word' || token?.type === 'string') {
      this.position++;
      // Tagged blocks such as `color = rgb { 255 0 0 }` keep the block as value.
      const next = this.peek();
      if (token.type === 'word' && next?.type === 'open') {
        this.position++;
        return this.parseBlock(next.line);
      }
      return toScalar(token);
    }

    this.errors.push({ line: operatorLine, message: 'missing value after operator' });
    return undefined;
  }

  private parseBlock(line: number): Block {
    return { kind: 'block', entries: this.parseEntries(line), line };
  }

  private peek(): Token | undefined {
    return this.tokens[this.position];
  }
}

function toScalar(token: Extract<Token, { type: 'word' | 'string' }>): Scalar {
  return { kind: 'scalar', text: token.text, quoted: token.type === 'string', line: token.line };
}
