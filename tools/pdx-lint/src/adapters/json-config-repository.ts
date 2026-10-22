import { readFile } from 'node:fs/promises';

import type { ConfigRepository, LintConfig, ModLintConfig } from '../ports/config-repository.js';

export const DEFAULT_CONFIG: LintConfig = { requiredLanguages: ['english'], mods: {} };

/**
 * Reads a JSON file shaped like:
 * { "requiredLanguages": ["english"], "mods": { "<mod>": { "forbiddenEffects": ["add_legitimacy"] } } }
 * A missing file means the default configuration.
 */
export class JsonConfigRepository implements ConfigRepository {
  constructor(private readonly path: string) {}

  async load(): Promise<LintConfig> {
    let raw: string;
    try {
      raw = await readFile(this.path, 'utf8');
    } catch {
      return DEFAULT_CONFIG;
    }
    return parseConfig(JSON.parse(raw) as unknown, this.path);
  }
}

function parseConfig(value: unknown, source: string): LintConfig {
  if (!isRecord(value)) throw new Error(`${source}: configuration must be a JSON object`);

  const requiredLanguages = value.requiredLanguages ?? DEFAULT_CONFIG.requiredLanguages;
  if (!isStringArray(requiredLanguages)) throw new Error(`${source}: 'requiredLanguages' must be a string array`);

  const rawMods = value.mods ?? {};
  if (!isRecord(rawMods)) throw new Error(`${source}: 'mods' must be an object`);

  const mods: Record<string, ModLintConfig> = {};
  for (const [modName, modConfig] of Object.entries(rawMods)) {
    const forbiddenEffects = isRecord(modConfig) ? (modConfig.forbiddenEffects ?? []) : undefined;
    if (!isStringArray(forbiddenEffects)) {
      throw new Error(`${source}: 'mods.${modName}.forbiddenEffects' must be a string array`);
    }
    mods[modName] = { forbiddenEffects };
  }

  return { requiredLanguages, mods };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}
