import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { InboxFile } from '../domain/inbox.js';
import type { Inbox } from '../ports/ports.js';

const UTF8_BOM = String.fromCharCode(0xfeff);

/** Writes the inbox files into the mod folder, in UTF-8 with BOM like every Paradox script file. */
export class ModInbox implements Inbox {
  constructor(private readonly modDir: string) {}

  async write(files: readonly InboxFile[]): Promise<void> {
    for (const file of files) {
      await writeFile(join(this.modDir, file.relativePath), UTF8_BOM + file.content, 'utf8');
    }
  }
}
