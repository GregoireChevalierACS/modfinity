import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

import {
  definedNames,
  SCRIPTED_DEFINITION_FOLDERS,
  type ScriptedDefinitionKind,
  type ScriptKnowledge,
} from '../domain/knowledge/script-knowledge.js';
import { parseScript } from '../domain/paradox-script/parser.js';
import type { KnowledgeRepository } from '../ports/knowledge-repository.js';

const GAME_LAYERS = ['in_game', 'main_menu'] as const;

/**
 * Reads the docs generated in game by the `script_docs` console command
 * (effects.log, triggers.log, event_targets.log) and the vanilla scripted definitions
 * from the game installation (`<gameDir>/{in_game,main_menu}/common/...`).
 */
export class ScriptDocsKnowledgeRepository implements KnowledgeRepository {
  constructor(
    private readonly docsDir: string,
    private readonly gameDir: string,
  ) {}

  async load(): Promise<ScriptKnowledge | null> {
    const [effects, triggers, links] = await Promise.all([
      readHeadings(join(this.docsDir, 'effects.log'), /^## (\S+)\s*$/),
      readHeadings(join(this.docsDir, 'triggers.log'), /^## (\S+)\s*$/),
      readHeadings(join(this.docsDir, 'event_targets.log'), /^### (\S+)\s*$/),
    ]);
    if (effects === null || triggers === null || links === null) return null;

    const [scriptedEffects, scriptedTriggers, scriptValues, scriptedLists] = await Promise.all([
      this.readVanillaDefinitions('scriptedEffects'),
      this.readVanillaDefinitions('scriptedTriggers'),
      this.readVanillaDefinitions('scriptValues'),
      this.readVanillaDefinitions('scriptedLists'),
    ]);
    return { effects, triggers, links, scriptedEffects, scriptedTriggers, scriptValues, scriptedLists };
  }

  private async readVanillaDefinitions(kind: ScriptedDefinitionKind): Promise<Set<string>> {
    const perLayer = await Promise.all(
      GAME_LAYERS.map((layer) => readDefinedNames(join(this.gameDir, layer, SCRIPTED_DEFINITION_FOLDERS[kind]))),
    );
    return new Set(perLayer.flat());
  }
}

async function readHeadings(path: string, heading: RegExp): Promise<Set<string> | null> {
  let content: string;
  try {
    content = await readFile(path, 'utf8');
  } catch {
    return null;
  }
  return new Set(
    content.split(/\r?\n/).flatMap((line) => {
      const name = heading.exec(line)?.[1];
      return name === undefined ? [] : [name];
    }),
  );
}

async function readDefinedNames(folder: string): Promise<string[]> {
  let entries: string[];
  try {
    entries = await readdir(folder, { recursive: true });
  } catch {
    return [];
  }
  const sources = await Promise.all(
    entries.filter((entry) => entry.endsWith('.txt')).map((entry) => readFile(join(folder, entry), 'utf8')),
  );
  return sources.flatMap((source) => definedNames(parseScript(source).root));
}
