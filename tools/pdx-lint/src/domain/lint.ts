import type { Diagnostic } from './diagnostic.js';
import { analyzeMod } from './mod-analysis.js';
import type { Mod } from './mod.js';
import type { Rule } from './rules/rule.js';

export function lintMod(mod: Mod, rules: readonly Rule[]): Diagnostic[] {
  const analysis = analyzeMod(mod);
  return rules.flatMap((rule) => rule.check(analysis)).sort(byLocation);
}

function byLocation(a: Diagnostic, b: Diagnostic): number {
  return a.filePath.localeCompare(b.filePath) || (a.line ?? 0) - (b.line ?? 0);
}
