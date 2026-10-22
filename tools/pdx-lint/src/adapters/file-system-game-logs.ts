import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { BaselineRepository, GameLogs } from '../ports/game-logs.js';

const GAME_BRANCH = /game_branch: .*\/release\/(\S+)/;

/** Reads `<logsDir>/error.log` and the version from `<logsDir>/code_revisions.log`. */
export class FileSystemGameLogs implements GameLogs {
  constructor(private readonly logsDir: string) {}

  readErrorLog(): Promise<string> {
    return readFile(join(this.logsDir, 'error.log'), 'utf8');
  }

  async readGameVersion(): Promise<string> {
    const revisions = await readFile(join(this.logsDir, 'code_revisions.log'), 'utf8');
    const version = GAME_BRANCH.exec(revisions)?.[1];
    if (version === undefined) throw new Error('could not read the game version from code_revisions.log');
    return version;
  }
}

/** Stores baselines as `<dir>/error-log-<version>.txt`, one message per line. */
export class FileSystemBaselineRepository implements BaselineRepository {
  constructor(private readonly dir: string) {}

  async load(gameVersion: string): Promise<string[] | null> {
    try {
      const content = await readFile(this.pathFor(gameVersion), 'utf8');
      return content.split(/\r?\n/).filter((line) => line !== '');
    } catch {
      return null;
    }
  }

  async save(gameVersion: string, messages: readonly string[]): Promise<string> {
    const path = this.pathFor(gameVersion);
    await mkdir(this.dir, { recursive: true });
    await writeFile(path, messages.map((message) => `${message}\n`).join(''), 'utf8');
    return path;
  }

  private pathFor(gameVersion: string): string {
    return join(this.dir, `error-log-${gameVersion}.txt`);
  }
}
