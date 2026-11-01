import { open, readFile, stat } from 'node:fs/promises';
import { setTimeout as sleep } from 'node:timers/promises';

import type { LogSource } from '../ports/ports.js';

const NEWLINE = 0x0a;

/**
 * Follows debug.log by polling its size. The game rewrites the file at each launch:
 * when it shrinks, reading starts over from the beginning.
 */
export class DebugLogSource implements LogSource {
  private offset = 0;
  private stopped = false;

  constructor(
    private readonly path: string,
    private readonly pollMs = 500,
  ) {}

  async history(): Promise<string[]> {
    let content: Buffer;
    try {
      content = await readFile(this.path);
    } catch {
      return [];
    }
    this.offset = content.length;
    return content.toString('utf8').split(/\r?\n/);
  }

  async *follow(): AsyncIterable<string> {
    let partial = Buffer.alloc(0);

    while (!this.stopped) {
      const size = await this.size();
      if (size < this.offset) {
        this.offset = 0;
        partial = Buffer.alloc(0);
      }
      if (size > this.offset) {
        // Bytes, not text: a UTF-8 character may be split across two reads.
        const chunk = Buffer.concat([partial, await this.read(this.offset, size)]);
        this.offset = size;
        const lastNewline = chunk.lastIndexOf(NEWLINE);
        partial = chunk.subarray(lastNewline + 1);
        if (lastNewline >= 0) {
          for (const line of chunk.subarray(0, lastNewline).toString('utf8').split('\n')) yield line.replace(/\r$/, '');
        }
      }
      await sleep(this.pollMs);
    }
  }

  stop(): void {
    this.stopped = true;
  }

  private async size(): Promise<number> {
    try {
      return (await stat(this.path)).size;
    } catch {
      return 0;
    }
  }

  private async read(from: number, to: number): Promise<Buffer> {
    const file = await open(this.path, 'r');
    try {
      const buffer = Buffer.alloc(to - from);
      await file.read(buffer, 0, buffer.length, from);
      return buffer;
    } finally {
      await file.close();
    }
  }
}
