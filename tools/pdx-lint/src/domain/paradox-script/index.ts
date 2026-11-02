/** Public API of the Paradox script parser, shared with other tools of the repository. */
export { properties, walkProperties } from './ast.js';
export type { BareValue, Block, Entry, Operator, Property, Scalar, Value } from './ast.js';
export { parseScript } from './parser.js';
export type { ParseResult, ScriptSyntaxError } from './parser.js';
