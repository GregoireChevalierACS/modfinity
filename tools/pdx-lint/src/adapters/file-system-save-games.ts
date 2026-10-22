import { createReadStream } from 'node:fs';
import { readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { createInterface } from 'node:readline';

import type { SaveGames } from '../ports/save-games.js';

const SAVE_EXTENSION = '.eu5';

/** Reads `*.eu5` saves of `<saveDir>`; only plain-text (non-ironman) saves can be scanned. */
export class FileSystemSaveGames implements SaveGames {
  constructor(private readonly saveDir: string) {}

  async latest(): Promise<string | null> {
    let names: string[];
    try {
      names = (await readdir(this.saveDir)).filter((name) => name.endsWith(SAVE_EXTENSION));
    } catch {
      return null;
    }
    const saves = await Promise.all(
      names.map(async (name) => {
        const path = join(this.saveDir, name);
        return { path, modified: (await stat(path)).mtimeMs };
      }),
    );
    saves.sort((a, b) => b.modified - a.modified);
    return saves[0]?.path ?? null;
  }

  async *readLines(save: string): AsyncIterable<string> {
    const lines = createInterface({ input: createReadStream(save, 'utf8'), crlfDelay: Infinity });
    try {
      yield* lines;
    } finally {
      lines.close();
    }
  }
}
