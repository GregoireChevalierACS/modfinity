import { readdir, readFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';

import type { Mod, ModFile } from '../domain/mod.js';
import type { ModRepository } from '../ports/mod-repository.js';

const DESCRIPTOR = join('.metadata', 'metadata.json');

/** Reads mods from `<modsRoot>/<modName>/`; a folder is a mod when it has `.metadata/metadata.json`. */
export class FileSystemModRepository implements ModRepository {
  constructor(private readonly modsRoot: string) {}

  async listModNames(): Promise<string[]> {
    const entries = await readdir(this.modsRoot, { withFileTypes: true });
    const folders = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
    const withDescriptor = await Promise.all(
      folders.map(async (name) => ((await exists(join(this.modsRoot, name, DESCRIPTOR))) ? name : null)),
    );
    return withDescriptor.filter((name): name is string => name !== null).sort();
  }

  async load(modName: string): Promise<Mod> {
    const modRoot = join(this.modsRoot, modName);
    const entries = await readdir(modRoot, { recursive: true, withFileTypes: true });
    const files = await Promise.all(
      entries
        .filter((entry) => entry.isFile())
        .map(async (entry): Promise<ModFile> => {
          const absolutePath = join(entry.parentPath, entry.name);
          return {
            relativePath: relative(modRoot, absolutePath).split(sep).join('/'),
            bytes: new Uint8Array(await readFile(absolutePath)),
          };
        }),
    );
    files.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
    return { name: modName, files };
  }
}

async function exists(path: string): Promise<boolean> {
  try {
    await readFile(path);
    return true;
  } catch {
    return false;
  }
}
