import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { FileSystemGameKnowledge } from '../../src/adapters/file-system-game-knowledge.js';

let game: string;

beforeEach(async () => {
  game = await mkdtemp(join(tmpdir(), 'promptitude-game-'));
});

afterEach(async () => {
  await rm(game, { recursive: true, force: true });
});

async function createFile(relativePath: string, content: string): Promise<void> {
  const path = join(game, relativePath);
  await mkdir(join(path, '..'), { recursive: true });
  await writeFile(path, content);
}

describe('FileSystemGameKnowledge', () => {
  it('builds named cards from the definitions of the knowledge domains', async () => {
    await createFile('in_game/common/goods/00_raw.txt', '﻿goods_gold = { default_market_price = 8 }\nclay = { default_market_price = 0.5 }');
    await createFile('in_game/common/laws/00_laws.txt', 'feudal_law = { law_category = administrative }');
    await createFile('in_game/common/unrelated/x.txt', 'ignored = { a = 1 }');
    await createFile('main_menu/localization/french/goods_l_french.yml', '﻿l_french:\n goods_gold: "#bold Or#!"\n');

    const cards = await new FileSystemGameKnowledge(game, 'french').load();

    expect(cards).toEqual([
      { domain: 'goods', id: 'goods_gold', name: 'Or', facts: 'default_market_price=8' },
      { domain: 'goods', id: 'clay', name: null, facts: 'default_market_price=0.5' },
      { domain: 'laws', id: 'feudal_law', name: null, facts: 'law_category=administrative' },
    ]);
  });

  it('returns no cards when the game folder is missing', async () => {
    expect(await new FileSystemGameKnowledge(join(game, 'missing'), 'french').load()).toEqual([]);
  });
});
