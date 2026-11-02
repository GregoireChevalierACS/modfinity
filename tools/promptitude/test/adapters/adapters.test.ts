import { appendFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { findClaudeExecutable, parseCliResult } from '../../src/adapters/claude-cli-provider.js';
import { DebugLogSource } from '../../src/adapters/debug-log-source.js';
import { FileSystemModFileWriter } from '../../src/adapters/mod-file-writer.js';

let root: string;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'promptitude-'));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

async function collect(source: DebugLogSource, count: number, during: () => Promise<void>): Promise<string[]> {
  const lines: string[] = [];
  const reading = (async () => {
    for await (const line of source.follow()) {
      lines.push(line);
      if (lines.length === count) source.stop();
    }
  })();
  await during();
  await reading;
  return lines;
}

describe('DebugLogSource', () => {
  it('returns the existing lines as history, then only the new ones', async () => {
    const path = join(root, 'debug.log');
    await writeFile(path, 'old 1\r\nold 2\r\n');
    const source = new DebugLogSource(path, 10);

    expect(await source.history()).toEqual(['old 1', 'old 2', '']);
    const lines = await collect(source, 2, () => appendFile(path, 'new 1\r\nnew 2\r\n'));

    expect(lines).toEqual(['new 1', 'new 2']);
  });

  it('keeps accented characters split across two writes', async () => {
    const path = join(root, 'debug.log');
    await writeFile(path, '');
    const source = new DebugLogSource(path, 10);
    await source.history();
    const bytes = Buffer.from('marché\n', 'utf8');

    const lines = await collect(source, 1, async () => {
      await appendFile(path, bytes.subarray(0, 5)); // ends in the middle of "é"
      await new Promise((resolve) => setTimeout(resolve, 40));
      await appendFile(path, bytes.subarray(5));
    });

    expect(lines).toEqual(['marché']);
  });

  it('starts over when the game rewrites the log at launch', async () => {
    const path = join(root, 'debug.log');
    await writeFile(path, 'a long previous session\n');
    const source = new DebugLogSource(path, 10);
    await source.history();

    const lines = await collect(source, 1, () => writeFile(path, 'new\n'));

    expect(lines).toEqual(['new']);
  });
});

describe('FileSystemModFileWriter', () => {
  it('writes each file in UTF-8 with BOM', async () => {
    await mkdir(join(root, 'in_game'), { recursive: true });

    await new FileSystemModFileWriter(root).write([{ relativePath: 'in_game/a.txt', content: 'é' }]);

    expect([...(await readFile(join(root, 'in_game', 'a.txt')))]).toEqual([0xef, 0xbb, 0xbf, 0xc3, 0xa9]);
  });
});

describe('parseCliResult', () => {
  it('returns the result of a successful run', () => {
    expect(parseCliResult(JSON.stringify({ type: 'result', is_error: false, result: 'Bonjour' }))).toBe('Bonjour');
  });

  it('throws on an error result', () => {
    expect(() => parseCliResult(JSON.stringify({ is_error: true, result: 'quota' }))).toThrow('returned an error');
  });
});

describe('findClaudeExecutable', () => {
  it('prefers PROMPTITUDE_CLAUDE', async () => {
    expect(await findClaudeExecutable({ PROMPTITUDE_CLAUDE: 'C:/tools/claude.exe' })).toBe('C:/tools/claude.exe');
  });
});
