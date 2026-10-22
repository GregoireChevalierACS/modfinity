import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ConsoleReporter } from '../../src/adapters/console-reporter.js';
import { FileSystemModRepository } from '../../src/adapters/file-system-mod-repository.js';
import { DEFAULT_CONFIG, JsonConfigRepository } from '../../src/adapters/json-config-repository.js';

let root: string;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'pdx-lint-'));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

async function createFile(relativePath: string, content: string): Promise<void> {
  const path = join(root, relativePath);
  await mkdir(join(path, '..'), { recursive: true });
  await writeFile(path, content);
}

describe('FileSystemModRepository', () => {
  it('lists only folders that have a descriptor', async () => {
    await createFile('b_mod/.metadata/metadata.json', '{}');
    await createFile('a_mod/.metadata/metadata.json', '{}');
    await createFile('not_a_mod/readme.txt', '');

    expect(await new FileSystemModRepository(root).listModNames()).toEqual(['a_mod', 'b_mod']);
  });

  it('loads every file with a relative, forward-slash path', async () => {
    await createFile('my_mod/.metadata/metadata.json', '{}');
    await createFile('my_mod/in_game/events/test.txt', 'namespace = test');

    const mod = await new FileSystemModRepository(root).load('my_mod');

    expect(mod.name).toBe('my_mod');
    expect(mod.files.map((file) => file.relativePath)).toEqual([
      '.metadata/metadata.json',
      'in_game/events/test.txt',
    ]);
    expect(new TextDecoder().decode(mod.files[1]?.bytes)).toBe('namespace = test');
  });
});

describe('JsonConfigRepository', () => {
  it('falls back to the default configuration when the file is missing', async () => {
    expect(await new JsonConfigRepository(join(root, 'missing.json')).load()).toEqual(DEFAULT_CONFIG);
  });

  it('reads languages and per-mod forbidden effects', async () => {
    await createFile(
      'config.json',
      JSON.stringify({ requiredLanguages: ['english', 'french'], mods: { m: { forbiddenEffects: ['add_devotion'] } } }),
    );

    expect(await new JsonConfigRepository(join(root, 'config.json')).load()).toEqual({
      requiredLanguages: ['english', 'french'],
      mods: { m: { forbiddenEffects: ['add_devotion'] } },
    });
  });

  it('rejects an invalid configuration with an explicit message', async () => {
    await createFile('config.json', JSON.stringify({ requiredLanguages: 'english' }));

    await expect(new JsonConfigRepository(join(root, 'config.json')).load()).rejects.toThrow(
      "'requiredLanguages' must be a string array",
    );
  });
});

describe('ConsoleReporter', () => {
  it('prints one line per diagnostic and a summary', () => {
    const lines: string[] = [];
    const reporter = new ConsoleReporter('mods', (line) => lines.push(line));

    reporter.report({
      results: [
        {
          modName: 'my_mod',
          diagnostics: [
            { ruleId: 'utf8-bom', severity: 'error', filePath: 'a.txt', message: 'no BOM' },
            { ruleId: 'syntax', severity: 'error', filePath: 'b.txt', line: 3, message: 'oops' },
          ],
        },
      ],
      errorCount: 2,
      warningCount: 0,
    });

    expect(lines).toEqual([
      'mods/my_mod/a.txt  error  no BOM  (utf8-bom)',
      'mods/my_mod/b.txt:3  error  oops  (syntax)',
      'pdx-lint: 1 mod(s) checked, 2 error(s), 0 warning(s).',
    ]);
  });
});
