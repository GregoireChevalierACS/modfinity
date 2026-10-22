import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ScriptDocsKnowledgeRepository } from '../../src/adapters/script-docs-knowledge-repository.js';

let root: string;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'pdx-lint-docs-'));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

async function createFile(relativePath: string, content: string): Promise<void> {
  const path = join(root, relativePath);
  await mkdir(join(path, '..'), { recursive: true });
  await writeFile(path, content);
}

describe('ScriptDocsKnowledgeRepository', () => {
  it('returns null when the script docs are missing', async () => {
    expect(await new ScriptDocsKnowledgeRepository(join(root, 'docs'), join(root, 'game')).load()).toBeNull();
  });

  it('reads documented keywords and vanilla scripted definitions of both game layers', async () => {
    await createFile('docs/effects.log', '# Effect Documentation\n## add_gold\nAdds gold\n**Supported Scopes**: country\n');
    await createFile('docs/triggers.log', '# Trigger Documentation\r\n## gold\r\nChecks gold\r\n');
    await createFile('docs/event_targets.log', '# Event Target Documentation\n### capital\nUnknown\n');
    await createFile('game/in_game/common/scripted_effects/e.txt', '﻿my_effect = { add_gold = 1 }');
    await createFile('game/main_menu/common/scripted_triggers/t.txt', 'my_trigger = { gold > 1 }');
    await createFile('game/in_game/common/script_values/v.txt', 'my_value = 5');
    await createFile('game/in_game/common/scripted_lists/l.txt', 'courtier = { base = character }');

    const knowledge = await new ScriptDocsKnowledgeRepository(join(root, 'docs'), join(root, 'game')).load();

    expect(knowledge).toEqual({
      effects: new Set(['add_gold']),
      triggers: new Set(['gold']),
      links: new Set(['capital']),
      scriptedEffects: new Set(['my_effect']),
      scriptedTriggers: new Set(['my_trigger']),
      scriptValues: new Set(['my_value']),
      scriptedLists: new Set(['courtier']),
    });
  });
});
