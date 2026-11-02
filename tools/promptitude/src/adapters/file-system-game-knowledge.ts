import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { parseLocalization } from 'pdx-lint/localization';
import { parseScript } from 'pdx-lint/paradox-script';

import { describeDefinition, type KnowledgeCard } from '../domain/knowledge/knowledge-card.js';
import { KNOWLEDGE_DOMAINS } from '../domain/knowledge/knowledge-domains.js';
import type { GameKnowledgeSource } from '../ports/ports.js';

/**
 * Reads the definitions of the knowledge domains from the installed game
 * (`<gameDir>/in_game/common/<folder>`) and names them in the game language.
 */
export class FileSystemGameKnowledge implements GameKnowledgeSource {
  constructor(
    private readonly gameDir: string,
    private readonly language: string,
  ) {}

  async load(): Promise<KnowledgeCard[]> {
    const names = await this.loadNames();
    const cards: KnowledgeCard[] = [];
    for (const domain of KNOWLEDGE_DOMAINS) {
      for (const source of await readFiles(join(this.gameDir, 'in_game', 'common', domain.folder), '.txt')) {
        for (const entry of parseScript(source).root.entries) {
          if (entry.kind !== 'property' || entry.value.kind !== 'block') continue;
          cards.push(describeDefinition(domain.id, entry.key, entry.value, names.get(entry.key) ?? null));
        }
      }
    }
    return cards;
  }

  private async loadNames(): Promise<Map<string, string>> {
    const names = new Map<string, string>();
    const folder = join(this.gameDir, 'main_menu', 'localization', this.language);
    for (const source of await readFiles(folder, '.yml')) {
      for (const entry of parseLocalization(source).entries) {
        if (!names.has(entry.key)) names.set(entry.key, plainText(entry.value));
      }
    }
    return names;
  }
}

async function readFiles(folder: string, extension: string): Promise<string[]> {
  let entries: string[];
  try {
    entries = await readdir(folder, { recursive: true });
  } catch {
    return [];
  }
  return Promise.all(
    entries.filter((entry) => entry.endsWith(extension)).map((entry) => readFile(join(folder, entry), 'utf8')),
  );
}

/** Drops text formatting such as "#bold Text#!". */
function plainText(value: string): string {
  return value.replace(/#\w+\s/g, '').replaceAll('#!', '').trim();
}
