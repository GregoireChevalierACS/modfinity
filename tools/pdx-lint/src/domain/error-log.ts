import type { Mod } from './mod.js';

const TIMESTAMP = /^\[\d{2}:\d{2}:\d{2}\]/;

export interface NewError {
  readonly message: string;
  readonly occurrences: number;
}

export interface LogComparison {
  readonly totalLines: number;
  /** Messages absent from the baseline, most frequent first. */
  readonly newErrors: readonly NewError[];
}

/** Error messages without timestamps, deduplicated and sorted: the baseline format. */
export function distinctErrors(logText: string): string[] {
  return [...new Set(messages(logText))].sort();
}

export function compareWithBaseline(logText: string, baseline: readonly string[]): LogComparison {
  const known = new Set(baseline);
  const lines = messages(logText);
  const occurrences = new Map<string, number>();
  for (const message of lines) {
    if (!known.has(message)) occurrences.set(message, (occurrences.get(message) ?? 0) + 1);
  }

  const newErrors = [...occurrences]
    .map(([message, count]) => ({ message, occurrences: count }))
    .sort((a, b) => b.occurrences - a.occurrences || a.message.localeCompare(b.message));
  return { totalLines: lines.length, newErrors };
}

export interface ModErrors {
  readonly modName: string;
  readonly errors: readonly NewError[];
}

export interface AttributedErrors {
  /** Errors that mention a file or key of a mod. */
  readonly byMod: readonly ModErrors[];
  /** Everything else: usually vanilla noise the baseline did not capture. */
  readonly unattributed: readonly NewError[];
}

/**
 * Markers that identify a mod in log messages: its folder name and the base names of its script
 * and localization files (e.g. `modfinity_scholar`, which also prefixes its event and localization keys).
 */
export function modMarkers(mod: Mod): string[] {
  const baseNames = mod.files
    .filter((file) => !file.relativePath.startsWith('.metadata/'))
    .map((file) => file.relativePath.split('/').pop()?.replace(/\.[^.]+$/, '') ?? '')
    .filter((name) => name !== '');
  return [...new Set([mod.name, ...baseNames])];
}

export function attributeToMods(errors: readonly NewError[], mods: readonly Mod[]): AttributedErrors {
  const markers = mods.map((mod) => ({ modName: mod.name, markers: modMarkers(mod) }));
  const owner = (error: NewError): string | undefined =>
    markers.find(({ markers: modMarkerList }) => modMarkerList.some((marker) => error.message.includes(marker)))?.modName;

  const byMod = markers
    .map(({ modName }) => ({ modName, errors: errors.filter((error) => owner(error) === modName) }))
    .filter((modErrors) => modErrors.errors.length > 0);
  return { byMod, unattributed: errors.filter((error) => owner(error) === undefined) };
}

function messages(logText: string): string[] {
  return logText
    .split(/\r?\n/)
    .map((line) => line.replace(TIMESTAMP, '').trimEnd())
    .filter((line) => line.trim() !== '');
}
