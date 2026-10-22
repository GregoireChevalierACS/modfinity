import { mkdtemp, rm, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { FileSystemSaveGames } from '../../src/adapters/file-system-save-games.js';

let root: string;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'pdx-lint-saves-'));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe('FileSystemSaveGames', () => {
  it('returns the most recently modified .eu5 file', async () => {
    await writeFile(join(root, 'old.eu5'), '');
    await writeFile(join(root, 'new.eu5'), '');
    await writeFile(join(root, 'steam_autocloud.vdf'), '');
    await utimes(join(root, 'old.eu5'), new Date('2026-01-01'), new Date('2026-01-01'));

    expect(await new FileSystemSaveGames(root).latest()).toBe(join(root, 'new.eu5'));
  });

  it('returns null when the folder has no save', async () => {
    expect(await new FileSystemSaveGames(join(root, 'missing')).latest()).toBeNull();
  });

  it('streams the lines of a save', async () => {
    await writeFile(join(root, 'a.eu5'), 'countries={\r\n\tdatabase={\n');
    const lines: string[] = [];

    for await (const line of new FileSystemSaveGames(root).readLines(join(root, 'a.eu5'))) lines.push(line);

    expect(lines).toEqual(['countries={', '\tdatabase={']);
  });
});
