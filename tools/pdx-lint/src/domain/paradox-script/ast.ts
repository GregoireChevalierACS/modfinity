export type Operator = '=' | '?=' | '<' | '<=' | '>' | '>=' | '!=' | '==';

export interface Scalar {
  readonly kind: 'scalar';
  readonly text: string;
  readonly quoted: boolean;
  readonly line: number;
}

export interface Block {
  readonly kind: 'block';
  readonly entries: readonly Entry[];
  readonly line: number;
}

export type Value = Scalar | Block;

/** `key <operator> value`, e.g. `add_gold = 25` or `c:FRA ?= { ... }`. */
export interface Property {
  readonly kind: 'property';
  readonly key: string;
  readonly operator: Operator;
  readonly value: Value;
  readonly line: number;
}

/** A value without key, as found in lists: `events = { a.1 a.2 }`. */
export interface BareValue {
  readonly kind: 'bare';
  readonly value: Value;
  readonly line: number;
}

export type Entry = Property | BareValue;

export function properties(block: Block, key?: string): Property[] {
  return block.entries.filter(
    (entry): entry is Property => entry.kind === 'property' && (key === undefined || entry.key === key),
  );
}

/** Depth-first walk over every property of the block and its descendants. */
export function* walkProperties(block: Block): Generator<Property> {
  for (const entry of block.entries) {
    if (entry.kind === 'property') {
      yield entry;
    }
    if (entry.value.kind === 'block') {
      yield* walkProperties(entry.value);
    }
  }
}
