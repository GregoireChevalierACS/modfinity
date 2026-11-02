import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { ModFile } from '../domain/answer-panel.js';
import type { ModFileWriter } from '../ports/ports.js';

const UTF8_BOM = String.fromCharCode(0xfeff);

/** Writes files into the mod folder, in UTF-8 with BOM like every Paradox script file. */
export class FileSystemModFileWriter implements ModFileWriter {
  constructor(private readonly modDir: string) {}

  async write(files: readonly ModFile[]): Promise<void> {
    for (const file of files) {
      await writeFile(join(this.modDir, file.relativePath), UTF8_BOM + file.content, 'utf8');
    }
  }
}
