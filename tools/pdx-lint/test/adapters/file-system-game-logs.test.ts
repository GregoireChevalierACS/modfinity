import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { FileSystemBaselineRepository, FileSystemGameLogs } from '../../src/adapters/file-system-game-logs.js';

let root: string;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'pdx-lint-logs-'));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

async function createFile(relativePath: string, content: string): Promise<void> {
  const path = join(root, relativePath);
  await mkdir(join(path, '..'), { recursive: true });
  await writeFile(path, content);
}

describe('FileSystemGameLogs', () => {
  it('reads the error log and the game version from debug.log', async () => {
    await createFile('logs/error.log', '[10:00:00]oops\n');
    await createFile('logs/debug.log', '[16:04:20][application.cpp:1004]: Feeding game version into checksum: 1.4.3\n');
    await createFile('logs/code_revisions.log', '[16:03:59][setup.cpp:164]: game_branch: ud009/release/next\n');
    const logs = new FileSystemGameLogs(join(root, 'logs'));

    expect(await logs.readErrorLog()).toBe('[10:00:00]oops\n');
    expect(await logs.readGameVersion()).toBe('1.4.3');
  });

  it('falls back to a numbered release branch in code_revisions.log', async () => {
    await createFile('logs/code_revisions.log', '[11:44:51][setup.cpp:165]: game_branch: u26q2/release/1.3.11\n');

    expect(await new FileSystemGameLogs(join(root, 'logs')).readGameVersion()).toBe('1.3.11');
  });

  it('fails clearly when the version cannot be read', async () => {
    await createFile('logs/code_revisions.log', 'game_branch: ud009/release/next\n');

    await expect(new FileSystemGameLogs(join(root, 'logs')).readGameVersion()).rejects.toThrow(
      'could not read the game version',
    );
  });
});

describe('FileSystemBaselineRepository', () => {
  it('saves one message per line and loads it back', async () => {
    const baselines = new FileSystemBaselineRepository(join(root, 'baselines'));

    const location = await baselines.save('1.3.11', ['a', 'b']);

    expect(await readFile(location, 'utf8')).toBe('a\nb\n');
    expect(await baselines.load('1.3.11')).toEqual(['a', 'b']);
  });

  it('returns null for an unknown version', async () => {
    expect(await new FileSystemBaselineRepository(root).load('9.9.9')).toBeNull();
  });
});
