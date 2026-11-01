/** What the companion cares about in a line of the game's debug.log. */
export type LogEvent =
  | { readonly kind: 'prompt'; readonly text: string }
  | { readonly kind: 'state-probe' }
  | { readonly kind: 'scope'; readonly countryName: string; readonly tag: string }
  | { readonly kind: 'delivered' };

// The mod's input window runs the (unknown) console command "promptitude <text>".
const PROMPT = /\]: Running console command: promptitude(?: (.*))?$/;
const STATE_PROBE = ': PROMPTITUDE|state';
const DELIVERED = ': PROMPTITUDE|delivered';
// debug_log_scopes output, e.g. "Pays « Arborée » (ARB)" in French or 'Country "Arborea" (ARB)'.
const COUNTRY_SCOPE = /\]: \S+ [«"]\s?(.+?)\s?[»"] \(([A-Z0-9]{3})\)$/;

export function parseLogLine(line: string): LogEvent | null {
  const trimmed = line.trimEnd();

  const prompt = PROMPT.exec(trimmed);
  if (prompt !== null) {
    const text = (prompt[1] ?? '').trim();
    return text === '' ? null : { kind: 'prompt', text };
  }
  if (trimmed.endsWith(STATE_PROBE)) return { kind: 'state-probe' };
  if (trimmed.endsWith(DELIVERED)) return { kind: 'delivered' };

  const scope = COUNTRY_SCOPE.exec(trimmed);
  if (scope?.[1] !== undefined && scope[2] !== undefined) {
    return { kind: 'scope', countryName: scope[1], tag: scope[2] };
  }
  return null;
}
